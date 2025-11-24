import { apiClient, API_BASE_V2 } from './client';

export interface LeaderboardEntry {
    rank: number;
    name: string;
    score: number;
    level: number;
    char: string;
    date: string;
}

export const leaderboardApi = {
    getLeaderboard: async () => {
        return apiClient<LeaderboardEntry[]>('/leaderboard', { baseUrl: API_BASE_V2 });
    },

    submitScore: async (data: { name: string; score: number; level: number; coins: number; char: string; fingerprint: string }) => {
        return apiClient<{ success: boolean }>('/leaderboard', {
            baseUrl: API_BASE_V2,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};
