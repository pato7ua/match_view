
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Clock, Hash, MoveRight, Gauge, TrendingUp, Waypoints, Trash2, Edit, Merge } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceStrict } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { AnimatePresence, motion } from 'framer-motion';


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
    id: string; // Using startTime as a unique ID
    name: string;
    points: Session;
    stats: SessionStats;
    isCombined?: boolean;
    originalIds?: string[];
}

const SESSION_GAP_THRESHOLD_SECONDS = 60; // 1 minute
const MAX_REASONABLE_SPEED_KMH = 160; // ~100 mph
const MIN_AVG_SPEED_KMH = 1; // Minimum average speed for a session to be considered valid

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

const calculateSessionStats = (session: Session, name?: string): SessionWithStats => {
    let totalDistanceKm = 0;
    let maxSpeedKmh = 0;
    const routeSegments: RouteSegment[] = [];

    if (session.length > 1) {
        for (let i = 1; i < session.length; i++) {
            const p1 = session[i - 1];
            const p2 = session[i];
            
            if (!p1 || !p2) continue;

            const distance = haversineDistance(p1, p2);
            const timeDiff = (new Date(p2.gps_time).getTime() - new Date(p1.gps_time).getTime()) / 1000;

            if (timeDiff > 0 && timeDiff <= SESSION_GAP_THRESHOLD_SECONDS) {
                const currentSpeedKmh = (distance / timeDiff) * 3600;
                if (currentSpeedKmh <= MAX_REASONABLE_SPEED_KMH) {
                    totalDistanceKm += distance;
                    routeSegments.push({
                        coords: [[p1.lat, p1.lng], [p2.lat, p2.lng]],
                        speedKmh: currentSpeedKmh,
                    });
                    if (currentSpeedKmh > maxSpeedKmh) maxSpeedKmh = currentSpeedKmh;
                }
            }
        }
    }


    const totalTimeSeconds = session.length > 1 ? (new Date(session[session.length - 1].gps_time).getTime() - new Date(session[0].gps_time).getTime()) / 1000 : 0;
    const avgSpeedKmh = totalTimeSeconds > 0 ? (totalDistanceKm / totalTimeSeconds) * 3600 : 0;
    const startTime = session[0] ? new Date(session[0].gps_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';
    
    return {
        id: startTime,
        name: name || `Session @ ${startTime}`,
        points: session,
        stats: {
            distance: totalDistanceKm,
            durationSeconds: totalTimeSeconds,
            pointCount: session.length,
            startTime: startTime,
            avgSpeedKmh: avgSpeedKmh,
            maxSpeedKmh: maxSpeedKmh,
            routeSegments,
        },
    };
};


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
    
    // State for new features
    const [sessionToDelete, setSessionToDelete] = useState<SessionWithStats | null>(null);
    const [sessionToRename, setSessionToRename] = useState<SessionWithStats | null>(null);
    const [newSessionName, setNewSessionName] = useState('');
    const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
    
    const { toast } = useToast();

    // --- LocalStorage Persistence ---
    const getFromStorage = <T,>(key: string, defaultValue: T): T => {
        if (typeof window === 'undefined') return defaultValue;
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    };
    const saveToStorage = (key: string, value: any) => {
        localStorage.setItem(key, JSON.stringify(value));
    };

    const getSessionNames = (): Record<string, string> => getFromStorage('sessionNames', {});
    const saveSessionName = (sessionId: string, name: string) => {
        const names = getSessionNames();
        names[sessionId] = name;
        saveToStorage('sessionNames', names);
    };

    const getCombinedSessions = (): Record<string, string[]> => getFromStorage('combinedSessions', {});
    const saveCombinedSessions = (combined: Record<string, string[]>) => {
        saveToStorage('combinedSessions', combined);
    };

    useEffect(() => {
        const fetchAndProcessData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const supabase = getSupabase();
                
                let { data: allData, error } = await supabase
                    .from('tracker_logs')
                    .select('id, lat, lng, gps_time')
                    .order('gps_time', { ascending: true });

                if (error) throw error;
                if (!allData || allData.length === 0) {
                     setSessions([]);
                     setIsLoading(false);
                     return;
                }
                
                const sessionNames = getSessionNames();
                let identifiedSessions: SessionWithStats[] = [];
                let currentSession: Session = [allData[0]];

                for (let i = 1; i < allData.length; i++) {
                    const prevPoint = allData[i - 1];
                    const currentPoint = allData[i];
                    
                    const timeDiffSeconds = (new Date(currentPoint.gps_time).getTime() - new Date(prevPoint.gps_time).getTime()) / 1000;

                    if (timeDiffSeconds > SESSION_GAP_THRESHOLD_SECONDS) {
                       if (currentSession.length > 1) {
                         const stats = calculateSessionStats(currentSession);
                         identifiedSessions.push({ ...stats, name: sessionNames[stats.id] || stats.name });
                       }
                       currentSession = [currentPoint];
                    } else {
                       currentSession.push(currentPoint);
                    }
                }
                if (currentSession.length > 1) {
                    const stats = calculateSessionStats(currentSession);
                    identifiedSessions.push({ ...stats, name: sessionNames[stats.id] || stats.name });
                }

                // Apply combinations from localStorage
                const combinedInfo = getCombinedSessions();
                const combinedIds = new Set(Object.values(combinedInfo).flat());
                let finalSessions: SessionWithStats[] = identifiedSessions.filter(s => !combinedIds.has(s.id));
                
                for (const [newId, originalIds] of Object.entries(combinedInfo)) {
                    const sessionsToCombine = identifiedSessions.filter(s => originalIds.includes(s.id));
                    if (sessionsToCombine.length > 0) {
                        const allPoints = sessionsToCombine.flatMap(s => s.points);
                        allPoints.sort((a, b) => new Date(a.gps_time).getTime() - new Date(b.gps_time).getTime());
                        const customName = sessionNames[newId];
                        const newCombinedSession = calculateSessionStats(allPoints, customName);
                        finalSessions.push({ ...newCombinedSession, isCombined: true, originalIds });
                    }
                }

                const sessionsWithStats: SessionWithStats[] = finalSessions.filter(s => {
                    const stats = s.stats;
                    return stats.distance >= 0.01 && stats.avgSpeedKmh >= MIN_AVG_SPEED_KMH && stats.durationSeconds >= 60 && !(stats.maxSpeedKmh > 100 && stats.avgSpeedKmh < 10);
                }) 
                  .sort((a, b) => new Date(b.stats.startTime).getTime() - new Date(a.stats.startTime).getTime());


                setSessions(sessionsWithStats); 
                if (sessionsWithStats.length > 0) {
                    setSelectedSession(sessionsWithStats[0]);
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
    };
    
    const handleSelectSession = (session: SessionWithStats) => {
        setSelectedSession(session);
        setSelectedSessionIds(new Set());
    }
    
    const handleToggleSelection = (sessionId: string) => {
        setSelectedSessionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sessionId)) {
                newSet.delete(sessionId);
            } else {
                newSet.add(sessionId);
            }
            return newSet;
        });
        setSelectedSession(null); // Deselect map view when multi-selecting
    };
    
    const handleDeleteSession = async () => {
        if (!sessionToDelete) return;

        let pointIds: number[] = [];
        let sessionIdsToDelete: string[] = [];
        const supabase = getSupabase();

        if (sessionToDelete.isCombined) {
            sessionIdsToDelete = sessionToDelete.originalIds!;
            const combinedInfo = getCombinedSessions();
            delete combinedInfo[sessionToDelete.id];
            saveCombinedSessions(combinedInfo);
        } else {
            sessionIdsToDelete = [sessionToDelete.id];
        }
        pointIds = sessionToDelete.points.map(p => p.id);

        try {
            if (pointIds.length > 0) {
                const { error } = await supabase
                    .from('tracker_logs')
                    .delete()
                    .in('id', pointIds);
                if (error) throw error;
            }
            
            setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
            if (selectedSession?.id === sessionToDelete.id) {
                setSelectedSession(null);
            }
            setSessionToDelete(null);
            toast({ title: "Session Deleted", description: `Session "${sessionToDelete.name}" has been removed.` });

        } catch (err: any) {
            toast({ variant: 'destructive', title: "Deletion Failed", description: err.message || "Could not delete session." });
        }
    };
    
    const handleRenameSession = () => {
        if (!sessionToRename || !newSessionName) return;
        saveSessionName(sessionToRename.id, newSessionName);
        setSessions(prev =>
            prev.map(s => (s.id === sessionToRename.id ? { ...s, name: newSessionName } : s))
        );
        if (selectedSession?.id === sessionToRename.id) {
            setSelectedSession(prev => prev ? { ...prev, name: newSessionName } : null);
        }
        toast({ title: 'Session Renamed', description: `Renamed to "${newSessionName}".` });
        setSessionToRename(null);
        setNewSessionName('');
    };

    const handleCombineSessions = () => {
        if (selectedSessionIds.size < 2) return;

        const sessionsToCombine = sessions.filter(s => selectedSessionIds.has(s.id));
        const allPoints = sessionsToCombine.flatMap(s => s.points);
        allPoints.sort((a, b) => new Date(a.gps_time).getTime() - new Date(b.gps_time).getTime());

        const newCombinedSessionStats = calculateSessionStats(allPoints);
        const originalIds = sessionsToCombine.flatMap(s => s.isCombined ? s.originalIds! : [s.id]);
        
        const newCombinedSession: SessionWithStats = {
            ...newCombinedSessionStats,
            isCombined: true,
            originalIds: originalIds,
        };
        
        // Update localStorage
        const combinedInfo = getCombinedSessions();
        sessionsToCombine.forEach(s => {
            if (s.isCombined) delete combinedInfo[s.id];
        });
        combinedInfo[newCombinedSession.id] = originalIds;
        saveCombinedSessions(combinedInfo);

        const newSessions = sessions.filter(s => !selectedSessionIds.has(s.id));
        newSessions.unshift(newCombinedSession);
        newSessions.sort((a, b) => new Date(b.stats.startTime).getTime() - new Date(a.stats.startTime).getTime());
        
        setSessions(newSessions);
        setSelectedSessionIds(new Set());
        setSelectedSession(newCombinedSession);
        
        toast({ title: 'Sessions Combined', description: `${sessionsToCombine.length} sessions were merged into one.` });
    };
    
    const selectedSessionsForActions = sessions.filter(s => selectedSessionIds.has(s.id));

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
                                {isLoading ? "Loading sessions..." : selectedSessionIds.size > 0 ? `${selectedSessionIds.size} session(s) selected.` : `Found ${sessions.length} distinct sessions.`}
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
                                    sessions.map((sessionWithStats) => (
                                        <div key={sessionWithStats.id} className="flex items-center gap-3">
                                            <Checkbox
                                                id={`select-${sessionWithStats.id}`}
                                                checked={selectedSessionIds.has(sessionWithStats.id)}
                                                onCheckedChange={() => handleToggleSelection(sessionWithStats.id)}
                                            />
                                            <Card className={`flex-1 transition-all hover:border-primary relative group ${selectedSession?.id === sessionWithStats.id ? 'border-primary bg-primary/10' : ''} ${selectedSessionIds.has(sessionWithStats.id) ? 'border-accent bg-accent/10' : ''}`}>
                                                <div
                                                    onClick={() => handleSelectSession(sessionWithStats)}
                                                    className="w-full text-left p-4 cursor-pointer"
                                                >
                                                    <p className="font-semibold pr-8">{sessionWithStats.name}</p>
                                                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                                        <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> <span>{sessionWithStats.stats.startTime}</span></div>
                                                        <div className="flex items-center gap-2"><MoveRight className="h-3.5 w-3.5" /> <span>Duration: {getSessionDuration(sessionWithStats)}</span></div>
                                                        <div className="flex items-center gap-2"><Hash className="h-3.5 w-3.5" /> <span>{sessionWithStats.stats.pointCount} data points</span></div>
                                                    </div>
                                                </div>
                                            </Card>
                                        </div>
                                    ))
                                ) : <p className="text-muted-foreground">No valid sessions found.</p>
                            }
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                     <AnimatePresence>
                        {selectedSessionIds.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base">Actions</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                if (selectedSessionsForActions.length === 1) {
                                                    setSessionToRename(selectedSessionsForActions[0]);
                                                    setNewSessionName(selectedSessionsForActions[0].name);
                                                }
                                            }}
                                            disabled={selectedSessionIds.size !== 1}
                                        >
                                            <Edit className="mr-2 h-4 w-4" /> Rename
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleCombineSessions}
                                            disabled={selectedSessionIds.size < 2}
                                        >
                                            <Merge className="mr-2 h-4 w-4" /> Combine
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="ml-auto"
                                            onClick={() => {
                                                if (selectedSessionsForActions.length === 1) {
                                                    setSessionToDelete(selectedSessionsForActions[0]);
                                                }
                                            }}
                                            disabled={selectedSessionIds.size !== 1}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {selectedSession && <SessionStatsDisplay session={selectedSession} />}
                </div>

                <div className="md:col-span-2 bg-muted/20 border rounded-2xl shadow-inner p-2 relative overflow-hidden">
                   <PlaygroundMap session={selectedSession} />
                </div>
            </main>
             <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the session from {sessionToDelete?.stats.startTime} with {sessionToDelete?.stats.pointCount} data points. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSession} variant="destructive">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={!!sessionToRename} onOpenChange={(open) => { if (!open) setSessionToRename(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Session</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="session-name" className="text-right">Name</Label>
                            <Input
                                id="session-name"
                                value={newSessionName}
                                onChange={(e) => setNewSessionName(e.target.value)}
                                className="col-span-3"
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameSession()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSessionToRename(null)}>Cancel</Button>
                        <Button onClick={handleRenameSession}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
