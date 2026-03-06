import { motion } from 'framer-motion';

interface JudgmentPhaseAnimationProps {
    onComplete: () => void;
}

export default function JudgmentPhaseAnimation({ onComplete }: JudgmentPhaseAnimationProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-gradient-to-b from-black via-red-900/30 to-black z-50 flex flex-col items-center justify-center"
            onClick={onComplete}
            style={{ willChange: 'opacity' }}
        >
            {/* タイトル */}
            <motion.h1
                initial={{ opacity: 0, y: -50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, type: 'spring' }}
                className="text-5xl sm:text-6xl font-bold text-red-500 mb-8 text-center"
                style={{ textShadow: '0 0 30px rgba(239, 68, 68, 0.5)' }}
            >
                裁きの時間
            </motion.h1>

            {/* デスノート演出 */}
            <motion.div
                initial={{ rotateY: 0, opacity: 0 }}
                animate={{ rotateY: 360, opacity: 1 }}
                transition={{ delay: 0.5, duration: 1.5 }}
                className="relative mb-8"
                style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
            >
                {/* ノート本体 */}
                <div className="w-48 h-64 bg-gradient-to-br from-gray-800 to-black rounded-lg border-2 border-gray-600 flex items-center justify-center shadow-2xl">
                    <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-6xl"
                    >
                        📓
                    </motion.span>
                </div>
            </motion.div>

            {/* サブテキスト */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-xl text-gray-400 mb-8"
            >
                キラが裁きを下す...
            </motion.p>

            {/* スキップヒント */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 2 }}
                className="text-sm text-gray-500"
            >
                タップでスキップ
            </motion.p>
        </motion.div>
    );
}
