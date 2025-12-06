"use client";

import { useState, useEffect, useMemo, FC } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Types ---
type LocationData = {
  id: number;
  created_at: string;
  device_id: string;
  lat: number;
  lng: number;
};

// --- Dynamic Map Components ---
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });


const MapComponent: FC<{ points: LocationData[] }> = ({ points }) => {
    const center = useMemo(() => {
        if (points.length === 0) return [51.505, -0.09] as LatLngExpression;
        const avgLat = points.reduce((acc, p) => acc + p.lat, 0) / points.length;
        const avgLng = points.reduce((acc, p) => acc + p.lng, 0) / points.length;
        return [avgLat, avgLng] as LatLngExpression;
    }, [points]);
    
    // Using a dynamic import for the icon to avoid SSR issues with Leaflet
    const [icon, setIcon] = useState<L.Icon>();
    useEffect(() => {
        import('leaflet').then(L => {
            setIcon(new L.Icon({
                iconUrl: '/assets/marker-icon.png',
                iconRetinaUrl: '/assets/marker-icon-2x.png',
                shadowUrl: '/assets/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            }));
        });
    }, []);

    if (!icon) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="h-full w-full rounded-2xl">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.map((point) => (
                <Marker key={point.id} position={[point.lat, point.lng]} icon={icon}>
                    <Popup>
                        Lat: {point.lat}, Lng: {point.lng} <br />
                        Time: {new Date(point.created_at).toLocaleString()}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
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
                        allData = allData.concat(data);
                    }

                    if (!data || data.length < pageSize) {
                        moreData = false;
                    } else {
                        page++;
                    }
                }
                
                setAllPoints(allData);

                // For debugging: select 10 random non-zero points
                const validPoints = allData.filter(p => p.lat !== 0 && p.lng !== 0);
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

    // This state ensures that the map component is only rendered on the client side.
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

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
                         {isClient && (
                            isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : error ? (
                                 <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-destructive text-center max-w-sm">{error}</p>
                                </div>
                            ) : debugPoints.length > 0 ? (
                               <MapComponent points={debugPoints} />
                            ) : (
                                 <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-muted-foreground text-lg">No valid (non-zero) data points found.</p>
                                </div>
                            )
                         )}
                    </div>
                </div>
            </main>
        </div>
    );
}
