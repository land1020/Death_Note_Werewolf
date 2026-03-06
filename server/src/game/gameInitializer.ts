import type { Player, Card, Role, Team, GameState, GamePhase, CardId, DeckConfig, RoleConfig } from '../../../shared/types/index.js';

// CardId定数（ESMでenumがエクスポートされない問題を回避）
const CARD_IDS = {
    DEATH_NOTE: 0 as CardId,
    ARREST: 1 as CardId,
    GUN: 2 as CardId,
    FAKE_NAME: 3 as CardId,
    ALIBI: 4 as CardId,
    WITNESS: 5 as CardId,
    SURVEILLANCE: 6 as CardId,
    VOTE: 7 as CardId,
    EXCHANGE: 8 as CardId,
    INTERROGATION: 9 as CardId,
    SHINIGAMI: 13 as CardId,
};

// Role定数
const ROLES = {
    KIRA: 'KIRA' as Role,
    MISA: 'MISA' as Role,
    L: 'L' as Role,
    POLICE: 'POLICE' as Role,
    WATARI: 'WATARI' as Role,
    MELLO: 'MELLO' as Role,
};

// Team定数
const TEAMS = {
    KIRA: 'KIRA' as Team,
    L: 'L' as Team,
    THIRD: 'THIRD' as Team,
};

// GamePhase定数
const PHASES = {
    INVESTIGATION: 'INVESTIGATION' as GamePhase,
};

/**
 * カード名を取得
 */
function getCardName(id: CardId): string {
    const names: Record<number, string> = {
        0: 'デスノート',
        1: '逮捕',
        2: '拳銃',
        3: '偽名',
        4: 'アリバイ',
        5: '目撃',
        6: '監視',
        7: '投票',
        8: '交換',
        9: '取調',
        13: '死神',
    };
    return names[id as number] || `カード${id}`;
}

/**
 * 役職を配布する
 */
export function assignRoles(players: Player[], roleConfig: RoleConfig): Player[] {
    const playerCount = players.length;
    const roles: Role[] = [];

    // 設定された役職構成を取得（4-8人の設定があるはず）
    const config = roleConfig[playerCount];

    if (config) {
        // 設定に基づき役職リストを作成
        for (const [role, count] of Object.entries(config)) {
            for (let i = 0; i < (count as number); i++) {
                roles.push(role as Role);
            }
        }
    }

    // もし人数が足りない、または設定がない場合のフォールバック（警察で埋める）
    while (roles.length < playerCount) {
        roles.push(ROLES.POLICE);
    }
    // もし人数が多すぎる場合は切り詰める（シャッフル前に実行）
    if (roles.length > playerCount) {
        roles.splice(playerCount);
    }

    // シャッフル
    const shuffledRoles = shuffleArray([...roles]);

    // プレイヤーに役職を割り当て
    return players.map((player, index) => {
        const role = shuffledRoles[index];
        const team = getTeamForRole(role);
        return {
            ...player,
            role,
            team,
        };
    });
}

/**
 * 役職からチームを取得
 */
function getTeamForRole(role: Role): Team {
    switch (role) {
        case ROLES.KIRA:
        case ROLES.MISA:
            return TEAMS.KIRA;
        case ROLES.L:
        case ROLES.POLICE:
        case ROLES.WATARI:
            return TEAMS.L;
        case ROLES.MELLO:
            return TEAMS.THIRD;
        default:
            return TEAMS.L;
    }
}

/**
 * デッキを作成
 */
export function createDeck(playerCount: number, deckConfig: DeckConfig): Card[] {
    const cards: Card[] = [];
    let instanceId = 0;

    const configForCount = deckConfig[playerCount] || deckConfig[4] || deckConfig[8];

    const addCards = (cardId: CardId, count: number) => {
        for (let i = 0; i < count; i++) {
            cards.push({
                id: cardId,
                name: getCardName(cardId),
                instanceId: `card-${instanceId++}`,
                isUsed: false,
            });
        }
    };

    if (configForCount) {
        for (const [idStr, count] of Object.entries(configForCount)) {
            addCards(parseInt(idStr) as CardId, Number(count));
        }
    }

    return shuffleArray(cards);
}

/**
 * 初期手札を配る
 */
export function dealInitialHands(players: Player[], deck: Card[]): { players: Player[]; deck: Card[] } {
    const playerCount = players.length;

    // 1. デスノートと逮捕を1枚ずつ抜く
    const deathNoteIndex = deck.findIndex(c => c.id === CARD_IDS.DEATH_NOTE);
    const deathNote = deck[deathNoteIndex];
    const arrestIndex = deck.findIndex(c => c.id === CARD_IDS.ARREST);
    const arrest = deck[arrestIndex];

    const remaining = deck.filter((_, idx) => idx !== deathNoteIndex && idx !== arrestIndex);

    // 2. 残りから (人数×2 - 2) 枚をランダムに引く
    const drawCount = playerCount * 2 - 2;
    const shuffled = shuffleArray(remaining);
    const drawn = shuffled.slice(0, drawCount);
    const newDeck = shuffled.slice(drawCount);

    // 3. デスノート + 逮捕 + 引いたカード を混ぜて配布
    const toDistribute = shuffleArray([deathNote, arrest, ...drawn]);

    const updatedPlayers = [...players];
    for (let i = 0; i < playerCount; i++) {
        const hand = [toDistribute[i * 2], toDistribute[i * 2 + 1]];
        // 初期手札に死神カードが含まれる場合、isInitialHandフラグを設定
        // ドロー前に自動発動させないための仕組み
        hand.forEach(card => {
            if (card.id === CARD_IDS.SHINIGAMI) {
                card.isInitialHand = true;
            }
        });
        updatedPlayers[i].hand = hand;
    }

    return { players: updatedPlayers, deck: newDeck };
}

/**
 * 配列をシャッフル（Fisher-Yates）
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * 初回ゲーム状態を構築
 */
export function initializeGame(
    roomCode: string,
    players: Player[],
    roleConfig: RoleConfig,
    deckConfig: DeckConfig
): GameState {
    // 観戦プレイヤーと参加プレイヤーを分ける
    const playingPlayers = players.filter(p => !p.isSpectator);
    const spectatorPlayers = players.filter(p => p.isSpectator);

    // プレイヤーの初期配置をランダムにする (参加者のみ)
    const shuffledPlayers = shuffleArray(playingPlayers);

    // 役職配布
    let gamePlayers = assignRoles(shuffledPlayers, roleConfig);

    // デッキ作成
    let deck = createDeck(playingPlayers.length, deckConfig);

    // 初期手札配布
    const result = dealInitialHands(gamePlayers, deck);
    gamePlayers = result.players;
    deck = result.deck;

    // 観戦プレイヤーをリストに戻す（役職なし、手札なし、生存扱いだがターンは回ってこないよう後で調整、あるいは isAlive = false にする等の工夫が必要か。今回は単純にリストにはいれるがisAlive=falseにする）
    const allPlayers = [
        ...gamePlayers,
        ...spectatorPlayers.map(p => ({
            ...p,
            role: null,
            team: null,
            hand: [],
            isAlive: false // 観戦者は行動しないので死亡扱いと同等にする
        }))
    ];


    // 最初に行動するプレイヤーをランダムに選ぶ（=スタートプレイヤー、参加者からのみ選ぶ）
    const startIndex = Math.floor(Math.random() * gamePlayers.length);
    const startPlayerId = gamePlayers[startIndex].id;

    return {
        roomCode,
        phase: PHASES.INVESTIGATION,
        round: 1,
        turnIndex: 0,
        turnCycle: 0,
        currentPlayerId: startPlayerId,
        startPlayerId: startPlayerId,
        players: allPlayers,
        deck,
        discardPile: [],
        roundDiscardPile: [],
        removedCards: [],
        kiraMisaChat: [],
        winner: null,
        publicInfo: {
            revealedCards: [],
            revealedRoles: [],
            lastDiscard: null,
            transferHistory: [],
        },
        hasDrawnCard: false, // 初期化
    };
}
