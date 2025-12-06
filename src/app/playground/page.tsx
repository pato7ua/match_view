
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Footprints, TrendingUp, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FootballPitch from '@/components/football-pitch';
import { AnimatePresence, motion } from 'framer-motion';

// --- Types ---
type LocationData = {
  id: number;
  created_at: string;
  device_id: string;
  lat: number;
  lng: number;
  heading: number;
  speed?: number; // Assuming speed might be calculated
};

type Session = {
  startTime: string;
  endTime: string;
  pointCount: number;
  points: LocationData[];
};

// --- Supabase Client ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Helper Functions ---
function haversineDistance(coords1: {lat: number, lng: number}, coords2: {lat: number, lng: number}): number {
    const R = 6371e3; // metres
    const φ1 = coords1.lat * Math.PI/180;
    const φ2 = coords2.lat * Math.PI/180;
    const Δφ = (coords2.lat-coords1.lat) * Math.PI/180;
    const Δλ = (coords2.lng-coords1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
}

function calculateStats(points: LocationData[]) {
    if (points.length < 2) return { totalDistance: 0, maxSpeed: 0, avgSpeed: 0 };

    let totalDistance = 0;
    let maxSpeed = 0;

    const pointsWithSpeed = points.map((point, i) => {
        if (i === 0) return { ...point, speed: 0 };
        const prevPoint = points[i-1];
        const distance = haversineDistance(prevPoint, point);
        const timeDiff = (new Date(point.created_at).getTime() - new Date(prevPoint.created_at).getTime()) / 1000; // seconds
        const speed = timeDiff > 0 ? distance / timeDiff : 0; // m/s
        
        totalDistance += distance;
        if (speed > maxSpeed) maxSpeed = speed;
        return { ...point, speed };
    });
    
    const avgSpeed = (totalDistance / ((new Date(points[points.length-1].created_at).getTime() - new Date(points[0].created_at).getTime()) / 1000)) || 0;

    return { totalDistance, maxSpeed, avgSpeed };
}

function normalizePositions(points: LocationData[]): { x: number, y: number }[] {
  if (points.length === 0) return [];

  const latitudes = points.map(p => p.lat);
  const longitudes = points.map(p => p.lng);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;

  if (latRange === 0 && lngRange === 0) {
    return points.map(() => ({ x: 50, y: 50 }));
  }

  // Preserve aspect ratio
  const range = Math.max(latRange, lngRange);

  return points.map(p => ({
    x: latRange > 0 ? ((p.lat - minLat) / range * 90) + 5 : 50, // Normalize and center
    y: lngRange > 0 ? ((p.lng - minLng) / range * 90) + 5 : 50,
  }));
};


// --- Components ---
const RoutePath = ({ points }: { points: {x: number, y: number}[] }) => {
    const pathD = useMemo(() => {
        if (points.length < 2) return "";
        const path = points.map((p, i) => {
            const command = i === 0 ? 'M' : 'L';
            return `${command} ${p.y}% ${p.x}%`; // Note: SVG x,y maps to visual left,top
        }).join(' ');
        return path;
    }, [points]);

    return (
        <svg className="absolute inset-0 w-full h-full overflow-visible">
            <motion.path
                d={pathD}
                fill="none"
                stroke="hsl(var(--accent))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
            />
        </svg>
    );
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


export default function PlaygroundPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndProcessData = async () => {
            try {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('locations')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (error) throw error;
                if (!data || data.length === 0) {
                    setSessions([]);
                    return;
                }
                
                // --- Session detection logic ---
                const detectedSessions: Session[] = [];
                let currentSessionPoints: LocationData[] = [];
                const SESSION_GAP_MINUTES = 30;

                for(let i = 0; i < data.length; i++) {
                    if (currentSessionPoints.length === 0) {
                        currentSessionPoints.push(data[i]);
                    } else {
                        const lastPointTime = new Date(currentSessionPoints[currentSessionPoints.length - 1].created_at).getTime();
                        const currentPointTime = new Date(data[i].created_at).getTime();
                        const timeDiffMinutes = (currentPointTime - lastPointTime) / (1000 * 60);

                        if (timeDiffMinutes > SESSION_GAP_MINUTES) {
                            if (currentSessionPoints.length > 1) {
                                detectedSessions.push({
                                    startTime: currentSessionPoints[0].created_at,
                                    endTime: currentSessionPoints[currentSessionPoints.length - 1].created_at,
                                    pointCount: currentSessionPoints.length,
                                    points: currentSessionPoints,
                                });
                            }
                            currentSessionPoints = [data[i]];
                        } else {
                            currentSessionPoints.push(data[i]);
                        }
                    }
                }
                // Add the last session
                if (currentSessionPoints.length > 1) {
                     detectedSessions.push({
                        startTime: currentSessionPoints[0].created_at,
                        endTime: currentSessionPoints[currentSessionPoints.length - 1].created_at,
                        pointCount: currentSessionPoints.length,
                        points: currentSessionPoints,
                    });
                }
                
                setSessions(detectedSessions.reverse()); // Show newest first
            } catch (err: any) {
                setError(err.message || 'Failed to fetch data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, []);

    const handleSessionChange = useCallback((startTime: string) => {
        const session = sessions.find(s => s.startTime === startTime);
        setSelectedSession(session || null);
    }, [sessions]);

    const stats = useMemo(() => {
        if (!selectedSession) return { totalDistance: 0, maxSpeed: 0, avgSpeed: 0 };
        return calculateStats(selectedSession.points);
    }, [selectedSession]);
    
    const normalizedRoute = useMemo(() => {
        if (!selectedSession) return [];
        return normalizePositions(selectedSession.points);
    }, [selectedSession]);

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
                <div className="md:col-span-1 flex flex-col gap-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Select a Session</CardTitle>
                            <CardDescription>Choose a recorded session to visualize.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Loading sessions...</span>
                                </div>
                            ) : error ? (
                                <p className="text-destructive">{error}</p>
                            ) : sessions.length > 0 ? (
                                <Select onValueChange={handleSessionChange} disabled={sessions.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a recorded session..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessions.map(session => (
                                            <SelectItem key={session.startTime} value={session.startTime}>
                                                {new Date(session.startTime).toLocaleString()} ({session.pointCount} points)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-muted-foreground">No recorded sessions found.</p>
                            )}
                        </CardContent>
                    </Card>
                    
                    {selectedSession && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Session Statistics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <StatCard 
                                    icon={<Footprints size={28} />} 
                                    label="Total Distance" 
                                    value={(stats.totalDistance / 1000).toFixed(2)}
                                    unit="km"
                                />
                                <StatCard 
                                    icon={<TrendingUp size={28} />} 
                                    label="Max Speed" 
                                    value={stats.maxSpeed.toFixed(1)} 
                                    unit="m/s"
                                />
                                 <StatCard 
                                    icon={<Clock size={28} />} 
                                    label="Average Speed" 
                                    value={stats.avgSpeed.toFixed(1)} 
                                    unit="m/s"
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="md:col-span-2 bg-white/50 dark:bg-primary/10 backdrop-blur-xl border border-white/30 dark:border-primary/20 rounded-2xl shadow-lg p-4 relative overflow-hidden">
                    <div className="relative w-full h-full">
                        <FootballPitch className="absolute inset-0 w-full h-full object-contain" />
                        <AnimatePresence>
                           {selectedSession && <RoutePath points={normalizedRoute} />}
                        </AnimatePresence>
                         {!selectedSession && !isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-muted-foreground text-lg">Select a session to see the route</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

