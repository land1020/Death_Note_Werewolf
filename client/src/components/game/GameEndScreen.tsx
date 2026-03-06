import { motion } from 'framer-motion';
import type { Player, WinCondition, Role } from 'shared/types';

interface GameEndScreenProps {
    winner: WinCondition;
    players: Player[];
    onRematch: () => void;
}

export default function GameEndScreen({
    winner,
    players,
    onRematch
}: GameEndScreenProps) {
    const winnerTeam = getWinnerTeam(winner);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4 overflow-y-auto"
        >
            {/* 勝利演出 */}
            {winner === 'KIRA_WINS' && <KiraWinAnimation />}
            {winner === 'L_WINS' && <LWinAnimation />}
            {winner === 'MELLO_WINS' && <MelloWinAnimation />}

            {/* 勝利チーム */}
            <motion.h1
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className={`text-4xl font-bold mb-8 ${getWinnerColor(winner)}`}
            >
                {winnerTeam}の勝利！
            </motion.h1>

            {/* 役職公開 */}
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="bg-dn-bg-card/80 rounded-xl p-6 mb-8 w-full max-w-md"
            >
                <h2 className="text-lg font-medium text-center mb-4 text-dn-text-secondary">
                    役職公開
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {players.map((player) => (
                        <div
                            key={player.id}
                            className={`
                flex justify-between items-center p-2 rounded-lg
                ${!player.isAlive ? 'opacity-50 bg-gray-800' : 'bg-dn-bg-secondary'}
              `}
                        >
                            <span className={!player.isAlive ? 'line-through' : ''}>
                                {player.name}
                            </span>
                            <span className={`font-bold ${getRoleColor(player.role)}`}>
                                {getRoleName(player.role)}
                            </span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* もう一度プレイボタン */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                onClick={onRematch}
                className="btn-primary px-8 py-4 text-lg"
            >
                🔄 もう一度プレイ
            </motion.button>
        </motion.div>
    );
}

// キラ勝利演出
function KiraWinAnimation() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
        >
            {/* デスノート風ASCII */}
            <pre className="text-red-500 text-xs sm:text-sm font-mono text-center leading-tight">
                {`
██╗  ██╗██╗██████╗  █████╗ 
██║ ██╔╝██║██╔══██╗██╔══██╗
█████╔╝ ██║██████╔╝███████║
██╔═██╗ ██║██╔══██╗██╔══██║
██║  ██╗██║██║  ██║██║  ██║
╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
`}
            </pre>
            <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl text-center"
            >
                📓
            </motion.div>
        </motion.div>
    );
}

// L勝利演出
function LWinAnimation() {
    return (
        <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
        >
            <pre className="text-blue-400 text-xs sm:text-sm font-mono text-center leading-tight">
                {`
     ██╗     
     ██║     
     ██║     
     ██║     
     ███████╗
     ╚══════╝
`}
            </pre>
            <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-2xl text-center text-blue-300"
            >
                ⚖️ 正義は勝つ ⚖️
            </motion.p>
        </motion.div>
    );
}

// メロ勝利演出
function MelloWinAnimation() {
    return (
        <motion.div
            initial={{ opacity: 0, rotate: -10 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
        >
            <pre className="text-yellow-400 text-xs sm:text-sm font-mono text-center leading-tight">
                {`
███╗   ███╗███████╗██╗     ██╗      ██████╗ 
████╗ ████║██╔════╝██║     ██║     ██╔═══██╗
██╔████╔██║█████╗  ██║     ██║     ██║   ██║
██║╚██╔╝██║██╔══╝  ██║     ██║     ██║   ██║
██║ ╚═╝ ██║███████╗███████╗███████╗╚██████╔╝
╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝ ╚═════╝ 
`}
            </pre>
            <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-4xl text-center"
            >
                🍫💥
            </motion.div>
        </motion.div>
    );
}

function getWinnerTeam(winner: WinCondition): string {
    switch (winner) {
        case 'KIRA_WINS': return 'キラ陣営';
        case 'L_WINS': return 'L陣営';
        case 'MELLO_WINS': return 'メロ';
        default: return '?';
    }
}

function getWinnerColor(winner: WinCondition): string {
    switch (winner) {
        case 'KIRA_WINS': return 'text-red-500';
        case 'L_WINS': return 'text-blue-400';
        case 'MELLO_WINS': return 'text-yellow-400';
        default: return 'text-white';
    }
}

function getRoleName(role: Role | null): string {
    if (!role) return '?';
    const names: Record<string, string> = {
        KIRA: 'キラ',
        MISA: 'ミサ',
        L: 'L',
        POLICE: '警察',
        WATARI: 'ワタリ',
        MELLO: 'メロ',
    };
    return names[role] || role;
}

function getRoleColor(role: Role | null): string {
    if (!role) return 'text-gray-400';
    const colors: Record<string, string> = {
        KIRA: 'text-red-400',
        MISA: 'text-pink-400',
        L: 'text-blue-400',
        POLICE: 'text-blue-300',
        WATARI: 'text-cyan-400',
        MELLO: 'text-yellow-400',
    };
    return colors[role] || 'text-gray-400';
}
