# デスノート人狼 オンライン版 - Antigravity実装指示書

## 実装ロードマップ

以下の順序で段階的に実装を進めます。各フェーズの指示をAntigravityにコピペして使用してください。

```
Phase 1: プロジェクトセットアップ (30分)
    ↓
Phase 2: 型定義・状態管理 (1時間)
    ↓
Phase 3: Socket.io通信基盤 (1時間)
    ↓
Phase 4: ロビー機能 (2時間)
    ↓
Phase 5: ゲームコア（捜査の時間） (3時間)
    ↓
Phase 6: カード効果実装 (4時間)
    ↓
Phase 7: 裁きの時間 (2時間)
    ↓
Phase 8: 観戦モード・終了画面 (1時間)
    ↓
Phase 9: 演出・アニメーション (2時間)
    ↓
Phase 10: レスポンシブ対応・仕上げ (2時間)
```

---

# Phase 1: プロジェクトセットアップ

## 指示書

```
## タスク
「デスノート人狼」オンラインマルチプレイヤーゲームのプロジェクトをセットアップしてください。

## 技術スタック
- Frontend: React 18, TypeScript, Tailwind CSS, Framer Motion
- Backend: Node.js, Express, Socket.io
- State: Redux Toolkit
- 構成: モノレポ構成（client/ と server/ に分離）

## ディレクトリ構成

```
death-note-werewolf/
├── client/                 # Reactフロントエンド
│   ├── src/
│   │   ├── components/     # UIコンポーネント
│   │   ├── pages/          # ページコンポーネント
│   │   ├── store/          # Redux store
│   │   ├── hooks/          # カスタムフック
│   │   ├── types/          # 型定義
│   │   ├── utils/          # ユーティリティ
│   │   ├── socket/         # Socket.io クライアント
│   │   └── assets/         # 画像・フォント等
│   ├── package.json
│   └── tailwind.config.js
├── server/                 # Node.jsバックエンド
│   ├── src/
│   │   ├── game/           # ゲームロジック
│   │   ├── socket/         # Socket.ioハンドラ
│   │   ├── types/          # 型定義（共有）
│   │   └── utils/          # ユーティリティ
│   └── package.json
├── shared/                 # 共有型定義
│   └── types/
└── package.json            # ルートpackage.json
```

## 要件
1. TypeScriptを厳格モードで設定
2. Tailwind CSSをダークテーマ基調で設定（デスノートの世界観）
3. Socket.io の接続設定を準備
4. 開発用のホットリロードを設定
5. ESLint, Prettierを設定

## デザインテーマ
- 背景色: ダークグレー (#1a1a2e, #16213e)
- アクセント: 赤 (#e94560)
- テキスト: 白/グレー
- フォント: ゴシック系（不気味な雰囲気）
```

---

# Phase 2: 型定義・状態管理

## 指示書

```
## タスク
ゲームで使用する全ての型定義とRedux状態管理を実装してください。

## 型定義（shared/types/index.ts）

### Enums

```typescript
enum Role {
  KIRA = 'KIRA',       // キラ（夜神月）
  MISA = 'MISA',       // 信者（弥海ミサ）
  L = 'L',             // L
  POLICE = 'POLICE',   // 警察
  WATARI = 'WATARI',   // ワタリ
  MELLO = 'MELLO',     // メロ
}

enum Team {
  KIRA = 'KIRA',
  L = 'L',
  THIRD = 'THIRD',
}

enum GamePhase {
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

enum WinCondition {
  KIRA_WINS = 'KIRA_WINS',
  L_WINS = 'L_WINS',
  MELLO_WINS = 'MELLO_WINS',
}

enum CardId {
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
```

### Interfaces

```typescript
interface Card {
  id: CardId;
  name: string;
  instanceId: string;
  isUsed: boolean;
}

interface Player {
  id: string;
  name: string;
  role: Role | null;
  team: Team | null;
  hand: Card[];
  isAlive: boolean;
  isConnected: boolean;
  isHost: boolean;
}

interface Room {
  code: string;
  players: Player[];
  maxPlayers: number;
  useMello: boolean;
  hostId: string;
}

interface GameState {
  roomCode: string;
  phase: GamePhase;
  round: number;
  turnIndex: number;
  turnCycle: number;
  currentPlayerId: string;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  removedCards: Card[];
  kiraMisaChat: ChatMessage[];
  winner: WinCondition | null;
  publicInfo: PublicInfo;
}

interface PublicInfo {
  revealedCards: RevealedCard[];
  revealedRoles: { playerId: string; role: Role }[];
  lastDiscard: Card | null;
  transferHistory: TransferInfo[];
}

interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

interface TransferInfo {
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  card: Card;
  direction: 'LEFT' | 'RIGHT';
}

interface RevealedCard {
  playerId: string;
  playerName: string;
  card: Card;
  reason: 'GUN' | 'SURVIVAL' | 'DEATH';
}
```

## Redux Store 構成

```typescript
// store/index.ts
interface RootState {
  room: RoomState;
  game: GameState;
  ui: UIState;
}

interface RoomState {
  code: string | null;
  players: Player[];
  isHost: boolean;
  myPlayerId: string | null;
  maxPlayers: number;
  useMello: boolean;
}

interface UIState {
  isLoading: boolean;
  error: string | null;
  modal: ModalType | null;
  selectedCard: Card | null;
  selectedPlayer: string | null;
}
```

## 要件
1. 全ての型をshared/types/に配置し、client/serverの両方からimport可能にする
2. Redux Toolkitでスライスを作成（roomSlice, gameSlice, uiSlice）
3. 型安全なアクションとセレクターを実装
```

---

# Phase 3: Socket.io通信基盤

## 指示書

```
## タスク
Socket.ioのクライアント・サーバー間通信の基盤を実装してください。

## サーバー側（server/src/socket/）

### イベントハンドラ構成

```typescript
// socketHandler.ts
export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    // Room events
    socket.on('room:create', handleRoomCreate);
    socket.on('room:join', handleRoomJoin);
    socket.on('room:leave', handleRoomLeave);
    
    // Game events
    socket.on('game:start', handleGameStart);
    socket.on('game:forceEnd', handleGameForceEnd);
    
    // Turn events
    socket.on('turn:drawCard', handleDrawCard);
    socket.on('turn:useCard', handleUseCard);
    socket.on('turn:discard', handleDiscard);
    socket.on('turn:drawExtra', handleDrawExtra);
    socket.on('turn:selectCard', handleSelectCard);
    
    // Judgment events
    socket.on('judgment:confirm', handleJudgmentConfirm);
    socket.on('judgment:execute', handleJudgmentExecute);
    
    // Other events
    socket.on('watari:confirm', handleWatariConfirm);
    socket.on('vote:cast', handleVoteCast);
    socket.on('kira-misa:chat', handleKiraMisaChat);
    socket.on('shinigami:confirm', handleShinigamiConfirm);
    
    // Disconnect
    socket.on('disconnect', handleDisconnect);
  });
}
```

### Server → Client イベント

```typescript
// 部屋更新
socket.emit('room:updated', roomState);

// ゲーム開始
socket.emit('game:started', initialGameState);

// フェーズ変更
socket.emit('phase:changed', { phase, data });

// 手番変更
socket.emit('turn:changed', { currentPlayerId });

// カードドロー通知（他プレイヤーには枚数のみ）
socket.emit('card:drawn', { playerId });

// カード使用通知
socket.emit('card:used', { playerId, cardId, targetId });

// カード効果結果
socket.emit('card:effect', effectResult);

// カード移動結果（取調用）
socket.emit('card:transfer', transferInfoArray);

// 裁きの時間開始
socket.emit('judgment:start', { deathNoteHolderId, kiraMisaInfo });

// 裁き結果
socket.emit('judgment:result', { targetId, survived, usedFakeName });

// プレイヤー脱落
socket.emit('player:eliminated', { playerId, role });

// 正体公開（メロ等）
socket.emit('player:revealed', { playerId, role });

// ゲーム終了
socket.emit('game:ended', { winner, players });

// 切断/再接続
socket.emit('player:disconnected', { playerId });
socket.emit('player:reconnected', { playerId });

// エラー
socket.emit('error', { code, message });
```

## クライアント側（client/src/socket/）

### Socket接続管理

```typescript
// socketClient.ts
import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;
  
  connect() {
    this.socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    this.setupListeners();
  }
  
  private setupListeners() {
    // 各イベントのリスナーを設定
    // Reduxストアにディスパッチ
  }
  
  // 送信メソッド
  createRoom(playerName: string, maxPlayers: number, useMello: boolean) {}
  joinRoom(roomCode: string, playerName: string) {}
  leaveRoom() {}
  startGame() {}
  // ... その他のメソッド
}

export const socketClient = new SocketClient();
```

## 要件
1. 型安全なイベント送受信
2. 再接続ロジックの実装
3. エラーハンドリング
4. Redux との連携（受信したデータをstoreに反映）
```

---

# Phase 4: ロビー機能

## 指示書

```
## タスク
部屋の作成・参加・待機画面を実装してください。

## 画面構成

### 1. トップ画面（/）
- タイトル「DEATH NOTE 人狼」（デスノート風のロゴ）
- 「部屋を作成」ボタン
- 「部屋に参加」ボタン（部屋コード入力フィールド付き）

### 2. 部屋作成モーダル
- プレイヤー名入力（必須、重複チェックは参加時）
- 最大人数選択（4〜8人）
- 7人時のメロ使用オプション（チェックボックス）
- 「作成」ボタン

### 3. 部屋参加モーダル
- 部屋コード入力（4桁数字）
- プレイヤー名入力
- 「参加」ボタン

### 4. ロビー画面（/room/:code）
- 部屋コード表示（大きく）
- 参加者一覧（アイコン + 名前）
- ホストには王冠アイコン
- 「ゲーム開始」ボタン（ホストのみ、4人以上で有効化）
- 「退出」ボタン
- 「強制終了」ボタン（画面端に小さく、赤色）
- 設定表示（最大人数、メロ有無）

## 部屋コード生成ロジック

```typescript
function generateRoomCode(): string {
  // 4桁のランダムな数字（重複チェック付き）
  return Math.floor(1000 + Math.random() * 9000).toString();
}
```

## プレイヤー名バリデーション

```typescript
function validatePlayerName(name: string, existingNames: string[]): ValidationResult {
  if (!name || name.trim() === '') {
    return { valid: false, error: '名前を入力してください' };
  }
  if (name.length > 10) {
    return { valid: false, error: '名前は10文字以内にしてください' };
  }
  if (existingNames.includes(name.trim())) {
    return { valid: false, error: 'この名前は既に使用されています' };
  }
  return { valid: true };
}
```

## デザイン要件
- ダークテーマ（#1a1a2e 背景）
- デスノート風のフォント・装飾
- 参加者一覧は縦に並べる
- ボタンはホバー時にアニメーション
- エラーメッセージは赤色で表示

## 要件
1. 部屋作成→自動で部屋画面に遷移
2. 部屋参加→バリデーション後に部屋画面に遷移
3. ホスト退出時は全員に通知（部屋は維持、復帰待ち）
4. リアルタイムで参加者一覧更新
5. 4人未満では「ゲーム開始」ボタンを無効化
```

---

# Phase 5: ゲームコア（捜査の時間）

## 指示書

```
## タスク
ゲームのメイン画面と「捜査の時間」のフェーズを実装してください。

## ゲーム画面レイアウト

### プレイヤー配置（円形）

```
画面上部:
        [プレイヤーC]
           ○
   [B] ○       ○ [D]
   
      [中央: 捨て札]
   
   [A] ○       ○ [E]
           
画面下部:
    ┌─────────────────────┐
    │   【自分のエリア】    │
    │  名前・役職・手札    │
    └─────────────────────┘
```

### 各プレイヤーの表示要素
- 名前
- 手札枚数（数字）
- 生存/脱落状態（脱落時はグレーアウト + バツ印）
- 現在の手番（光るハイライト）
- 正体（脱落時のみ表示 or 観戦モード）

### 自分のエリア
- 名前
- 役職カード（自分のみ見える）
- 手札（2枚まで）
- 現在のフェーズ表示
- アクションボタン

### 中央エリア
- 捨て札の山（最後に捨てられたカード表示）
- 山札（残り枚数表示）
- 現在のラウンド・周回表示

## 捜査の時間フロー

### 1. CARD_DRAW（カード補充）
自分の手番の場合:
- 「カードを引く」ボタン表示
- クリックで山札から1枚ドロー
- ドロー後、死神カードチェック（あれば強制発動）

### 2. CARD_ACTION（カード使用/捨札）
- 手札からカードを選択
- 「使用」or「捨てる」ボタン
- 使用時はターゲット選択（カードによる）

### 3. 使用も捨札も不可能な場合
- サーバーが自動判定
- 「もう1枚引く」ボタン表示
- 追加ドロー→最初のカードを山札に戻す

## カード使用可否判定

```typescript
function canUseCard(card: Card, player: Player): boolean {
  switch (card.id) {
    case CardId.DEATH_NOTE:
      return false; // 使用不可
    case CardId.ARREST:
      return player.role === Role.L;
    case CardId.GUN:
      return player.role === Role.POLICE || player.role === Role.MELLO;
    case CardId.ALIBI:
      return player.role === Role.KIRA && !card.isUsed;
    case CardId.FAKE_NAME:
      return !card.isUsed; // 使用済みは効果なし（捨札は可能）
    default:
      return true;
  }
}

function canDiscardCard(card: Card): boolean {
  return card.id !== CardId.DEATH_NOTE && card.id !== CardId.ARREST;
}
```

## 手番進行ロジック

```typescript
function getNextTurnPlayer(state: GameState): string {
  const alivePlayers = state.players.filter(p => p.isAlive);
  const currentIndex = alivePlayers.findIndex(p => p.id === state.currentPlayerId);
  const nextIndex = (currentIndex + 1) % alivePlayers.length;
  return alivePlayers[nextIndex].id;
}

function shouldEndInvestigation(state: GameState): boolean {
  const playerCount = state.players.filter(p => p.isAlive).length;
  const cyclesNeeded = (playerCount === 4 && state.round === 1) ? 2 : 1;
  return state.turnCycle >= cyclesNeeded;
}
```

## デザイン要件
- カード選択時はハイライト
- 手番プレイヤーは名前が光る
- ターゲット選択時は選択可能プレイヤーをハイライト
- スムーズなアニメーション（Framer Motion）
```

---

# Phase 6: カード効果実装

## 指示書

```
## タスク
全11種類のカード効果を実装してください。

## カード効果一覧

### 0. デスノート
- 使用: 不可
- 捨札: 不可
- 効果: キラが所持時、裁きの時間に殺害可能

### 1. 逮捕
- 使用: Lのみ
- 捨札: 不可
- 使用後: ゲームから除外
- 効果:
  ```typescript
  function processArrest(targetId: string, state: GameState): ArrestResult {
    const target = state.players.find(p => p.id === targetId);
    
    if (target.role === Role.KIRA) {
      // キラの場合、アリバイチェック
      const alibi = target.hand.find(c => c.id === CardId.ALIBI && !c.isUsed);
      if (alibi) {
        // アリバイで否認
        alibi.isUsed = true;
        return { success: false, denied: true };
      }
      // L陣営勝利
      return { success: true, winner: WinCondition.L_WINS };
    }
    
    // キラ以外 → 続行
    return { success: false, denied: false };
  }
  ```

### 2. 拳銃
- 使用: 警察/メロ
- 捨札: 可
- 使用後: 捨て札へ
- 効果（警察）: ターゲットの最小番号カードを公開（番号変更不可）
- 効果（メロ）: ターゲットを殺害、メロの正体公開

### 3. 偽名
- 使用: 全員（捨札は可能だが、使用は裁きの時間のみ）
- 使用後: 使用済みフラグをON
- 効果: 裁きの時間に名前を書かれても1回生存

### 4. アリバイ
- 使用: キラのみ有効（逮捕時に自動発動）
- 捨札: 可
- 使用後: 使用済みフラグをON
- 効果: 逮捕されても1回否認可能

### 5. 目撃
- 使用: 全員
- 捨札: 可
- 効果:
  ```typescript
  function processWitness(targetId: string, requesterId: string): WitnessResult {
    const target = state.players.find(p => p.id === targetId);
    // 使用者にのみターゲットの役職を通知
    return {
      visibleTo: [requesterId],
      targetRole: target.role
    };
  }
  ```
  - UIはポップアップで表示、確認ボタンで閉じる

### 6. 監視
- 使用: 全員
- 捨札: 可
- 効果: ターゲットの手札全てを確認
- UIはポップアップで表示

### 7. 投票
- 使用: 全員
- 捨札: 可
- 効果:
  1. 全員に投票UI表示（10秒タイマー）
  2. 各自がキラだと思う人を選択
  3. 時間切れはランダム選択
  4. 結果を一覧表示

### 8. 交換
- 使用: 全員
- 捨札: 可
- 効果:
  1. ターゲットを選択
  2. ターゲットの最小番号カードを受け取る（番号変更可能）
  3. 自分の手札から任意1枚をターゲットに渡す
  
  ```typescript
  // ターゲットの番号変更処理
  function selectCardToGive(player: Player, context: 'exchange_give'): Card {
    // 番号変更能力がある場合、どのカードを渡すか選択可能
    // UIで選択させる
  }
  ```

### 9. 取調
- 使用: 全員
- 捨札: 可
- 効果:
  1. 使用者が「左」or「右」を選択
  2. 全員に方向を通知
  3. 全員同時にカード選択（番号変更可能）
  4. 同時に受け渡し
  5. 結果を**丁寧に**表示（重要情報）
  
  ```typescript
  interface InterrogationResult {
    direction: 'LEFT' | 'RIGHT';
    transfers: TransferInfo[];
  }
  ```

### 13. 死神
- 使用: 自動発動（手札にあるとき、カードドロー後に強制）
- 効果:
  1. 全員の画面を暗転
  2. リュークのフェードイン演出
  3. キラ画面: デスノート所持者名表示
  4. ミサ画面: キラ名 + デスノート所持者名表示
  5. その他: 演出のみ
  6. キラとミサが確認後、次へ進む

## 番号変更ロジック

```typescript
function canModifyCardNumber(player: Player, card: Card): boolean {
  const rules: Record<Role, CardId[]> = {
    [Role.KIRA]: [CardId.DEATH_NOTE],
    [Role.L]: [CardId.ARREST],
    [Role.POLICE]: [CardId.GUN],
    [Role.WATARI]: [CardId.ARREST],
    [Role.MISA]: [],
    [Role.MELLO]: [],
  };
  return rules[player.role]?.includes(card.id) ?? false;
}

// 拳銃のターゲットは番号変更不可
function getLowestCard(hand: Card[], canModify: boolean): Card {
  if (!canModify) {
    // 本来の番号で最小を返す
    return hand.reduce((min, c) => c.id < min.id ? c : min);
  }
  // 番号変更可能な場合、プレイヤーに選択させる
  return promptCardSelection(hand);
}
```

## 要件
1. 各カードの効果を正確に実装
2. 番号変更UIは他プレイヤーに見えない
3. 情報確認系はポップアップ表示
4. 取調の結果は特に丁寧に表示（誰→誰に何を渡したか）
```

---

# Phase 7: 裁きの時間

## 指示書

```
## タスク
「裁きの時間」フェーズを実装してください。

## フロー

### 1. 裁きの時間開始
- 全員の画面に「裁きの時間」の演出表示
- 13秒タイマー表示（目安のみ、強制終了なし）

### 2. 画面分岐

#### キラ・ミサの画面
```
┌─────────────────────────────────────┐
│         裁 き の 時 間               │
│                                     │
│  あなたは【キラ】です                │
│  ミサは「山田」です                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 専用チャット                 │   │
│  │ ミサ: 田中がLだと思う        │   │
│  │ あなた: 分かった             │   │
│  │ [入力欄] [送信]              │   │
│  └─────────────────────────────┘   │
│                                     │
│  【ターゲットを選択】                │
│  ○ 田中  ○ 佐藤  ○ 鈴木          │
│  ○ 山田（自分）                     │
│                                     │
│  [13秒] タイマー                    │
│                                     │
│  [決定]                             │
└─────────────────────────────────────┘
```

#### その他プレイヤーの画面
```
┌─────────────────────────────────────┐
│         裁 き の 時 間               │
│                                     │
│     キラが裁きを下しています...      │
│                                     │
│         [13秒] タイマー             │
│                                     │
│   (オプション: 8秒程度の演出動画)    │
│                                     │
└─────────────────────────────────────┘
```

#### 観戦者の画面
- 全プレイヤーの役職表示
- キラ・ミサチャット表示
- キラの選択をリアルタイム表示

### 3. キラがデスノートを持っていない場合
- キラ画面に「確認」ボタンのみ表示
- 「確認」を押すと全員にスキップ通知

### 4. 結果表示

```typescript
interface JudgmentResult {
  targetId: string | null;    // null = スキップ
  targetName: string | null;
  survived: boolean;
  usedFakeName: boolean;
}
```

#### 死亡の場合
```
┌─────────────────────────────────────┐
│                                     │
│       「田中」は心臓麻痺で          │
│          死亡しました               │
│                                     │
│       役職: 【警察】                 │
│                                     │
└─────────────────────────────────────┘
```

#### 偽名で生存の場合
```
┌─────────────────────────────────────┐
│                                     │
│       「田中」は偽名カードで        │
│         生き残りました！             │
│                                     │
│       (偽名カード公開)              │
│                                     │
└─────────────────────────────────────┘
```

### 5. 勝敗チェック

```typescript
function checkJudgmentWinCondition(state: GameState): WinCondition | null {
  const alivePlayers = state.players.filter(p => p.isAlive);
  const aliveL = alivePlayers.filter(p => p.role === Role.L);
  const aliveLTeam = alivePlayers.filter(p => 
    [Role.L, Role.POLICE, Role.WATARI].includes(p.role)
  );
  
  if (aliveL.length === 0) {
    return WinCondition.KIRA_WINS;
  }
  if (aliveLTeam.length <= 1) {
    return WinCondition.KIRA_WINS;
  }
  
  return null;
}
```

## 脱落処理

```typescript
function eliminatePlayer(playerId: string, state: GameState): GameState {
  const player = state.players.find(p => p.id === playerId);
  
  // 1. プレイヤーを脱落状態に
  player.isAlive = false;
  
  // 2. 役職を公開
  state.publicInfo.revealedRoles.push({
    playerId: player.id,
    role: player.role
  });
  
  // 3. 手札を山札の一番下へ
  state.deck = [...state.deck, ...player.hand];
  player.hand = [];
  
  return state;
}
```

## キラ・ミサ専用チャット

```typescript
interface KiraMisaChat {
  messages: ChatMessage[];
}

// 裁きの時間開始時にクリア
function clearKiraMisaChat(state: GameState): GameState {
  state.kiraMisaChat = [];
  return state;
}

// チャット送信（キラ・ミサのみ）
function sendKiraMisaMessage(
  playerId: string, 
  message: string, 
  state: GameState
): GameState {
  const player = state.players.find(p => p.id === playerId);
  if (player.role !== Role.KIRA && player.role !== Role.MISA) {
    throw new Error('Only Kira and Misa can use this chat');
  }
  
  state.kiraMisaChat.push({
    playerId,
    playerName: player.name,
    message,
    timestamp: Date.now()
  });
  
  return state;
}
```

## 要件
1. 13秒タイマーは目安のみ（強制終了なし）
2. キラは自分も選択可能
3. チャットは毎回クリア
4. 観戦者は全て見える
5. 演出を入れる（暗転、テキストアニメーション等）
```

---

# Phase 8: 観戦モード・終了画面

## 指示書

```
## タスク
脱落者用の観戦モードとゲーム終了画面を実装してください。

## 観戦モード（神視点）

### 表示内容
- 全プレイヤーの役職（生存者含む）
- 全プレイヤーの手札
- 裁きの時間のキラ・ミサチャット
- 現在の手番・フェーズ
- デスノート所持者のハイライト

### UI設計

```
┌─────────────────────────────────────┐
│  【観戦モード】あなたは脱落しました  │
├─────────────────────────────────────┤
│                                     │
│  プレイヤー一覧（役職・手札表示）    │
│                                     │
│  ┌───────┐  ┌───────┐  ┌───────┐   │
│  │ 田中   │  │ 佐藤   │  │ 鈴木   │   │
│  │ キラ   │  │  L     │  │ 警察   │   │
│  │ [手札] │  │ [手札] │  │ [手札] │   │
│  │デスノ │  │ 逮捕   │  │ 拳銃   │   │
│  │ 取調  │  │ 交換   │  │ 監視   │   │
│  └───────┘  └───────┘  └───────┘   │
│                                     │
│  現在: 捜査の時間 / 手番: 佐藤      │
│                                     │
│  [キラ・ミサチャット]               │
│  ミサ: 鈴木が怪しい                 │
│                                     │
└─────────────────────────────────────┘
```

### 観戦者用データフィルタリング

```typescript
function getSpectatorView(state: GameState): SpectatorGameState {
  return {
    ...state,
    players: state.players.map(p => ({
      ...p,
      // 観戦者は全情報が見える
      role: p.role,
      hand: p.hand,
    })),
    kiraMisaChat: state.kiraMisaChat, // チャットも見える
  };
}
```

## ゲーム終了画面

### 表示内容
- 勝利陣営（大きく表示）
- 勝利演出（キラ陣営: デスノート風、L陣営: 正義執行風）
- 全プレイヤーの役職公開
- 「もう一度プレイ」ボタン

### UI設計

#### キラ陣営勝利
```
┌─────────────────────────────────────┐
│                                     │
│     ██╗  ██╗██╗██████╗  █████╗      │
│     ██║ ██╔╝██║██╔══██╗██╔══██╗     │
│     █████╔╝ ██║██████╔╝███████║     │
│     ██╔═██╗ ██║██╔══██╗██╔══██║     │
│     ██║  ██╗██║██║  ██║██║  ██║     │
│     ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝     │
│                                     │
│          キラ陣営の勝利！            │
│                                     │
│  ─────────────────────────────────  │
│  役職公開                           │
│  田中: キラ    佐藤: ミサ           │
│  鈴木: L       山田: 警察           │
│  高橋: 警察    渡辺: ワタリ         │
│  ─────────────────────────────────  │
│                                     │
│        [もう一度プレイ]              │
│                                     │
└─────────────────────────────────────┘
```

#### L陣営勝利
```
（正義が勝った風の演出）
```

#### メロ勝利
```
（メロ単独勝利の演出）
```

### 再戦機能

```typescript
function handleRematch(roomCode: string) {
  // 1. 全プレイヤーをLOBBY状態に戻す
  // 2. ゲーム状態をリセット
  // 3. 同じ部屋設定を維持
  // 4. ロビー画面に遷移
}
```

## 要件
1. 観戦モードはリアルタイム更新
2. 終了画面は演出付き
3. 再戦は同じメンバー・設定を維持
```

---

# Phase 9: 演出・アニメーション

## 指示書

```
## タスク
ゲームの演出とアニメーションを実装してください。Framer Motionを使用します。

## カード使用時のカットイン演出

### 基本構造

```tsx
const CardCutIn: React.FC<{ card: Card; userName: string }> = ({ card, userName }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/70"
    >
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="text-center"
      >
        <h2 className="text-4xl font-bold text-red-500">{userName}</h2>
        <CardVisual card={card} size="large" />
        <p className="text-2xl text-white">{card.name}を使用！</p>
      </motion.div>
    </motion.div>
  );
};
```

### 各カードの演出

| カード | 演出 |
|--------|------|
| 逮捕 | 手錠のアイコンが飛んでくる |
| 拳銃 | 銃声のエフェクト |
| 目撃 | 目のアイコンが光る |
| 監視 | 監視カメラ風のフレーム |
| 投票 | 指差しアイコンが並ぶ |
| 交換 | カードが入れ替わるアニメーション |
| 取調 | 回転矢印 |
| 死神 | リュークのシルエットがフェードイン |

## 死神カード演出

```tsx
const ShinigamiAnimation: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  return (
    <motion.div className="fixed inset-0 bg-black z-50">
      {/* 暗転 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      
      {/* リュークのシルエット */}
      <motion.img
        src="/assets/ryuk-silhouette.png"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.7, scale: 1 }}
        transition={{ delay: 1, duration: 2 }}
        className="absolute inset-0 m-auto w-1/2"
      />
      
      {/* テキスト */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-1/3 w-full text-center text-2xl text-white"
      >
        死神の目が光る...
      </motion.p>
      
      {/* 確認ボタン */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        onClick={onComplete}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
      >
        確認
      </motion.button>
    </motion.div>
  );
};
```

## 裁きの時間演出

```tsx
const JudgmentPhaseAnimation: React.FC = () => {
  return (
    <motion.div className="fixed inset-0 bg-gradient-to-b from-black to-red-900/30 z-40">
      <motion.h1
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-6xl font-bold text-red-500 text-center mt-20"
      >
        裁きの時間
      </motion.h1>
      
      {/* デスノートのページがめくれる演出 */}
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ rotateY: 180 }}
        transition={{ duration: 1.5, delay: 0.5 }}
        className="mx-auto mt-10 w-64 h-80"
      >
        <NotebookPage />
      </motion.div>
    </motion.div>
  );
};
```

## カードビジュアル

```tsx
const CardVisual: React.FC<{ card: Card; size: 'small' | 'medium' | 'large' }> = ({ card, size }) => {
  const sizeClasses = {
    small: 'w-16 h-24',
    medium: 'w-24 h-36',
    large: 'w-32 h-48',
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`${sizeClasses[size]} bg-gray-800 rounded-lg border-2 border-gray-600 p-2 flex flex-col justify-between`}
    >
      <div className="text-xs text-gray-400">#{card.id}</div>
      <div className="text-center">
        <CardIcon cardId={card.id} />
        <p className="text-sm font-bold text-white">{card.name}</p>
      </div>
      {card.isUsed && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span className="text-red-500">使用済</span>
        </div>
      )}
    </motion.div>
  );
};
```

## 画面遷移アニメーション

```tsx
// ページ遷移
const pageVariants = {
  initial: { opacity: 0, x: -100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 },
};

// フェーズ遷移
const phaseVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.1 },
};
```

## 要件
1. 全てのアニメーションはスキップ可能（確認ボタン等）
2. パフォーマンスを考慮（will-change使用）
3. スマホでもスムーズに動作
```

---

# Phase 10: レスポンシブ対応・仕上げ

## 指示書

```
## タスク
PC/スマホ両対応のレスポンシブデザインと、最終調整を行ってください。

## ブレークポイント

```typescript
// Tailwind CSS breakpoints
// sm: 640px
// md: 768px
// lg: 1024px
// xl: 1280px
```

## PC版レイアウト（1024px以上）

```
┌─────────────────────────────────────────────────────┐
│ ヘッダー（ロゴ、部屋コード、フェーズ表示）           │
├───────────────────────────────────────┬─────────────┤
│                                       │             │
│                                       │  サイド     │
│     メインエリア                       │  パネル    │
│     （プレイヤー円形配置）              │  （情報）   │
│                                       │             │
├───────────────────────────────────────┴─────────────┤
│ 自分のエリア（役職、手札、アクションボタン）         │
└─────────────────────────────────────────────────────┘
```

## スマホ版レイアウト（768px未満）

```
┌─────────────────────┐
│ ヘッダー（コンパクト）│
├─────────────────────┤
│                     │
│  プレイヤー一覧      │
│  （縦並び・コンパクト）│
│                     │
├─────────────────────┤
│ 中央エリア          │
│ （捨て札・山札）     │
├─────────────────────┤
│ 自分のエリア        │
│ （手札大きく表示）   │
│ アクションボタン    │
└─────────────────────┘
```

## コンポーネント別レスポンシブ対応

### プレイヤー表示

```tsx
// PC: 円形配置、スマホ: 横スクロールリスト
const PlayerList: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  if (isMobile) {
    return (
      <div className="flex overflow-x-auto gap-2 p-2">
        {players.map(p => <PlayerCard key={p.id} player={p} compact />)}
      </div>
    );
  }
  
  return <CircularPlayerLayout players={players} />;
};
```

### 手札表示

```tsx
// PC: 横並び、スマホ: 重ねて表示（タップで展開）
const HandDisplay: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <div className={isMobile ? 'flex justify-center -space-x-8' : 'flex gap-4'}>
      {hand.map((card, i) => (
        <CardVisual 
          key={card.instanceId} 
          card={card} 
          size={isMobile ? 'medium' : 'large'}
          style={{ zIndex: i }}
        />
      ))}
    </div>
  );
};
```

### モーダル・ポップアップ

```tsx
// スマホではフルスクリーン
const Modal: React.FC = ({ children }) => {
  return (
    <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:rounded-lg bg-gray-900 p-4">
      {children}
    </div>
  );
};
```

## タッチ操作対応

```tsx
// カード選択
const CardSelectArea: React.FC = () => {
  return (
    <button
      className="touch-manipulation active:scale-95 transition-transform"
      onClick={handleSelect}
    >
      <CardVisual card={card} />
    </button>
  );
};
```

## 最終チェックリスト

### 機能確認
- [ ] 部屋作成・参加が正常に動作
- [ ] 4〜8人のゲームが正常に進行
- [ ] 全カード効果が正しく動作
- [ ] 裁きの時間が正しく動作
- [ ] 勝敗判定が正しく動作
- [ ] 観戦モードが正しく動作
- [ ] 再接続が正常に動作
- [ ] 再戦機能が正常に動作

### UI確認
- [ ] PCで正常に表示
- [ ] スマホで正常に表示
- [ ] タブレットで正常に表示
- [ ] アニメーションがスムーズ
- [ ] ダークテーマが一貫している

### パフォーマンス
- [ ] 初回ロードが3秒以内
- [ ] アニメーションが60fps
- [ ] メモリリークなし

### エラーハンドリング
- [ ] 接続エラー時の表示
- [ ] バリデーションエラーの表示
- [ ] 予期せぬエラーのフォールバック

## デプロイ（Render）

### クライアント（Static Site）
```
Build Command: npm run build
Publish Directory: dist
```

### サーバー（Web Service）
```
Build Command: npm run build
Start Command: npm start
Environment: Node
```

### 環境変数
```
VITE_SERVER_URL=https://your-server.onrender.com
```
```

---

## 補足: 画像アセット一覧

Antigravityで画像生成をする際の参考リストです：

| アセット名 | 説明 | サイズ目安 |
|-----------|------|-----------|
| logo.png | タイトルロゴ（デスノート風） | 400x100 |
| card-back.png | カードの裏面 | 120x180 |
| card-{id}.png | 各カードの表面（11種類） | 120x180 |
| role-kira.png | キラの役職カード | 150x200 |
| role-misa.png | ミサの役職カード | 150x200 |
| role-l.png | Lの役職カード | 150x200 |
| role-police.png | 警察の役職カード | 150x200 |
| role-watari.png | ワタリの役職カード | 150x200 |
| role-mello.png | メロの役職カード | 150x200 |
| ryuk-silhouette.png | リュークのシルエット | 400x600 |
| bg-dark.png | 背景テクスチャ | 1920x1080 |
| icon-crown.svg | ホストアイコン | 24x24 |
| icon-dead.svg | 脱落アイコン | 24x24 |

---

**指示書 バージョン: 1.0**
**最終更新: 2025年**
