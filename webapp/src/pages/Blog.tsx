import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BlogGrid } from '../components/blog/BlogGrid';
import { BlogList } from '../components/blog/BlogList';
import { BLOG_SEARCH_INDEX } from '../data/blogSearchIndex';
import { getTagFromQuery, getValidViewMode } from '../utils/filtering';
import { filterSearchIndex } from '../utils/contentSearch';

type BlogViewMode = 'grid' | 'list';

export default function Blog() {
    const [searchParams, setSearchParams] = useSearchParams();
    const sortedPosts = useMemo(() => {
        return [...BLOG_SEARCH_INDEX].sort((a, b) => {
            const first = new Date(a.date).getTime();
            const second = new Date(b.date).getTime();
            return (second || 0) - (first || 0);
        });
    }, []);
    const availableTags = useMemo(() => {
        const tagSet = new Set<string>();
        sortedPosts.forEach(post => post.tags.forEach(tag => tagSet.add(tag)));
        return ['All', ...Array.from(tagSet).sort()];
    }, [sortedPosts]);

    const viewMode = getValidViewMode(searchParams.get('view'));
    const searchQuery = searchParams.get('search') ?? '';
    const activeTag = getTagFromQuery(searchParams.get('tag'), availableTags);

    const updateSearchState = ({
        nextSearch = searchQuery,
        nextTag = activeTag,
        nextViewMode = viewMode,
    }: {
        nextSearch?: string;
        nextTag?: string;
        nextViewMode?: BlogViewMode;
    }) => {
        const nextParams = new URLSearchParams(searchParams);
        const trimmedSearch = nextSearch.trim();

        if (trimmedSearch) {
            nextParams.set('search', trimmedSearch);
        } else {
            nextParams.delete('search');
        }

        if (nextTag !== 'All') {
            nextParams.set('tag', nextTag);
        } else {
            nextParams.delete('tag');
        }

        if (nextViewMode === 'grid') {
            nextParams.set('view', 'grid');
        } else {
            nextParams.delete('view');
        }

        if (nextParams.toString() !== searchParams.toString()) {
            setSearchParams(nextParams, { replace: true });
        }
    };

    const filteredPosts = useMemo(() => {
        return filterSearchIndex({
            items: sortedPosts,
            searchQuery,
            activeTag
        });
    }, [searchQuery, activeTag, sortedPosts]);

    return (
        <div className="flex-grow w-full px-4 md:px-6 py-12 max-w-7xl mx-auto flex flex-col relative">
            {/* Background Ambient Glow */}
            <div className="fixed top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[128px] pointer-events-none -z-10"></div>
            <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-accent-magenta/5 rounded-full blur-[128px] pointer-events-none -z-10"></div>

            {/* Page Header */}
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-subtle pb-6 w-full max-w-[800px] mx-auto md:w-[1280px] md:max-w-none">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-accent-lime text-xs font-mono tracking-wider uppercase">
                        <span className="animate-pulse">●</span> System Log
                    </div>
                    <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-white mb-2">commit_log</h2>
                    <p className="text-text-muted text-sm font-mono max-w-xl">
            // observations on code, design, and system architecture
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <label htmlFor="blog-tag-filter" className="sr-only">
                        Filter blog posts by tag
                    </label>
                    <select
                        id="blog-tag-filter"
                        className="w-full md:w-auto bg-[#161b22] text-sm border border-border-subtle text-text-muted focus:border-accent-cyan focus:outline-none rounded-lg px-3 py-2 min-w-[180px] capitalize"
                        value={activeTag}
                        onChange={(event) => updateSearchState({ nextTag: event.target.value })}
                        aria-label="Filter posts by tag"
                    >
                        {availableTags.map(tag => (
                            <option key={tag} value={tag} className="capitalize">
                                {tag === 'All' ? 'All Tags' : tag}
                            </option>
                        ))}
                    </select>

                    <div className="flex w-full md:w-auto glass-panel rounded-lg items-center px-3 py-2 gap-2 min-w-[260px]">
                        <span className="material-symbols-outlined text-text-muted text-lg">search</span>
                        <label htmlFor="blog-post-search" className="sr-only">
                            Search posts
                        </label>
                        <input
                            id="blog-post-search"
                            className="bg-transparent border-none text-sm font-mono text-white placeholder-text-muted/50 focus:ring-0 w-full p-0"
                            placeholder="grep 'search_query'..."
                            type="text"
                            aria-label="Search blog posts"
                            value={searchQuery}
                            onChange={(event) => updateSearchState({ nextSearch: event.target.value })}
                        />
                        <span className="font-mono text-xs text-text-muted border border-border-subtle px-1.5 py-0.5 rounded bg-white/5">⌘K</span>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-1 bg-[#161b22] p-1 rounded-lg border border-border-subtle shrink-0">
                        <button
                            onClick={() => updateSearchState({ nextViewMode: 'grid' })}
                            aria-label="Grid View"
                            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-border-subtle text-white shadow-sm' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">grid_view</span>
                        </button>
                        <button
                            onClick={() => updateSearchState({ nextViewMode: 'list' })}
                            aria-label="List View"
                            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-border-subtle text-white shadow-sm' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">list</span>
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'grid'
                ? <BlogGrid posts={filteredPosts} totalCount={filteredPosts.length} />
                : <BlogList posts={filteredPosts} totalCount={filteredPosts.length} />
            }
        </div>
    );
}
