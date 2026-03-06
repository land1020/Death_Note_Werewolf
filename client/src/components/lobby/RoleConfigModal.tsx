import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, RotateCcw } from 'lucide-react';
import { Role, RoleConfig } from 'shared/types';
import { DEFAULT_ROLE_CONFIG } from 'shared/utils/roleFactory';

interface RoleConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: RoleConfig) => void;
    initialConfig: RoleConfig;
    isHost: boolean;
}

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
    [Role.KIRA]: 'キラ',
    [Role.MISA]: '信者(ミサ)',
    [Role.L]: 'L',
    [Role.POLICE]: '警察',
    [Role.WATARI]: 'ワタリ',
    [Role.MELLO]: 'メロ',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
    [Role.KIRA]: 'キラ陣営。デスノートでLを排除する。',
    [Role.MISA]: 'キラ陣営。キラをサポートする。',
    [Role.L]: 'L陣営。キラを逮捕する。',
    [Role.POLICE]: 'L陣営。捜査を支援する。',
    [Role.WATARI]: 'L陣営。Lのサポート役。',
    [Role.MELLO]: '第三陣営。単独勝利を狙う。',
};

export default function RoleConfigModal({ isOpen, onClose, onSave, initialConfig, isHost }: RoleConfigModalProps) {
    const [config, setConfig] = useState<RoleConfig>(initialConfig);
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
    const updateRoleCount = (playerCount: number, role: Role, delta: number) => {
        if (!isHost) return;

        setConfig(prev => {
            const currentMap = prev[playerCount] || {};
            const current = currentMap[role] || 0;
            const newValue = Math.max(0, current + delta);

            return {
                ...prev,
                [playerCount]: {
                    ...currentMap,
                    [role]: newValue
                }
            };
        });
    };

    const resetToDefault = () => {
        if (!isHost) return;
        if (window.confirm('役職設定をデフォルトに戻しますか？')) {
            setConfig(JSON.parse(JSON.stringify(DEFAULT_ROLE_CONFIG)));
        }
    };

    // ---------------------------
    // 計算・バリデーション
    // ---------------------------
    const getTotalRoleCount = (playerCount: number) => {
        const map = config[playerCount] || {};
        return Object.values(map).reduce((sum, n) => sum + (n || 0), 0);
    };

    const currentTotal = getTotalRoleCount(activeTab);
    const targetTotal = activeTab;
    const isCountValid = currentTotal === targetTotal;

    const roleTypes = Object.values(Role);

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
                                役職配分{isHost ? '設定' : '確認'}
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
                    <div className="flex border-b border-dn-accent/20 overflow-x-auto overflow-y-hidden custom-scrollbar">
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
                                        {activeTab}人プレイ時の役職構成
                                    </h3>
                                    <p className="text-sm text-dn-text-muted">
                                        合計人数が{activeTab}人になるように調整してください
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-bold ${isCountValid ? 'text-green-400' : 'text-yellow-400'}`}>
                                        設定合計: {currentTotal} / {targetTotal} 人
                                    </div>
                                </div>
                            </div>

                            {!isCountValid && isHost && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                                    合計人数 ({currentTotal}人) が実際のプレイ人数 ({targetTotal}人) と一致していません。
                                    一致しない場合、この人数でのゲーム開始時に役職不足や過剰が発生する可能性があります。
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {roleTypes.map(role => {
                                    const countMap = config[activeTab] || {};
                                    const count = countMap[role] || 0;

                                    return (
                                        <div
                                            key={role}
                                            className={`flex flex-col p-4 rounded-lg border transition-colors ${count > 0 ? 'bg-dn-bg-primary/50 border-dn-accent/30' : 'bg-white/5 border-white/5 opacity-70'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-white text-lg">{ROLE_DISPLAY_NAMES[role]}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {isHost && (
                                                        <button
                                                            onClick={() => updateRoleCount(activeTab, role, -1)}
                                                            className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-colors"
                                                            disabled={count <= 0}
                                                        >
                                                            -
                                                        </button>
                                                    )}
                                                    <span className="w-8 text-center font-bold text-xl text-white">
                                                        {count}
                                                    </span>
                                                    {isHost && (
                                                        <button
                                                            onClick={() => updateRoleCount(activeTab, role, 1)}
                                                            className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-colors"
                                                            disabled={currentTotal >= activeTab && isHost}
                                                        >
                                                            +
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-dn-text-muted leading-relaxed">
                                                {ROLE_DESCRIPTIONS[role]}
                                            </p>
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
