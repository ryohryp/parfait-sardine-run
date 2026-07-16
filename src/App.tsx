import { useState } from 'react';
import { AppShell } from './app/AppShell';
import { ParfaitSardineRun, type ParfaitSardineRunPhase } from './components/ParfaitSardineRun';
import './App.css';

function App() {
  const [gamePhase, setGamePhase] = useState<ParfaitSardineRunPhase>('menu');

  return (
    <AppShell gamePhase={gamePhase}>
      <ParfaitSardineRun onPhaseChange={setGamePhase} />
    </AppShell>
  );
}

export default App;
