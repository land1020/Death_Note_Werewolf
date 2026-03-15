import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../../hooks';
import { selectIsHost } from '../../store/roomSlice';
import { selectWinner, selectGamePlayers } from '../../store/gameSlice';
import { WinCondition, Role, Team, ROLE_TEAM } from 'shared/types';
import { socketClient } from '../../socket';

export const ResultScreen: React.FC = () => {
    const winner = useAppSelector(selectWinner);
    const players = useAppSelector(selectGamePlayers);
    const isHost = useAppSelector(selectIsHost);
    const kiraArrested = useAppSelector(state => state.game.kiraArrested);
    const skipVictoryVideo = useAppSelector(state => state.game.skipVictoryVideo);

    // キラ勝利時の演出動画ステート
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    useEffect(() => {
        if (winner === WinCondition.KIRA_WINS && !skipVictoryVideo) {
            setIsVideoPlaying(true);
        }
    }, [winner, skipVictoryVideo]);

    // 勝利陣営の表示内容を決定
    const getWinnerTextAndColor = () => {
        switch (winner) {
            case WinCondition.KIRA_WINS:
                return { text: 'キラ陣営の勝利', color: 'text-red-500', glow: 'shadow-red-500/30' };
            case WinCondition.L_WINS:
                return { text: 'L陣営の勝利', color: 'text-blue-500', glow: 'shadow-blue-500/30' };
            case WinCondition.MELLO_WINS:
                return { text: 'メロの単独勝利', color: 'text-yellow-500', glow: 'shadow-yellow-500/30' };
            default:
                return { text: '引き分け', color: 'text-gray-400', glow: '' };
        }
    };

    const winnerInfo = getWinnerTextAndColor();

    const getRoleName = (role: Role | null) => {
        const roleMap: Record<string, string> = {
            KIRA: 'キラ',
            L: 'L',
            MISA: 'ミサ',
            POLICE: '警察',
            WATARI: 'ワタリ',
            MELLO: 'メロ'
        };
        return role ? roleMap[role] || '不明' : '不明';
    };

    // プレイヤーの勝敗を判定
    const getPlayerResult = (role: Role | null): { isWinner: boolean; label: string; color: string; icon: string } => {
        if (!role || !winner) return { isWinner: false, label: '不明', color: 'text-gray-400', icon: '❓' };

        const team = ROLE_TEAM[role];
        let isWinner = false;

        if (winner === WinCondition.KIRA_WINS && team === Team.KIRA) isWinner = true;
        if (winner === WinCondition.L_WINS && team === Team.L) isWinner = true;
        if (winner === WinCondition.MELLO_WINS && role === Role.MELLO) isWinner = true;

        return isWinner
            ? { isWinner: true, label: '勝利', color: 'text-yellow-400', icon: '🏆' }
            : { isWinner: false, label: '敗北', color: 'text-gray-500', icon: '💀' };
    };

    // プレイヤーのステータスを取得
    const getPlayerStatus = (player: { id: string; role: Role | null; isAlive: boolean }): { label: string; color: string; bgColor: string; icon: string } => {
        if (kiraArrested && player.role === 'KIRA') {
            return { label: '逮捕', color: 'text-blue-400', bgColor: 'bg-blue-900/50', icon: '🚔' };
        }
        if (player.isAlive) {
            return { label: '生存', color: 'text-green-400', bgColor: 'bg-green-900/30', icon: '✅' };
        }
        return { label: '死亡', color: 'text-red-400', bgColor: 'bg-red-900/30', icon: '💀' };
    };

    const handleBackToLobby = () => {
        socketClient.backToLobby();
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-black/95 overflow-hidden">
            {/* キラ勝利時の演出動画 */}
            {isVideoPlaying && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black">
                    <video
                        src="/assets/videos/Death Note Death Scene.mp4"
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        onEnded={() => setIsVideoPlaying(false)}
                        onError={() => setIsVideoPlaying(false)}
                    />
                </div>
            )}
            {/* Background Effect */}
            <div className={`absolute inset-0 bg-gradient-to-t ${winner === WinCondition.KIRA_WINS ? 'from-red-900/30' :
                winner === WinCondition.L_WINS ? 'from-blue-900/30' :
                    'from-yellow-900/30'
                } to-transparent pointer-events-none opacity-50`} />

            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-3xl bg-dn-bg-card/90 border border-dn-accent shadow-2xl rounded-2xl p-8 flex flex-col items-center gap-8"
            >
                <div className="text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className={`text-5xl md:text-6xl font-black tracking-widest ${winnerInfo.color} drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] mb-2`}
                    >
                        GAME SET
                    </motion.h1>
                    <motion.h2
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, duration: 0.5, type: 'spring' }}
                        className={`text-3xl md:text-5xl font-bold mt-4 ${winnerInfo.color} border-y py-4 border-current`}
                    >
                        {winnerInfo.text}
                    </motion.h2>
                </div>

                <div className="w-full mt-4">
                    <h3 className="text-xl font-bold text-center text-dn-text-primary mb-4 border-b border-dn-border pb-2">
                        最終結果
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto px-2 pb-4">
                        {players.map((player, index) => {
                            const result = getPlayerResult(player.role);
                            const status = getPlayerStatus(player);
                            return (
                                <motion.div
                                    key={player.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.5 + index * 0.1 }}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${result.isWinner
                                            ? 'bg-gradient-to-r from-yellow-900/20 to-transparent border-yellow-500/40'
                                            : 'bg-black/50 border-gray-700/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl">
                                            {status.icon}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${result.isWinner ? 'text-white' : 'text-gray-400'
                                                }`}>
                                                {player.name}
                                            </span>
                                            <span className={`text-sm ${player.role === 'KIRA' || player.role === 'MISA' ? 'text-red-400' :
                                                    player.role === 'L' || player.role === 'WATARI' ? 'text-blue-400' :
                                                        player.role === 'POLICE' ? 'text-blue-300' :
                                                            player.role === 'MELLO' ? 'text-yellow-400' :
                                                                'text-gray-300'
                                                }`}>
                                                {getRoleName(player.role)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* ステータス（生存/死亡/逮捕） */}
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${status.bgColor} ${status.color}`}>
                                            {status.label}
                                        </span>
                                        {/* 勝敗 */}
                                        <span className={`text-sm font-black ${result.color}`}>
                                            {result.icon} {result.label}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {isHost ? (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 2.5 }}
                        className="btn-primary w-full max-w-md py-4 text-xl font-bold mt-4 shadow-lg shadow-dn-accent/20"
                        onClick={handleBackToLobby}
                    >
                        ルームへ戻る
                    </motion.button>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.5 }}
                        className="text-dn-text-secondary mt-4 animate-pulse"
                    >
                        ホストがルームに戻るのを待っています...
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};
