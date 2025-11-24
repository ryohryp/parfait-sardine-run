const IS_DEV = import.meta.env.DEV;
const API_ORIGIN = IS_DEV ? '/psrun-api' : 'https://howasaba-code.com';

export const API_BASE = `${API_ORIGIN}/wp-json/psr/v1`;
export const API_BASE_V2 = `${API_ORIGIN}/wp-json/psrun/v2`;

export interface ApiOptions extends RequestInit {
    baseUrl?: string;
}

export async function apiClient<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { baseUrl = API_BASE, ...fetchOptions } = options;
    const url = `${baseUrl}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers: {
                'Content-Type': 'application/json',
                ...fetchOptions.headers,
            },
        });

        if (!response.ok) {
            // Try to parse error message from body if available
            let errorMessage = `API Error: ${response.status} ${response.statusText}`;
            try {
                const errorBody = await response.json();
                if (errorBody.message) {
                    errorMessage += ` - ${errorBody.message}`;
                }
            } catch {
                // Ignore json parse error
            }
            throw new Error(errorMessage);
        }

        return response.json();
    } catch (error) {
        console.error('API Request Failed:', error);
        throw error;
    }
}
