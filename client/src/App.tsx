import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSocket } from './hooks';
import TopPage from './pages/TopPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';

function App() {
    // Initialize socket connection
    const { isConnecting } = useSocket();

    if (isConnecting) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dn-accent mx-auto mb-4"></div>
                    <p className="text-dn-text-secondary">サーバーに接続中...</p>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                <Route path="/" element={<TopPage />} />
                <Route path="/room/:code" element={<LobbyPage />} />
                <Route path="/game/:code" element={<GamePage />} />
            </Routes>
        </Router>
    );
}

export default App;
