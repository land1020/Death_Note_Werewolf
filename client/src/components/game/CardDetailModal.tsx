import { motion } from 'framer-motion';
import { Card, CardId } from 'shared/types';
import { getCardImagePath } from '../../utils/assetPaths';

interface CardDetailModalProps {
    card: Card;
    isPlayable: boolean;
    onUse?: () => void;
    onClose: () => void;
}

const CARD_DESCRIPTIONS: Record<number, string> = {
    [CardId.DEATH_NOTE]: 'デスノートに名前を書き込むことで対象を殺害できる。キラ専用パッシブカード。',
    [CardId.ARREST]: '対象を逮捕する。キラを逮捕すればL陣営の勝利。L / ワタリが使用可能。',
    [CardId.GUN]: '警察: 対象の最小番号カードを公開する。メロ: 対象を射殺し、自分の正体を公開する。',
    [CardId.FAKE_NAME]: '偽名。持っているだけでカード番号を操作できる。パッシブカード。',
    [CardId.ALIBI]: 'アリバイ。キラが逮捕された時、一度だけ否認して回避できる。パッシブカード。',
    [CardId.WITNESS]: '目撃: 対象の役職を確認できる。使用者だけが情報を得る。',
    [CardId.SURVEILLANCE]: '監視: 対象の手札を全て確認できる。使用者だけが情報を得る。',
    [CardId.VOTE]: '投票: 全員で投票を行い、最多得票者を公開する。',
    [CardId.EXCHANGE]: '交換: 対象とカードを1枚交換する。',
    [CardId.INTERROGATION]: '取調: 全員が選んだカードを隣のプレイヤーに渡す。左回りか右回りを選択。',
    [CardId.SHINIGAMI]: '死神の目: キラ陣営にキラとデスノートの所在を知らせる。',
};

export default function CardDetailModal({ card, isPlayable, onUse, onClose }: CardDetailModalProps) {
    return (
        <motion.div
            className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-dn-bg-card rounded-2xl max-w-sm w-full border border-dn-accent/30 shadow-2xl overflow-hidden"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 transition-colors"
                >
                    ✕
                </button>

                {/* Card Image */}
                <div className="relative w-full aspect-[3/4] max-h-[280px] bg-gradient-to-b from-dn-accent/20 to-dn-bg-primary overflow-hidden flex items-center justify-center">
                    <div className="w-40 h-56 rounded-xl border-2 border-dn-accent/50 overflow-hidden shadow-lg">
                        <img
                            src={getCardImagePath(card.id)}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                        {/* カードナンバー表示 */}
                        <div className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 bg-black/80 rounded-full border-2 border-gray-400/50 shadow-md z-30">
                            <span className="text-sm font-bold text-gray-200">{card.id}</span>
                        </div>
                    </div>
                    {/* Card name badge */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-dn-bg-secondary/90 px-4 py-1 rounded-full border border-dn-accent/30">
                        <span className="text-white font-bold text-sm">{card.name}</span>
                    </div>
                </div>

                {/* Card Info */}
                <div className="p-5 space-y-4">
                    {/* Card number and name */}
                    <div className="flex items-center justify-center gap-2">
                        <span className="bg-dn-accent/20 text-dn-accent px-2 py-0.5 rounded text-xs font-bold border border-dn-accent/30">
                            No.{card.id}
                        </span>
                        <span className="text-white font-bold text-lg">{card.name}</span>
                    </div>

                    {/* Description */}
                    <div className="bg-dn-bg-secondary/50 rounded-lg p-3 border border-dn-border/30">
                        <div className="text-dn-accent font-bold text-xs mb-1 text-center">効果</div>
                        <p className="text-dn-text-secondary text-sm leading-relaxed text-center">
                            {CARD_DESCRIPTIONS[card.id] || '効果なし'}
                        </p>
                    </div>

                    {/* Used badge */}
                    {card.isUsed && (
                        <div className="text-center">
                            <span className="text-red-400 text-xs font-bold border border-red-400/50 px-2 py-0.5 rounded">
                                使用済み
                            </span>
                        </div>
                    )}

                    {/* Use button */}
                    {isPlayable && onUse && (
                        <button
                            onClick={onUse}
                            className="w-full py-3 bg-dn-accent hover:bg-dn-accent/80 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-dn-accent/30"
                        >
                            <span>▶</span> このカードを使う
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
