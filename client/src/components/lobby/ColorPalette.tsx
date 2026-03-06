import { motion } from 'framer-motion';
import type { Player } from 'shared/types';
import { socketClient } from '../../socket';

// デスノートの世界観に合うダーク系＋アクセントカラーのパレット
const PLAYER_COLORS = [
    { hex: '#DC2626', name: '紅' },      // レッド
    { hex: '#2563EB', name: '蒼' },      // ブルー
    { hex: '#16A34A', name: '翠' },      // グリーン
    { hex: '#CA8A04', name: '金' },      // ゴールド
    { hex: '#9333EA', name: '紫' },      // パープル
    { hex: '#EA580C', name: '橙' },      // オレンジ
    { hex: '#0D9488', name: '碧' },      // ティール
    { hex: '#DB2777', name: '桃' },      // ピンク
    { hex: '#4F46E5', name: '藍' },      // インディゴ
    { hex: '#65A30D', name: '萌' },      // ライム
];

interface ColorPaletteProps {
    players: Player[];
    myPlayerId: string | null;
}

export default function ColorPalette({ players, myPlayerId }: ColorPaletteProps) {
    const myPlayer = players.find(p => p.id === myPlayerId);
    const myColor = myPlayer?.color;

    const handleColorSelect = (hex: string) => {
        if (myColor === hex) {
            // 同じ色を再クリックで解除
            socketClient.selectColor(null);
        } else {
            socketClient.selectColor(hex);
        }
    };

    // 各色を選択しているプレイヤーを探す
    const getPlayerForColor = (hex: string): Player | undefined => {
        return players.find(p => p.color === hex);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-container mb-6"
        >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-dn-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                プレイヤーカラー
            </h2>

            <div className="flex flex-wrap gap-3 justify-center">
                {PLAYER_COLORS.map((color) => {
                    const owner = getPlayerForColor(color.hex);
                    const isSelected = myColor === color.hex;
                    const isTaken = !!owner && owner.id !== myPlayerId;

                    return (
                        <motion.button
                            key={color.hex}
                            onClick={() => !isTaken && handleColorSelect(color.hex)}
                            whileHover={!isTaken ? { scale: 1.15 } : {}}
                            whileTap={!isTaken ? { scale: 0.92 } : {}}
                            disabled={isTaken}
                            className={`
                                relative w-12 h-12 rounded-full transition-all duration-300
                                flex items-center justify-center
                                ${isSelected
                                    ? 'ring-3 ring-white ring-offset-2 ring-offset-dn-bg-primary shadow-lg'
                                    : isTaken
                                        ? 'opacity-80 cursor-not-allowed ring-2 ring-white/20'
                                        : 'hover:ring-2 hover:ring-white/50 cursor-pointer opacity-70 hover:opacity-100'
                                }
                            `}
                            style={{
                                backgroundColor: color.hex,
                                boxShadow: isSelected ? `0 0 20px ${color.hex}80` : 'none',
                            }}
                            title={isTaken ? `${owner?.name}が選択中` : color.name}
                        >
                            {/* 選択中のプレイヤーのイニシャル */}
                            {owner && (
                                <motion.span
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="text-white font-bold text-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] select-none"
                                    style={{
                                        textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)',
                                    }}
                                >
                                    {owner.name.charAt(0)}
                                </motion.span>
                            )}

                            {/* 選択済みチェックアイコン（自分の場合のみ、外側に小さく） */}
                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md"
                                >
                                    <svg className="w-3 h-3 text-dn-bg-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* 選択情報のヒント */}
            <p className="text-dn-text-muted text-xs text-center mt-3">
                {myColor
                    ? 'もう一度タップで選択解除'
                    : 'カラーをタップして選択してください'}
            </p>
        </motion.div>
    );
}

export { PLAYER_COLORS };
