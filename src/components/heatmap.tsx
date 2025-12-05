"use client"
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

type HeatmapProps = {
  positions: { x: number; y: number }[];
  gridSize?: number;
  radius?: number;
  maxOpacity?: number;
};

const Heatmap: React.FC<HeatmapProps> = ({
  positions,
  gridSize = 20,
  radius = 40,
  maxOpacity = 0.6,
}) => {
  const heatmapPoints = useMemo(() => {
    if (positions.length === 0) return [];

    const grid: number[][] = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(0));

    positions.forEach(pos => {
      // Data: x is vertical (0-100), y is horizontal (0-100)
      // The grid is mapped as grid[vertical_index][horizontal_index]
      const gridX = Math.floor((pos.x / 100) * (gridSize - 1)); // vertical position
      const gridY = Math.floor((pos.y / 100) * (gridSize - 1)); // horizontal position
      
      if (grid[gridX] && grid[gridX][gridY] !== undefined) {
        grid[gridX][gridY] += 1;
      }
    });

    let maxVal = 0;
    grid.forEach(row => {
      row.forEach(cell => {
        if (cell > maxVal) maxVal = cell;
      });
    });

    if (maxVal === 0) return [];

    const points = [];
    for (let i = 0; i < gridSize; i++) { // vertical grid traversal
      for (let j = 0; j < gridSize; j++) { // horizontal grid traversal
        if (grid[i][j] > 0) {
          points.push({
            x: (i / (gridSize - 1)) * 100, // vertical percentage for CSS
            y: (j / (gridSize - 1)) * 100, // horizontal percentage for CSS
            value: grid[i][j] / maxVal,
          });
        }
      }
    }
    return points;
  }, [positions, gridSize]);

  return (
    <motion.div 
      className="absolute inset-0 w-full h-full pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {heatmapPoints.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            // CSS: top is vertical, left is horizontal.
            // p.x is vertical data, p.y is horizontal data.
            top: `${p.x}%`, 
            left: `${p.y}%`,
            width: `${radius}%`,
            height: `${radius}%`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(255,100,0,${p.value * maxOpacity}) 0%, rgba(255,255,0,0) 70%)`,
          }}
        />
      ))}
    </motion.div>
  );
};

export default Heatmap;
