import { useEffect, useMemo, useState } from 'react';
import { BLOG_POSTS } from '../data/blogPosts';
import { MARKDOWN_IMAGE_ASSETS } from '../data/markdownImageAssets';
import { getLatestChangelogDate, loadChangelogReleases } from '../utils/changelog';
import { type ChangelogRelease } from '../utils/changelog';
import { buildTime, dependencies, deployedBranch, deployedCommit, deployedCommitDate, deployedVersion, devDependencies, packageName, packageVersion } from '../utils/buildMetadata';

type DependencyMap = Record<string, string>;

type EndpointProbe = {
    id: string;
    label: string;
    url: string;
};

type EndpointObservation = EndpointProbe & {
    lastCheckedAt: string | null;
    lastSuccessAt: string | null;
    latencyMs: number | null;
    statusCode?: number | null;
    isAvailable: boolean | null;
    error?: string;
};

type EndpointHistorySample = {
    checkedAt: string;
    isAvailable: boolean;
    latencyMs: number | null;
    statusCode: number | null;
};

type EndpointLatencyPercentiles = {
    p50: number | null;
    p95: number | null;
    p99: number | null;
};

type EndpointSlaSummary = {
    sampleCount: number;
    successfulSamples: number;
    availabilityPercent: number | null;
    latencyPercentiles: EndpointLatencyPercentiles;
};

type EndpointChangeSummary = {
    id: string;
    label: string;
    changed: boolean;
    hasPreviousSample: boolean;
    lines: string[];
};

type ChangelogFetchState = {
    isAvailable: boolean | null;
    lastCheckedAt: string | null;
    lastSuccessAt: string | null;
    latencyMs: number | null;
    statusCode: number | null;
    releaseCount: number;
    error?: string;
};

const CONTENT_BLOG_FILE_COUNT = Object.keys(import.meta.glob('/content/blog/*.md')).length;
const MARKDOWN_IMAGE_COUNT = Object.keys(MARKDOWN_IMAGE_ASSETS).length;
const LATEST_POST_SLUG = BLOG_POSTS[0]?.id;
const ENDPOINT_HISTORY_KEY = 'status:endpoint-history-v1';
const MAX_ENDPOINT_HISTORY = 16;
const OBSERVED_ENDPOINTS: EndpointProbe[] = [
    {
        id: 'latest-article',
        label: 'Latest article markdown',
        url: LATEST_POST_SLUG ? `/content/blog/${LATEST_POST_SLUG}.md` : '/content/changelog.md',
    },
    {
        id: 'homepage-route',
        label: 'Homepage route',
        url: '/',
    },
    {
        id: 'status-route',
        label: 'Status route',
        url: '/status',
    },
];

const createInitialEndpointObservations = (): EndpointObservation[] =>
    OBSERVED_ENDPOINTS.map((endpoint) => ({
        ...endpoint,
        lastCheckedAt: null,
        lastSuccessAt: null,
        latencyMs: null,
        isAvailable: null,
        error: undefined,
        statusCode: undefined,
    }));

const loadEndpointHistory = (): Record<string, EndpointHistorySample[]> => {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(ENDPOINT_HISTORY_KEY);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (!parsed || typeof parsed !== 'object') {
            return {};
        }

        const next: Record<string, EndpointHistorySample[]> = {};
        Object.entries(parsed).forEach(([id, entries]) => {
            if (!Array.isArray(entries)) {
                return;
            }

            next[id] = entries
                .map((entry) => {
                    if (!entry || typeof entry !== 'object') {
                        return null;
                    }

                    const maybeEntry = entry as Record<string, unknown>;
                    const checkedAt = typeof maybeEntry.checkedAt === 'string' ? maybeEntry.checkedAt : null;
                    if (!checkedAt) {
                        return null;
                    }

                    const isAvailable =
                        maybeEntry.isAvailable === true || maybeEntry.isAvailable === false
                            ? (maybeEntry.isAvailable as boolean)
                            : null;
                    if (isAvailable === null) {
                        return null;
                    }

                    const latencyMs =
                        typeof maybeEntry.latencyMs === 'number' && Number.isFinite(maybeEntry.latencyMs)
                            ? Math.max(0, Math.round(maybeEntry.latencyMs))
                            : null;
                    const statusCode =
                        typeof maybeEntry.statusCode === 'number' && Number.isFinite(maybeEntry.statusCode)
                            ? maybeEntry.statusCode
                            : null;

                    return {
                        checkedAt,
                        isAvailable,
                        latencyMs,
                        statusCode,
                    };
                })
                .filter((entry): entry is EndpointHistorySample => entry !== null)
                .slice(-MAX_ENDPOINT_HISTORY);
        });

        return next;
    } catch {
        return {};
    }
};

const persistEndpointHistory = (history: Record<string, EndpointHistorySample[]>) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(ENDPOINT_HISTORY_KEY, JSON.stringify(history));
    } catch {
        // Local storage can fail in private windows / restricted contexts.
    }
};

const appendEndpointHistory = (
    priorHistory: Record<string, EndpointHistorySample[]>,
    observations: EndpointObservation[]
) => {
    const nextHistory: Record<string, EndpointHistorySample[]> = { ...priorHistory };

    observations.forEach((observation) => {
        const sample = {
            checkedAt: observation.lastCheckedAt ?? new Date().toISOString(),
            isAvailable: observation.isAvailable === true,
            latencyMs: observation.latencyMs ?? null,
            statusCode: observation.statusCode ?? null,
        };

        nextHistory[observation.id] = [...(nextHistory[observation.id] ?? []), sample].slice(
            -MAX_ENDPOINT_HISTORY
        );
    });

    return nextHistory;
};

const endpointHistoryUptime = (history: EndpointHistorySample[]) => {
    if (history.length === 0) {
        return null;
    }

    const successful = history.filter(({ isAvailable }) => isAvailable).length;
    return Math.round((successful / history.length) * 100);
};

const endpointAverageLatency = (history: EndpointHistorySample[]) => {
    const latencies = history
        .map(({ latencyMs }) => latencyMs)
        .filter((latency): latency is number => latency != null && Number.isFinite(latency));

    if (latencies.length === 0) {
        return null;
    }

    const average = latencies.reduce((total, latency) => total + latency, 0) / latencies.length;
    return Math.max(0, Math.round(average));
};

const percentileValue = (values: number[], percentile: number) => {
    const safePercentile = Math.min(100, Math.max(0, percentile));
    if (values.length === 0) {
        return null;
    }

    const sorted = [...values].sort((left, right) => left - right);
    if (sorted.length === 1) {
        return sorted[0];
    }

    const position = (safePercentile / 100) * (sorted.length - 1);
    const low = Math.floor(position);
    const high = Math.min(sorted.length - 1, Math.ceil(position));
    if (low === high) {
        return Math.round(sorted[low]);
    }

    const weight = position - low;
    const value = sorted[low] + (sorted[high] - sorted[low]) * weight;
    return Math.round(value);
};

const endpointLatencyPercentiles = (history: EndpointHistorySample[]) => {
    const latencies = history
        .filter(({ isAvailable, latencyMs }) => isAvailable && latencyMs != null && Number.isFinite(latencyMs))
        .map(({ latencyMs }) => latencyMs ?? 0);

    if (latencies.length === 0) {
        return { p50: null, p95: null, p99: null };
    }

    return {
        p50: percentileValue(latencies, 50),
        p95: percentileValue(latencies, 95),
        p99: percentileValue(latencies, 99),
    };
};

const buildEndpointSlaSummary = (history: EndpointHistorySample[]): EndpointSlaSummary => {
    const successfulSamples = history.filter(({ isAvailable }) => isAvailable).length;
    const availabilityPercent = endpointHistoryUptime(history);

    return {
        sampleCount: history.length,
        successfulSamples,
        availabilityPercent,
        latencyPercentiles: endpointLatencyPercentiles(history),
    };
};

const buildEndpointChangeSummary = (endpoint: EndpointProbe, history: EndpointHistorySample[]): EndpointChangeSummary => {
    if (history.length < 2) {
        return {
            id: endpoint.id,
            label: endpoint.label,
            changed: false,
            hasPreviousSample: false,
            lines: ['Awaiting a previous check for comparison.'],
        };
    }

    const previousSample = history[history.length - 2];
    const latestSample = history[history.length - 1];
    const lines: string[] = [];
    let changed = false;

    if (previousSample.isAvailable !== latestSample.isAvailable) {
        changed = true;
        lines.push(
            `availability ${previousSample.isAvailable ? 'up' : 'down'} → ${latestSample.isAvailable ? 'up' : 'down'}`
        );
    }

    if (previousSample.statusCode !== latestSample.statusCode) {
        changed = true;
        lines.push(`status ${previousSample.statusCode ?? 'n/a'} → ${latestSample.statusCode ?? 'n/a'}`);
    }

    if (previousSample.latencyMs != null && latestSample.latencyMs != null) {
        const delta = latestSample.latencyMs - previousSample.latencyMs;
        if (delta !== 0) {
            changed = true;
            lines.push(`latency ${delta > 0 ? '+' : ''}${delta}ms`);
        }
    } else if (latestSample.latencyMs != null && previousSample.latencyMs == null) {
        changed = true;
        lines.push('latency available now');
    } else if (latestSample.latencyMs == null && previousSample.latencyMs != null) {
        changed = true;
        lines.push('latency missing this check');
    }

    if (!changed) {
        lines.push('no notable change');
    }

    return {
        id: endpoint.id,
        label: endpoint.label,
        changed,
        hasPreviousSample: true,
        lines,
    };
};

const buildEndpointTrendCsv = (endpointLabel: string, samples: EndpointHistorySample[]) => {
    const header = `"Endpoint","Checked At","Is Available","Latency Ms","Status Code"\n`;
    const rows = samples.map((sample) =>
        [
            `"${endpointLabel}"`,
            `"${sample.checkedAt}"`,
            sample.isAvailable,
            sample.latencyMs ?? '',
            sample.statusCode ?? '',
        ].join(',')
    );

    return header + rows.join('\n');
};

const downloadTextFile = (filename: string, content: string) => {
    if (typeof window === 'undefined') {
        return;
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);

    link.href = objectUrl;
    link.download = filename;
    link.style.position = 'absolute';
    link.style.left = '-9999px';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
};

const safeTimestamp = (value: string) => value.replace(/[:.]/g, '-');

const formatPercent = (value?: number | null): string =>
    value == null ? 'n/a' : `${value}%`;

const buildSparklinePath = (
    history: EndpointHistorySample[],
    options: {
        width: number;
        height: number;
        mode: 'availability' | 'latency';
    }
) => {
    if (history.length === 0) {
        return '';
    }

    if (history.length === 1) {
        const x = options.width / 2;
        if (options.mode === 'availability') {
            return `${x},${history[0].isAvailable ? 4 : options.height - 4} ${x},${history[0].isAvailable ? 4 : options.height - 4}`;
        }

        const singleLatency = history[0].latencyMs ?? 600;
        return `${x},${Math.max(4, options.height - 4 - singleLatency / 20)} ${x},${Math.max(4, options.height - 4 - singleLatency / 20)}`;
    }

    if (options.mode === 'availability') {
        const xStep = options.width / (history.length - 1);
        const points = history.map((sample, index) =>
            `${index * xStep},${sample.isAvailable ? 4 : options.height - 4}`
        );
        return points.join(' ');
    }

    const latencies = history
        .map(({ latencyMs }) => latencyMs)
        .filter((latency): latency is number => latency != null && Number.isFinite(latency));
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 1200;
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const range = Math.max(1, maxLatency - minLatency);
    const xStep = options.width / (history.length - 1);

    const points = history.map((sample, index) => {
        const latency = sample.latencyMs ?? maxLatency;
        const normalized = (latency - minLatency) / range;
        const y = Math.max(4, Math.min(options.height - 4, options.height - 4 - normalized * (options.height - 8)));
        return `${index * xStep},${y}`;
    });

    return points.join(' ');
};

const buildSparklineDots = (history: EndpointHistorySample[], options: { width: number; height: number }) => {
    if (history.length === 0) {
        return [];
    }

    if (history.length === 1) {
        return [
            {
                x: options.width / 2,
                y: history[0].isAvailable ? 4 : options.height - 4,
                isAvailable: history[0].isAvailable,
            },
        ];
    }

    const xStep = options.width / (history.length - 1);
    return history.map((sample, index) => ({
        x: index * xStep,
        y: sample.isAvailable ? 4 : options.height - 4,
        isAvailable: sample.isAvailable,
    }));
};

const formatDuration = (value?: number | null): string =>
    value == null ? 'N/A' : `${value}ms`;

const formatFetchError = (error: unknown): string =>
    error instanceof Error ? error.message : 'Request failed';

const checkEndpointAvailability = async (endpoint: EndpointProbe): Promise<EndpointObservation> => {
    const start = performance.now();
    const checkedAt = new Date().toISOString();

    try {
        const response = await fetch(endpoint.url, { method: 'GET', cache: 'no-store' });
        const latencyMs = Math.max(0, Math.round(performance.now() - start));
        const isAvailable = response.ok;

        return {
            ...endpoint,
            lastCheckedAt: checkedAt,
            lastSuccessAt: isAvailable ? checkedAt : null,
            latencyMs,
            statusCode: response.status,
            isAvailable,
            error: isAvailable ? undefined : `${response.status} ${response.statusText}`,
        };
    } catch (error) {
        return {
            ...endpoint,
            lastCheckedAt: checkedAt,
            lastSuccessAt: null,
            latencyMs: Math.max(0, Math.round(performance.now() - start)),
            isAvailable: false,
            error: formatFetchError(error),
        };
    }
};

const INITIAL_CHANGELOG_STATE: ChangelogFetchState = {
    isAvailable: null,
    lastCheckedAt: null,
    lastSuccessAt: null,
    latencyMs: null,
    statusCode: null,
    releaseCount: 0,
    error: undefined,
};

const dependencyNames = (items: DependencyMap) =>
    Object.keys(items).sort((leftName, rightName) => leftName.localeCompare(rightName));

const formatDate = (value?: string) => {
    if (!value) {
        return 'N/A';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
    }).format(parsed);
};

const useStatusObservability = () => {
    const [changelogReleases, setChangelogReleases] = useState<ChangelogRelease[]>([]);
    const [loadingReleases, setLoadingReleases] = useState<boolean>(true);
    const [changelogFetchState, setChangelogFetchState] = useState<ChangelogFetchState>(INITIAL_CHANGELOG_STATE);
    const [endpointObservations, setEndpointObservations] = useState<EndpointObservation[]>(() => createInitialEndpointObservations());
    const [endpointHistory, setEndpointHistory] = useState<Record<string, EndpointHistorySample[]>>(() => loadEndpointHistory());

    useEffect(() => {
        let isStale = false;

        const runChecks = async () => {
            const changelogStart = performance.now();
            const changelogCheckedAt = new Date().toISOString();

            try {
                const releases = await loadChangelogReleases();
                if (!isStale) {
                    setChangelogReleases(releases);
                    setChangelogFetchState({
                        isAvailable: true,
                        lastCheckedAt: changelogCheckedAt,
                        lastSuccessAt: changelogCheckedAt,
                        latencyMs: Math.max(0, Math.round(performance.now() - changelogStart)),
                        statusCode: 200,
                        releaseCount: releases.length,
                    });
                }
            } catch (error) {
                if (!isStale) {
                    setChangelogFetchState((previous) => ({
                        ...previous,
                        isAvailable: false,
                        lastCheckedAt: changelogCheckedAt,
                        latencyMs: Math.max(0, Math.round(performance.now() - changelogStart)),
                        statusCode: 0,
                        error: formatFetchError(error),
                    }));
                }
            } finally {
                if (!isStale) {
                    setLoadingReleases(false);
                }
            }

            const endpointResults = await Promise.all(OBSERVED_ENDPOINTS.map((endpoint) => checkEndpointAvailability(endpoint)));
            if (!isStale) {
                setEndpointObservations(endpointResults);
                setEndpointHistory((priorHistory) => {
                    const nextHistory = appendEndpointHistory(priorHistory, endpointResults);
                    persistEndpointHistory(nextHistory);
                    return nextHistory;
                });
            }
        };

        void runChecks();

        return () => {
            isStale = true;
        };
    }, []);

    const latestChangelogDate = getLatestChangelogDate(changelogReleases);
    const endpointStats = useMemo(
        () => [
            {
                id: 'changelog-feed',
                label: 'Changelog feed',
                url: '/content/changelog.md',
                lastCheckedAt: changelogFetchState.lastCheckedAt,
                lastSuccessAt: changelogFetchState.lastSuccessAt,
                latencyMs: changelogFetchState.latencyMs,
                statusCode: changelogFetchState.statusCode,
                isAvailable: changelogFetchState.isAvailable,
                error: changelogFetchState.error,
            },
            ...endpointObservations,
        ],
        [changelogFetchState, endpointObservations]
    );
    const reachableEndpoints = endpointStats.filter(({ isAvailable }) => isAvailable).length;
    const hasCheckedEndpoints = endpointStats.some(({ lastCheckedAt }) => !!lastCheckedAt);
    const endpointSummary = hasCheckedEndpoints
        ? `${reachableEndpoints}/${endpointStats.length} endpoints available`
        : `checking ${endpointStats.length} endpoints`;
    const hasLoadError = changelogFetchState.isAvailable === false;
    const endpointSlaSummaries = useMemo(() => {
        const next: Record<string, EndpointSlaSummary> = {};

        Object.entries(endpointHistory).forEach(([id, samples]) => {
            next[id] = buildEndpointSlaSummary(samples);
        });

        return next;
    }, [endpointHistory]);
    const endpointChangeSummaries = useMemo(
        () =>
            OBSERVED_ENDPOINTS.filter(({ id }) => id !== 'changelog-feed').map((endpoint) =>
                buildEndpointChangeSummary(endpoint, endpointHistory[endpoint.id] ?? [])
            ),
        [endpointHistory]
    );

    return {
        loadingReleases,
        changelogFetchState,
        endpointStats,
        endpointSummary,
        latestChangelogDate,
        hasLoadError,
        endpointHistory,
        endpointSlaSummaries,
        endpointChangeSummaries,
    };
};

export default function Status() {
    const {
        loadingReleases,
        changelogFetchState,
        endpointStats,
        endpointSummary,
        latestChangelogDate,
        hasLoadError,
        endpointHistory,
        endpointSlaSummaries,
        endpointChangeSummaries,
    } = useStatusObservability();

    const lastUpdated = formatDate(
        changelogFetchState.lastSuccessAt || latestChangelogDate || deployedCommitDate || buildTime
    );

    const dependencySections = useMemo(() => [
        {
            label: 'runtime',
            title: 'Production Dependencies',
            items: dependencyNames(dependencies),
            tone: 'text-accent-cyan',
        },
        {
            label: 'dev',
            title: 'Dev Dependencies',
            items: dependencyNames(devDependencies),
            tone: 'text-accent-magenta',
        },
    ], []);

    const contentCounts = useMemo(() => [
        { label: 'blog posts', value: String(BLOG_POSTS.length) },
        { label: 'blog markdown files', value: String(CONTENT_BLOG_FILE_COUNT) },
        { label: 'changelog entries', value: String(changelogFetchState.releaseCount) },
        { label: 'markdown image assets', value: String(MARKDOWN_IMAGE_COUNT) },
    ], [changelogFetchState.releaseCount]);

    const endpointChangeSummaryMap = useMemo(() => {
        const next: Record<string, EndpointChangeSummary> = {};
        endpointChangeSummaries.forEach((summary) => {
            next[summary.id] = summary;
        });
        return next;
    }, [endpointChangeSummaries]);

    const changedEndpointsCount = useMemo(
        () => endpointChangeSummaries.filter(({ changed }) => changed).length,
        [endpointChangeSummaries]
    );

    const handleExportEndpointTrend = (endpoint: EndpointObservation, samples: EndpointHistorySample[]) => {
        if (!samples.length) {
            return;
        }

        const safeName = `${endpoint.id}-${safeTimestamp(new Date().toISOString())}.csv`;
        downloadTextFile(safeName, buildEndpointTrendCsv(endpoint.label, samples));
    };

    const handleExportAllEndpointTrends = () => {
        const lines = ['"Endpoint","Checked At","Is Available","Latency Ms","Status Code"'];
        endpointStats.forEach((endpoint) => {
            const samples = endpointHistory[endpoint.id] ?? [];
            samples.forEach((sample) => {
                lines.push([
                    `"${endpoint.label}"`,
                    `"${sample.checkedAt}"`,
                    sample.isAvailable,
                    sample.latencyMs ?? '',
                    sample.statusCode ?? '',
                ].join(','));
            });
        });

        downloadTextFile(`status-all-endpoint-trends-${safeTimestamp(new Date().toISOString())}.csv`, `${lines.join('\n')}`);
    };

    return (
        <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-6 py-12">
            <div className="fixed top-16 left-1/4 w-[480px] h-[480px] bg-accent-cyan/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>
            <div className="fixed bottom-16 right-1/4 w-[480px] h-[480px] bg-accent-magenta/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>

            <div className="mb-10 max-w-5xl">
                <div className="flex items-center gap-2 text-xs font-mono text-accent-lime mb-3">
                    <span className="material-symbols-outlined text-sm animate-pulse">terminal</span>
                    <span>system_status</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-white">
                    Deployment & Iteration Ledger
                </h1>
                <p className="text-text-muted mt-4 max-w-3xl">
                    Runtime build metadata, dependency graph, and content supply chain at a glance.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="glass-panel rounded-xl p-6 border border-glass-border">
                    <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                        <h2 className="text-lg font-display font-semibold">Build Snapshot</h2>
                        <span className="text-[11px] font-mono text-text-muted">{packageName}@{packageVersion}</span>
                    </div>

                    <div className="space-y-3 text-sm font-mono">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-text-muted">Deploy branch</span>
                            <span className="text-white">{deployedBranch}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-text-muted">Deploy version</span>
                            <span className="text-white">{deployedVersion}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-text-muted">Deploy commit</span>
                            <span className="text-white break-all">{deployedCommit}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-text-muted">Commit timestamp</span>
                            <span className="text-white">{deployedCommitDate ? formatDate(deployedCommitDate) : 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-text-muted">Changelog fetch latency</span>
                            <span className="text-white">{formatDuration(changelogFetchState.latencyMs)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-text-muted">Last successful load</span>
                            <span className="text-white">{changelogFetchState.lastSuccessAt ? formatDate(changelogFetchState.lastSuccessAt) : 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-text-muted">Build time</span>
                            <span className="text-white">{buildTime === 'N/A' ? 'N/A' : formatDate(buildTime)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-text-muted">Last updated</span>
                            <span className="text-accent-lime">{lastUpdated}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-text-muted">Changelog source</span>
                            <span className="text-white">/content/changelog.md</span>
                        </div>
                        {hasLoadError && (
                            <div className="text-text-muted border border-accent-magenta/40 bg-accent-magenta/10 rounded px-2 py-1 text-[11px]">
                                Changelog feed failed to load; content counts are partially degraded.
                            </div>
                        )}
                    </div>
                </section>

                <section className="glass-panel rounded-xl p-6 border border-glass-border overflow-hidden">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                        <div>
                            <h2 className="text-lg font-display font-semibold">Endpoint Observability</h2>
                            <p className="text-xs text-text-muted mt-1">
                                {changedEndpointsCount} endpoint{changedEndpointsCount === 1 ? '' : 's'} changed since last check
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleExportAllEndpointTrends}
                            className="text-[11px] font-mono px-2 py-1 rounded border border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/10"
                        >
                            Export trend history CSV
                        </button>
                    </div>
                    <p className="mb-4 text-xs font-mono text-text-muted">{endpointSummary}</p>
                    <div className="mb-5 space-y-2">
                        <h3 className="text-sm font-display font-semibold">What changed since last check</h3>
                        <div className="space-y-2">
                            {endpointChangeSummaries.map((summary) => (
                                <div
                                    key={summary.id}
                                    className={`rounded-lg border px-3 py-2 text-xs font-mono ${
                                        summary.changed
                                            ? 'border-accent-cyan/40 bg-accent-cyan/5'
                                            : 'border-white/10 bg-white/5'
                                    }`}
                                >
                                    <p className="text-white mb-1">{summary.label}</p>
                                    <p className="text-text-muted break-all">
                                        {summary.lines.join(' · ')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        {endpointStats.map((endpoint) => {
                            const endpointSamples = endpointHistory[endpoint.id] ?? [];
                            const slaSummary = endpointSlaSummaries[endpoint.id];
                            const endpointChangeSummary = endpointChangeSummaryMap[endpoint.id];

                            return (
                                <div key={endpoint.id} className="rounded-lg bg-[#0e1420] border border-border-subtle p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-display font-semibold">{endpoint.label}</p>
                                        <span className={`text-xs font-mono ${endpoint.isAvailable === true ? 'text-accent-lime' : endpoint.isAvailable === false ? 'text-accent-magenta' : 'text-text-muted'}`}>
                                            {endpoint.isAvailable === true ? 'up' : endpoint.isAvailable === false ? 'down' : 'pending'}
                                        </span>
                                    </div>
                                    <div className="mt-2 space-y-1 text-xs text-text-muted font-mono">
                                        <p className="truncate">{endpoint.url}</p>
                                        <p>last checked: {endpoint.lastCheckedAt ? formatDate(endpoint.lastCheckedAt) : 'N/A'}</p>
                                        <p>last success: {endpoint.lastSuccessAt ? formatDate(endpoint.lastSuccessAt) : 'never'}</p>
                                        <p>latency: {formatDuration(endpoint.latencyMs)} · status: {endpoint.statusCode ?? 'n/a'}</p>
                                        {endpoint.error && <p className="text-accent-magenta">{endpoint.error}</p>}
                                    </div>
                                    {endpoint.id !== 'changelog-feed' && (
                                        <div className="mt-3 pt-3 border-t border-white/10">
                                            <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                                                <span>
                                                    history (last {endpointSamples.length}/{MAX_ENDPOINT_HISTORY})
                                                </span>
                                                <span>
                                                    uptime: {endpointHistoryUptime(endpointSamples) ?? 'n/a'}%
                                                </span>
                                            </div>
                                            <div className="mt-2 grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider text-text-muted">availability</p>
                                                    <svg
                                                        aria-label={`${endpoint.label} availability sparkline`}
                                                        className="w-full mt-1"
                                                        viewBox="0 0 140 32"
                                                        role="img"
                                                    >
                                                        <line x1="0" y1="16" x2="140" y2="16" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
                                                        <polyline
                                                            points={buildSparklinePath(endpointSamples, {
                                                                width: 140,
                                                                height: 32,
                                                                mode: 'availability',
                                                            })}
                                                            fill="none"
                                                            className="stroke-accent-lime"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                        {buildSparklineDots(endpointSamples, { width: 140, height: 32 }).map(
                                                            ({ x, y, isAvailable }) => (
                                                                <circle
                                                                    key={`${endpoint.id}-${x}-${y}`}
                                                                    cx={x}
                                                                    cy={y}
                                                                    r="1.8"
                                                                    className={isAvailable ? 'fill-accent-lime' : 'fill-accent-magenta'}
                                                                />
                                                            )
                                                        )}
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider text-text-muted">
                                                        latency avg: {formatDuration(endpointAverageLatency(endpointSamples))}
                                                    </p>
                                                    <svg
                                                        aria-label={`${endpoint.label} latency sparkline`}
                                                        className="w-full mt-1"
                                                        viewBox="0 0 140 32"
                                                        role="img"
                                                    >
                                                        <line x1="0" y1="28" x2="140" y2="28" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
                                                        <polyline
                                                            points={buildSparklinePath(endpointSamples, {
                                                                width: 140,
                                                                height: 32,
                                                                mode: 'latency',
                                                            })}
                                                            fill="none"
                                                            className="stroke-accent-cyan"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-white/10">
                                                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                                                    <p>
                                                        SLA uptime: {formatPercent(slaSummary?.availabilityPercent)} · samples: {slaSummary?.sampleCount ?? 0}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleExportEndpointTrend(endpoint, endpointSamples)}
                                                        className="text-[10px] font-mono text-accent-cyan hover:text-accent-lime"
                                                    >
                                                        Export this trend
                                                    </button>
                                                </div>
                                                <p className="mt-1 text-[10px] text-text-muted font-mono">
                                                    p50/p95/p99:
                                                    {' '}
                                                    {formatDuration(slaSummary?.latencyPercentiles.p50)},
                                                    {' '}
                                                    {formatDuration(slaSummary?.latencyPercentiles.p95)},
                                                    {' '}
                                                    {formatDuration(slaSummary?.latencyPercentiles.p99)}
                                                </p>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-white/10">
                                                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                                                    delta since last check
                                                </p>
                                                <p className="text-xs text-text-muted font-mono">
                                                    {endpointChangeSummary ? endpointChangeSummary.lines.join(' · ') : 'Awaiting a previous check'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>

            <section className="mt-8">
                <section className="glass-panel rounded-xl p-6 border border-glass-border">
                    <h2 className="text-lg font-display font-semibold mb-4">Content Counts</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {contentCounts.map(({ label, value }) => (
                            <div key={label} className="rounded-lg bg-[#0e1420] border border-border-subtle p-4">
                                <p className="text-text-muted text-xs uppercase tracking-wider font-mono">{label}</p>
                                <p className="mt-2 text-3xl font-display font-bold text-white">{loadingReleases && label === 'changelog entries' ? '...' : value}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </section>

            <section className="mt-8 space-y-4">
                {dependencySections.map(({ label, title, items, tone }) => (
                    <details key={label} className="glass-panel rounded-xl border border-glass-border overflow-hidden">
                        <summary className="cursor-pointer list-none px-6 py-4 bg-[#111724] border-b border-glass-border flex items-center justify-between">
                            <span className="font-display text-sm font-semibold">
                                {title}
                            </span>
                            <span className={`text-xs font-mono ${tone}`}>count: {items.length}</span>
                        </summary>
                        <div className="px-6 py-5">
                                    {items.length === 0 ? (
                                <p className="text-text-muted text-sm font-mono">No entries found.</p>
                            ) : (
                                <div className="space-y-2">
                                            {items.map((name) => (
                                                <div key={`${label}-${name}`} className="flex items-center justify-between gap-3 text-sm font-mono">
                                            <span className="text-text-muted">{name}</span>
                                                    <span className="text-white/50 text-[11px] px-2 py-1 rounded border border-white/10 border-dashed">
                                                        present
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </details>
                ))}
            </section>
        </div>
    );
}

