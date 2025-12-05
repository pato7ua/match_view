
"use client";

import { useState } from 'react';
import type { SeasonPlayer } from '@/lib/season-data';
import { seasonPlayers } from '@/lib/season-data';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BarChart, ChevronRight, List, Signal, PlayCircle, Users, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { upcomingMatches, ourTeam } from '@/lib/teams';
import Image from 'next/image';

type SortKey = 'distance' | 'maxSpeed';

const NextMatchCard = () => {
    const nextMatch = upcomingMatches[0];
    const opponent = nextMatch.teams.find(t => t.id !== ourTeam.id)!;
    
    const [ourTeamLogo, setOurTeamLogo] = useState(() => `/${ourTeam.logoUrl}`);
    const [opponentLogo, setOpponentLogo] = useState(() => `/${opponent.logoUrl}`);


    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Next Match</CardTitle>
                <PlayCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
                <div className="flex-1">
                    <div className="flex items-center justify-center space-x-4">
                        <div className="flex flex-col items-center gap-2">
                            <Avatar className="h-12 w-12">
                                <AvatarImage 
                                  src={ourTeamLogo} 
                                  alt={ourTeam.name} 
                                  onError={() => setOurTeamLogo(`/assets/team-icons/${ourTeam.id}.png`)}
                                />
                                <AvatarFallback>{ourTeam.name.substring(0,2)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-sm text-center">{ourTeam.name}</span>
                        </div>
                        <span className="text-muted-foreground font-bold text-lg">VS</span>
                         <div className="flex flex-col items-center gap-2">
                            <Avatar className="h-12 w-12">
                                 <AvatarImage 
                                   src={opponentLogo} 
                                   alt={opponent.name} 
                                   onError={() => setOpponentLogo(`/assets/team-icons/${opponent.id}.png`)}
                                 />
                                <AvatarFallback>{opponent.name.substring(0,2)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-sm text-center">{opponent.name}</span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">{new Date(nextMatch.date).toLocaleString('default', { month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button asChild size="sm">
                        <Link href="/match">Start Match</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                        <Link href="/matches">All Matches</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default function ManagerDashboard() {
  const [sortKey, setSortKey] = useState<SortKey>('distance');

  const sortedPlayers = [...seasonPlayers].sort((a, b) => {
    if (sortKey === 'distance') {
      return b.seasonStats.totals.distance - a.seasonStats.totals.distance;
    } else {
      return b.seasonStats.totals.maxSpeed - a.seasonStats.totals.maxSpeed;
    }
  }).slice(0, 10);
  
  const trackers = seasonPlayers.map((p, i) => {
    const battery = 100 - (i * 3 + 5)
    return {
        id: p.id,
        playerName: p.name,
        jersey: p.jersey,
        status: battery > 10 ? 'Online' : 'Low Battery' as 'Online' | 'Low Battery' | 'Offline',
        signal: Math.floor(battery / 25)
    }
  });

  const offlineTrackerCount = Math.floor(seasonPlayers.length / 5);
  for (let i = 0; i < offlineTrackerCount; i++) {
    if (trackers[i]) {
        trackers[i].status = 'Offline';
        trackers[i].signal = 0;
    }
  }
  if (trackers.length > 2 && trackers[offlineTrackerCount + 1]) {
    trackers[offlineTrackerCount + 1].status = 'Low Battery';
  }


  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6">
          <h1 className="text-lg font-semibold sm:text-xl md:text-2xl tracking-tight">
            Manager Dashboard
          </h1>
          <Button asChild variant="outline">
            <Link href="/match">
              Live Match View
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {upcomingMatches.length > 0 ? <NextMatchCard /> : <Card><CardHeader><CardTitle className="text-sm font-medium">No Upcoming Matches</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Check back later for new match schedules.</p></CardContent></Card>}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Squad Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
                <div className="flex-1">
                  <div className="text-2xl font-bold">{seasonPlayers.length}</div>
                  <p className="text-xs text-muted-foreground">active players on the roster</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button asChild size="sm" variant="outline">
                        <Link href="/squad">Manage Squad</Link>
                    </Button>
                    <div />
                </div>
            </CardContent>
          </Card>
           <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">GPS Trackers</CardTitle>
              <Signal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
                <div className="flex-1">
                    <div className="text-2xl font-bold">{trackers.filter(t => t.status === 'Online').length} / {trackers.length}</div>
                    <p className="text-xs text-muted-foreground">{trackers.filter(t => t.status === 'Low Battery').length} devices need charging</p>
                </div>
                 <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline">View tracker status</Button>
                    <div />
                </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
                <CardTitle>Season Top Performers</CardTitle>
                <CardDescription>Top 10 players from the current season.</CardDescription>
            </div>
            <div className="ml-auto flex items-center gap-2">
                <Button variant={sortKey === 'distance' ? 'default' : 'outline'} size="sm" onClick={() => setSortKey('distance')}>Distance</Button>
                <Button variant={sortKey === 'maxSpeed' ? 'default' : 'outline'} size="sm" onClick={() => setSortKey('maxSpeed')}>Max Speed</Button>
                <Button asChild variant="outline" size="sm">
                    <Link href="/stats">All Stats <ExternalLink className="ml-2 h-3 w-3"/></Link>
                </Button>
            </div>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">
                        {sortKey === 'distance' ? 'Total Distance (km)' : 'Top Speed (m/s)'}
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedPlayers.map(player => (
                    <TableRow key={player.id}>
                       <Link href="/stats" className="contents">
                        <TableCell>
                          <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                              <AvatarFallback>{player.jersey}</AvatarFallback>
                              </Avatar>
                              <div className="font-medium">{player.name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {sortKey === 'distance'
                              ? player.seasonStats.totals.distance.toFixed(2)
                              : player.seasonStats.totals.maxSpeed.toFixed(1)}
                        </TableCell>
                       </Link>
                    </TableRow>
                    ))}
                </TableBody>
             </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

    