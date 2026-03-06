import { useEffect, useState } from 'react';
import { socketClient } from '../socket';

interface UseSocketReturn {
    isConnected: boolean;
    isConnecting: boolean;
    createRoom: (playerName: string, maxPlayers: number, useMello: boolean) => void;
    joinRoom: (roomCode: string, playerName: string) => void;
    leaveRoom: () => void;
    startGame: () => void;
    drawCard: () => void;
    useCard: (cardInstanceId: string, targetPlayerId?: string) => void;
    discardCard: (cardInstanceId: string) => void;
    transferCard: (cardInstanceId: string, direction: 'LEFT' | 'RIGHT') => void;
    judgmentAction: (targetId: string) => void;
    sendChat: (message: string) => void;
}

export function useSocket(): UseSocketReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        const connect = async () => {
            setIsConnecting(true);
            try {
                await socketClient.connect();
                setIsConnected(true);
            } catch (error) {
                console.error('Failed to connect:', error);
                setIsConnected(false);
            } finally {
                setIsConnecting(false);
            }
        };

        connect();

        return () => {
            // Don't disconnect on unmount - socket should persist
        };
    }, []);

    return {
        isConnected,
        isConnecting,
        createRoom: socketClient.createRoom.bind(socketClient),
        joinRoom: socketClient.joinRoom.bind(socketClient),
        leaveRoom: socketClient.leaveRoom.bind(socketClient),
        startGame: socketClient.startGame.bind(socketClient),
        drawCard: socketClient.drawCard.bind(socketClient),
        useCard: socketClient.useCard.bind(socketClient),
        discardCard: socketClient.discardCard.bind(socketClient),
        transferCard: socketClient.transferCard.bind(socketClient),
        judgmentAction: socketClient.judgmentAction.bind(socketClient),
        sendChat: socketClient.sendChat.bind(socketClient),
    };
}
