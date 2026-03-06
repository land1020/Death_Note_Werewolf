import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../../hooks';
import { selectMyPlayerId } from '../../store/roomSlice';
import { selectGamePlayers } from '../../store/gameSlice';
import { socketClient } from '../../socket';

interface VoteModalProps {
    timeLimit: number; // seconds
    onClose: () => void;
}

export default function VoteModal({ timeLimit, onClose: _onClose }: VoteModalProps) {
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(timeLimit);
    const [hasVoted, setHasVoted] = useState(false);

    const players = useAppSelector(selectGamePlayers);
    const myPlayerId = useAppSelector(selectMyPlayerId);

    const otherPlayers = players.filter(p => p.id !== myPlayerId && p.isAlive);

    // タイマー
    useEffect(() => {
        if (timeLeft <= 0 || hasVoted) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // 時間切れ - ランダム投票
                    if (!hasVoted && otherPlayers.length > 0) {
                        const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                        handleVote(randomTarget.id);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, hasVoted, otherPlayers]);

    const pendingAction = useAppSelector(state => state.game.pendingAction);

    const handleVote = (targetId: string) => {
        if (hasVoted) return;
        setHasVoted(true);
        if (pendingAction?.type === 'VOTE') {
            socketClient.castVote(targetId);
        } else {
            socketClient.judgmentAction(targetId);
        }
    };

    const handleSubmit = () => {
        if (selectedPlayer) {
            handleVote(selectedPlayer);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-dn-bg-card p-6 rounded-xl max-w-md w-full"
            >
                <h2 className="text-2xl font-bold text-center mb-2">投票</h2>
                <p className="text-center text-dn-text-secondary mb-4">
                    キラだと思う人を選んでください
                </p>

                {/* タイマー */}
                <div className="flex justify-center mb-6">
                    <div className={`
            w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
            ${timeLeft <= 3 ? 'bg-red-500/30 text-red-400 animate-pulse' : 'bg-dn-bg-secondary text-white'}
          `}>
                        {timeLeft}
                    </div>
                </div>

                {/* プレイヤー選択 */}
                {!hasVoted ? (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {otherPlayers.map((player) => (
                                <button
                                    key={player.id}
                                    onClick={() => setSelectedPlayer(player.id)}
                                    className={`
                                        p-4 rounded-lg transition-all border
                                        ${selectedPlayer === player.id
                                            ? 'text-white ring-2 ring-offset-2 ring-offset-dn-bg-card'
                                            : 'hover:opacity-80'
                                        }
                                    `}
                                    style={{
                                        backgroundColor: selectedPlayer === player.id
                                            ? (player.color || '#374151')
                                            : `${player.color || '#374151'}33`, // 33 is ~20% opacity
                                        borderColor: player.color || '#374151',
                                        boxShadow: selectedPlayer === player.id ? `0 0 15px ${player.color}80` : 'none'
                                    }}
                                >
                                    <div className="text-2xl mb-1">{player.name.charAt(0)}</div>
                                    <div className="text-sm">{player.name}</div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!selectedPlayer}
                            className={`btn-primary w-full ${!selectedPlayer ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            投票する
                        </button>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-4">✅</div>
                        <p className="text-dn-text-secondary">投票完了</p>
                        <p className="text-sm text-dn-text-muted mt-2">
                            他のプレイヤーを待っています...
                        </p>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
