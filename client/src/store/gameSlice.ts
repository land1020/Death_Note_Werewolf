import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
    GameState,
    GamePhase,
    Card,
    ChatMessage,
    TransferInfo,
    RevealedCard,
    WinCondition,
    Role
} from 'shared/types';

// プライベートな転送情報のローカルキャッシュ
// サーバーからの publicInfo.transferHistory は hiddenCard (id: -1) で送られるため、
// cardTransferred イベントで受け取った実カード情報をここに保持してマージする
const privateTransferCache: Map<string, TransferInfo> = new Map();

const initialState: GameState = {
    roomCode: '',
    phase: 'LOBBY' as GamePhase,
    round: 0,
    turnIndex: 0,
    turnCycle: 0,
    currentPlayerId: '',
    startPlayerId: '',
    players: [],
    deck: [],
    discardPile: [],
    roundDiscardPile: [],
    removedCards: [],
    kiraMisaChat: [],
    winner: null,
    publicInfo: {
        revealedCards: [],
        revealedRoles: [],
        lastDiscard: null,
        transferHistory: [],
    },
    hasDrawnCard: false,
};

const gameSlice = createSlice({
    name: 'game',
    initialState,
    reducers: {
        // ゲーム開始
        startGame: (_state, action: PayloadAction<GameState>) => {
            privateTransferCache.clear();
            return action.payload;
        },

        // ゲーム状態更新
        updateGameState: (state, action: PayloadAction<Partial<GameState>>) => {
            // publicInfo.transferHistory をマージ前に一時保存
            const incomingTransferHistory = action.payload.publicInfo?.transferHistory;

            Object.assign(state, action.payload);

            // サーバー側で delete されたため payload に含まれない可能性のある重要なプロパティを同期
            if (!('pendingAction' in action.payload)) {
                state.pendingAction = undefined;
            }
            if (!('pendingExchange' in action.payload)) {
                state.pendingExchange = undefined;
            }
            if (!('judgmentResult' in action.payload)) {
                state.judgmentResult = undefined;
            }

            // サーバーからの transferHistory に hiddenCard (id: -1) が含まれている場合、
            // ローカルキャッシュのプライベート情報でマージする
            if (incomingTransferHistory && state.publicInfo.transferHistory) {
                state.publicInfo.transferHistory = state.publicInfo.transferHistory.map(t => {
                    if (t.card && (t.card as any).id === -1) {
                        const key = `${t.fromPlayerId}->${t.toPlayerId}-${t.direction}`;
                        const cached = privateTransferCache.get(key);
                        if (cached) {
                            return { ...t, card: cached.card };
                        }
                    }
                    return t;
                });
            }
        },

        // フェーズ変更
        setPhase: (state, action: PayloadAction<GamePhase>) => {
            state.phase = action.payload;
        },

        // ラウンド進行
        nextRound: (state) => {
            state.round += 1;
            state.turnIndex = 0;
            state.turnCycle = 0;
        },

        // ターン進行
        nextTurn: (state, action: PayloadAction<{ playerId: string; turnIndex: number }>) => {
            state.currentPlayerId = action.payload.playerId;
            state.turnIndex = action.payload.turnIndex;
        },

        // プレイヤー手札更新
        updatePlayerHand: (state, action: PayloadAction<{ playerId: string; hand: Card[] }>) => {
            const player = state.players.find(p => p.id === action.payload.playerId);
            if (player) {
                player.hand = action.payload.hand;
            }
        },

        // カードドロー
        cardDrawn: (state, action: PayloadAction<{ playerId: string; card?: Card }>) => {
            if (action.payload.card) {
                const player = state.players.find(p => p.id === action.payload.playerId);
                if (player) {
                    player.hand.push(action.payload.card);
                }
            }
        },

        // カード使用
        cardUsed: (state, action: PayloadAction<{ playerId: string; cardInstanceId: string }>) => {
            const player = state.players.find(p => p.id === action.payload.playerId);
            if (player) {
                const cardIndex = player.hand.findIndex(c => c.instanceId === action.payload.cardInstanceId);
                if (cardIndex !== -1) {
                    const [usedCard] = player.hand.splice(cardIndex, 1);
                    usedCard.isUsed = true;
                    if (!usedCard.history) usedCard.history = [];
                    if (usedCard.id === 1) { // CardId.ARREST = 1
                        usedCard.history.push(`${player.name} が逮捕を使用`);
                        state.removedCards = state.removedCards || [];
                        state.removedCards.push(usedCard);
                    } else {
                        usedCard.history.push(`${player.name} が使用`);
                        state.roundDiscardPile = state.roundDiscardPile || [];
                        state.roundDiscardPile.push(usedCard);
                        while (state.roundDiscardPile.length > state.players.length) {
                            const oldestCard = state.roundDiscardPile.shift();
                            if (oldestCard) {
                                state.discardPile = state.discardPile || [];
                                state.discardPile.push(oldestCard);
                            }
                        }
                    }
                }
            }
        },

        // カード捨て
        cardDiscarded: (state, action: PayloadAction<{ playerId: string; cardInstanceId: string }>) => {
            const player = state.players.find(p => p.id === action.payload.playerId);
            if (player) {
                const cardIndex = player.hand.findIndex(c => c.instanceId === action.payload.cardInstanceId);
                if (cardIndex !== -1) {
                    const [discardedCard] = player.hand.splice(cardIndex, 1);
                    if (!discardedCard.history) discardedCard.history = [];
                    discardedCard.history.push(`${player.name} が捨てた`);
                    state.roundDiscardPile = state.roundDiscardPile || [];
                    state.roundDiscardPile.push(discardedCard);
                    while (state.roundDiscardPile.length > state.players.length) {
                        const oldestCard = state.roundDiscardPile.shift();
                        if (oldestCard) {
                            state.discardPile = state.discardPile || [];
                            state.discardPile.push(oldestCard);
                        }
                    }
                    state.publicInfo.lastDiscard = discardedCard;
                }
            }
        },

        // カード移動
        cardTransferred: (state, action: PayloadAction<{ transfers: TransferInfo[] }>) => {
            action.payload.transfers.forEach(transfer => {
                const fromPlayer = state.players.find(p => p.id === transfer.fromPlayerId);
                const toPlayer = state.players.find(p => p.id === transfer.toPlayerId);

                if (fromPlayer && toPlayer) {
                    // 手札から探して移動
                    // 注: サーバー側ですでに移動済みだが、念のためクライアント側でも同期
                    // ただし、カードオブジェクトが完全には一致しない場合がある（instanceId依存）
                    const cardIndex = fromPlayer.hand.findIndex(c => c.instanceId === transfer.card.instanceId);
                    if (cardIndex !== -1) {
                        const [card] = fromPlayer.hand.splice(cardIndex, 1);
                        toPlayer.hand.push(card);
                    } else {
                        // 手札に見つからない場合（同期ズレなど）、強制的に追加するか無視するか
                        // ここでは、transfer情報にあるカードを追加する
                        if (transfer.card && (transfer.card as any).id !== -1) {
                            toPlayer.hand.push(transfer.card);
                        }
                    }
                }

                // プライベートなカード情報をキャッシュに保存
                // (hiddenCard でないもの = 実カード情報)
                if (transfer.card && (transfer.card as any).id !== -1) {
                    const key = `${transfer.fromPlayerId}->${transfer.toPlayerId}-${transfer.direction}`;
                    privateTransferCache.set(key, { ...transfer });
                }
            });

            // transferHistory にもプライベート情報をマージして追加
            const mergedTransfers = action.payload.transfers.map(t => {
                if (t.card && (t.card as any).id === -1) {
                    const key = `${t.fromPlayerId}->${t.toPlayerId}-${t.direction}`;
                    const cached = privateTransferCache.get(key);
                    if (cached) {
                        return { ...t, card: cached.card };
                    }
                }
                return t;
            });
            state.publicInfo.transferHistory.push(...mergedTransfers);
        },

        // 役職公開
        roleRevealed: (state, action: PayloadAction<{ playerId: string; role: Role }>) => {
            state.publicInfo.revealedRoles.push(action.payload);
        },

        // カード公開
        cardRevealed: (state, action: PayloadAction<RevealedCard>) => {
            state.publicInfo.revealedCards.push(action.payload);
        },

        // プレイヤー死亡
        playerDied: (state, action: PayloadAction<{ playerId: string }>) => {
            const player = state.players.find(p => p.id === action.payload.playerId);
            if (player) {
                player.isAlive = false;
            }
        },

        // キラ-ミサチャット追加
        addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
            state.kiraMisaChat.push(action.payload);
        },

        // ゲーム終了
        endGame: (state, action: PayloadAction<{ winner: WinCondition }>) => {
            state.winner = action.payload.winner;
            state.phase = 'GAME_END' as GamePhase;
        },

        // ゲームリセット
        resetGame: () => {
            privateTransferCache.clear();
            return initialState;
        },

        // 裁きの結果
        setJudgmentResult: (state, action: PayloadAction<{ eliminatedPlayerId: string | null; votes: Record<string, string>; usedFakeName?: boolean; survivedTargetId?: string | null }>) => {
            const { eliminatedPlayerId, votes, usedFakeName, survivedTargetId } = action.payload;

            let targetName = undefined;
            let targetRole = undefined;
            let survived = undefined;

            if (eliminatedPlayerId) {
                const target = state.players.find(p => p.id === eliminatedPlayerId);
                if (target) {
                    targetName = target.name;
                    targetRole = target.role ?? undefined;
                    survived = false;
                }
            } else if (survivedTargetId && usedFakeName) {
                const target = state.players.find(p => p.id === survivedTargetId);
                if (target) {
                    targetName = target.name;
                    targetRole = target.role ?? undefined;
                    survived = true;
                }
            }

            state.judgmentResult = {
                eliminatedPlayerId,
                votes,
                usedFakeName,
                targetName,
                targetRole,
                survived
            };
        },
    },
});

export const {
    startGame,
    updateGameState,
    setPhase,
    nextRound,
    nextTurn,
    updatePlayerHand,
    cardDrawn,
    cardUsed,
    cardDiscarded,
    cardTransferred,
    roleRevealed,
    cardRevealed,
    playerDied,
    addChatMessage,
    endGame,
    resetGame,
    setJudgmentResult,
} = gameSlice.actions;

export default gameSlice.reducer;

// Selectors
export const selectGamePhase = (state: { game: GameState }) => state.game.phase;
export const selectGamePlayers = (state: { game: GameState }) => state.game.players;
export const selectCurrentPlayer = (state: { game: GameState }) =>
    state.game.players.find(p => p.id === state.game.currentPlayerId);
export const selectAlivePlayers = (state: { game: GameState }) =>
    state.game.players.filter(p => p.isAlive);
export const selectPublicInfo = (state: { game: GameState }) => state.game.publicInfo;
export const selectWinner = (state: { game: GameState }) => state.game.winner;
export const selectRound = (state: { game: GameState }) => state.game.round;
export const selectRoundDiscardPile = (state: { game: GameState }) => state.game.roundDiscardPile;
export const selectRemovedCards = (state: { game: GameState }) => state.game.removedCards;
