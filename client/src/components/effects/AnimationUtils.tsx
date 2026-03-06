import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

// ページ遷移用バリアント
export const pageVariants = {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 30 },
};

export const pageTransition = {
    duration: 0.3,
    ease: 'easeInOut',
};

// フェーズ遷移用バリアント
export const phaseVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
};

export const phaseTransition = {
    duration: 0.4,
    ease: 'easeOut',
};

// フェードインバリアント
export const fadeVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};

// スライドアップバリアント
export const slideUpVariants = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 },
};

// スケールバリアント
export const scaleVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
};

// ページラッパーコンポーネント
interface PageWrapperProps {
    children: ReactNode;
    className?: string;
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
            className={className}
            style={{ willChange: 'transform, opacity' }}
        >
            {children}
        </motion.div>
    );
}

// フェーズラッパーコンポーネント
interface PhaseWrapperProps {
    children: ReactNode;
    phase: string;
    className?: string;
}

export function PhaseWrapper({ children, phase, className = '' }: PhaseWrapperProps) {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={phase}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={phaseVariants}
                transition={phaseTransition}
                className={className}
                style={{ willChange: 'transform, opacity' }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}

// リストアイテム用スタガーアニメーション
export const staggerContainer = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

export const staggerItem = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
};

// パルスアニメーション
export function PulseWrapper({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// シェイクアニメーション
export function ShakeWrapper({ children, trigger, className = '' }: { children: ReactNode; trigger?: boolean; className?: string }) {
    return (
        <motion.div
            animate={trigger ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// フローティングアニメーション
export function FloatWrapper({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
