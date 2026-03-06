import React, { useState } from 'react';
import { useAppSelector } from '../../../hooks';
import { selectMyPlayerId } from '../../../store/roomSlice';
import { selectGamePlayers } from '../../../store/gameSlice';
import { socketClient } from '../../../socket';
import { Role, CardId } from 'shared/types';
import { KiraMisaChat } from '../KiraMisaChat';

export const KiraJudgmentView: React.FC = () => {
    const players = useAppSelector(selectGamePlayers);
    const myPlayerId = useAppSelector(selectMyPlayerId);
    const myPlayer = players.find(p => p.id === myPlayerId);
    const hasDeathNote = myPlayer?.hand.some(c => c.id === CardId.DEATH_NOTE);

    // KiraMisaChat state is managed in Redux, so no props needed

    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const [isConfirmed, setIsConfirmed] = useState(false);

    // Find Misa
    const misa = players.find(p => p.role === Role.MISA && p.isAlive);

    // Selectable targets (Alive players)
    const selectableTargets = players.filter(p => p.isAlive);

    const handleExecute = () => {
        if (!selectedTarget && hasDeathNote) {
            // UI should prevent this, but just in case
            return;
        }
        setIsConfirmed(true);
        // Emit Judgment Execute (Kill)
        if (selectedTarget) {
            socketClient.judgmentAction(selectedTarget);
        }
    };

    const handleSkip = () => {
        setIsConfirmed(true);
        // Emit Judgment Confirm (Skip/No Note)
        socketClient.judgmentAction('CONFIRM');
    };

    if (isConfirmed) {
        return (
            <div className="text-center animate-pulse">
                <h2 className="text-3xl font-bold text-white mb-4">裁きを実行中...</h2>
                <p className="text-gray-400">結果を待っています</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-4 text-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* Left: Action Panel */}
                <div className="bg-gray-900/80 rounded-xl p-6 border border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                    <div className="mb-6 border-b border-red-500/30 pb-4">
                        <h2 className="text-3xl font-bold text-red-500 mb-2 font-serif">
                            You are KIRA
                        </h2>
                        {misa && (
                            <p className="text-gray-400">
                                協力者（ミサ）: <span className="text-purple-400 font-bold">{misa.name}</span>
                            </p>
                        )}
                    </div>

                    {hasDeathNote ? (
                        <>
                            <p className="text-lg mb-4 font-bold">
                                デスノートに名前を書き込む対象を選択してください
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {selectableTargets.map(player => (
                                    <button
                                        key={player.id}
                                        onClick={() => setSelectedTarget(player.id)}
                                        className={`
                                            p-4 rounded-lg border-2 transition-all relative overflow-hidden group
                                            ${selectedTarget === player.id
                                                ? 'border-red-500 bg-red-900/40 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                                                : 'border-gray-700 bg-black/40 text-gray-400 hover:border-red-500/50 hover:text-white'
                                            }
                                        `}
                                    >
                                        <span className="text-2xl mb-1 block">👤</span>
                                        <span className="font-bold truncate w-full block">{player.name}</span>
                                        {player.id === myPlayerId && (
                                            <span className="text-xs text-gray-500 absolute top-2 right-2">(自分)</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleExecute}
                                disabled={!selectedTarget}
                                className={`
                                    w-full py-4 rounded-lg text-2xl font-bold transition-all
                                    ${selectedTarget
                                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] scale-100'
                                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                    }
                                `}
                            >
                                {selectedTarget
                                    ? '裁きを下す'
                                    : 'ターゲットを選択'
                                }
                            </button>
                            <button
                                onClick={handleSkip}
                                className="w-full mt-4 py-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xl font-bold border border-gray-600 hover:border-white transition-all"
                            >
                                スキップ
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="text-center py-10">
                                <div className="text-6xl mb-4 opacity-50">📖</div>
                                <p className="text-xl text-gray-300 mb-2">
                                    現在、デスノートを所持していません
                                </p>
                                <p className="text-sm text-gray-500 mb-8">
                                    今回の裁きは実行できません
                                </p>

                                <button
                                    onClick={handleSkip}
                                    className="w-full py-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xl font-bold border border-gray-600 hover:border-white transition-all"
                                >
                                    スキップ
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Right: Chat Panel */}
                <div className="bg-gray-900/80 rounded-xl p-6 border border-purple-500/30 h-full min-h-[500px] flex flex-col">
                    <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                        <span>🔒</span> ミサとの秘密チャット
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
