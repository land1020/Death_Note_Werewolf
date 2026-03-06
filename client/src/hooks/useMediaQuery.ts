import { useState, useEffect } from 'react';

/**
 * メディアクエリフック
 * @param query メディアクエリ文字列 (例: '(max-width: 768px)')
 * @returns マッチしているかどうか
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        setMatches(mediaQuery.matches);

        const handler = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

/**
 * モバイル判定フック
 * @returns モバイルデバイスかどうか
 */
export function useIsMobile(): boolean {
    return useMediaQuery('(max-width: 768px)');
}

/**
 * タブレット判定フック
 * @returns タブレットデバイスかどうか
 */
export function useIsTablet(): boolean {
    return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

/**
 * デスクトップ判定フック
 * @returns デスクトップデバイスかどうか
 */
export function useIsDesktop(): boolean {
    return useMediaQuery('(min-width: 1025px)');
}

/**
 * ブレークポイント情報を返すフック
 */
export function useBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
    const isMobile = useIsMobile();
    const isTablet = useIsTablet();

    if (isMobile) return 'mobile';
    if (isTablet) return 'tablet';
    return 'desktop';
}
