
"use client";

import { FC, useEffect, memo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SessionWithStats, RouteSegment } from '@/app/playground/page';
import { MapPin } from 'lucide-react';

const getSpeedColor = (speedKmh: number): string => {
    if (speedKmh < 5) return '#3b82f6'; // Blue
    if (speedKmh < 15) return '#22c55e'; // Green
    if (speedKmh < 25) return '#f97316'; // Orange
    return '#ef4444'; // Red
};

const UpdateMapCenter: FC<{ bounds: LatLngBoundsExpression | null }> = memo(({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
});
UpdateMapCenter.displayName = 'UpdateMapCenter';

const RouteLayer: FC<{ session: SessionWithStats }> = memo(({ session }) => {
    const bounds = session.points.map(p => [p.lat, p.lng] as [number, number]) as LatLngBoundsExpression;
    const startPoint = session.points[0];
    const endPoint = session.points[session.points.length - 1];

    return (
        <>
            <UpdateMapCenter bounds={bounds} />
            {session.stats.routeSegments.map((segment: RouteSegment, index: number) => (
                <Polyline
                    key={index}
                    positions={segment.coords as [number, number][]}
                    color={getSpeedColor(segment.speedKmh)}
                    weight={4}
                />
            ))}
            {startPoint && (
                <CircleMarker center={[startPoint.lat, startPoint.lng]} radius={8} color="white" fillColor="#22c55e" fillOpacity={1}>
                    <Tooltip>Start</Tooltip>
                </CircleMarker>
            )}
            {endPoint && (
                <CircleMarker center={[endPoint.lat, endPoint.lng]} radius={8} color="white" fillColor="#ef4444" fillOpacity={1}>
                    <Tooltip>End</Tooltip>
                </CircleMarker>
            )}
        </>
    );
});
RouteLayer.displayName = 'RouteLayer';

const PlaygroundMap: FC<{ session: SessionWithStats | null }> = ({ session }) => {
    
    if (!session) {
        return (
            <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
                <MapPin className="h-8 w-8 text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">Select a session to see the route</p>
            </div>
        );
    }
    
    return (
        <MapContainer
            center={[51.505, -0.09]} // Default center, will be updated by UpdateMapCenter
            zoom={13} // Default zoom
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', borderRadius: '1rem', backgroundColor: '#e0e0e0' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {session && <RouteLayer session={session} />}
        </MapContainer>
    );
};


export default memo(PlaygroundMap);
