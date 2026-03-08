import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../hooks';
import {
    selectPlayers,
    selectRoomCode,
    selectIsHost,
    selectMyPlayerId,
    selectDeckConfig,
    selectRoleConfig
} from '../store/roomSlice';
import { selectGamePhase } from '../store/gameSlice';
import { selectError } from '../store/uiSlice';
import { socketClient } from '../socket';
import DebugLogOverlay from '../components/debug/DebugLogOverlay';
import ColorPalette from '../components/lobby/ColorPalette';
import DeckConfigModal from '../components/lobby/DeckConfigModal';
import RoleConfigModal from '../components/lobby/RoleConfigModal';
import { DeckConfig, RoleConfig } from 'shared/types';

export default function LobbyPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();

    const roomCode = useAppSelector(selectRoomCode);
    const players = useAppSelector(selectPlayers);
    const isHost = useAppSelector(selectIsHost);
    const myPlayerId = useAppSelector(selectMyPlayerId);
    const error = useAppSelector(selectError);
    const gamePhase = useAppSelector(selectGamePhase);
    const deckConfig = useAppSelector(selectDeckConfig);
    const roleConfig = useAppSelector(selectRoleConfig);

    const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

    // Redirect if not in room
    useEffect(() => {
        if (!roomCode && code) {
            // Room not found in state, redirect to top
            navigate('/');
        }
    }, [roomCode, code, navigate]);

    // Redirect to game page when game starts
    useEffect(() => {
        if (gamePhase && gamePhase !== 'LOBBY') {
            console.log('🎮 Game started! Navigating to game page...');
            navigate(`/game/${code}`);
        }
    }, [gamePhase, code, navigate]);

    const handleStartGame = () => {
        socketClient.startGame();
    };

    const handleLeaveRoom = () => {
        socketClient.leaveRoom();
        navigate('/');
    };

    const handleSaveDeckConfig = (config: DeckConfig) => {
        socketClient.updateDeckConfig(config);
    };

    const handleSaveRoleConfig = (config: RoleConfig) => {
        socketClient.updateRoleConfig(config);
    };

    const nonSpectatorCount = players.filter(p => !p.isSpectator).length;
    const canStartGame = nonSpectatorCount >= 4;

    return (
        <div className="min-h-screen flex flex-col p-4">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <p className="text-dn-text-secondary mb-2">部屋コード</p>
                <div className="inline-flex items-center gap-4 bg-dn-bg-card/80 px-8 py-4 rounded-xl border border-dn-accent/30">
                    <h1 className="text-5xl md:text-6xl font-bold text-dn-accent tracking-widest">
                        {code}
                    </h1>
                    <button
                        onClick={() => navigator.clipboard.writeText(code || '')}
                        className="text-dn-text-secondary hover:text-white transition-colors p-2"
                        title="コードをコピー"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
            </motion.div>

            {/* Error Display */}
            {error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-center mb-4"
                >
                    {error}
                </motion.div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
                {/* Players List */}
                <div className="flex-1 overflow-y-auto mb-6 custom-scrollbar pr-1">
                    <div className="grid grid-cols-1 gap-3">
                        {players.map((player) => (
                            <motion.div
                                key={player.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex items-center justify-between p-4 rounded-xl border ${player.id === myPlayerId
                                    ? 'bg-dn-bg-secondary border-dn-accent'
                                    : 'bg-dn-bg-card border-dn-accent/20'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                        style={{ backgroundColor: player.color || '#374151' }}
                                    >
                                        {player.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold flex items-center gap-2">
                                            {player.name}
                                            {player.isHost && (
                                                <span className="text-[10px] bg-dn-accent text-white px-1.5 py-0.5 rounded uppercase font-bold">
                                                    Host
                                                </span>
                                            )}
                                            {player.isSpectator && (
                                                <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded uppercase font-bold">
                                                    Spectator
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-dn-text-muted">
                                            {player.id === myPlayerId ? 'あなた' : 'プレイヤー'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* ホストによるキックボタン */}
                                    {isHost && player.id !== myPlayerId && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`${player.name} を強制退出させますか？`)) {
                                                    socketClient.kickPlayer(player.id);
                                                }
                                            }}
                                            className="text-xs bg-red-600/80 hover:bg-red-500 text-white px-2 py-1 rounded transition-colors mr-2"
                                        >
                                            退出させる
                                        </button>
                                    )}

                                    {player.isConnected ? (
                                        <span className="w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-500/20" title="接続中"></span>
                                    ) : (
                                        <span className="w-2 h-2 bg-red-500 rounded-full" title="切断状態"></span>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {/* Empty Slots */}
                        {Array.from({ length: Math.max(0, 4 - nonSpectatorCount) }).map((_, i) => (
                            <div key={`empty-${i}`} className="p-4 rounded-xl border border-dashed border-dn-accent/10 flex items-center justify-center">
                                <p className="text-dn-text-muted text-sm italic">待機中...</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="space-y-4">
                    {/* Color Palette */}
                    <ColorPalette players={players} myPlayerId={myPlayerId || ''} />

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        {isHost ? (
                            <button
                                onClick={handleStartGame}
                                disabled={!canStartGame}
                                className={`btn-primary w-full text-xl py-4 flex items-center justify-center gap-3 ${!canStartGame ? 'opacity-50 grayscale' : 'animate-pulse-slow'
                                    }`}
                            >
                                {canStartGame ? 'ゲーム開始' : `あと${4 - nonSpectatorCount}プレイヤー必要 (観戦者除く)`}
                            </button>
                        ) : (
                            <div className="p-4 bg-dn-bg-secondary/30 rounded-xl border border-dn-accent/10 text-center italic text-dn-text-muted">
                                ホストがゲームを開始するのを待っています...
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIsDeckModalOpen(true)}
                                className="btn-secondary flex items-center justify-center gap-2 py-3"
                            >
                                {isHost ? '🔧 デッキ調整' : '🔍 デッキ確認'}
                            </button>
                            <button
                                onClick={() => setIsRoleModalOpen(true)}
                                className="btn-secondary flex items-center justify-center gap-2 py-3"
                            >
                                {isHost ? '👤 役職調整' : '🔍 役職確認'}
                            </button>
                        </div>

                        {/* Room Controls: Add NPC & Spectator Toggle */}
                        {isHost && (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => socketClient.addNpc()}
                                    className="bg-yellow-600/80 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-yellow-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 w-full"
                                >
                                    🤖 NPC追加
                                </button>
                                <button
                                    onClick={() => {
                                        const me = players.find(p => p.id === myPlayerId);
                                        if (me) {
                                            socketClient.toggleSpectator(!me.isSpectator);
                                        }
                                    }}
                                    className={`${players.find(p => p.id === myPlayerId)?.isSpectator ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'} text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 w-full`}
                                >
                                    👀 観戦: {players.find(p => p.id === myPlayerId)?.isSpectator ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        )}

                        <button
                            onClick={handleLeaveRoom}
                            className="w-full text-dn-text-muted hover:text-white transition-colors py-2 text-sm font-medium"
                        >
                            退室する
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Error Notifications */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl z-[100] font-bold"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Debug Overlay */}
            <DebugLogOverlay />

            {/* Deck Config Modal */}
            {deckConfig && (
                <DeckConfigModal
                    isOpen={isDeckModalOpen}
                    onClose={() => setIsDeckModalOpen(false)}
                    initialConfig={deckConfig}
                    isHost={isHost}
                    onSave={handleSaveDeckConfig}
                />
            )}

            {/* Role Config Modal */}
            {roleConfig && (
                <RoleConfigModal
                    isOpen={isRoleModalOpen}
                    onClose={() => setIsRoleModalOpen(false)}
                    initialConfig={roleConfig}
                    isHost={isHost}
                    onSave={handleSaveRoleConfig}
                />
            )}
        </div>
    );
}
