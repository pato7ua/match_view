
export type PlayerDataPoint = {
  timestamp: number; // in seconds from start
  position: { x: number; y: number }; // percentage of pitch dimensions
  speed: number; // m/s
  orientation: number; // degrees, 0 is up
  battery: number; // percentage
};

export type Player = {
  id: number;
  name: string;
  jersey: number;
  data: PlayerDataPoint[];
};

export type GameStat = {
    distance: number;
    maxSpeed: number;
    sprints: number;
};

export type SeasonPlayer = {
    id: number;
    name: string;
    jersey: number;
    gamesPlayed: number;
    seasonStats: {
        totals: GameStat;
        averages: GameStat;
    }
};
