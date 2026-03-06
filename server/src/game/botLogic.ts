import { GameState, CardId, Player, Card, GamePhase } from '../../../shared/types/index.js';
import { CardEffectProcessor, CardEffectResult, checkCanModifyNumber } from './cardEffects.js';
import { DebugLogger } from './debugLogger.js';
import { checkAndReplenishDeck } from './gameLogic.js';

/**
 * NPCボットのAIロジック
 * デバッグモードでのシングルプレイヤーテスト用
 */
export class BotLogic {
    /**
     * ボットのターンを自動処理する
     * 1. カードをドロー
     * 2. ランダムにカードを使用（使えるカードがあれば）
     * 3. ターンを進める
     */
    static async executeBotTurn(
        io: any,
        game: GameState,
        roomCode: string,
        botId: string,
        advanceTurnFn: (io: any, game: GameState, roomCode: string) => void,
        broadcastFn: (io: any, game: GameState, roomCode: string) => void
    ) {
        const bot = game.players.find(p => p.id === botId);
        if (!bot || !bot.isAlive) return;
        if (game.currentPlayerId !== botId) return;

        DebugLogger.log(io, roomCode, `🤖 ${bot.name} のターン開始`, 'game');

        // 少し待つ（リアルっぽく）
        await new Promise(resolve => setTimeout(resolve, 1500));

        // ターンが変わっていないか安全チェック
        if (game.currentPlayerId !== botId) return;

        // Step 1: カードをドロー
        if (!game.hasDrawnCard && game.deck.length > 0) {
            const drawnCard = game.deck.shift()!;
            bot.hand.push(drawnCard);
            game.hasDrawnCard = true;
            DebugLogger.log(io, roomCode, `🤖 ${bot.name} がカードをドロー: ${drawnCard.name}`, 'game');
            checkAndReplenishDeck(io, game, roomCode);

            // ドロー後に初期手札フラグをクリア（死神カードの自動発動を有効にする）
            bot.hand.forEach(c => { delete c.isInitialHand; });

            // 死神カードの自動発動チェック
            const { triggerAutoShinigamiIfNeeded } = await import('../socket/index.js');
            const triggered = await triggerAutoShinigamiIfNeeded(io, game, roomCode, botId);
            if (triggered) {
                // 死神が発動した場合、ターン進行はtriggerAutoShinigamiIfNeeded内で処理されるので終了
                return;
            }

            broadcastFn(io, game, roomCode);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        // ターンが変わっていないか安全チェック
        if (game.currentPlayerId !== botId) return;

        // Step 2: カードを使用
        const usableCards = bot.hand.filter(c => {
            // パッシブカード・使用済みカードを除外
            if ([CardId.DEATH_NOTE, CardId.FAKE_NAME, CardId.ALIBI].includes(c.id)) return false;
            if (c.isUsed) return false;
            // 取調と死神は複雑なのでボットはスキップ
            if ([CardId.INTERROGATION, CardId.SHINIGAMI].includes(c.id)) return false;
            // 交換は使用可能にする
            // 役職制限チェック: 逮捕はL/ワタリのみ、拳銃は警察のみ
            if (c.id === CardId.ARREST && bot.role !== 'L' && bot.role !== 'WATARI') return false;
            if (c.id === CardId.GUN && bot.role !== 'POLICE') return false;
            return true;
        });

        if (usableCards.length > 0) {
            // ランダムにカードを選択
            const card = usableCards[Math.floor(Math.random() * usableCards.length)];
            const otherAlive = game.players.filter(p => p.id !== botId && p.isAlive);

            let result: CardEffectResult = { success: false };
            let targetId: string | undefined;

            if (otherAlive.length > 0) {
                targetId = otherAlive[Math.floor(Math.random() * otherAlive.length)].id;
            }

            DebugLogger.log(io, roomCode, `🤖 ${bot.name} が ${card.name} を使用${targetId ? ` (対象: ${game.players.find(p => p.id === targetId)?.name})` : ''}`, 'game');

            // カード効果処理
            switch (card.id) {
                case CardId.ARREST:
                    if (targetId) result = CardEffectProcessor.processArrest(game, botId, targetId);
                    break;
                case CardId.GUN:
                    if (targetId) result = CardEffectProcessor.processGun(game, botId, targetId);
                    break;
                case CardId.WITNESS:
                    if (targetId) result = CardEffectProcessor.processWitness(game, botId, targetId);
                    break;
                case CardId.SURVEILLANCE:
                    if (targetId) result = CardEffectProcessor.processSurveillance(game, botId, targetId);
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
                    if (targetId) {
                        result = CardEffectProcessor.processExchange(game, botId, targetId, card.instanceId);
                        if (result.success && game.pendingExchange) {
                            // socket/index.tsと同様に、交換カードオブジェクトをセット
                            game.pendingExchange.exchangeCard = card;
                        }
                    }
                    break;
                default:
                    break;
            }

            if (result.success) {
                // カードを手札から除去、捨て札へ（交換カードはcompleteExchangeTradeが処理するためスキップ）
                if (card.id !== CardId.EXCHANGE) {
                    const cardIndex = bot.hand.findIndex(c => c.instanceId === card.instanceId);
                    if (cardIndex !== -1) {
                        bot.hand.splice(cardIndex, 1);
                        card.isUsed = true;
                        if (card.id === CardId.ARREST) {
                            game.removedCards.push(card);

                            // 逮捕カード除外によるゲーム終了判定 (キラ勝利条件) - 逮捕自体が成功してゲームエンドが確定済みの場合はスキップ
                            if (!result.gameEnd) {
                                const { checkWinCondition, endGame } = await import('./gameLogic.js');
                                const winner = checkWinCondition(game);
                                if (winner) {
                                    endGame(io, game, roomCode, winner);
                                    return;
                                }
                            }
                        } else {
                            const { addToDiscardPile } = await import('./gameLogic.js');
                            addToDiscardPile(game, card);
                        }
                    }
                }

                // 死亡処理
                if (result.deadPlayerId) {
                    const { processDeath } = await import('./gameLogic.js');
                    processDeath(io, game, roomCode, result.deadPlayerId, botId, bot.role || undefined);
                }

                // ゲーム終了判定（逮捕成功 etc.）
                if (result.gameEnd && result.winner) {
                    game.winner = result.winner;
                    game.phase = GamePhase.GAME_END;
                    if (card.id === CardId.ARREST) {
                        game.kiraArrested = true;
                    }

                    // カード使用通知
                    io.to(roomCode).emit('game:cardUsed', {
                        playerId: botId,
                        playerName: bot.name,
                        cardId: card.id,
                        cardName: card.name,
                        targetPlayerId: targetId,
                    });

                    // 逮捕判定結果を全員に送信
                    if (result.revealedInfo) {
                        const { playerSockets } = await import('../socket/index.js');
                        const visibleSocketIds: string[] = [];
                        result.revealedInfo.visibleTo.forEach((pid: string) => {
                            const sid = [...playerSockets.entries()].find(([_, p]) => p === pid)?.[0];
                            if (sid) visibleSocketIds.push(sid);
                        });
                        visibleSocketIds.forEach((sid: string) => {
                            io.to(sid).emit('game:effectReveal', { revealedInfo: result.revealedInfo! });
                        });
                    }

                    DebugLogger.log(io, roomCode, `🏆 ${bot.name} が逮捕成功！ゲーム終了: ${result.winner}`, 'game');

                    // NPC: カットシーン再生の猶予を持たせた後にゲーム終了通知
                    io.to(roomCode).emit('game:playCutscene', { type: 'ARREST' });
                    setTimeout(() => {
                        io.to(roomCode).emit('game:ended', { winner: result.winner, finalState: game });
                        broadcastFn(io, game, roomCode);
                    }, 5000);
                    return;
                }

                if (game.phase === GamePhase.GAME_END) return;

                // カード使用通知
                io.to(roomCode).emit('game:cardUsed', {
                    playerId: botId,
                    playerName: bot.name,
                    cardId: card.id,
                    cardName: card.name,
                    targetPlayerId: targetId,
                });

                if (result.transfers) {
                    game.publicInfo.transferHistory.push(...result.transfers);
                    io.to(roomCode).emit('game:cardTransferred', { transfers: result.transfers });
                }

                if (result.revealedInfo) {
                    // 情報公開（特定プレイヤーのみ）
                    const { playerSockets } = await import('../socket/index.js');
                    const visibleSocketIds: string[] = [];
                    result.revealedInfo.visibleTo.forEach((pid: string) => {
                        const sid = [...playerSockets.entries()].find(([_, p]) => p === pid)?.[0];
                        if (sid) visibleSocketIds.push(sid);
                    });

                    visibleSocketIds.forEach((sid: string) => {
                        io.to(sid).emit('game:effectReveal', { revealedInfo: result.revealedInfo! });
                    });
                }

                DebugLogger.log(io, roomCode, `🤖 ${bot.name} のカード使用成功: ${card.name}`, 'game');

                // 投票の場合はpendingActionがあるのでターンを進めない
                if (game.pendingAction) {
                    broadcastFn(io, game, roomCode);
                    // ボット自身の投票もランダムに行う
                    if (game.pendingAction.type === 'VOTE') {
                        await BotLogic.handleBotVoteResponse(io, game, roomCode, broadcastFn, advanceTurnFn);
                    }
                    return;
                }

                // 交換が保留になった場合（ターゲットが人間の場合は待機）
                if (game.pendingExchange) {
                    // ボットが使用者の場合、自動でカードを選んで渡す
                    if (game.pendingExchange.phase === 'USER_SELECTING' && game.pendingExchange.userId === botId) {
                        const selectableCards = bot.hand.filter(c => c.instanceId !== card.instanceId);
                        if (selectableCards.length > 0) {
                            let selectedCard: Card;
                            if (checkCanModifyNumber(bot)) {
                                selectedCard = selectableCards[Math.floor(Math.random() * selectableCards.length)];
                            } else {
                                selectedCard = selectableCards.reduce((min, c) => c.id < min.id ? c : min, selectableCards[0]);
                            }
                            DebugLogger.log(io, roomCode, `🤖 ${bot.name} が交換で ${selectedCard.name} を渡すカードとして選択`, 'game');

                            // handleUserExchangeSelectionを呼び出す
                            const { handleUserExchangeSelection } = await import('../socket/index.js');
                            handleUserExchangeSelection(io, roomCode, botId, {
                                selectedCardInstanceId: selectedCard.instanceId,
                                targetId: targetId!,
                                exchangeCardInstanceId: card.instanceId
                            });
                        }
                    }
                    return;
                }
            } else {
                DebugLogger.log(io, roomCode, `🤖 ${bot.name} のカード使用失敗: ${result.message || '不明'}`, 'warn');
            }
        } else {
            // 使用できるカードがない場合は、捨てられるカードを探して捨てる
            const discardableCards = bot.hand.filter(c => {
                if ([CardId.DEATH_NOTE, CardId.FAKE_NAME, CardId.ALIBI, CardId.SHINIGAMI].includes(c.id)) return false;
                if (c.id === CardId.ARREST && bot.role !== 'L' && bot.role !== 'WATARI') return false; // L陣営以外は逮捕状を捨てられない（ここでは使用不可と同じ扱いにするため）
                // 完全に捨てられないカードは DEATH_NOTE 等
                return true;
            });

            if (discardableCards.length > 0) {
                const cardToDiscard = discardableCards[Math.floor(Math.random() * discardableCards.length)];
                DebugLogger.log(io, roomCode, `🤖 ${bot.name} は使えるカードがないため ${cardToDiscard.name} を捨てた`, 'game');

                const cardIndex = bot.hand.findIndex(c => c.instanceId === cardToDiscard.instanceId);
                if (cardIndex !== -1) {
                    bot.hand.splice(cardIndex, 1);
                    if (!cardToDiscard.history) cardToDiscard.history = [];
                    cardToDiscard.history.push(`${bot.name} が捨てた(NPC)`);

                    if (cardToDiscard.id !== CardId.DEATH_NOTE) {
                        const { addToDiscardPile } = await import('./gameLogic.js');
                        addToDiscardPile(game, cardToDiscard);
                    }

                    io.to(roomCode).emit('game:cardDiscarded', {
                        playerId: botId,
                        playerName: bot.name,
                        cardInstanceId: cardToDiscard.instanceId
                    });
                }
            } else {
                DebugLogger.log(io, roomCode, `🤖 ${bot.name} は使えるカードも捨てられるカードもなく、ターン終了`, 'game');
            }
        }

        // Step 3: ターンを進める
        advanceTurnFn(io, game, roomCode);
    }

    /**
     * ボットの投票応答を処理（投票・裁き）
     */
    static async handleBotVoteResponse(
        io: any,
        game: GameState,
        roomCode: string,
        broadcastFn: (io: any, game: GameState, roomCode: string) => void,
        advanceTurnFn: (io: any, game: GameState, roomCode: string) => void
    ) {
        if (!game.pendingAction || game.pendingAction.type !== 'VOTE') return;

        // 少し待つ
        await new Promise(resolve => setTimeout(resolve, 800));

        const aliveBots = game.players.filter(p => p.isAlive && p.id.startsWith('npc-'));
        const aliveAll = game.players.filter(p => p.isAlive);

        for (const bot of aliveBots) {
            if (!game.pendingAction || !game.pendingAction.votes) break;
            if (game.pendingAction.votes[bot.id]) continue; // 投票済み

            // ランダム投票
            const target = aliveAll[Math.floor(Math.random() * aliveAll.length)];
            game.pendingAction.votes[bot.id] = target.id;
            DebugLogger.log(io, roomCode, `🤖 ${bot.name} が ${target.name} に投票`, 'game');
        }

        // 全員投票したかチェック
        const allVoted = aliveAll.every(p => game.pendingAction?.votes?.[p.id]);
        if (allVoted && game.pendingAction) {
            const result = CardEffectProcessor.processVoteResults(
                game,
                new Map(Object.entries(game.pendingAction.votes!))
            );
            delete game.pendingAction;

            if (result.revealedInfo) {
                io.to(roomCode).emit('game:effectReveal', { revealedInfo: result.revealedInfo });
            }

            advanceTurnFn(io, game, roomCode);
        } else {
            broadcastFn(io, game, roomCode);
        }
    }

    /**
     * 裁きフェーズでのボットの行動
     */
    static async handleBotJudgmentAction(
        io: any,
        game: GameState,
        roomCode: string
    ) {
        if (game.phase !== GamePhase.JUDGMENT) return;

        await new Promise(resolve => setTimeout(resolve, 1000));

        const aliveBots = game.players.filter(p => p.isAlive && p.id.startsWith('npc-'));
        const aliveAll = game.players.filter(p => p.isAlive);

        let kiraActed = false;

        for (const bot of aliveBots) {
            if (!game.pendingAction || !game.pendingAction.votes) continue;
            if (game.pendingAction.votes[bot.id]) continue;

            const isKira = bot.role === 'KIRA';
            const hasDeathNote = bot.hand.some(c => c.id === 0);

            if (isKira && hasDeathNote) {
                // キラでデスノートを持っていれば誰かを殺す
                const targets = aliveAll.filter(p => p.id !== bot.id);
                if (targets.length > 0) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    game.pendingAction.votes[bot.id] = target.id;
                    kiraActed = true;
                    DebugLogger.log(io, roomCode, `🤖 ${bot.name} (キラ) が裁きでターゲットを選択`, 'game');
                } else {
                    game.pendingAction.votes[bot.id] = 'CONFIRM';
                }
            } else {
                // 通常ボットは「スキップ」（CONFIRM）を選択
                game.pendingAction.votes[bot.id] = 'CONFIRM';
                DebugLogger.log(io, roomCode, `🤖 ${bot.name} が裁きで「スキップ」を選択`, 'game');
            }
        }

        // キラが行動（殺害）した場合は即座にリゾルブ
        if (kiraActed) {
            const { resolveJudgment } = await import('../socket/index.js');
            const kiraBot = aliveBots.find(p => p.role === 'KIRA');
            if (kiraBot && game.pendingAction && game.pendingAction.votes) {
                const targetId = game.pendingAction.votes[kiraBot.id];
                if (targetId && targetId !== 'CONFIRM') {
                    resolveJudgment(io, roomCode, game, targetId);
                    return;
                }
            }
        }

        // 全員確認したかチェック
        const allActed = aliveAll.every(p => game.pendingAction?.votes?.[p.id]);
        if (allActed && game.pendingAction) {
            const { resolveJudgment } = await import('../socket/index.js');
            resolveJudgment(io, roomCode, game, null);
        }
    }

    /**
     * 取調フェーズでのボットのカード選択
     */
    static async handleBotInterrogationResponse(
        io: any,
        game: GameState,
        roomCode: string,
        broadcastFn: (io: any, game: GameState, roomCode: string) => void,
        advanceTurnFn: (io: any, game: GameState, roomCode: string) => void
    ) {
        if (!game.pendingAction || game.pendingAction.type !== 'INTERROGATION') return;

        await new Promise(resolve => setTimeout(resolve, 800));

        const aliveBots = game.players.filter(p => p.isAlive && p.id.startsWith('npc-'));

        for (const bot of aliveBots) {
            if (!game.pendingAction?.cardSelections) break;
            if (game.pendingAction.cardSelections[bot.id]) continue;

            // 番号変更能力を考慮したカード選択
            if (bot.hand.length > 0) {
                let selectedCard: Card;
                if (checkCanModifyNumber(bot)) {
                    // 能力あり: ランダム選択（番号を読み替えられるため任意）
                    selectedCard = bot.hand[Math.floor(Math.random() * bot.hand.length)];
                } else {
                    // 能力なし: 最小番号カードのみ
                    selectedCard = bot.hand.reduce((min, c) => c.id < min.id ? c : min, bot.hand[0]);
                }
                game.pendingAction.cardSelections[bot.id] = selectedCard.instanceId;
                DebugLogger.log(io, roomCode, `🤖 ${bot.name} が取調で ${selectedCard.name} を公開`, 'game');
            }
        }

        // 全員選択済みかチェック
        const aliveAll = game.players.filter(p => p.isAlive);
        const allSelected = aliveAll.every(p => game.pendingAction?.cardSelections?.[p.id]);

        if (allSelected && game.pendingAction) {
            const result = CardEffectProcessor.processInterrogation(
                game,
                game.pendingAction.direction!,
                new Map(Object.entries(game.pendingAction.cardSelections!))
            );

            delete game.pendingAction;

            if (result.success && result.transfers) {
                game.publicInfo.transferHistory.push(...result.transfers);
                io.to(roomCode).emit('game:cardTransferred', { transfers: result.transfers });
            }

            advanceTurnFn(io, game, roomCode);
        } else {
            broadcastFn(io, game, roomCode);
        }
    }

    /**
     * 交換フェーズでターゲットに選ばれた場合のボットの行動（自動でカードを渡す）
     */
    static async handleBotExchangeTarget(
        io: any,
        game: GameState,
        roomCode: string,
        proceedToPhase4Fn: (
            io: any,
            game: GameState,
            roomCode: string,
            userId: string,
            targetId: string,
            cardFromTarget: Card,
            exchangeCardInstanceId: string
        ) => void
    ) {
        if (!game.pendingExchange || game.pendingExchange.phase !== 'TARGET_SELECTING') return;

        const target = game.players.find(p => p.id === game.pendingExchange!.targetId);
        if (!target || !target.isAlive || !target.id.startsWith('npc-')) return;

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (target.hand.length > 0) {
            let selectedCard: Card;
            if (checkCanModifyNumber(target)) {
                // 能力あり: ランダム選択（番号を読み替えられるため任意）
                selectedCard = target.hand[Math.floor(Math.random() * target.hand.length)];
            } else {
                // 能力なし: 最小番号カードのみ
                selectedCard = target.hand.reduce((min, c) => c.id < min.id ? c : min, target.hand[0]);
            }
            DebugLogger.log(io, roomCode, `🤖 ${target.name} が交換で ${selectedCard.name} を選択`, 'game');
            proceedToPhase4Fn(
                io,
                game,
                roomCode,
                game.pendingExchange.userId,
                target.id,
                selectedCard,
                game.pendingExchange.cardInstanceId
            );
        } else {
            DebugLogger.log(io, roomCode, `🤖 ${target.name} は交換できるカードがありません`, 'game');
            proceedToPhase4Fn(
                io,
                game,
                roomCode,
                game.pendingExchange.userId,
                target.id,
                undefined as any, // 0枚の場合はundefined。completeExchangeTradeで適切に処理させる
                game.pendingExchange.cardInstanceId
            );
        }
    }

    /**
     * 交換フェーズで使用者がボットの場合（人間からカードを受け取り、返すカードを選択する）
     */
    static async handleBotExchangeUserSelect(
        io: any,
        game: GameState,
        roomCode: string,
        broadcastFn: (io: any, game: GameState, roomCode: string) => void,
        advanceTurnFn: (io: any, game: GameState, roomCode: string) => void
    ) {
        if (!game.pendingExchange || game.pendingExchange.phase !== 'USER_SELECTING') return;

        const user = game.players.find(p => p.id === game.pendingExchange!.userId);
        if (!user || (!user.id.startsWith('npc-')) || !user.isAlive) return;

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 手札から、渡されたカード（cardInstanceId）以外をランダムに選んで返す
        const selectableCards = user.hand.filter(c => c.instanceId !== game.pendingExchange!.cardInstanceId);
        if (selectableCards.length > 0) {
            const randomCard = selectableCards[Math.floor(Math.random() * selectableCards.length)];
            DebugLogger.log(io, roomCode, `🤖 ${user.name} が交換(返却)で ${randomCard.name} を選択`, 'game');

            // socket/index.ts の exchange:userSelect と同等の処理
            const target = game.players.find(p => p.id === game.pendingExchange!.targetId);
            if (target) {
                // ボットの手札から削除
                user.hand = user.hand.filter(c => c.instanceId !== randomCard.instanceId);
                // ターゲットの手札に追加
                target.hand.push(randomCard);

                // Transfer履歴登録 (ボットからターゲット)
                game.publicInfo.transferHistory.push({
                    fromPlayerId: user.id,
                    fromPlayerName: user.name,
                    toPlayerId: target.id,
                    toPlayerName: target.name,
                    card: randomCard,
                    direction: 'RIGHT'
                });

                // Pending解除とターン終了
                delete game.pendingExchange;
                io.to(roomCode).emit('game:cardTransferred', { transfers: [...game.publicInfo.transferHistory] });
                advanceTurnFn(io, game, roomCode);
            }
        }
    }
}
