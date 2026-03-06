import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, RotateCcw } from 'lucide-react';
import { CardId, DeckConfig } from 'shared/types';
import { CARD_DEFINITIONS } from 'shared/types';
import { DEFAULT_DECK_CONFIG } from 'shared/utils/deckFactory';

interface DeckConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: DeckConfig) => void;
    initialConfig: DeckConfig;
    isHost: boolean;
}

export default function DeckConfigModal({ isOpen, onClose, onSave, initialConfig, isHost }: DeckConfigModalProps) {
    const [config, setConfig] = useState<DeckConfig>(initialConfig);
    const [activeTab, setActiveTab] = useState<number>(4);

    // 初期化
    useEffect(() => {
        if (isOpen) {
            setConfig(JSON.parse(JSON.stringify(initialConfig)));
        }
    }, [isOpen, initialConfig]);

    if (!isOpen) return null;

    // ---------------------------
    // ハンドラー
    // ---------------------------
    const updateCardCount = (playerCount: number, typeStr: string, delta: number) => {
        if (!isHost) return;
        const type = parseInt(typeStr) as CardId;

        setConfig(prev => {
            const currentMap = prev[playerCount] || {};
            const current = currentMap[type] || 0;
            const newValue = Math.max(0, current + delta);

            return {
                ...prev,
                [playerCount]: {
                    ...currentMap,
                    [type]: newValue
                }
            };
        });
    };

    const resetToDefault = () => {
        if (!isHost) return;
        if (window.confirm('設定をデフォルトに戻しますか？')) {
            setConfig(JSON.parse(JSON.stringify(DEFAULT_DECK_CONFIG)));
        }
    };

    // ---------------------------
    // 計算・バリデーション
    // ---------------------------
    const getCardCount = (playerCount: number) => {
        const map = config[playerCount] || {};
        return Object.values(map).reduce((sum, n) => sum + (n || 0), 0);
    };

    const targetCounts: Record<number, number> = {
        4: 18,
        5: 22,
        6: 26,
        7: 30,
        8: 34
    };

    const currentTotal = getCardCount(activeTab);
    const targetTotal = targetCounts[activeTab] || 0;
    const isCountValid = currentTotal === targetTotal;

    // ---------------------------
    // レンダリング用データ
    // ---------------------------
    const cardTypes = Object.entries(CARD_DEFINITIONS).map(([id, info]) => ({
        id: parseInt(id) as CardId,
        ...info
    }));

    // 順番は enum / 定義順などで表示する
    const sortedCardTypes = cardTypes.sort((a, b) => a.id - b.id);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-dn-bg-card border border-dn-accent/30 w-full max-w-4xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-dn-accent/20 bg-dn-bg-secondary/30">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-dn-accent tracking-wider">
                                デッキ構成{isHost ? '設定' : '確認'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {isHost && (
                                <button
                                    onClick={resetToDefault}
                                    className="p-2 text-sm text-dn-text-muted hover:text-white flex items-center gap-1 hover:bg-white/10 rounded transition-colors"
                                    title="初期設定に戻す"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    リセット
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 text-dn-text-muted hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-dn-accent/20 overflow-x-auto">
                        {[4, 5, 6, 7, 8].map(n => (
                            <button
                                key={n}
                                onClick={() => setActiveTab(n)}
                                className={`px-6 py-3 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === n
                                    ? 'bg-dn-accent/20 text-dn-accent border-b-2 border-dn-accent'
                                    : 'text-dn-text-muted hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                {n}人プレイ
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-white">
                                        {activeTab}人プレイ時のカード構成
                                    </h3>
                                    <p className="text-sm text-dn-text-muted">
                                        各カードのデッキに入る総枚数を設定します
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-bold ${isCountValid ? 'text-green-400' : 'text-yellow-400'}`}>
                                        合計: {currentTotal} 枚
                                    </div>
                                    <div className="text-sm text-dn-text-muted">
                                        (推奨枚数: {targetTotal}枚)
                                    </div>
                                </div>
                            </div>

                            {!isCountValid && isHost && (
                                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-300 text-sm">
                                    推奨枚数 ({targetTotal}枚) と異なります。このままでも開始できますが、バランスが崩れる可能性があります。
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {sortedCardTypes.map(cardInfo => {
                                    const type = cardInfo.id;
                                    const countMap = config[activeTab] || {};
                                    const count = countMap[type] || 0;

                                    return (
                                        <div
                                            key={type}
                                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${count > 0 ? 'bg-dn-bg-primary/50 border-dn-accent/30' : 'bg-white/5 border-white/5 opacity-70'
                                                }`}
                                        >
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <span className="font-medium text-white truncate">{cardInfo.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {isHost && (
                                                    <button
                                                        onClick={() => updateCardCount(activeTab, type.toString(), -1)}
                                                        className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        disabled={
                                                            count <= 0 ||
                                                            (type === CardId.DEATH_NOTE && count <= 1) ||
                                                            (type === CardId.ARREST && count <= 1)
                                                        }
                                                    >
                                                        -
                                                    </button>
                                                )}
                                                <span className="w-8 text-center font-bold text-xl text-white">
                                                    {count}
                                                </span>
                                                {isHost && (
                                                    <button
                                                        onClick={() => updateCardCount(activeTab, type.toString(), 1)}
                                                        className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-dn-accent/20 bg-dn-bg-secondary/50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg text-dn-text-secondary hover:text-white hover:bg-white/10 transition-colors bg-white/5 font-medium"
                        >
                            閉じる
                        </button>
                        {isHost && (
                            <button
                                onClick={() => {
                                    onSave(config);
                                    onClose();
                                }}
                                className="px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all bg-dn-accent hover:bg-red-600 text-white shadow-lg shadow-red-900/20"
                            >
                                <Save className="w-5 h-5" />
                                設定を保存
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
