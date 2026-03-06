import React from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../../../hooks';
import { selectMyPlayerId } from '../../../store/roomSlice';
import { selectGamePlayers } from '../../../store/gameSlice';
import { Role } from 'shared/types';
import { JudgmentBackground } from './JudgmentBackground';
import { JudgmentHeader } from './JudgmentHeader';
import { KiraJudgmentView } from './KiraJudgmentView';
import { MisaJudgmentView } from './MisaJudgmentView';
import { OtherPlayerJudgmentView } from './OtherPlayerJudgmentView';
import { SpectatorJudgmentView } from './SpectatorJudgmentView';

export const JudgmentScreen: React.FC = () => {
    const myPlayerId = useAppSelector(selectMyPlayerId);
    const players = useAppSelector(selectGamePlayers);
    const myPlayer = players.find(p => p.id === myPlayerId);

    const isKira = myPlayer?.role === Role.KIRA;
    const isMisa = myPlayer?.role === Role.MISA;
    // Spectator if dead or not in players list (and not just connecting)
    // Also include debug spectator mode
    const isSpectator = !myPlayer || myPlayer.isSpectator || !myPlayer.isAlive;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black overflow-hidden flex flex-col"
        >
            {/* Background Visuals */}
            <JudgmentBackground />

            {/* Main Content */}
            <div className="relative z-10 w-full h-full flex flex-col p-4 md:p-8">

                {/* Header */}
                <JudgmentHeader />

                {/* View Switcher based on Role */}
                <div className="flex-1 flex items-center justify-center w-full mt-4">
                    {isSpectator ? (
                        <SpectatorJudgmentView />
                    ) : isKira ? (
                        <KiraJudgmentView />
                    ) : isMisa ? (
                        <MisaJudgmentView />
                    ) : (
                        <OtherPlayerJudgmentView />
                    )}
                </div>

            </div>
        </motion.div>
    );
};
