"use client";

import { useState } from 'react';
import { players as dummyPlayers } from '@/lib/dummy-data';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, PlusCircle, Archive, Trash2 } from "lucide-react";
import Link from 'next/link';

export default function SquadPage() {
    const [players, setPlayers] = useState(dummyPlayers);

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
                        Manage Squad
                    </h1>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Player
                </Button>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>All Players</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Player</TableHead>
                                    <TableHead>Jersey</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {players.map(player => (
                                    <TableRow key={player.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="font-medium">{player.name}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{player.jersey}</TableCell>
                                        <TableCell>Active</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <Archive className="h-4 w-4" />
                                                <span className="sr-only">Archive</span>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                                 <span className="sr-only">Delete</span>
                                            </Button>
                                        </TableCell>
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

    