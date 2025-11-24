import { Routes, Route } from 'react-router-dom';
import { GamePage } from './routes/GamePage';
import { CommentsPage } from './routes/CommentsPage';
import { HistoryPage } from './routes/HistoryPage';
import { StatsPage } from './routes/StatsPage';
import { LeaderboardPage } from './routes/LeaderboardPage';

import { SettingsPage } from './routes/SettingsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<GamePage />} />
      <Route path="/comments" element={<CommentsPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

export default App;
