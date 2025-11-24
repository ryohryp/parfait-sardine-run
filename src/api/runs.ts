import { apiClient } from './client';

export interface RunLogEntry {
    id: string;
    stage: string;
    score: number;
    duration: number;
    coins: number;
    result: string;
    date: string;
}

interface ApiRunItem {
    run_id: string;
    stage?: string;
    score?: number;
    duration_ms?: number;
    coins?: number;
    result?: string;
    finished_gmt?: string;
    started_gmt?: string;
}

interface ApiRunsResponse {
    runs?: ApiRunItem[];
}

export interface StatsSummary {
    total_users?: number;
    played_users?: number;
    today_users?: number;
    total_runs: number;
    today_runs?: number;
    avg_score: number;
    max_score: number;
    device_ratio?: Array<{ device: string; cnt: number }>;
}

export const runsApi = {
    startRun: async (fingerprint: string) => {
        if (!fingerprint) throw new Error('Fingerprint is required');

        return apiClient<{ run_id: string; nonce: string; started_gmt: string }>('/run/start', {
            method: 'POST',
            body: JSON.stringify({
                fingerprint: fingerprint,
                device: 'Web',
                build: import.meta.env.DEV ? 'dev' : 'prod'
            })
        });
    },

    finishRun: async (runId: string, data: { score: number; stage: string; duration: number; coins: number; result: string; fingerprint: string; nonce: string }) => {
        return apiClient<{ success: boolean }>('/run/finish', {
            method: 'POST',
            body: JSON.stringify({
                run_id: runId,
                nonce: data.nonce,
                fingerprint: data.fingerprint,
                score: data.score,
                stage: data.stage,
                duration_ms: data.duration,
                coins: data.coins,
                result: data.result
            })
        });
    },

    getRuns: async (fingerprint: string) => {
        if (!fingerprint) return [];

        const response = await apiClient<ApiRunsResponse | ApiRunItem[]>(`/runs?fingerprint=${encodeURIComponent(fingerprint)}`);

        // API returns { runs: [...], page, per_page, total } or array directly
        const data = Array.isArray(response) ? response : (response?.runs || []);

        // Transform API response to match RunLogEntry interface
        return data.map((item: ApiRunItem) => ({
            id: item.run_id,
            stage: item.stage || 'Unknown',
            score: item.score || 0,
            duration: item.duration_ms || 0,
            coins: item.coins || 0,
            result: item.result || 'unknown',
            date: item.finished_gmt || item.started_gmt || ''
        } as RunLogEntry));
    },

    getStats: async (fingerprint: string) => {
        return apiClient<StatsSummary>('/stats/summary', {
            headers: { 'X-PSR-Client': fingerprint }
        });
    }
};
