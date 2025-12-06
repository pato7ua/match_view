
"use client";

import { useState, useEffect, useMemo, FC, useRef } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MapPin, Clock, Hash } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import type { LatLngExpression, Map as LeafletMap, Polyline as LeafletPolyline, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

// --- Dynamic Imports for Leaflet components ---
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });


// --- Types ---
type LocationData = {
  id: number;
  created_at: string;
  lat: number;
  lng: number;
};

type Session = LocationData[];

const SESSION_GAP_THRESHOLD = 60 * 60 * 1000; // 1 hour in milliseconds

// --- Map Component ---
const MapComponent: FC<{ session: Session | null }> = ({ session }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<LeafletMap | null>(null);
    const polylineRef = useRef<LeafletPolyline | null>(null);

    const center: LatLngExpression = useMemo(() => {
        if (!session || session.length === 0) return [51.505, -0.09];
        const avgLat = session.reduce((acc, p) => acc + p.lat, 0) / session.length;
        const avgLng = session.reduce((acc, p) => acc + p.lng, 0) / session.length;
        return [avgLat, avgLng];
    }, [session]);
    
    useEffect(() => {
        if (mapRef.current && !mapInstance.current) {
             import('leaflet').then(L => {
                mapInstance.current = L.map(mapRef.current!).setView(center, 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(mapInstance.current);
            });
        }
        
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

     useEffect(() => {
        if (mapInstance.current && session && session.length > 0) {
            import('leaflet').then(L => {
                // Clear previous polyline if it exists
                if (polylineRef.current) {
                    polylineRef.current.remove();
                }

                const latLngs = session.map(p => [p.lat, p.lng] as [number, number]);
                const newPolyline = L.polyline(latLngs, { color: 'blue' }).addTo(mapInstance.current!);
                polylineRef.current = newPolyline;
                
                mapInstance.current.fitBounds(newPolyline.getBounds(), { padding: [50, 50] });
            });
        }
     }, [session]);


    return <div ref={mapRef} className="h-full w-full rounded-2xl" />;
};


export default function PlaygroundPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const fetchAndProcessData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                let allData: LocationData[] = [];
                let page = 0;
                const pageSize = 1000;
                let moreData = true;

                while(moreData) {
                    const from = page * pageSize;
                    const to = from + pageSize - 1;

                    const { data, error } = await supabase
                        .from('tracker_logs')
                        .select('*')
                        .order('created_at', { ascending: true })
                        .range(from, to);

                    if (error) throw error;
                    
                    if (data) {
                       const validPoints = data.filter(p => p.lat !== 0 && p.lng !== 0);
                       allData = allData.concat(validPoints);
                    }

                    if (!data || data.length < pageSize) {
                        moreData = false;
                    } else {
                        page++;
                    }
                }
                
                if (allData.length > 0) {
                    const identifiedSessions: Session[] = [];
                    let currentSession: Session = [allData[0]];

                    for (let i = 1; i < allData.length; i++) {
                        const prevPoint = allData[i - 1];
                        const currentPoint = allData[i];
                        const timeDiff = new Date(currentPoint.created_at).getTime() - new Date(prevPoint.created_at).getTime();

                        if (timeDiff > SESSION_GAP_THRESHOLD) {
                            identifiedSessions.push(currentSession);
                            currentSession = [];
                        }
                        currentSession.push(currentPoint);
                    }
                    identifiedSessions.push(currentSession);
                    setSessions(identifiedSessions.reverse()); // Show newest first
                    if (identifiedSessions.length > 0) {
                        setSelectedSession(identifiedSessions[0]);
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

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);
    
    const getSessionDuration = (session: Session) => {
        if (session.length < 2) return "0 minutes";
        const start = new Date(session[0].created_at);
        const end = new Date(session[session.length - 1].created_at);
        return formatDistanceToNow(start, { addSuffix: false, includeSeconds: true }) + ` ago for ${formatDistanceToNow(end, { compareDate: start })}`;
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
                <div className="md:col-span-1 flex flex-col gap-6">
                     <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Tracking Sessions</CardTitle>
                            <CardDescription>
                                {isLoading ? "Loading sessions..." : `Found ${sessions.length} distinct sessions.`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="space-y-4 pr-6">
                                {isLoading ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Fetching data...</span>
                                    </div>
                                ) : error ? (
                                    <p className="text-sm text-destructive">{error}</p>
                                ) : sessions.length > 0 ? (
                                    sessions.map((session, index) => (
                                        <button key={index} onClick={() => setSelectedSession(session)} className="w-full text-left">
                                            <Card className={`transition-all hover:border-primary ${selectedSession && selectedSession[0].id === session[0].id ? 'border-primary bg-primary/10' : ''}`}>
                                                <CardContent className="p-4">
                                                    <p className="font-semibold">Session {sessions.length - index}</p>
                                                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                                        <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> <span>{getSessionDuration(session)}</span></div>
                                                        <div className="flex items-center gap-2"><Hash className="h-3.5 w-3.5" /> <span>{session.length} data points</span></div>
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
                </div>

                <div className="md:col-span-2 bg-muted/20 border rounded-2xl shadow-inner p-4 relative overflow-hidden">
                    <div className="relative w-full h-full">
                         {isClient ? (
                            isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : error ? (
                                 <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-destructive text-center max-w-sm">{error}</p>
                                </div>
                            ) : selectedSession ? (
                               <MapComponent session={selectedSession} />
                            ) : (
                                 <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-muted-foreground text-lg">Select a session to view its route.</p>
                                </div>
                            )
                         ) : (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                         )}
                    </div>
                </div>
            </main>
        </div>
    );
}

