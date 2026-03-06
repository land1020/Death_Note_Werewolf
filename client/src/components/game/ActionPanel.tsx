import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, GamePhase, CardId } from 'shared/types';
import { socketClient } from '../../socket';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { selectMyPlayerId } from '../../store/roomSlice';
import { selectGamePlayers } from '../../store/gameSlice';
import { clearSelection, selectStolenCardNotification, setStolenCardNotification } from '../../store/uiSlice';
import { getCardImagePath } from '../../utils/assetPaths';

function isHandStuck(hand: Card[], role: string | null | undefined): boolean {
    if (hand.length === 0) return false;
    for (const card of hand) {
        if (canDiscardCard(card.id)) return false;

        // 逮捕の場合、Lなら使用可能なので詰みではない
        if (card.id === CardId.ARREST && role === 'L') {
            return false;
        }
        // それ以外（DEATH_NOTE等）はメインフェーズで使用不可
    }
    return true;
}

interface ActionPanelProps {
    phase: GamePhase | string;
    selectedCard: Card | null;
    selectedPlayer: string | null;
}

export default function ActionPanel({
    phase,
    selectedCard,
    selectedPlayer
}: ActionPanelProps) {
    const dispatch = useAppDispatch();
    const players = useAppSelector(selectGamePlayers);
    const myPlayerId = useAppSelector(selectMyPlayerId);
    const pendingExchange = useAppSelector(state => state.game.pendingExchange);
    const pendingAction = useAppSelector(state => state.game.pendingAction);
    const hasDrawnCard = useAppSelector(state => state.game.hasDrawnCard);
    const stolenCardNotification = useAppSelector(selectStolenCardNotification);
    const myHand = useAppSelector(state =>
        state.game.players.find(p => p.id === myPlayerId)?.hand || []
    );
    const currentPlayerId = useAppSelector(state => state.game.currentPlayerId);
    const isMyTurn = myPlayerId === currentPlayerId;
    const myRole = players.find(p => p.id === myPlayerId)?.role;

    const [showInterrogationModal, setShowInterrogationModal] = useState(false);

    // 自動ドロー処理
    useEffect(() => {
        if ((phase === 'CARD_DRAW' || phase === 'INVESTIGATION') && isMyTurn && !hasDrawnCard) {
            const timer = setTimeout(() => {
                socketClient.drawCard();
            }, 800); // UIの切り替わりから少し待って自動ドロー
            return () => clearTimeout(timer);
        }
    }, [phase, isMyTurn, hasDrawnCard]);

    // 取調カード: 番号変更能力がない場合、最小番号カードを自動送信
    const interrogationCanModify = clientCanModifyNumber(myRole, myHand);
    const interrogationHasSelected = myPlayerId ? pendingAction?.cardSelections?.[myPlayerId] : false;
    const interrogationMinCard = myHand.length > 0
        ? myHand.reduce((min, c) => c.id < min.id ? c : min, myHand[0])
        : null;

    useEffect(() => {
        if (pendingAction?.type === 'INTERROGATION' && !interrogationCanModify && !interrogationHasSelected && interrogationMinCard) {
            const timer = setTimeout(() => {
                socketClient.selectCard(interrogationMinCard.instanceId);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [pendingAction?.type, interrogationCanModify, interrogationHasSelected, interrogationMinCard]);

    // 手札から選ばれていたカードが消失した場合は選択を解除する
    useEffect(() => {
        if (selectedCard && myHand) {
            const stillInHand = myHand.some(c => c.instanceId === selectedCard.instanceId);
            if (!stillInHand) {
                dispatch(clearSelection());
            }
        }
    }, [selectedCard, myHand, dispatch]);



    const handleRedrawStuckHand = () => {
        if (!hasDrawnCard) return;
        socketClient.redrawStuckHand();
    };

    const handleUseCard = () => {
        if (!selectedCard) return;

        // 特殊カードの処理
        // Exchangeはターゲット選択が必要なのでここではモーダルを出さない
        // Phase 1: ターゲットを選択して使用

        if (selectedCard.id === CardId.INTERROGATION) {
            setShowInterrogationModal(true);
            return;
        }

        socketClient.useCard(selectedCard.instanceId, selectedPlayer || undefined);
        dispatch(clearSelection());
    };

    // Phase 2: ターゲットがカードを選択して渡す
    const handleTargetSelectCard = (cardInstanceId: string) => {
        socketClient.exchangeTargetSelect(cardInstanceId);
    };



    const handleInterrogation = (direction: 'LEFT' | 'RIGHT') => {
        if (!selectedCard) return;
        socketClient.useCard(selectedCard.instanceId, undefined, undefined, direction);
        setShowInterrogationModal(false);
        dispatch(clearSelection());
    };

    const handleSelectPendingCard = (cardInstanceId: string) => {
        socketClient.selectCard(cardInstanceId);
    };

    const handleDiscardCard = () => {
        if (!selectedCard) return;
        socketClient.discardCard(selectedCard.instanceId);
        dispatch(clearSelection());
    };



    // Exchange State for 2-step selection
    const [selectedExchangeCard, setSelectedExchangeCard] = useState<string | null>(null);

    // Pending Exchange Rendering
    if (pendingExchange) {
        // Common Card Selection UI
        const renderCardSelection = (title: string, description: string, onConfirm: (cardId: string) => void, cards: Card[], targetName: string) => {
            const selectedCard = cards.find(c => c.instanceId === selectedExchangeCard);

            return (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                    <div className="bg-dn-bg-card p-6 rounded-xl max-w-4xl w-full border border-dn-accent shadow-2xl flex flex-col gap-4">

                        {/* Header: Visual Exchange Direction */}
                        <div className="flex items-center justify-center gap-8 py-2 bg-black/20 rounded-lg border border-dn-border/20">
                            <div className="flex flex-col items-center">
                                <span className="text-3xl mb-1">👤</span>
                                <span className="font-bold text-dn-accent text-sm">あなた</span>
                            </div>
                            <div className="flex flex-col items-center px-4">
                                <span className="text-2xl text-dn-text-muted animate-pulse">➡</span>
                                <span className="text-xs text-dn-text-secondary">渡す</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-3xl mb-1">👤</span>
                                <span className="font-bold text-white text-sm">{targetName}</span>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6">

                            {/* 左側: カード一覧 */}
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-center mb-2 text-dn-accent">{title}</h3>
                                <p className="text-center text-sm mb-4 text-dn-text-secondary">{description}</p>

                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto p-2">
                                    {cards.map(card => (
                                        <button
                                            key={card.instanceId}
                                            onClick={() => setSelectedExchangeCard(card.instanceId)}
                                            className={`relative group transition-all duration-200 ${selectedExchangeCard === card.instanceId
                                                ? 'ring-2 ring-dn-accent scale-105 z-10'
                                                : 'hover:scale-105 hover:z-10'
                                                }`}
                                        >
                                            <div className="aspect-[2/3] bg-dn-bg-secondary rounded border border-dn-border overflow-hidden relative">
                                                <img
                                                    src={getCardImagePath(card.id)}
                                                    alt={card.name}
                                                    className="w-full h-full object-cover opacity-90"
                                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                                />
                                                {/* カードナンバー表示 */}
                                                <div className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-black/80 rounded-full border border-gray-400/50 shadow-sm z-30">
                                                    <span className="text-[10px] font-bold text-gray-200">{card.id}</span>
                                                </div>
                                                {/* Name Label */}
                                                <div className="absolute bottom-0 inset-x-0 bg-black/80 p-1 flex items-center justify-center gap-1">
                                                    <p className="text-[10px] text-center text-white truncate leading-none">{card.name}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 右側: 選択カード詳細 & 確定ボタン */}
                            <div className="w-full md:w-64 bg-black/20 rounded-lg p-4 flex flex-col border border-dn-border/30">
                                {selectedCard ? (
                                    <>
                                        <div className="text-center mb-4">
                                            <div className="text-4xl mb-2">{getCardIcon(selectedCard.id)}</div>
                                            <h4 className="text-lg font-bold text-dn-accent">{selectedCard.name}</h4>
                                            <div className="text-sm text-dn-text-muted mb-2">No. {selectedCard.id}</div>
                                            <p className="text-sm text-dn-text-secondary bg-black/30 p-2 rounded text-left">
                                                {getCardDescription(selectedCard.id)}
                                            </p>
                                        </div>
                                        <div className="mt-auto">
                                            <button
                                                onClick={() => onConfirm(selectedCard.instanceId)}
                                                className="btn-primary w-full py-3 font-bold shadow-lg shadow-dn-accent/20"
                                            >
                                                このカードを渡す
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-dn-text-muted text-sm text-center">
                                        左のリストから<br />カードを選択してください
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            );
        };

        // Phase 1: User Selecting
        if (pendingExchange.phase === 'USER_SELECTING' && pendingExchange.userId === myPlayerId) {
            const target = players.find(p => p.id === pendingExchange.targetId);
            return renderCardSelection(
                "交換: 渡すカードを選択",
                `${target?.name || '相手'}に渡すカードを選んでください。`,
                (cardId) => {
                    socketClient.exchangeUserSelect(cardId, target!.id, pendingExchange.cardInstanceId);
                },
                myHand.filter(c => c.instanceId !== pendingExchange.cardInstanceId), // 交換カード自体は渡せない
                target?.name || '相手'
            );
        }

        // Phase 2: Target Selecting
        if (pendingExchange.phase === 'TARGET_SELECTING' && pendingExchange.targetId === myPlayerId) {
            const initiator = players.find(p => p.id === pendingExchange.userId);
            return renderCardSelection(
                "交換: 渡すカードを選択",
                `あなたは${initiator?.name || '相手'}から交換を仕掛けられました。渡すカードを選んでください。`,
                (cardId) => handleTargetSelectCard(cardId),
                myHand,
                initiator?.name || '相手'
            );
        }

        // 他のプレイヤーへの待機表示
        if (pendingExchange.userId === myPlayerId && pendingExchange.phase === 'TARGET_SELECTING') {
            return (
                <div className="text-center p-4 border border-dn-accent/50 rounded-lg bg-black/40 animate-pulse">
                    <h4 className="text-dn-accent font-bold">交換待機中...</h4>
                    <p className="text-sm text-dn-text-secondary">ターゲットがカードを選択しています</p>
                </div>
            );
        }

        if (pendingExchange.targetId === myPlayerId && pendingExchange.phase === 'USER_SELECTING') {
            const initiator = players.find(p => p.id === pendingExchange.userId);
            return (
                <div className="text-center p-4 border border-dn-accent/50 rounded-lg bg-black/40 animate-pulse">
                    <h4 className="text-dn-accent font-bold">交換待機中...</h4>
                    <p className="text-sm text-dn-text-secondary">{initiator?.name || '相手'}が渡すカードを選択しています</p>
                </div>
            );
        }
    }

    // Pending Action Rendering
    if (pendingAction?.type === 'INTERROGATION') {
        const hasSelected = !!interrogationHasSelected;
        const canModify = interrogationCanModify;
        const minCard = interrogationMinCard;

        return (
            <div className="flex flex-col items-center gap-2">
                {hasSelected ? (
                    <div className="text-center">
                        <p className="text-dn-accent font-bold mb-1">選択完了</p>
                        <p className="text-dn-text-secondary text-sm animate-pulse">他のプレイヤーを待機中...</p>
                    </div>
                ) : !canModify ? (
                    <div className="text-center">
                        <p className="text-sm font-bold text-dn-accent mb-1">
                            {pendingAction.direction === 'LEFT' ? '← 左' : '右 →'} の人にカードを渡します
                        </p>
                        <p className="text-xs text-dn-text-muted mb-2">番号変更能力がないため、最小番号カードが自動で選ばれます</p>
                        {minCard && (
                            <div className="flex items-center justify-center gap-2 p-2 rounded bg-dn-accent/10 border border-dn-accent/30">
                                <div className="w-8 h-12 rounded overflow-hidden border border-dn-border/50">
                                    <img
                                        src={getCardImagePath(minCard.id)}
                                        alt={minCard.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-sm font-bold text-white">{minCard.name}</span>
                                <span className="text-xs text-dn-text-muted animate-pulse">自動送信中...</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-2">
                            <p className="text-sm font-bold text-dn-accent">
                                {pendingAction.direction === 'LEFT' ? '← 左' : '右 →'} の人に渡すカードを選択
                            </p>
                            <p className="text-xs text-dn-text-muted">番号変更能力を使って任意のカードを選べます</p>
                        </div>
                        <button
                            id="btn-use-card"
                            onClick={() => selectedCard && handleSelectPendingCard(selectedCard.instanceId)}
                            disabled={!selectedCard}
                            className={`btn-primary w-full py-3 text-sm shadow-lg ${!selectedCard ? 'opacity-50 cursor-not-allowed' : 'shadow-dn-accent/20'}`}
                        >
                            決定
                        </button>
                    </>
                )}
            </div>
        );
    }

    if (pendingAction?.type === 'VOTE') return null;

    // CARD_DRAW Phase - Only Draft button (Now automated, but keeping UI for feedback)
    if (phase === 'CARD_DRAW') {
        if (hasDrawnCard) return (
            <div className="text-dn-text-muted text-sm border border-dashed border-gray-600 rounded px-3 py-2">
                カード使用フェーズへ移行中
            </div>
        );

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full py-4 px-6 text-lg font-bold bg-dn-bg-secondary border border-dn-accent rounded-lg flex flex-col items-center justify-center gap-2"
            >
                <div className="flex items-center gap-2 text-dn-accent animate-pulse">
                    <span className="text-2xl">🎴</span>
                    <span>自動ドロー中...</span>
                </div>
            </motion.div>
        );
    }

    // INVESTIGATION / CARD_ACTION Phase
    if (phase === 'INVESTIGATION' || phase === 'CARD_ACTION') {
        const needsTarget = selectedCard && cardRequiresTarget(selectedCard.id);
        const handStuck = hasDrawnCard && isMyTurn && isHandStuck(myHand, myRole);

        return (
            <div className="flex flex-col gap-2 w-full">
                {selectedCard ? (
                    <>
                        {/* Target Selection - プレイマットをクリックで選択 */}
                        {needsTarget && !selectedPlayer && isMyTurn && (
                            <div className="text-center py-2 text-sm text-dn-accent animate-pulse font-bold">
                                ↑ 対象のプレイヤーをクリックしてください
                            </div>
                        )}

                        {/* Card Description */}
                        <div className="p-3 bg-dn-bg-secondary/50 rounded-lg border border-dn-border/30 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">{getCardIcon(selectedCard.id)}</span>
                                <span className="font-bold text-dn-accent">{selectedCard.name}</span>
                                <span className="text-xs text-dn-text-muted border border-dn-text-muted px-1 rounded">No.{selectedCard.id}</span>
                            </div>
                            <p className="text-xs text-dn-text-primary leading-relaxed">
                                {getCardDescription(selectedCard.id)}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 w-full">
                            {[CardId.DEATH_NOTE, CardId.FAKE_NAME, CardId.ALIBI, CardId.SHINIGAMI].includes(selectedCard.id) ? (
                                <div className="text-center text-xs text-dn-text-muted bg-black/30 p-3 rounded border border-dn-border/50">
                                    このカードはメインフェーズでは使用できません
                                </div>
                            ) : (
                                <button
                                    id="btn-use-card"
                                    onClick={handleUseCard}
                                    disabled={!isMyTurn || Boolean(needsTarget && !selectedPlayer)}
                                    className={`btn-primary w-full py-3 font-bold shadow-md ${!isMyTurn || (needsTarget && !selectedPlayer) ? 'opacity-50 cursor-not-allowed bg-slate-700' : 'shadow-dn-accent/20'}`}
                                >
                                    {needsTarget && !selectedPlayer ? '対象を選択' : '使用する'}
                                </button>
                            )}

                            {canDiscardCard(selectedCard.id) && (
                                <button
                                    onClick={handleDiscardCard}
                                    className="btn-secondary w-full py-2 text-sm"
                                >
                                    捨てる
                                </button>
                            )}

                            <button
                                onClick={() => dispatch(clearSelection())}
                                className="text-dn-text-muted text-xs hover:text-white underline mt-1"
                            >
                                選択解除
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center p-2 border border-dashed border-dn-border/40 rounded-lg bg-black/20">
                        <p className="text-xs text-dn-text-secondary leading-relaxed animate-pulse">
                            {!hasDrawnCard ? 'カードを自動で引いています...' : '手札のカードを選んでください'}
                        </p>
                        {handStuck && (
                            <div className="mt-4 border-t border-red-500/30 pt-4">
                                <p className="text-xs text-red-400 mb-2 font-bold animate-pulse">
                                    手札が使用も捨札もできません！
                                </p>
                                <button
                                    onClick={handleRedrawStuckHand}
                                    className="btn-primary w-full py-2 text-sm bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20"
                                >
                                    引き直す（最初のカードを山札に戻す）
                                </button>
                            </div>
                        )}
                    </div>
                )}



                {/* Interrogation Modal */}
                {showInterrogationModal && (
                    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                        <div className="bg-dn-bg-card p-6 rounded-xl max-w-sm w-full border border-dn-accent shadow-2xl">
                            <h3 className="text-xl font-bold text-center mb-6">回す方向を選択</h3>
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => handleInterrogation('LEFT')}
                                    className="bg-dn-bg-secondary hover:bg-dn-accent hover:text-dn-bg-main border border-dn-accent text-dn-accent p-6 rounded-lg text-xl font-bold flex-1 transition-all"
                                >
                                    ← 左
                                </button>
                                <button
                                    onClick={() => handleInterrogation('RIGHT')}
                                    className="bg-dn-bg-secondary hover:bg-dn-accent hover:text-dn-bg-main border border-dn-accent text-dn-accent p-6 rounded-lg text-xl font-bold flex-1 transition-all"
                                >
                                    右 →
                                </button>
                            </div>
                            <button onClick={() => setShowInterrogationModal(false)} className="btn-secondary w-full mt-6">キャンセル</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Stolen Card Notification Overlay
    if (stolenCardNotification) {
        const stolenCardId = getCardIdByName(stolenCardNotification.cardName);
        return (
            <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                <div className="bg-dn-bg-card p-8 rounded-xl max-w-md w-full border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)] flex flex-col items-center gap-6 relative overflow-hidden">

                    {/* Background Effect */}
                    <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-10 pointer-events-none"></div>
                    <div className="absolute -inset-10 bg-gradient-to-r from-transparent via-red-500/10 to-transparent rotate-45 animate-pulse pointer-events-none"></div>

                    <div className="text-center relative z-10">
                        <div className="text-5xl mb-2 animate-bounce">⚠️</div>
                        <h2 className="text-2xl font-bold text-red-500 mb-1">WARNING</h2>
                        <p className="text-white text-lg">あなたのカードが奪われました！</p>
                    </div>

                    <div className="relative w-48 aspect-[2/3] transform rotate-3 hover:rotate-0 transition-transform duration-300 shadow-2xl z-10">
                        <img
                            src={getCardImagePath(stolenCardId)}
                            alt={stolenCardNotification.cardName}
                            className="w-full h-full object-cover rounded-lg border-2 border-red-500/50"
                            onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-lg"></div>
                        <div className="absolute bottom-2 left-0 right-0 text-center">
                            <span className="text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                                {stolenCardNotification.cardName}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => dispatch(setStolenCardNotification(null))}
                        className="btn-primary w-full py-4 text-xl font-bold shadow-lg shadow-red-500/30 z-10 animate-pulse hover:animate-none"
                    >
                        確認
                    </button>
                </div>
            </div>
        );
    }

    // JUDGMENT Phase (Voting)
    return null;
}


function cardRequiresTarget(cardId: CardId): boolean {
    return [CardId.ARREST, CardId.GUN, CardId.WITNESS, CardId.SURVEILLANCE, CardId.EXCHANGE].includes(cardId);
}

function canDiscardCard(cardId: CardId): boolean {
    return cardId !== CardId.DEATH_NOTE && cardId !== CardId.ARREST;
}

/**
 * クライアント側の番号変更能力チェック
 * 特定の役職が特定のカードを手札に持っている場合に true を返す
 * 仕様書 3.4 準拠
 */
function clientCanModifyNumber(role: string | null | undefined, hand: Card[]): boolean {
    if (!role) return false;

    // キラがデスノートを所持している場合、任意のカードで番号読み替え可能
    if (role === 'KIRA' && hand.some(c => c.id === 0)) {
        return true;
    }

    const modifyRules: Record<string, number[]> = {
        KIRA: [0],      // デスノートのみ
        L: [1],         // 逮捕のみ
        POLICE: [2],    // 拳銃のみ
        WATARI: [1],    // 逮捕のみ
        MISA: [],
        MELLO: [],
    };
    const modifiableCardIds = modifyRules[role] || [];
    return hand.some(c => modifiableCardIds.includes(c.id));
}

function getCardIcon(cardId: number): string {
    const icons: Record<number, string> = {
        0: '📓', 1: '🚔', 2: '🔫', 3: '👤', 4: '🛡️',
        5: '👁️', 6: '📹', 7: '🗳️', 8: '🔄', 9: '👮', 13: '💀',
    };
    return icons[cardId] || '🃏';
}

function getCardDescription(cardId: number): string {
    const descriptions: Record<number, string> = {
        0: '【デスノート】夜に誰か1人を指名して排除できる。最後まで持っているとキラの勝利。',
        1: '【逮捕】キラを逮捕して勝利する。',
        2: '【拳銃】警察:対象の最小番号カードを公開。メロ:対象を殺害し正体を公開。',
        3: '【偽名】裁きの時間に名前を書かれても1回無効化できる。',
        4: '【アリバイ】逮捕された時に無実を証明できる（1回のみ）。',
        5: '【目撃】誰か1人の役職を確認できる。',
        6: '【監視】誰か1人の手札を確認できる。',
        7: '【投票】全員でキラだと思う人に投票する。',
        8: '【交換】手札を他のプレイヤーと交換する。',
        9: '【取調】全員でカードを1枚ずつ隣に回す。',
        13: '【死神】手札にあると強制発動。キラとミサはお互いを認識できる。'
    };
    return descriptions[cardId] || '効果なし';
}

function getCardIdByName(name: string): number {
    const cardMap: Record<string, number> = {
        'デスノート': 0, '逮捕': 1, '拳銃': 2, '偽名': 3, 'アリバイ': 4,
        '目撃': 5, '監視': 6, '投票': 7, '交換': 8, '取調': 9, '死神': 13
    };
    return cardMap[name] ?? 99;
}
