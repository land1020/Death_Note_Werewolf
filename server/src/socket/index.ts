import { Server, Socket } from 'socket.io';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    TransferInfo,
    Card,
    Room,
    Player,
    GameState,
    DeckConfig,
    RoleConfig,
} from '../../../shared/types/index.js';
import { CardId, WinCondition, GamePhase, Role } from '../../../shared/types/index.js';
import { DEFAULT_DECK_CONFIG } from '../../../shared/utils/deckFactory.js';
import { DEFAULT_ROLE_CONFIG } from '../../../shared/utils/roleFactory.js';
import { CardEffectProcessor, CardEffectResult, checkCanModifyNumber } from '../game/cardEffects.js';
import { initializeGame } from '../game/gameInitializer.js';
import { JudgmentProcessor, JudgmentResult } from '../game/judgmentProcessor.js';
import { processDeath, checkAndReplenishDeck, addToDiscardPile, checkWinCondition, endGame } from '../game/gameLogic.js';
import { BotLogic } from '../game/botLogic.js';
import { DebugLogger } from '../game/debugLogger.js';


import { debug } from 'node:console';

/**
 * 手札にある死神カード（CardId.SHINIGAMI=13）を検出し、自動的に行使する
 * ドロー後や交換後などに呼ばれる
 */
export async function triggerAutoShinigamiIfNeeded(io: TypedServer, game: GameState, roomCode: string, playerId: string) {
    const player = game.players.find(p => p.id === playerId);
    if (!player || !player.isAlive) return false;

    const shinigamiIndex = player.hand.findIndex((c: Card) => c.id === CardId.SHINIGAMI && !c.isInitialHand);
    if (shinigamiIndex === -1) return false;

    console.log(`👹 ${player.name} has Shinigami card - auto-triggering!`);

    const shinigamiCard = player.hand[shinigamiIndex];
    // 手札から死神カードを削除
    player.hand.splice(shinigamiIndex, 1);

    // 捨て札に追加
    shinigamiCard.isUsed = true;
    if (!shinigamiCard.history) shinigamiCard.history = [];
    shinigamiCard.history.push(`${player.name} に死神が降臨した`);
    shinigamiCard.usedByName = player.name;
    shinigamiCard.usedByColor = player.color;
    addToDiscardPile(game, shinigamiCard);

    // 死神効果を処理
    const shinigamiResult = CardEffectProcessor.processShinigami(game);

    // 元の進行中プレイヤーIDを保存しておく（ドロー時や交換時など）
    const previousPlayerId = game.currentPlayerId;

    // カード使用通知
    io.to(roomCode).emit('game:cardUsed', {
        playerId,
        playerName: player.name,
        cardId: CardId.SHINIGAMI,
        cardName: shinigamiCard.name,
    });

    // カットシーン再生指示
    io.to(roomCode).emit('game:playCutscene', { type: 'SHINIGAMI' });

    // NPCの場合: socketイベント待ちだとハングするため、遅延後に即座にターン進行
    const isNpc = playerId.startsWith('npc-');
    if (isNpc) {
        // NPC: カットシーン再生後に情報公開 → ターン進行
        setTimeout(() => {
            // 情報公開イベント送信 (キラ・ミサにのみ詳細情報を送る)
            if (shinigamiResult.revealedInfo) {
                const visibleTo = shinigamiResult.revealedInfo.visibleTo || [];
                for (const p of game.players) {
                    const pSocketId = [...playerSockets.entries()].find(([_, pid]) => pid === p.id)?.[0];
                    if (!pSocketId) continue;
                    if (visibleTo.includes(p.id)) {
                        io.to(pSocketId).emit('game:effectReveal', { revealedInfo: shinigamiResult.revealedInfo });
                    }
                }
            }

            game.currentPlayerId = playerId;
            advanceTurn(io, game, roomCode);
        }, 3000);
    } else {
        // 人間プレイヤー: カットシーン終了後のクライアントイベント待ち
        game.currentPlayerId = 'SHINIGAMI_EFFECT';

        // 結果情報を一時保存
        (game as any).tempShinigamiInfo = {
            revealedInfo: shinigamiResult.revealedInfo,
            userId: playerId,
            previousPlayerId
        };
    }

    // 自動発動したためtrueを返す
    return true;
}

// In-memory storage (will be replaced with proper state management in later phases)
const rooms = new Map<string, Room>();
const games = new Map<string, GameState>();
export const playerSockets = new Map<string, string>(); // socketId -> playerId

// Generate room code
function generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate unique ID
function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
/**
 * プレイヤー固有のゲーム状態を作成（他プレイヤーの手札・役職を隠す）
 */
function createPersonalizedState(gameState: GameState, playerId: string): GameState {
    const myPlayer = gameState.players.find((p: Player) => p.id === playerId);
    const myRole = myPlayer?.role;

    // 隠しカードを作成（handの枚数だけ分かるように）
    const createHiddenCard = (): Card => ({
        id: -1 as any, // HIDDENを表す特別なID
        name: '???',
        instanceId: `hidden-${generateId()}`,
        isUsed: false,
    });

    // デッキの枚数を反映したダミーデッキを作成
    const dummyDeck = gameState.deck.map(() => createHiddenCard());

    return {
        ...gameState,
        deck: (myPlayer?.isSpectator || myPlayer?.isAlive === false) ? gameState.deck : dummyDeck, // 観戦者/死亡者はデッキ情報が見える
        players: gameState.players.map((player: Player) => {
            // 自分自身、またはデバッグモードでのホスト向けのNPC情報である場合は全公開する
            const isNpcDebug = (gameState as any).isDebug && player.id.startsWith('npc-') && myPlayer?.isHost;
            const isSpectatingOrDead = myPlayer?.isSpectator || myPlayer?.isAlive === false;
            const isGameEnd = gameState.phase === GamePhase.GAME_END || gameState.phase === GamePhase.JUDGMENT_RESULT;

            if (player.id === playerId || isNpcDebug || isSpectatingOrDead || isGameEnd) {
                // 自分自身の情報、または観戦者/死亡者/ゲーム終了時の場合は他人の情報もそのまま返す
                return player;
            }

            // Misa during Judgment phase can see Kira and Death Note
            let revealedRole = null;
            let revealedTeam = null;
            let revealedHand = player.hand.map(() => createHiddenCard());

            if (gameState.phase === GamePhase.JUDGMENT && myRole === Role.MISA) {
                if (player.role === Role.KIRA) {
                    revealedRole = player.role;
                    revealedTeam = player.team;
                }
                const deathNoteCard = player.hand.find(c => c.id === 0);
                if (deathNoteCard) {
                    revealedHand = player.hand.map(c => c.id === 0 ? deathNoteCard : createHiddenCard());
                }
            }

            // その他のプレイヤーは役職と手札を隠す
            return {
                ...player,
                role: revealedRole,
                team: revealedTeam,
                hand: revealedHand,
            };
        }),
        kiraMisaChat: (myPlayer?.role === Role.KIRA || myPlayer?.role === Role.MISA || myPlayer?.isSpectator || myPlayer?.isAlive === false)
            ? gameState.kiraMisaChat
            : []
    };
}

/**
 * 全プレイヤーにゲーム状態を送信
 */
function broadcastGameState(io: TypedServer, game: GameState, roomCode: string) {
    for (const player of game.players) {
        const socketId = [...playerSockets.entries()]
            .find(([_, pid]) => pid === player.id)?.[0];
        if (socketId) {
            const personalizedState = createPersonalizedState(game, player.id);
            io.to(socketId).emit('game:state', { gameState: personalizedState });
        }
    }
}

/**
 * 次のプレイヤーにターンを進める
 */
function advanceTurn(io: TypedServer, game: GameState, roomCode: string) {
    const alivePlayers = game.players.filter((p: Player) => p.isAlive);
    // 現在のプレイヤーが配列のどこにいるか
    let currentIndex = alivePlayers.findIndex((p: Player) => p.id === game.currentPlayerId);

    // 見つからない場合（死亡などで）は、とりあえず0番目（ホスト等）にするか、
    // 前のターンの人の次にする必要があるが、
    // ここでは単純に「次の人」を探す
    if (currentIndex === -1) {
        currentIndex = 0;
    }

    const nextIndex = (currentIndex + 1) % alivePlayers.length;
    game.currentPlayerId = alivePlayers[nextIndex].id;
    game.hasDrawnCard = false; // ターンリセット時にドローフラグもリセット
    game.drawnCardInstanceId = null; // ドローしたカードのIDをリセット

    // ターン数のカウントアップ (全員が一巡したらサイクル+1)
    game.turnIndex++;

    // 生存者数分だけターンが進んだらラウンド終了とみなす
    // TODO: turnIndexは「ゲーム開始からの総ターン数」か「ラウンド内のターン数」か定義が曖昧だが、
    // ここでは「ラウンド内のターン数」として扱う
    if (game.turnIndex >= alivePlayers.length) {
        game.turnCycle++;
        game.turnIndex = 0;

        console.log(`🔄 Round ${game.turnCycle} completed`);

        // 1巡終了時に現在の捨て札プールを全体捨て札に移動する
        // (廃止: 全プレイヤーの捨て札を履歴として最大人数分まで保持しつづける仕様に変更)
        // if (game.roundDiscardPile && game.roundDiscardPile.length > 0) {
        //     game.discardPile.push(...game.roundDiscardPile);
        //     game.roundDiscardPile = [];
        // }

        // 裁きの時間へ（捜査フェーズかつ規定ラウンド終了時）
        // 1巡終了時に裁きの時間へ
        if (game.turnCycle >= 1 && game.phase === GamePhase.INVESTIGATION) {
            game.phase = GamePhase.JUDGMENT;
            console.log(`⚖️ Moving to JUDGMENT phase`);

            // Initialize pendingAction for Judgment
            game.pendingAction = {
                type: 'JUDGMENT',
                votes: {},
                startTime: Date.now()
            };

            io.to(roomCode).emit('game:phaseChanged', { phase: game.phase });
            broadcastGameState(io, game, roomCode);

            // NPCがいる場合、ボットの裁き応答を自動トリガー
            if (game.players.some(p => p.id.startsWith('npc-'))) {
                BotLogic.handleBotJudgmentAction(io, game, roomCode);
            }

            // 13s Timeout
            setTimeout(() => {
                const currentGame = games.get(roomCode);
                if (currentGame && currentGame.phase === GamePhase.JUDGMENT) {
                    console.log(`⏰ Judgment Timeout for room ${roomCode}`);
                    let targetId: string | null = null;
                    const kira = currentGame.players.find(p => p.role === 'KIRA');
                    // キラがまだスキップ（CONFIRM）を選択していない場合のみ、時間切れでランダム攻撃
                    const kiraVoted = kira ? currentGame.pendingAction?.votes?.[kira.id] : null;
                    if (kira && kira.hand.some(c => c.id === 0 /* CardId.DEATH_NOTE */) && kiraVoted !== 'CONFIRM') {
                        const validTargets = currentGame.players.filter(p => p.isAlive && p.id !== kira.id);
                        if (validTargets.length > 0) {
                            targetId = validTargets[Math.floor(Math.random() * validTargets.length)].id;
                            console.log(`⏰ Kira randomized target: ${targetId}`);
                        }
                    }
                    resolveJudgment(io, roomCode, currentGame, targetId);
                }
            }, 13000);

            // 裁きの時間へ移行中はここで進行を終了する（後続のターン処理は裁きの結果後に行う）
            return;
        }
    }

    console.log(`⏩ Turn advanced to ${alivePlayers[nextIndex].name} (Round: ${game.turnCycle}, Turn: ${game.turnIndex})`);

    // 全プレイヤーにゲーム状態を送信
    broadcastGameState(io, game, roomCode);

    // If next player is Bot (no socket), trigger bot logic
    const nextPlayer = alivePlayers[nextIndex];
    const nextSocketId = [...playerSockets.entries()].find(([_, pid]) => pid === nextPlayer.id)?.[0];

    if (!nextSocketId && nextPlayer.id.startsWith('npc-')) {
        // Trigger bot turn (async, runs in background)
        BotLogic.executeBotTurn(io, game, roomCode, nextPlayer.id, advanceTurn, broadcastGameState);
    }
}

export async function completeExchangeTrade(
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    game: GameState,
    roomCode: string,
    userId: string,
    targetId: string,
    cardFromTarget: Card | undefined,
    exchangeCardInstanceId: string,
    exchangeCardObjectParam?: Card
) {
    const user = game.players.find(p => p.id === userId);
    const target = game.players.find(p => p.id === targetId);

    if (!user || !target) return;

    // 1. ターゲットの手札から渡すカードを除去
    if (cardFromTarget) {
        target.hand = target.hand.filter(c => c.instanceId !== cardFromTarget.instanceId);
    }

    // 2. 使用者の手札から「交換」カードを除去して捨て札へ
    let exchangeCard = exchangeCardObjectParam || game.pendingExchange?.exchangeCard;
    if (!exchangeCard) {
        const exchangeCardIndex = user.hand.findIndex(c => c.instanceId === exchangeCardInstanceId);
        if (exchangeCardIndex !== -1) {
            exchangeCard = user.hand[exchangeCardIndex];
            user.hand.splice(exchangeCardIndex, 1);
        }
    } else {
        const index = user.hand.findIndex(c => c.instanceId === exchangeCard!.instanceId);
        if (index !== -1) user.hand.splice(index, 1);
    }

    // 3. ユーザーが選んだカードを取得し、手札から除去
    const userSelectedCardId = game.pendingExchange?.userSelectedCardInstanceId;
    let cardFromUser = user.hand.find(c => c.instanceId === userSelectedCardId);
    if (cardFromUser) {
        user.hand = user.hand.filter(c => c.instanceId !== userSelectedCardId);
    } else {
        // フォールバック: 指定がない場合は手札の最初のカードを渡す
        cardFromUser = user.hand[0];
        if (cardFromUser) {
            user.hand.splice(0, 1);
        }
    }

    if (exchangeCard && cardFromUser) {
        // 4. 手札にそれぞれのカードを追加
        if (cardFromTarget) user.hand.push(cardFromTarget);
        target.hand.push(cardFromUser); // NOT exchangeCard anymore

        // 交換カードは使用済みにし、捨て札へ
        exchangeCard.isUsed = true;
        exchangeCard.usedByName = user.name;
        exchangeCard.usedByColor = user.color;
        if (!exchangeCard.history) exchangeCard.history = [];
        exchangeCard.history.push(`${user.name} が ${target.name} と手札を交換`);

        addToDiscardPile(game, exchangeCard);
    } else if (cardFromUser) {
        // fallback (Should not happen normally)
        if (cardFromTarget) user.hand.push(cardFromTarget);
        target.hand.push(cardFromUser);
    }

    // Pending状態リセット
    delete game.pendingExchange;

    // 通知
    io.to(roomCode).emit('exchange:progress', {
        message: `${user.name}と${target.name}がカードを交換しました`,
    });

    // 転送履歴の追加と通知（カード情報は当事者以外には非公開）
    // ダミーのカードオブジェクト（他プレイヤーには交換内容を見せない）
    const hiddenCard: Card = { id: -1 as any, name: '???', instanceId: 'hidden', isUsed: false };

    // 公開用の転送情報（カード情報を隠蔽）
    const publicTransfers: TransferInfo[] = [];
    // 当事者用の転送情報（カード情報を含む）
    const privateTransfers: TransferInfo[] = [];

    if (cardFromUser || exchangeCard) {
        publicTransfers.push({
            fromPlayerId: userId,
            fromPlayerName: user.name,
            toPlayerId: target.id,
            toPlayerName: target.name,
            card: hiddenCard,
            direction: 'RIGHT'
        });
        privateTransfers.push({
            fromPlayerId: userId,
            fromPlayerName: user.name,
            toPlayerId: target.id,
            toPlayerName: target.name,
            card: cardFromUser || exchangeCard!,
            direction: 'RIGHT'
        });
    }
    if (cardFromTarget) {
        publicTransfers.push({
            fromPlayerId: target.id,
            fromPlayerName: target.name,
            toPlayerId: userId,
            toPlayerName: user.name,
            card: hiddenCard,
            direction: 'LEFT'
        });
        privateTransfers.push({
            fromPlayerId: target.id,
            fromPlayerName: target.name,
            toPlayerId: userId,
            toPlayerName: user.name,
            card: cardFromTarget,
            direction: 'LEFT'
        });
    }

    // 公開履歴にはカード情報を隠蔽したものを追加
    game.publicInfo.transferHistory.push(...publicTransfers);

    // 当事者には詳細情報を、他プレイヤーには隠蔽情報を送信
    for (const [sid, pid] of playerSockets.entries()) {
        if (pid === userId || pid === targetId) {
            io.to(sid).emit('game:cardTransferred', { transfers: privateTransfers });
        } else {
            io.to(sid).emit('game:cardTransferred', { transfers: publicTransfers });
        }
    }

    // 自動死神使用のチェック
    const userTriggered = await triggerAutoShinigamiIfNeeded(io as any, game, roomCode, userId);
    const targetTriggered = await triggerAutoShinigamiIfNeeded(io as any, game, roomCode, targetId);

    if (userTriggered || targetTriggered) {
        broadcastGameState(io as any, game, roomCode);
    }

    // ターンを進める
    advanceTurn(io, game, roomCode);
}

export function setupSocketHandlers(io: TypedServer) {
    io.on('connection', (socket: TypedSocket) => {
        console.log(`🔌 Client connected: ${socket.id} `);

        // ==================== Room Events ====================

        socket.on('room:create', (data: { playerName: string; maxPlayers: number; useMello: boolean; isDebug?: boolean; deckConfig?: DeckConfig; roleConfig?: RoleConfig; roomCode?: string }) => {
            const { playerName, maxPlayers, useMello, isDebug, deckConfig, roleConfig } = data;

            // Generate unique room code
            let roomCode: string;
            if (data.roomCode) {
                if (rooms.has(data.roomCode)) {
                    socket.emit('room:error', { message: '指定された部屋番号はすでに存在します。「部屋情報をリセット」を試してください。' });
                    return;
                }
                roomCode = data.roomCode;
            } else {
                do {
                    roomCode = generateRoomCode();
                } while (rooms.has(roomCode));
            }

            const playerId = generateId();

            // Create host player with a random color
            const colors = ['#DC2626', '#2563EB', '#16A34A', '#CA8A04', '#9333EA', '#EA580C', '#0D9488', '#DB2777', '#4F46E5', '#65A30D'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            const hostPlayer: Player = {
                id: playerId,
                name: playerName,
                role: null,
                team: null,
                hand: [],
                isAlive: true,
                isConnected: true,
                isHost: true,
                color: randomColor,
            };

            // Create room
            const room: Room = {
                code: roomCode,
                players: [hostPlayer],
                maxPlayers,
                useMello,
                hostId: playerId,
                isDebug: !!isDebug,
                deckConfig: deckConfig || JSON.parse(JSON.stringify(DEFAULT_DECK_CONFIG)),
                roleConfig: roleConfig || JSON.parse(JSON.stringify(DEFAULT_ROLE_CONFIG))
            };

            rooms.set(roomCode, room);
            playerSockets.set(socket.id, playerId);

            // Join socket room
            socket.join(roomCode);

            // Emit success
            socket.emit('room:created', { roomCode, playerId });
            io.to(roomCode).emit('room:updated', { room });

            console.log(`🏠 Room ${roomCode} created by ${playerName} ${isDebug ? '(DEBUG)' : ''}`);

            if (isDebug) {
                DebugLogger.log(io, roomCode, `🔧 Room created in DEBUG MODE`, 'warn');
            }
        });

        socket.on('room:reset', (data: { roomCode: string }) => {
            if (rooms.has(data.roomCode)) {
                // 部屋に関係する人たちを追い出す (Disconnect them or just emit kicked? Just clean up data is fine, client handles recreate)
                const roomToReset = rooms.get(data.roomCode);
                if (roomToReset) {
                    for (const p of roomToReset.players) {
                        for (const [sid, pid] of playerSockets.entries()) {
                            if (pid === p.id) {
                                io.to(sid).emit('room:kicked');
                                playerSockets.delete(sid);
                            }
                        }
                    }
                }
                rooms.delete(data.roomCode);
                games.delete(data.roomCode);
                console.log(`🧹 Room ${data.roomCode} was manually reset`);
            }
        });

        socket.on('room:addNpc', () => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            // Find room
            let targetRoom: Room | undefined;
            let roomCode: string | undefined;

            for (const [code, room] of rooms.entries()) {
                if (room.players.some(p => p.id === playerId)) {
                    targetRoom = room;
                    roomCode = code;
                    break;
                }
            }

            if (!targetRoom || !roomCode) return;
            if (targetRoom.hostId !== playerId) return; // Only host
            if (targetRoom.players.length >= targetRoom.maxPlayers) return;

            // Create NPC
            const npcId = `npc-${generateId()}`;
            const npcCount = targetRoom.players.filter(p => p.id.startsWith('npc-')).length;
            const npcName = `NPC ${npcCount + 1}`;

            // Generate random available color for NPC
            const PLAYER_COLORS = ['#DC2626', '#2563EB', '#16A34A', '#CA8A04', '#9333EA', '#EA580C', '#0D9488', '#DB2777', '#4F46E5', '#65A30D'];
            const usedColors = targetRoom.players.map(p => p.color).filter(c => c !== undefined) as string[];
            const availableColors = PLAYER_COLORS.filter(c => !usedColors.includes(c));
            const npcColor = availableColors.length > 0
                ? availableColors[Math.floor(Math.random() * availableColors.length)]
                : PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];

            const npc: Player = {
                id: npcId,
                name: npcName,
                role: null,
                team: null,
                hand: [],
                isAlive: true,
                isConnected: true, // Treat as connected so game can start
                isHost: false,
                color: npcColor
            };

            targetRoom.players.push(npc);

            // We don't map socket for NPC.

            io.to(roomCode).emit('room:updated', { room: targetRoom });
            DebugLogger.log(io, roomCode, `🤖 Added ${npcName}`, 'info');
        });

        socket.on('debug:getLogs', () => {
            // Optional: send history if stored. For now, empty or confirm.
            // Client overlay maintains history.
        });

        socket.on('room:join', (data: { playerName: string; roomCode: string }) => {
            const { playerName, roomCode } = data;

            const room = rooms.get(roomCode);

            if (!room) {
                socket.emit('room:error', { message: 'ルームが見つかりません' });
                return;
            }

            if (room.players.length >= room.maxPlayers) {
                socket.emit('room:error', { message: 'ルームが満員です' });
                return;
            }

            // Check for duplicate names
            const existingPlayer = room.players.find((p: Player) => p.name === playerName);
            if (existingPlayer) {
                if (existingPlayer.isConnected) {
                    socket.emit('room:error', { message: 'その名前は既に使用されています' });
                    return;
                } else {
                    // Auto-rejoin if the player disconnected
                    playerSockets.set(socket.id, existingPlayer.id);
                    socket.join(roomCode);

                    existingPlayer.isConnected = true;

                    // Emit events to sync state
                    socket.emit('room:joined', { playerId: existingPlayer.id, roomCode });
                    io.to(roomCode).emit('room:updated', { room });
                    console.log(`♻️ Player ${playerName} auto-rejoined room ${roomCode} from join screen`);

                    // Send active game state if running
                    const game = games.get(roomCode);
                    if (game && game.phase !== GamePhase.LOBBY) {
                        socket.emit('game:state', { gameState: createPersonalizedState(game, existingPlayer.id) });
                    }
                    return;
                }
            }

            const playerId = generateId();

            // Find an available random color
            const colors = ['#DC2626', '#2563EB', '#16A34A', '#CA8A04', '#9333EA', '#EA580C', '#0D9488', '#DB2777', '#4F46E5', '#65A30D'];
            const usedColors = new Set(room.players.map(p => p.color).filter(Boolean));
            const availableColors = colors.filter(c => !usedColors.has(c));
            const assignedColor = availableColors.length > 0
                ? availableColors[Math.floor(Math.random() * availableColors.length)]
                : colors[Math.floor(Math.random() * colors.length)]; // Fallback

            const newPlayer: Player = {
                id: playerId,
                name: playerName,
                role: null,
                team: null,
                hand: [],
                isAlive: true,
                isConnected: true,
                isHost: false,
                color: assignedColor,
            };

            room.players.push(newPlayer);
            playerSockets.set(socket.id, playerId);

            socket.join(roomCode);

            socket.emit('room:joined', { playerId, roomCode });
            io.to(roomCode).emit('room:updated', { room });

            console.log(`👤 ${playerName} joined room ${roomCode} `);
        });

        socket.on('room:rejoin', (data: { playerId: string; roomCode: string; playerName: string }) => {
            const { playerId, roomCode, playerName } = data;
            const room = rooms.get(roomCode);

            if (!room) {
                socket.emit('room:error', { message: 'ルームが見つかりません' });
                return;
            }

            const player = room.players.find(p => p.id === playerId);
            if (!player) {
                socket.emit('room:error', { message: 'プレイヤーが見つかりません。別のブラウザで入室したか、キックされた可能性があります。' });
                return;
            }

            // Re-bind socket
            playerSockets.set(socket.id, playerId);
            socket.join(roomCode);

            player.isConnected = true;
            if (playerName && player.name !== playerName) {
                player.name = playerName;
            }

            socket.emit('room:joined', { playerId, roomCode });
            io.to(roomCode).emit('room:updated', { room });
            console.log(`♻️ Player ${playerName} rejoined room ${roomCode}`);

            // If game is active, send game state to restore the client view
            const game = games.get(roomCode);
            if (game && game.phase !== GamePhase.LOBBY) {
                socket.emit('game:state', { gameState: createPersonalizedState(game, playerId) });
            }
        });

        socket.on('room:kickPlayer', (data: { targetPlayerId: string }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            // Find where this player is host
            let targetRoom: Room | undefined;
            for (const room of rooms.values()) {
                if (room.hostId === playerId && room.players.some(p => p.id === data.targetPlayerId)) {
                    targetRoom = room;
                    break;
                }
            }
            if (!targetRoom) return; // Not a host or player not in the host's room

            const targetIndex = targetRoom.players.findIndex(p => p.id === data.targetPlayerId);
            if (targetIndex !== -1) {
                targetRoom.players.splice(targetIndex, 1);

                // Find and kick the socket connection
                let targetSocketId: string | undefined;
                for (const [sId, pId] of playerSockets.entries()) {
                    if (pId === data.targetPlayerId) {
                        targetSocketId = sId;
                        break;
                    }
                }

                if (targetSocketId) {
                    io.to(targetSocketId).emit('room:kicked');
                    playerSockets.delete(targetSocketId);

                    // Force the underlying socket to leave the room channel
                    const targetClient = io.sockets.sockets.get(targetSocketId);
                    if (targetClient) {
                        targetClient.leave(targetRoom.code);
                    }
                }

                io.to(targetRoom.code).emit('room:updated', { room: targetRoom });
                console.log(`👢 Player ${data.targetPlayerId} was kicked from room ${targetRoom.code}`);
            }
        });

        socket.on('room:updateDeckConfig', (data: { deckConfig: DeckConfig }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            // Find room
            let targetRoom: Room | undefined;
            let roomCode: string | undefined;

            for (const [code, room] of rooms.entries()) {
                if (room.players.some((p: Player) => p.id === playerId)) {
                    targetRoom = room;
                    roomCode = code;
                    break;
                }
            }

            if (!targetRoom || !roomCode) return;
            if (targetRoom.hostId !== playerId) {
                socket.emit('room:error', { message: 'ホストのみがデッキ設定を変更できます' });
                return;
            }

            targetRoom.deckConfig = data.deckConfig;
            io.to(roomCode).emit('room:updated', { room: targetRoom });
            console.log(`⚙️ Deck config updated for room ${roomCode}`);
        });

        socket.on('room:updateRoleConfig', (data: { roleConfig: RoleConfig }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            // Find room
            let targetRoom: Room | undefined;
            let roomCode: string | undefined;

            for (const [code, room] of rooms.entries()) {
                if (room.players.some((p: Player) => p.id === playerId)) {
                    targetRoom = room;
                    roomCode = code;
                    break;
                }
            }

            if (!targetRoom || !roomCode) return;
            if (targetRoom.hostId !== playerId) {
                socket.emit('room:error', { message: 'ホストのみが役職設定を変更できます' });
                return;
            }
            targetRoom.roleConfig = data.roleConfig;
            io.to(roomCode).emit('room:updated', { room: targetRoom });
            console.log(`👤 Role config updated in room ${roomCode}`);
        });

        // プレイヤーカラー選択
        socket.on('player:selectColor', (data: { color: string | null }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            // Find room containing this player
            let targetRoom: Room | undefined;
            let roomCode: string | undefined;

            for (const [code, room] of rooms.entries()) {
                if (room.players.some(p => p.id === playerId)) {
                    targetRoom = room;
                    roomCode = code;
                    break;
                }
            }

            if (!targetRoom || !roomCode) return;

            const player = targetRoom.players.find(p => p.id === playerId);
            if (!player) return;

            if (data.color === null) {
                // カラー選択解除
                player.color = undefined;
            } else {
                // 重複チェック: 他のプレイヤーが既にこの色を使っている場合は拒否
                const colorInUse = targetRoom.players.some(
                    p => p.id !== playerId && p.color === data.color
                );
                if (colorInUse) {
                    socket.emit('room:error', { message: 'このカラーは既に選択されています' });
                    return;
                }
                player.color = data.color;
            }

            // 全員に更新を送信
            io.to(roomCode).emit('room:updated', { room: targetRoom });
            console.log(`🎨 ${player.name} selected color: ${data.color || 'none'}`);
        });

        socket.on('room:leave', () => {
            handlePlayerLeave(socket, io);
        });

        socket.on('room:toggleSpectator', (data: { isSpectator: boolean }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            let targetRoom: Room | undefined;
            let roomCode: string | undefined;

            for (const [code, room] of rooms.entries()) {
                if (room.players.some((p: Player) => p.id === playerId)) {
                    targetRoom = room;
                    roomCode = code;
                    break;
                }
            }

            if (!targetRoom || !roomCode) return;

            const player = targetRoom.players.find(p => p.id === playerId);
            if (!player) return;

            // デバッグモードかつホストのみ観戦モードに設定可能
            if (!targetRoom.isDebug || targetRoom.hostId !== playerId) {
                socket.emit('room:error', { message: 'デバッグモードのホストのみが観戦モードを使用できます' });
                return;
            }

            player.isSpectator = data.isSpectator;

            io.to(roomCode).emit('room:updated', { room: targetRoom });
            console.log(`👀 ${player.name} in room ${roomCode} set spectator mode to ${data.isSpectator}`);
        });

        socket.on('room:start', () => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            // Find room containing this player
            let targetRoom: Room | undefined;
            let roomCode: string | undefined;

            for (const [code, room] of rooms.entries()) {
                if (room.players.some((p: Player) => p.id === playerId)) {
                    targetRoom = room;
                    roomCode = code;
                    break;
                }
            }

            if (!targetRoom || !roomCode) {
                socket.emit('room:error', { message: 'ルームが見つかりません' });
                return;
            }

            if (targetRoom.hostId !== playerId) {
                socket.emit('room:error', { message: 'ホストのみがゲームを開始できます' });
                return;
            }

            const playingPlayersCount = targetRoom.players.filter(p => !p.isSpectator).length;
            if (playingPlayersCount < 4) {
                socket.emit('room:error', { message: '観戦者を除いて4人以上でゲームを開始できます' });
                return;
            }

            // Initialize game with roles and cards
            const initialGameState = initializeGame(
                roomCode,
                targetRoom.players,
                targetRoom.roleConfig,
                targetRoom.deckConfig
            );

            // Debug Mode: propagate isDebug flag to game state
            if (targetRoom.isDebug) {
                initialGameState.isDebug = true;
                DebugLogger.log(io, roomCode, `🎮 ゲーム開始 (DEBUG MODE) - プレイヤー: ${initialGameState.players.map((p: Player) => `${p.name}(${p.role})`).join(', ')}`, 'game');
            }

            games.set(roomCode, initialGameState);

            // 初期配布に死神カードが含まれていた場合:
            // ユーザーの要望により、初期配布時には発動せず、
            // そのプレイヤーのターンでカードを引いた後に発動する仕様とする

            // Send game started event to all players in the room
            // For each player, create a personalized state
            for (const player of initialGameState.players) {
                const playerSocketId = Array.from(playerSockets.entries()).find(([, pId]) => pId === player.id)?.[0];
                if (playerSocketId) {
                    const personalizedState = createPersonalizedState(initialGameState, player.id);
                    io.to(playerSocketId).emit('game:started', { gameState: personalizedState });

                    // ワタリ役にはL役のプレイヤー情報を通知
                    if (player.role === 'WATARI') {
                        const lPlayer = initialGameState.players.find(p => p.role === 'L');
                        if (lPlayer) {
                            io.to(playerSocketId).emit('game:watariReveal', {
                                lPlayerId: lPlayer.id,
                                lPlayerName: lPlayer.name,
                                lPlayerColor: lPlayer.color,
                            });
                        }
                    }
                }
            }
            console.log(`🎮 Game started in room ${roomCode} `);

            // Debug Mode: 最初のプレイヤーがボットの場合、ボットターンを開始
            if (initialGameState.isDebug) {
                const firstPlayer = initialGameState.players.find(p => p.id === initialGameState.currentPlayerId);
                if (firstPlayer && firstPlayer.id.startsWith('npc-')) {
                    BotLogic.executeBotTurn(io, initialGameState, roomCode, firstPlayer.id, advanceTurn, broadcastGameState);
                }
            }
        });

        // ロビーへ戻る
        socket.on('room:backToLobby', () => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, room] of rooms.entries()) {
                if (room.hostId === playerId) {
                    // ゲームを破棄
                    games.delete(roomCode);

                    // クライアントへロビーへ戻るように指示
                    io.to(roomCode).emit('game:updated', {
                        gameState: { phase: 'LOBBY' as GamePhase } as any
                    });
                    return;
                }
            }
        });

        // ==================== Game Events ====================

        socket.on('game:drawCard', async () => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            // ゲームを探す
            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                // 自分のターンかチェック
                if (game.currentPlayerId !== playerId) {
                    socket.emit('game:error', { message: 'あなたのターンではありません' });
                    return;
                }

                // ドロー済みかチェック
                if (game.hasDrawnCard) {
                    socket.emit('game:error', { message: 'このターンは既にカードを引いています' });
                    return;
                }

                // デッキが0枚なら、捨て札をすべて回収してシャッフルし、新たなデッキとする
                if (game.deck.length === 0) {
                    const allDiscards = [...game.discardPile, ...(game.roundDiscardPile || [])];
                    if (allDiscards.length === 0) {
                        socket.emit('game:error', { message: 'デッキも捨て札もありません' });
                        return;
                    }
                    console.log(`♻️ Deck empty. Reshuffling ${allDiscards.length} discarded cards...`);

                    // シャッフル処理（簡易実装）
                    for (let i = allDiscards.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [allDiscards[i], allDiscards[j]] = [allDiscards[j], allDiscards[i]];
                    }
                    // isUsedフラグなどはそのままにしておき、必要であればリセットする
                    allDiscards.forEach(c => {
                        c.isUsed = false;
                        c.history = undefined; // リセット
                    });

                    game.deck = allDiscards;
                    game.discardPile = [];
                    game.roundDiscardPile = [];
                }

                // デッキから新しいカードを引く
                const newCard = game.deck.shift()!;
                player.hand.push(newCard);
                game.hasDrawnCard = true;
                game.drawnCardInstanceId = newCard.instanceId;

                checkAndReplenishDeck(io, game, roomCode);

                // ドロー後に初期手札フラグをクリア（死神カードの自動発動を有効にする）
                player.hand.forEach(c => { delete c.isInitialHand; });

                const triggered = await triggerAutoShinigamiIfNeeded(io as any, game, roomCode, playerId);
                if (triggered) {
                }

                // 全プレイヤーに更新を送信
                broadcastGameState(io, game, roomCode);
                return;
            }
        });

        socket.on('game:redrawStuckHand', async () => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                if (game.currentPlayerId !== playerId) {
                    socket.emit('game:error', { message: 'あなたのターンではありません' });
                    return;
                }

                if (!game.hasDrawnCard || !game.drawnCardInstanceId) {
                    socket.emit('game:error', { message: 'まだカードを引いていません' });
                    return;
                }

                // すでに山札がない場合は引き直しできない
                if (game.deck.length === 0) {
                    const allDiscards = [...game.discardPile, ...(game.roundDiscardPile || [])];
                    if (allDiscards.length === 0) {
                        socket.emit('game:error', { message: '山札も捨て札もないため引き直しできません' });
                        return;
                    }
                    // 山札を復活させる
                    for (let i = allDiscards.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [allDiscards[i], allDiscards[j]] = [allDiscards[j], allDiscards[i]];
                    }
                    allDiscards.forEach(c => {
                        c.isUsed = false;
                        c.history = undefined;
                    });
                    game.deck = allDiscards;
                    game.discardPile = [];
                    game.roundDiscardPile = [];
                }

                // 手番開始時に引いたカードを特定して山札に戻す
                const cardIndex = player.hand.findIndex((c: Card) => c.instanceId === game.drawnCardInstanceId);
                if (cardIndex === -1) {
                    socket.emit('game:error', { message: '引いたカードが手札に見つかりません' });
                    return;
                }

                const cardToReturn = player.hand.splice(cardIndex, 1)[0];
                game.deck.push(cardToReturn);

                // 山札をシャッフルする
                for (let i = game.deck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [game.deck[i], game.deck[j]] = [game.deck[j], game.deck[i]];
                }

                // 新しく1枚引く
                const newDrawnCard = game.deck.shift()!;
                player.hand.push(newDrawnCard);
                game.drawnCardInstanceId = newDrawnCard.instanceId;

                console.log(`♻️ ${player.name} redrew a card because hand was stuck`);

                checkAndReplenishDeck(io, game, roomCode);

                broadcastGameState(io, game, roomCode);
                return;
            }
        });

        socket.on('game:useCard', (data: {
            cardInstanceId: string;
            targetPlayerId?: string;
            exchangeCardId?: string;
            direction?: 'LEFT' | 'RIGHT';
        }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                // 自分のターンかチェック
                if (game.currentPlayerId !== playerId) {
                    socket.emit('game:error', { message: 'あなたのターンではありません' });
                    return;
                }

                // カードを手札から探す
                const cardIndex = player.hand.findIndex((c: Card) => c.instanceId === data.cardInstanceId);
                if (cardIndex === -1) {
                    socket.emit('game:error', { message: 'そのカードは手札にありません' });
                    return;
                }

                const card = player.hand[cardIndex];
                let result: CardEffectResult = { success: false };

                // カード効果処理
                switch (card.id) {
                    case CardId.DEATH_NOTE:
                    case CardId.FAKE_NAME:
                    case CardId.ALIBI:
                        socket.emit('game:error', { message: 'このカードはメインフェーズでは使用できません' });
                        return;

                    case CardId.ARREST:
                        if (!data.targetPlayerId) {
                            socket.emit('game:error', { message: 'ターゲットを指定してください' });
                            return;
                        }
                        result = CardEffectProcessor.processArrest(game, playerId, data.targetPlayerId);
                        break;

                    case CardId.GUN:
                        if (!data.targetPlayerId) {
                            socket.emit('game:error', { message: 'ターゲットを指定してください' });
                            return;
                        }
                        result = CardEffectProcessor.processGun(game, playerId, data.targetPlayerId);
                        break;

                    case CardId.WITNESS:
                        if (!data.targetPlayerId) {
                            socket.emit('game:error', { message: 'ターゲットを指定してください' });
                            return;
                        }
                        result = CardEffectProcessor.processWitness(game, playerId, data.targetPlayerId);
                        break;

                    case CardId.SURVEILLANCE:
                        if (!data.targetPlayerId) {
                            socket.emit('game:error', { message: 'ターゲットを指定してください' });
                            return;
                        }
                        result = CardEffectProcessor.processSurveillance(game, playerId, data.targetPlayerId);
                        break;

                    case CardId.VOTE:
                        result = CardEffectProcessor.initVote(game);
                        if (result.success) {
                            game.pendingAction = {
                                type: 'VOTE',
                                votes: {},
                                startTime: Date.now()
                            };
                        }
                        break;

                    case CardId.EXCHANGE:
                        if (!data.targetPlayerId) {
                            socket.emit('game:error', { message: 'ターゲットを指定してください' });
                            return;
                        }
                        // Phase 1: カード使用 & ターゲット選択 -> ユーザーのカード選択へ
                        result = CardEffectProcessor.processExchange(
                            game,
                            playerId,
                            data.targetPlayerId,
                            data.cardInstanceId
                        );

                        if (game.pendingExchange) {
                            game.pendingExchange.exchangeCard = card;
                        }

                        // USer selection wait
                        if (game.pendingExchange && game.pendingExchange.phase === 'USER_SELECTING') {
                            io.to(roomCode).emit('exchange:waiting', {
                                userId: playerId,
                                targetId: data.targetPlayerId,
                                message: `${player.name}が${game.players.find(p => p.id === data.targetPlayerId)?.name}と交換するためカードを選んでいます`,
                            });
                            broadcastGameState(io, game, roomCode);

                            if (player.id.startsWith('npc-')) {
                                const cardToGive = player.hand.find(c => c.instanceId !== data.cardInstanceId) || player.hand[0];
                                if (cardToGive) {
                                    setTimeout(async () => {
                                        await handleUserExchangeSelection(io, roomCode, playerId, {
                                            selectedCardInstanceId: cardToGive.instanceId,
                                            targetId: data.targetPlayerId!,
                                            exchangeCardInstanceId: data.cardInstanceId
                                        });
                                    }, 1000);
                                }
                            }
                            return; // Stop turn
                        }

                        break;

                    case CardId.INTERROGATION:
                        if (!data.direction) {
                            socket.emit('game:error', { message: '方向を指定してください' });
                            return;
                        }
                        // 取調は結果がすぐには出ない（全員選択待ち）
                        // ここではpendingActionを設定して成功扱いにする
                        game.pendingAction = {
                            type: 'INTERROGATION',
                            initiatorId: playerId,
                            direction: data.direction,
                            cardSelections: {}
                        };
                        result = { success: true, message: '取調を開始しました' };
                        break;

                    // SHINIGAMIは自動発動だが、手動で使われた場合も一応対応
                    case CardId.SHINIGAMI:
                        result = CardEffectProcessor.processShinigami(game);
                        break;

                    default:
                        socket.emit('game:error', { message: '不明なカードです' });
                        return;
                }

                if (!result.success) {
                    socket.emit('game:error', { message: result.message || 'カード効果の発動に失敗しました' });
                    return;
                }

                // カード使用成功時の共通処理
                console.log(`🎴 ${player.name} used ${card.name} `);

                // 手札から削除
                player.hand.splice(cardIndex, 1);
                card.isUsed = true;
                if (!card.history) card.history = [];

                // ターゲット名を取得
                const targetName = data.targetPlayerId
                    ? game.players.find(p => p.id === data.targetPlayerId)?.name
                    : null;

                // 基本アクションの履歴追加（交換は別途専用の履歴を追加するため一旦スキップまたは簡易追加）
                if (card.id === CardId.ARREST) {
                    card.history.push(`${player.name} が ${targetName} を逮捕しようとした`);
                    game.removedCards.push(card);

                    // 逮捕カード除外によるゲーム終了判定 (キラ勝利条件) - 逮捕自体が成功してゲームエンドが確定済みの場合はスキップ
                    if (!result.gameEnd) {
                        const winner = checkWinCondition(game);
                        if (winner) {
                            endGame(io, game, roomCode, winner);
                            return;
                        }
                    }
                } else if (card.id === CardId.EXCHANGE) {
                    // 交換はターゲットに渡されるため捨て札には入らない
                } else {
                    if (targetName) {
                        card.history.push(`${player.name} が ${targetName} に対して使用`);
                    } else if (card.id === CardId.VOTE) {
                        card.history.push(`${player.name} が 会議 を開いた`);
                    } else if (card.id === CardId.SHINIGAMI) {
                        card.history.push(`${player.name} に死神が降臨した`);
                    } else if (card.id === CardId.INTERROGATION) {
                        const dirText = data.direction === 'RIGHT' ? '右回り' : '左回り';
                        card.history.push(`${player.name} が 取調 を発動【${dirText}】`);
                    } else {
                        card.history.push(`${player.name} が使用`);
                    }

                    card.usedByName = player.name;
                    card.usedByColor = player.color;

                    addToDiscardPile(game, card);
                }

                // イベント送信
                if (card.id === CardId.SHINIGAMI) {
                    // 死神の場合はカットシーン再生指示のみ送る
                    // ターン移行も保留
                    game.currentPlayerId = 'SHINIGAMI_EFFECT'; // 一時的にターン進行ロック
                    io.to(roomCode).emit('game:cardUsed', {
                        playerId,
                        playerName: player.name,
                        cardId: card.id,
                        cardName: card.name,
                        targetPlayerId: data.targetPlayerId,
                    });

                    // 全員にカットシーン再生指示
                    io.to(roomCode).emit('game:playCutscene', { type: 'SHINIGAMI' });

                    // 結果情報（revealedInfo）と使用者IDを一時保存
                    (game as any).tempShinigamiInfo = {
                        revealedInfo: result.revealedInfo,
                        userId: playerId
                    };

                    return;
                } else if (card.id === CardId.GUN && (player.role === Role.POLICE || player.role === Role.L || player.role === Role.WATARI || player.role === Role.MELLO)) {
                    // 警察の拳銃の場合はカットシーン再生指示のみ送る
                    game.currentPlayerId = 'GUN_EFFECT'; // 一時的にターン進行ロック
                    io.to(roomCode).emit('game:cardUsed', {
                        playerId,
                        playerName: player.name,
                        cardId: card.id,
                        cardName: card.name,
                        targetPlayerId: data.targetPlayerId,
                    });

                    // 全員にカットシーン再生指示
                    io.to(roomCode).emit('game:playCutscene', { type: 'GUN' });

                    // 結果情報（revealedInfo）等を一時保存しておき、演出終了後に使用
                    (game as any).tempGunInfo = {
                        result,
                        playerId,
                        playerRole: player.role,
                        targetName: data.targetPlayerId ? game.players.find(p => p.id === data.targetPlayerId)?.name : undefined
                    };

                    return;
                } else if (card.id === CardId.ARREST && result.success && result.gameEnd && result.winner === 'L_WINS') {
                    // Lがキラを逮捕成功した場合
                    game.currentPlayerId = 'ARREST_EFFECT';
                    game.kiraArrested = true; // リザルト画面用フラグ
                    io.to(roomCode).emit('game:cardUsed', {
                        playerId,
                        playerName: player.name,
                        cardId: card.id,
                        cardName: card.name,
                        targetPlayerId: data.targetPlayerId,
                    });

                    // まず逮捕判定結果（カードめくり演出）を全員に送信
                    if (result.revealedInfo) {
                        io.to(roomCode).emit('game:effectReveal', { revealedInfo: result.revealedInfo });
                    }

                    (game as any).tempArrestInfo = {
                        result,
                        playerId,
                    };

                    // カードめくり演出確認後に game:arrestCardDismissed でムービー再生指示を送る
                    // (ムービーはクライアントからの arrestCardDismissed 受信時に送信)

                    return;
                }

                io.to(roomCode).emit('game:cardUsed', {
                    playerId,
                    playerName: player.name,
                    cardId: card.id,
                    cardName: card.name,
                    targetPlayerId: data.targetPlayerId,
                    direction: data.direction,
                });

                if (result.message) {
                    // TODO: addChatMessage system
                }

                // 結果に応じた処理
                if (result.gameEnd && result.winner) {
                    game.winner = result.winner;
                    game.phase = 'GAME_END' as any;
                    io.to(roomCode).emit('game:ended', { winner: result.winner, finalState: game });
                }

                if (result.revealedInfo) {
                    // 情報公開（特定プレイヤーのみ）
                    const visibleSocketIds: string[] = [];
                    result.revealedInfo.visibleTo.forEach(pid => {
                        const sid = [...playerSockets.entries()].find(([_, p]) => p === pid)?.[0];
                        if (sid) visibleSocketIds.push(sid);
                    });

                    // 個別にイベント送信
                    visibleSocketIds.forEach(sid => {
                        io.to(sid).emit('game:effectReveal', { revealedInfo: result.revealedInfo! });
                    });
                }

                if (result.transfers) {
                    game.publicInfo.transferHistory.push(...result.transfers);
                    io.to(roomCode).emit('game:cardTransferred', { transfers: result.transfers });
                }

                // 取調・投票の場合はターンを進めない（アクション待ち）
                if (game.pendingAction) {
                    broadcastGameState(io, game, roomCode);

                    // 投票タイムアウト (15秒) - 未投票者は自動ランダム投票
                    if (game.pendingAction.type === 'VOTE') {
                        const voteStartTime = game.pendingAction.startTime;
                        setTimeout(() => {
                            const currentGame = games.get(roomCode);
                            if (!currentGame || !currentGame.pendingAction ||
                                currentGame.pendingAction.type !== 'VOTE' ||
                                currentGame.pendingAction.startTime !== voteStartTime) return;

                            console.log(`⏰ Vote timeout for room ${roomCode}`);
                            const alivePlayers = currentGame.players.filter(p => p.isAlive);
                            if (!currentGame.pendingAction.votes) currentGame.pendingAction.votes = {};
                            for (const p of alivePlayers) {
                                if (!currentGame.pendingAction.votes[p.id]) {
                                    const others = alivePlayers.filter(pp => pp.id !== p.id);
                                    if (others.length > 0) {
                                        currentGame.pendingAction.votes[p.id] = others[Math.floor(Math.random() * others.length)].id;
                                    }
                                }
                            }
                            const voteResult = CardEffectProcessor.processVoteResults(
                                currentGame,
                                new Map(Object.entries(currentGame.pendingAction.votes))
                            );
                            delete currentGame.pendingAction;
                            if (voteResult.revealedInfo) {
                                io.to(roomCode).emit('game:effectReveal', { revealedInfo: voteResult.revealedInfo });
                            }
                            advanceTurn(io, currentGame, roomCode);
                        }, 15000);
                    }

                    // NPCがいる場合、ボットの投票/取調応答を自動トリガー
                    if (game.players.some(p => p.id.startsWith('npc-'))) {
                        if (game.pendingAction.type === 'VOTE') {
                            BotLogic.handleBotVoteResponse(io, game, roomCode, broadcastGameState, advanceTurn);
                        } else if (game.pendingAction.type === 'INTERROGATION') {
                            BotLogic.handleBotInterrogationResponse(io, game, roomCode, broadcastGameState, advanceTurn);
                        }
                    }
                    return;
                }

                // ターン終了処理
                advanceTurn(io, game, roomCode);
                return;
            }
        });

        socket.on('game:selectCard', (data: { cardInstanceId: string }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                if (game.pendingAction?.type === 'INTERROGATION') {
                    // カード所持チェック
                    if (!player.hand.some(c => c.instanceId === data.cardInstanceId)) {
                        socket.emit('game:error', { message: '指定されたカードを持っていません' });
                        return;
                    }

                    // 番号変更能力チェック: 能力を持たないプレイヤーは最小番号カードのみ選択可能
                    const selectedCardObj = player.hand.find(c => c.instanceId === data.cardInstanceId);
                    if (selectedCardObj && !checkCanModifyNumber(player)) {
                        // 最小番号カードかチェック
                        const minCard = player.hand.reduce((min, c) => c.id < min.id ? c : min, player.hand[0]);
                        if (selectedCardObj.instanceId !== minCard.instanceId) {
                            socket.emit('game:error', { message: '番号変更能力がないため、最小番号のカードのみ選択可能です' });
                            return;
                        }
                    }

                    // 選択保存
                    if (!game.pendingAction.cardSelections) game.pendingAction.cardSelections = {};
                    game.pendingAction.cardSelections[playerId] = data.cardInstanceId;

                    // 全員選択したかチェック (生きているプレイヤー全員)
                    const alivePlayerIds = game.players.filter(p => p.isAlive).map(p => p.id);
                    const allSelected = alivePlayerIds.every(id => game.pendingAction!.cardSelections![id]);

                    if (allSelected) {
                        // 実行
                        const result = CardEffectProcessor.processInterrogation(
                            game,
                            game.pendingAction.direction!,
                            new Map(Object.entries(game.pendingAction.cardSelections!))
                        );

                        // クリア
                        delete game.pendingAction;

                        if (result.success && result.transfers) {
                            game.publicInfo.transferHistory.push(...result.transfers);
                            io.to(roomCode).emit('game:cardTransferred', { transfers: result.transfers });
                        }

                        // ターン終了
                        advanceTurn(io, game, roomCode);
                    } else {
                        // 状態更新（誰が選択済みか分かるように）
                        broadcastGameState(io, game, roomCode);
                    }
                }
            }
        });

        socket.on('game:discardCard', (data: { cardInstanceId: string }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                if (game.currentPlayerId !== playerId) {
                    socket.emit('game:error', { message: 'あなたのターンではありません' });
                    return;
                }

                const cardIndex = player.hand.findIndex((c: Card) => c.instanceId === data.cardInstanceId);
                if (cardIndex === -1) {
                    socket.emit('game:error', { message: 'そのカードは手札にありません' });
                    return;
                }

                const card = player.hand.splice(cardIndex, 1)[0];
                if (!card.history) card.history = [];
                card.history.push(`${player.name} が捨てた`);

                card.usedByName = player.name;
                card.usedByColor = player.color;

                addToDiscardPile(game, card);

                console.log(`🗑️ ${player.name} discarded ${card.name} `);

                // 行動通知
                io.to(roomCode).emit('game:cardDiscarded', {
                    playerId,
                    playerName: player.name,
                    cardName: card.name,
                });

                // ターン終了処理
                advanceTurn(io, game, roomCode);
                return;
            }
        });

        socket.on('game:endTurn', () => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                if (game.currentPlayerId !== playerId) {
                    socket.emit('game:error', { message: 'あなたのターンではありません' });
                    return;
                }

                advanceTurn(io, game, roomCode);
                return;
            }
        });

        socket.on('vote:cast', (data: { targetId: string }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                if (game.pendingAction?.type !== 'VOTE') {
                    socket.emit('game:error', { message: '現在は投票受付中ではありません' });
                    return;
                }

                // 投票記録
                if (!game.pendingAction.votes) game.pendingAction.votes = {};
                game.pendingAction.votes[playerId] = data.targetId;

                // 全員投票したかチェック
                const alivePlayers = game.players.filter(p => p.isAlive);
                const votedCount = Object.keys(game.pendingAction.votes).length;

                if (votedCount >= alivePlayers.length) {
                    // 集計と結果発表
                    const result = CardEffectProcessor.processVoteResults(
                        game,
                        new Map(Object.entries(game.pendingAction.votes))
                    );

                    // pendingActionクリア
                    delete game.pendingAction;

                    // 結果通知
                    if (result.revealedInfo) {
                        io.to(roomCode).emit('game:effectReveal', {
                            revealedInfo: result.revealedInfo
                        });
                    }

                    // ターン終了
                    advanceTurn(io, game, roomCode);
                } else {
                    // 状態更新（誰が投票済みか分かるように）
                    broadcastGameState(io, game, roomCode);
                }
                return;
            }
        });

        socket.on('judgment:action', (data: { targetId: string }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                if (game.phase !== GamePhase.JUDGMENT) {
                    socket.emit('game:error', { message: '現在は投票フェーズではありません' });
                    return;
                }

                if (!player.isAlive) {
                    socket.emit('game:error', { message: '死亡したプレイヤーは投票できません' });
                    return;
                }

                // Initialize pendingAction for Judgment
                if (!game.pendingAction || game.pendingAction.type !== 'JUDGMENT') {
                    // Should be initialized in advanceTurn, but safety check
                    game.pendingAction = {
                        type: 'JUDGMENT',
                        votes: {}, // Using 'votes' to store actions
                        startTime: Date.now()
                    };
                }

                // Record action
                if (!game.pendingAction.votes) game.pendingAction.votes = {};
                game.pendingAction.votes[playerId] = data.targetId;

                const playerWithNote = game.players.find(p => p.role === Role.KIRA && p.hand.some(c => c.id === CardId.DEATH_NOTE));
                const isKiraWithNote = player.id === playerWithNote?.id;

                // Logic:
                // 1. If Kira with Death Note attacks -> Execute immediately
                if (isKiraWithNote && data.targetId !== 'CONFIRM') {
                    resolveJudgment(io, roomCode, game, data.targetId);
                    return;
                }

                // 2. Check if all alive players have acted/confirmed
                const alivePlayers = game.players.filter(p => p.isAlive);
                const allActed = alivePlayers.every(p => game.pendingAction!.votes![p.id]);

                if (allActed) {
                    // If everyone acted and we are here, it means Kira didn't kill (or no Kira with note)
                    // So execute with null (No death)
                    resolveJudgment(io, roomCode, game, null);
                } else {
                    // Notify updated status (optional)
                    io.to(roomCode).emit('judgment:voted', {
                        voterId: playerId,
                        targetId: 'HIDDEN'
                    });
                }
            }
        });

        socket.on('game:shinigamiFinished', () => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                // 進行済みなら無視
                if (game.currentPlayerId !== 'SHINIGAMI_EFFECT') return;

                const tempInfo = (game as any).tempShinigamiInfo;
                if (!tempInfo) return;

                const { revealedInfo, userId } = tempInfo;

                // temp情報削除
                delete (game as any).tempShinigamiInfo;

                // 情報公開イベント送信 (キラ・ミサにのみ詳細情報を送る)
                if (revealedInfo) {
                    const visibleTo = revealedInfo.visibleTo || [];
                    for (const p of game.players) {
                        const pSocketId = [...playerSockets.entries()].find(([_, pid]) => pid === p.id)?.[0];
                        if (!pSocketId) continue;

                        if (visibleTo.includes(p.id)) {
                            io.to(pSocketId).emit('game:effectReveal', { revealedInfo });
                        }
                    }
                }

                // 使用者のIDに戻してターンを進める
                game.currentPlayerId = userId || playerId;
                advanceTurn(io, game, roomCode);
                return;
            }
        });

        socket.on('game:gunFinished', () => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                // 進行済みなら無視
                if (game.currentPlayerId !== 'GUN_EFFECT') return;

                const gunInfo = (game as any).tempGunInfo;
                if (!gunInfo) return;

                // temp情報削除
                delete (game as any).tempGunInfo;

                // 使用者のIDに戻す
                game.currentPlayerId = gunInfo.playerId;
                const result = gunInfo.result;

                if (result.gameEnd && result.winner) {
                    game.winner = result.winner;
                    game.phase = 'GAME_END' as any;
                    io.to(roomCode).emit('game:ended', { winner: result.winner, finalState: game });
                }

                if (result.revealedInfo) {
                    // 情報公開（特定プレイヤーのみ）
                    const visibleSocketIds: string[] = [];
                    // processGun では visibleTo = state.players.map(p => p.id) 全員公開なので、以下のループで処理できる
                    result.revealedInfo.visibleTo.forEach((pid: string) => {
                        const sid = [...playerSockets.entries()].find(([_, p]) => p === pid)?.[0];
                        if (sid) visibleSocketIds.push(sid);
                    });

                    visibleSocketIds.forEach(sid => {
                        io.to(sid).emit('game:effectReveal', { revealedInfo: result.revealedInfo });
                    });
                }

                // メロが拳銃で殺害した場合の処理
                if (result.deadPlayerId) {
                    processDeath(io, game, roomCode, result.deadPlayerId, gunInfo.playerId, gunInfo.playerRole);
                    // processDeath内でゲーム終了が処理された場合はターンを進めない
                    if (game.phase === GamePhase.GAME_END) return;
                }

                // ターンを進める（GUNの場合、手札から消失などは既に行われているのでターンだけ進める）
                advanceTurn(io, game, roomCode);
            }
        });

        socket.on('game:arrestFinished', () => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                if (game.currentPlayerId !== 'ARREST_EFFECT') return;

                const arrestInfo = (game as any).tempArrestInfo;
                if (!arrestInfo) return;

                delete (game as any).tempArrestInfo;

                game.currentPlayerId = arrestInfo.playerId;
                const result = arrestInfo.result;

                if (result.gameEnd && result.winner) {
                    game.winner = result.winner;
                    game.phase = 'GAME_END' as any;
                    io.to(roomCode).emit('game:ended', { winner: result.winner, finalState: game });
                }

                // effectReveal は既にカード使用時に全員に送信済みなので、ここでは送信しない
            }
        });

        // 逮捕カードめくり演出確認後 → キラ逮捕ムービー再生
        socket.on('game:arrestCardDismissed', () => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                if (game.currentPlayerId !== 'ARREST_EFFECT') return;

                // キラ逮捕ムービー再生指示
                io.to(roomCode).emit('game:playCutscene', { type: 'ARREST' });
            }
        });

        // ==================== Judgment Cutscene Finished ====================

        socket.on('game:judgmentCutsceneFinished', () => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (!player) continue;

                const judgmentInfo = (game as any).tempJudgmentInfo;
                if (!judgmentInfo) return; // 既に処理済み or 情報なし

                // temp情報削除（重複処理防止）
                delete (game as any).tempJudgmentInfo;

                // カットシーン後の処理を実行
                continueAfterJudgmentCutscene(io, roomCode, game, judgmentInfo.result);
                return;
            }
        });

        // ==================== Judgment Events (Duplicate removed) ====================

        // ==================== Chat Events ====================

        socket.on('chat:kiraMisa', (data: { message: string }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            // Find player's room
            for (const [_roomCode, game] of games.entries()) {
                const player = game.players.find((p: Player) => p.id === playerId);
                if (player) {
                    // Check if player is Kira or Misa
                    if (player.role === 'KIRA' || player.role === 'MISA') {
                        const chatMessage = {
                            playerId,
                            playerName: player.name,
                            message: data.message,
                            timestamp: Date.now(),
                        };

                        game.kiraMisaChat.push(chatMessage);

                        // Send to Kira and Misa only
                        game.players
                            .filter((p: Player) => p.role === 'KIRA' || p.role === 'MISA' || p.isSpectator || p.isAlive === false)
                            .forEach((p: Player) => {
                                const socketId = [...playerSockets.entries()]
                                    .find(([_, pid]) => pid === p.id)?.[0];
                                if (socketId) {
                                    io.to(socketId).emit('chat:kiraMisa', chatMessage);
                                }
                            });
                    }
                    break;
                }
            }
        });

        // ==================== Exchange Events (New) ====================

        socket.on('exchange:targetSelectedCard', async (data: { selectedCardInstanceId: string }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            for (const [roomCode, game] of games.entries()) {
                if (!game.pendingExchange || game.pendingExchange.targetId !== playerId) continue;
                if (game.pendingExchange.phase !== 'TARGET_SELECTING') continue;

                const target = game.players.find(p => p.id === playerId);
                if (!target) continue;

                const selectedCard = target.hand.find(c => c.instanceId === data.selectedCardInstanceId);
                if (!selectedCard) {
                    socket.emit('game:error', { message: '指定されたカードがありません' });
                    return;
                }

                // 交換開始
                await completeExchangeTrade(
                    io,
                    game,
                    roomCode,
                    game.pendingExchange.userId,
                    playerId,
                    selectedCard,
                    game.pendingExchange.cardInstanceId
                );
            }
        });

        socket.on('exchange:userSelectedCard', async (data: {
            selectedCardInstanceId: string;
            targetId: string;
            exchangeCardInstanceId: string;
        }) => {
            const playerId = playerSockets.get(socket.id);
            if (!playerId) return;

            let targetRoomCode: string | undefined;
            for (const [code, r] of rooms.entries()) {
                if (r.players.some(p => p.id === playerId)) {
                    targetRoomCode = code;
                    break;
                }
            }

            if (targetRoomCode) {
                await handleUserExchangeSelection(io, targetRoomCode, playerId, data);
            }
        });

        // ==================== Ping ====================

        socket.on('ping', () => {
            socket.emit('pong', { message: 'Server is alive!' });
        });

        // ==================== Disconnect ====================

        socket.on('disconnect', (reason) => {
            console.log(`🔌 Client disconnected: ${socket.id} - ${reason} `);
            handlePlayerLeave(socket, io, true);
        });
    });
}

function handlePlayerLeave(
    socket: TypedSocket,
    io: TypedServer,
    isDisconnect = false
) {
    const playerId = playerSockets.get(socket.id);
    if (!playerId) return;

    // Find and update room
    for (const [roomCode, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex((p: Player) => p.id === playerId);
        if (playerIndex !== -1) {
            const player = room.players[playerIndex];

            if (isDisconnect) {
                // Mark as disconnected (allow reconnect)
                player.isConnected = false;
                io.to(roomCode).emit('room:updated', { room });
            } else {
                // Remove player from room
                room.players.splice(playerIndex, 1);

                // If host left, assign new host
                if (room.hostId === playerId && room.players.length > 0) {
                    room.hostId = room.players[0].id;
                    room.players[0].isHost = true;
                }

                // If room is empty, delete it
                if (room.players.length === 0) {
                    rooms.delete(roomCode);
                    games.delete(roomCode);
                    console.log(`🏠 Room ${roomCode} deleted(empty)`);
                } else {
                    io.to(roomCode).emit('room:updated', { room });
                }
            }

            socket.leave(roomCode);
            break;
        }
    }

    playerSockets.delete(socket.id);
}

/**
 * Resolve Judgment Phase
 */
export function resolveJudgment(io: TypedServer, roomCode: string, game: GameState, targetId: string | null) {
    if (game.phase !== GamePhase.JUDGMENT) return;

    // 既にカットシーン再生中（前回のresolveJudgmentが処理中）なら無視
    if ((game as any).tempJudgmentInfo) return;

    // Use JudgmentProcessor
    const result = JudgmentProcessor.executeJudgment(game, targetId);

    if (result.targetId && !result.survived && result.eliminatedRole) {
        // プレイヤーが殺害される場合 → カットシーンを先に再生

        // phaseを変更してタイムアウトによる再呼び出しを防止
        game.phase = 'JUDGMENT_CUTSCENE' as any;

        // 一時情報を保存
        (game as any).tempJudgmentInfo = {
            result,
            roomCode
        };

        // カットシーン再生指示
        io.to(roomCode).emit('game:playCutscene', { type: 'JUDGMENT' });

        // カットシーン終了後に continueAfterJudgmentCutscene() で処理
        return;
    }

    // 殺害なし（スキップ or 偽名で生存）の場合はカットシーンなしで即座に処理
    continueAfterJudgmentCutscene(io, roomCode, game, result);
}

/**
 * 裁きカットシーン終了後の処理
 */
function continueAfterJudgmentCutscene(
    io: TypedServer,
    roomCode: string,
    game: GameState,
    result: JudgmentResult
) {
    if (result.targetId && !result.survived && result.eliminatedRole) {
        // Player eliminated
        game.players = game.players.map(p =>
            p.id === result.targetId ? { ...p, isAlive: false } : p
        );
        JudgmentProcessor.eliminatePlayer(game, result.targetId);

        io.to(roomCode).emit('game:playerDied', {
            playerId: result.targetId,
            cause: 'JUDGMENT'
        });
    } else if (result.targetId && result.survived && result.usedFakeName) {
        const target = game.players.find(p => p.id === result.targetId);
        if (target) {
            const fakeNameIndex = target.hand.findIndex(c => c.id === CardId.FAKE_NAME);
            if (fakeNameIndex !== -1) {
                const fakeNameCard = target.hand.splice(fakeNameIndex, 1)[0];
                fakeNameCard.isUsed = true;
                if (!fakeNameCard.history) fakeNameCard.history = [];
                fakeNameCard.history.push(`${target.name} が裁きを逃れた`);
                fakeNameCard.usedByName = target.name;
                fakeNameCard.usedByColor = target.color;

                addToDiscardPile(game, fakeNameCard);

                if (game.deck.length === 0) {
                    const allDiscards = [...game.discardPile];
                    if (allDiscards.length > 0) {
                        for (let i = allDiscards.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [allDiscards[i], allDiscards[j]] = [allDiscards[j], allDiscards[i]];
                        }
                        allDiscards.forEach(c => {
                            c.isUsed = false;
                            c.history = undefined;
                        });
                        game.deck = allDiscards;
                        game.discardPile = [];
                    }
                }

                if (game.deck.length > 0) {
                    const newCard = game.deck.shift()!;
                    target.hand.push(newCard);

                    checkAndReplenishDeck(io as unknown as Server<any, any>, game, roomCode);
                }

                // Notify target
                const socketId = [...playerSockets.entries()].find(([_, pid]) => pid === target.id)?.[0];
                if (socketId) {
                    io.to(socketId).emit('game:cardDrawn', { playerId: target.id, card: target.hand[target.hand.length - 1] });
                }

                // We will send effectReveal for Fake Name in the next block so everyone knows
                io.to(roomCode).emit('game:effectReveal', {
                    revealedInfo: {
                        visibleTo: game.players.map(p => p.id),
                        type: 'card',
                        targetId: target.id,
                        targetCard: fakeNameCard,
                    }
                });
            }
        }
    }

    // Check Win Condition
    const winCondition = JudgmentProcessor.checkWinCondition(game);
    if (winCondition) {
        game.winner = winCondition;
        game.phase = GamePhase.GAME_END as any;
        io.to(roomCode).emit('game:ended', { winner: winCondition, finalState: game });
    } else {
        // Proceed to Result Phase
        game.phase = GamePhase.JUDGMENT_RESULT as any;
        io.to(roomCode).emit('judgment:result', {
            eliminatedPlayerId: (!result.survived ? result.targetId : null),
            votes: game.pendingAction?.votes || {},
            usedFakeName: result.usedFakeName,
            survivedTargetId: result.survived && result.usedFakeName ? result.targetId : undefined
        });

        // Notify Phase Change
        io.to(roomCode).emit('game:phaseChanged', { phase: game.phase });

        // Clear pending action
        delete game.pendingAction;

        // Set timeout to start new round
        setTimeout(() => {
            game.phase = GamePhase.INVESTIGATION;
            game.turnCycle++;
            game.turnIndex = 0;
            game.hasDrawnCard = false;

            // スタートプレイヤーが死亡している場合、次の生存プレイヤーにスタート位置を移動
            const alivePlayers = game.players.filter((p: Player) => p.isAlive);
            const startPlayer = game.players.find((p: Player) => p.id === game.startPlayerId);
            if (startPlayer && !startPlayer.isAlive) {
                // 元のスタートプレイヤーの全体配列でのインデックスを取得
                const allIndex = game.players.findIndex((p: Player) => p.id === game.startPlayerId);
                // 元のスタートプレイヤーの次の生存プレイヤーを探す
                let newStartPlayer: Player | null = null;
                for (let i = 1; i < game.players.length; i++) {
                    const candidate = game.players[(allIndex + i) % game.players.length];
                    if (candidate.isAlive) {
                        newStartPlayer = candidate;
                        break;
                    }
                }
                if (newStartPlayer) {
                    game.startPlayerId = newStartPlayer.id;
                    console.log(`🔄 Start player updated to ${newStartPlayer.name} (previous start player died)`);
                }
            }

            // currentPlayerIdをスタートプレイヤーに設定
            game.currentPlayerId = game.startPlayerId;

            io.to(roomCode).emit('game:phaseChanged', { phase: game.phase });
            broadcastGameState(io, game, roomCode);

            // 次のターンのプレイヤーがボットなら行動を開始
            const nextPlayer = game.players.find(p => p.id === game.currentPlayerId);
            const nextSocketId = nextPlayer ? [...playerSockets.entries()].find(([_, pid]) => pid === nextPlayer.id)?.[0] : null;
            if (nextPlayer && !nextSocketId && nextPlayer.id.startsWith('npc-')) {
                import('../game/botLogic.js').then(({ BotLogic }) => {
                    BotLogic.executeBotTurn(io, game, roomCode, nextPlayer.id, advanceTurn, broadcastGameState);
                });
            }
        }, 5000);
    }
}

export async function handleUserExchangeSelection(
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    roomCode: string,
    playerId: string,
    data: {
        selectedCardInstanceId: string;
        targetId: string;
        exchangeCardInstanceId: string;
    }
) {
    const game = games.get(roomCode);
    if (!game) return;
    if (!game.pendingExchange || game.pendingExchange.userId !== playerId) return;

    const user = game.players.find(p => p.id === playerId);
    const target = game.players.find(p => p.id === data.targetId);

    if (!user || !target) return;

    // 選択したカードIDを保存
    game.pendingExchange.userSelectedCardInstanceId = data.selectedCardInstanceId;

    // ターゲットが番号変更能力を持っているかチェック
    const cantargetModifyNumber = checkCanModifyNumber(target);

    if (cantargetModifyNumber && target.hand.length > 1) {
        // Phase transitions to TARGET_SELECTING
        game.pendingExchange.phase = 'TARGET_SELECTING';
        game.pendingExchange.startTime = Date.now();

        const socketId = [...playerSockets.entries()]
            .find(([_, pid]) => pid === target.id)?.[0];

        if (socketId) {
            io.to(socketId).emit('exchange:selectCardToGive', {
                requesterId: user.id,
                requesterName: user.name,
                yourHand: target.hand,
                canModifyNumber: true
            });
        }

        io.to(roomCode).emit('exchange:waiting', {
            userId: user.id,
            targetId: target.id,
            message: `${target.name}が渡すカードを選んでいます`,
        });

        broadcastGameState(io, game, roomCode);

        if (target.id.startsWith('npc-')) {
            BotLogic.handleBotExchangeTarget(io, game, roomCode, completeExchangeTrade);
        }
    } else {
        // Target automatically selects lowest
        const lowestCard = target.hand.length > 0
            ? target.hand.reduce((min, c) => c.id < min.id ? c : min)
            : undefined;

        await completeExchangeTrade(
            io,
            game,
            roomCode,
            user.id,
            target.id,
            lowestCard as Card, // 0枚の場合は後続のcompleteExchangeTradeで適切に処理させる
            data.exchangeCardInstanceId,
            game.pendingExchange.exchangeCard
        );
    }
}
