"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Player, PlayerDataPoint } from '@/lib/types';
import { players as dummyPlayers } from '@/lib/dummy-data';
import DashboardHeader from '@/components/dashboard-header';
import PlayerSidebar from '@/components/player-sidebar';
import PitchMap from '@/components/pitch-map';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const MAX_SIMULATION_TIME = 300; // 5 minutes in seconds

export default function MatchViewDashboard() {
  const [simulationTime, setSimulationTime] = useState(0);
  const [matchStatus, setMatchStatus] = useState<'Live' | 'Paused' | 'Ended'>('Paused');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>(dummyPlayers);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (matchStatus === 'Live') {
      interval = setInterval(() => {
        setSimulationTime(prevTime => {
          if (prevTime >= MAX_SIMULATION_TIME) {
            setMatchStatus('Ended');
            clearInterval(interval);
            return MAX_SIMULATION_TIME;
          }
          return prevTime + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [matchStatus]);

  const handlePlayerSelect = useCallback((id: number | null) => {
    setSelectedPlayerId(id);
  }, []);

  const handleToggleMatch = useCallback(() => {
    if (matchStatus === 'Ended') {
      setSimulationTime(0);
      setMatchStatus('Live');
      toast({ title: "Match Restarted", description: "Simulation has been reset." });
    } else {
      const newStatus = matchStatus === 'Live' ? 'Paused' : 'Live';
      setMatchStatus(newStatus);
      toast({ title: `Match ${newStatus}` });
    }
  }, [matchStatus, toast]);
  
  const handleRecord = useCallback(() => {
    toast({ title: "Recording Started", description: "Match session is now being recorded." });
  }, [toast]);

  const handleExport = useCallback(() => {
    toast({ title: "Data Exported", description: "Player data has been successfully exported." });
  }, [toast]);

  const playersWithCurrentData = useMemo(() => {
    return players.map(player => {
      const currentData = 
        [...player.data]
          .reverse()
          .find(d => d.timestamp <= simulationTime) ?? player.data[0];
      return { ...player, currentData };
    });
  }, [players, simulationTime]);
  
  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId) return null;
    return players.find(p => p.id === selectedPlayerId) ?? null;
  }, [selectedPlayerId, players]);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <DashboardHeader 
        matchStatus={matchStatus} 
        simulationTime={simulationTime} 
      >
        <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Dashboard</span>
            </Link>
        </Button>
      </DashboardHeader>
      <main className="flex flex-1 gap-4 md:gap-6 p-4 md:p-6 overflow-hidden">
        <PlayerSidebar
          players={playersWithCurrentData}
          selectedPlayerId={selectedPlayerId}
          onPlayerSelect={handlePlayerSelect}
          onToggleMatch={handleToggleMatch}
          onRecord={handleRecord}
          onExport={handleExport}
          matchStatus={matchStatus}
          simulationTime={simulationTime}
        />
        <PitchMap
          players={playersWithCurrentData}
          selectedPlayerId={selectedPlayerId}
          onPlayerSelect={(id) => handlePlayerSelect(id === selectedPlayerId ? null : id)}
          simulationTime={simulationTime}
        />
      </main>
    </div>
  );
}
