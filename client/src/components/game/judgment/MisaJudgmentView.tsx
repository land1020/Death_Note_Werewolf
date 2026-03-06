import React, { useState } from 'react';
import { useAppSelector } from '../../../hooks';
import { selectGamePlayers } from '../../../store/gameSlice';
import { Role } from 'shared/types';
import { KiraMisaChat } from '../KiraMisaChat';
import { socketClient } from '../../../socket';

export const MisaJudgmentView: React.FC = () => {
    const players = useAppSelector(selectGamePlayers);
    const [isConfirmed, setIsConfirmed] = useState(false);

    const handleSkip = () => {
        setIsConfirmed(true);
        socketClient.judgmentAction('CONFIRM');
    };

    // Find Kira
    const kira = players.find(p => p.role === Role.KIRA && p.isAlive);

    // Find Death Note Holder (Card ID 0)
    // Note: 'hand' might typically be hidden for others, but Misa/Eyes sees logic needs to serve this data
    // Usually client doesn't have other players' hands. 
    // The server needs to send this specific info or we rely on public info if revealed.
    // However, for Misa, the requirement often implies she knows via game logic or "Eyes".
    // Assuming 'publicInfo' or specific event sends this, OR for now iterate if available (likely not).
    // *Correction*: In this game logic, getting "Death Note Holder" might be a specific Misa perk.
    // Use what we have. If hand is hidden, we might show "Unknown" or depend on server 'phase:changed' data.
    // The user requirement sample shows "Death Note Holder" display. 
    // Let's assume the 'GamePage' or 'Server' sent this info in 'effect' or 'phase data'.
    // For now, I will use a selector or prop if I can, OR just safe navigation.
    // **Self-Correction**: The previous 'startJudgmentPhase' server planning included sending `hasDeathNote` flag.
    // But Misa wants to know WHO has it.
    // Client-side `players` array usually masks hands.
    // I'll implement 'deathNoteHolder' logic as best effort, possibly 'Unknown' if not synced.
    // But checking the `SpectatorJudgmentView` sample, it filters players. 
    // Real implementation: `players` only has MY hand. 
    // So Misa needs this info from `publicInfo` or a specific socket event.
    // I will use a placeholder 'Unknown' if not found, to be fixed in server logic step.

    const deathNoteHolder = players.find(p => p.hand.some(c => c.id === 0)); // Only works if hand is visible (Cheating/Spectator) or synced.

    // Actually, Misa might not see who has it unless she has eyes or it's revealed. 
    // The user sample code implies she sees it. "Death Note Holder ... Unknown".
    // I'll stick to 'Unknown' mostly unless it's me or revealed.

    return (
        <div className="w-full max-w-6xl mx-auto px-4 text-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* Left: Info Panel */}
                <div className="bg-gray-900/80 rounded-xl p-6 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                    <h2 className="text-3xl font-bold text-purple-400 mb-6 font-serif">
                        You are MISA
                    </h2>

                    <div className="space-y-6">
                        {/* Kira Info */}
                        <div className="p-6 rounded-lg bg-red-900/20 border border-red-500/30">
                            <p className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Kira's Identity</p>
                            <p className="text-3xl font-bold text-red-500">
                                {kira ? kira.name : 'Unknown / Dead'}
                            </p>
                        </div>

                        {/* Death Note Holder Info - Note: This requires server support to be accurate for others */}
                        <div className="p-6 rounded-lg bg-yellow-900/20 border border-yellow-500/30">
                            <p className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Death Note Holder</p>
                            <p className="text-3xl font-bold text-yellow-500">
                                {deathNoteHolder ? deathNoteHolder.name : 'Unknown (Hidden)'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 text-center bg-black/40 p-4 rounded-lg">
                        <p className="text-gray-400 animate-pulse mb-4">
                            Waiting for Kira's judgment...
                        </p>

                        {!isConfirmed ? (
                            <button
                                onClick={handleSkip}
                                className="w-full py-4 text-xl font-bold border-2 border-gray-600 rounded-xl transition-all bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
                            >
                                スキップ
                            </button>
                        ) : (
                            <div className="text-xl font-bold text-yellow-400 animate-pulse py-2">
                                他のプレイヤーを待機中...
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Chat Panel */}
                <div className="bg-gray-900/80 rounded-xl p-6 border border-purple-500/30 h-full min-h-[500px] flex flex-col">
                    <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                        <span>🔒</span> Secret Chat with Kira
                    </h3>
                    <div className="flex-1 bg-black/30 rounded-lg p-2 overflow-hidden relative">
                        <div className="absolute inset-0">
                            <KiraMisaChat />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
