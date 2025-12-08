
"use client"

import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { useEffect, useMemo, FC } from 'react';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Types ---
type RouteSegment = {
    coords: [number, number][];
    speedKmh: number;
};

type SessionStats = {
    routeSegments: RouteSegment[];
};

type SessionWithStats = {
    points: { lat: number; lng: number }[];
    stats: SessionStats;
}

// --- Utility Functions ---
const getSpeedColor = (speedKmh: number) => {
    if (speedKmh < 5) return '#3b82f6'; // Blue
    if (speedKmh < 15) return '#22c55e'; // Green
    if (speedKmh < 25) return '#f97316'; // Orange
    return '#ef4444'; // Red
}

// --- Map Components ---

const RouteLayer: FC<{ session: SessionWithStats | null }> = ({ session }) => {
    const map = useMap();
    
    const bounds = useMemo(() => {
        if (!session || session.points.length === 0) return null;
        return session.points.map(p => [p.lat, p.lng] as [number, number]);
    }, [session]);

    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            map.setView([51.505, -0.09], 13);
        }
    }, [bounds, map]);

    if (!session) return null;

    return (
        <>
            {session.stats.routeSegments.map((segment, index) => (
                <Polyline
                    key={index}
                    positions={segment.coords as LatLngExpression[]}
                    color={getSpeedColor(segment.speedKmh)}
                    weight={5}
                />
            ))}
        </>
    );
}

const PlaygroundMap: FC<{ session: SessionWithStats | null }> = ({ session }) => {
    return (
        <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%', borderRadius: '1rem' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RouteLayer session={session} />
        </MapContainer>
    );
};

export default PlaygroundMap;
