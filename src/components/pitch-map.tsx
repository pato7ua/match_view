import type { Player, PlayerDataPoint } from '@/lib/types';
import FootballPitch from './football-pitch';
import PlayerMarker from './player-marker';
import Heatmap from './heatmap';
import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';

type PlayerWithData = Player & { currentData: PlayerDataPoint };

type PitchMapProps = {
  players: PlayerWithData[];
  selectedPlayerId: number | null;
  onPlayerSelect: (id: number) => void;
  simulationTime: number;
};

export default function PitchMap({ players, selectedPlayerId, onPlayerSelect, simulationTime }: PitchMapProps) {
  const selectedPlayerData = useMemo(() => {
    if (!selectedPlayerId) return [];
    const player = players.find(p => p.id === selectedPlayerId);
    if (!player) return [];
    return player.data
      .filter(d => d.timestamp <= simulationTime)
      .map(d => d.position);
  }, [selectedPlayerId, players, simulationTime]);

  return (
    <div className="flex-1 bg-white/50 dark:bg-primary/10 backdrop-blur-xl border border-white/30 dark:border-primary/20 rounded-2xl shadow-lg p-4 relative overflow-hidden">
      <div className="relative w-full h-full">
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-lg">
          <FootballPitch className="absolute inset-0 w-full h-full object-contain" />
          <AnimatePresence>
            {selectedPlayerId && <Heatmap positions={selectedPlayerData} />}
          </AnimatePresence>
        </div>
        <div className="absolute inset-0">
          {players.map(player => (
            <PlayerMarker
              key={player.id}
              player={player}
              isSelected={selectedPlayerId === player.id}
              onClick={() => onPlayerSelect(player.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
