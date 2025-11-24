import { apiClient } from './client';

export interface LeaderboardEntry {
    rank: number;
    name: string;
    score: number;
    level: number;
    char: string;
    date: string;
}

const LEADERBOARD_BASE = 'https://howasaba-code.com/wp-json/psrun/v2';

export const leaderboardApi = {
    getLeaderboard: async () => {
        return apiClient<LeaderboardEntry[]>('/leaderboard', { baseUrl: LEADERBOARD_BASE });
    },

    submitScore: async (data: { name: string; score: number; level: number; coins: number; char: string; fingerprint: string }) => {
        return apiClient<{ success: boolean }>('/leaderboard', {
            baseUrl: LEADERBOARD_BASE,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};
