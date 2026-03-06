import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Card } from 'shared/types';
import { useAppSelector } from '../../hooks';
import { selectGamePlayers } from '../../store/gameSlice';

interface ExchangeModalProps {
    myHand: Card[];
    targetId: string;
    targetCard: Card; // 受け取るカード
    onConfirm: (cardToGiveId: string) => void;
    onCancel: () => void;
}

export default function ExchangeModal({
    myHand,
    targetId,
    targetCard,
    onConfirm,
    onCancel
}: ExchangeModalProps) {
    const [selectedCard, setSelectedCard] = useState<string | null>(null);
    const players = useAppSelector(selectGamePlayers);

    const target = players.find(p => p.id === targetId);

    const handleConfirm = () => {
        if (selectedCard) {
            onConfirm(selectedCard);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-dn-bg-card p-6 rounded-xl max-w-md w-full"
            >
                <h2 className="text-2xl font-bold text-center mb-4">交換</h2>

                {/* 受け取るカード */}
                <div className="mb-6">
                    <p className="text-sm text-dn-text-secondary mb-2">
                        {target?.name}から受け取るカード
                    </p>
                    <div className="flex justify-center">
                        <div className="w-24 h-36 bg-dn-accent/20 border-2 border-dn-accent rounded-lg flex flex-col items-center justify-center p-3">
                            <span className="text-3xl mb-2">{getCardIcon(targetCard.id)}</span>
                            <span className="text-sm font-medium text-center">{targetCard.name}</span>
                        </div>
                    </div>
                </div>

                {/* 渡すカード選択 */}
                <div className="mb-6">
                    <p className="text-sm text-dn-text-secondary mb-2">
                        渡すカードを選択
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                        {myHand.map((card) => (
                            <button
                                key={card.instanceId}
                                onClick={() => setSelectedCard(card.instanceId)}
                                className={`
                  w-20 h-28 rounded-lg flex flex-col items-center justify-center p-2
                  transition-all border
                  ${selectedCard === card.instanceId
                                        ? 'bg-dn-accent/30 border-dn-accent ring-2 ring-dn-accent'
                                        : 'bg-dn-bg-secondary border-dn-text-muted/30 hover:border-dn-accent'
                                    }
                `}
                            >
                                <span className="text-2xl mb-1">{getCardIcon(card.id)}</span>
                                <span className="text-xs text-center">{card.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ボタン */}
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn-secondary flex-1">
                        キャンセル
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedCard}
                        className={`btn-primary flex-1 ${!selectedCard ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        交換する
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// 取調方向選択モーダル
interface InterrogationDirectionModalProps {
    onSelect: (direction: 'LEFT' | 'RIGHT') => void;
    onCancel: () => void;
}

export function InterrogationDirectionModal({
    onSelect,
    onCancel
}: InterrogationDirectionModalProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-dn-bg-card p-6 rounded-xl max-w-sm w-full"
            >
                <h2 className="text-2xl font-bold text-center mb-6">取調</h2>
                <p className="text-center text-dn-text-secondary mb-6">
                    カードを渡す方向を選択
                </p>

                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => onSelect('LEFT')}
                        className="flex-1 bg-dn-bg-secondary hover:bg-dn-accent/30 p-6 rounded-xl transition-colors group"
                    >
                        <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">←</div>
                        <div className="font-medium">左回り</div>
                    </button>

                    <button
                        onClick={() => onSelect('RIGHT')}
                        className="flex-1 bg-dn-bg-secondary hover:bg-dn-accent/30 p-6 rounded-xl transition-colors group"
                    >
                        <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">→</div>
                        <div className="font-medium">右回り</div>
                    </button>
                </div>

                <button onClick={onCancel} className="btn-secondary w-full">
                    キャンセル
                </button>
            </motion.div>
        </motion.div>
    );
}

// 取調カード選択モーダル
interface InterrogationCardSelectProps {
    direction: 'LEFT' | 'RIGHT';
    myHand: Card[];
    onSelect: (cardId: string) => void;
    timeLeft: number;
}

export function InterrogationCardSelectModal({
    direction,
    myHand,
    onSelect,
    timeLeft
}: InterrogationCardSelectProps) {
    const [selectedCard, setSelectedCard] = useState<string | null>(null);

    const handleSubmit = () => {
        if (selectedCard) {
            onSelect(selectedCard);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-dn-bg-card p-6 rounded-xl max-w-md w-full"
            >
                <h2 className="text-2xl font-bold text-center mb-2">取調</h2>
                <p className="text-center text-dn-text-secondary mb-4">
                    {direction === 'LEFT' ? '左' : '右'}の人に渡すカードを選択
                </p>

                {/* タイマー */}
                <div className="flex justify-center mb-4">
                    <div className={`
            w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold
            ${timeLeft <= 5 ? 'bg-red-500/30 text-red-400 animate-pulse' : 'bg-dn-bg-secondary text-white'}
          `}>
                        {timeLeft}
                    </div>
                </div>

                {/* カード選択 */}
                <div className="flex gap-3 justify-center flex-wrap mb-6">
                    {myHand.map((card) => (
                        <button
                            key={card.instanceId}
                            onClick={() => setSelectedCard(card.instanceId)}
                            className={`
                w-20 h-28 rounded-lg flex flex-col items-center justify-center p-2
                transition-all border
                ${selectedCard === card.instanceId
                                    ? 'bg-dn-accent/30 border-dn-accent ring-2 ring-dn-accent'
                                    : 'bg-dn-bg-secondary border-dn-text-muted/30 hover:border-dn-accent'
                                }
              `}
                        >
                            <span className="text-2xl mb-1">{getCardIcon(card.id)}</span>
                            <span className="text-xs text-center">{card.name}</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!selectedCard}
                    className={`btn-primary w-full ${!selectedCard ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    決定
                </button>
            </motion.div>
        </motion.div>
    );
}

function getCardIcon(cardId: number): string {
    const icons: Record<number, string> = {
        0: '📓', 1: '🚔', 2: '🔫', 3: '🎭', 4: '📝',
        5: '👁️', 6: '📹', 7: '🗳️', 8: '🔄', 9: '❓', 13: '💀',
    };
    return icons[cardId] || '🃏';
}
