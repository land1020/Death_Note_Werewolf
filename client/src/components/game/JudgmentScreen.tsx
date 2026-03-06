import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Player, ChatMessage, Role } from 'shared/types';
import { useAppSelector, useAppDispatch } from '../../hooks';
import { selectMyPlayerId } from '../../store/roomSlice';
import { selectGamePlayers } from '../../store/gameSlice';
import { selectDraftKiraMisaMessage, setDraftKiraMisaMessage } from '../../store/uiSlice';
import { socketClient } from '../../socket';

interface JudgmentScreenProps {
    kiraHasDeathNote: boolean;
    misaName: string | null;
    kiraMisaChat: ChatMessage[];
    myRole: Role | undefined;
    isSpectator: boolean;
    onConfirm: (targetId: string | null) => void;
}

export default function JudgmentScreen({
    kiraHasDeathNote,
    misaName,
    kiraMisaChat,
    myRole,
    isSpectator,
    onConfirm
}: JudgmentScreenProps) {
    const [timeLeft, setTimeLeft] = useState(13);
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

    const chatInput = useAppSelector(selectDraftKiraMisaMessage);
    const dispatch = useAppDispatch();

    const players = useAppSelector(selectGamePlayers);
    const myPlayerId = useAppSelector(selectMyPlayerId);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const alivePlayers = players.filter(p => p.isAlive);
    const isKiraOrMisa = myRole === 'KIRA' || myRole === 'MISA';
    const isKira = myRole === 'KIRA';

    // タイマー（目安のみ、強制終了なし）
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // チャットスクロール
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [kiraMisaChat]);

    const handleSendChat = () => {
        if (chatInput.trim() && isKiraOrMisa) {
            socketClient.sendKiraMisaChat(chatInput.trim());
            dispatch(setDraftKiraMisaMessage(''));
        }
    };

    const handleConfirm = () => {
        if (isKira) {
            onConfirm(selectedTarget);
        } else {
            onConfirm(null);
        }
    };

    // 観戦者画面
    if (isSpectator) {
        return (
            <SpectatorView
                players={players}
                kiraMisaChat={kiraMisaChat}
                timeLeft={timeLeft}
                selectedTarget={selectedTarget}
            />
        );
    }

    // キラ・ミサ以外の画面
    if (!isKiraOrMisa) {
        return (
            <WaitingView timeLeft={timeLeft} />
        );
    }

    // キラ・ミサ画面
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black z-50 flex flex-col p-4"
        >
            {/* ヘッダー */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-4"
            >
                <h1 className="text-3xl font-bold text-dn-accent mb-2">裁きの時間</h1>
                <p className="text-dn-text-secondary">
                    あなたは【<span className="text-dn-accent">{isKira ? 'キラ' : 'ミサ'}</span>】です
                </p>
                {isKira && misaName && (
                    <p className="text-dn-text-muted text-sm">ミサは「{misaName}」です</p>
                )}
                {!isKira && (
                    <p className="text-dn-text-muted text-sm">キラと相談してください</p>
                )}
            </motion.div>

            {/* タイマー */}
            <div className="flex justify-center mb-4">
                <div className={`
          w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
          ${timeLeft <= 3 ? 'bg-red-500/30 text-red-400 animate-pulse' : 'bg-dn-bg-secondary text-white'}
        `}>
                    {timeLeft}
                </div>
            </div>

            {/* チャットエリア */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex-1 flex flex-col bg-dn-bg-card rounded-xl p-4 mb-4 max-h-[200px]"
            >
                <h3 className="text-sm font-medium text-dn-text-secondary mb-2">専用チャット</h3>
                <div className="flex-1 overflow-y-auto space-y-2 mb-2">
                    {kiraMisaChat.map((msg, i) => (
                        <div key={i} className={`text-sm ${msg.playerId === myPlayerId ? 'text-right' : ''}`}>
                            <span className="text-dn-accent">{msg.playerName}:</span>
                            <span className="ml-2">{msg.message}</span>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => dispatch(setDraftKiraMisaMessage(e.target.value))}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                        placeholder="メッセージを入力..."
                        className="input-primary flex-1 text-sm py-2"
                    />
                    <button onClick={handleSendChat} className="btn-primary px-4 py-2 text-sm">
                        送信
                    </button>
                </div>
            </motion.div>

            {/* ターゲット選択（キラのみ、デスノート所持時） */}
            {isKira && kiraHasDeathNote && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-4"
                >
                    <h3 className="text-lg font-medium mb-3 text-center">ターゲットを選択</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {alivePlayers.map((player) => (
                            <button
                                key={player.id}
                                onClick={() => setSelectedTarget(player.id)}
                                className={`
                  p-3 rounded-lg transition-all text-left
                  ${selectedTarget === player.id
                                        ? 'bg-red-500/30 border-2 border-red-500'
                                        : 'bg-dn-bg-secondary border border-dn-text-muted/30 hover:border-red-500/50'
                                    }
                `}
                            >
                                <div className="font-medium">{player.name}</div>
                                {player.id === myPlayerId && (
                                    <div className="text-xs text-dn-text-muted">（自分）</div>
                                )}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* 確認ボタン */}
            {isKira && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                >
                    {kiraHasDeathNote ? (
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedTarget}
                            className={`btn-primary w-full py-4 text-lg ${!selectedTarget ? 'opacity-50' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {selectedTarget ? '裁きを下す' : 'ターゲットを選んでください'}
                        </button>
                    ) : (
                        <div className="text-center">
                            <p className="text-dn-text-muted mb-4">デスノートを持っていません</p>
                            <button onClick={handleConfirm} className="btn-secondary w-full py-4">
                                確認（スキップ）
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}

// 待機画面（キラ・ミサ以外）
function WaitingView({ timeLeft }: { timeLeft: number }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4"
        >
            <motion.h1
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-bold text-dn-accent mb-8"
            >
                裁きの時間
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xl text-dn-text-secondary mb-8"
            >
                キラが裁きを下しています...
            </motion.p>

            {/* 演出アニメーション */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="text-8xl mb-8"
            >
                📓
            </motion.div>

            <div className={`
        w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
        ${timeLeft <= 3 ? 'bg-red-500/30 text-red-400' : 'bg-dn-bg-secondary text-white'}
      `}>
                {timeLeft}
            </div>
        </motion.div>
    );
}

// 観戦者画面
function SpectatorView({
    players,
    kiraMisaChat,
    timeLeft,
    selectedTarget
}: {
    players: Player[];
    kiraMisaChat: ChatMessage[];
    timeLeft: number;
    selectedTarget: string | null;
}) {
    // プレイヤー情報は表示のみで使用

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col p-4 overflow-y-auto"
        >
            <h1 className="text-3xl font-bold text-dn-accent text-center mb-4">
                裁きの時間（観戦中）
            </h1>

            <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-dn-bg-secondary flex items-center justify-center text-xl font-bold">
                    {timeLeft}
                </div>
            </div>

            {/* 役職一覧 */}
            <div className="bg-dn-bg-card rounded-xl p-4 mb-4">
                <h3 className="text-sm font-medium text-dn-text-secondary mb-2">役職一覧</h3>
                <div className="grid grid-cols-2 gap-2">
                    {players.map(p => (
                        <div key={p.id} className={`text-sm ${!p.isAlive ? 'opacity-50 line-through' : ''}`}>
                            <span>{p.name}</span>
                            <span className="text-dn-accent ml-2">{getRoleName(p.role ?? undefined)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* キラ・ミサチャット */}
            <div className="bg-dn-bg-card rounded-xl p-4 mb-4 flex-1 max-h-[200px] overflow-y-auto">
                <h3 className="text-sm font-medium text-dn-text-secondary mb-2">キラ・ミサチャット</h3>
                <div className="space-y-1">
                    {kiraMisaChat.length === 0 ? (
                        <p className="text-dn-text-muted text-sm">メッセージなし</p>
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

            {/* キラの選択 */}
            <div className="bg-dn-bg-card rounded-xl p-4">
                <h3 className="text-sm font-medium text-dn-text-secondary mb-2">キラの選択</h3>
                {selectedTarget ? (
                    <p className="text-red-400">
                        ターゲット: {players.find(p => p.id === selectedTarget)?.name}
                    </p>
                ) : (
                    <p className="text-dn-text-muted">未選択</p>
                )}
            </div>
        </motion.div>
    );
}

function getRoleName(role: Role | undefined): string {
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
