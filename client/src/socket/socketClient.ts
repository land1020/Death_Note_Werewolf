import { io, Socket } from 'socket.io-client';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    GamePhase,
} from 'shared/types';
import { store } from '../store';
import {
    setRoom,
    joinedRoom,
    setPlayers,
    resetRoom
} from '../store/roomSlice';
import {
    startGame,
    updateGameState,
    setPhase,
    cardDrawn,
    cardUsed,
    cardDiscarded,
    cardTransferred,
    roleRevealed,
    playerDied,
    addChatMessage,
    endGame,
    resetGame,
    setJudgmentResult,
} from '../store/gameSlice';
import {
    setLoading,
    setError,
    clearError,
    setStolenCardNotification,
    setWatariReveal,
} from '../store/uiSlice';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

class SocketClient {
    private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private pendingRoomCode: string | null = null;

    get socketInstance() {
        return this.socket;
    }

    // ==================== Connection ====================

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.socket?.connected) {
                resolve();
                return;
            }

            this.socket = io(SERVER_URL, {
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 10000,
            });

            this.socket.on('connect', () => {
                console.log('🔌 Connected to server');
                this.reconnectAttempts = 0;
                store.dispatch(clearError());

                // セッション永続化: 以前の接続情報があれば再接続を試みる
                const savedPlayerId = localStorage.getItem('dn_playerId');
                const savedRoomCode = localStorage.getItem('dn_roomCode');
                const savedPlayerName = localStorage.getItem('dn_playerName');
                if (savedPlayerId && savedRoomCode && savedPlayerName) {
                    console.log(`♻️ Attempting to rejoin room ${savedRoomCode} as ${savedPlayerName}...`);
                    this.socket?.emit('room:rejoin', {
                        playerId: savedPlayerId,
                        roomCode: savedRoomCode,
                        playerName: savedPlayerName
                    });
                }

                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.reconnectAttempts++;

                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    store.dispatch(setError('サーバーに接続できません'));
                    reject(error);
                }
            });

            this.setupListeners();
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    // ==================== Event Listeners ====================

    private setupListeners(): void {
        if (!this.socket) return;

        // Room events
        this.socket.on('room:created', (data) => {
            localStorage.setItem('dn_playerId', data.playerId);
            localStorage.setItem('dn_roomCode', data.roomCode);
            store.dispatch(setRoom({ code: data.roomCode, playerId: data.playerId }));
            store.dispatch(setLoading(false));
        });

        this.socket.on('room:joined', (data) => {
            const roomCode = data.roomCode || this.pendingRoomCode || store.getState().room.code || localStorage.getItem('dn_roomCode');
            if (roomCode) {
                localStorage.setItem('dn_playerId', data.playerId);
                localStorage.setItem('dn_roomCode', roomCode);
                store.dispatch(joinedRoom({ code: roomCode, playerId: data.playerId }));
            }
            this.pendingRoomCode = null;
            store.dispatch(setLoading(false));
        });

        this.socket.on('room:updated', (data) => {
            store.dispatch(setPlayers(data.room.players));
        });

        this.socket.on('room:error', (data) => {
            store.dispatch(setError(data.message));
            store.dispatch(setLoading(false));

            // 参加失敗や無効な部屋だった場合はローカルストレージをクリアする
            if (data.message.includes('見つかりません') || data.message.includes('満員') || data.message.includes('進行中')) {
                localStorage.removeItem('dn_playerId');
                localStorage.removeItem('dn_roomCode');
                localStorage.removeItem('dn_playerName');
                store.dispatch(resetRoom());
                store.dispatch(resetGame());
            }
        });

        // 退出させられた場合
        this.socket.on('room:kicked' as any, () => {
            console.log('🚪 You have been kicked from the room.');
            localStorage.removeItem('dn_playerId');
            localStorage.removeItem('dn_roomCode');
            localStorage.removeItem('dn_playerName');
            store.dispatch(setError('ホストによって部屋から退出させられました'));
            store.dispatch(resetRoom());
            store.dispatch(resetGame());
        });

        // Game events
        this.socket.on('game:started', (data) => {
            console.log('🎮 game:started received!', data);
            store.dispatch(startGame(data.gameState));
        });

        this.socket.on('game:updated', (data) => {
            store.dispatch(updateGameState(data.gameState));
        });

        this.socket.on('game:state', (data) => {
            console.log('🎮 game:state received!', data);
            store.dispatch(updateGameState(data.gameState));
        });

        this.socket.on('game:phaseChanged', (data) => {
            store.dispatch(setPhase(data.phase));
        });

        this.socket.on('game:cardDrawn', (data) => {
            store.dispatch(cardDrawn(data));
        });

        this.socket.on('game:cardUsed', (data) => {
            store.dispatch(cardUsed({
                playerId: data.playerId,
                cardInstanceId: data.cardId.toString()
            }));
        });

        this.socket.on('game:cardDiscarded', (data) => {
            store.dispatch(cardDiscarded({
                playerId: data.playerId,
                cardInstanceId: '' // Will be updated from server
            }));
        });

        this.socket.on('game:cardTransferred', (data) => {
            store.dispatch(cardTransferred(data));
        });

        this.socket.on('game:roleRevealed', (data) => {
            store.dispatch(roleRevealed(data));
        });

        this.socket.on('game:playerDied', (data) => {
            store.dispatch(playerDied(data));
        });

        this.socket.on('game:ended', (data) => {
            store.dispatch(endGame({ winner: data.winner }));
        });

        // Judgment events
        this.socket.on('judgment:started', () => {
            store.dispatch(setPhase('JUDGMENT' as GamePhase));
        });

        this.socket.on('judgment:voted', (_data) => {
            // Update UI to show vote was cast
        });

        this.socket.on('judgment:result', (data) => {
            store.dispatch(setPhase('JUDGMENT_RESULT' as GamePhase));
            store.dispatch(setJudgmentResult(data));
        });

        // Chat events
        this.socket.on('chat:kiraMisa', (data) => {
            store.dispatch(addChatMessage(data));
        });

        // Connection events
        this.socket.on('pong', (data) => {
            console.log('Pong received:', data.message);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Disconnected:', reason);
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, try to reconnect
                this.socket?.connect();
            }
        });
        this.socket.on('exchange:targetNotification', (data) => {
            store.dispatch(addChatMessage({
                playerId: 'SYSTEM',
                playerName: 'SYSTEM',
                message: `${data.message} (${data.cardName})`,
                timestamp: Date.now()
            }));
            store.dispatch(setStolenCardNotification({ cardName: data.cardName }));
        });

        // ワタリ向けL情報通知
        this.socket.on('game:watariReveal', (data) => {
            console.log('🔍 game:watariReveal received!', data);
            store.dispatch(setWatariReveal({ lPlayerName: data.lPlayerName, lPlayerColor: data.lPlayerColor }));
        });
    }

    // ==================== Emit Methods ====================

    // Room actions
    createRoom(playerName: string, maxPlayers: number, useMello: boolean, isDebug: boolean = false, roomCode?: string): void {
        if (!this.socket) return;
        if (!this.socket.connected) {
            store.dispatch(setError('サーバーと通信できません。サーバーが起動しているか確認してください。'));
            return;
        }
        localStorage.setItem('dn_playerName', playerName);
        store.dispatch(setLoading(true));
        store.dispatch(clearError());
        this.socket.emit('room:create', { playerName, maxPlayers, useMello, isDebug, roomCode });
    }

    resetRoom(roomCode: string): void {
        if (!this.socket) return;
        if (!this.socket.connected) {
            store.dispatch(setError('サーバーと通信できません。サーバーが起動しているか確認してください。'));
            return;
        }
        this.socket.emit('room:reset', { roomCode });
    }

    toggleSpectator(isSpectator: boolean): void {
        if (!this.socket) return;
        this.socket.emit('room:toggleSpectator', { isSpectator });
    }

    selectColor(color: string | null): void {
        if (!this.socket) return;
        this.socket.emit('player:selectColor', { color });
    }

    addNpc(): void {
        if (!this.socket) return;
        this.socket.emit('room:addNpc');
    }

    getDebugLogs(): void {
        if (!this.socket) return;
        this.socket.emit('debug:getLogs');
    }

    joinRoom(roomCode: string, playerName: string): void {
        if (!this.socket) return;
        if (!this.socket.connected) {
            store.dispatch(setError('サーバーと通信できません。サーバーが起動しているか確認してください。'));
            return;
        }
        localStorage.setItem('dn_playerName', playerName);
        store.dispatch(setLoading(true));
        store.dispatch(clearError());
        // Store room code temporarily - isHost will be set by room:joined event
        this.pendingRoomCode = roomCode.toUpperCase();
        this.socket.emit('room:join', { playerName, roomCode: roomCode.toUpperCase() });
    }

    leaveRoom(): void {
        if (!this.socket) return;
        localStorage.removeItem('dn_playerId');
        localStorage.removeItem('dn_roomCode');
        localStorage.removeItem('dn_playerName');
        this.socket.emit('room:leave');
        store.dispatch(resetRoom());
        store.dispatch(resetGame());
    }

    backToLobby(): void {
        if (!this.socket) return;
        this.socket.emit('room:backToLobby');
    }

    kickPlayer(targetPlayerId: string): void {
        if (!this.socket) return;
        (this.socket as any).emit('room:kickPlayer', { targetPlayerId });
    }

    startGame(): void {
        console.log('🎮 startGame called, socket:', !!this.socket, 'connected:', this.socket?.connected);
        if (!this.socket) {
            console.error('❌ Socket is null!');
            return;
        }
        console.log('📤 Emitting room:start');
        this.socket.emit('room:start');
    }

    updateDeckConfig(deckConfig: any): void {
        if (!this.socket) return;
        this.socket.emit('room:updateDeckConfig', { deckConfig });
    }

    updateRoleConfig(roleConfig: any): void {
        if (!this.socket) return;
        this.socket.emit('room:updateRoleConfig', { roleConfig });
    }

    // Game actions
    drawCard(): void {
        if (!this.socket) return;
        this.socket.emit('game:drawCard');
    }

    redrawStuckHand(): void {
        if (!this.socket) return;
        this.socket.emit('game:redrawStuckHand');
    }

    useCard(cardInstanceId: string, targetPlayerId?: string, exchangeCardId?: string, direction?: 'LEFT' | 'RIGHT'): void {
        if (!this.socket) return;
        this.socket.emit('game:useCard', { cardInstanceId, targetPlayerId, exchangeCardId, direction });
    }

    selectCard(cardInstanceId: string): void {
        if (!this.socket) return;
        this.socket.emit('game:selectCard', { cardInstanceId });
    }

    discardCard(cardInstanceId: string): void {
        if (!this.socket) return;
        this.socket.emit('game:discardCard', { cardInstanceId });
    }

    // Deprecated? Or used for something else?
    transferCard(cardInstanceId: string, direction: 'LEFT' | 'RIGHT'): void {
        if (!this.socket) return;
        this.socket.emit('game:transferCard', { cardInstanceId, direction });
    }

    endTurn(): void {
        if (!this.socket) return;
        this.socket.emit('game:endTurn');
    }

    // Exchange actions
    exchangeTargetSelect(selectedCardInstanceId: string): void {
        if (!this.socket) return;
        this.socket.emit('exchange:targetSelectedCard', { selectedCardInstanceId });
    }

    exchangeUserSelect(selectedCardInstanceId: string, targetId: string, exchangeCardInstanceId: string): void {
        if (!this.socket) return;
        this.socket.emit('exchange:userSelectedCard', { selectedCardInstanceId, targetId, exchangeCardInstanceId });
    }


    // Vote actions (Card 7)
    castVote(targetId: string): void {
        if (!this.socket) return;
        this.socket.emit('vote:cast', { targetId });
    }

    // Judgment actions (Overhauled)
    judgmentAction(targetId: string): void {
        if (!this.socket) return;
        this.socket.emit('judgment:action', { targetId });
    }

    // Chat actions
    sendChat(message: string): void {
        if (!this.socket) return;
        this.socket.emit('chat:send', { message });
    }

    sendKiraMisaChat(message: string): void {
        if (!this.socket) return;
        this.socket.emit('chat:kiraMisa', { message });
    }

    // Arrest card dismiss (triggers movie playback)
    arrestCardDismissed(): void {
        if (!this.socket) return;
        this.socket.emit('game:arrestCardDismissed');
    }

    // Utility
    ping(): void {
        if (!this.socket) return;
        this.socket.emit('ping');
    }
}

// Singleton instance
export const socketClient = new SocketClient();
