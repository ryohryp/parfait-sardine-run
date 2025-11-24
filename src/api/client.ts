export const API_BASE = 'https://howasaba-code.com/wp-json/psr/v1';

export interface ApiOptions extends RequestInit {
    baseUrl?: string;
}

export async function apiClient<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { baseUrl = API_BASE, ...fetchOptions } = options;
    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url, {
        ...fetchOptions,
        headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}
