import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../hooks';
import { selectMyPlayerId } from '../store/roomSlice';
import {
    selectGamePhase,
    selectGamePlayers,
    selectCurrentPlayer,
    selectRound,
    selectPublicInfo
} from '../store/gameSlice';
import {
    selectSelectedCard,
    selectSelectedPlayer,
    setSelectedPlayer,
    selectCutscenePlaying,
    selectCutsceneType,
    clearSelection,
    selectWatariReveal,
    clearWatariReveal
} from '../store/uiSlice';
import PlayerCircle from '../components/game/PlayerCircle';
import DebugLogOverlay from '../components/debug/DebugLogOverlay';
import MyArea from '../components/game/MyArea';
import CenterArea from '../components/game/CenterArea';
import ActionPanel from '../components/game/ActionPanel';
import VoteModal from '../components/game/VoteModal';
import VoteResultModal from '../components/game/ResultModals';
import CardEffectModal from '../components/game/CardEffectModal';
import { CutscenePlayer } from '../components/game/CutscenePlayer';
import { JudgmentScreen } from '../components/game/judgment/JudgmentScreen';
import { JudgmentResultScreen } from '../components/game/JudgmentResultScreen';
import { ResultScreen } from '../components/game/ResultScreen';
import { GamePhase, Role, Card, CardId, RevealedInfo, VoteResult, CARD_DEFINITIONS } from 'shared/types';
import { socketClient } from '../socket';
import { useAppDispatch } from '../hooks';
import { playCutscene, endCutscene } from '../store/uiSlice';
import { KiraMisaChat } from '../components/game/KiraMisaChat';

export default function GamePage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();

    const phase = useAppSelector(selectGamePhase);
    const players = useAppSelector(selectGamePlayers);
    const myPlayerId = useAppSelector(selectMyPlayerId);
    const currentPlayer = useAppSelector(selectCurrentPlayer);
    const round = useAppSelector(selectRound);
    const startPlayerId = useAppSelector(state => state.game.startPlayerId);
    const publicInfo = useAppSelector(selectPublicInfo);
    const selectedCard = useAppSelector(selectSelectedCard);
    const selectedPlayerState = useAppSelector(selectSelectedPlayer);
    const pendingAction = useAppSelector(state => state.game.pendingAction);
    const cutscenePlaying = useAppSelector(selectCutscenePlaying);
    const cutsceneType = useAppSelector(selectCutsceneType);
    const dispatch = useAppDispatch();

    const myPlayer = players.find(p => p.id === myPlayerId);
    const isMyTurn = currentPlayer?.id === myPlayerId;

    // ゲームメッセージ管理
    const [gameMessage, setGameMessage] = useState<string>('');
    const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // プレイエリア: 最後に使用/捨てられたカード情報
    const [lastPlayedCard, setLastPlayedCard] = useState<{
        cardId: CardId;
        cardName: string;
        playerName: string;
        playerColor?: string;
        timestamp: number;
    } | null>(null);
    const voteInitiatorRef = useRef<string>('');

    // ワタリ向けL情報（Redux storeから取得）
    const watariReveal = useAppSelector(selectWatariReveal);

    // 次のプレイヤーに行動が移るか、時間経過でメッセージが消える仕様
    // （アクション発生時に都度上書き＆タイマーリセットされるのでcurrentPlayerの変更では消さない）

    useEffect(() => {
        if (phase === 'LOBBY' as GamePhase) {
            navigate(`/room/${code}`);
        }
    }, [phase, code, navigate]);

    const isTargetSelecting = !!selectedCard && (
        selectedCard.id === 1 /* ARREST */ ||
        selectedCard.id === 2 /* GUN */ ||
        selectedCard.id === 3 /* FAKE_NAME */ ||
        selectedCard.id === 5 /* WITNESS */ ||
        selectedCard.id === 6 /* SURVEILLANCE */ ||
        selectedCard.id === 8 /* EXCHANGE */
    ) && isMyTurn;

    const handlePlayerSelect = (playerId: string) => {
        if (isTargetSelecting && selectedCard) {
            dispatch(setSelectedPlayer(playerId));
            // 即時発動
            socketClient.useCard(selectedCard.instanceId, playerId);
            dispatch(clearSelection());
        }
    };

    // Deck Logic
    const deckCount = useAppSelector(state => state.game.deck?.length || 0);

    // Effect Modal State
    const [effectModal, setEffectModal] = useState<{
        isOpen: boolean;
        type: 'role' | 'hand' | 'card' | 'shinigami' | 'arrest';
        targetName?: string;
        targetRole?: Role;
        targetHand?: Card[];
        targetCard?: Card;
        shinigamiInfo?: { kiraName?: string; deathNoteHolderName?: string };
        arrestResult?: 'success' | 'failed' | 'denied';
        reason?: 'gun_mello';
    }>({
        isOpen: false,
        type: 'shinigami'
    });

    // 投票結果表示用ステート
    const [voteResults, setVoteResults] = useState<VoteResult[] | null>(null);

    useEffect(() => {
        const socket = socketClient.socketInstance;
        if (!socket) return;

        const handlePlayCutscene = (data: { type: 'SHINIGAMI' | 'GUN' | 'ARREST' | 'JUDGMENT' }) => {
            dispatch(playCutscene({ type: data.type }));
        };

        const handleEffectReveal = (data: { revealedInfo: RevealedInfo }) => {
            console.log('✨ game:effectReveal', data);
            const info = data.revealedInfo;

            if (info.type === 'shinigami' && info.shinigamiInfo) {
                setEffectModal({
                    isOpen: true,
                    type: 'shinigami',
                    shinigamiInfo: info.shinigamiInfo
                });
            } else if (info.type === 'role' && info.targetRole) {
                const targetP = players.find(p => p.id === info.targetId);
                setEffectModal({
                    isOpen: true,
                    type: 'role',
                    targetName: targetP?.name || 'Unknown',
                    targetRole: info.targetRole,
                    reason: info.reason
                });
            } else if (info.type === 'hand' && info.targetHand) {
                const targetP = players.find(p => p.id === info.targetId);
                setEffectModal({
                    isOpen: true,
                    type: 'hand',
                    targetName: targetP?.name || 'Unknown',
                    targetHand: info.targetHand
                });
            } else if (info.type === 'arrest' && info.arrestResult) {
                const targetP = players.find(p => p.id === info.targetId);
                setEffectModal({
                    isOpen: true,
                    type: 'arrest',
                    targetName: targetP?.name || 'Unknown',
                    targetRole: info.targetRole,
                    arrestResult: info.arrestResult
                });
            } else if (info.type === 'card' && info.targetCard) {
                const targetP = players.find(p => p.id === info.targetId);
                setEffectModal({
                    isOpen: true,
                    type: 'card',
                    targetName: targetP?.name || 'Unknown',
                    targetCard: info.targetCard
                });
            } else if (info.type === 'vote_result' && info.voteResults) {
                setVoteResults(info.voteResults);
                // 5秒後に自動クローズ
                setTimeout(() => setVoteResults(null), 5000);

                // 投票1位のプレイヤー名を算出してアクションログに表示
                const voteCounts: Record<string, number> = {};
                info.voteResults.forEach(v => {
                    voteCounts[v.targetName] = (voteCounts[v.targetName] || 0) + 1;
                });
                const topName = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '不明';
                const initiator = voteInitiatorRef.current || '???';
                setActionLog(`${initiator}は投票カードを使用した「投票結果：${topName}」`);
            }
        };

        const setActionLog = (msg: string) => {
            setGameMessage(msg);
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
            }
            messageTimeoutRef.current = setTimeout(() => {
                setGameMessage('');
                messageTimeoutRef.current = null;
            }, 60000);
        };

        const handleCardUsedMessage = (data: { playerId: string; playerName?: string; cardId: number; targetPlayerId?: string; direction?: 'LEFT' | 'RIGHT'; cardName?: string }) => {
            const player = players.find(p => p.id === data.playerId);
            const pName = data.playerName || player?.name || '???';
            const cName = data.cardName || CARD_DEFINITIONS[data.cardId as CardId]?.name || 'カード';
            const targetName = data.targetPlayerId ? players.find(p => p.id === data.targetPlayerId)?.name : undefined;

            // プレイエリアに最後に使用されたカードを設定
            setLastPlayedCard({
                cardId: data.cardId as CardId,
                cardName: cName,
                playerName: pName,
                playerColor: player?.color || undefined,
                timestamp: Date.now(),
            });

            let msg = '';
            if (data.cardId === 7 /* VOTE */) {
                // 投票カードは結果受信後にメッセージを更新するため、使用者名を保存
                voteInitiatorRef.current = pName;
                msg = `${pName}は${cName}カードを使用した`;
            } else if (data.cardId === 9 /* INTERROGATION */) {
                const dirText = data.direction === 'RIGHT' ? '右回り' : '左回り';
                msg = `${pName}は${cName}カード【${dirText}】を使用した`;
            } else if (targetName) {
                msg = `${pName}は${cName}カードを${targetName}に使用した`;
            } else {
                msg = `${pName}は${cName}カードを使用した`;
            }
            setActionLog(msg);
        };

        const handleCardDiscardedMessage = (data: { playerId: string; playerName?: string; cardName?: string }) => {
            const pName = data.playerName || players.find(p => p.id === data.playerId)?.name || '???';
            const cName = data.cardName || 'カード';
            setActionLog(`${pName}は${cName}カードを捨てた`);
        };

        socket.on('game:playCutscene', handlePlayCutscene);
        socket.on('game:effectReveal', handleEffectReveal);
        socket.on('game:cardUsed', handleCardUsedMessage);
        socket.on('game:cardDiscarded', handleCardDiscardedMessage);

        return () => {
            socket.off('game:playCutscene', handlePlayCutscene);
            socket.off('game:effectReveal', handleEffectReveal);
            socket.off('game:cardUsed', handleCardUsedMessage);
            socket.off('game:cardDiscarded', handleCardDiscardedMessage);
        };
    }, [dispatch, players]);

    const handleCutsceneComplete = () => {
        const currentCutsceneType = cutsceneType;
        dispatch(endCutscene());
        if (currentCutsceneType === 'SHINIGAMI') {
            socketClient.socketInstance?.emit('game:shinigamiFinished');
        } else if (currentCutsceneType === 'GUN') {
            socketClient.socketInstance?.emit('game:gunFinished');
        } else if (currentCutsceneType === 'ARREST') {
            socketClient.socketInstance?.emit('game:arrestFinished');
        } else if (currentCutsceneType === 'JUDGMENT') {
            socketClient.socketInstance?.emit('game:judgmentCutsceneFinished');
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col overflow-hidden relative select-none">
            {/* Cutscene Overlay */}
            {cutscenePlaying && cutsceneType === 'SHINIGAMI' && (
                <CutscenePlayer
                    videoSrc="/assets/videos/shinigami.mp4"
                    onComplete={handleCutsceneComplete}
                />
            )}
            {cutscenePlaying && cutsceneType === 'GUN' && (
                <CutscenePlayer
                    videoSrc="/assets/videos/Death Note gun scene.mp4"
                    onComplete={handleCutsceneComplete}
                />
            )}
            {cutscenePlaying && cutsceneType === 'ARREST' && (
                <CutscenePlayer
                    videoSrc="/assets/videos/Death Note arrest scene.mp4"
                    onComplete={handleCutsceneComplete}
                />
            )}
            {cutscenePlaying && cutsceneType === 'JUDGMENT' && (
                <CutscenePlayer
                    videoSrc="/assets/videos/Death Note Death Scene.mp4"
                    onComplete={handleCutsceneComplete}
                />
            )}

            {/* Judgment Phase Overlay */}
            <AnimatePresence mode="wait">
                {phase === GamePhase.JUDGMENT && (
                    <JudgmentScreen key="judgment" />
                )}
            </AnimatePresence>

            {/* Judgment Result Overlay */}
            <AnimatePresence mode="wait">
                {phase === GamePhase.JUDGMENT_RESULT && <JudgmentResultScreen key="judgment-result" />}
            </AnimatePresence>

            {/* Game Result Overlay */}
            <AnimatePresence mode="wait">
                {phase === GamePhase.GAME_END && !effectModal.isOpen && <ResultScreen key="game-result" />}
            </AnimatePresence>

            {/* Header - Phase & Round Info (左上固定) */}
            <div className="absolute top-2 left-2 z-50">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="inline-flex items-center gap-2 bg-dn-bg-card/70 px-3 py-1 rounded-full border border-dn-accent/30 backdrop-blur-md shadow-md">
                        <span className="text-dn-accent font-bold text-xs">
                            第{round}ラウンド
                        </span>
                        <span className="text-dn-text-secondary text-[10px]">|</span>
                        <span className="text-white text-xs">
                            {getPhaseName(phase)}
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Header - Back to Lobby Button (右上固定, ホスト等) */}
            {myPlayer?.isHost && (
                <div className="absolute top-2 right-2 z-50">
                    <button
                        onClick={() => {
                            if (window.confirm("ゲームを終了して全体でロビーに戻りますか？")) {
                                socketClient.backToLobby();
                            }
                        }}
                        className="bg-red-600/80 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-full text-xs border border-red-800 shadow-md backdrop-blur-sm transition-colors flex items-center gap-1"
                    >
                        🚪 ロビーに戻る
                    </button>
                </div>
            )}

            {/* =============================================
                メインゲームエリア: 3行構造
                上部: TOPプレイヤー群
                中央: 左プレイヤー / メイン画面(山札+捨て札+状態) / 右プレイヤー
                下部: 自分のプレイマット
              ============================================= */}

            <div className="flex-1 flex flex-col pt-10 pb-0 overflow-hidden">

                {/* [上部+中央] プレイヤー円形配置 + 中央メインパネル */}
                <div className="flex-1 flex flex-col justify-center">
                    {myPlayerId && (
                        <PlayerCircle
                            players={players}
                            currentPlayerId={currentPlayer?.id || ''}
                            selectedPlayerId={selectedPlayerState}
                            myPlayerId={myPlayerId}
                            startPlayerId={startPlayerId}
                            onPlayerClick={handlePlayerSelect}
                            isTargetSelecting={isTargetSelecting}
                        >
                            <CenterArea
                                deckCount={deckCount}
                                lastDiscard={publicInfo.lastDiscard}
                                transferHistory={publicInfo.transferHistory}
                                currentPlayerName={currentPlayer?.name}
                                isMyTurn={isMyTurn}
                                message={gameMessage}
                                lastPlayedCard={lastPlayedCard}
                            />
                        </PlayerCircle>
                    )}
                </div>

                {/* [下部] 自分のプレイマット または 観戦モードUI */}
                <div className="relative z-30 pb-1 px-2 flex justify-center w-full">
                    {myPlayer && !myPlayer.isSpectator && myPlayer.isAlive && (
                        <div className="w-full">
                            <MyArea
                                player={myPlayer}
                                isMyTurn={isMyTurn || (pendingAction?.type === 'INTERROGATION' && !!myPlayerId && !pendingAction.cardSelections?.[myPlayerId])}
                                selectedCard={selectedCard}
                                transferHistory={publicInfo.transferHistory}
                                players={players}
                                isStartPlayer={myPlayer.id === startPlayerId}
                            >
                                <ActionPanel
                                    phase={phase}
                                    selectedCard={selectedCard}
                                    selectedPlayer={selectedPlayerState}
                                />
                            </MyArea>
                        </div>
                    )}
                    {(!myPlayer || myPlayer.isSpectator || !myPlayer.isAlive) && (
                        <div className="w-full max-w-4xl bg-dn-bg-card/80 p-4 rounded-xl border border-purple-500/50 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(168,85,247,0.15)] mt-2">
                            <h3 className="text-xl font-bold text-purple-400 mb-2">👁 観戦モード</h3>
                            <p className="text-sm text-dn-text-muted mb-4">
                                {myPlayer && !myPlayer.isAlive ? 'あなたはゲームから脱落しました。' : 'あなたは現在観戦しています。'}
                                他のプレイヤーの役職や手札がすべて公開されています。
                            </p>
                            <KiraMisaChat />
                        </div>
                    )}
                </div>
            </div>

            {/* Vote Modal - 裁きフェーズ以降は非表示 */}
            {pendingAction?.type === 'VOTE' && phase !== GamePhase.JUDGMENT && phase !== GamePhase.JUDGMENT_RESULT && phase !== GamePhase.GAME_END && (
                <VoteModal
                    timeLimit={10}
                    onClose={() => { }}
                />
            )}

            {/* Vote Result Modal - 裁きフェーズ以降は非表示 */}
            <AnimatePresence>
                {voteResults && phase !== GamePhase.JUDGMENT && phase !== GamePhase.JUDGMENT_RESULT && phase !== GamePhase.GAME_END && (
                    <VoteResultModal
                        results={voteResults}
                        onClose={() => setVoteResults(null)}
                    />
                )}
            </AnimatePresence>

            {/* Effect Modal */}
            <AnimatePresence>
                {effectModal.isOpen && (
                    <CardEffectModal
                        type={effectModal.type}
                        targetName={effectModal.targetName}
                        targetRole={effectModal.targetRole}
                        targetHand={effectModal.targetHand}
                        targetCard={effectModal.targetCard}
                        shinigamiInfo={effectModal.shinigamiInfo}
                        arrestResult={effectModal.arrestResult}
                        reason={effectModal.reason}
                        myRole={myPlayer?.role || undefined}
                        onClose={() => {
                            const wasArrestSuccess = effectModal.type === 'arrest' && effectModal.arrestResult === 'success';
                            setEffectModal(prev => ({ ...prev, isOpen: false }));
                            if (wasArrestSuccess) {
                                // カードめくり演出確認後 → キラ逮捕ムービー再生をトリガー
                                socketClient.arrestCardDismissed();
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ワタリ向けL情報モーダル */}
            <AnimatePresence>
                {watariReveal && (
                    <motion.div
                        key="watari-reveal"
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => dispatch(clearWatariReveal())}
                    >
                        <motion.div
                            className="bg-dn-bg-card border-2 border-blue-400/60 rounded-2xl p-6 md:p-8 max-w-sm w-[90%] shadow-[0_0_40px_rgba(59,130,246,0.3)] text-center"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-3xl mb-3">🔍</div>
                            <h3 className="text-lg font-bold text-blue-300 mb-1">ワタリの能力</h3>
                            <p className="text-sm text-dn-text-muted mb-4">あなたはLの正体を知っています</p>
                            <div className="bg-dn-bg-primary/60 rounded-xl p-4 mb-5 border border-blue-500/30">
                                <p className="text-xs text-dn-text-muted mb-1">L役職のプレイヤー</p>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: watariReveal.lPlayerColor || '#60a5fa' }}
                                >
                                    {watariReveal.lPlayerName}
                                </p>
                            </div>
                            <button
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                                onClick={() => dispatch(clearWatariReveal())}
                            >
                                確認
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Debug Overlay */}
            <DebugLogOverlay />
        </div>
    );
}

function getPhaseName(phase: string): string {
    const names: Record<string, string> = {
        SETUP: 'セットアップ',
        WATARI_CONFIRM: 'ワタリ確認',
        INVESTIGATION: '捜査の時間',
        CARD_DRAW: 'カード補充',
        CARD_ACTION: 'アクション選択',
        CARD_EFFECT: 'カード効果',
        JUDGMENT: '裁きの時間',
        JUDGMENT_RESULT: '裁き結果',
        GAME_END: 'ゲーム終了',
    };
    return names[phase] || phase;
}
