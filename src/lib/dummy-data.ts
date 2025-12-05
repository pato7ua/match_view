import type { Player } from './types';
import rawData from './player-data.json';
import { PITCH_LENGTH, PITCH_WIDTH } from './constants';

const MAX_SIMULATION_TIME = 5400; // 90 minutes in seconds

function generatePlayerData(playerId: number, totalTime: number): PlayerDataPoint[] {
    const data: PlayerDataPoint[] = [];
    let x = 50, y = 50;
    let speed = 0;
    let orientation = Math.random() * 360;
    let battery = 100;
    const agility = 5 + Math.random() * 10;
    const stamina = 0.8 + Math.random() * 0.4;
    
    const posKey = playerId % 11;
    switch(posKey) {
        case 0: x = 50; y = 5; break; 
        case 1: x = 20; y = 25; break;
        case 2: x = 80; y = 25; break;
        case 3: x = 40; y = 30; break;
        case 4: x = 60; y = 30; break;
        case 5: x = 30; y = 50; break;
        case 6: x = 70; y = 50; break;
        case 7: x = 50; y = 60; break;
        case 8: x = 25; y = 75; break;
        case 9: x = 75; y = 75; break;
        case 10: x = 50; y = 85; break;
        default: x = 40 + Math.random()*20; y = 40 + Math.random()*20;
    }


    for (let t = 0; t <= totalTime; t++) {
        const actionChance = Math.random();
        let targetSpeed = 0;
        if (actionChance > 0.98 && speed < 5) {
            targetSpeed = 7 + Math.random() * 2;
        } else if (actionChance > 0.7) {
            targetSpeed = 3 + Math.random() * 2;
        } else {
            targetSpeed = 0.5 + Math.random() * 1.5;
        }

        speed = speed * 0.9 + targetSpeed * 0.1;
        
        const isNearEdge = x < 10 || x > 90 || y < 10 || y > 90;
        const turnPriority = isNearEdge ? 0.5 : -0.5;
        let orientationChange = (Math.random() - turnPriority) * agility * (speed > 1 ? speed : 1);

        if (x < 5) orientation = 270;
        if (x > 95) orientation = 90;
        if (y < 5) orientation = 0;
        if (y > 95) orientation = 180;
        
        orientation = (orientation + orientationChange + 360) % 360;

        const speed_meters_per_sec = speed * stamina;
        // Correcting movement: sin for vertical (y), cos for horizontal (x)
        const dx_percent = (speed_meters_per_sec * Math.cos(orientation * Math.PI / 180)) / PITCH_WIDTH * 100;
        const dy_percent = (speed_meters_per_sec * Math.sin(orientation * Math.PI / 180)) / PITCH_LENGTH * 100;
        
        // Data model: y is vertical, x is horizontal
        let newX = x + dx_percent;
        let newY = y + dy_percent;

        // Clamp position to pitch boundaries (0-100)
        x = Math.max(0, Math.min(100, newX));
        y = Math.max(0, Math.min(100, newY));

        battery -= 0.002 + (speed * 0.0001);
        battery = Math.max(0, battery);

        data.push({
            timestamp: t,
            position: { x: y, y: x }, // CSS: top is y, left is x
            speed: speed_meters_per_sec,
            orientation: orientation,
            battery: parseFloat(battery.toFixed(2)),
        });
    }
    return data;
}

const typedPlayers = rawData.players as Omit<Player, 'data'>[];

export const players: Player[] = typedPlayers.map((player) => ({
    ...player,
    data: generatePlayerData(player.id, MAX_SIMULATION_TIME)
}));

// Re-export from season-data to consolidate
export { seasonPlayers } from './season-data';
export type { SeasonPlayer } from './season-data';
