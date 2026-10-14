import { useEffect, useMemo, useState } from 'react';
import { BLOG_POSTS } from '../data/blogPosts';
import { MARKDOWN_IMAGE_ASSETS } from '../data/markdownImageAssets';
import { getLatestChangelogDate, loadChangelogReleases, type ChangelogRelease } from '../utils/changelog';
import { buildTime, dependencies, deployedBranch, deployedCommit, deployedCommitDate, deployedVersion, devDependencies, packageName, packageVersion } from '../utils/buildMetadata';

type DependencyMap = Record<string, string>;

const CONTENT_BLOG_FILE_COUNT = Object.keys(import.meta.glob('/src/content/blog/*.md')).length;
const MARKDOWN_IMAGE_COUNT = Object.keys(MARKDOWN_IMAGE_ASSETS).length;

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

export default function Status() {
    const [changelogReleases, setChangelogReleases] = useState<ChangelogRelease[]>([]);
    const [loadingReleases, setLoadingReleases] = useState<boolean>(true);
    const [hasLoadError, setHasLoadError] = useState<boolean>(false);

    useEffect(() => {
        let isStale = false;

        loadChangelogReleases()
            .then((releases) => {
                if (!isStale) {
                    setChangelogReleases(releases);
                }
            })
            .catch(() => {
                if (!isStale) {
                    setHasLoadError(true);
                }
            })
            .finally(() => {
                if (!isStale) {
                    setLoadingReleases(false);
                }
            });

        return () => {
            isStale = true;
        };
    }, []);

    const lastUpdated = formatDate(getLatestChangelogDate(changelogReleases) || deployedCommitDate || buildTime);

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

    const contentCounts = [
        { label: 'blog posts', value: String(BLOG_POSTS.length) },
        { label: 'blog markdown files', value: String(CONTENT_BLOG_FILE_COUNT) },
        { label: 'changelog entries', value: loadingReleases ? '...' : String(changelogReleases.length) },
        { label: 'markdown image assets', value: String(MARKDOWN_IMAGE_COUNT) },
    ];

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
                    Build metadata, content counts and dependencies for this deploy.
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
                            <span className="text-text-muted">Build time</span>
                            <span className="text-white">{buildTime === 'N/A' ? 'N/A' : formatDate(buildTime)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-text-muted">Last updated</span>
                            <span className="text-accent-lime">{lastUpdated}</span>
                        </div>
                        {hasLoadError && (
                            <div className="text-text-muted border border-accent-magenta/40 bg-accent-magenta/10 rounded px-2 py-1 text-[11px]">
                                Changelog failed to load; the changelog count and last-updated date may be incomplete.
                            </div>
                        )}
                    </div>
                </section>

                <section className="glass-panel rounded-xl p-6 border border-glass-border">
                    <h2 className="text-lg font-display font-semibold mb-4">Content Counts</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {contentCounts.map(({ label, value }) => (
                            <div key={label} className="rounded-lg bg-[#0e1420] border border-border-subtle p-4">
                                <p className="text-text-muted text-xs uppercase tracking-wider font-mono">{label}</p>
                                <p className="mt-2 text-3xl font-display font-bold text-white">{value}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <section className="mt-8 space-y-4">
                {dependencySections.map(({ label, title, items, tone }) => (
                    <details key={label} className="glass-panel rounded-xl border border-glass-border overflow-hidden">
                        <summary className="cursor-pointer list-none px-6 py-4 bg-[#111724] border-b border-glass-border flex items-center justify-between">
                            <span className="font-display text-sm font-semibold">{title}</span>
                            <span className={`text-xs font-mono ${tone}`}>count: {items.length}</span>
                        </summary>
                        <div className="px-6 py-5">
                            {items.length === 0 ? (
                                <p className="text-text-muted text-sm font-mono">No entries found.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {items.map((name) => (
                                        <li key={`${label}-${name}`} className="flex items-center justify-between gap-3 text-sm font-mono">
                                            <span className="text-text-muted">{name}</span>
                                            <span className="text-white/50 text-[11px]">
                                                {(label === 'runtime' ? dependencies : devDependencies)[name]}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </details>
                ))}
            </section>
        </div>
    );
}
