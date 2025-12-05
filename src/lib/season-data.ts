
// @ts-nocheck
// Disabling TypeScript checking for this file as it's for mock data generation.

import type { Player } from './types';
import rawData from './player-data.json';

const NUM_GAMES = 30;

const playerBase = rawData.players as Omit<Player, 'data'>[];

const generateGameStats = () => {
    const distance = 8 + Math.random() * 4; // 8km to 12km
    const maxSpeed = 7.5 + Math.random() * 2; // 7.5m/s to 9.5m/s
    const sprints = 15 + Math.floor(Math.random() * 15); // 15 to 30 sprints
    return { distance, maxSpeed, sprints };
};

export const seasonPlayers = playerBase.map(player => {
    const gamesPlayed = 20 + Math.floor(Math.random() * 11); // Each player plays between 20 and 30 games
    const games = Array.from({ length: gamesPlayed }, generateGameStats);

    const totals = games.reduce((acc, game) => {
        acc.distance += game.distance;
        acc.maxSpeed = Math.max(acc.maxSpeed, game.maxSpeed);
        acc.sprints += game.sprints;
        return acc;
    }, { distance: 0, maxSpeed: 0, sprints: 0 });

    const averages = {
        distance: totals.distance / gamesPlayed,
        maxSpeed: totals.maxSpeed, // Max speed is not an average
        sprints: totals.sprints / gamesPlayed,
    };

    return {
        ...player,
        gamesPlayed,
        seasonStats: {
            totals,
            averages,
        }
    };
});

export type SeasonPlayer = typeof seasonPlayers[0];
