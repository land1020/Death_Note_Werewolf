import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, CardId, TransferInfo } from 'shared/types';
import { getCardImagePath } from '../../utils/assetPaths';
import { useAppSelector } from '../../hooks';
import { selectRoundDiscardPile, selectRemovedCards } from '../../store/gameSlice';

interface PlayedCardInfo {
    cardId: CardId;
    cardName: string;
    playerName: string;
    playerColor?: string;
    timestamp: number;
}

interface CenterAreaProps {
    deckCount: number;
    lastDiscard: Card | null;
    transferHistory: TransferInfo[];
    currentPlayerName?: string;
    isMyTurn?: boolean;
    message?: string;
    lastPlayedCard?: PlayedCardInfo | null;
}

export default function CenterArea({
    deckCount,
    lastDiscard,
    transferHistory,
    currentPlayerName,
    isMyTurn,
    message,
    lastPlayedCard,
}: CenterAreaProps) {
    const lastTransfer = transferHistory[transferHistory.length - 1];
    const turnText = isMyTurn ? 'あなたの番です' : (currentPlayerName ? `${currentPlayerName}の番です` : '処理中...');
    const roundDiscardPile = useAppSelector(selectRoundDiscardPile);
    const removedCards = useAppSelector(selectRemovedCards) || [];
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [showRemovedModal, setShowRemovedModal] = useState(false);
    const [selectedDiscardCard, setSelectedDiscardCard] = useState<Card | null>(null);
    const lastRemoved = removedCards.length > 0 ? removedCards[removedCards.length - 1] : null;

    return (
        <div className="flex flex-col items-center gap-2 w-full relative">
            {/* メインパネル（変態は踊るの中央パネル準拠） */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-dn-bg-card/90 backdrop-blur-md rounded-2xl border border-dn-accent/30 shadow-lg shadow-dn-accent/10 overflow-hidden"
            >
                <div className="px-4 py-3 text-center">
                    <div className="inline-block bg-dn-bg-secondary/60 px-2 py-0.5 rounded-full text-dn-text-muted font-bold text-[9px] tracking-wider mb-1">
                        メイン画面
                    </div>
                    <div className={`text-lg md:text-2xl font-black tracking-wider ${isMyTurn ? 'text-dn-accent' : 'text-white'}`}>
                        {turnText}
                    </div>
                    <AnimatePresence mode="wait">
                        {message && (
                            <motion.div
                                key={message}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="mt-1.5 inline-flex items-center gap-1.5 bg-dn-bg-secondary/80 border border-dn-accent/20 rounded-full px-3 py-1"
                            >
                                <span className="text-dn-accent text-[10px]">📋</span>
                                <span className="text-xs text-dn-text-secondary font-medium">
                                    {message}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* 山札・プレイエリア・捨て札・除外 */}
            <div className="flex items-end gap-3 md:gap-4">
                {/* 山札 (Deck) */}
                <div className="flex flex-col items-center">
                    <div className="w-20 h-28 md:w-24 md:h-32 bg-dn-bg-secondary rounded-lg border border-dn-accent/50 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute -bottom-0.5 -right-0.5 w-full h-full bg-dn-bg-card rounded-lg border border-dn-text-muted/30 -z-10" />
                        <span className="text-lg md:text-xl font-bold text-dn-accent z-10">{deckCount}</span>
                    </div>
                    <span className="mt-1 text-[10px] text-dn-text-muted font-medium">山札</span>
                </div>

                {/* プレイエリア (Play Area) - NEW */}
                <div className="flex flex-col items-center">
                    <div className={`
                        w-20 h-28 md:w-24 md:h-32 rounded-lg border-2
                        flex items-center justify-center relative overflow-hidden
                        ${lastPlayedCard ? 'border-yellow-400/70 bg-dn-bg-card shadow-[0_0_15px_rgba(250,204,21,0.25)]' : 'border-dashed border-yellow-500/30 bg-dn-bg-primary/40'}
                    `}>
                        <AnimatePresence mode="wait">
                            {lastPlayedCard ? (
                                <motion.div
                                    key={`played-${lastPlayedCard.timestamp}`}
                                    initial={{ scale: 0.3, opacity: 0, y: 30 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.8, opacity: 0, y: -10 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center"
                                >
                                    <img
                                        src={getCardImagePath(lastPlayedCard.cardId)}
                                        alt={lastPlayedCard.cardName}
                                        className="w-full h-full object-cover absolute inset-0"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    {/* カードナンバー表示 */}
                                    <div className="absolute top-0.5 right-0.5 flex items-center justify-center w-6 h-6 bg-black/80 rounded-full border border-yellow-400/50 shadow-sm z-10">
                                        <span className="text-[10px] font-bold text-yellow-300">{lastPlayedCard.cardId}</span>
                                    </div>
                                    {/* カード名 + 使用プレイヤー名 */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-1 text-center z-10">
                                        <span className="text-xs font-bold text-yellow-300 leading-none block">{lastPlayedCard.cardName}</span>
                                        <span
                                            className="text-[10px] leading-none block mt-0.5"
                                            style={{ color: lastPlayedCard.playerColor || '#aaa' }}
                                        >
                                            {lastPlayedCard.playerName}
                                        </span>
                                    </div>
                                    {/* グロウアニメーション */}
                                    <motion.div
                                        className="absolute inset-0 rounded-lg border-2 border-yellow-400/50 pointer-events-none"
                                        initial={{ opacity: 0.8 }}
                                        animate={{ opacity: [0.8, 0, 0] }}
                                        transition={{ duration: 1.5, ease: 'easeOut' }}
                                    />
                                </motion.div>
                            ) : (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-yellow-500/40 text-[10px] font-medium"
                                >
                                    PLAY
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                    <span className="mt-1 text-[10px] text-yellow-400/80 font-bold">プレイエリア</span>
                </div>

                {/* 捨て札プール (Discard Pile) */}
                <div
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => setShowDiscardModal(true)}
                >
                    <div className={`
                        w-20 h-28 md:w-24 md:h-32 rounded-lg border border-dashed
                        flex items-center justify-center relative overflow-hidden transition-transform hover:scale-105
                        ${lastDiscard ? 'border-dn-accent bg-dn-bg-card shadow-[0_0_10px_rgba(255,0,0,0.3)]' : 'border-dn-text-muted/30 bg-dn-bg-primary/50'}
                    `}>
                        {lastDiscard ? (
                            <>
                                <img
                                    src={getCardImagePath(lastDiscard.id)}
                                    alt={lastDiscard.name}
                                    className="w-full h-full object-cover absolute inset-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                {/* カードナンバー表示 */}
                                <div className="absolute top-0.5 right-0.5 flex items-center justify-center w-6 h-6 bg-black/80 rounded-full border border-gray-400/50 shadow-sm z-10">
                                    <span className="text-[10px] font-bold text-gray-200">{lastDiscard.id}</span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 text-center z-10">
                                    <span className="text-xs font-bold text-white leading-none block">{lastDiscard.name}</span>
                                </div>
                            </>
                        ) : (
                            <span className="text-dn-text-muted text-[10px]">空</span>
                        )}
                    </div>
                    <span className="mt-1 text-[10px] text-dn-text-muted font-medium">捨て札プール</span>
                </div>

                {/* 除外 (Removed/Banished Pile) */}
                <div
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => setShowRemovedModal(true)}
                >
                    <div className={`
                        w-20 h-28 md:w-24 md:h-32 rounded-lg border border-dashed
                        flex items-center justify-center relative overflow-hidden transition-transform hover:scale-105
                        ${lastRemoved ? 'border-red-500 bg-red-900/40 shadow-[0_0_10px_rgba(255,0,0,0.5)]' : 'border-dn-text-muted/30 bg-dn-bg-primary/50'}
                    `}>
                        {lastRemoved ? (
                            <>
                                <img
                                    src={getCardImagePath(lastRemoved.id)}
                                    alt={lastRemoved.name}
                                    className="w-full h-full object-cover absolute inset-0 opacity-80"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-red-900/30 mix-blend-multiply" />
                                {/* カードナンバー表示 */}
                                <div className="absolute top-0.5 right-0.5 flex items-center justify-center w-6 h-6 bg-black/80 rounded-full border border-gray-400/50 shadow-sm z-10">
                                    <span className="text-[10px] font-bold text-gray-200">{lastRemoved.id}</span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/90 py-1 text-center z-10">
                                    <span className="text-xs font-bold text-red-400 leading-none block line-through">{lastRemoved.name}</span>
                                </div>
                            </>
                        ) : (
                            <span className="text-dn-text-muted text-[10px]">空</span>
                        )}
                    </div>
                    <span className="mt-1 text-[10px] text-red-400 font-bold">除外</span>
                </div>
            </div>

            {/* Discard Pile Modal via Portal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showDiscardModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowDiscardModal(false)}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-dn-bg-card border border-dn-accent shadow-[0_0_20px_rgba(255,0,0,0.2)] rounded-xl p-4 w-full max-w-sm max-h-[80vh] flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-4 border-b border-dn-border pb-2">
                                    <h3 className="font-bold text-lg text-dn-accent">
                                        {selectedDiscardCard ? 'カード詳細' : '捨て札プール'}
                                    </h3>
                                    <button
                                        onClick={() => {
                                            if (selectedDiscardCard) {
                                                setSelectedDiscardCard(null);
                                            } else {
                                                setShowDiscardModal(false);
                                            }
                                        }}
                                        className="text-dn-text-muted hover:text-white"
                                    >
                                        {selectedDiscardCard ? '戻る' : '✕'}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-dn-accent/50">
                                    {selectedDiscardCard ? (
                                        // 選択中のカード詳細
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-32 h-48 relative rounded-lg overflow-hidden border border-dn-border/50 shadow-lg shadow-black/50">
                                                <img
                                                    src={getCardImagePath(selectedDiscardCard.id)}
                                                    alt={selectedDiscardCard.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                {/* カードナンバー表示 */}
                                                <div className="absolute top-1.5 right-1.5 flex items-center justify-center w-6 h-6 bg-black/80 rounded-full border border-gray-400/50 shadow-sm z-10">
                                                    <span className="text-[10px] font-bold text-gray-200">{selectedDiscardCard.id}</span>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-xl text-white">{selectedDiscardCard.name}</h4>

                                            <div className="w-full bg-black/40 rounded p-3 border border-dn-border/30">
                                                <div className="text-dn-accent font-bold text-sm border-b border-dn-border/50 pb-1 mb-2">使用履歴</div>
                                                {selectedDiscardCard.history && selectedDiscardCard.history.length > 0 ? (
                                                    selectedDiscardCard.history.map((h, i) => (
                                                        <div key={i} className="text-sm text-dn-text-secondary border-l-2 border-dn-accent pl-2 mb-1">
                                                            {h}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-sm text-dn-text-muted italic text-center py-2">履歴情報はありません</div>
                                                )}
                                            </div>
                                            <button
                                                className="mt-4 px-4 py-2 bg-dn-bg-secondary hover:bg-dn-bg-primary text-white text-sm rounded transition-colors w-full border border-dn-border"
                                                onClick={() => setSelectedDiscardCard(null)}
                                            >
                                                リストに戻る
                                            </button>
                                        </div>
                                    ) : (
                                        // リスト一覧
                                        roundDiscardPile.length > 0 ? (
                                            <div className="flex flex-col gap-3 relative">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-dn-accent px-2 py-0.5 rounded-full border border-dn-accent/50 bg-dn-accent/10 shadow-sm">✨ 新しい履歴</span>
                                                    <div className="h-px bg-dn-accent/30 flex-1"></div>
                                                </div>

                                                {[...roundDiscardPile].reverse().map((card, index) => (
                                                    <div
                                                        key={card.instanceId}
                                                        className={`flex gap-3 p-2 rounded bg-black/40 border cursor-pointer hover:border-dn-accent transition-colors group relative ${index === 0 ? 'border-dn-accent shadow-[0_0_10px_rgba(255,0,0,0.2)]' : 'border-dn-border/50'}`}
                                                        onClick={() => setSelectedDiscardCard(card)}
                                                    >
                                                        {index === 0 && (
                                                            <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-dn-accent rounded-full animate-ping opacity-75"></div>
                                                        )}
                                                        <div className="w-12 h-16 shrink-0 relative rounded overflow-hidden shadow border border-dn-border/50">
                                                            <img
                                                                src={getCardImagePath(card.id)}
                                                                alt={card.name}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                            />
                                                            {/* カードナンバー表示 */}
                                                            <div className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 bg-black/80 rounded-full border border-gray-400/50 shadow-sm z-10">
                                                                <span className="text-[7px] font-bold text-gray-200">{card.id}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col justify-center flex-1 min-w-0">
                                                            <div
                                                                className="font-bold text-xs md:text-sm text-white mb-1 px-2 py-0.5 rounded w-fit max-w-full flex items-center gap-1.5"
                                                                style={{
                                                                    backgroundColor: card.usedByColor ? `${card.usedByColor}40` : 'rgba(255,255,255,0.1)',
                                                                    borderLeft: card.usedByColor ? `3px solid ${card.usedByColor}` : '3px solid transparent'
                                                                }}
                                                            >
                                                                <span className="shrink-0">{card.name}</span>
                                                                {card.usedByName && (
                                                                    <span
                                                                        className="text-[10px] md:text-xs font-normal opacity-80 truncate"
                                                                        style={{ color: card.usedByColor || '#ccc' }}
                                                                    >
                                                                        {card.usedByName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {card.history && card.history.map((h, i) => (
                                                                <div key={i} className="text-xs text-dn-text-secondary truncate pr-2">{h}</div>
                                                            ))}
                                                            {(!card.history || card.history.length === 0) && (
                                                                <div className="text-xs text-dn-text-muted italic">履歴なし</div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center text-dn-text-muted group-hover:text-dn-accent transition-colors pr-2">
                                                            <span className="text-xs">詳細 ▶</span>
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="flex items-center gap-2 mt-1 mb-2">
                                                    <div className="h-px bg-dn-text-muted/30 flex-1"></div>
                                                    <span className="text-[10px] text-dn-text-muted">古い履歴</span>
                                                    <div className="h-px bg-dn-text-muted/30 flex-1"></div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-40 text-dn-text-muted gap-2">
                                                <div className="text-4xl opacity-50">📭</div>
                                                <div>現在、カードの使用履歴はありません</div>
                                            </div>
                                        )
                                    )}
                                </div>
                                {!selectedDiscardCard && (
                                    <button
                                        onClick={() => setShowDiscardModal(false)}
                                        className="mt-4 w-full btn-secondary py-2"
                                    >
                                        閉じる
                                    </button>
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Removed Pile Modal via Portal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showRemovedModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowRemovedModal(false)}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-dn-bg-card border border-red-600 shadow-[0_0_20px_rgba(255,0,0,0.3)] rounded-xl p-4 w-full max-w-sm max-h-[80vh] flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-4 border-b border-red-600/50 pb-2">
                                    <h3 className="font-bold text-lg text-red-500">
                                        除外カード一覧
                                    </h3>
                                    <button
                                        onClick={() => setShowRemovedModal(false)}
                                        className="text-dn-text-muted hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-red-500/50">
                                    {removedCards.length > 0 ? (
                                        removedCards.map((card, index) => (
                                            <div
                                                key={`${card.instanceId}-${index}`}
                                                className="flex gap-3 p-2 rounded bg-black/40 border border-red-900/50"
                                            >
                                                <div className="w-12 h-16 shrink-0 relative rounded overflow-hidden shadow border border-red-900/50">
                                                    <img
                                                        src={getCardImagePath(card.id)}
                                                        alt={card.name}
                                                        className="w-full h-full object-cover grayscale opacity-80"
                                                    />
                                                    <div className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 bg-black/80 rounded-full border border-gray-400/50 shadow-sm z-10">
                                                        <span className="text-[7px] font-bold text-gray-200">{card.id}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col justify-center flex-1 min-w-0 pb-1">
                                                    <div className="font-bold text-xs md:text-sm text-red-400 mb-1 line-through">
                                                        {card.name}
                                                    </div>
                                                    {card.history && card.history.map((h, i) => (
                                                        <div key={i} className="text-xs text-dn-text-secondary truncate pr-2">{h}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-40 text-dn-text-muted gap-2">
                                            <div className="text-4xl opacity-50">🗑️</div>
                                            <div>現在、除外されたカードはありません</div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowRemovedModal(false)}
                                    className="mt-4 w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-white rounded transition-colors border border-red-700/50"
                                >
                                    閉じる
                                </button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Last Transfer Info */}
            {lastTransfer && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 bg-dn-bg-secondary/80 border border-dn-border/50 px-3 py-1 rounded-full text-[10px] text-dn-text-secondary backdrop-blur-sm flex items-center gap-2"
                >
                    <span className="text-dn-text-muted">🔄 直近のカード移動:</span>
                    <span className="font-bold text-white/90">{lastTransfer.fromPlayerName}</span>
                    <span className="text-dn-accent">→</span>
                    <span className="font-bold text-white/90">{lastTransfer.toPlayerName}</span>
                </motion.div>
            )}
        </div>
    );
}
