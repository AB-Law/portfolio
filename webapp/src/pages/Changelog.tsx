import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { loadChangelogReleases } from '../utils/changelog';
import { type ChangelogRelease } from '../utils/changelog';

const renderers: Components = {
    h1: ({ children, ...props }) => (
        <h1 className="text-3xl font-display font-bold text-white mb-4" {...props}>
            {children}
        </h1>
    ),
    h2: ({ children, ...props }) => (
        <h2 className="text-2xl font-display font-semibold text-white mt-8 mb-3" {...props}>
            {children}
        </h2>
    ),
    h3: ({ children, ...props }) => (
        <h3 className="text-xl font-display font-semibold text-accent-cyan mt-6 mb-3" {...props}>
            {children}
        </h3>
    ),
    p: ({ children, ...props }) => (
        <p className="leading-relaxed text-text-muted mb-4" {...props}>
            {children}
        </p>
    ),
    li: ({ children, ...props }) => (
        <li className="mb-2 text-text-muted leading-relaxed" {...props}>
            {children}
        </li>
    ),
};

const formatReleaseDate = (value?: string) => {
    if (!value) {
        return 'Unreleased';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeZone: 'UTC',
    }).format(parsed);
};

export default function Changelog() {
    const [releases, setReleases] = useState<ChangelogRelease[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string>('');
    const [isRetrying, setIsRetrying] = useState<boolean>(false);
    const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

    const loadChangelog = useCallback(async () => {
        setLoading(true);
        setLoadError('');

        try {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                throw new Error('You are currently offline. Connect to the internet and retry.');
            }

            const nextReleases = await loadChangelogReleases();
            setReleases(nextReleases);
            setLoadError('');
        } catch (error) {
            setReleases([]);
            setLoadError(error instanceof Error ? error.message : 'Failed to load changelog.');
        } finally {
            setLoading(false);
            setIsRetrying(false);
        }
    }, []);

    const retryFetch = () => {
        setIsRetrying(true);
        void loadChangelog();
    };

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const syncNetworkStatus = () => setIsOffline(!window.navigator.onLine);
        syncNetworkStatus();
        window.addEventListener('online', syncNetworkStatus);
        window.addEventListener('offline', syncNetworkStatus);

        return () => {
            window.removeEventListener('online', syncNetworkStatus);
            window.removeEventListener('offline', syncNetworkStatus);
        };
    }, []);

    useEffect(() => {
        void loadChangelog();
    }, [loadChangelog]);

    return (
        <div className="flex-grow w-full max-w-6xl mx-auto px-4 md:px-6 py-12">
            <div className="mb-10">
                <div className="flex items-center gap-2 text-xs font-mono text-accent-lime mb-3">
                    <span className="material-symbols-outlined text-sm animate-pulse">update</span>
                    <span>changelog_feed</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-white">
                    Changelog
                </h1>
                <p className="text-text-muted mt-4 max-w-3xl">
                    A chronological log of releases and platform updates, loaded directly from project markdown.
                </p>
            </div>

            {loading ? (
                <div className="text-xs font-mono text-accent-lime animate-pulse py-6">Loading changelog...</div>
            ) : (
                <div className="space-y-6">
                    {loadError && (
                        <div className="glass-panel border border-accent-magenta/40 bg-accent-magenta/5 text-accent-magenta text-sm px-4 py-3 rounded-lg space-y-3">
                            <p>{loadError}</p>
                            {isOffline && <p className="text-text-muted text-xs">Network appears offline.</p>}
                            <button
                                type="button"
                                onClick={retryFetch}
                                disabled={isRetrying}
                                className="px-3 py-1.5 rounded border border-accent-cyan text-accent-cyan text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-cyan hover:text-bg-void transition-colors"
                            >
                                {isRetrying ? 'Retrying…' : 'Retry changelog feed'}
                            </button>
                        </div>
                    )}

                    {releases.length === 0 && !loadError ? (
                        <div className="glass-panel border border-glass-border rounded-lg p-5">
                            <div className="text-text-muted font-mono text-sm">No release data available.</div>
                        </div>
                    ) : (
                    releases.map(({ version, date, body }) => {
                            const formattedDate = formatReleaseDate(date);

                            return (
                                <article key={`${version}-${date ?? 'unreleased'}`} className="glass-panel border border-glass-border rounded-xl p-6">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-xs font-mono text-accent-cyan">[{version}]</span>
                                        <span className="h-1.5 w-1.5 rounded-full bg-accent-lime"></span>
                                        <span className="text-xs font-mono text-text-muted">{formattedDate}</span>
                                    </div>
                                    <div className="mt-6 prose prose-invert max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={renderers}
                                        >
                                            {body || '_No notes for this release._'}
                                        </ReactMarkdown>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

