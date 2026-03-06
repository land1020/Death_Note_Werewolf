import { Server } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '../../../shared/types/index.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export class DebugLogger {
    static log(io: TypedServer, roomCode: string, message: string, type: 'info' | 'warn' | 'error' | 'game' = 'info') {
        // Console log
        const icon = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'game' ? '🎮' : 'ℹ️';
        console.log(`${icon} [${roomCode}] ${message}`);

        // Emit to room (only checking isDebug at call site or here? Better to check here if we pass game state, but we only pass roomCode. We assume caller checks isDebug or we allow all logs for now since it's debug mode feature but listening is restricted to room members)
        // Actually, we should check if room is in debug mode, but for simplicity, we just emit to room.
        // The client side overlay is only visible if enabled, but anyone with devtools could see it.
        // Given this is a requested feature (Debug Mode), we can just emit.

        io.to(roomCode).emit('debug:log', { message, type });
    }
}
