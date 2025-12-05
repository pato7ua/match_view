"use client";

import type { PlayerDataPoint, Player } from '@/lib/types';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import BatteryIndicator from '@/components/battery-indicator';
import PlayerStats from '@/components/player-stats';
import { Play, Pause, Radio, Download, Footprints, TrendingUp, Zap, ArrowLeft, Battery } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { PITCH_LENGTH, PITCH_WIDTH, SPRINT_THRESHOLD } from '@/lib/constants';

type PlayerWithData = Player & { currentData: PlayerDataPoint };
type StatType = 'speed' | 'distance' | 'maxSpeed' | 'battery';

const StatIcon = ({ type }: { type: StatType }) => {
  switch (type) {
    case 'speed': return <Zap className="h-4 w-4" />;
    case 'distance': return <Footprints className="h-4 w-4" />;
    case 'maxSpeed': return <TrendingUp className="h-4 w-4" />;
    case 'battery': return <Battery className="h-4 w-4" />;
    default: return null;
  }
};

const getStatValue = (player: PlayerWithData, type: StatType, simulationTime: number) => {
    const dataSlice = player.data.filter(d => d.timestamp <= simulationTime);
    if (dataSlice.length === 0) return '0';

    switch (type) {
        case 'speed':
            return `${player.currentData.speed.toFixed(1)} m/s`;
        case 'distance': {
            if (dataSlice.length < 2) return '0.00 km';
            let distance = 0;
            for (let i = 1; i < dataSlice.length; i++) {
                const p1 = dataSlice[i - 1].position;
                const p2 = dataSlice[i].position;
                const dx = (p2.y - p1.y) / 100 * PITCH_WIDTH; // horizontal
                const dy = (p2.x - p1.x) / 100 * PITCH_LENGTH; // vertical
                distance += Math.sqrt(dx * dx + dy * dy);
            }
            return `${(distance / 1000).toFixed(2)} km`;
        }
        case 'maxSpeed': {
            const maxSpeed = Math.max(0, ...dataSlice.map(d => d.speed));
            return `${maxSpeed.toFixed(1)} m/s`;
        }
        case 'battery':
            return `${player.currentData.battery}%`;
        default:
            return '';
    }
};

const sidebarVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};


type PlayerSidebarProps = {
  players: PlayerWithData[];
  selectedPlayerId: number | null;
  onPlayerSelect: (id: number | null) => void;
  onToggleMatch: () => void;
  onRecord: () => void;
  onExport: () => void;
  matchStatus: 'Live' | 'Paused' | 'Ended';
  simulationTime: number;
  className?: string;
};

export default function PlayerSidebar({
  players,
  selectedPlayerId,
  onPlayerSelect,
  onToggleMatch,
  onRecord,
  onExport,
  matchStatus,
  simulationTime,
  className
}: PlayerSidebarProps) {
  const [statType, setStatType] = useState<StatType>('distance');
  
  const selectedPlayer = players.find(p => p.id === selectedPlayerId) ?? null;

  const handleStatToggle = () => {
    const order: StatType[] = ['speed', 'distance', 'maxSpeed', 'battery'];
    const currentIndex = order.indexOf(statType);
    setStatType(order[(currentIndex + 1) % order.length]);
  };

  return (
    <aside className={cn("md:flex flex-col w-full max-w-xs lg:max-w-sm shrink-0 bg-white/50 dark:bg-primary/10 backdrop-blur-xl border border-white/30 dark:border-primary/20 rounded-2xl shadow-lg overflow-hidden", className)}>
      <AnimatePresence mode="wait">
        {selectedPlayer ? (
          <motion.div
            key="stats"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full"
          >
            <div className="p-4 border-b border-white/30 dark:border-primary/20 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">#{selectedPlayer.jersey}</p>
                <h2 className="text-xl font-semibold tracking-tight">{selectedPlayer.name}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onPlayerSelect(null)}>
                <ArrowLeft className="h-5 w-5 mr-1" />
                <span className="sr-only">Back to all players</span>
              </Button>
            </div>
            <PlayerStats player={selectedPlayer} simulationTime={simulationTime} />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full"
          >
            <div className="p-4 border-b border-white/30 dark:border-primary/20 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Players</h2>
              <Button variant="ghost" size="icon" onClick={handleStatToggle}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={statType}
                    initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <StatIcon type={statType} />
                  </motion.div>
                </AnimatePresence>
                <span className="sr-only">Toggle Stat Display</span>
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {players.map(player => (
                  <div
                    key={player.id}
                    onClick={() => onPlayerSelect(player.id)}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200",
                      "hover:bg-accent/10 dark:hover:bg-accent/20",
                      selectedPlayerId === player.id ? 'bg-accent/20 dark:bg-accent/30 scale-[1.02]' : 'bg-transparent'
                    )}
                    role="button"
                    aria-pressed={selectedPlayerId === player.id}
                  >
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary font-bold">
                      {player.jersey}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{player.name}</p>
                      <p className="text-sm text-muted-foreground">{getStatValue(player, 'speed', simulationTime)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       {statType === 'battery' ? (
                          <>
                            <BatteryIndicator level={player.currentData.battery} />
                            <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                                {getStatValue(player, statType, simulationTime)}
                            </span>
                          </>
                       ) : (
                          <span className="text-xs font-mono text-muted-foreground w-20 text-right">
                              {getStatValue(player, statType, simulationTime)}
                          </span>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator className="bg-white/30 dark:bg-primary/20" />
            <div className="p-4 space-y-2">
              <Button onClick={onToggleMatch} size="lg" className="w-full">
                {matchStatus === 'Live' ? <Pause className="mr-2" /> : <Play className="mr-2" />}
                {matchStatus === 'Live' ? 'Pause Match' : matchStatus === 'Ended' ? 'Restart Match' : 'Start Match'}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={onRecord} variant="secondary">
                  <Radio className="mr-2" />
                  Record
                </Button>
                <Button onClick={onExport} variant="secondary">
                  <Download className="mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
