
"use client";

import { useState, useMemo } from 'react';
import { seasonPlayers, type SeasonPlayer } from '@/lib/season-data';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, ArrowUpDown } from "lucide-react";
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type SortableKeys = 'name' | 'jersey' | 'gamesPlayed' | 'distance' | 'maxSpeed' | 'sprints';
type SortDirection = 'asc' | 'desc';
type StatView = 'totals' | 'averages';

export default function StatsPage() {
    const [statView, setStatView] = useState<StatView>('totals');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection }>({ key: 'distance', direction: 'desc' });

    const sortedPlayers = useMemo(() => {
        let sortablePlayers = [...seasonPlayers];
        sortablePlayers.sort((a, b) => {
            const key = sortConfig.key;
            let aVal, bVal;

            if (key === 'name' || key === 'jersey' || key === 'gamesPlayed') {
                aVal = a[key];
                bVal = b[key];
            } else {
                if (statView === 'averages' && key === 'maxSpeed') {
                    // For averages, maxSpeed is still the overall max, not an average of maxes.
                    aVal = a.seasonStats.totals.maxSpeed;
                    bVal = b.seasonStats.totals.maxSpeed;
                } else {
                    aVal = a.seasonStats[statView][key];
                    bVal = b.seasonStats[statView][key];
                }
            }
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                const comparison = aVal.localeCompare(bVal);
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            }
            
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            }

            return 0;
        });
        return sortablePlayers;
    }, [seasonPlayers, sortConfig, statView]);

    const requestSort = (key: SortableKeys) => {
        let direction: SortDirection = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ sortKey, label }: { sortKey: SortableKeys; label: string }) => (
        <TableHead onClick={() => requestSort(sortKey)} className="cursor-pointer">
            <div className="flex items-center gap-2">
                {label}
                {sortConfig.key === sortKey && <ArrowUpDown className="h-3 w-3" />}
            </div>
        </TableHead>
    );

    const getStatValue = (player: SeasonPlayer, key: 'distance' | 'maxSpeed' | 'sprints') => {
        if (statView === 'averages' && key === 'maxSpeed') {
            return player.seasonStats.totals.maxSpeed.toFixed(1);
        }
        const value = player.seasonStats[statView][key];
        return value.toFixed(key === 'maxSpeed' ? 1 : 2);
    }

    return (
        <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
            <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6">
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="icon" className="h-8 w-8">
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back to Dashboard</span>
                        </Link>
                    </Button>
                    <h1 className="text-lg font-semibold sm:text-xl md:text-2xl tracking-tight">
                        Player Season Stats
                    </h1>
                </div>
                <Tabs value={statView} onValueChange={(value) => setStatView(value as StatView)} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="totals">Season Totals</TabsTrigger>
                        <TabsTrigger value="averages">Per Game Averages</TabsTrigger>
                    </TabsList>
                </Tabs>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Full Squad Statistics</CardTitle>
                        <CardDescription>
                            Comprehensive data for all players over the season. Click column headers to sort.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableHeader sortKey="name" label="Player" />
                                    <SortableHeader sortKey="jersey" label="Jersey" />
                                    <SortableHeader sortKey="gamesPlayed" label="Games Played" />
                                    <SortableHeader sortKey="distance" label={`Distance (km)`} />
                                    <SortableHeader sortKey="maxSpeed" label={`Max Speed (m/s)`} />
                                    <SortableHeader sortKey="sprints" label={`Sprints`} />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedPlayers.map(player => (
                                    <TableRow key={player.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback>{player.jersey}</AvatarFallback>
                                                </Avatar>
                                                <div className="font-medium">{player.name}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{player.jersey}</TableCell>
                                        <TableCell>{player.gamesPlayed}</TableCell>
                                        <TableCell>{getStatValue(player, 'distance')}</TableCell>
                                        <TableCell>{getStatValue(player, 'maxSpeed')}</TableCell>
                                        <TableCell>{getStatValue(player, 'sprints')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

    