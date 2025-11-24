import { apiClient } from './client';

export interface Comment {
    id: number;
    name: string;
    message: string;
    date: string;
    like_count: number;
    liked: boolean;
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
        return apiClient<Comment[]>('/comments?post_id=103', { headers });
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
