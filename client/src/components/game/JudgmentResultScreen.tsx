import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../../hooks';
import { GamePhase, Role } from 'shared/types';

export const JudgmentResultScreen: React.FC = () => {
    const judgmentResult = useAppSelector(state => state.game.judgmentResult);
    const phase = useAppSelector(state => state.game.phase);

    // Only show if we have a result and correct phase
    if (phase !== GamePhase.JUDGMENT_RESULT || !judgmentResult) return null;

    const { targetName, survived, targetRole } = judgmentResult;

    // Helper to get role name in Japanese
    const getRoleName = (role: Role | null | undefined) => {
        if (!role) return '';
        const names: Record<Role, string> = {
            [Role.KIRA]: 'キラ',
            [Role.L]: 'L',
            [Role.MISA]: 'ミサ',
            [Role.WATARI]: 'ワタリ',
            [Role.MELLO]: 'メロ',
            [Role.POLICE]: '警察',
        };
        return names[role] || role;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
        >
            {/* カットシーン動画は CutscenePlayer で既に再生済みのため、ここでは結果のみ表示 */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black pointer-events-none" />

                    <div className="text-center px-4 relative z-10 max-w-4xl w-full">

                        <AnimatePresence mode='wait'>
                            {targetName ? (
                                survived ? (
                                    // Survived (Fake Name)
                                    <motion.div
                                        key="survived"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ opacity: 0, scale: 1.2 }}
                                        transition={{ type: 'spring', duration: 0.8 }}
                                    >
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', delay: 0.3, damping: 10 }}
                                            className="text-8xl mb-8 filter drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                                        >
                                            🛡️
                                        </motion.div>

                                        <motion.h2
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 }}
                                            className="text-5xl md:text-6xl font-bold text-blue-400 mb-6 font-serif"
                                        >
                                            「{targetName}」は<br />生き残った！
                                        </motion.h2>

                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.8 }}
                                            className="text-2xl text-gray-300 bg-blue-900/30 py-4 rounded-xl border border-blue-500/30"
                                        >
                                            偽名カードを使用して死を免れました
                                        </motion.p>
                                    </motion.div>
                                ) : (
                                    // Died
                                    <motion.div
                                        key="died"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                    >
                                        <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: 'spring', delay: 0.3, bounce: 0.5 }}
                                            className="text-8xl mb-8 filter drop-shadow-[0_0_30px_rgba(220,38,38,0.6)]"
                                        >
                                            💀
                                        </motion.div>

                                        <motion.h2
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 }}
                                            className="text-5xl md:text-6xl font-bold text-red-600 mb-6 font-serif"
                                        >
                                            「{targetName}」は<br />心臓麻痺で死亡
                                        </motion.h2>

                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            transition={{ delay: 0.8 }}
                                            className="mt-8 p-6 bg-gray-900/90 rounded-xl border border-gray-700 inline-block min-w-[300px]"
                                        >
                                            <p className="text-gray-400 text-sm mb-2 uppercase tracking-widest">正体（役職）</p>
                                            <p className="text-4xl font-bold text-white font-serif">{getRoleName(targetRole)}</p>
                                        </motion.div>
                                    </motion.div>
                                )
                            ) : (
                                // Skipped / No Execution
                                <motion.div
                                    key="skipped"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5 }}
                                        className="text-8xl mb-8 opacity-50"
                                    >
                                        📖
                                    </motion.div>

                                    <motion.h2
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-4xl md:text-5xl font-bold text-gray-400 mb-6 font-serif"
                                    >
                                        今夜は誰も裁かれなかった
                                    </motion.h2>

                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-xl text-gray-600 block"
                                    >
                                        キラはデスノートを持っていなかったか、<br />裁きを見送りました
                                    </motion.p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Next Phase Timer/Indicator */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2.5, duration: 1 }}
                            className="mt-12 text-gray-500 text-sm animate-pulse"
                        >
                            まもなく捜査の時間に戻ります...
                        </motion.div>

                    </div>
        </motion.div>
    );
};
