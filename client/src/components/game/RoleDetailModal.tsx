import { motion } from 'framer-motion';
import { Role, CardId } from 'shared/types';
import { getRoleImagePath } from '../../utils/assetPaths';

interface RoleDetailModalProps {
    role: Role;
    onClose: () => void;
}

interface RoleInfo {
    name: string;
    team: string;
    teamColor: string;
    winCondition: string;
    specialCards: { id: CardId; name: string }[];
    description: string;
}

const ROLE_DATA: Record<string, RoleInfo> = {
    KIRA: {
        name: 'キラ（夜神月）',
        team: 'キラ陣営',
        teamColor: '#dc2626',
        winCondition: 'Lを殺害する（デスノートにLの名前を書く）',
        specialCards: [
            { id: CardId.DEATH_NOTE, name: 'デスノート' },
        ],
        description: 'デスノートに名前を書き、Lを排除せよ。偽名を持っているプレイヤーには効かない。',
    },
    MISA: {
        name: 'ミサ（弥海砂）',
        team: 'キラ陣営',
        teamColor: '#dc2626',
        winCondition: 'キラと同じ（Lを殺害する）',
        specialCards: [],
        description: 'キラの味方。キラとチャットで連携し、Lの正体を突き止める手助けをする。',
    },
    L: {
        name: 'L',
        team: 'L陣営',
        teamColor: '#3b82f6',
        winCondition: 'キラを逮捕する',
        specialCards: [
            { id: CardId.ARREST, name: '逮捕' },
        ],
        description: '逮捕カードでキラを名指しし、見事当てればL陣営の勝利。',
    },
    POLICE: {
        name: '警察',
        team: 'L陣営',
        teamColor: '#3b82f6',
        winCondition: 'Lと同じ（キラを逮捕する）',
        specialCards: [
            { id: CardId.GUN, name: '拳銃' },
        ],
        description: '拳銃を使い、対象の最小番号カードを全員に公開させる。情報収集でLをサポート。',
    },
    WATARI: {
        name: 'ワタリ',
        team: 'L陣営',
        teamColor: '#3b82f6',
        winCondition: 'Lと同じ（キラを逮捕する）',
        specialCards: [
            { id: CardId.ARREST, name: '逮捕' },
        ],
        description: 'Lの右腕。逮捕カードを所持し、ゲーム開始時にLの正体を知る。',
    },
    MELLO: {
        name: 'メロ',
        team: '第三陣営',
        teamColor: '#eab308',
        winCondition: 'デスノートを所持した状態でゲーム終了する',
        specialCards: [
            { id: CardId.GUN, name: '拳銃' },
        ],
        description: '独自の勝利条件を持つ。拳銃で対象を射殺できるが、正体が公開される。',
    },
};

export default function RoleDetailModal({ role, onClose }: RoleDetailModalProps) {
    const info = ROLE_DATA[role];
    if (!info) return null;

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
                {/* Header with role image */}
                <div className="relative w-full h-40 overflow-hidden bg-gradient-to-b from-dn-bg-secondary to-dn-bg-card">
                    <img
                        src={getRoleImagePath(role)}
                        alt={info.name}
                        className="w-full h-full object-cover opacity-70"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dn-bg-card via-transparent to-transparent" />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white z-10 transition-colors"
                    >
                        ✕
                    </button>

                    {/* Role name */}
                    <div className="absolute bottom-3 left-4">
                        <h2 className="text-white font-bold text-xl drop-shadow-lg">{info.name}</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                    {/* Team */}
                    <div className="flex items-center gap-2">
                        <span className="text-dn-text-muted text-xs">陣営:</span>
                        <span
                            className="font-bold text-sm px-2 py-0.5 rounded"
                            style={{ color: info.teamColor, backgroundColor: `${info.teamColor}20` }}
                        >
                            {info.team}
                        </span>
                    </div>

                    {/* Win Condition */}
                    <div className="bg-dn-bg-secondary/50 rounded-lg p-3 border border-dn-border/30">
                        <div className="text-dn-accent font-bold text-xs mb-1">勝利条件</div>
                        <p className="text-white text-sm">{info.winCondition}</p>
                    </div>

                    {/* Description */}
                    <p className="text-dn-text-secondary text-sm leading-relaxed">{info.description}</p>

                    {/* Special Cards */}
                    {info.specialCards.length > 0 && (
                        <div className="bg-dn-bg-secondary/50 rounded-lg p-3 border border-dn-border/30">
                            <div className="text-dn-accent font-bold text-xs mb-2">専用カード</div>
                            <div className="flex flex-wrap gap-2">
                                {info.specialCards.map((sc) => (
                                    <div key={sc.id} className="flex items-center gap-1.5 bg-dn-bg-primary/50 px-2 py-1 rounded border border-dn-border/20">
                                        <span className="text-dn-accent text-[10px] font-bold">No.{sc.id}</span>
                                        <span className="text-white text-xs font-bold">{sc.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
