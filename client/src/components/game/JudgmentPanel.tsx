import { useState, useEffect } from 'react';
import { useAppSelector } from '../../hooks';
import { selectMyPlayerId } from '../../store/roomSlice';
import { selectGamePlayers } from '../../store/gameSlice';
import { socketClient } from '../../socket';
import { Role, CardId, GamePhase } from 'shared/types';
import { KiraMisaChat } from './KiraMisaChat';

export default function JudgmentPanel() {
    const myPlayerId = useAppSelector(selectMyPlayerId);
    const players = useAppSelector(selectGamePlayers);
    // judgmentResult removed
    const phase = useAppSelector(state => state.game.phase);

    // Timer State (Client-side sync with server roughly)
    const [timeLeft, setTimeLeft] = useState(13);

    const myPlayer = players.find(p => p.id === myPlayerId);
    const isKira = myPlayer?.role === Role.KIRA;
    const hasDeathNote = myPlayer?.hand.some(c => c.id === CardId.DEATH_NOTE);
    const canKill = isKira && hasDeathNote;

    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const [isConfirmed, setIsConfirmed] = useState(false);

    useEffect(() => {
        if (phase === GamePhase.JUDGMENT) {
            setTimeLeft(13);
            setIsConfirmed(false);
            setSelectedTarget(null);

            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [phase]);

    const handleConfirm = () => {
        setIsConfirmed(true);
        if (canKill) {
            // Kira with Death Note trying to confirm without selecting? 
            // The UI should probably disable confirm until target selected if they MUST kill
            // Or "Confirm" means "Skip" if nothing selected?
            // User requirement: "Kira with Death Note MUST kill someone" (implied by "Kill someone")
            // Let's assume Confirm acts as "Submit Action".

            if (selectedTarget) {
                socketClient.judgmentAction(selectedTarget);
            } else {
                // If no target selected, maybe Random or Skip? 
                // Rule says "Please kill someone". So we should enforce selection.
                // But if time runs out? 
                // For button, we enforce selection.
                return;
            }
        } else {
            // L Team or Kira w/o Note
            socketClient.judgmentAction('CONFIRM'); // Special ID for confirm
        }
    };

    if (phase !== GamePhase.JUDGMENT) return null;

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col text-white font-sans">
            {/* Header Area */}
            <div className="flex justify-between items-start p-4">
                {/* Identity Box */}
                <div className="border-4 border-white p-4 w-48 text-center bg-black">
                    <h2 className="text-xl font-bold mb-2">あなたの正体</h2>
                    <div className="text-3xl font-bold">{myPlayer?.name}</div>
                    <div className="text-sm mt-1 text-gray-400">({myPlayer?.role})</div>
                </div>

                {/* Instructions */}
                <div className="border-4 border-white p-4 flex-1 mx-4 text-center bg-white text-black">
                    <div className="mb-2 text-2xl font-bold flex justify-center items-center gap-2">
                        <span>⚖️</span> 裁きの時間 <span>⚖️</span>
                    </div>
                    <div className="text-lg font-bold">
                        {canKill ? (
                            <span className="text-red-600">
                                キラがデスノートを所持している場合<br />
                                ターゲットを選択して「殺害を実行する」か、「スキップ」して下さい
                            </span>
                        ) : (
                            <span>L 陣営はスキップボタンを押して待機時間を短縮できます</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 p-4 gap-4 overflow-hidden">
                {/* Timer Sidebar */}
                <div className="border-4 border-white p-4 w-48 flex flex-col items-center justify-center bg-white text-black">
                    <div className="text-6xl font-bold mb-2">{timeLeft}</div>
                    <div className="text-xl font-bold text-center">秒のカウント<br />ダウンタイマー</div>
                </div>

                {/* Main Content Area (Image / Target Selection) */}
                <div className="flex-1 border-4 border-white relative flex flex-col">
                    {/* Placeholder for Image Embed */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <span className="text-4xl text-gray-500">画像埋め込み</span>
                    </div>

                    {/* Target Selection Grid (For Kira) */}
                    {canKill && (
                        <div className="z-10 bg-black/50 p-4 w-full h-full overflow-y-auto">
                            <h3 className="text-center text-red-500 font-bold mb-4 text-2xl">ターゲットを選択</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {players.filter(p => p.id !== myPlayerId && p.isAlive).map(player => (
                                    <button
                                        key={player.id}
                                        onClick={() => setSelectedTarget(player.id)}
                                        className={`p-4 border-2 rounded-lg text-xl font-bold transition-all ${selectedTarget === player.id
                                            ? 'bg-red-600 border-red-400 text-white scale-105'
                                            : 'bg-black/80 border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-500'
                                            }`}
                                    >
                                        <div className="text-4xl mb-2">👤</div>
                                        {player.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Kira/Misa Chat Overlay */}
                    {(isKira || myPlayer?.role === Role.MISA) && (
                        <div className="absolute bottom-4 right-4 z-20 w-80">
                            <KiraMisaChat />
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action Area */}
            <div className="p-8 flex justify-center gap-8 border-t-4 border-white bg-black">
                {isConfirmed ? (
                    <div className="text-2xl font-bold text-yellow-400 animate-pulse">
                        他のプレイヤーを待機中...
                    </div>
                ) : (
                    <>
                        {/* 誰でも押せるスキップボタン */}
                        <button
                            onClick={() => {
                                setIsConfirmed(true);
                                socketClient.judgmentAction('CONFIRM'); // ここではサーバー側で「CONFIRM」が何も殺さない判定になる
                            }}
                            className="py-6 px-12 text-2xl font-bold border-4 border-gray-500 rounded-xl transition-all bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
                        >
                            スキップ
                        </button>

                        {/* キラでデスノートを持っている場合のみ殺害ボタン */}
                        {canKill && (
                            <button
                                onClick={handleConfirm} // 既存のhandleConfirmはselectedTargetを対象にしてアクションを送る
                                disabled={!selectedTarget}
                                className={`
                                    py-6 px-12 text-3xl font-bold border-4 border-red-500 rounded-xl transition-all
                                    bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]
                                    ${!selectedTarget ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                                `}
                            >
                                殺害を実行する
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
