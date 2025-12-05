
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, PlusCircle } from "lucide-react";
import Link from 'next/link';
import { allMatches, ourTeam, type Match } from '@/lib/teams';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Image from "next/image";

const MatchItem = ({ match, isNextMatch = false }: { match: Match, isNextMatch?: boolean }) => {
    if (!match) return null;

    const opponent = match.teams.find(t => t.id !== ourTeam.id)!;
    const isPast = new Date(match.date) < new Date();
    const isWinner = isPast && match.winnerId === ourTeam.id;
    const isLoser = isPast && match.winnerId && match.winnerId !== ourTeam.id;
    const isHomeGame = match.teams[0].id === ourTeam.id;
    
    const homeTeam = isHomeGame ? ourTeam : opponent;
    const awayTeam = !isHomeGame ? ourTeam : opponent;

    const content = (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
                 <div className="flex flex-col items-center gap-1 w-20">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={homeTeam.logoUrl} alt={homeTeam.name} />
                        <AvatarFallback>{homeTeam.name.substring(0,2)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-xs text-center leading-tight">{homeTeam.name}</span>
                </div>
                <div className="text-center">
                    {isPast ? (
                         <div className="font-bold text-xl">{match.score}</div>
                    ) : (
                        <div className="font-semibold text-lg text-muted-foreground">VS</div>
                    )}
                    <Badge variant={isWinner ? "default" : isLoser ? "destructive" : "secondary"} className="mt-1 text-xs">
                       {isPast ? (isWinner ? 'Win' : isLoser ? 'Loss' : 'Draw') : 'Upcoming'}
                    </Badge>
                </div>
                 <div className="flex flex-col items-center gap-1 w-20">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={awayTeam.logoUrl} alt={awayTeam.name} />
                        <AvatarFallback>{awayTeam.name.substring(0,2)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-xs text-center leading-tight">{awayTeam.name}</span>
                </div>
            </div>
             <div className="text-right">
                <p className="text-sm font-medium">{new Date(match.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}</p>
                <p className="text-xs text-muted-foreground">{new Date(match.date).toLocaleTimeString('default', { hour: '2-digit', minute:'2-digit' })}</p>
            </div>
        </div>
    );
    
    const cardWrapper = (
         <Card className={`hover:bg-accent/10 transition-colors ${isNextMatch ? 'border-primary border-2' : ''}`}>
            <CardContent className="p-4 flex items-center justify-between">
                {content}
            </CardContent>
        </Card>
    );

    if (isPast) {
        return (
            <Link href={`/matches/${match.id}`} className={isNextMatch ? 'contents' : ''}>
                {cardWrapper}
            </Link>
        )
    }

    // For next match and other upcoming matches, just show the card, not wrapped in a link
    return cardWrapper;
};

export default function MatchesPage() {
    const upcoming = allMatches.filter(m => new Date(m.date) >= new Date()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const past = allMatches.filter(m => new Date(m.date) < new Date()).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const nextMatch = upcoming[0];
    const restUpcoming = upcoming.slice(1);

    return (
        <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
            <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6">
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="icon" className="h-8 w-8">
                        <Link href="/dashboard">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back to Dashboard</span>
                        </Link>
                    </Button>
                    <h1 className="text-lg font-semibold sm:text-xl md:text-2xl tracking-tight">
                        Matches
                    </h1>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Schedule Match
                </Button>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
                <section>
                    <h2 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Next Match
                    </h2>
                    <div className="space-y-4">
                        {nextMatch ? (
                           <MatchItem key={nextMatch.id} match={nextMatch} isNextMatch={true} />
                        ) : (
                           <p className="text-muted-foreground">No upcoming matches scheduled.</p>
                        )}
                    </div>
                </section>
                
                {restUpcoming.length > 0 && (
                    <section>
                         <Accordion type="single" collapsible className="w-full space-y-4 border-b-0">
                            <AccordionItem value="upcoming-matches" className="border-b-0">
                                <AccordionTrigger>
                                    <h2 className="text-xl font-semibold tracking-tight">Further Upcoming</h2>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {restUpcoming.map(match => <MatchItem key={match.id} match={match} />)}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </section>
                )}

                <section>
                    <h2 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Match History
                    </h2>
                     <div className="space-y-4">
                        {past.map(match => <MatchItem key={match.id} match={match} />)}
                    </div>
                </section>
            </main>
        </div>
    );
}
