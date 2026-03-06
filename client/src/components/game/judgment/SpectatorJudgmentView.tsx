import React from 'react';
import { useAppSelector } from '../../../hooks';
import { selectGamePlayers } from '../../../store/gameSlice';
import { Role } from 'shared/types';
import { KiraMisaChat } from '../KiraMisaChat';

export const SpectatorJudgmentView: React.FC = () => {
    const players = useAppSelector(selectGamePlayers);

    const kira = players.find(p => p.role === Role.KIRA);
    const misa = players.find(p => p.role === Role.MISA);
    // Usually hand is hidden, but spectator might see all if server sends it.
    // Assuming for now we show what we know or placeholders.
    const deathNoteHolder = players.find(p => p.hand?.some(c => c.id === 0));

    // For chat, we simply instantiate it. Use `game.kiraMisaChat` from store to read.
    // `KiraMisaChat` component handles its own display, but assumes we are a participant or just viewing? 
    // It uses `selectMyPlayerId`. We should verify if it works for spectator.
    // Spectator likely just wants to READ. `KiraMisaChat` has input.
    // We'll reuse it but Spectators shouldn't input? `KiraMisaChat` logic needs to check checks role?
    // User sample code reuses it inside a div.

    return (
        <div className="w-full max-w-7xl mx-auto px-4 text-white">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-8 text-center animate-pulse">
                <span className="text-yellow-400 font-bold uppercase tracking-widest">👁 God Mode (Spectator)</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Role Info */}
                <div className="bg-gray-900/80 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Role Info</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                            <span className="text-gray-400">KIRA</span>
                            <span className="text-red-500 font-bold text-lg">{kira?.name ?? '?'}</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                            <span className="text-gray-400">MISA</span>
                            <span className="text-purple-400 font-bold text-lg">{misa?.name ?? '?'}</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                            <span className="text-gray-400">NOTE HOLDER</span>
                            <span className="text-yellow-400 font-bold text-lg">{deathNoteHolder?.name ?? '?'}</span>
                        </div>
                    </div>
                </div>

                {/* Hands (If visible) */}
                <div className="bg-gray-900/80 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Hands</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                        {players.filter(p => p.isAlive).map(player => (
                            <div key={player.id} className="flex flex-col bg-black/30 p-2 rounded">
                                <span className="text-gray-300 font-bold text-sm mb-1">{player.name}</span>
                                <div className="flex gap-1 flex-wrap">
                                    {player.hand && player.hand.length > 0 ? player.hand.map((card, i) => (
                                        <span
                                            key={i}
                                            className="text-[10px] bg-gray-700 px-2 py-1 rounded border border-gray-600 truncate max-w-[100px]"
                                            title={card.name}
                                        >
                                            {card.name}
                                        </span>
                                    )) : (
                                        <span className="text-xs text-gray-600 italic">Hidden</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Log */}
                <div className="bg-gray-900/80 rounded-xl p-6 border border-purple-500/30 flex flex-col h-[300px] lg:h-auto">
                    <h3 className="text-xl font-bold text-purple-400 mb-4 border-b border-purple-500/30 pb-2">
                        Chat Log
                    </h3>
                    <div className="flex-1 overflow-hidden relative flex justify-center items-center">
                        <KiraMisaChat />
                    </div>
                </div>

            </div>
        </div>
    );
};
