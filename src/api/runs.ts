import { apiClient } from './client';

export interface RunLogEntry {
    id: number;
    stage: string;
    score: number;
    duration: number;
    coins: number;
    result: string;
    date: string;
}

export interface StatsSummary {
    total_runs: number;
    total_score: number;
    total_coins: number;
    max_score: number;
}

export const runsApi = {
    startRun: async (fingerprint: string) => {
        return apiClient<{ success: boolean; run_id: number }>('/run/start', {
            method: 'POST',
            body: JSON.stringify({ client_id: fingerprint })
        });
    },

    finishRun: async (runId: number, data: { score: number; stage: string; duration: number; coins: number; result: string; fingerprint: string }) => {
        return apiClient<{ success: boolean }>('/run/finish', {
            method: 'POST',
            body: JSON.stringify({
                run_id: runId,
                client_id: data.fingerprint,
                ...data
            })
        });
    },

    getRuns: async (fingerprint: string) => {
        return apiClient<RunLogEntry[]>('/runs', {
            headers: { 'X-PSR-Client': fingerprint }
        });
    },

    getStats: async (fingerprint: string) => {
        return apiClient<StatsSummary>('/stats/summary', {
            headers: { 'X-PSR-Client': fingerprint }
        });
    }
};
