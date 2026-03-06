// =====================================================
// デスノート人狼 - 共有型定義
// =====================================================

// =====================================================
// Enums
// =====================================================

/**
 * プレイヤーの役職
 */
export enum Role {
    KIRA = 'KIRA',       // キラ（夜神月）
    MISA = 'MISA',       // 信者（弥海ミサ）
    L = 'L',             // L
    POLICE = 'POLICE',   // 警察
    WATARI = 'WATARI',   // ワタリ
    MELLO = 'MELLO',     // メロ
}

/**
 * チーム（陣営）
 */
export enum Team {
    KIRA = 'KIRA',
    L = 'L',
    THIRD = 'THIRD',
}

/**
 * ゲームフェーズ
 */
export enum GamePhase {
    LOBBY = 'LOBBY',
    SETUP = 'SETUP',
    WATARI_CONFIRM = 'WATARI_CONFIRM',
    INVESTIGATION = 'INVESTIGATION',
    CARD_DRAW = 'CARD_DRAW',
    CARD_ACTION = 'CARD_ACTION',
    CARD_EFFECT = 'CARD_EFFECT',
    JUDGMENT = 'JUDGMENT',
    JUDGMENT_RESULT = 'JUDGMENT_RESULT',
    GAME_END = 'GAME_END',
}

/**
 * 勝利条件
 */
export enum WinCondition {
    KIRA_WINS = 'KIRA_WINS',
    L_WINS = 'L_WINS',
    MELLO_WINS = 'MELLO_WINS',
}

/**
 * カードID
 */
export enum CardId {
    DEATH_NOTE = 0,
    ARREST = 1,
    GUN = 2,
    FAKE_NAME = 3,
    ALIBI = 4,
    WITNESS = 5,
    SURVEILLANCE = 6,
    VOTE = 7,
    EXCHANGE = 8,
    INTERROGATION = 9,
    SHINIGAMI = 13,
}

// =====================================================
// Interfaces
// =====================================================

/**
 * カード
 */
export interface Card {
    id: CardId;
    name: string;
    instanceId: string;
    isUsed: boolean;
    history?: string[]; // 使用履歴のテキストリスト
    usedByColor?: string; // 使用・手放したプレイヤーのカラー
    usedByName?: string; // 使用・手放したプレイヤー名
    isInitialHand?: boolean; // 初期配布カードフラグ（死神の自動発動を抑制）
}

/**
 * プレイヤー
 */
export interface Player {
    id: string;
    name: string;
    role: Role | null;
    team: Team | null;
    hand: Card[];
    isAlive: boolean;
    isConnected: boolean;
    isHost: boolean;
    isSpectator?: boolean; // 観戦モードフラグ
    color?: string; // プレイヤーカラー（HEXカラーコード）
    hasUsedAlibi?: boolean; // アリバイを使用して逮捕を防いだことがあるか
}


/**
 * デッキ構成
 * 人数 -> カードID -> 枚数 のマッピング
 */
export type DeckConfig = Record<number, Record<CardId, number>>;

/**
 * 役職構成
 * 人数 -> 役職 -> 人数 のマッピング
 */
export type RoleConfig = Record<number, Record<Role, number>>;

/**
 * ルーム
 */
export interface Room {
    code: string;
    players: Player[];
    maxPlayers: number;
    useMello: boolean;
    hostId: string;
    isDebug?: boolean;
    deckConfig: DeckConfig;
    roleConfig: RoleConfig;
}

// ... existing interfaces ...



/**
 * チャットメッセージ（キラ-ミサチャット用）
 */
export interface ChatMessage {
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
}

/**
 * カード移動履歴
 */
export interface TransferInfo {
    fromPlayerId: string;
    fromPlayerName: string;
    toPlayerId: string;
    toPlayerName: string;
    card: Card;
    direction: 'LEFT' | 'RIGHT';
}

/**
 * 公開されたカード情報
 */
export interface RevealedCard {
    playerId: string;
    playerName: string;
    card: Card;
    reason: 'GUN' | 'SURVIVAL' | 'DEATH';
}

/**
 * 公開情報
 */
export interface PublicInfo {
    revealedCards: RevealedCard[];
    revealedRoles: { playerId: string; role: Role }[];
    lastDiscard: Card | null;
    transferHistory: TransferInfo[];
}

/**
 * ゲーム状態
 */

// =====================================================
// Exchange Types
// =====================================================

export interface PendingExchange {
    userId: string;
    targetId: string;
    cardInstanceId: string;
    phase: 'USER_SELECTING' | 'TARGET_SELECTING';
    startTime: number;
    exchangeCard?: Card; // 使用された交換カードのインスタンス
    userSelectedCardInstanceId?: string; // 使用者が渡すために選んだカードのID
}

export interface GameState {
    roomCode: string;
    phase: GamePhase;
    round: number;
    turnIndex: number;
    turnCycle: number;
    currentPlayerId: string;
    startPlayerId: string; // ラウンドの最初に行動開始するプレイヤー
    players: Player[];
    deck: Card[];
    discardPile: Card[];
    roundDiscardPile: Card[]; // 現在の1巡内で使われた捨て札
    removedCards: Card[];
    kiraMisaChat: ChatMessage[];
    winner: WinCondition | null;
    publicInfo: PublicInfo;
    hasDrawnCard: boolean;
    drawnCardInstanceId?: string | null; // 今ターンに引いたカードのID（引き直し処理用）

    // 進行中のアクション（投票、取調など）
    pendingAction?: {
        type: 'VOTE' | 'INTERROGATION' | 'JUDGMENT';
        initiatorId?: string; // 取調の場合
        direction?: 'LEFT' | 'RIGHT'; // 取調の場合
        votes?: Record<string, string>; // 投票用: voterId -> targetId
        cardSelections?: Record<string, string>; // 取調用: playerId -> cardInstanceId
        startTime?: number; // タイムアウト用
    };

    // デバッグモード
    isDebug?: boolean;

    // 交換完了待ち
    pendingExchange?: PendingExchange | null;
    judgmentResult?: {
        eliminatedPlayerId: string | null;
        votes: Record<string, string>;
        targetName?: string;
        survived?: boolean;
        usedFakeName?: boolean;
        targetRole?: Role;
    } | null;

    // キラが逮捕されたかどうか（リザルト画面表示用）
    kiraArrested?: boolean;
}

// =====================================================
// Redux Store Types
// =====================================================

/**
 * ルーム状態（Redux）
 */
export interface RoomState {
    code: string | null;
    players: Player[];
    isHost: boolean;
    myPlayerId: string | null;
    maxPlayers: number;
    useMello: boolean;
    isDebug?: boolean;
    deckConfig: DeckConfig;
    roleConfig: RoleConfig;
}

/**
 * UI状態（Redux）
 */
export type ModalType =
    | 'settings'
    | 'roleInfo'
    | 'cardInfo'
    | 'playerAction'
    | 'confirmation'
    | null;

export interface UIState {
    isLoading: boolean;
    error: string | null;
    modal: ModalType;
    selectedCard: Card | null;
    selectedPlayer: string | null;
}

/**
 * ルート状態（Redux）
 */
export interface RootState {
    room: RoomState;
    game: GameState;
    ui: UIState;
}

// =====================================================
// Socket Event Types
// =====================================================

/**
 * クライアント→サーバー イベント
 */
export interface ClientToServerEvents {
    // ロビー
    'room:create': (data: { playerName: string; maxPlayers: number; useMello: boolean; isDebug?: boolean; deckConfig?: DeckConfig }) => void;
    'room:addNpc': () => void; // Debug only
    'debug:getLogs': () => void;
    'room:join': (data: { playerName: string; roomCode: string }) => void;
    'room:leave': () => void;
    'room:start': () => void;
    'room:toggleSpectator': (data: { isSpectator: boolean }) => void; // 観戦モード切り替え
    'player:selectColor': (data: { color: string | null }) => void; // プレイヤーカラー選択

    // ゲーム
    'game:drawCard': () => void;
    'game:useCard': (data: {
        cardInstanceId: string;
        targetPlayerId?: string;
        exchangeCardId?: string; // 旧仕様互換のため残すが、基本は Phase 1 で使用
        direction?: 'LEFT' | 'RIGHT'; // 取調用
    }) => void;
    'game:discardCard': (data: { cardInstanceId: string }) => void;
    'game:transferCard': (data: { cardInstanceId: string; direction: 'LEFT' | 'RIGHT' }) => void;
    'game:selectCard': (data: { cardInstanceId: string }) => void; // 取調などのカード選択用
    'game:endTurn': () => void;
    'game:redrawStuckHand': () => void; // 手札が使用不可な場合の引き直し

    // 交換関連
    'exchange:targetSelectedCard': (data: { selectedCardInstanceId: string }) => void;
    'exchange:userSelectedCard': (data: {
        selectedCardInstanceId: string;
        targetId: string;
        exchangeCardInstanceId: string;
    }) => void;

    // 死神演出完了
    'game:shinigamiFinished': () => void;
    'game:gunFinished': () => void;
    'game:arrestFinished': () => void;

    // 裁きの時間
    'judgment:vote': (data: { targetPlayerId: string }) => void;

    // チャット
    'chat:send': (data: { message: string }) => void;
    'chat:kiraMisa': (data: { message: string }) => void;

    // 接続
    'ping': () => void;
}

/**
 * サーバー→クライアント イベント
 */
export interface ServerToClientEvents {
    // ロビー
    'room:created': (data: { roomCode: string; playerId: string }) => void;
    'room:joined': (data: { playerId: string }) => void;
    'room:updated': (data: { room: Room }) => void;
    'room:error': (data: { message: string }) => void;

    // ゲーム
    'game:started': (data: { gameState: GameState }) => void;
    'game:updated': (data: { gameState: Partial<GameState> }) => void;
    'game:cardDrawn': (data: { playerId: string; card?: Card }) => void;
    'game:cardUsed': (data: { playerId: string; playerName?: string; cardId: CardId; targetPlayerId?: string; direction?: 'LEFT' | 'RIGHT'; cardName?: string }) => void;
    'game:cardDiscarded': (data: { playerId: string; playerName?: string; cardName?: string }) => void;
    'game:cardTransferred': (data: { transfers: TransferInfo[] }) => void;
    'game:roleRevealed': (data: { playerId: string; role: Role }) => void;
    'game:playerDied': (data: { playerId: string; cause: string }) => void;
    'game:state': (data: { gameState: GameState }) => void;
    'game:phaseChanged': (data: { phase: GamePhase }) => void;
    'game:error': (data: { message: string }) => void;
    'game:ended': (data: { winner: WinCondition; finalState: GameState }) => void;

    // 交換関連
    'exchange:selectCardToGive': (data: {
        requesterId: string;
        requesterName: string;
        yourHand: Card[];
        canModifyNumber: boolean;
    }) => void;
    'exchange:waiting': (data: {
        userId: string;
        targetId: string;
        message: string;
    }) => void;
    'exchange:selectCardToReturn': (data: {
        receivedCard: Card;
        yourHand: Card[];
        targetId: string;
        targetName: string;
        exchangeCardInstanceId: string;
    }) => void;
    'exchange:progress': (data: { message: string }) => void;
    'exchange:complete': (data: {
        userId: string;
        userName: string;
        targetId: string;
        targetName: string;
    }) => void;
    'exchange:targetNotification': (data: {
        message: string;
        cardName: string;
    }) => void;

    // カットシーン再生
    'game:playCutscene': (data: { type: 'SHINIGAMI' | 'GUN' | 'ARREST' | 'JUDGMENT' }) => void;
    // 効果公開（死神の結果表示など）
    'game:effectReveal': (data: { revealedInfo: RevealedInfo }) => void;

    // 裁きの時間
    'judgment:started': () => void;
    'judgment:voted': (data: { voterId: string; targetId: string }) => void;
    'judgment:result': (data: { eliminatedPlayerId: string | null; votes: Record<string, string>; usedFakeName?: boolean; survivedTargetId?: string | null }) => void;

    // チャット（キラ-ミサ）
    'chat:message': (data: ChatMessage) => void;

    // ワタリのL情報通知
    'game:watariReveal': (data: { lPlayerId: string; lPlayerName: string; lPlayerColor?: string }) => void;

    // 接続
    'pong': (data: { message: string }) => void;
}

// =====================================================
// Card Definitions (constants)
// =====================================================

export const CARD_DEFINITIONS: Record<CardId, { name: string; description: string }> = {
    [CardId.DEATH_NOTE]: {
        name: 'デスノート',
        description: 'キラが使用すると対象プレイヤーを殺害する',
    },
    [CardId.ARREST]: {
        name: '逮捕',
        description: 'キラまたはミサを拘束する',
    },
    [CardId.GUN]: {
        name: '拳銃',
        description: '対象の最小番号カードを公開する（警察） または 対象を殺害する（メロ）',
    },
    [CardId.FAKE_NAME]: {
        name: '偽名',
        description: 'デスノートによる死亡を無効化する',
    },
    [CardId.ALIBI]: {
        name: 'アリバイ',
        description: '逮捕を無効化する',
    },
    [CardId.WITNESS]: {
        name: '目撃者',
        description: '対象プレイヤーの手札を1枚見る',
    },
    [CardId.SURVEILLANCE]: {
        name: '監視カメラ',
        description: 'カード交換を見ることができる',
    },
    [CardId.VOTE]: {
        name: '会議',
        description: '裁きの時間を発動する',
    },
    [CardId.EXCHANGE]: {
        name: '交換',
        description: '対象プレイヤーと手札を交換する',
    },
    [CardId.INTERROGATION]: {
        name: '尋問',
        description: '対象プレイヤーの役職を確認する（嘘をつける）',
    },
    [CardId.SHINIGAMI]: {
        name: '死神の目',
        description: '対象プレイヤーの役職を見る',
    },
};

/**
 * 役職ごとのチーム
 */
export const ROLE_TEAM: Record<Role, Team> = {
    [Role.KIRA]: Team.KIRA,
    [Role.MISA]: Team.KIRA,
    [Role.L]: Team.L,
    [Role.POLICE]: Team.L,
    [Role.WATARI]: Team.L,
    [Role.MELLO]: Team.THIRD,
};

/**
 * 役職の日本語名
 */
export const ROLE_NAMES: Record<Role, string> = {
    [Role.KIRA]: 'キラ（夜神月）',
    [Role.MISA]: '信者（弥海ミサ）',
    [Role.L]: 'L',
    [Role.POLICE]: '警察',
    [Role.WATARI]: 'ワタリ',
    [Role.MELLO]: 'メロ',
};

// =====================================================
// 追加された型定義 (Plan 2.2)
// =====================================================

export interface ShinigamiInfo {
    kiraId?: string;
    kiraName?: string;
    deathNoteHolderId?: string;
    deathNoteHolderName?: string;
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

// Socketイベントの追加
export interface ClientToServerEvents {
    // ... (existing events)
    'room:create': (data: { playerName: string; maxPlayers: number; useMello: boolean; isDebug?: boolean; deckConfig?: DeckConfig }) => void;
    'room:addNpc': () => void; // Debug only
    'debug:getLogs': () => void;
    'room:join': (data: { playerName: string; roomCode: string }) => void;
    'room:leave': () => void;
    'room:start': () => void;
    'room:toggleSpectator': (data: { isSpectator: boolean }) => void; // 観戦モード切り替え
    'room:updateDeckConfig': (data: { deckConfig: DeckConfig }) => void; // デッキ構成更新
    'room:updateRoleConfig': (data: { roleConfig: RoleConfig }) => void; // 役職構成更新
    'room:backToLobby': () => void; // Return to lobby after game ends
    'room:rejoin': (data: { playerId: string; roomCode: string; playerName: string }) => void; // セッション再接続用
    'room:kickPlayer': (data: { targetPlayerId: string }) => void; // ホストによるキック用
    'player:selectColor': (data: { color: string | null }) => void; // プレイヤーカラー選択

    'game:drawCard': () => void;
    'game:useCard': (data: {
        cardInstanceId: string;
        targetPlayerId?: string;
        exchangeCardId?: string;
        direction?: 'LEFT' | 'RIGHT';
    }) => void;
    'game:discardCard': (data: { cardInstanceId: string }) => void;
    'game:transferCard': (data: { cardInstanceId: string; direction: 'LEFT' | 'RIGHT' }) => void;
    'game:selectCard': (data: { cardInstanceId: string }) => void;
    'game:endTurn': () => void;

    // 死神演出完了
    'game:shinigamiFinished': () => void;
    'game:gunFinished': () => void;
    'game:arrestFinished': () => void;
    'game:arrestCardDismissed': () => void; // 逮捕カードめくり演出確認後 → ムービー再生トリガー
    'game:judgmentCutsceneFinished': () => void;

    'judgment:action': (data: { targetId: string }) => void; // targetId='CONFIRM' for non-killers
    'vote:cast': (data: { targetId: string }) => void;
    'chat:send': (data: { message: string }) => void;
    'chat:kiraMisa': (data: { message: string }) => void;
    'ping': () => void;
}

export interface ServerToClientEvents {
    // ... (existing events)
    'room:created': (data: { roomCode: string; playerId: string }) => void;
    'room:joined': (data: { playerId: string }) => void;
    'room:updated': (data: { room: Room }) => void;
    'room:error': (data: { message: string }) => void;
    'room:kicked': () => void; // キックされた際の通知

    'game:started': (data: { gameState: GameState }) => void;
    'game:updated': (data: { gameState: Partial<GameState> }) => void;
    'game:cardDrawn': (data: { playerId: string; card?: Card }) => void;
    'game:cardUsed': (data: { playerId: string; playerName?: string; cardId: CardId; targetPlayerId?: string; direction?: 'LEFT' | 'RIGHT'; cardName?: string }) => void;
    'game:cardDiscarded': (data: { playerId: string; playerName?: string; cardName?: string }) => void;
    'game:cardTransferred': (data: { transfers: TransferInfo[] }) => void;
    'game:roleRevealed': (data: { playerId: string; role: Role }) => void;
    'game:playerDied': (data: { playerId: string; cause: string }) => void;
    'game:state': (data: { gameState: GameState }) => void;
    'game:phaseChanged': (data: { phase: GamePhase }) => void;
    'game:error': (data: { message: string }) => void;
    'game:ended': (data: { winner: WinCondition; finalState: GameState }) => void;

    // カットシーン再生
    'game:playCutscene': (data: { type: 'SHINIGAMI' | 'GUN' | 'ARREST' | 'JUDGMENT' }) => void;
    // 効果公開（死神の結果表示など）
    'game:effectReveal': (data: { revealedInfo: RevealedInfo }) => void;

    'judgment:started': () => void;
    'judgment:voted': (data: { voterId: string; targetId: string }) => void;
    'judgment:result': (data: { eliminatedPlayerId: string | null; votes: Record<string, string>; usedFakeName?: boolean; survivedTargetId?: string | null }) => void;

    'chat:message': (data: ChatMessage) => void;
    'chat:kiraMisa': (data: ChatMessage) => void;
    'game:watariReveal': (data: { lPlayerId: string; lPlayerName: string; lPlayerColor?: string }) => void;
    'pong': (data: { message: string }) => void;
    'debug:log': (data: { message: string; type?: 'info' | 'warn' | 'error' | 'game' }) => void;
}

