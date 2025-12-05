"use client";

import { cn } from '@/lib/utils';
import type { Player, PlayerDataPoint } from '@/lib/types';
import { Navigation } from 'lucide-react';
import { motion } from 'framer-motion';

type PlayerMarkerProps = {
  player: Player & { currentData: PlayerDataPoint };
  isSelected: boolean;
  onClick: () => void;
};

export default function PlayerMarker({ player, isSelected, onClick }: PlayerMarkerProps) {
  const { position, orientation } = player.currentData;

  const markerStyle: React.CSSProperties = {
    // Data: x is vertical (0-100), y is horizontal (0-100).
    // CSS: top is vertical, left is horizontal.
    top: `${position.x}%`, 
    left: `${position.y}%`,
    transform: 'translate(-50%, -50%)',
  };

  const orientationStyle: React.CSSProperties = {
    transform: `rotate(${orientation}deg) translateY(-14px)`,
  };

  return (
    <motion.div
      className={cn(
        "absolute w-8 h-8 cursor-pointer group",
        isSelected && "z-10"
      )}
      style={markerStyle}
      onClick={onClick}
      animate={{ scale: isSelected ? 1.25 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div
        className={cn(
          "relative w-full h-full rounded-full flex items-center justify-center font-bold text-sm bg-primary text-primary-foreground border-2",
          "transition-all duration-300",
          isSelected ? 'border-accent shadow-[0_0_20px_theme(colors.accent)]' : 'border-primary-foreground/50 shadow-md group-hover:shadow-lg group-hover:border-accent/80'
        )}
      >
        {player.jersey}
      </div>
      <div 
        className="absolute inset-0 flex items-center justify-center text-accent transition-opacity duration-300"
        style={orientationStyle}
      >
        <Navigation size={18} fill="currentColor" className={cn("transition-opacity duration-300", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-80")}/>
      </div>
    </motion.div>
  );
}
