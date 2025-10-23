import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './hooks/useToast';
import { Toaster } from './components/Toaster';
import Home from './pages/Home';
import Join from './pages/Join';
import Game from './pages/Game';

function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-bg-primary">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:roomId" element={<Join />} />
          <Route path="/game/:roomId" element={<Game />} />
        </Routes>
        <Toaster />
      </div>
    </AppProvider>
  );
}

export default App;
