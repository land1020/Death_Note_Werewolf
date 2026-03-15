import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../../../hooks';
import { selectIsDebug } from '../../../store/roomSlice';
import { socketClient } from '../../../socket';

export const OtherPlayerJudgmentView: React.FC = () => {
    const isDebug = useAppSelector(selectIsDebug);
    const [isConfirmed, setIsConfirmed] = useState(false);

    const handleSkip = () => {
        setIsConfirmed(true);
        socketClient.judgmentAction('CONFIRM');
    };

    return (
        <div className="text-center px-4 max-w-2xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center"
            >
                {/* Visual: Spinning/Floating Death Note */}
                <motion.div
                    animate={{
                        y: [-10, 10, -10],
                        rotateY: [0, 10, -10, 0],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    className="mb-10 relative"
                >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />

                    {/* Placeholder for Book Image */}
                    <div className="w-48 h-64 bg-black border-2 border-gray-700 rounded-r-lg shadow-2xl flex items-center justify-center relative z-10">
                        <span className="font-serif text-4xl text-gray-800 rotate-90 tracking-widest">DEATH NOTE</span>
                    </div>
                </motion.div>

                <h2 className="text-3xl text-gray-200 mb-4 font-bold font-serif">
                    キラが裁きを下しています...
                </h2>

                <p className="text-gray-500 text-lg mb-8">
                    デスノートに名前が書かれているかもしれません
                </p>

                {/* Loading Dots */}
                <div className="flex justify-center gap-3 mb-10">
                    {[0, 1, 2].map(i => (
                        <motion.div
                            key={i}
                            className="w-4 h-4 bg-red-600 rounded-full"
                            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.3,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </div>

                {/* Skip Button */}
                {!isConfirmed && isDebug ? (
                    <button
                        onClick={handleSkip}
                        className="py-4 px-12 text-xl font-bold border-4 border-gray-600 rounded-xl transition-all bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
                    >
                        スキップ (DEBUG)
                    </button>
                ) : !isConfirmed ? (
                    <p className="text-gray-500 italic text-lg">
                        静かにその時を待っています...
                    </p>
                ) : (
                    <div className="text-xl font-bold text-yellow-400 animate-pulse">
                        他のプレイヤーを待機中...
                    </div>
                )}
            </motion.div>
        </div>
    );
};
