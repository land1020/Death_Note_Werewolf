import React from 'react';
import { motion } from 'framer-motion';

export const JudgmentBackground: React.FC = () => {
    return (
        <div className="absolute inset-0 z-0">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-red-950/30 to-black" />

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-red-500/30 rounded-full"
                        initial={{
                            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                            y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 10,
                        }}
                        animate={{
                            y: -10,
                            x: (Math.random() - 0.5) * 50 + (Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000)),
                            opacity: [0, 0.8, 0],
                        }}
                        transition={{
                            duration: 5 + Math.random() * 5,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                            ease: "linear"
                        }}
                    />
                ))}
            </div>

            {/* Death Note Symbol (Faint) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                {/* Placeholder for symbol if image not available, avoiding broken image */}
                <div className="text-[20rem] font-serif text-white select-none">L</div>
            </div>
        </div>
    );
};
