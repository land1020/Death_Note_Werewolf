import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CutscenePlayerProps {
    type?: 'SHINIGAMI' | 'GUN' | 'ARREST' | 'JUDGMENT' | null;
    videoSrc: string;
    onComplete: () => void;
}

export const CutscenePlayer: React.FC<CutscenePlayerProps> = ({ type, videoSrc, onComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState(false);

    const getFallbackText = () => {
        switch (type) {
            case 'SHINIGAMI': return '💀 死神の目が発動した... 💀';
            case 'GUN': return '🔫 銃声が響き渡った... 💥';
            case 'ARREST': return '🚔 キラを逮捕した！ 🚨';
            case 'JUDGMENT': return '📓 裁きが下された... 💀';
            default: return '演出処理中...';
        }
    };

    const encodedSrc = React.useMemo(() => encodeURI(videoSrc), [videoSrc]);

    useEffect(() => {
        let isCancelled = false;
        const video = videoRef.current;
        if (!video) return;

        const playVideo = async () => {
            try {
                // Ensure video is loaded
                if (video.readyState < 3) { // HAVE_FUTURE_DATA
                    video.load();
                }
                await video.play();
            } catch (e) {
                if (isCancelled) return;
                console.warn("Video play failed, trying muted:", e);
                
                // Autoplay policy fallback: try playing muted
                try {
                    video.muted = true;
                    await video.play();
                } catch (mutedError) {
                    if (isCancelled) return;
                    console.error("Muted video play also failed:", mutedError);
                    setError(true);
                    // Fallback to text for 3 seconds
                    setTimeout(() => {
                        if (!isCancelled) onComplete();
                    }, 3000);
                }
            }
        };

        playVideo();

        return () => {
            isCancelled = true;
        };
    }, [encodedSrc, onComplete]);

    const handleEnded = () => {
        onComplete();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            >
                {!error ? (
                    <video
                        ref={videoRef}
                        src={encodedSrc}
                        className="w-full h-full object-contain"
                        onEnded={handleEnded}
                        autoPlay
                        playsInline
                    // controls // デバッグ用
                    />
                ) : (
                    <div className="text-white text-2xl font-bold animate-pulse">
                        {getFallbackText()}
                    </div>
                )}

                {/* スキップボタン（デバッグ用・または長すぎる場合用） */}
                {/* 
                <button 
                    onClick={onComplete}
                    className="absolute bottom-10 right-10 text-white/50 hover:text-white border border-white/30 px-4 py-2 rounded"
                >
                    Skip
                </button>
                */}
            </motion.div>
        </AnimatePresence>
    );
};
