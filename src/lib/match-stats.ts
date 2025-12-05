
import { allMatches } from './teams';
import { seasonPlayers } from './season-data';

export type MatchStat = {
    playerId: number;
    playerName: string;
    playerJersey: number;
    distance: number;
    maxSpeed: number;
    sprints: number;
};

export type MatchStatsData = {
    matchId: number;
    stats: MatchStat[];
};

const generateMatchStats = (): MatchStatsData[] => {
    const pastMatches = allMatches.filter(m => new Date(m.date) < new Date());
    
    return pastMatches.map(match => {
        const stats: MatchStat[] = [];
        
        // Select 16 random players for each match
        const shuffledPlayers = [...seasonPlayers].sort(() => 0.5 - Math.random());
        const participatingPlayers = shuffledPlayers.slice(0, 16);

        participatingPlayers.forEach(player => {
            const distance = 8 + Math.random() * 4; // 8km to 12km
            const maxSpeed = 7.5 + Math.random() * 2; // 7.5m/s to 9.5m/s
            const sprints = 15 + Math.floor(Math.random() * 15); // 15 to 30 sprints
            
            stats.push({
                playerId: player.id,
                playerName: player.name,
                playerJersey: player.jersey,
                distance,
                maxSpeed,
                sprints,
            });
        });

        return {
            matchId: match.id,
            stats,
        };
    });
};

export const matchStats: MatchStatsData[] = generateMatchStats();
