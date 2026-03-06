import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player, Card, TransferInfo } from 'shared/types';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { setSelectedCard, selectDraftKiraMisaMessage, setDraftKiraMisaMessage } from '../../store/uiSlice';
import { selectMyPlayerId } from '../../store/roomSlice';
import { getCardImagePath, getRoleImagePath } from '../../utils/assetPaths';
import CardDetailModal from './CardDetailModal';
import RoleDetailModal from './RoleDetailModal';

interface MyAreaProps {
    player: Player;
    isMyTurn: boolean;
    selectedCard: Card | null;
    transferHistory?: TransferInfo[];
    players?: Player[];
    isStartPlayer?: boolean;
    children?: React.ReactNode;
}

export default function MyArea({ player, isMyTurn, selectedCard, transferHistory, players, isStartPlayer, children }: MyAreaProps) {
    const dispatch = useAppDispatch();
    const myPlayerId = useAppSelector(selectMyPlayerId);

    const draftKiraMisaMessage = useAppSelector(selectDraftKiraMisaMessage);
    const isKiraOrMisa = player.role === 'KIRA' || player.role === 'MISA';

    const [detailCard, setDetailCard] = useState<{ card: Card; isPlayable: boolean } | null>(null);
    const [showRoleDetail, setShowRoleDetail] = useState(false);

    // IN/OUT 履歴
    const myTransferOut = transferHistory?.filter(t => t.fromPlayerId === myPlayerId).slice(-1)[0] || null;
    const myTransferIn = transferHistory?.filter(t => t.toPlayerId === myPlayerId).slice(-1)[0] || null;

    // 取調選択用のロジック
    const pendingAction = useAppSelector(state => state.game.pendingAction);
    const isInterrogationSelecting = Boolean(pendingAction?.type === 'INTERROGATION' && myPlayerId && !pendingAction.cardSelections?.[myPlayerId]);

    const modifyRules: Record<string, number[]> = {
        KIRA: [0],
        L: [1],
        POLICE: [2],
        WATARI: [1],
        MISA: [],
        MELLO: [],
    };
    const modifiableCardIds = player.role ? modifyRules[player.role] || [] : [];
    const hasModifyAbility = player.role === 'KIRA' && player.hand.some(c => c.id === 0)
        ? true
        : player.hand.some(c => modifiableCardIds.includes(c.id));
    const minCardId = player.hand.length > 0 ? player.hand.reduce((min, c) => c.id < min.id ? c : min, player.hand[0]).id : -1;

    const getPlayerColor = (playerId: string) => {
        return players?.find(p => p.id === playerId)?.color || '#374151';
    };

    const handleCardClick = useCallback((card: Card) => {
        if (selectedCard?.instanceId === card.instanceId) {
            // すでにアクティブなら使用/決定を発動
            const btn = document.getElementById('btn-use-card') as HTMLButtonElement | null;
            if (btn && !btn.disabled) {
                btn.click();
            }
        } else {
            // アクティブにする
            dispatch(setSelectedCard(card));
        }
    }, [selectedCard, dispatch]);

    const handleNameClick = useCallback((e: React.MouseEvent, card: Card) => {
        e.stopPropagation();
        setDetailCard({ card, isPlayable: isMyTurn && !card.isUsed });
    }, [isMyTurn]);

    const handleCardUse = useCallback(() => {
        if (!detailCard) return;
        dispatch(setSelectedCard(detailCard.card));
        setDetailCard(null);
    }, [detailCard, dispatch]);

    const playerColor = player.color || '#dc2626';

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-xl overflow-visible shadow-2xl border-4 transition-all w-full max-w-2xl mx-auto"
                style={{
                    backgroundColor: `${playerColor}15`,
                    borderColor: isMyTurn ? playerColor : `${playerColor}60`,
                    boxShadow: isMyTurn ? `0 0 20px ${playerColor}40` : 'none',
                }}
            >
                {/* あなたの番です！ 吹き出し */}
                <AnimatePresence>
                    {isMyTurn && (
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-max z-50">
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                className="px-6 py-2 rounded-full font-black text-lg text-white shadow-lg animate-bounce border-2 border-white/30 pointer-events-none"
                                style={{
                                    backgroundColor: playerColor,
                                    boxShadow: `0 0 20px ${playerColor}60`,
                                }}
                            >
                                あなたの番です！
                                <div
                                    className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px]"
                                    style={{ borderTopColor: playerColor }}
                                />
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ヘッダー */}
                <div className="px-4 py-2 flex items-center justify-between text-white shadow-sm border-b border-white/20"
                    style={{ background: `linear-gradient(135deg, ${playerColor}30, ${playerColor}15)`, backgroundColor: '#1a1a2e' }}
                >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {/* 役職 (クリック可能) */}
                        <div
                            className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-dn-bg-secondary border border-white/20 overflow-hidden cursor-pointer shrink-0 hover:ring-1 hover:ring-dn-accent transition-all shadow-md"
                            onClick={() => player.role && setShowRoleDetail(true)}
                        >
                            {player.role ? (
                                <img src={getRoleImagePath(player.role)} alt={player.role} className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-dn-text-muted text-xs">?</div>
                            )}
                        </div>
                        <div className="flex items-center rounded overflow-hidden" style={{ backgroundColor: `${playerColor}25` }}>
                            <span
                                className="px-2 py-0.5 text-xs font-bold cursor-pointer hover:underline"
                                style={{ color: playerColor }}
                                onClick={() => player.role && setShowRoleDetail(true)}
                            >
                                {player.role ? getRoleName(player.role) : '???'}
                            </span>
                            <span className="px-2 py-0.5 truncate text-sm font-bold border-l border-white/20">
                                {player.name}
                            </span>
                        </div>
                        {isStartPlayer && (
                            <span className="text-[10px] bg-red-600 font-bold px-1.5 py-0.5 rounded shadow border border-red-400 text-white ml-2 shrink-0">
                                START
                            </span>
                        )}

                        {/* 密談チャット事前入力（非送信） */}
                        {isKiraOrMisa && (
                            <div className="ml-auto flex-1 max-w-[200px] sm:max-w-xs pl-2">
                                <input
                                    type="text"
                                    value={draftKiraMisaMessage}
                                    onChange={(e) => dispatch(setDraftKiraMisaMessage(e.target.value))}
                                    placeholder="密談の事前入力..."
                                    className="w-full bg-black/60 border border-red-900/50 rounded pl-2 pr-2 py-1 text-xs text-red-200 placeholder-red-900/50 focus:outline-none focus:border-red-500 transition-colors"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ボディエリア: 変態は踊ると同様の横レイアウト */}
                <div className="p-3 flex gap-3 relative bg-black/10 items-stretch">

                    {/* [左カラム] 履歴エリア (OUT/IN) */}
                    <div className="flex-shrink-0 bg-black/40 p-3 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-1.5">
                        <div className="flex gap-3">
                            {/* OUT */}
                            <div className="flex flex-col items-center gap-1">
                                <div
                                    className="w-8 h-8 flex items-center justify-center rounded-full shadow-md border border-white/10 transition-colors text-xs font-bold text-white"
                                    style={{ backgroundColor: myTransferOut ? getPlayerColor(myTransferOut.toPlayerId) : '#1f2937' }}
                                >
                                    {myTransferOut ? '↑' : ''}
                                </div>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">OUT</span>
                                {myTransferOut ? (
                                    <div className="w-10 h-14 rounded bg-dn-bg-secondary border border-dn-border/30 overflow-hidden">
                                        <img src={getCardImagePath(myTransferOut.card.id)} alt={myTransferOut.card.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    </div>
                                ) : (
                                    <div className="w-10 h-14 bg-white/5 rounded-lg border border-white/5 flex items-center justify-center">
                                        <span className="text-lg opacity-10">?</span>
                                    </div>
                                )}
                            </div>

                            <div className="w-[1px] bg-white/10 self-stretch" />

                            {/* IN */}
                            <div className="flex flex-col items-center gap-1">
                                <div
                                    className="w-8 h-8 flex items-center justify-center rounded-full shadow-md border border-white/10 transition-colors text-xs font-bold text-white"
                                    style={{ backgroundColor: myTransferIn ? getPlayerColor(myTransferIn.fromPlayerId) : '#1f2937' }}
                                >
                                    {myTransferIn ? '↓' : ''}
                                </div>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">IN</span>
                                {myTransferIn ? (
                                    <div className="w-10 h-14 rounded bg-dn-bg-secondary border border-dn-border/30 overflow-hidden">
                                        <img src={getCardImagePath(myTransferIn.card.id)} alt={myTransferIn.card.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    </div>
                                ) : (
                                    <div className="w-10 h-14 bg-white/5 rounded-lg border border-white/5 flex items-center justify-center">
                                        <span className="text-lg opacity-10">?</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* [右カラム] 手札エリア + アクション */}
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                        {/* 手札 */}
                        <div className="flex-1 bg-black/20 rounded-lg border border-white/5 relative p-2 flex flex-col justify-center items-center min-h-[120px]">
                            <div className="flex justify-center gap-2 overflow-visible px-2 w-full flex-wrap">
                                <AnimatePresence>
                                    {player.hand.length === 0 ? (
                                        <div className="text-dn-text-muted text-center py-6 w-full">
                                            <span className="text-xs">手札がありません</span>
                                        </div>
                                    ) : (
                                        player.hand.map((card, index) => {
                                            const isSelectableForInterrogation = isInterrogationSelecting
                                                ? (hasModifyAbility || card.id === minCardId)
                                                : true;
                                            const isDisabled = card.isUsed || (isInterrogationSelecting && !isSelectableForInterrogation);

                                            return (
                                                <motion.div
                                                    key={card.instanceId}
                                                    initial={{ y: 30, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    style={{ zIndex: index }}
                                                >
                                                    <motion.button
                                                        onClick={() => {
                                                            if (!isDisabled) handleCardClick(card);
                                                        }}
                                                        whileHover={isDisabled ? {} : { scale: 1.10, y: -16, zIndex: 50 }}
                                                        whileTap={isDisabled ? {} : { scale: 0.95 }}
                                                        disabled={isDisabled}
                                                        className={`
                                                        relative w-20 h-32 md:w-24 md:h-36 rounded-lg
                                                        transition-all duration-200 shadow-md
                                                        ${selectedCard?.instanceId === card.instanceId
                                                                ? 'ring-2 ring-dn-accent shadow-[0_0_15px_rgba(255,0,0,0.4)] -translate-y-4 z-30'
                                                                : (isDisabled ? '' : 'hover:shadow-lg hover:shadow-dn-accent/20')
                                                            }
                                                        ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                                                        ${isInterrogationSelecting && isSelectableForInterrogation && selectedCard?.instanceId !== card.instanceId ? 'ring-2 ring-green-400/80 shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-pulse' : ''}
                                                        bg-dn-bg-secondary border border-dn-border overflow-hidden
                                                    `}
                                                    >
                                                        <img
                                                            src={getCardImagePath(card.id)}
                                                            alt={card.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />

                                                        {/* カードナンバー表示 */}
                                                        <div className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-black/80 rounded-full border border-gray-400/50 shadow-sm z-30">
                                                            <span className="text-[10px] font-bold text-gray-200">{card.id}</span>
                                                        </div>

                                                        {card.isUsed && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                                                                <span className="text-red-500 font-bold border border-red-500 px-1 py-0.5 text-[7px] -rotate-12 bg-black/80">USED</span>
                                                            </div>
                                                        )}
                                                        {/* カード名ラベル */}
                                                        <div
                                                            className="absolute bottom-0 left-0 right-0 bg-black/80 py-0.5 text-center z-40 flex items-center justify-center cursor-pointer hover:bg-dn-accent hover:text-black transition-colors"
                                                            onClick={(e) => handleNameClick(e, card)}
                                                        >
                                                            <span className="text-[10px] text-white font-bold leading-none hover:text-inherit">{card.name}</span>
                                                        </div>
                                                    </motion.button>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* アクションボタン */}
                            <div className="mt-2 flex justify-center w-full">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Card Detail Modal */}
            <AnimatePresence>
                {detailCard && (
                    <CardDetailModal
                        card={detailCard.card}
                        isPlayable={detailCard.isPlayable}
                        onUse={handleCardUse}
                        onClose={() => setDetailCard(null)}
                    />
                )}
            </AnimatePresence>

            {/* Role Detail Modal */}
            <AnimatePresence>
                {showRoleDetail && player.role && (
                    <RoleDetailModal
                        role={player.role}
                        onClose={() => setShowRoleDetail(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

function getRoleName(role: string): string {
    const names: Record<string, string> = {
        KIRA: 'キラ',
        MISA: 'ミサ',
        L: 'L',
        POLICE: '警察',
        WATARI: 'ワタリ',
        MELLO: 'メロ',
    };
    return names[role] || role;
}
