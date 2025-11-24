import { apiClient } from './client';

export interface Comment {
    id: number;
    name: string;
    message: string;
    date: string;
    like_count: number;
    liked: boolean;
}

interface ApiCommentItem {
    comment_id: number;
    author: string;
    content: string;
    date_gmt: string;
    like_count?: number;
    liked?: boolean;
}

interface ApiCommentsResponse {
    items?: ApiCommentItem[];
}

export interface PostCommentParams {
    name: string;
    email?: string;
    message: string;
    fingerprint: string;
}

export const commentsApi = {
    getComments: async (fingerprint?: string) => {
        const headers: HeadersInit = fingerprint ? { 'X-PSR-Client': fingerprint } : {};
        const response = await apiClient<ApiCommentsResponse | ApiCommentItem[]>('/comments?post_id=103', { headers });

        // API returns { items: [...], total, page, per_page } or array directly
        const data = Array.isArray(response) ? response : (response?.items || []);

        // Transform API response to match Comment interface
        return data.map((item: ApiCommentItem) => ({
            id: item.comment_id,
            name: item.author,
            message: item.content,
            date: item.date_gmt,
            like_count: item.like_count || 0,
            liked: item.liked || false
        } as Comment));
    },

    postComment: async (params: PostCommentParams) => {
        return apiClient<{ success: boolean; message: string }>('/comment', {
            method: 'POST',
            body: JSON.stringify({
                post_id: 103,
                name: params.name,
                email: params.email,
                content: params.message,
                client_id: params.fingerprint,
            }),
        });
    },

    toggleLike: async (commentId: number, fingerprint: string) => {
        return apiClient<{ success: boolean; like_count: number; liked: boolean }>('/like', {
            method: 'POST',
            headers: { 'X-PSR-Client': fingerprint },
            body: JSON.stringify({
                comment_id: commentId,
                client_id: fingerprint,
            }),
        });
    },
};
