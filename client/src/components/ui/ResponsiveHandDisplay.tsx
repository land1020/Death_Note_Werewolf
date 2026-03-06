import { motion } from 'framer-motion';
import type { Card } from 'shared/types';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { CardVisual } from '../effects';

interface ResponsiveHandDisplayProps {
    hand: Card[];
    selectedCardId?: string;
    onCardSelect?: (card: Card) => void;
}

export default function ResponsiveHandDisplay({
    hand,
    selectedCardId,
    onCardSelect
}: ResponsiveHandDisplayProps) {
    const isMobile = useIsMobile();

    return (
        <div className={`
      flex justify-center items-end
      ${isMobile ? '-space-x-6' : 'gap-3 lg:gap-4'}
    `}>
            {hand.map((card, index) => (
                <motion.div
                    key={card.instanceId}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -10, zIndex: 50 }}
                    style={{ zIndex: selectedCardId === card.instanceId ? 50 : index }}
                    className="touch-manipulation"
                >
                    <CardVisual
                        card={card}
                        size={isMobile ? 'medium' : 'large'}
                        selected={selectedCardId === card.instanceId}
                        onClick={() => onCardSelect?.(card)}
                    />
                </motion.div>
            ))}
        </div>
    );
}
