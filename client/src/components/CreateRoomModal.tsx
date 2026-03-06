import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppSelector } from '../hooks';
import { selectRoomCode, selectIsHost } from '../store/roomSlice';
import { selectIsLoading, selectError } from '../store/uiSlice';
import { socketClient } from '../socket';

interface CreateRoomModalProps {
    onClose: () => void;
}

export default function CreateRoomModal({ onClose }: CreateRoomModalProps) {
    const navigate = useNavigate();
    const [playerName, setPlayerName] = useState('');
    const [isDebug, setIsDebug] = useState(false);
    const [validationError, setValidationError] = useState('');

    const roomCode = useAppSelector(selectRoomCode);
    const isHost = useAppSelector(selectIsHost);
    const isLoading = useAppSelector(selectIsLoading);
    const error = useAppSelector(selectError);

    // Navigate to room when created
    useEffect(() => {
        if (roomCode && isHost) {
            navigate(`/room/${roomCode}`);
        }
    }, [roomCode, isHost, navigate]);

    const validateName = (name: string): boolean => {
        if (!name || name.trim() === '') {
            setValidationError('名前を入力してください');
            return false;
        }
        if (name.length > 10) {
            setValidationError('名前は10文字以内にしてください');
            return false;
        }
        setValidationError('');
        return true;
    };

    const handleCreate = () => {
        if (!validateName(playerName)) return;
        // 最大人数を8に固定し、メロ使用はデフォルトfalse（後でロビーで調整可能へ）
        socketClient.createRoom(playerName.trim(), 8, false, isDebug);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="card-container w-full max-w-md"
            >
                <h2 className="text-2xl font-bold text-center mb-6">部屋を作成</h2>

                {/* Player Name */}
                <div className="mb-4">
                    <label className="block text-dn-text-secondary text-sm mb-2">
                        プレイヤー名 <span className="text-dn-accent">*</span>
                    </label>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="あなたの名前"
                        maxLength={10}
                        className="input-field w-full"
                        disabled={isLoading}
                    />
                </div>

                {/* Debug Mode Option */}
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6"
                >
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <input
                            type="checkbox"
                            checked={isDebug}
                            onChange={(e) => setIsDebug(e.target.checked)}
                            className="w-5 h-5 accent-yellow-500"
                            disabled={isLoading}
                        />
                        <div>
                            <span className="font-medium text-yellow-500">🛠 デバックモード</span>
                            <p className="text-gray-400 text-sm">NPC追加 • ログ表示機能を有効化</p>
                        </div>
                    </label>
                </motion.div>

                {/* Error Messages */}
                {(validationError || error) && (
                    <div className="text-red-400 text-sm text-center mb-4">
                        {validationError || error}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="btn-secondary flex-1"
                        disabled={isLoading}
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleCreate}
                        className="btn-primary flex-1"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                作成中...
                            </span>
                        ) : (
                            '作成'
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
