import { Children, isValidElement, useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy, type ReactNode } from 'react';
import type { Components } from 'react-markdown';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { BLOG_POST_DOCUMENTS, BLOG_POSTS } from '../data/blogPosts';
import { getMarkdownImageAsset } from '../data/markdownImageAssets';
import { extractMarkdownHeadings, markdownToSearchText } from '../utils/contentSearch';

const LazyReactMarkdown = lazy(() => import('react-markdown'));
const Mermaid = lazy(() =>
    import('../components/blog/Mermaid').then((module) => ({ default: module.Mermaid })),
);

const markdownRendererFallback = (
    <div className="my-8 text-xs font-mono text-text-muted border border-border-subtle rounded-lg p-4">Loading renderer...</div>
);
const CODE_BLOCK_PATTERN = /```[^\n\r]*\r?\n([\s\S]*?)(?:\r?\n```)/g;
const FRONT_MATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const ESTIMATED_WORDS_PER_MINUTE = 225;

type TocHeading = {
    id: string;
    text: string;
};

const buildHeadingId = (heading: string): string => {
    const slug = heading
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

    return slug || 'section';
};

const stripHeadingNoise = (value: string): string => {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const extractTextFromChildren = (children: ReactNode): string => {
    const nodes = Children.toArray(children);

    const flattened = nodes
        .map((node) => {
            if (typeof node === 'string' || typeof node === 'number') {
                return String(node);
            }

            if (isValidElement<{ children?: ReactNode }>(node)) {
                return extractTextFromChildren(node.props.children);
            }

            return '';
        })
        .join('');

    return flattened.trim();
};

const estimateReadTimeFromContent = (value: string): number => {
    const withoutFrontMatter = value.replace(FRONT_MATTER_PATTERN, '');
    const searchText = markdownToSearchText(withoutFrontMatter);
    const wordCount = searchText.split(/\s+/).filter(Boolean).length;

    if (wordCount === 0) {
        return 0;
    }

    return Math.max(1, Math.ceil(wordCount / ESTIMATED_WORDS_PER_MINUTE));
};

const extractCodeBlocksFromContent = (value: string): string[] => {
    const captured: string[] = [];
    for (const match of value.matchAll(CODE_BLOCK_PATTERN)) {
        if (typeof match[1] !== 'string') {
            continue;
        }

        const blockText = match[1].trimEnd();
        if (!blockText) {
            continue;
        }

        captured.push(blockText);
    }

    return captured;
};

export default function Article() {
    const { slug } = useParams<{ slug: string }>();
    const location = useLocation();
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
    const [retryCount, setRetryCount] = useState<number>(0);
    const [toolbarMessage, setToolbarMessage] = useState<string>('');
    const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
    const isMounted = useRef<boolean>(true);
    const toolbarMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const headingRenderIndexRef = useRef<number>(0);
    const fallbackHeadingCountsRef = useRef<Map<string, number>>(new Map());
    const allCodeBlocks = useMemo(() => extractCodeBlocksFromContent(content), [content]);

    const sortedBlogPosts = useMemo(() => [...BLOG_POSTS].sort((left, right) => {
        return new Date(right.date).getTime() - new Date(left.date).getTime();
    }), []);

    const postMetadata = useMemo(() => {
        return sortedBlogPosts.find(p => p.id === slug);
    }, [sortedBlogPosts, slug]);
    const postDocument = useMemo(() => {
        if (!slug) {
            return undefined;
        }

        return BLOG_POST_DOCUMENTS.find(post => post.id === slug);
    }, [slug]);
    const hasCachedContent = Boolean(postDocument?.content?.trim());
    const estimatedReadTime = useMemo(() => {
        const minutes = estimateReadTimeFromContent(content);
        return minutes > 0 ? `${minutes} min read` : (postMetadata?.readTime || 'N/A');
    }, [content, postMetadata?.readTime]);

    const fallbackTitle = useMemo(() => {
        return postMetadata?.title || slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Article';
    }, [postMetadata, slug]);

    const fallbackContent = useMemo(() => {
        return `# ${fallbackTitle}\n\n${postMetadata?.description || 'The article content is temporarily unavailable. Please retry to reload it.'}`;
    }, [postMetadata, fallbackTitle]);

    const tableOfContents = useMemo<TocHeading[]>(() => {
        const extractedHeadings = extractMarkdownHeadings(content);
        if (extractedHeadings.length === 0) {
            return [];
        }

        const startAt = stripHeadingNoise(extractedHeadings[0] ?? '') === stripHeadingNoise(fallbackTitle)
            ? 1
            : 0;
        const headingIdCount = new Map<string, number>();

        return extractedHeadings.slice(startAt).map((heading) => {
            const headingId = buildHeadingId(heading);
            const duplicate = (headingIdCount.get(headingId) ?? 0) + 1;
            headingIdCount.set(headingId, duplicate);

            return {
                text: heading,
                id: duplicate === 1 ? headingId : `${headingId}-${duplicate}`,
            };
        });
    }, [content, fallbackTitle]);

    const getHeadingId = useCallback((children: ReactNode): string => {
        const index = headingRenderIndexRef.current;
        headingRenderIndexRef.current += 1;

        const mappedHeading = tableOfContents[index];
        if (mappedHeading?.id) {
            return mappedHeading.id;
        }

        const headingText = extractTextFromChildren(children);
        const baseId = buildHeadingId(headingText);
        const count = (fallbackHeadingCountsRef.current.get(baseId) ?? 0) + 1;
        fallbackHeadingCountsRef.current.set(baseId, count);

        return count === 1 ? baseId : `${baseId}-${count}`;
    }, [tableOfContents]);

    const currentPostIndex = useMemo(() => {
        return sortedBlogPosts.findIndex(post => post.id === slug);
    }, [sortedBlogPosts, slug]);

    const previousPost = useMemo(() => {
        if (currentPostIndex <= 0) {
            return undefined;
        }

        return sortedBlogPosts[currentPostIndex - 1];
    }, [currentPostIndex, sortedBlogPosts]);

    const nextPost = useMemo(() => {
        if (currentPostIndex === -1 || currentPostIndex >= sortedBlogPosts.length - 1) {
            return undefined;
        }

        return sortedBlogPosts[currentPostIndex + 1];
    }, [currentPostIndex, sortedBlogPosts]);

    const articleUrl = useMemo(() => {
        if (typeof window === 'undefined') {
            return '';
        }

        return `${window.location.origin}${location.pathname}${location.search}${location.hash}`;
    }, [location.pathname, location.search, location.hash]);

    const showToolbarMessage = useCallback((message: string) => {
        if (!isMounted.current) {
            return;
        }

        setToolbarMessage(message);

        if (toolbarMessageTimeoutRef.current !== null) {
            clearTimeout(toolbarMessageTimeoutRef.current);
        }

        toolbarMessageTimeoutRef.current = setTimeout(() => {
            if (!isMounted.current) {
                return;
            }

            setToolbarMessage('');
            toolbarMessageTimeoutRef.current = null;
        }, 2500);
    }, []);

    const copyTextToClipboard = useCallback(async (text: string, successMessage: string, failureMessage: string) => {
        if (typeof navigator === 'undefined' || !text.trim()) {
            showToolbarMessage(failureMessage);
            return false;
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.readOnly = true;
                textArea.style.position = 'absolute';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            showToolbarMessage(successMessage);
            return true;
        } catch {
            showToolbarMessage(failureMessage);
            return false;
        }
    }, [showToolbarMessage]);

    const copyArticleLink = useCallback(async () => {
        if (!articleUrl) {
            showToolbarMessage('Unable to copy link right now.');
            return;
        }

        const wasCopied = await copyTextToClipboard(
            articleUrl,
            'Article link copied to clipboard.',
            'Could not copy article link.',
        );

        if (!wasCopied) {
            throw new Error('Could not copy article link.');
        }
    }, [articleUrl, copyTextToClipboard, showToolbarMessage]);

    const copyCodeSnippet = useCallback(async (codeText: string) => {
        await copyTextToClipboard(
            codeText.trim(),
            'Code snippet copied to clipboard.',
            'Could not copy code snippet.',
        );
    }, [copyTextToClipboard]);

    const copyAllCodeBlocks = useCallback(async () => {
        if (allCodeBlocks.length === 0) {
            showToolbarMessage('No code blocks available to copy.');
            return;
        }

        const copyText = allCodeBlocks.join('\n\n');

        await copyTextToClipboard(
            copyText.trim(),
            'All code blocks copied to clipboard.',
            'Could not copy all code blocks.',
        );
    }, [allCodeBlocks, copyTextToClipboard, showToolbarMessage]);

    const handleShareArticle = useCallback(async () => {
        if (typeof navigator === 'undefined') {
            return;
        }

        const shareData = {
            title: fallbackTitle,
            text: postMetadata?.description || `Check out this article: ${fallbackTitle}`,
            url: articleUrl,
        };

        if (!articleUrl) {
            showToolbarMessage('Unable to build share URL.');
            return;
        }

        if (!('share' in navigator)) {
            try {
                await copyArticleLink();
                showToolbarMessage('Web Share is unavailable. Link copied instead.');
            } catch {
                showToolbarMessage('Web Share is unavailable and link copy failed.');
            }
            return;
        }

        try {
            await navigator.share(shareData);
            showToolbarMessage('Shared article successfully.');
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            try {
                await copyArticleLink();
                showToolbarMessage('Share failed, copied article link instead.');
            } catch {
                showToolbarMessage('Unable to share and copy link at this time.');
            }
        }
    }, [articleUrl, fallbackTitle, postMetadata?.description, copyArticleLink, showToolbarMessage]);

    const handleEmailArticle = useCallback(() => {
        if (typeof window === 'undefined' || !articleUrl) {
            showToolbarMessage('Unable to open email composer right now.');
            return;
        }

        const subject = `Interesting read: ${fallbackTitle}`;
        const body = `${fallbackTitle}\n\n${postMetadata?.description ?? ''}\n\n${articleUrl}`;
        const params = new URLSearchParams({
            subject,
            body,
        });

        window.location.href = `mailto:?${params.toString()}`;
        showToolbarMessage('Opening email composer...');
    }, [articleUrl, fallbackTitle, postMetadata?.description, showToolbarMessage]);


    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const setFromNavigator = () => {
            setIsOffline(!window.navigator.onLine);
        };

        setFromNavigator();
        window.addEventListener('online', setFromNavigator);
        window.addEventListener('offline', setFromNavigator);

        return () => {
            window.removeEventListener('online', setFromNavigator);
            window.removeEventListener('offline', setFromNavigator);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (toolbarMessageTimeoutRef.current !== null) {
                clearTimeout(toolbarMessageTimeoutRef.current);
            }
        };
    }, []);

    const fetchArticle = useCallback(async ({ isBackgroundRevalidation = false }: { isBackgroundRevalidation?: boolean } = {}) => {
        if (!slug) {
            return;
        }

        if (!isBackgroundRevalidation) {
            setIsLoading(true);
            setErrorMessage('');
        }

        try {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                throw new Error('You are currently offline. Please reconnect and retry.');
            }

            const response = await fetch(`/content/blog/${slug}.md`);
            if (!response.ok) {
                throw new Error(`Unable to load article content (${response.status} ${response.statusText}).`);
            }

            const text = await response.text();
            if (!isMounted.current) {
                return;
            }

            if (!text.trim()) {
                throw new Error('The article markdown file is empty.');
            }

            setContent(text);
            if (isBackgroundRevalidation) {
                setErrorMessage('');
            }
        } catch (error) {
            if (!isMounted.current) {
                return;
            }

            if (!hasCachedContent && !isBackgroundRevalidation) {
                setContent(fallbackContent);
            }

            if (!isBackgroundRevalidation || !hasCachedContent) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to load article content.');
            }
        } finally {
            if (isMounted.current && !isBackgroundRevalidation) {
                setIsLoading(false);
            }
        }
    }, [slug, fallbackContent, hasCachedContent]);

    useEffect(() => {
        if (!slug || !postMetadata) {
            return;
        }

        if (hasCachedContent && postDocument?.content) {
            setContent(postDocument.content);
            setErrorMessage('');
            setIsLoading(false);
            void fetchArticle({ isBackgroundRevalidation: true });
            return;
        }

        void fetchArticle({ isBackgroundRevalidation: false });
    }, [hasCachedContent, postMetadata, postDocument?.content, slug, fetchArticle]);

    const retryArticleFetch = () => {
        setRetryCount((previous) => previous + 1);
        void fetchArticle();
    };

    const markdownComponents: Components = {
        section: ({ children, className, ...props }) => {
            const sectionClass = typeof className === 'string' && className.includes('footnotes')
                ? `mt-14 pt-8 border-t border-border-subtle text-sm text-text-muted ${className}`
                : className;

            return (
                <section className={sectionClass} {...props}>
                    {children}
                </section>
            );
        },
        a: ({ children, href, className, id, ...props }) => {
            const stringHref = typeof href === 'string' ? href : '';
            const isFootnoteReference = (/^#fnref/i).test(stringHref) || (typeof id === 'string' && /^fnref/i.test(id));
            const isFootnoteTarget = (/^#fn\d/i).test(stringHref) || (typeof id === 'string' && /^fn\d/i.test(id));
            const isFootnoteBacklink = /footnote-backref/.test(className || '') || /fnref\d/i.test(stringHref);

            if (!isFootnoteReference && !isFootnoteTarget && !isFootnoteBacklink) {
                return (
                    <a href={href} className={className} {...props}>
                        {children}
                    </a>
                );
            }

            const citationClass = isFootnoteBacklink
                ? 'text-text-muted no-underline text-[11px] hover:text-accent-cyan'
                : 'text-accent-lime no-underline border-b border-accent-lime/35 align-middle';

            return (
                <a href={href} id={id} className={`${className || ''} ${citationClass}`} {...props}>
                    {children}
                </a>
            );
        },
        sup: ({ children, ...props }) => {
            return (
                <sup className="text-[0.72em] font-mono text-accent-lime" {...props}>
                    {children}
                </sup>
            );
        },
        h2: ({ children, ...props }) => {
            return (
                <h2 id={getHeadingId(children)} className="text-3xl text-white mt-12 mb-6 scroll-mt-24" {...props}>
                    {children}
                </h2>
            );
        },
        h3: ({ children, ...props }) => {
            return (
                <h3 id={getHeadingId(children)} className="text-2xl text-white mt-10 mb-5 scroll-mt-24" {...props}>
                    {children}
                </h3>
            );
        },
        h4: ({ children, ...props }) => {
            return (
                <h4 id={getHeadingId(children)} className="text-xl text-white mt-8 mb-4 scroll-mt-24" {...props}>
                    {children}
                </h4>
            );
        },
        h5: ({ children, ...props }) => {
            return (
                <h5 id={getHeadingId(children)} className="text-lg text-white mt-6 mb-3 scroll-mt-24" {...props}>
                    {children}
                </h5>
            );
        },
        h6: ({ children, ...props }) => {
            return (
                <h6 id={getHeadingId(children)} className="text-base text-white mt-6 mb-2 scroll-mt-24" {...props}>
                    {children}
                </h6>
            );
        },
        img: ({ src, alt, ...props }) => {
            const imageAsset = getMarkdownImageAsset(src);
            return (
                <img
                    src={imageAsset?.src || src}
                    alt={alt ?? imageAsset?.alt ?? ''}
                    width={imageAsset?.width}
                    height={imageAsset?.height}
                    loading="lazy"
                    decoding="async"
                    className="my-8 rounded-lg border border-border-subtle w-full h-auto"
                    {...props}
                />
            );
        },
        pre: ({ children, ...props }) => {
            const childNodes = Children.toArray(children);
            const codeChild = childNodes.find(child => isValidElement(child)) as { props?: { className?: string } } | undefined;
            const childClassName = typeof codeChild?.props?.className === 'string' ? codeChild.props.className : '';
            const isMermaid = childClassName.includes('language-mermaid');
            const codeText = childNodes
                .map((node) => {
                    if (typeof node === 'string' || typeof node === 'number') {
                        return String(node);
                    }

                    if (isValidElement<{ children?: ReactNode }>(node)) {
                        const nodeChildren = node.props.children;

                        if (typeof nodeChildren === 'string' || typeof nodeChildren === 'number') {
                            return String(nodeChildren);
                        }

                        if (Array.isArray(nodeChildren)) {
                            return nodeChildren
                                .map((nestedNode) => {
                                    if (typeof nestedNode === 'string' || typeof nestedNode === 'number') {
                                        return String(nestedNode);
                                    }

                                    if (isValidElement<{ children?: ReactNode }>(nestedNode)) {
                                        const nestedChildren = nestedNode.props.children;
                                        if (typeof nestedChildren === 'string' || typeof nestedChildren === 'number') {
                                            return String(nestedChildren);
                                        }
                                    }

                                    return '';
                                })
                                .join('');
                        }
                    }

                    return '';
                })
                .join('');

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
                        <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded text-text-muted hover:text-white"
                            title="Copy code snippet"
                            aria-label="Copy code snippet"
                            onClick={() => {
                                void copyCodeSnippet(codeText);
                            }}
                        >
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        </button>
                    </div>
                    <div className="p-6 overflow-x-auto text-sm font-mono leading-relaxed bg-[#0d1117]">
                        <pre {...props}>
                            {children}
                        </pre>
                    </div>
                </div>
            );
        },
        code: ({ children, className, ...props }) => {
            const match = /language-(\w+)/.exec(typeof className === 'string' ? className : '');
            const isMermaid = match?.[1] === 'mermaid';
            const code = Children.toArray(children).join('');

            if (isMermaid) {
                return (
                    <Suspense fallback={<div className="my-10 rounded-lg border border-border-subtle p-6 text-sm font-mono text-text-muted">Loading diagram...</div>}>
                        <Mermaid chart={code.replace(/\n$/, '')} />
                    </Suspense>
                );
            }

            return (
                <code className={`${className || ''} text-accent-lime bg-white/5 px-1.5 py-0.5 rounded font-mono`} {...props}>
                    {children}
                </code>
            );
        },
    };

    useEffect(() => {
        if (typeof window === 'undefined' || tableOfContents.length === 0) {
            setActiveHeadingId(null);
            return;
        }

        setActiveHeadingId(tableOfContents[0].id);

        const updateActiveHeading = () => {
            const activationOffset = 140;
            const scrollPosition = window.scrollY + activationOffset;
            let activeId = tableOfContents[0]?.id ?? null;

            for (const heading of tableOfContents) {
                const headingElement = document.getElementById(heading.id);
                if (!headingElement) {
                    continue;
                }

                if (headingElement.offsetTop <= scrollPosition) {
                    activeId = heading.id;
                }
            }

            setActiveHeadingId(activeId);
        };

        updateActiveHeading();
        window.addEventListener('scroll', updateActiveHeading, { passive: true });

        return () => {
            window.removeEventListener('scroll', updateActiveHeading);
        };
    }, [tableOfContents]);

    if (!slug || !postMetadata) {
        return <Navigate to="/404" replace state={{ from: location.pathname }} />;
    }

    if (isLoading) {
        return (
            <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 flex justify-center items-center">
                <div className="font-mono text-xs text-accent-lime animate-pulse">&gt; loading article...</div>
            </div>
        );
    }

    headingRenderIndexRef.current = 0;
    fallbackHeadingCountsRef.current = new Map();

    return (
        <div className="flex flex-col font-display selection:bg-accent-cyan selection:text-void overflow-x-hidden relative flex-grow">
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-accent-magenta/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="fixed top-0 left-0 w-full h-[2px] z-50 bg-gray-800">
                <div className="h-full bg-gradient-to-r from-accent-cyan to-accent-magenta w-[35%] shadow-[0_0_10px_rgba(121,192,255,0.7)]" style={{ width: '35%' }}></div>
            </div>

            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 flex gap-12 relative flex-grow overflow-visible">
                <aside className="hidden lg:block w-64 shrink-0 sticky top-28 h-[calc(100vh-8rem)] overflow-y-auto pr-4 scrollbar-hide">
                    <div className="mb-6">
                        <Link to="/blog" className="inline-flex items-center text-text-muted hover:text-accent-cyan transition-colors text-sm font-mono mb-8 group">
                            <span className="material-symbols-outlined text-[16px] mr-1 group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            ../back_to_log
                        </Link>

                        <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-4 opacity-70">On this page</h3>
                        <nav className="flex flex-col gap-1 border-l border-border-subtle pl-4">
                            {tableOfContents.length === 0 ? (
                                <p className="text-xs font-mono text-text-muted">No section headings found.</p>
                            ) : (
                                tableOfContents.map((heading) => (
                                    <a
                                        key={heading.id}
                                        href={`#${heading.id}`}
                                        aria-current={activeHeadingId === heading.id ? 'true' : undefined}
                                        className={`
                                            text-sm font-mono py-1 -ml-[17px] pl-[15px] border-l-2 transition-all
                                            ${activeHeadingId === heading.id
                                                ? 'text-accent-cyan border-accent-cyan'
                                                : 'text-text-muted border-transparent hover:text-accent-cyan hover:border-accent-cyan/50'
                                            }
                                        `}
                                    >
                                        <span className="opacity-50 mr-2">&gt;</span>
                                        {heading.text}
                                    </a>
                                ))
                            )}
                        </nav>
                    </div>

                    {errorMessage && (
                        <div className="mb-10 border border-accent-magenta/40 bg-accent-magenta/5 rounded-lg p-5">
                            <p className="text-accent-magenta font-mono text-xs uppercase tracking-wider">Failed to load article markdown</p>
                            <p className="text-text-primary mt-2">{errorMessage}</p>
                            <p className="text-text-muted text-sm mt-2">
                                Showing fallback content so reading is still available.
                            </p>
                            {isOffline && <p className="text-text-muted text-sm mt-1">Network is currently offline.</p>}
                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    disabled={isOffline}
                                    onClick={retryArticleFetch}
                                    className="px-4 py-2 rounded border border-accent-cyan text-accent-cyan text-sm font-mono hover:bg-accent-cyan hover:text-bg-void transition-colors"
                                >
                                    {retryCount === 0 ? 'Retry' : `Retry (${retryCount})`}
                                </button>
                                <Link to="/blog" className="px-4 py-2 rounded border border-border-subtle text-text-muted text-sm font-mono hover:text-white hover:border-accent-cyan transition-colors">
                                    Back to Blog
                                </Link>
                            </div>
                        </div>
                    )}

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
                                    <span className="text-xs font-mono text-text-muted">Estimated Read</span>
                                    <span className="text-xs font-mono text-accent-lime">{estimatedReadTime}</span>
                            </div>
                        </div>
                    </div>
                </aside>

                <article className="flex-1 max-w-3xl mx-auto min-w-0 pb-20 w-full overflow-visible">
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

                    <div className="prose prose-invert max-w-none prose-lg prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-p:font-serif prose-p:text-gray-300 prose-p:font-light prose-p:leading-loose prose-a:text-accent-cyan prose-a:no-underline prose-a:border-b prose-a:border-accent-cyan/30 hover:prose-a:border-accent-cyan prose-blockquote:border-l-accent-magenta prose-blockquote:bg-white/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-code:font-mono prose-code:text-accent-lime prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                        <Suspense fallback={markdownRendererFallback}>
                            <LazyReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                components={markdownComponents}
                            >
                                {content}
                            </LazyReactMarkdown>
                        </Suspense>
                    </div>

                    <div className="mt-20 pt-10 border-t border-border-subtle">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div>
                                <span className="text-xs font-mono text-text-muted mb-2 block">Share this execution</span>
                                <div className="flex gap-4">
                                    {allCodeBlocks.length > 0 && (
                                        <button
                                            type="button"
                                            className="text-text-muted hover:text-accent-lime transition-colors"
                                            aria-label="Copy all code blocks"
                                            onClick={() => {
                                                void copyAllCodeBlocks();
                                            }}
                                        >
                                            <span className="material-symbols-outlined">content_copy</span>
                                            <span className="ml-1 font-mono text-sm">Copy all code</span>
                                        </button>
                                    )}
                                <button
                                    type="button"
                                    className="text-text-muted hover:text-white transition-colors"
                                    aria-label="Share article"
                                    onClick={handleShareArticle}
                                >
                                    <span className="material-symbols-outlined">share</span>
                                </button>
                                <button
                                    type="button"
                                    className="text-text-muted hover:text-accent-cyan transition-colors"
                                    aria-label="Email article"
                                    onClick={handleEmailArticle}
                                >
                                    <span className="material-symbols-outlined">alternate_email</span>
                                </button>
                                <button
                                    type="button"
                                    className="text-text-muted hover:text-accent-magenta transition-colors"
                                    aria-label="Copy article link"
                                    onClick={copyArticleLink}
                                >
                                    <span className="material-symbols-outlined">link</span>
                                </button>
                                </div>
                                <p className="text-xs font-mono text-text-muted mt-3" role="status" aria-live="polite">
                                    {toolbarMessage || ''}
                                </p>
                            </div>
                            <div className="flex flex-col gap-4 items-start sm:items-end">
                                {previousPost && (
                                    <Link to={`/blog/${previousPost.id}`} className="group text-left max-w-xs">
                                        <span className="text-xs font-mono text-text-muted mb-1 block group-hover:text-accent-cyan transition-colors">&lt;- Prev in log</span>
                                        <h4 className="text-lg font-display font-bold text-white group-hover:underline decoration-accent-cyan/50 decoration-2 underline-offset-4">
                                            {previousPost.title}
                                        </h4>
                                    </Link>
                                )}

                                {nextPost && (
                                    <Link to={`/blog/${nextPost.id}`} className="group text-right max-w-xs">
                                        <span className="text-xs font-mono text-text-muted mb-1 block group-hover:text-accent-cyan transition-colors">Next in log -&gt;</span>
                                        <h4 className="text-lg font-display font-bold text-white group-hover:underline decoration-accent-cyan/50 decoration-2 underline-offset-4">
                                            {nextPost.title}
                                        </h4>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </div>
    );
}