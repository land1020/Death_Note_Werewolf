import { motion } from 'framer-motion';
import type { TransferInfo } from 'shared/types';
import { useAppSelector } from '../../hooks';
import { selectGamePlayers } from '../../store/gameSlice';

interface VoteResultModalProps {
    results: Array<{
        voterId: string;
        voterName: string;
        targetId: string;
        targetName: string;
    }>;
    onClose: () => void;
}

export default function VoteResultModal({ results, onClose }: VoteResultModalProps) {
    const players = useAppSelector(selectGamePlayers);

    // 得票数を集計
    const voteCounts = results.reduce((acc, r) => {
        acc[r.targetName] = (acc[r.targetName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sortedCounts = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);

    const getPlayerColor = (name: string) => {
        const player = players.find(p => p.name === name);
        return player?.color || '#374151';
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
                className="bg-dn-bg-card p-6 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            >
                <h2 className="text-2xl font-bold text-center mb-6">投票結果</h2>

                {/* 得票数 */}
                <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3 text-dn-accent">得票数</h3>
                    <div className="space-y-2">
                        {sortedCounts.map(([name, count], index) => {
                            const pColor = getPlayerColor(name);
                            return (
                                <div
                                    key={name}
                                    className={`
                                      flex justify-between items-center p-3 rounded-lg border
                                    `}
                                    style={{
                                        backgroundColor: index === 0 ? pColor : `${pColor}33`,
                                        borderColor: index === 0 ? '#ffffff' : `${pColor}60`,
                                        boxShadow: index === 0 ? `0 0 15px ${pColor}80` : 'none',
                                    }}
                                >
                                    <span className="font-bold text-white text-lg drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                                        {name}
                                    </span>
                                    <span className="text-xl font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                                        {count}票
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 詳細 */}
                <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3 text-dn-text-secondary">投票詳細</h3>
                    <div className="space-y-1">
                        {results.map((r, index) => {
                            const voterColor = getPlayerColor(r.voterName);
                            const targetColor = getPlayerColor(r.targetName);
                            return (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 text-sm rounded bg-black/40 p-2 border border-white/5"
                                >
                                    <span className="px-2 py-0.5 rounded font-bold" style={{ backgroundColor: `${voterColor}40`, color: voterColor }}>{r.voterName}</span>
                                    <span className="text-white/50">→</span>
                                    <span className="px-2 py-0.5 rounded font-bold" style={{ backgroundColor: `${targetColor}40`, color: targetColor }}>{r.targetName}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button onClick={onClose} className="btn-primary w-full">
                    確認
                </button>
            </motion.div>
        </motion.div>
    );
}

// 取調結果モーダル
interface InterrogationResultModalProps {
    direction: 'LEFT' | 'RIGHT';
    transfers: TransferInfo[];
    onClose: () => void;
}

export function InterrogationResultModal({
    direction,
    transfers,
    onClose
}: InterrogationResultModalProps) {
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
                className="bg-dn-bg-card p-6 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            >
                <h2 className="text-2xl font-bold text-center mb-2">取調結果</h2>
                <p className="text-center text-dn-text-secondary mb-6">
                    {direction === 'LEFT' ? '← 左回り' : '右回り →'}
                </p>

                <div className="space-y-3">
                    {transfers.map((t, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.3 }}
                            className="bg-dn-bg-secondary p-4 rounded-lg"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{t.fromPlayerName}</span>
                                    <span className="text-dn-text-muted">→</span>
                                    <span className="font-medium text-dn-accent">{t.toPlayerName}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-dn-bg-primary px-3 py-1 rounded relative">
                                    <span className="bg-black/80 w-5 h-5 rounded-full border border-gray-400/50 flex items-center justify-center -ml-1">
                                        <span className="text-[10px] font-bold text-gray-200">{t.card.id}</span>
                                    </span>
                                    <span className="hidden">{getCardIcon(t.card.id)}</span>
                                    <span className="text-sm font-bold">{t.card.name}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <button onClick={onClose} className="btn-primary w-full mt-6">
                    確認
                </button>
            </motion.div>
        </motion.div>
    );
}

function getCardIcon(cardId: number): string {
    const icons: Record<number, string> = {
        0: '📓', 1: '🚔', 2: '🔫', 3: '🎭', 4: '📝',
        5: '👁️', 6: '📹', 7: '🗳️', 8: '🔄', 9: '❓', 13: '💀',
    };
    return icons[cardId] || '🃏';
}
