
"use client";

import React, { useEffect, useRef, memo } from 'react';
import L, { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SessionWithStats, RouteSegment } from '@/app/playground/page';
import { MapPin } from 'lucide-react';

// Fix for default marker icon in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


const getSpeedColor = (speedKmh: number): string => {
    if (speedKmh < 5) return '#3b82f6'; // Blue
    if (speedKmh < 15) return '#22c55e'; // Green
    if (speedKmh < 25) return '#f97316'; // Orange
    return '#ef4444'; // Red
};

const PlaygroundMap: React.FC<{ session: SessionWithStats | null }> = ({ session }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const layerGroupRef = useRef<L.LayerGroup | null>(null);
    const popupRef = useRef<L.Popup | null>(null);

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            // Initialize map only once
            mapRef.current = L.map(mapContainerRef.current, {
                center: [41.3851, 2.1734], // Default center (Barcelona)
                zoom: 13,
                scrollWheelZoom: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);
            
            layerGroupRef.current = L.layerGroup().addTo(mapRef.current);

             mapRef.current.on('click', (e) => {
                if (!session || !mapRef.current) return;

                let closestPoint = null;
                let closestSegment = null;
                let minDistance = Infinity;

                session.stats.routeSegments.forEach((segment) => {
                    const polyline = L.polyline(segment.coords);
                    // Leaflet doesn't have a simple "closest point on polyline" function,
                    // so we check distance to vertices as a simplification.
                    segment.coords.forEach(coord => {
                        const pointLatLng = L.latLng(coord[0], coord[1]);
                        const distance = e.latlng.distanceTo(pointLatLng);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestPoint = pointLatLng;
                            closestSegment = segment;
                        }
                    })
                });

                if (closestPoint && closestSegment) {
                    const pointIndex = session.points.findIndex(p => p.lat === closestPoint!.lat && p.lng === closestPoint!.lng);
                    const pointData = pointIndex !== -1 ? session.points[pointIndex] : null;
                    
                    const content = `
                        <div>
                            <b>Time:</b> ${pointData ? new Date(pointData.gps_time).toLocaleTimeString() : 'N/A'}<br/>
                            <b>Speed:</b> ${closestSegment.speedKmh.toFixed(1)} km/h
                        </div>
                    `;
                    
                    if (popupRef.current) {
                        popupRef.current.setLatLng(closestPoint).setContent(content).openOn(mapRef.current);
                    } else {
                        popupRef.current = L.popup()
                            .setLatLng(closestPoint)
                            .setContent(content)
                            .openOn(mapRef.current);
                    }
                }
            });
        }

        // Cleanup on unmount
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (mapRef.current && layerGroupRef.current) {
            // Clear previous route layers
            layerGroupRef.current.clearLayers();
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }

            if (session) {
                const bounds = session.points.map(p => [p.lat, p.lng] as [number, number]) as LatLngBoundsExpression;
                
                session.stats.routeSegments.forEach((segment: RouteSegment) => {
                    L.polyline(segment.coords as [number, number][], {
                        color: getSpeedColor(segment.speedKmh),
                        weight: 4,
                    }).addTo(layerGroupRef.current!);
                });

                const startPoint = session.points[0];
                const endPoint = session.points[session.points.length - 1];

                if (startPoint) {
                    L.marker([startPoint.lat, startPoint.lng]).addTo(layerGroupRef.current!).bindTooltip("Start");
                }
                if (endPoint) {
                    L.marker([endPoint.lat, endPoint.lng]).addTo(layerGroupRef.current!).bindTooltip("End");
                }
                
                if (bounds.length > 0) {
                    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        }
    }, [session]);

    return (
        <>
            {!session && (
                 <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/30 rounded-lg pointer-events-none">
                    <div className="flex items-center">
                        <MapPin className="h-8 w-8 text-muted-foreground" />
                        <p className="ml-2 text-muted-foreground">Select a session to see the route</p>
                    </div>
                </div>
            )}
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%', borderRadius: '1rem', backgroundColor: '#e0e0e0' }} />
        </>
    );
};

export default memo(PlaygroundMap);
