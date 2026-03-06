import { motion, AnimatePresence } from 'framer-motion';
import type { Card, CardId } from 'shared/types';

interface CardCutInProps {
    card: Card;
    userName: string;
    onComplete: () => void;
}

export default function CardCutIn({ card, userName, onComplete }: CardCutInProps) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center z-50 bg-black/80"
                onClick={onComplete}
                style={{ willChange: 'opacity' }}
            >
                <motion.div
                    initial={{ y: -100, opacity: 0, scale: 0.5 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="text-center"
                >
                    {/* ユーザー名 */}
                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl font-bold text-white mb-4"
                    >
                        {userName}
                    </motion.h2>

                    {/* カード演出 */}
                    <CardEffect cardId={card.id} />

                    {/* カード使用メッセージ */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-2xl text-dn-accent mt-4"
                    >
                        {getCardName(card.id)}を使用！
                    </motion.p>

                    {/* スキップヒント */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        transition={{ delay: 1 }}
                        className="text-sm text-gray-400 mt-8"
                    >
                        タップでスキップ
                    </motion.p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// カード別エフェクト
function CardEffect({ cardId }: { cardId: CardId }) {
    switch (cardId) {
        case 1: // 逮捕
            return <ArrestEffect />;
        case 2: // 拳銃
            return <GunEffect />;
        case 5: // 目撃
            return <WitnessEffect />;
        case 6: // 監視
            return <SurveillanceEffect />;
        case 7: // 投票
            return <VoteEffect />;
        case 8: // 交換
            return <ExchangeEffect />;
        case 9: // 取調
            return <InterrogationEffect />;
        case 13: // 死神
            return <ShinigamiEffect />;
        default:
            return <DefaultCardEffect cardId={cardId} />;
    }
}

// 逮捕エフェクト - 手錠
function ArrestEffect() {
    return (
        <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="text-8xl"
        >
            🔗
        </motion.div>
    );
}

// 拳銃エフェクト
function GunEffect() {
    return (
        <motion.div className="relative">
            <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-8xl"
            >
                🔫
            </motion.div>
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 2, 0], opacity: [0, 1, 0] }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center text-6xl"
            >
                💥
            </motion.div>
        </motion.div>
    );
}

// 目撃エフェクト
function WitnessEffect() {
    return (
        <motion.div
            animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1]
            }}
            transition={{ duration: 1, repeat: 2 }}
            className="text-8xl"
        >
            👁️
        </motion.div>
    );
}

// 監視カメラエフェクト
function SurveillanceEffect() {
    return (
        <motion.div className="relative">
            <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-8xl"
            >
                📹
            </motion.div>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 border-4 border-red-500 rounded-lg"
            />
        </motion.div>
    );
}

// 投票エフェクト
function VoteEffect() {
    return (
        <motion.div className="flex gap-2">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="text-6xl"
                >
                    👆
                </motion.div>
            ))}
        </motion.div>
    );
}

// 交換エフェクト
function ExchangeEffect() {
    return (
        <motion.div className="flex items-center gap-4">
            <motion.div
                animate={{ x: [0, 30, 0] }}
                transition={{ duration: 0.8, repeat: 2 }}
                className="text-6xl"
            >
                🎴
            </motion.div>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: 2 }}
                className="text-4xl"
            >
                🔄
            </motion.div>
            <motion.div
                animate={{ x: [0, -30, 0] }}
                transition={{ duration: 0.8, repeat: 2 }}
                className="text-6xl"
            >
                🎴
            </motion.div>
        </motion.div>
    );
}

// 取調エフェクト
function InterrogationEffect() {
    return (
        <motion.div
            animate={{
                rotate: [0, 360],
            }}
            transition={{ duration: 1.5, repeat: 1 }}
            className="text-8xl"
        >
            🔄
        </motion.div>
    );
}

// 死神エフェクト（簡易版）
function ShinigamiEffect() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-8xl"
        >
            👁️‍🗨️
        </motion.div>
    );
}

// デフォルトエフェクト
function DefaultCardEffect({ cardId }: { cardId: CardId }) {
    return (
        <motion.div
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 360 }}
            transition={{ duration: 0.8 }}
            className="w-32 h-48 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl border-2 border-dn-accent flex items-center justify-center"
        >
            <span className="text-4xl">{getCardEmoji(cardId)}</span>
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
