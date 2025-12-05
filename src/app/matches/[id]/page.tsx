

"use client";

import { useState, useMemo, use } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowUpDown } from "lucide-react";
import { allMatches, ourTeam, type Match } from '@/lib/teams';
import { matchStats, type MatchStat } from '@/lib/match-stats';
import Image from "next/image";


type SortKey = keyof Omit<MatchStat, 'playerId' | 'playerName' | 'playerJersey'> | 'playerName';
type SortDirection = 'asc' | 'desc';

export default function MatchDetailPage() {
    const params = use(useParams<{ id: string }>());
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'distance', direction: 'desc' });

    const matchId = parseInt(params.id, 10);
    const match = allMatches.find(m => m.id === matchId);
    
    // For now, we use the first set of mock stats for any past game, since we don't have per-match scraped stats.
    const stats = match && new Date(match.date) < new Date() ? matchStats.find(ms => ms.matchId === matchId)?.stats ?? [] : [];

    if (!match) {
        return notFound();
    }

    const opponent = match.teams.find(t => t.id !== ourTeam.id)!;
    const isWinner = match.winnerId === ourTeam.id;
    const isLoser = match.winnerId && match.winnerId !== ourTeam.id;
    const isHomeGame = match.teams[0].id === ourTeam.id;
    
    const homeTeam = isHomeGame ? ourTeam : opponent;
    const awayTeam = !isHomeGame ? ourTeam : opponent;


    const sortedStats = useMemo(() => {
        if (!stats) return [];
        let sortableStats = [...stats];
        sortableStats.sort((a, b) => {
            if (!sortConfig.key) return 0;
            const aVal = a[sortConfig.key as keyof typeof a];
            const bVal = b[sortConfig.key as keyof typeof b];

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            }
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            }
            return 0;
        });
        return sortableStats;
    }, [stats, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ sortKey, label }: { sortKey: SortKey; label: string }) => (
        <TableHead onClick={() => requestSort(sortKey)} className="cursor-pointer">
            <div className="flex items-center gap-2">
                {label}
                {sortConfig.key === sortKey && <ArrowUpDown className="h-3 w-3" />}
            </div>
        </TableHead>
    );

    return (
        <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
            <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6">
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="icon" className="h-8 w-8">
                        <Link href="/matches">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back to Matches</span>
                        </Link>
                    </Button>
                    <h1 className="text-lg font-semibold sm:text-xl md:text-2xl tracking-tight">
                        Match Details
                    </h1>
                </div>
                 <div className="flex items-center gap-4">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={homeTeam.logoUrl} alt={homeTeam.name} />
                        <AvatarFallback>{homeTeam.name.substring(0,2)}</AvatarFallback>
                    </Avatar>
                     <div className="text-center">
                        <div className="font-bold text-lg">{match.score || new Date(match.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                     </div>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={awayTeam.logoUrl} alt={awayTeam.name} />
                        <AvatarFallback>{awayTeam.name.substring(0,2)}</AvatarFallback>
                    </Avatar>
                     {match.score && <Badge variant={isWinner ? "default" : isLoser ? "destructive" : "secondary"} className="text-xs">
                        {isWinner ? 'Win' : isLoser ? 'Loss' : 'Draw'}
                    </Badge>}
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Match Player Stats</CardTitle>
                        <CardDescription>
                            {stats.length > 0
                                ? `Player performance data for the match against ${opponent.name} on ${new Date(match.date).toLocaleDateString()}.`
                                : "Stats for this match are not available yet."
                            }
                        </CardDescription>
                    </CardHeader>
                    {stats.length > 0 && <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableHeader sortKey="playerName" label="Player" />
                                    <SortableHeader sortKey="distance" label="Distance (km)" />
                                    <SortableHeader sortKey="maxSpeed" label="Max Speed (m/s)" />
                                    <SortableHeader sortKey="sprints" label="Sprints" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedStats.map(stat => (
                                    <TableRow key={stat.playerId}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback>{stat.playerJersey}</AvatarFallback>
                                                </Avatar>
                                                <div className="font-medium">{stat.playerName}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{stat.distance.toFixed(2)}</TableCell>
                                        <TableCell>{stat.maxSpeed.toFixed(1)}</TableCell>
                                        <TableCell>{stat.sprints}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>}
                </Card>
            </main>
        </div>
    );
}
