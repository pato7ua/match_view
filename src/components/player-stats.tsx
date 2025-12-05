"use client";

import { useMemo } from 'react';
import type { Player } from '@/lib/types';
import { TrendingUp, Zap, Footprints } from 'lucide-react';
import { PITCH_LENGTH, PITCH_WIDTH, SPRINT_THRESHOLD } from '@/lib/constants';


type PlayerStatsProps = {
  player: Player;
  simulationTime: number;
};

const StatCard = ({ icon, label, value, unit }: { icon: React.ReactNode, label: string, value: string, unit: string }) => (
  <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg flex items-center gap-4">
    <div className="text-accent">{icon}</div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">
        {value} <span className="text-base font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  </div>
);

export default function PlayerStats({ player, simulationTime }: PlayerStatsProps) {
  const stats = useMemo(() => {
    const dataSlice = player.data.filter(d => d.timestamp <= simulationTime);
    if (dataSlice.length < 2) {
      return { distance: "0.00", maxSpeed: "0.0", sprints: 0 };
    }

    let distance = 0;
    for (let i = 1; i < dataSlice.length; i++) {
      const p1 = dataSlice[i-1].position;
      const p2 = dataSlice[i].position;
      // Data: x is vertical (length), y is horizontal (width)
      const dx_meters = (p2.x - p1.x) / 100 * PITCH_LENGTH; 
      const dy_meters = (p2.y - p1.y) / 100 * PITCH_WIDTH;
      distance += Math.sqrt(dx_meters*dx_meters + dy_meters*dy_meters);
    }
    
    const maxSpeed = Math.max(0, ...dataSlice.map(d => d.speed));

    let sprints = 0;
    let isSprinting = false;
    dataSlice.forEach(d => {
      if (d.speed >= SPRINT_THRESHOLD && !isSprinting) {
        isSprinting = true;
        sprints++;
      } else if (d.speed < SPRINT_THRESHOLD) {
        isSprinting = false;
      }
    });

    return {
      distance: (distance / 1000).toFixed(2), // in km
      maxSpeed: maxSpeed.toFixed(1),
      sprints
    };
  }, [player, simulationTime]);

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      <StatCard 
        icon={<Footprints size={28} />} 
        label="Distance Covered" 
        value={stats.distance} 
        unit="km"
      />
      <StatCard 
        icon={<TrendingUp size={28} />} 
        label="Max Speed" 
        value={stats.maxSpeed} 
        unit="m/s"
      />
      <StatCard 
        icon={<Zap size={28} />} 
        label="Sprints" 
        value={String(stats.sprints)} 
        unit=""
      />
    </div>
  );
}
