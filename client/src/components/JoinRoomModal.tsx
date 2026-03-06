import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppSelector } from '../hooks';
import { selectRoomCode, selectMyPlayerId } from '../store/roomSlice';
import { selectIsLoading, selectError } from '../store/uiSlice';
import { socketClient } from '../socket';

interface JoinRoomModalProps {
    onClose: () => void;
}

export default function JoinRoomModal({ onClose }: JoinRoomModalProps) {
    const navigate = useNavigate();
    const [roomCode, setRoomCode] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [validationError, setValidationError] = useState('');

    const currentRoomCode = useAppSelector(selectRoomCode);
    const myPlayerId = useAppSelector(selectMyPlayerId);
    const isLoading = useAppSelector(selectIsLoading);
    const error = useAppSelector(selectError);

    // Navigate to room when joined
    useEffect(() => {
        if (currentRoomCode && myPlayerId) {
            navigate(`/room/${currentRoomCode}`);
        }
    }, [currentRoomCode, myPlayerId, navigate]);

    const validateInputs = (): boolean => {
        if (!roomCode || roomCode.trim() === '') {
            setValidationError('部屋コードを入力してください');
            return false;
        }
        if (roomCode.length !== 4) {
            setValidationError('部屋コードは4桁です');
            return false;
        }
        if (!playerName || playerName.trim() === '') {
            setValidationError('名前を入力してください');
            return false;
        }
        if (playerName.length > 10) {
            setValidationError('名前は10文字以内にしてください');
            return false;
        }
        setValidationError('');
        return true;
    };

    const handleJoin = () => {
        if (!validateInputs()) return;
        socketClient.joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
        setRoomCode(value);
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
                <h2 className="text-2xl font-bold text-center mb-6">部屋に参加</h2>

                {/* Room Code */}
                <div className="mb-4">
                    <label className="block text-dn-text-secondary text-sm mb-2">
                        部屋コード <span className="text-dn-accent">*</span>
                    </label>
                    <input
                        type="text"
                        value={roomCode}
                        onChange={handleRoomCodeChange}
                        placeholder="4桁のコード"
                        maxLength={4}
                        className="input-field w-full text-center text-2xl tracking-widest"
                        disabled={isLoading}
                    />
                </div>

                {/* Player Name */}
                <div className="mb-6">
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
                        onClick={handleJoin}
                        className="btn-primary flex-1"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                参加中...
                            </span>
                        ) : (
                            '参加'
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
