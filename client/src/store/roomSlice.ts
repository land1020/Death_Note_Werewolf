import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Player, RoomState } from 'shared/types';
import { DEFAULT_DECK_CONFIG } from 'shared/utils/deckFactory';
import { DEFAULT_ROLE_CONFIG } from 'shared/utils/roleFactory';

const initialState: RoomState = {
    code: null,
    players: [],
    isHost: false,
    myPlayerId: null,
    maxPlayers: 8,
    useMello: false,
    isDebug: false,
    deckConfig: JSON.parse(JSON.stringify(DEFAULT_DECK_CONFIG)),
    roleConfig: JSON.parse(JSON.stringify(DEFAULT_ROLE_CONFIG)),
};

const roomSlice = createSlice({
    name: 'room',
    initialState,
    reducers: {
        // ルーム作成成功
        setRoom: (state, action: PayloadAction<{ code: string; playerId: string }>) => {
            state.code = action.payload.code;
            state.myPlayerId = action.payload.playerId;
            state.isHost = true;
        },

        // ルーム参加成功
        joinedRoom: (state, action: PayloadAction<{ code: string; playerId: string }>) => {
            state.code = action.payload.code;
            state.myPlayerId = action.payload.playerId;
            state.isHost = false;
        },

        // プレイヤーリスト更新
        setPlayers: (state, action: PayloadAction<Player[]>) => {
            state.players = action.payload;
        },

        // プレイヤー追加
        addPlayer: (state, action: PayloadAction<Player>) => {
            state.players.push(action.payload);
        },

        // プレイヤー削除
        removePlayer: (state, action: PayloadAction<string>) => {
            state.players = state.players.filter(p => p.id !== action.payload);
        },

        // プレイヤー更新
        updatePlayer: (state, action: PayloadAction<{ id: string; updates: Partial<Player> }>) => {
            const player = state.players.find(p => p.id === action.payload.id);
            if (player) {
                Object.assign(player, action.payload.updates);
            }
        },

        // ホスト変更
        setHost: (state, action: PayloadAction<string>) => {
            const newHostId = action.payload;
            state.isHost = newHostId === state.myPlayerId;
            state.players.forEach(p => {
                p.isHost = p.id === newHostId;
            });
        },

        // 設定更新
        setSettings: (state, action: PayloadAction<{ maxPlayers?: number; useMello?: boolean; deckConfig?: any; roleConfig?: any }>) => {
            if (action.payload.maxPlayers !== undefined) {
                state.maxPlayers = action.payload.maxPlayers;
            }
            if (action.payload.useMello !== undefined) {
                state.useMello = action.payload.useMello;
            }
            if (action.payload.deckConfig !== undefined) {
                state.deckConfig = action.payload.deckConfig;
            }
            if (action.payload.roleConfig !== undefined) {
                state.roleConfig = action.payload.roleConfig;
            }
        },

        // デバッグモード設定
        setDebugMode: (state, action: PayloadAction<boolean>) => {
            state.isDebug = action.payload;
        },

        // ルームリセット（退出時）
        resetRoom: () => initialState,
    },
});

export const {
    setRoom,
    joinedRoom,
    setPlayers,
    addPlayer,
    removePlayer,
    updatePlayer,
    setHost,
    setSettings,
    setDebugMode,
    resetRoom,
} = roomSlice.actions;

export default roomSlice.reducer;

// Selectors
export const selectRoomCode = (state: { room: RoomState }) => state.room.code;
export const selectPlayers = (state: { room: RoomState }) => state.room.players;
export const selectMyPlayerId = (state: { room: RoomState }) => state.room.myPlayerId;
export const selectIsHost = (state: { room: RoomState }) => state.room.isHost;
export const selectIsDebug = (state: { room: RoomState }) => state.room.isDebug;
export const selectMyPlayer = (state: { room: RoomState }) =>
    state.room.players.find(p => p.id === state.room.myPlayerId);
export const selectDeckConfig = (state: { room: RoomState }) => state.room.deckConfig;
export const selectRoleConfig = (state: { room: RoomState }) => state.room.roleConfig;
