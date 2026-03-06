import { motion } from 'framer-motion';
import type { Card, CardId } from 'shared/types';

interface CardVisualProps {
    card: Card;
    size?: 'small' | 'medium' | 'large';
    selected?: boolean;
    onClick?: () => void;
}

export default function CardVisual({
    card,
    size = 'medium',
    selected = false,
    onClick
}: CardVisualProps) {
    const sizeClasses = {
        small: 'w-14 h-20 text-xs',
        medium: 'w-20 h-28 text-sm',
        large: 'w-28 h-40 text-base',
    };

    const isDeathNote = card.id === 0;
    const isShinigami = card.id === 13;

    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`
        ${sizeClasses[size]}
        relative rounded-lg border-2 p-1 flex flex-col justify-between
        cursor-pointer transition-all
        ${isDeathNote
                    ? 'bg-gradient-to-br from-gray-900 to-black border-red-600 shadow-lg shadow-red-500/30'
                    : isShinigami
                        ? 'bg-gradient-to-br from-purple-900 to-black border-purple-500'
                        : 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600'
                }
        ${selected ? 'ring-2 ring-dn-accent ring-offset-2 ring-offset-black' : ''}
        ${card.isUsed ? 'opacity-50' : ''}
      `}
            style={{ willChange: 'transform' }}
        >
            {/* カード番号 */}
            <div className="text-[10px] text-gray-500">#{card.id}</div>

            {/* カードアイコン */}
            <div className="flex-1 flex items-center justify-center">
                <span className={size === 'large' ? 'text-4xl' : size === 'medium' ? 'text-2xl' : 'text-xl'}>
                    {getCardEmoji(card.id)}
                </span>
            </div>

            {/* カード名 */}
            <div className={`text-center font-bold ${isDeathNote ? 'text-red-400' : 'text-white'}`}>
                {getCardName(card.id)}
            </div>

            {/* 使用済みオーバーレイ */}
            {card.isUsed && (
                <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                    <span className="text-red-500 text-xs font-bold rotate-[-15deg]">使用済</span>
                </div>
            )}
        </motion.div>
    );
}

// カード裏面コンポーネント
export function CardBack({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
    const sizeClasses = {
        small: 'w-14 h-20',
        medium: 'w-20 h-28',
        large: 'w-28 h-40',
    };

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className={`
        ${sizeClasses[size]}
        bg-gradient-to-br from-gray-800 to-gray-900 
        rounded-lg border-2 border-gray-600
        flex items-center justify-center
      `}
        >
            <div className="w-3/4 h-3/4 bg-gradient-to-br from-red-900 to-red-950 rounded border border-red-800 flex items-center justify-center">
                <span className="text-2xl">❓</span>
            </div>
        </motion.div>
    );
}

function getCardName(cardId: CardId): string {
    const names: Record<number, string> = {
        0: 'デスノート',
        1: '逮捕',
        2: '拳銃',
        3: '偽名',
        4: 'アリバイ',
        5: '目撃',
        6: '監視',
        7: '投票',
        8: '交換',
        9: '取調',
        13: '死神',
    };
    return names[cardId] || `Card${cardId}`;
}

function getCardEmoji(cardId: CardId): string {
    const emojis: Record<number, string> = {
        0: '📓',
        1: '🔗',
        2: '🔫',
        3: '🎭',
        4: '🛡️',
        5: '👁️',
        6: '📹',
        7: '🗳️',
        8: '🔄',
        9: '❔',
        13: '👁️‍🗨️',
    };
    return emojis[cardId] || '🎴';
}
