import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { BlogPost } from '../../data/blogPosts';

const BLOG_GRID_PAGE_SIZE = 5;

type SearchAwareBlogPost = BlogPost & {
    searchPreview: string;
};

interface BlogGridProps {
    posts: SearchAwareBlogPost[];
    totalCount: number;
}

export function BlogGrid({ posts, totalCount }: BlogGridProps) {
    const [visibleCount, setVisibleCount] = useState<number>(Math.min(BLOG_GRID_PAGE_SIZE, posts.length));
    useEffect(() => {
        setVisibleCount(Math.min(BLOG_GRID_PAGE_SIZE, posts.length));
    }, [posts]);

    const visiblePosts = posts.slice(0, visibleCount);
    const hasMorePosts = visiblePosts.length < posts.length;

    const loadMorePosts = () => {
        setVisibleCount((previous) => Math.min(previous + BLOG_GRID_PAGE_SIZE, posts.length));
    };

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-text-muted font-mono opacity-50">
                <span className="material-symbols-outlined text-4xl mb-4">search_off</span>
                <p>No matching logs found in system.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-12 w-full max-w-[800px] mx-auto">
            {visiblePosts.map((post) => {
                const imageSource = typeof post.image === 'string' ? post.image : post.image?.src;
                const imageAlt = typeof post.image === 'string' ? post.title : post.image?.alt || post.title;
                const imageWidth = typeof post.image === 'string' ? undefined : post.image?.width;
                const imageHeight = typeof post.image === 'string' ? undefined : post.image?.height;

                return (
                    <article key={post.id} className="group relative flex flex-col gap-5">
                        <div className="absolute -inset-4 bg-glass-panel rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 border border-border-subtle shadow-2xl shadow-black/50"></div>
                        {imageSource && (
                            <Link to={`/blog/${post.id}`} className="relative w-full aspect-[21/9] overflow-hidden rounded-lg border border-border-subtle group-hover:border-accent-cyan/30 transition-colors duration-300 block">
                                <img
                                    alt={imageAlt}
                                    className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700 ease-elastic scale-100 group-hover:scale-105"
                                    src={imageSource}
                                    width={imageWidth}
                                    height={imageHeight}
                                    loading="lazy"
                                    decoding="async"
                                />
                                <div className="absolute bottom-3 right-3 bg-bg-void/90 backdrop-blur border border-accent-cyan/30 text-accent-cyan px-2 py-1 rounded text-xs font-mono">
                                    <span className="material-symbols-outlined text-[10px] align-middle mr-1">schedule</span>
                                    {post.readTime}
                                </div>
                            </Link>
                        )}
                        <div className="flex flex-col gap-3 px-2">
                        <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="text-text-muted">{post.date}</span>
                            <span className="text-border-subtle">|</span>
                            {post.tags.map(tag => (
                                <span key={tag} className="text-accent-magenta">#{tag}</span>
                            ))}
                        </div>
                        <Link to={`/blog/${post.id}`}>
                            <h3 className="text-2xl md:text-3xl font-display font-bold text-white group-hover:text-accent-cyan transition-colors duration-300">
                                {post.title}
                            </h3>
                        </Link>
                        <p className="text-text-muted text-base leading-relaxed line-clamp-4">
                            {post.searchPreview || post.description}
                        </p>
                        <div className="pt-2">
                            <Link to={`/blog/${post.id}`} className="glass-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-medium text-text-primary group-hover:border-accent-lime/50 w-fit">
                                <span>Read Function</span>
                                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </Link>
                        </div>
                    </div>
                    </article>
                );
            })}

            {/* Pagination / Footer */}
            <div className="flex flex-col items-center gap-8 pt-8 pb-16">
                <span className="font-mono text-xs text-text-muted">
                    Showing {visiblePosts.length} of {totalCount} logs
                </span>
                {hasMorePosts && (
                    <button
                        type="button"
                        onClick={loadMorePosts}
                        className="group flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border-subtle text-text-muted text-sm font-mono hover:text-white hover:border-accent-cyan/50 hover:bg-accent-cyan/5 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px] group-hover:animate-spin">refresh</span>
                        LOAD_MORE_ASSETS()
                    </button>
                )}
            </div>
        </div>
    );
}
