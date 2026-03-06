import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface ResponsiveModalProps {
    children: ReactNode;
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

export default function ResponsiveModal({
    children,
    isOpen,
    onClose,
    title
}: ResponsiveModalProps) {
    const isMobile = useIsMobile();

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            {/* 背景オーバーレイ */}
            <div className="absolute inset-0 bg-black/70" />

            {/* モーダル本体 */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`
          relative z-10 bg-dn-bg-card overflow-y-auto
          ${isMobile
                        ? 'fixed inset-0 rounded-none'
                        : 'max-w-lg w-full mx-4 max-h-[90vh] rounded-xl'
                    }
        `}
            >
                {/* ヘッダー */}
                {(title || isMobile) && (
                    <div className="sticky top-0 bg-dn-bg-card/95 backdrop-blur p-4 border-b border-gray-700 flex items-center justify-between">
                        <h2 className="text-lg font-bold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* コンテンツ */}
                <div className={`p-4 ${isMobile ? 'pb-safe' : ''}`}>
                    {children}
                </div>
            </motion.div>
        </motion.div>
    );
}
