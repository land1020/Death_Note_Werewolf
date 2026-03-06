/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // デスノートテーマカラー
                'dn-bg': {
                    primary: '#1a1a2e',
                    secondary: '#16213e',
                    card: '#0f3460',
                },
                'dn-accent': '#e94560',
                'dn-text': {
                    primary: '#ffffff',
                    secondary: '#a0a0a0',
                    muted: '#6b6b6b',
                },
                // チーム別カラー
                'team-kira': '#e94560',
                'team-l': '#3498db',
                'team-third': '#9b59b6',
            },
            fontFamily: {
                'gothic': ['"Noto Sans JP"', 'sans-serif'],
                'creepy': ['"Creepster"', 'cursive'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 5px #e94560, 0 0 10px #e94560' },
                    '100%': { boxShadow: '0 0 20px #e94560, 0 0 30px #e94560' },
                },
            },
            boxShadow: {
                'dn': '0 4px 20px rgba(233, 69, 96, 0.3)',
                'dn-lg': '0 10px 40px rgba(233, 69, 96, 0.4)',
            },
        },
    },
    plugins: [],
}
