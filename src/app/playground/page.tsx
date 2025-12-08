
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Clock, Hash, MoveRight, Gauge, TrendingUp, Waypoints, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceStrict } from 'date-fns';

const PlaygroundMap = dynamic(() => import('@/components/playground-map'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>,
});


// --- Types ---
export type LocationData = {
  id: number;
  gps_time: string;
  lat: number;
  lng: number;
};

type Session = LocationData[];

export type RouteSegment = {
    coords: [number, number][];
    speedKmh: number;
};

type SessionStats = {
    distance: number; // in km
    durationSeconds: number;
    pointCount: number;
    startTime: string;
    avgSpeedKmh: number;
    maxSpeedKmh: number; // in km/h
    routeSegments: RouteSegment[];
};

export type SessionWithStats = {
    points: Session;
    stats: SessionStats;
}

const SESSION_GAP_THRESHOLD_SECONDS = 5 * 60; // 5 minutes
const MAX_REASONABLE_SPEED_KMH = 50; // Filter out points that would require moving > 50 km/h
const MOVING_AVERAGE_WINDOW = 5;

// --- Utility Functions ---
function haversineDistance(coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }): number {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // Earth radius in kilometers

    const dLat = toRad(coords2.lat - coords1.lat);
    const dLon = toRad(coords2.lng - coords1.lng);
    const lat1 = toRad(coords1.lat);
    const lat2 = toRad(coords2.lat);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in kilometers
}


// --- Components ---
const SessionStatsDisplay: React.FC<{ session: SessionWithStats | null }> = ({ session }) => {
    if (!session) return null;
    const { distance, avgSpeedKmh, maxSpeedKmh } = session.stats;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Session Stats</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center">
                 <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/10">
                    <Waypoints className="h-6 w-6 text-primary" />
                    <p className="text-xl font-bold mt-2">{distance.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Distance (km)</p>
                </div>
                 <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/10">
                    <Gauge className="h-6 w-6 text-primary" />
                    <p className="text-xl font-bold mt-2">{avgSpeedKmh.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Avg Speed (km/h)</p>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <p className="text-xl font-bold mt-2">{maxSpeedKmh.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Max Speed (km/h)</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default function PlaygroundPage() {
    const [sessions, setSessions] = useState<SessionWithStats[]>([]);
    const [selectedSession, setSelectedSession] = useState<SessionWithStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndProcessData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                let { data: allData, error } = await supabase
                    .from('tracker_logs')
                    .select('id, lat, lng, gps_time')
                    .order('gps_time', { ascending: true });

                if (error) throw error;
                if (!allData) allData = [];
                
                // --- 1. Filter out outliers ---
                const filteredData: LocationData[] = [];
                if (allData.length > 0) {
                    filteredData.push(allData[0]); // Always include the first point
                    for (let i = 1; i < allData.length; i++) {
                        const p1 = allData[i-1];
                        const p2 = allData[i];
                        if (p1 && p2) {
                             const distanceKm = haversineDistance(p1, p2);
                             const timeDiffSeconds = (new Date(p2.gps_time).getTime() - new Date(p1.gps_time).getTime()) / 1000;
                             if (timeDiffSeconds > 0) {
                                 const speedKmh = (distanceKm / timeDiffSeconds) * 3600;
                                 if (speedKmh < MAX_REASONABLE_SPEED_KMH) {
                                     filteredData.push(p2);
                                 }
                             }
                        }
                    }
                }
                
                // --- 2. Apply moving average to smooth flutter ---
                const smoothedData: LocationData[] = [];
                if (filteredData.length > MOVING_AVERAGE_WINDOW) {
                    for (let i = 0; i < filteredData.length; i++) {
                        if (i < MOVING_AVERAGE_WINDOW -1) {
                             smoothedData.push(filteredData[i]);
                        } else {
                            let sumLat = 0;
                            let sumLng = 0;
                            for (let j = 0; j < MOVING_AVERAGE_WINDOW; j++) {
                                sumLat += filteredData[i-j].lat;
                                sumLng += filteredData[i-j].lng;
                            }
                            smoothedData.push({
                                ...filteredData[i],
                                lat: sumLat / MOVING_AVERAGE_WINDOW,
                                lng: sumLng / MOVING_AVERAGE_WINDOW,
                            });
                        }
                    }
                } else {
                    smoothedData.push(...filteredData);
                }


                if (smoothedData.length > 0) {
                    const identifiedSessions: Session[] = [];
                    let currentSession: Session = [smoothedData[0]];

                    for (let i = 1; i < smoothedData.length; i++) {
                        const prevPoint = smoothedData[i - 1];
                        const currentPoint = smoothedData[i];
                        if (!currentPoint || !prevPoint) continue;
                        
                        const timeDiffSeconds = (new Date(currentPoint.gps_time).getTime() - new Date(prevPoint.gps_time).getTime()) / 1000;

                        if (timeDiffSeconds > SESSION_GAP_THRESHOLD_SECONDS) {
                           if (currentSession.length > 1) identifiedSessions.push(currentSession);
                           currentSession = [currentPoint];
                        } else {
                           currentSession.push(currentPoint);
                        }
                    }
                    if (currentSession.length > 1) {
                        identifiedSessions.push(currentSession);
                    }

                    const sessionsWithStats: SessionWithStats[] = identifiedSessions.map(session => {
                        let totalDistanceKm = 0;
                        let totalTimeSeconds = 0;
                        let maxSpeedKmh = 0;
                        const routeSegments: RouteSegment[] = [];

                        for (let i = 1; i < session.length; i++) {
                            const p1 = session[i-1];
                            const p2 = session[i];
                            if (p1 && p2) {
                                const distance = haversineDistance(p1, p2); // in km
                                const timeDiff = (new Date(p2.gps_time).getTime() - new Date(p1.gps_time).getTime()) / 1000;

                                if (timeDiff > 0) {
                                    totalDistanceKm += distance;
                                    totalTimeSeconds += timeDiff;

                                    const currentSpeedKmh = (distance / timeDiff) * 3600;
                                    
                                    if (timeDiff > 0.5 && currentSpeedKmh > maxSpeedKmh) {
                                        maxSpeedKmh = currentSpeedKmh;
                                    }
                                    
                                    routeSegments.push({
                                        coords: [[p1.lat, p1.lng], [p2.lat, p2.lng]],
                                        speedKmh: currentSpeedKmh
                                    });
                                }
                            }
                        }
                        
                        const avgSpeedKmh = totalTimeSeconds > 0 ? (totalDistanceKm / totalTimeSeconds) * 3600 : 0;

                        return {
                            points: session,
                            stats: {
                                distance: totalDistanceKm,
                                durationSeconds: totalTimeSeconds,
                                pointCount: session.length,
                                startTime: session[0] ? new Date(session[0].gps_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '',
                                avgSpeedKmh: avgSpeedKmh,
                                maxSpeedKmh: maxSpeedKmh,
                                routeSegments
                            }
                        };
                    }).reverse();

                    setSessions(sessionsWithStats); 
                    if (sessionsWithStats.length > 0) {
                        setSelectedSession(sessionsWithStats[0]);
                    }
                }

            } catch (err: any) {
                setError(err.message || 'Failed to fetch data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, []);

    
    const getSessionDuration = (session: SessionWithStats) => {
        const { durationSeconds } = session.stats;
        if (durationSeconds < 1) return "0 seconds";
        const start = new Date();
        const end = new Date(start.getTime() + durationSeconds * 1000);
        return formatDistanceStrict(end, start, { roundingMethod: 'round' });
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
                        Tracker Playground
                    </h1>
                </div>
            </header>
            <main className="flex-1 grid md:grid-cols-3 gap-6 p-6 overflow-hidden">
                <div className="md:col-span-1 flex flex-col gap-6 overflow-hidden">
                     <Card className="flex flex-col flex-1 overflow-hidden">
                        <CardHeader>
                            <CardTitle>Tracking Sessions</CardTitle>
                            <CardDescription>
                                {isLoading ? "Loading sessions..." : `Found ${sessions.length} distinct sessions.`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full pr-6">
                                <div className="space-y-4">
                                {isLoading ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Fetching data...</span>
                                    </div>
                                ) : error ? (
                                    <p className="text-sm text-destructive">{error}</p>
                                ) : sessions.length > 0 ? (
                                    sessions.map((sessionWithStats, index) => (
                                        <button key={sessionWithStats.stats.startTime} onClick={() => setSelectedSession(sessionWithStats)} className="w-full text-left">
                                            <Card className={`transition-all hover:border-primary ${selectedSession?.stats.startTime === sessionWithStats.stats.startTime ? 'border-primary bg-primary/10' : ''}`}>
                                                <CardContent className="p-4">
                                                    <p className="font-semibold">Session {sessions.length - index}</p>
                                                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                                        <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> <span>{sessionWithStats.stats.startTime}</span></div>
                                                        <div className="flex items-center gap-2"><MoveRight className="h-3.5 w-3.5" /> <span>Duration: {getSessionDuration(sessionWithStats)}</span></div>
                                                        <div className="flex items-center gap-2"><Hash className="h-3.5 w-3.5" /> <span>{sessionWithStats.stats.pointCount} data points</span></div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </button>
                                    ))
                                ) : <p className="text-muted-foreground">No sessions found.</p>
                            }
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    {selectedSession && <SessionStatsDisplay session={selectedSession} />}
                </div>

                <div className="md:col-span-2 bg-muted/20 border rounded-2xl shadow-inner p-2 relative overflow-hidden">
                   <PlaygroundMap session={selectedSession} />
                </div>
            </main>
        </div>
    );
}

    