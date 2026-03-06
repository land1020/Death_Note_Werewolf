import {
    GameState,
    Player,
    Card,
    WinCondition,
    TransferInfo,
    Role
} from '../../../shared/types/index.js';

// =====================================================
// カード効果の結果型定義
// =====================================================

export interface CardEffectResult {
    success: boolean;
    message?: string;
    gameEnd?: boolean;
    winner?: WinCondition;
    revealedInfo?: RevealedInfo;
    transfers?: TransferInfo[];
    requiresConfirmation?: string[]; // playerIds that must confirm
    deadPlayerId?: string; // Player who died due to effect
}

export interface RevealedInfo {
    visibleTo: string[];
    type: 'role' | 'hand' | 'card' | 'vote_result' | 'shinigami' | 'arrest';
    targetId?: string;
    targetRole?: Role;
    targetHand?: Card[];
    targetCard?: Card;
    voteResults?: VoteResult[];
    shinigamiInfo?: ShinigamiInfo;
    arrestResult?: 'success' | 'failed' | 'denied';
    reason?: 'gun_mello';
}

export interface VoteResult {
    voterId: string;
    voterName: string;
    targetId: string;
    targetName: string;
}

export interface ShinigamiInfo {
    kiraId?: string;
    kiraName?: string;
    deathNoteHolderId?: string;
    deathNoteHolderName?: string;
}

export interface ArrestResult {
    success: boolean;
    denied: boolean;
    winner?: WinCondition;
}

// =====================================================
// カード効果プロセッサ
// =====================================================

export class CardEffectProcessor {

    // ==================== 逮捕 (ARREST) ====================
    static processArrest(
        state: GameState,
        userId: string,
        targetId: string
    ): CardEffectResult {
        const user = state.players.find(p => p.id === userId);
        const target = state.players.find(p => p.id === targetId);

        if (!user || !target) {
            return { success: false, message: 'プレイヤーが見つかりません' };
        }

        // L陣営（L, 警察, ワタリ）のみ使用可能
        const canArrest = user.role === 'L' || user.role === 'POLICE' || user.role === 'WATARI';
        if (!canArrest) {
            return { success: false, message: '捜査員のみが逮捕を使用できます' };
        }

        if (target.role === 'KIRA') {
            // キラの場合、アリバイチェック
            // 逮捕カード防護はゲーム中に一度のみ。
            const alibi = target.hand.find(
                c => c.id === 4 && !c.isUsed // CardId.ALIBI = 4
            );

            if (alibi && !target.hasUsedAlibi) {
                alibi.isUsed = true;
                target.hasUsedAlibi = true; // 1度しか使えないようにフラグを立てる
                return {
                    success: true, // アニメーション発動のためtrue
                    message: `${target.name}は逮捕を否認しました`,
                    revealedInfo: {
                        visibleTo: state.players.map(p => p.id),
                        type: 'arrest',
                        targetId: target.id,
                        targetRole: target.role as Role,
                        arrestResult: 'denied'
                    }
                };
            }

            // L陣営勝利
            return {
                success: true,
                gameEnd: true,
                winner: 'L_WINS' as WinCondition,
                message: 'キラを逮捕しました！L陣営の勝利！',
                revealedInfo: {
                    visibleTo: state.players.map(p => p.id),
                    type: 'arrest',
                    targetId: target.id,
                    targetRole: target.role as Role,
                    arrestResult: 'success'
                }
            };
        }

        // キラ以外 → 続行
        return {
            success: true, // アニメーション発動のためtrue
            message: `${target.name}はキラではありませんでした`,
            revealedInfo: {
                visibleTo: state.players.map(p => p.id),
                type: 'arrest',
                targetId: target.id,
                targetRole: target.role as Role,
                arrestResult: 'failed'
            }
        };
    }

    // ==================== 拳銃 (GUN) ====================
    static processGun(
        state: GameState,
        userId: string,
        targetId: string
    ): CardEffectResult {
        const user = state.players.find(p => p.id === userId);
        const target = state.players.find(p => p.id === targetId);

        if (!user || !target) {
            return { success: false, message: 'プレイヤーが見つかりません' };
        }

        const isPoliceTeam = user.role === 'L' || user.role === 'POLICE' || user.role === 'WATARI';

        if (isPoliceTeam) {
            // 警察: ターゲットの最小番号カードを公開
            if (target.hand.length === 0) {
                return { success: true, message: `${target.name}の手札は空です` };
            }

            // ルール: "カードの番号を変えずに" -> 絶対的な最小値を取得
            // 内部ID順でソートして最小を取得
            const lowestCard = target.hand.reduce(
                (min, c) => c.id < min.id ? c : min
            );

            return {
                success: true,
                message: `${target.name}の最小カード: ${lowestCard.name}`,
                revealedInfo: {
                    visibleTo: state.players.map(p => p.id), // 全員に公開
                    type: 'card',
                    targetId: target.id,
                    targetCard: lowestCard
                }
            };
        }

        if (user.role === 'MELLO') {
            // メロ: ターゲットを殺害、自分の正体公開
            // ※ isAlive = false は processDeath で処理するため、ここでは設定しない

            return {
                success: true,
                message: `メロが${target.name}を射殺しました！`,
                deadPlayerId: target.id,
                revealedInfo: {
                    visibleTo: state.players.map(p => p.id),
                    type: 'role',
                    targetId: user.id,
                    targetRole: 'MELLO' as Role,
                    reason: 'gun_mello'
                }
            };
        }

        return { success: false, message: '拳銃を使用できません' };
    }

    // ==================== 目撃 (WITNESS) ====================
    static processWitness(
        state: GameState,
        userId: string,
        targetId: string
    ): CardEffectResult {
        const target = state.players.find(p => p.id === targetId);

        if (!target) {
            return { success: false, message: 'プレイヤーが見つかりません' };
        }

        return {
            success: true,
            message: `${target.name}の役職を確認しました`,
            revealedInfo: {
                visibleTo: [userId], // 使用者のみ
                type: 'role',
                targetId: target.id,
                targetRole: target.role!
            }
        };
    }

    // ==================== 監視 (SURVEILLANCE) ====================
    static processSurveillance(
        state: GameState,
        userId: string,
        targetId: string
    ): CardEffectResult {
        const target = state.players.find(p => p.id === targetId);

        if (!target) {
            return { success: false, message: 'プレイヤーが見つかりません' };
        }

        return {
            success: true,
            message: `${target.name}の手札を確認しました`,
            revealedInfo: {
                visibleTo: [userId], // 使用者のみ
                type: 'hand',
                targetId: target.id,
                targetHand: target.hand
            }
        };
    }

    // ==================== 投票 (VOTE) ====================
    static initVote(state: GameState): CardEffectResult {
        const alivePlayers = state.players.filter(p => p.isAlive);
        return {
            success: true,
            message: '投票を開始します',
            requiresConfirmation: alivePlayers.map(p => p.id)
        };
    }

    static processVoteResults(
        state: GameState,
        votes: Map<string, string>
    ): CardEffectResult {
        const voteResults: VoteResult[] = [];
        for (const [voterId, targetId] of votes.entries()) {
            const voter = state.players.find(p => p.id === voterId);
            const target = state.players.find(p => p.id === targetId);
            if (voter && target) {
                voteResults.push({
                    voterId,
                    voterName: voter.name,
                    targetId,
                    targetName: target.name
                });
            }
        }
        return {
            success: true,
            message: '投票結果',
            revealedInfo: {
                visibleTo: state.players.map(p => p.id),
                type: 'vote_result',
                voteResults
            }
        };
    }

    // ==================== 交換 (EXCHANGE) ====================
    // ==================== 交換 (EXCHANGE) ====================
    static processExchange(
        state: GameState,
        userId: string,
        targetId: string,
        cardInstanceId: string // 使用された交換カードのID
    ): CardEffectResult {
        const user = state.players.find(p => p.id === userId);
        const target = state.players.find(p => p.id === targetId);

        if (!user || !target) {
            return { success: false, message: 'プレイヤーが見つかりません' };
        }

        if (!target.isAlive) {
            return { success: false, message: '無効なターゲットです' };
        }

        if (target.hand.length === 0) {
            return { success: false, message: `${target.name}の手札は空です` };
        }

        // Phase 1: 使用者が渡すカードを選択する
        // 手札に交換カード以外のカードがない場合
        const userHandWithoutExchange = user.hand.filter(c => c.instanceId !== cardInstanceId);
        if (userHandWithoutExchange.length === 0) {
            return { success: false, message: '渡せるカードが手札にありません' };
        }

        // Pending状態を設定し、使用者のカード選択を待つ
        state.pendingExchange = {
            userId,
            targetId,
            cardInstanceId, // これは使用されたExchangeカードのID
            phase: 'USER_SELECTING',
            startTime: Date.now()
        };

        return {
            success: true,
            message: '渡すカードを選択してください...',
        };
    }

    // ==================== 取調 (INTERROGATION) ====================
    static processInterrogation(
        state: GameState,
        direction: 'LEFT' | 'RIGHT',
        cardSelections: Map<string, string>
    ): CardEffectResult {
        const alivePlayers = state.players.filter(p => p.isAlive);
        const transfers: TransferInfo[] = [];

        // プレイヤーの並び順に基づいて次（渡す相手）を決定
        for (let i = 0; i < alivePlayers.length; i++) {
            const giver = alivePlayers[i];

            // direction: 'LEFT' (時計回り/左隣) か 'RIGHT' (反時計回り/右隣)
            // 配列のインデックス操作:
            // LEFT (next): (i + 1)
            // RIGHT (prev): (i - 1)

            const receiverIndex = direction === 'LEFT'
                ? (i + 1) % alivePlayers.length
                : (i - 1 + alivePlayers.length) % alivePlayers.length;

            const receiver = alivePlayers[receiverIndex];

            const cardId = cardSelections.get(giver.id);
            if (!cardId) {
                // 自動選択: 選択がない場合、最小のカードを自動で選ぶ (フェイルセーフ)
                const minCard = giver.hand.reduce((min, c) => c.id < min.id ? c : min, giver.hand[0]);
                if (minCard) cardSelections.set(giver.id, minCard.instanceId);
            }
        }

        // 全員の選択が整った前提で移動処理
        // 注意: 同時に移動するため、まず全ての移動対象を取り出してから、それぞれに追加する
        // さもないと、「受け取ったばかりのカードをまた渡す」ことになりかねない

        const moves: { giver: Player, receiver: Player, card: Card, cardIndex: number }[] = [];

        for (let i = 0; i < alivePlayers.length; i++) {
            const giver = alivePlayers[i];
            const receiverIndex = direction === 'LEFT'
                ? (i + 1) % alivePlayers.length
                : (i - 1 + alivePlayers.length) % alivePlayers.length;
            const receiver = alivePlayers[receiverIndex];

            const cardInstanceId = cardSelections.get(giver.id);
            if (!cardInstanceId) continue;

            const cardIndex = giver.hand.findIndex(c => c.instanceId === cardInstanceId);
            if (cardIndex === -1) continue;

            moves.push({
                giver,
                receiver,
                card: giver.hand[cardIndex],
                cardIndex
            });
        }

        // 移動実行
        // まず手札から削除
        for (const move of moves) {
            move.giver.hand.splice(move.cardIndex, 1);
        }
        // 次に手札へ追加
        for (const move of moves) {
            move.receiver.hand.push(move.card);
            transfers.push({
                fromPlayerId: move.giver.id,
                fromPlayerName: move.giver.name,
                toPlayerId: move.receiver.id,
                toPlayerName: move.receiver.name,
                card: move.card,
                direction
            });
        }

        return {
            success: true,
            message: `取調完了（${direction === 'LEFT' ? '左' : '右'}回り）`,
            transfers
        };
    }

    // ==================== 死神の目 (SHINIGAMI) ====================
    static processShinigami(state: GameState): CardEffectResult {
        const kira = state.players.find(p => p.role === 'KIRA');
        const deathNoteHolder = state.players.find(p =>
            p.hand.some(c => c.id === 0)
        );

        const shinigamiInfo: ShinigamiInfo = {
            kiraId: kira?.id,
            kiraName: kira?.name,
            deathNoteHolderId: deathNoteHolder?.id,
            deathNoteHolderName: deathNoteHolder?.name
        };

        const visibleTo: string[] = [];
        state.players.forEach(p => {
            if (p.role === 'KIRA' || p.role === 'MISA') {
                visibleTo.push(p.id);
            }
        });

        return {
            success: true,
            message: '死神の目が発動しました',
            revealedInfo: {
                visibleTo,
                type: 'shinigami',
                shinigamiInfo
            }
        };
    }

}

// =====================================================
// 番号変更可否チェック
// =====================================================

export function canModifyCardNumber(player: Player, card: Card): boolean {
    // キラがデスノートを所持している場合、任意のカードの番号を読み替え可能
    if (player.role === 'KIRA' && player.hand.some(c => c.id === 0)) {
        return true;
    }

    const rules: Record<string, number[]> = {
        KIRA: [0],    // DEATH_NOTE
        L: [1],       // ARREST
        POLICE: [2],  // GUN
        WATARI: [1],  // ARREST
        MISA: [],
        MELLO: [],
    };
    return player.role ? (rules[player.role]?.includes(card.id) ?? false) : false;
}

// 番号変更能力チェック
export function checkCanModifyNumber(player: Player): boolean {
    // キラがデスノートを所持している場合、任意のカードで番号読み替え可能
    if (player.role === 'KIRA' && player.hand.some(c => c.id === 0)) {
        return true;
    }

    // その人の役職が番号変更可能なカードを持っているか
    const modifyRules: Record<string, number[]> = {
        KIRA: [0],      // デスノートのみ
        L: [1],         // 逮捕のみ
        POLICE: [2],    // 拳銃のみ
        WATARI: [1],    // 逮捕のみ
        MISA: [],
        MELLO: [],
    };

    const role = player.role;
    if (!role) return false;

    const modifiableCardIds = modifyRules[role] || [];

    // 手札に変更可能なカードがあるか
    return player.hand.some(card => modifiableCardIds.includes(card.id));
}

