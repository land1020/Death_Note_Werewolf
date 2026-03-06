import React, { useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks';
import { selectMyPlayerId } from '../../store/roomSlice';
import { selectGamePlayers } from '../../store/gameSlice';
import { selectDraftKiraMisaMessage, setDraftKiraMisaMessage } from '../../store/uiSlice';
import { socketClient } from '../../socket';
import { Role } from 'shared/types';

export const KiraMisaChat: React.FC = () => {
    // dispatch removed
    // gameState removed
    const myPlayerId = useAppSelector(selectMyPlayerId);
    const players = useAppSelector(selectGamePlayers);
    const chatMessages = useAppSelector(state => state.game.kiraMisaChat);
    const message = useAppSelector(selectDraftKiraMisaMessage);
    const dispatch = useAppDispatch();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const myPlayer = players.find(p => p.id === myPlayerId);
    const isKiraOrMisa = myPlayer?.role === Role.KIRA || myPlayer?.role === Role.MISA;
    const isSpectator = myPlayer?.isSpectator || myPlayer?.isAlive === false;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    if (!isKiraOrMisa && !isSpectator) return null;

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        socketClient.sendKiraMisaChat(message);
        dispatch(setDraftKiraMisaMessage(''));
    };

    return (
        <div className="bg-black/80 border border-red-900/50 rounded-lg p-3 flex flex-col h-64 w-full max-w-sm pointer-events-auto">
            <div className="text-red-500 font-bold text-xs mb-2 flex items-center gap-2">
                <span className="text-lg">👿</span>
                KIRA & MISA SECRET CHAT {isSpectator && !isKiraOrMisa && '(Spectator)'}
            </div>

            <div className="flex-1 overflow-y-auto mb-2 space-y-2 pr-2 scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-transparent">
                {chatMessages.map((msg, idx) => {
                    const isMe = msg.playerId === myPlayerId;
                    return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`text-[10px] ${isMe ? 'text-red-400' : 'text-gray-400'} mb-0.5`}>
                                {msg.playerName}
                            </div>
                            <div className={`px-2 py-1.5 rounded-lg text-sm max-w-[90%] break-words ${isMe
                                ? 'bg-red-900/40 text-red-100 border border-red-800/50'
                                : 'bg-gray-800/40 text-gray-200 border border-gray-700/50'
                                }`}>
                                {msg.message}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {isKiraOrMisa && (
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => dispatch(setDraftKiraMisaMessage(e.target.value))}
                        placeholder="密談..."
                        className="flex-1 bg-black/50 border border-red-900/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                    />
                    <button
                        type="submit"
                        className="bg-red-900/50 hover:bg-red-800 text-red-100 px-3 py-1 rounded text-sm transition-colors"
                    >
                        送信
                    </button>
                </form>
            )}
        </div>
    );
}
