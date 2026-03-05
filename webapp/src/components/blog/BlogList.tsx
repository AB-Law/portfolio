import { Link } from 'react-router-dom';
import type { BlogPost } from '../../data/blogPosts';

interface BlogListProps {
    posts: BlogPost[];
    totalCount: number;
}

export function BlogList({ posts, totalCount }: BlogListProps) {
    return (
        <div className="glass-panel rounded-xl overflow-hidden w-full shadow-glow ring-1 ring-white/5 mx-auto">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border-subtle bg-white/[0.02]">
                <div className="col-span-2 font-mono text-xs text-text-muted tracking-wider uppercase">Date</div>
                <div className="col-span-5 md:col-span-6 font-mono text-xs text-text-muted tracking-wider uppercase">Commit Message</div>
                <div className="col-span-3 md:col-span-3 font-mono text-xs text-text-muted tracking-wider uppercase text-right md:text-left">Tags</div>
                <div className="col-span-2 md:col-span-1 font-mono text-xs text-text-muted tracking-wider uppercase text-right">Time</div>
            </div>

            {/* List Body */}
            <div className="flex flex-col">
                {posts.map((post, index) => (
                    <Link
                        key={post.id}
                        to={`/blog/${post.id}`}
                        className={`group grid grid-cols-12 gap-4 px-6 py-5 border-b border-border-subtle hover:bg-white/[0.03] transition-all duration-200 items-center relative git-line ${index === posts.length - 1 ? 'last-item' : ''}`}
                    >
                        <div className="absolute left-[-10px] top-0 bottom-0 w-4 hidden xl:block">
                            <div className="h-full w-[2px] bg-[#232936] absolute left-1/2"></div>
                        </div>
                        <div className="col-span-12 md:col-span-2 flex items-center gap-3">
                            <div className="git-node shrink-0 hidden md:block"></div>
                            <span className="font-mono text-sm text-text-muted group-hover:text-accent-cyan transition-colors">{post.date}</span>
                        </div>
                        <div className="col-span-12 md:col-span-6 relative">
                            <div className="hidden md:block absolute -left-6 top-1/2 w-4 border-t border-dashed border-text-muted/30"></div>
                            <h3 className="font-display text-lg font-medium text-text-primary group-hover:text-white group-hover:translate-x-1 transition-all duration-300">
                                {post.title}
                            </h3>
                            <p className="font-mono text-xs text-text-muted mt-1 opacity-60 line-clamp-1">{post.description}</p>
                        </div>
                        <div className="col-span-6 md:col-span-3 flex justify-end md:justify-start gap-2 flex-wrap">
                            {post.tags.map(tag => (
                                <span key={tag} className="font-mono text-[10px] text-accent-magenta bg-accent-magenta/5 px-2 py-0.5 rounded border border-accent-magenta/20 whitespace-nowrap">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <div className="col-span-6 md:col-span-1 flex items-center justify-end gap-3">
                            <span className="font-mono text-xs text-text-muted">{post.readTime}</span>
                            <span className="font-mono text-accent-cyan opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">-&gt;</span>
                        </div>
                    </Link>
                ))}

                {posts.length === 0 && (
                    <div className="p-10 text-center text-text-muted font-mono text-sm">
                        [ERROR] No logs found matching search criteria.
                    </div>
                )}
            </div>

            {/* Table Footer / Pagination */}
            <div className="px-6 py-4 bg-white/[0.02] border-t border-border-subtle flex justify-between items-center">
                <span className="font-mono text-xs text-text-muted">
                    Showing {posts.length > 0 ? '1' : '0'}-{posts.length} of {totalCount} logs
                </span>
                <div className="flex gap-2">
                    <button className="px-3 py-1 rounded border border-border-subtle bg-transparent text-text-muted text-xs font-mono hover:text-white hover:border-white/30 disabled:opacity-50" disabled>
                        &lt; Prev
                    </button>
                    <button className="px-3 py-1 rounded border border-border-subtle bg-transparent text-text-muted text-xs font-mono hover:text-white hover:border-white/30 disabled:opacity-50" disabled>
                        Next &gt;
                    </button>
                </div>
            </div>
        </div>
    );
}
