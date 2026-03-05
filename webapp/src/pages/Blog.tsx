import { useState, useMemo } from 'react';
import { BlogGrid } from '../components/blog/BlogGrid';
import { BlogList } from '../components/blog/BlogList';
import { BLOG_POSTS } from '../data/blogPosts';

export default function Blog() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredPosts = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return BLOG_POSTS.filter(post =>
            post.title.toLowerCase().includes(query) ||
            post.description.toLowerCase().includes(query) ||
            post.tags.some(tag => tag.toLowerCase().includes(query))
        );
    }, [searchQuery]);

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
                    <div className="hidden lg:flex w-full md:w-auto glass-panel rounded-lg items-center px-3 py-2 gap-2 min-w-[300px]">
                        <span className="material-symbols-outlined text-text-muted text-lg">search</span>
                        <input
                            className="bg-transparent border-none text-sm font-mono text-white placeholder-text-muted/50 focus:ring-0 w-full p-0"
                            placeholder="grep 'search_query'..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <span className="font-mono text-xs text-text-muted border border-border-subtle px-1.5 py-0.5 rounded bg-white/5">⌘K</span>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-1 bg-[#161b22] p-1 rounded-lg border border-border-subtle shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            aria-label="Grid View"
                            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-border-subtle text-white shadow-sm' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">grid_view</span>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            aria-label="List View"
                            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-border-subtle text-white shadow-sm' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">list</span>
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'grid'
                ? <BlogGrid posts={filteredPosts} totalCount={BLOG_POSTS.length} />
                : <BlogList posts={filteredPosts} totalCount={BLOG_POSTS.length} />
            }
        </div>
    );
}
