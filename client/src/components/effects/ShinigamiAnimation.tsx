import { motion } from 'framer-motion';

interface ShinigamiAnimationProps {
    targetName: string;
    targetRole: string;
    onComplete: () => void;
}

export default function ShinigamiAnimation({
    targetName,
    targetRole,
    onComplete
}: ShinigamiAnimationProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center"
            style={{ willChange: 'opacity' }}
        >
            {/* 背景グラデーション */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ duration: 2 }}
                className="absolute inset-0 bg-gradient-to-b from-purple-900/30 to-black"
            />

            {/* リュークのシルエット（絵文字で代用） */}
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.7, scale: 1 }}
                transition={{ delay: 0.5, duration: 1.5 }}
                className="text-[150px] mb-8 filter drop-shadow-2xl"
            >
                👁️‍🗨️
            </motion.div>

            {/* テキスト：死神の目が光る */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-2xl text-purple-300 mb-8"
            >
                死神の目が光る...
            </motion.p>

            {/* 情報表示 */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.5 }}
                className="bg-black/50 border border-purple-500/50 rounded-xl p-6 text-center"
            >
                <p className="text-xl text-white mb-2">
                    <span className="text-purple-400">{targetName}</span> の正体は...
                </p>
                <motion.p
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 3 }}
                    className="text-4xl font-bold text-red-500"
                >
                    【{targetRole}】
                </motion.p>
            </motion.div>

            {/* 確認ボタン */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5 }}
                onClick={onComplete}
                className="mt-8 btn-primary px-8 py-4"
            >
                確認
            </motion.button>
        </motion.div>
    );
}
