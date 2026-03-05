import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { BLOG_POSTS } from '../data/blogPosts';
import { Mermaid } from '../components/blog/Mermaid';

export default function Article() {
    const { slug } = useParams<{ slug: string }>();
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    const postMetadata = useMemo(() => {
        return BLOG_POSTS.find(p => p.id === slug);
    }, [slug]);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/content/blog/${slug}.md`);
                if (response.ok) {
                    const text = await response.text();
                    setContent(text);
                } else {
                    setContent(`# Article Not Found\n\nThe requested article could not be loaded.`);
                }
            } catch (error) {
                setContent(`# Error\n\nFailed to load article.`);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchArticle();
        }
    }, [slug]);

    if (loading) {
        return (
            <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 flex justify-center items-center">
                <div className="font-mono text-xs text-accent-lime animate-pulse">&gt; loading article...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col font-display selection:bg-accent-cyan selection:text-void overflow-x-hidden relative flex-grow">
            {/* Background Decorative Elements */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-accent-magenta/5 rounded-full blur-[120px]"></div>
            </div>

            {/* Reading Progress Bar (Simulated) */}
            <div className="fixed top-0 left-0 w-full h-[2px] z-50 bg-gray-800">
                <div className="h-full bg-gradient-to-r from-accent-cyan to-accent-magenta w-[35%] shadow-[0_0_10px_rgba(121,192,255,0.7)]" style={{ width: '35%' }}></div>
            </div>

            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 flex gap-12 relative flex-grow overflow-visible">

                {/* Left Sidebar: Table of Contents (Sticky) */}
                <aside className="hidden lg:block w-64 shrink-0 sticky top-28 h-[calc(100vh-8rem)] overflow-y-auto pr-4 scrollbar-hide">
                    <div className="mb-6">
                        <Link to="/blog" className="inline-flex items-center text-text-muted hover:text-accent-cyan transition-colors text-sm font-mono mb-8 group">
                            <span className="material-symbols-outlined text-[16px] mr-1 group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            ../back_to_log
                        </Link>

                        <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-4 opacity-70">On this page</h3>
                        <nav className="flex flex-col gap-1 border-l border-border-subtle pl-4">
                            <a href="#intro" className="text-sm font-mono text-accent-cyan py-1 -ml-[17px] border-l-2 border-accent-cyan pl-[15px] transition-all">
                                <span className="opacity-50 mr-2">&gt;</span>Introduction
                            </a>
                        </nav>
                    </div>

                    {/* Metadata Card */}
                    <div className="glass-panel p-4 rounded-lg mt-8 border border-border-subtle bg-bg-void/40 backdrop-blur-md">
                        <h4 className="text-xs font-mono uppercase text-text-muted mb-3">Commit Details</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-mono text-text-muted">Author</span>
                                <span className="text-xs font-mono text-white">@Akshay</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-mono text-text-muted">Published</span>
                                <span className="text-xs font-mono text-white">{postMetadata?.date || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-mono text-text-muted">Read Time</span>
                                <span className="text-xs font-mono text-accent-lime">{postMetadata?.readTime || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Article */}
                <article className="flex-1 max-w-3xl mx-auto min-w-0 pb-20 w-full overflow-visible">
                    {/* Article Header */}
                    <header className="mb-12 border-b border-border-subtle pb-10">
                        <div className="flex gap-2 mb-6 flex-wrap">
                            {postMetadata?.tags.map((tag: string) => (
                                <span key={tag} className="px-2 py-1 rounded bg-accent-magenta/10 border border-accent-magenta/30 text-accent-magenta text-xs font-mono">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6 font-display">
                            {postMetadata?.title || slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h1>
                    </header>

                    {/* Markdown Body */}
                    <div className="prose prose-invert max-w-none prose-lg prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-p:font-serif prose-p:text-gray-300 prose-p:font-light prose-p:leading-loose prose-a:text-accent-cyan prose-a:no-underline prose-a:border-b prose-a:border-accent-cyan/30 hover:prose-a:border-accent-cyan prose-blockquote:border-l-accent-magenta prose-blockquote:bg-white/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-code:font-mono prose-code:text-accent-lime prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                                h2: ({ node, ...props }) => <h2 className="text-3xl text-white mt-12 mb-6 scroll-mt-24" {...props} />,
                                pre: ({ node, className, children, ...props }: any) => {
                                    // Check if the child is a code block with language-mermaid
                                    const isMermaid = (children as any)?.props?.className?.includes('language-mermaid');

                                    if (isMermaid) {
                                        return <>{children}</>;
                                    }

                                    return (
                                        <div className="my-10 rounded-lg overflow-hidden border border-border-subtle bg-code-bg shadow-2xl group relative">
                                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0d1117]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                                                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                                                    <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
                                                </div>
                                                <div className="text-xs font-mono text-text-muted absolute left-1/2 -translate-x-1/2">
                                                    code snippet
                                                </div>
                                                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded text-text-muted hover:text-white" title="Copy Code">
                                                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                                </button>
                                            </div>
                                            <div className="p-6 overflow-x-auto text-sm font-mono leading-relaxed bg-[#0d1117]">
                                                <pre className={className} {...props}>
                                                    {children}
                                                </pre>
                                            </div>
                                        </div>
                                    );
                                },
                                code: ({ node, className, children, ...props }: any) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const isMermaid = match?.[1] === 'mermaid';

                                    if (isMermaid) {
                                        return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                                    }

                                    return (
                                        <code className={`${className || ''} text-accent-lime bg-white/5 px-1.5 py-0.5 rounded font-mono`} {...props}>
                                            {children}
                                        </code>
                                    );
                                }
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>

                    {/* Footer / Next Article */}
                    <div className="mt-20 pt-10 border-t border-border-subtle">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div>
                                <span className="text-xs font-mono text-text-muted mb-2 block">Share this execution</span>
                                <div className="flex gap-4">
                                    <button className="text-text-muted hover:text-white transition-colors"><span className="material-symbols-outlined">share</span></button>
                                    <button className="text-text-muted hover:text-accent-cyan transition-colors"><span className="material-symbols-outlined">alternate_email</span></button>
                                    <button className="text-text-muted hover:text-accent-magenta transition-colors"><span className="material-symbols-outlined">link</span></button>
                                </div>
                            </div>
                            <Link to="/blog/react-server-components" className="group text-right max-w-xs">
                                <span className="text-xs font-mono text-text-muted mb-1 block group-hover:text-accent-cyan transition-colors">Next in log -&gt;</span>
                                <h4 className="text-lg font-display font-bold text-white group-hover:underline decoration-accent-cyan/50 decoration-2 underline-offset-4">
                                    Optimizing React Rendering Patterns
                                </h4>
                            </Link>
                        </div>
                    </div>
                </article>
            </div>
        </div>
    );
}
