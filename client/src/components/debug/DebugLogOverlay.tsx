import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '../../socket';

interface Log {
    id: string;
    message: string;
    type: 'info' | 'warn' | 'error' | 'game';
    timestamp: number;
}

export default function DebugLogOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<Log[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const socket = socketClient.socketInstance;
        if (!socket) return;

        const handleLog = (data: { message: string, type?: 'info' | 'warn' | 'error' | 'game' }) => {
            setLogs(prev => [
                ...prev,
                {
                    id: Math.random().toString(36).substr(2, 9),
                    message: data.message,
                    type: data.type || 'info',
                    timestamp: Date.now()
                }
            ].slice(-100)); // Keep last 100 logs
        };

        socket.on('debug:log', handleLog);

        return () => {
            socket.off('debug:log', handleLog);
        };
    }, []);

    useEffect(() => {
        if (isOpen && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isOpen]);

    const getLogColor = (type: string) => {
        switch (type) {
            case 'error': return 'text-red-400';
            case 'warn': return 'text-yellow-400';
            case 'game': return 'text-green-400';
            default: return 'text-gray-300';
        }
    };

    if (!logs.length && !isOpen) return null;

    return (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-gray-900/80 hover:bg-gray-800 text-white p-2 rounded-lg border border-gray-700 shadow-lg text-xs flex items-center gap-2"
            >
                <span>🛠 デバックログ</span>
                {logs.length > 0 && (
                    <span className="bg-dn-accent text-white text-[10px] px-1.5 rounded-full">
                        {logs.length}
                    </span>
                )}
            </button>

            {/* Log Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl w-80 md:w-96 max-h-96 flex flex-col overflow-hidden"
                    >
                        <div className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-400">System Logs</span>
                            <button
                                onClick={() => setLogs([])}
                                className="text-xs text-gray-500 hover:text-white"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px] md:text-xs">
                            {logs.map(log => (
                                <div key={log.id} className={`${getLogColor(log.type)} break-words`}>
                                    <span className="opacity-50 mr-2">
                                        [{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]
                                    </span>
                                    {log.message}
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
