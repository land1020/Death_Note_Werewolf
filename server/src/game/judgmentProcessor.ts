import type {
    GameState,
    Player,
    WinCondition,
    Role,
    ChatMessage
} from '../../../shared/types/index.js';

// =====================================================
// 裁きの時間の結果型定義
// =====================================================

export interface JudgmentResult {
    targetId: string | null;    // null = スキップ
    targetName: string | null;
    survived: boolean;
    usedFakeName: boolean;
    eliminatedRole?: Role;
}

export interface JudgmentPhaseState {
    isActive: boolean;
    startTime: number;
    kiraHasDeathNote: boolean;
    selectedTargetId: string | null;
    isConfirmed: boolean;
}

// =====================================================
// 裁きの時間プロセッサ
// =====================================================

export class JudgmentProcessor {

    // 裁きの時間を開始
    static startJudgment(state: GameState): {
        state: GameState;
        kiraHasDeathNote: boolean;
        kiraId: string | null;
        misaId: string | null;
        misaName: string | null;
    } {
        const kira = state.players.find((p: Player) => p.role === 'KIRA' && p.isAlive);
        const misa = state.players.find((p: Player) => p.role === 'MISA' && p.isAlive);

        const kiraHasDeathNote = kira
            ? kira.hand.some((c) => c.id === 0) // DEATH_NOTE
            : false;

        // チャットをクリア
        state.kiraMisaChat = [];

        return {
            state,
            kiraHasDeathNote,
            kiraId: kira?.id || null,
            misaId: misa?.id || null,
            misaName: misa?.name || null
        };
    }

    // キラ・ミサチャット送信
    static sendKiraMisaMessage(
        state: GameState,
        playerId: string,
        message: string
    ): GameState {
        const player = state.players.find((p: Player) => p.id === playerId);

        if (!player || (player.role !== 'KIRA' && player.role !== 'MISA')) {
            throw new Error('Only Kira and Misa can use this chat');
        }

        if (!state.kiraMisaChat) {
            state.kiraMisaChat = [];
        }

        state.kiraMisaChat.push({
            playerId,
            playerName: player.name,
            message,
            timestamp: Date.now()
        });

        return state;
    }

    // 裁きを実行
    static executeJudgment(
        state: GameState,
        targetId: string | null
    ): JudgmentResult {
        // スキップの場合
        if (!targetId) {
            return {
                targetId: null,
                targetName: null,
                survived: true,
                usedFakeName: false
            };
        }

        const target = state.players.find((p: Player) => p.id === targetId);
        if (!target) {
            return {
                targetId: null,
                targetName: null,
                survived: true,
                usedFakeName: false
            };
        }

        // 偽名カードチェック
        const fakeName = target.hand.find((c) => c.id === 3 && !c.isUsed); // FAKE_NAME

        if (fakeName) {
            // 偽名で生存
            fakeName.isUsed = true;
            return {
                targetId: target.id,
                targetName: target.name,
                survived: true,
                usedFakeName: true
            };
        }

        // 死亡
        return {
            targetId: target.id,
            targetName: target.name,
            survived: false,
            usedFakeName: false,
            eliminatedRole: target.role ?? undefined
        };
    }

    // プレイヤーを脱落させる
    static eliminatePlayer(state: GameState, playerId: string): GameState {
        const player = state.players.find((p: Player) => p.id === playerId);
        if (!player) return state;

        // プレイヤーを脱落状態に
        player.isAlive = false;

        // 役職を公開
        if (!state.publicInfo.revealedRoles) {
            state.publicInfo.revealedRoles = [];
        }
        state.publicInfo.revealedRoles.push({
            playerId: player.id,
            role: player.role!
        });

        // 手札を捨て札プールに移動し、履歴を「死亡」として記録
        if (!state.publicInfo.revealedCards) {
            state.publicInfo.revealedCards = [];
        }
        for (const card of player.hand) {
            if (!card.history) card.history = [];
            card.history.push(`${player.name}が死亡した`);
            card.usedByName = player.name;
            card.usedByColor = player.color;

            // 公開情報に追加
            state.publicInfo.revealedCards.push({
                playerId: player.id,
                playerName: player.name,
                card,
                reason: 'DEATH' as any,
            });

            state.discardPile.push(card);
        }
        player.hand = [];

        return state;
    }

    // 勝敗チェック
    static checkWinCondition(state: GameState): WinCondition | null {
        const kira = state.players.find((p: Player) => p.role === 'KIRA');
        const alivePlayers = state.players.filter((p: Player) => p.isAlive);
        const aliveL = alivePlayers.filter((p: Player) => p.role === 'L');
        const aliveLTeam = alivePlayers.filter((p: Player) =>
            ['L', 'POLICE', 'WATARI'].includes(p.role!)
        );
        const aliveKiraTeam = alivePlayers.filter((p: Player) =>
            ['KIRA', 'MISA'].includes(p.role!)
        );

        // キラが死亡 → L勝利
        if (kira && !kira.isAlive) {
            if (state.winner) return state.winner;
            return 'L_WINS' as WinCondition;
        }

        // Lが死亡 → キラ勝利
        if (aliveL.length === 0) {
            return 'KIRA_WINS' as WinCondition;
        }

        // L陣営が1人以下 → キラ勝利
        if (aliveLTeam.length <= 1) {
            return 'KIRA_WINS' as WinCondition;
        }

        // キラ陣営が全滅 → L勝利
        if (aliveKiraTeam.length === 0) {
            return 'L_WINS' as WinCondition;
        }

        return null;
    }
}
