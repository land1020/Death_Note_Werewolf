import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const JudgmentHeader: React.FC = () => {
    const [timer, setTimer] = useState(13);

    useEffect(() => {
        // Sync roughly with server timer (13s)
        const interval = setInterval(() => {
            setTimer(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="pt-4 text-center relative z-10 pointer-events-none">
            {/* Title */}
            <motion.h1
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="text-5xl md:text-7xl font-bold text-red-600 mb-2"
                style={{
                    textShadow: '0 0 20px rgba(220, 38, 38, 0.6)',
                    fontFamily: '"Noto Serif JP", serif',
                }}
            >
                裁きの時間
            </motion.h1>

            {/* Subtitle */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-gray-400 text-lg mb-6 tracking-widest"
            >
                The Time of Judgment
            </motion.p>

            {/* Timer */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="inline-flex items-center gap-3 bg-gray-900/90 px-8 py-2 rounded-full border border-red-500/30 shadow-lg"
            >
                <span className="text-gray-400 text-sm">REMAINING</span>
                <span className={`text-4xl font-mono font-bold ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    {timer < 10 ? `0${timer}` : timer}
                </span>
                <span className="text-gray-400 text-sm">SEC</span>
            </motion.div>
        </div>
    );
};
