"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';

// --- Types ---
type LocationData = {
  id: number;
  created_at: string;
  device_id: string;
  lat: number;
  lng: number;
};

// --- Helper Functions ---
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
  const xOffset = range > lngRange ? (range - lngRange) / 2 : 0;
  const yOffset = range > latRange ? (range - latRange) / 2 : 0;

  return points.map(p => ({
    y: lngRange > 0 ? (((p.lng - minLng) + xOffset) / range * 90) + 5 : 50,
    x: latRange > 0 ? (((maxLat - p.lat) + yOffset) / range * 90) + 5 : 50, // Invert latitude for correct map orientation
  }));
};

const DebugPoint = ({ point }: { point: {x: number, y: number} }) => {
    return (
        <motion.div
            className="absolute"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            <MapPin 
                className="text-accent"
                style={{
                    top: `${point.x}%`,
                    left: `${point.y}%`,
                    transform: 'translate(-50%, -50%)',
                    position: 'absolute',
                }}
            />
        </motion.div>
    );
};


export default function PlaygroundPage() {
    const [allPoints, setAllPoints] = useState<LocationData[]>([]);
    const [debugPoints, setDebugPoints] = useState<LocationData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndProcessData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const { data, error } = await supabase
                    .from('tracker_logs')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (error) throw error;
                
                if (!data) {
                    setAllPoints([]);
                    setIsLoading(false);
                    return;
                }
                
                setAllPoints(data);

                // For debugging: select 10 random non-zero points
                const validPoints = data.filter(p => p.lat !== 0 && p.lng !== 0);
                const shuffled = validPoints.sort(() => 0.5 - Math.random());
                setDebugPoints(shuffled.slice(0, 10));

            } catch (err: any) {
                setError(err.message || 'Failed to fetch data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, []);

    const normalizedDebugPoints = useMemo(() => {
        return normalizePositions(debugPoints);
    }, [debugPoints]);

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
                        Tracker Playground (Debug Mode)
                    </h1>
                </div>
            </header>
            <main className="flex-1 grid md:grid-cols-3 gap-6 p-6 overflow-hidden">
                <div className="md:col-span-1 flex flex-col gap-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Data Access Debug</CardTitle>
                            <CardDescription>Checking if data from 'tracker_logs' is being fetched.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Fetching data...</span>
                                </div>
                            ) : error ? (
                                <p className="text-sm text-destructive">{error}</p>
                            ) : (
                                <div>
                                    <p className="text-2xl font-bold">{allPoints.length.toLocaleString()}</p>
                                    <p className="text-muted-foreground">Total records fetched from database.</p>
                                    <p className="mt-4 text-2xl font-bold">{debugPoints.length}</p>
                                    <p className="text-muted-foreground">Random non-zero points being displayed on map.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2 bg-muted/20 border rounded-2xl shadow-inner p-4 relative overflow-hidden">
                    <div className="relative w-full h-full">
                        <AnimatePresence>
                           {normalizedDebugPoints.map((point, index) => (
                               <DebugPoint key={index} point={point} />
                           ))}
                        </AnimatePresence>
                         {!isLoading && !error && allPoints.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-muted-foreground text-lg">No data found in 'tracker_logs'.</p>
                            </div>
                        )}
                        {error && (
                             <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-destructive text-center max-w-sm">{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
