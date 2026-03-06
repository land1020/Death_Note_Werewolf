import { motion } from 'framer-motion';
import type { Player } from 'shared/types';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface ResponsivePlayerListProps {
    players: Player[];
    currentPlayerId?: string;
    myPlayerId?: string;
    onPlayerClick?: (playerId: string) => void;
}

export default function ResponsivePlayerList({
    players,
    currentPlayerId,
    myPlayerId,
    onPlayerClick
}: ResponsivePlayerListProps) {
    const isMobile = useIsMobile();

    // スマホ: 横スクロールリスト
    if (isMobile) {
        return (
            <div className="overflow-x-auto py-2 -mx-4 px-4">
                <div className="flex gap-3 min-w-max">
                    {players.filter(p => p.id !== myPlayerId).map((player) => (
                        <CompactPlayerCard
                            key={player.id}
                            player={player}
                            isCurrentTurn={player.id === currentPlayerId}
                            onClick={() => onPlayerClick?.(player.id)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // PC: 円形配置
    return (
        <div className="relative w-full h-[300px] lg:h-[400px]">
            {players.filter(p => p.id !== myPlayerId).map((player, index, arr) => {
                const angle = (index / arr.length) * 2 * Math.PI - Math.PI / 2;
                const radius = 120;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                    <motion.div
                        key={player.id}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="absolute left-1/2 top-1/2"
                        style={{
                            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                        }}
                    >
                        <CircularPlayerCard
                            player={player}
                            isCurrentTurn={player.id === currentPlayerId}
                            onClick={() => onPlayerClick?.(player.id)}
                        />
                    </motion.div>
                );
            })}
        </div>
    );
}

// コンパクトプレイヤーカード（スマホ用）
function CompactPlayerCard({
    player,
    isCurrentTurn,
    onClick
}: {
    player: Player;
    isCurrentTurn: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`
        flex flex-col items-center p-2 rounded-lg min-w-[70px]
        touch-manipulation active:scale-95 transition-all
        ${!player.isAlive ? 'opacity-50' : ''}
        ${isCurrentTurn
                    ? 'bg-dn-accent/20 ring-2 ring-dn-accent'
                    : 'bg-dn-bg-secondary'
                }
      `}
        >
            <div className="text-2xl mb-1">
                {!player.isAlive ? '💀' : player.isConnected ? '👤' : '📵'}
            </div>
            <span className={`text-xs font-medium truncate max-w-[60px] ${!player.isAlive ? 'line-through' : ''}`}>
                {player.name}
            </span>
            {player.isHost && (
                <span className="text-[10px] text-yellow-400">👑</span>
            )}
        </button>
    );
}

// 円形プレイヤーカード（PC用）
function CircularPlayerCard({
    player,
    isCurrentTurn,
    onClick
}: {
    player: Player;
    isCurrentTurn: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`
        flex flex-col items-center p-3 rounded-xl w-24
        transition-all hover:scale-105
        ${!player.isAlive ? 'opacity-50' : ''}
        ${isCurrentTurn
                    ? 'bg-dn-accent/20 ring-2 ring-dn-accent shadow-lg shadow-dn-accent/30'
                    : 'bg-dn-bg-card hover:bg-dn-bg-secondary'
                }
      `}
        >
            <div className="text-3xl mb-2">
                {!player.isAlive ? '💀' : player.isConnected ? '👤' : '📵'}
            </div>
            <span className={`text-sm font-medium ${!player.isAlive ? 'line-through' : ''}`}>
                {player.name}
            </span>
            {player.isHost && (
                <span className="text-xs text-yellow-400 mt-1">👑 ホスト</span>
            )}
            {isCurrentTurn && (
                <span className="text-xs text-dn-accent mt-1">手番</span>
            )}
        </button>
    );
}
