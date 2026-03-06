
import { Server } from 'socket.io';
import { GameState, Player, Role, WinCondition, GamePhase, CardId, Card } from '../../../shared/types/index.js';

export function addToDiscardPile(game: GameState, card: Card) {
    game.roundDiscardPile = game.roundDiscardPile || [];
    game.roundDiscardPile.push(card);
    while (game.roundDiscardPile.length > game.players.length) {
        const oldestCard = game.roundDiscardPile.shift();
        if (oldestCard) {
            game.discardPile.push(oldestCard);
        }
    }
    game.publicInfo.lastDiscard = card;
}

export function checkWinCondition(game: GameState): WinCondition | null {
    const kira = game.players.find(p => p.role === Role.KIRA);
    const alivePlayers = game.players.filter((p: Player) => p.isAlive);
    const aliveL = alivePlayers.filter((p: Player) => p.role === Role.L);
    const aliveLTeam = alivePlayers.filter((p: Player) =>
        [Role.L, Role.POLICE, Role.WATARI].includes(p.role!)
    );
    const aliveKiraTeam = alivePlayers.filter((p: Player) =>
        [Role.KIRA, Role.MISA].includes(p.role!)
    );

    // 1. キラが死亡 → L勝利 (メロが殺した場合は別途処理されるため、ここではL勝利とする)
    if (kira && !kira.isAlive) {
        if (game.winner) return game.winner; // Already decided
        return WinCondition.L_WINS;
    }

    // Lが死亡 → キラ勝利
    if (aliveL.length === 0) {
        return WinCondition.KIRA_WINS;
    }

    // L陣営が1人以下 → キラ勝利
    if (aliveLTeam.length <= 1) {
        return WinCondition.KIRA_WINS;
    }

    // キラ陣営が全滅 → L勝利
    if (aliveKiraTeam.length === 0) {
        return WinCondition.L_WINS;
    }

    // 全逮捕カードが除外 -> キラ勝利
    const remainingArrestCards =
        game.deck.filter(c => c.id === CardId.ARREST).length +
        game.discardPile.filter(c => c.id === CardId.ARREST).length +
        (game.roundDiscardPile || []).filter(c => c.id === CardId.ARREST).length +
        alivePlayers.flatMap(p => p.hand).filter(c => c.id === CardId.ARREST).length;

    if (remainingArrestCards === 0 && game.removedCards.some(c => c.id === CardId.ARREST)) {
        return WinCondition.KIRA_WINS;
    }

    return null;
}

export function processDeath(
    io: Server,
    game: GameState,
    roomCode: string,
    victimId: string,
    killerId?: string, // Optional: who killed
    killerRole?: Role // Optional: role of killer (for Mello check)
) {
    const victim = game.players.find(p => p.id === victimId);
    if (!victim || !victim.isAlive) return;

    // Kill
    victim.isAlive = false;
    console.log(`💀 Player ${victim.name} (${victim.role}) died.`);

    // Notify
    io.to(roomCode).emit('game:playerDied', {
        playerId: victimId,
        cause: killerRole ? `Killed by ${killerRole}` : 'Died'
    });

    // Valid Win Conditions immediately
    // Special Case: Mello kills Kira
    if (killerRole === Role.MELLO && victim.role === Role.KIRA) {
        game.winner = WinCondition.MELLO_WINS;
        endGame(io, game, roomCode, WinCondition.MELLO_WINS);
        return;
    }

    // General Checks
    const winner = checkWinCondition(game);
    if (winner) {
        endGame(io, game, roomCode, winner);
    }
}

export function endGame(io: Server, game: GameState, roomCode: string, winner: WinCondition) {
    game.winner = winner;
    game.phase = GamePhase.GAME_END;
    io.to(roomCode).emit('game:ended', { winner, finalState: game });
    console.log(`🏆 Game Ended in room ${roomCode}. Winner: ${winner}`);
}

export function checkAndReplenishDeck(io: Server<any, any>, game: GameState, roomCode: string) {
    if (game.deck.length === 0) {
        const allDiscards = [...game.discardPile, ...(game.roundDiscardPile || [])];
        if (allDiscards.length > 0) {
            console.log(`♻️ Deck empty. Reshuffling ${allDiscards.length} discarded cards...`);
            for (let i = allDiscards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allDiscards[i], allDiscards[j]] = [allDiscards[j], allDiscards[i]];
            }
            allDiscards.forEach(c => {
                c.isUsed = false;
                c.history = undefined;
            });
            game.deck = allDiscards;
            game.discardPile = [];
            game.roundDiscardPile = [];

            io.to(roomCode).emit('game:updated', { gameState: game });
            io.to(roomCode).emit('chat:message', {
                playerId: 'SYSTEM',
                playerName: 'SYSTEM',
                message: '山札がなくなったため、捨て札をシャッフルして山札を補充しました。',
                timestamp: Date.now()
            });
        }
    }
}
