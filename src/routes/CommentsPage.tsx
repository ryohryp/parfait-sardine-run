import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { commentsApi } from '../api/comments';
import type { Comment } from '../api/comments';
import { useFingerprint } from '../hooks/useFingerprint';
import { PageTransition } from '../components/common/PageTransition';

export const CommentsPage: React.FC = () => {
    const { t } = useTranslation();
    const fingerprint = useFingerprint();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState(() => localStorage.getItem('psrun_user_name') || '');
    const [email, setEmail] = useState(() => localStorage.getItem('psrun_user_email') || '');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

    const loadComments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await commentsApi.getComments(fingerprint);
            setComments(data);
        } catch {
            setError(t('loadError'));
            setComments([]);
        } finally {
            setLoading(false);
        }
    }, [fingerprint, t]);

    useEffect(() => {
        if (fingerprint) {
            loadComments();
        }
    }, [fingerprint, loadComments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !message) return;

        setSubmitting(true);
        setSubmitResult(null);

        try {
            localStorage.setItem('psrun_user_name', name);
            if (email) localStorage.setItem('psrun_user_email', email);

            const res = await commentsApi.postComment({
                name,
                email,
                message,
                fingerprint
            });

            setSubmitResult({ success: res.success, message: res.success ? t('submitSuccess') : res.message });
            if (res.success) {
                setMessage('');
                loadComments();
            }
        } catch {
            setSubmitResult({ success: false, message: t('submitError') });
        } finally {
            setSubmitting(false);
        }
    };

    const handleLike = async (commentId: number) => {
        try {
            const res = await commentsApi.toggleLike(commentId, fingerprint);
            if (res.success) {
                setComments(prev => prev.map(c =>
                    c.id === commentId ? { ...c, like_count: res.like_count, liked: res.liked } : c
                ));
            }
        } catch (err) {
            console.error('Like failed', err);
        }
    };

    return (
        <PageTransition transitionKey="comments">
            <div className="page-container">
                <div className="page-header">
                    <h1>{t('comments')}</h1>
                    <Link to="/" className="ghost">{t('backToGame')}</Link>
                </div>

                <div className="comments-section">
                    <div className="comment-form">
                        <h3>{t('postComment')}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>{t('nameRequired')}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={20}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('emailOptional')}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('messageRequired')}</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    maxLength={140}
                                    required
                                />
                            </div>
                            <button type="submit" disabled={submitting} className="primary">
                                {submitting ? t('submitting') : t('submit')}
                            </button>
                            {submitResult && (
                                <p className={submitResult.success ? 'success-msg' : 'error-msg'}>
                                    {submitResult.message}
                                </p>
                            )}
                        </form>
                    </div>

                    <div className="comments-list">
                        <h3>{t('recentComments')}</h3>
                        {loading && <p>{t('loading')}</p>}
                        {error && <p style={{ color: '#f44336' }}>{error}</p>}

                        {comments.map((comment) => (
                            <div key={comment.id} className="commentItem">
                                <div className="commentItemHeader">
                                    <span className="commentItemName">{comment.name}</span>
                                    <span className="comment-date">{comment.date}</span>
                                </div>
                                <div className="commentItemMessage">{comment.message}</div>
                                <div className="comment-footer">
                                    <button
                                        className={`commentLikeBtn ${comment.liked ? 'isLiked' : ''}`}
                                        onClick={() => handleLike(comment.id)}
                                    >
                                        ❤️ {comment.like_count}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageTransition>
    );
};
