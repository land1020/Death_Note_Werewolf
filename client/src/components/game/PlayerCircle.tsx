import { motion } from 'framer-motion';
import type { Player } from 'shared/types';
import { getCardImagePath } from '../../utils/assetPaths';

interface PlayerMatProps {
    player: Player;
    isCurrentTurn: boolean;
    isSelected: boolean;
    isTargetable?: boolean;
    onClick?: () => void;
    isStartPlayer?: boolean;
}

function PlayerMat({ player, isCurrentTurn, isSelected, isTargetable, onClick, isStartPlayer }: PlayerMatProps) {
    const isAlive = player.isAlive;
    const playerColor = player.color || '#6B7280';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={isTargetable && onClick ? onClick : undefined}
            whileHover={isTargetable ? { scale: 1.05 } : undefined}
            whileTap={isTargetable ? { scale: 0.97 } : undefined}
            className={`
                relative rounded-xl overflow-hidden shadow-lg transition-all border-2
                w-full
                ${isSelected ? 'ring-2 ring-yellow-400/80 z-50' : ''}
                ${isCurrentTurn ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-[#0A0A1A] z-40 scale-105 border-transparent' : ''}
                ${!isAlive ? 'opacity-40 grayscale' : ''}
                ${isTargetable ? 'cursor-pointer hover:ring-2 hover:ring-dn-accent/60' : ''}
            `}
            style={{
                borderColor: `${playerColor}50`,
                ...(isCurrentTurn ? {
                    boxShadow: `0 0 25px rgba(250, 204, 21, 0.9), inset 0 0 15px rgba(250, 204, 21, 0.4)`,
                } : {}),
            }}
        >
            {/* ヘッダー: 名前とステータス */}
            <div
                className="px-3 py-1 flex items-center justify-between text-white border-b border-white/20"
                style={{
                    background: `linear-gradient(135deg, ${playerColor}30, ${playerColor}15)`,
                    backgroundColor: '#1a1a2e',
                }}
            >
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 relative">
                    <div className="flex items-center rounded overflow-hidden" style={{ backgroundColor: `${playerColor}25` }}>
                        {player.id.startsWith('npc-') && player.role && (
                            <span
                                className="px-1.5 py-0.5 text-[9px] font-bold border-r border-white/20"
                                style={{ color: playerColor, backgroundColor: `${playerColor}20` }}
                            >
                                {player.role === 'KIRA' ? 'キラ' :
                                    player.role === 'L' ? 'L' :
                                        player.role === 'MISA' ? 'ミサ' :
                                            player.role === 'POLICE' ? '警察' :
                                                player.role === 'WATARI' ? 'ワタリ' :
                                                    player.role === 'MELLO' ? 'メロ' : player.role}
                            </span>
                        )}
                        <span className="px-2 py-0.5 truncate font-bold text-xs relative">
                            {player.name}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {isStartPlayer && (
                        <span className="text-[9px] bg-red-600 font-bold px-1 rounded-sm shadow border border-red-400 text-white leading-tight">
                            START
                        </span>
                    )}
                    {isCurrentTurn && (
                        <span className="text-[10px] animate-pulse" style={{ color: playerColor }}>▶</span>
                    )}
                    {!player.isConnected && (
                        <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                    )}
                </div>
            </div>

            {/* ボディエリア */}
            <div
                className="p-2 flex flex-col gap-1"
                style={{ backgroundColor: `${playerColor}08` }}
            >
                {/* プレイエリア */}
                <div
                    className="h-16 rounded-lg relative flex items-center justify-center overflow-hidden"
                    style={{
                        background: `linear-gradient(135deg, ${playerColor}10, ${playerColor}05)`,
                    }}
                >
                    <span
                        className="text-2xl font-serif select-none"
                        style={{
                            color: `${playerColor}40`,
                            textShadow: `0 0 10px ${playerColor}20`,
                        }}
                    >
                        {player.name.charAt(0)}
                    </span>

                    {!isAlive && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60">
                            <span className="text-red-500 font-bold border border-red-500 px-1.5 py-0.5 transform -rotate-12 text-[10px]">DEAD</span>
                        </div>
                    )}

                    {isCurrentTurn && isAlive && (
                        <div className="absolute top-1 left-1 z-20">
                            <div
                                className="px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white animate-pulse shadow-md"
                                style={{ backgroundColor: playerColor }}
                            >
                                Turn
                            </div>
                        </div>
                    )}
                </div>

                {/* 手札情報 */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex -space-x-1">
                        {player.hand.slice(0, 5).map((card, i) => (
                            <div
                                key={i}
                                className="w-4 h-6 rounded-sm shadow-sm overflow-hidden relative"
                                style={{
                                    transform: `rotate(${(i - Math.min(player.hand.length - 1, 4) / 2) * 5}deg)`,
                                    zIndex: i,
                                }}
                            >
                                {((card.id as unknown as number) !== -1) ? (
                                    <>
                                        <img src={getCardImagePath(card.id)} alt={card.name} className="w-full h-full object-cover" />
                                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-black/80 rounded-full flex items-center justify-center border border-white/20 z-10">
                                            <span className="text-[6px] font-bold text-white leading-none">{card.id}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-dn-bg-secondary to-dn-bg-card border border-white/15" />
                                )}
                            </div>
                        ))}
                    </div>
                    <span className="text-[10px] text-white/50 bg-black/40 px-1 py-0.5 rounded">
                        {player.hand.length}枚
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// ============================
// メインコンポーネント (レイアウト管理用)
// ============================

interface PlayerCircleProps {
    players: Player[];
    currentPlayerId: string;
    selectedPlayerId: string | null;
    myPlayerId: string;
    children?: React.ReactNode;
    onPlayerClick?: (playerId: string) => void;
    isTargetSelecting?: boolean;
    startPlayerId?: string; // Add startPlayerId to props
}

/**
 * 自分を基準にした相対位置を計算
 * 変態は踊ると同じ配置ロジック
 */
function getRelativePosition(index: number, myIndex: number, playerCount: number): 'bottom' | 'left' | 'right' | 'top' {
    const diff = (index - myIndex + playerCount) % playerCount;
    if (diff === 0) return 'bottom'; // 自分
    if (diff === 1) return 'left';   // 次のプレイヤー(左側)
    if (diff === playerCount - 1) return 'right'; // 前のプレイヤー(右側)
    return 'top'; // その他(対面など)
}

export default function PlayerCircle({
    players,
    currentPlayerId,
    selectedPlayerId,
    myPlayerId,
    children,
    onPlayerClick,
    isTargetSelecting,
    startPlayerId,
}: PlayerCircleProps) {
    const myIndex = players.findIndex(p => p.id === myPlayerId);
    const playerCount = players.length;

    // 上部プレイヤー (自分、左、右以外)
    const topPlayers = players
        .map((p, i) => ({ player: p, index: i, position: getRelativePosition(i, myIndex, playerCount) }))
        .filter(item => item.position === 'top')
        .sort((a, b) => {
            const diffA = (a.index - myIndex + playerCount) % playerCount;
            const diffB = (b.index - myIndex + playerCount) % playerCount;
            return diffA - diffB; // 小さい順 (左から右へ表示する)
        });

    // 左プレイヤー
    const leftPlayer = players.find((_, i) => getRelativePosition(i, myIndex, playerCount) === 'left');
    // 右プレイヤー
    const rightPlayer = players.find((_, i) => getRelativePosition(i, myIndex, playerCount) === 'right');

    return (
        <div className="flex flex-col gap-2 w-full">
            {/* 上部: TOPプレイヤー */}
            <div className="flex justify-center gap-3 px-4 overflow-x-auto scrollbar-hide">
                {topPlayers.map(({ player }) => (
                    <div key={player.id} className="w-[160px] md:w-[200px] flex-shrink-0">
                        <PlayerMat
                            player={player}
                            isCurrentTurn={player.id === currentPlayerId}
                            isSelected={player.id === selectedPlayerId}
                            isTargetable={isTargetSelecting && player.isAlive}
                            isStartPlayer={player.id === startPlayerId}
                            onClick={() => onPlayerClick?.(player.id)}
                        />
                    </div>
                ))}
            </div>

            {/* 中央行: 左プレイヤー / (center slot) / 右プレイヤー */}
            <div className="flex items-stretch justify-center gap-2 px-2">
                {/* 左プレイヤー */}
                <div className="w-[140px] md:w-[200px] flex-shrink-0 flex items-center">
                    {leftPlayer && (
                        <PlayerMat
                            player={leftPlayer}
                            isCurrentTurn={leftPlayer.id === currentPlayerId}
                            isSelected={leftPlayer.id === selectedPlayerId}
                            isTargetable={isTargetSelecting && leftPlayer.isAlive}
                            isStartPlayer={leftPlayer.id === startPlayerId}
                            onClick={() => onPlayerClick?.(leftPlayer.id)}
                        />
                    )}
                </div>

                {/* Center slot - CenterArea */}
                <div className="flex-1 min-w-[180px] max-w-md flex items-center justify-center px-2">
                    {children}
                </div>

                {/* 右プレイヤー */}
                <div className="w-[140px] md:w-[200px] flex-shrink-0 flex items-center">
                    {rightPlayer && (
                        <PlayerMat
                            player={rightPlayer}
                            isCurrentTurn={rightPlayer.id === currentPlayerId}
                            isSelected={rightPlayer.id === selectedPlayerId}
                            isTargetable={isTargetSelecting && rightPlayer.isAlive}
                            isStartPlayer={rightPlayer.id === startPlayerId}
                            onClick={() => onPlayerClick?.(rightPlayer.id)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
