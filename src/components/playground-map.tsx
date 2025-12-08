
"use client";

import Image from 'next/image';
import { FC, useMemo } from 'react';
import { Loader2, MapPin } from 'lucide-react';

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

// Function to convert lat/lng to pixel coordinates on a map tile
function latLngToPoint(lat: number, lng: number, zoom: number) {
    const siny = Math.sin(lat * Math.PI / 180);
    const x = (lng + 180) / 360;
    const y = (1 - Math.log((1 + siny) / (1 - siny)) / (2 * Math.PI)) / 2;
    const mapSize = 256 * Math.pow(2, zoom);
    return {
        x: x * mapSize,
        y: y * mapSize,
    };
}

const StaticMap: FC<{ session: SessionWithStats | null }> = ({ session }) => {
    const mapData = useMemo(() => {
        if (!session || session.points.length < 2) return null;

        const lats = session.points.map(p => p.lat);
        const lngs = session.points.map(p => p.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        
        // A simple heuristic for zoom level
        const lngDiff = maxLng - minLng;
        const zoom = Math.max(1, Math.min(18, Math.floor(Math.log2(360 / lngDiff))));

        const centerPoint = latLngToPoint(centerLat, centerLng, zoom);
        
        // Define SVG viewBox dimensions
        const width = 800;
        const height = 600;
        const TILE_SIZE = 256;

        const tileX = Math.floor(centerPoint.x / TILE_SIZE);
        const tileY = Math.floor(centerPoint.y / TILE_SIZE);

        const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

        const centralTilePixelX = tileX * TILE_SIZE;
        const centralTilePixelY = tileY * TILE_SIZE;

        const projectedPoints = session.stats.routeSegments.map(segment => {
            const p1 = latLngToPoint(segment.coords[0][0], segment.coords[0][1], zoom);
            const p2 = latLngToPoint(segment.coords[1][0], segment.coords[1][1], zoom);

            // Translate points relative to the SVG canvas
            const x1 = p1.x - centralTilePixelX + (width / 2);
            const y1 = p1.y - centralTilePixelY + (height / 2);
            const x2 = p2.x - centralTilePixelX + (width / 2);
            const y2 = p2.y - centralTilePixelY + (height / 2);
            
            return {
                path: `M${x1},${y1} L${x2},${y2}`,
                color: getSpeedColor(segment.speedKmh),
            }
        });

        return {
            viewBox: `0 0 ${width} ${height}`,
            paths: projectedPoints,
            tileUrl,
            width,
            height
        };
    }, [session]);

    if (!session) {
        return (
            <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
                <MapPin className="h-8 w-8 text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">Select a session to see the route</p>
            </div>
        );
    }

    if (!mapData) {
        return (
            <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    return (
        <div className="relative w-full h-full">
            <Image
                src={mapData.tileUrl}
                alt="Map background"
                layout="fill"
                objectFit="none" // Center the single tile
                className="rounded-lg"
                unoptimized
            />
            <svg
                width="100%"
                height="100%"
                viewBox={mapData.viewBox}
                className="absolute inset-0"
            >
                <g>
                    {mapData.paths.map((p, index) => (
                        <path
                            key={index}
                            d={p.path}
                            stroke={p.color}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    ))}
                </g>
            </svg>
        </div>
    );
};

export default StaticMap;
