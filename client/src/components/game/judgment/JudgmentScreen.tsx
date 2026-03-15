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
            <div className="relative z-10 w-full h-full flex flex-col pt-2 pb-4 md:pb-8">

                {/* Header - Fixed at top */}
                <div className="flex-shrink-0">
                    <JudgmentHeader />
                </div>

                {/* View Switcher based on Role - Scrollable area to prevent cut-off */}
                <div className="flex-1 w-full mt-2 overflow-y-auto px-2 md:px-4 custom-scrollbar focus:outline-none">
                    <div className="min-h-full flex items-start justify-center py-4">
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

            </div>
        </motion.div>
    );
};
