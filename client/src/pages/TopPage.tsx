import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../hooks';
import { selectRoomCode } from '../store/roomSlice';
import { selectGamePhase } from '../store/gameSlice';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';

export default function TopPage() {
    const navigate = useNavigate();
    const roomCode = useAppSelector(selectRoomCode);
    const gamePhase = useAppSelector(selectGamePhase);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    useEffect(() => {
        if (roomCode) {
            if (gamePhase && gamePhase !== 'LOBBY') {
                navigate(`/game/${roomCode}`);
            } else {
                navigate(`/room/${roomCode}`);
            }
        }
    }, [roomCode, gamePhase, navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {/* Logo and Title */}
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-12"
            >
                {/* Death Note Style Logo */}
                <div className="relative mb-6">
                    <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
                        <span className="text-white">DEATH</span>
                        <span className="text-dn-accent"> NOTE</span>
                    </h1>
                    <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-dn-accent to-transparent"></div>
                </div>

                <motion.h2
                    className="text-3xl md:text-4xl font-bold text-dn-accent text-shadow-glow"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    人狼
                </motion.h2>

                <motion.p
                    className="text-dn-text-secondary mt-4 text-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    キラ vs L ― 正義はどちらに？
                </motion.p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="flex flex-col gap-4 w-full max-w-sm"
            >
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary text-xl py-4 flex items-center justify-center gap-3 group"
                >
                    <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    部屋を作成
                </button>

                <button
                    onClick={() => setShowJoinModal(true)}
                    className="btn-secondary text-xl py-4 flex items-center justify-center gap-3 group"
                >
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                    </svg>
                    部屋に参加
                </button>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div
                className="absolute bottom-8 text-center text-dn-text-muted text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
            >
                <p>4〜8人でプレイ可能</p>
            </motion.div>

            {/* Modals */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateRoomModal onClose={() => setShowCreateModal(false)} />
                )}
                {showJoinModal && (
                    <JoinRoomModal onClose={() => setShowJoinModal(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}
