import { motion } from 'framer-motion';
import type { Card, Role } from 'shared/types';
import { getCardImagePath, getRoleImagePath } from '../../utils/assetPaths'; // Added import

interface CardEffectModalProps {
    type: 'role' | 'hand' | 'card' | 'shinigami' | 'arrest';
    targetName?: string;
    targetRole?: Role;
    targetHand?: Card[];
    targetCard?: Card;
    shinigamiInfo?: {
        kiraName?: string;
        deathNoteHolderName?: string;
    };
    arrestResult?: 'success' | 'failed' | 'denied';
    reason?: 'gun_mello';
    myRole?: Role;
    onClose: () => void;
}

export default function CardEffectModal({
    type,
    targetName,
    targetRole,
    targetHand,
    targetCard,
    shinigamiInfo,
    arrestResult,
    reason,
    myRole,
    onClose
}: CardEffectModalProps) {

    // 死神演出
    if (type === 'shinigami') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="text-center"
                >
                    {/* Ryuk Image Effect */}
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 1, duration: 1.5 }}
                        className="text-8xl mb-8 relative w-48 h-48 mx-auto"
                    >
                        {/* Replace emoji with Shinigami card effect image if available, or just specific image */}
                        <img
                            src="/assets/images/shinigami_effect.png" // Dedicated effect image? Or just use card image
                            // Actually user said "investigation cards", maybe Shinigami is a card too.
                            // Let's use getCardImagePath for Shinigami card ID 13.
                            // But usually an "effect" image is different.
                            // For now let's use the card image as a placeholder or fallback to emoji
                            alt="Shinigami"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        <span className="hidden absolute inset-0 flex items-center justify-center text-8xl">💀</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2 }}
                        className="text-3xl font-bold text-dn-accent mb-6"
                    >
                        死神の目
                    </motion.h2>

                    {/* Information based on role */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.5 }}
                        className="bg-dn-bg-card/80 p-6 rounded-xl max-w-sm mx-auto"
                    >
                        {myRole === 'KIRA' && shinigamiInfo && (
                            <p className="text-lg">
                                デスノート所持者: <br />
                                <span className="text-dn-accent text-2xl font-bold">
                                    {shinigamiInfo.deathNoteHolderName || '不明'}
                                </span>
                            </p>
                        )}

                        {myRole === 'MISA' && shinigamiInfo && (
                            <div className="space-y-4">
                                <p className="text-lg">
                                    キラ: <br />
                                    <span className="text-dn-accent text-2xl font-bold">
                                        {shinigamiInfo.kiraName || '不明'}
                                    </span>
                                </p>
                                <p className="text-lg">
                                    デスノート所持者: <br />
                                    <span className="text-dn-accent text-2xl font-bold">
                                        {shinigamiInfo.deathNoteHolderName || '不明'}
                                    </span>
                                </p>
                            </div>
                        )}

                        {myRole !== 'KIRA' && myRole !== 'MISA' && (
                            <p className="text-dn-text-secondary text-lg">
                                死神の目が発動しました...
                            </p>
                        )}
                    </motion.div>

                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 3.5 }}
                        onClick={onClose}
                        className="btn-primary mt-8"
                    >
                        確認
                    </motion.button>
                </motion.div>
            </motion.div>
        );
    }

    // 役職確認（目撃 / 拳銃によるメロの正体公開）
    if (type === 'role' && targetRole) {
        const isMelloReveal = reason === 'gun_mello';
        return (
            <EffectPopup onClose={onClose}>
                <h3 className="text-xl font-bold mb-4 text-center">
                    {isMelloReveal ? 'メロの正体公開' : '目撃結果'}
                </h3>
                <p className="text-center text-dn-text-secondary mb-2">
                    {isMelloReveal ? `${targetName}はメロでした！` : `${targetName}の正体は...`}
                </p>

                <div className="w-32 h-32 mx-auto mb-4 relative flex items-center justify-center">
                    <img
                        src={getRoleImagePath(targetRole)}
                        alt={targetRole}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                    <p className="hidden text-center text-3xl font-bold text-dn-accent">
                        {getRoleName(targetRole)}
                    </p>
                </div>

                <p className="text-center text-xl font-bold text-dn-accent">
                    {getRoleName(targetRole)}
                </p>
            </EffectPopup>
        );
    }

    // 手札確認（監視）
    if (type === 'hand' && targetHand) {
        return (
            <EffectPopup onClose={onClose}>
                <h3 className="text-xl font-bold mb-4 text-center">監視結果</h3>
                <p className="text-center text-dn-text-secondary mb-4">{targetName}の手札</p>
                <div className="flex gap-3 justify-center flex-wrap">
                    {targetHand.length === 0 ? (
                        <p className="text-dn-text-muted">手札がありません</p>
                    ) : (
                        targetHand.map((card) => (
                            <div
                                key={card.instanceId}
                                className="w-20 h-28 bg-dn-bg-secondary rounded-lg flex flex-col items-center justify-center p-2 border border-dn-text-muted/30 relative overflow-hidden"
                            >
                                <img
                                    src={getCardImagePath(card.id)}
                                    alt={card.name}
                                    className="w-full h-full object-cover absolute inset-0 opacity-80"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                                {/* カードナンバー表示 */}
                                <div className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-black/80 rounded-full border border-gray-400/50 shadow-sm z-30">
                                    <span className="text-[10px] font-bold text-gray-200">{card.id}</span>
                                </div>
                                <span className="text-2xl mb-1 relative z-10 hidden">{getCardIcon(card.id)}</span>
                                <span className="text-xs text-center relative z-10 bg-black/80 w-full text-white font-bold py-0.5 max-h-5 truncate">{card.name}</span>
                            </div>
                        ))
                    )}
                </div>
            </EffectPopup>
        );
    }

    // カード確認（拳銃で公開されたカード）
    if (type === 'card' && targetCard) {
        return (
            <EffectPopup onClose={onClose}>
                <h3 className="text-xl font-bold mb-4 text-center">公開されたカード</h3>
                <p className="text-center text-dn-text-secondary mb-4">{targetName}の最小カード</p>
                <div className="flex justify-center">
                    <div className="w-24 h-36 bg-dn-bg-secondary rounded-lg flex flex-col items-center justify-center p-3 border-2 border-dn-accent relative overflow-hidden">
                        <img
                            src={getCardImagePath(targetCard.id)}
                            alt={targetCard.name}
                            className="w-full h-full object-cover absolute inset-0 opacity-80"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        {/* カードナンバー表示 */}
                        <div className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 bg-black/80 rounded-full border border-gray-400/50 shadow-sm z-30">
                            <span className="text-xs font-bold text-gray-200">{targetCard.id}</span>
                        </div>
                        <span className="text-4xl mb-2 relative z-10 hidden">{getCardIcon(targetCard.id)}</span>
                        <span className="text-sm font-bold text-center relative z-10 bg-black/80 w-full text-white py-1">{targetCard.name}</span>
                    </div>
                </div>
            </EffectPopup>
        );
    }
    // 逮捕カードのエフェクト
    if (type === 'arrest' && arrestResult) {
        const isSuccess = arrestResult === 'success';

        return (
            <EffectPopup onClose={onClose}>
                <h3 className="text-xl font-bold mb-4 text-center">逮捕の判定結果</h3>
                <p className="text-center text-dn-text-secondary mb-6">{targetName}への逮捕を試みました...</p>

                <div className="flex flex-col items-center justify-center min-h-[200px]" style={{ perspective: '1000px' }}>
                    <motion.div
                        initial={{ rotateY: 0 }}
                        animate={{ rotateY: isSuccess ? 180 : [0, -10, 10, -10, 10, 0] }}
                        transition={{ duration: isSuccess ? 0.8 : 0.5, delay: 0.5 }}
                        className="w-32 h-48 relative"
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {/* カード裏面 */}
                        <div className="absolute inset-0 bg-dn-bg-secondary rounded-xl border border-dn-text-muted flex items-center justify-center overflow-hidden"
                            style={{ backfaceVisibility: 'hidden' }}>
                            <div className="w-full h-full border-4 border-gray-600/30 m-1 rounded-lg flex items-center justify-center bg-gray-800">
                                <span className="text-4xl text-gray-500">?</span>
                            </div>
                        </div>

                        {/* カード表面（成功時のみ） */}
                        {isSuccess && (
                            <div className="absolute inset-0 bg-dn-bg-secondary rounded-xl border-2 border-red-500 flex flex-col items-center justify-center overflow-hidden"
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                <img
                                    src={getRoleImagePath('KIRA' as Role)}
                                    alt="KIRA"
                                    className="w-full h-full object-cover opacity-90"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                        e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                                        e.currentTarget.parentElement?.querySelector('.fallback-text')?.classList.remove('hidden');
                                    }}
                                />
                                <span className="fallback-icon hidden text-5xl mb-2 z-10 block">📓</span>
                                <span className="fallback-text hidden text-lg font-bold text-white z-10 block">キラ</span>
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5 }}
                        className="mt-8 text-center"
                    >
                        {isSuccess ? (
                            <p className="text-2xl font-bold text-red-500">逮捕成功！<br />キラでした！</p>
                        ) : (
                            <p className="text-xl font-bold text-gray-400">
                                キラではなかった
                            </p>
                        )}
                    </motion.div>
                </div>
            </EffectPopup>
        );
    }

    return null;
}

// ポップアップ共通コンポーネント
function EffectPopup({
    children,
    onClose
}: {
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-dn-bg-card p-6 rounded-xl max-w-md w-full border border-dn-accent/30"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
                <button onClick={onClose} className="btn-primary w-full mt-6">
                    確認
                </button>
            </motion.div>
        </motion.div>
    );
}

function getRoleName(role: string): string {
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

function getCardIcon(cardId: number): string {
    const icons: Record<number, string> = {
        0: '📓', 1: '🚔', 2: '🔫', 3: '🎭', 4: '📝',
        5: '👁️', 6: '📹', 7: '🗳️', 8: '🔄', 9: '❓', 13: '💀',
    };
    return icons[cardId] || '🃏';
}
