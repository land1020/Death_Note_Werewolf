import { motion } from 'framer-motion';
import type { Player, Card, ChatMessage, GamePhase, Role } from 'shared/types';

interface SpectatorModeProps {
    players: Player[];
    currentPlayerId: string;
    phase: GamePhase | string;
    kiraMisaChat: ChatMessage[];
}

export default function SpectatorMode({
    players,
    currentPlayerId,
    phase,
    kiraMisaChat
}: SpectatorModeProps) {
    const currentPlayer = players.find(p => p.id === currentPlayerId);

    // デスノート所持者を特定
    const deathNoteHolder = players.find(p =>
        p.hand.some(c => c.id === 0) // DEATH_NOTE
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4"
        >
            {/* ヘッダー */}
            <div className="bg-dn-bg-card/80 rounded-xl p-4 mb-4 text-center">
                <h1 className="text-xl font-bold text-dn-accent mb-1">👁️ 観戦モード</h1>
                <p className="text-dn-text-secondary text-sm">あなたは脱落しました</p>
            </div>

            {/* 現在のフェーズ・手番 */}
            <div className="bg-dn-bg-card/60 rounded-xl p-3 mb-4 text-center">
                <p className="text-sm">
                    <span className="text-dn-text-secondary">現在:</span>
                    <span className="text-white ml-2 font-medium">{getPhaseName(phase)}</span>
                    {currentPlayer && (
                        <>
                            <span className="text-dn-text-secondary ml-4">手番:</span>
                            <span className="text-dn-accent ml-2 font-medium">{currentPlayer.name}</span>
                        </>
                    )}
                </p>
            </div>

            {/* プレイヤー一覧 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {players.map((player) => (
                    <PlayerCard
                        key={player.id}
                        player={player}
                        isDeathNoteHolder={player.id === deathNoteHolder?.id}
                        isCurrentTurn={player.id === currentPlayerId}
                    />
                ))}
            </div>

            {/* キラ・ミサチャット */}
            <div className="bg-dn-bg-card/60 rounded-xl p-4">
                <h3 className="text-sm font-medium text-dn-text-secondary mb-2">
                    💬 キラ・ミサチャット
                </h3>
                <div className="max-h-[150px] overflow-y-auto space-y-1">
                    {kiraMisaChat.length === 0 ? (
                        <p className="text-dn-text-muted text-sm">待機中...</p>
                    ) : (
                        kiraMisaChat.map((msg, i) => (
                            <div key={i} className="text-sm">
                                <span className="text-dn-accent">{msg.playerName}:</span>
                                <span className="ml-2">{msg.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// プレイヤーカード
function PlayerCard({
    player,
    isDeathNoteHolder,
    isCurrentTurn
}: {
    player: Player;
    isDeathNoteHolder: boolean;
    isCurrentTurn: boolean;
}) {
    return (
        <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`
        bg-dn-bg-card rounded-xl p-3 border-2 transition-all
        ${!player.isAlive ? 'opacity-50 border-gray-700' : ''}
        ${isDeathNoteHolder ? 'border-red-500/50 shadow-lg shadow-red-500/20' : 'border-transparent'}
        ${isCurrentTurn ? 'ring-2 ring-dn-accent' : ''}
      `}
        >
            {/* 名前・役職 */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className={`font-medium ${!player.isAlive ? 'line-through' : ''}`}>
                        {player.name}
                    </p>
                    <p className={`text-sm font-bold ${getRoleColor(player.role)}`}>
                        {getRoleName(player.role)}
                    </p>
                </div>
                {isDeathNoteHolder && (
                    <span className="text-xl" title="デスノート所持">📓</span>
                )}
                {!player.isAlive && (
                    <span className="text-xl">💀</span>
                )}
            </div>

            {/* 手札 */}
            {player.isAlive && player.hand.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {player.hand.map((card) => (
                        <span
                            key={card.instanceId}
                            className={`
                text-xs px-2 py-1 rounded
                ${card.id === 0 ? 'bg-red-500/30 text-red-300' : 'bg-gray-700 text-gray-300'}
              `}
                        >
                            {getCardName(card)}
                        </span>
                    ))}
                </div>
            )}
        </motion.div>
    );
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

function getCardName(card: Card): string {
    const names: Record<number, string> = {
        0: 'デスノート',
        1: '逮捕',
        2: '拳銃',
        3: '偽名',
        4: 'アリバイ',
        5: '目撃',
        6: '監視',
        7: '投票',
        8: '交換',
        9: '取調',
        13: '死神',
    };
    return names[card.id] || `Card${card.id}`;
}

function getPhaseName(phase: GamePhase | string): string {
    const names: Record<string, string> = {
        LOBBY: 'ロビー',
        SETUP: 'セットアップ',
        WATARI_CONFIRM: 'ワタリ確認',
        INVESTIGATION: '捜査の時間',
        CARD_DRAW: 'カードを引く',
        CARD_ACTION: 'カードアクション',
        CARD_EFFECT: 'カード効果',
        JUDGMENT: '裁きの時間',
        JUDGMENT_RESULT: '裁き結果',
        GAME_END: 'ゲーム終了',
    };
    return names[phase] || phase;
}
