import { motion } from 'framer-motion';
import type { Role } from 'shared/types';

interface JudgmentResultModalProps {
    targetName: string | null;
    survived: boolean;
    usedFakeName: boolean;
    eliminatedRole?: Role;
    onClose: () => void;
}

export default function JudgmentResultModal({
    targetName,
    survived,
    usedFakeName,
    eliminatedRole,
    onClose
}: JudgmentResultModalProps) {

    // スキップの場合
    if (!targetName) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-2xl text-dn-text-secondary mb-8"
                    >
                        キラは裁きを下しませんでした
                    </motion.p>

                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                        onClick={onClose}
                        className="btn-primary"
                    >
                        次へ
                    </motion.button>
                </motion.div>
            </motion.div>
        );
    }

    // 偽名で生存の場合
    if (survived && usedFakeName) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-md"
                >
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-6xl mb-6"
                    >
                        🎭
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-3xl font-bold mb-4"
                    >
                        「{targetName}」は
                    </motion.p>

                    <motion.p
                        initial={{ opacity: 0, scale: 1.2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1 }}
                        className="text-2xl text-green-400 font-bold mb-6"
                    >
                        偽名カードで生き残りました！
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                        className="bg-dn-bg-card p-4 rounded-xl inline-block mb-8"
                    >
                        <div className="text-4xl mb-2">🎭</div>
                        <div className="text-sm text-dn-text-secondary">偽名カード使用</div>
                    </motion.div>

                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2 }}
                        onClick={onClose}
                        className="btn-primary w-full"
                    >
                        次へ
                    </motion.button>
                </motion.div>
            </motion.div>
        );
    }

    // 死亡の場合
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center max-w-md"
            >
                {/* 死亡演出 */}
                <motion.div
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-8xl mb-6"
                >
                    💀
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-3xl font-bold mb-4"
                >
                    「{targetName}」は
                </motion.p>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-2xl text-red-400 font-bold mb-6"
                >
                    心臓麻痺で死亡しました
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="bg-dn-bg-card p-6 rounded-xl mb-8"
                >
                    <p className="text-dn-text-secondary mb-2">役職</p>
                    <p className="text-3xl font-bold text-dn-accent">
                        【{getRoleName(eliminatedRole)}】
                    </p>
                </motion.div>

                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    onClick={onClose}
                    className="btn-primary w-full"
                >
                    次へ
                </motion.button>
            </motion.div>
        </motion.div>
    );
}

function getRoleName(role: Role | undefined): string {
    if (!role) return '?';
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
