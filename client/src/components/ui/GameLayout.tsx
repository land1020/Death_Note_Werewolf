import type { ReactNode } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface GameLayoutProps {
    header: ReactNode;
    mainArea: ReactNode;
    sidePanel?: ReactNode;
    myArea: ReactNode;
}

export default function GameLayout({
    header,
    mainArea,
    sidePanel,
    myArea
}: GameLayoutProps) {
    const isMobile = useIsMobile();

    // スマホ版レイアウト
    if (isMobile) {
        return (
            <div className="min-h-screen bg-dn-bg-primary flex flex-col">
                {/* ヘッダー（コンパクト） */}
                <header className="sticky top-0 z-40 bg-dn-bg-card/95 backdrop-blur border-b border-gray-800 px-4 py-2">
                    {header}
                </header>

                {/* メインエリア */}
                <main className="flex-1 overflow-y-auto px-4 py-2">
                    {mainArea}
                </main>

                {/* 自分のエリア（固定） */}
                <footer className="sticky bottom-0 bg-dn-bg-card/95 backdrop-blur border-t border-gray-800 px-4 py-3 pb-safe">
                    {myArea}
                </footer>
            </div>
        );
    }

    // PC版レイアウト
    return (
        <div className="min-h-screen bg-dn-bg-primary flex flex-col">
            {/* ヘッダー */}
            <header className="bg-dn-bg-card border-b border-gray-800 px-6 py-3">
                {header}
            </header>

            {/* メイン + サイドパネル */}
            <div className="flex-1 flex">
                {/* メインエリア */}
                <main className="flex-1 p-6">
                    {mainArea}
                </main>

                {/* サイドパネル（PC only） */}
                {sidePanel && (
                    <aside className="w-80 bg-dn-bg-card border-l border-gray-800 p-4 overflow-y-auto">
                        {sidePanel}
                    </aside>
                )}
            </div>

            {/* 自分のエリア */}
            <footer className="bg-dn-bg-card border-t border-gray-800 px-6 py-4">
                {myArea}
            </footer>
        </div>
    );
}
