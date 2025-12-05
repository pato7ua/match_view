
import scrapedData from './scraped-matches.json';

export type Team = {
    id: string;
    name: string;
    logoUrl: string;
};

export type Match = {
    id: number;
    teams: [Team, Team];
    date: string;
    score?: string;
    winnerId?: string | null; // null for a draw
    time?: string;
}

export const ourTeam: Team = {
    id: 'playas-de-orihuela',
    name: 'Playas de Orihuela',
    logoUrl: '/assets/team-icons/playas-de-orihuela.png', // Keep our existing logo
};

const cleanTeamName = (name: string) => {
    return name.split('\n')[0].trim();
};

const generateSlug = (name: string) => {
    return cleanTeamName(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const allTeamNames = new Set<string>();
scrapedData.forEach(match => {
    allTeamNames.add(cleanTeamName(match.home_team));
    allTeamNames.add(cleanTeamName(match.away_team));
});

const allTeams: Team[] = Array.from(allTeamNames).map(name => {
    const slug = generateSlug(name);
    if (name === ourTeam.name) return { ...ourTeam, id: slug };
    
    return {
        id: slug,
        name: name,
        logoUrl: `/assets/team-icons/${slug}.png`, // Assume logos exist based on slug
    };
});

const getTeamByName = (name: string): Team => {
    const cleanedName = cleanTeamName(name);
    const team = allTeams.find(t => t.name === cleanedName);
    if (team) return team;
    
    // Fallback for names that might not be in the initial set if data is inconsistent
    const slug = generateSlug(cleanedName);
    return {
        id: slug,
        name: cleanedName,
        logoUrl: `/assets/team-icons/${slug}.png`
    }
};


const generateMatches = (): Match[] => {
    return scrapedData.map((match, index) => {
        const homeTeam = getTeamByName(match.home_team);
        const awayTeam = getTeamByName(match.away_team);

        let winnerId: string | null = null;
        if (match.score) {
            const [homeScore, awayScore] = match.score.split('-').map(Number);
            if (homeTeam.id === ourTeam.id) {
                if (homeScore > awayScore) winnerId = ourTeam.id;
                if (awayScore > homeScore) winnerId = awayTeam.id;
            } else { // awayTeam is ourTeam
                 if (awayScore > homeScore) winnerId = ourTeam.id;
                 if (homeScore > awayScore) winnerId = homeTeam.id;
            }
        }

        const date = new Date(match.date);
        if (match.time) {
            const [hours, minutes] = match.time.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
                date.setHours(hours, minutes);
            }
        } else {
            date.setHours(17, 0, 0, 0); // Default time if not provided
        }

        return {
            id: match.jornada * 100 + index, // Create a unique ID
            teams: [homeTeam, awayTeam],
            date: date.toISOString(),
            score: match.score || undefined,
            winnerId: match.status === 'finished' ? winnerId : undefined,
            time: match.time || undefined
        };
    });
};

export const allMatches: Match[] = generateMatches();

export const upcomingMatches = allMatches
    .filter(m => new Date(m.date) >= new Date())
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

export const pastMatches = allMatches
    .filter(m => new Date(m.date) < new Date())
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
