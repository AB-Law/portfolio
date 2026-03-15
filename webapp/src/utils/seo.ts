import { BLOG_POSTS } from '@/data/blogPosts';
import type { BlogPost } from '@/data/blogPosts';

export const SITE_NAME = 'Akshay // Portfolio';
const SOCIAL_ARTICLE_IMAGE_PATH = '/social/articles';

const DEFAULT_DESCRIPTION = 'Production-minded engineering notes, project writeups, and architecture updates.';
const DEFAULT_OG_IMAGE = '/favicon.svg';
const NOT_FOUND_DESCRIPTION = 'This page does not exist or the requested resource is no longer available.';
const DEFAULT_CANONICAL_BASE = 'https://localhost';
let hasLoggedCanonicalBaseWarning = false;

type SeoMetaType = 'website' | 'article';

export interface BasePageMeta {
    title: string;
    description: string;
    canonicalPath: string;
    type: SeoMetaType;
    image?: string;
    robots?: 'index, follow' | 'noindex, nofollow';
}

export interface WebsitePageMeta extends BasePageMeta {
    type: 'website';
}

export interface ArticlePageMeta extends BasePageMeta {
    type: 'article';
    publishedTime?: string;
    section?: string;
    tags?: string[];
}

export type PageMeta = WebsitePageMeta | ArticlePageMeta;

const STATIC_PAGE_META: Record<string, WebsitePageMeta> = {
    '/': {
        title: 'Home',
        description: 'Akshay // Portfolio homepage showcasing software engineering work.',
        canonicalPath: '/',
        type: 'website',
    },
    '/projects': {
        title: 'Projects',
        description: 'A log of shipped work, tooling, and case studies across frontend, backend, and cloud engineering.',
        canonicalPath: '/projects',
        type: 'website',
    },
    '/blog': {
        title: 'Blog',
        description: 'A technical log of implementation notes, debugging postmortems, and architecture learnings.',
        canonicalPath: '/blog',
        type: 'website',
    },
    '/status': {
        title: 'Status',
        description: 'Live deployment status and runtime diagnostics for the portfolio.',
        canonicalPath: '/status',
        type: 'website',
    },
    '/changelog': {
        title: 'Changelog',
        description: 'A chronological feed of notable platform and engineering updates.',
        canonicalPath: '/changelog',
        type: 'website',
    },
    '/about': {
        title: 'About',
        description: 'Professional background, interests, and technical focus from a production-first engineer.',
        canonicalPath: '/about',
        type: 'website',
    },
    '/404': {
        title: 'Page Not Found',
        description: NOT_FOUND_DESCRIPTION,
        canonicalPath: '/404',
        type: 'website',
        robots: 'noindex, nofollow',
    },
};

const normalizePathname = (pathname: string): string => {
    if (!pathname) {
        return '/';
    }
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
};

const getConfiguredSiteUrl = (): string | undefined => {
    if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
        return import.meta.env.VITE_SITE_URL;
    }
    return undefined;
};

const warnMissingConfiguredSiteUrl = () => {
    if (hasLoggedCanonicalBaseWarning) {
        return;
    }

    if (typeof import.meta === 'undefined' || typeof import.meta.env === 'undefined') {
        return;
    }

    if (import.meta.env.PROD && !import.meta.env.VITE_SITE_URL) {
        hasLoggedCanonicalBaseWarning = true;
        if (typeof console !== 'undefined') {
            console.warn('[seo] VITE_SITE_URL is not configured. Canonical URLs will fallback to the current origin.');
        }
    }
};

const isAbsoluteUrl = (value: string): boolean => /^(https?:)?\/\//i.test(value) || value.startsWith('data:');

const resolvePostImage = (post?: BlogPost): string | undefined => {
    if (!post || !post.image) {
        return undefined;
    }

    return typeof post.image === 'string' ? post.image : post.image.src;
};

const getArticleSocialImage = (slug: string): string =>
    `${SOCIAL_ARTICLE_IMAGE_PATH}/${slug}.svg`;

const getStaticFallbackMeta = (): WebsitePageMeta => ({
    title: 'Page Not Found',
    description: NOT_FOUND_DESCRIPTION,
    canonicalPath: '/404',
    type: 'website',
    robots: 'noindex, nofollow',
});

export const getPageMetadata = (pathname: string): PageMeta => {
    const normalizedPath = normalizePathname(pathname);

    if (normalizedPath.startsWith('/blog/')) {
        const slug = decodeURIComponent(normalizedPath.substring('/blog/'.length));
        const article = BLOG_POSTS.find(item => item.id === slug);

        if (article) {
            return {
                title: article.title,
                description: article.description || DEFAULT_DESCRIPTION,
                canonicalPath: `/blog/${article.id}`,
                type: 'article',
                image: resolvePostImage(article) || getArticleSocialImage(article.id),
                publishedTime: article.date,
                section: 'Blog',
                tags: article.tags,
            };
        }

        return getStaticFallbackMeta();
    }

    return STATIC_PAGE_META[normalizedPath] ?? getStaticFallbackMeta();
};

export const getCanonicalUrl = (pathname: string): string => {
    const configuredBase = getConfiguredSiteUrl();
    if (!configuredBase) {
        warnMissingConfiguredSiteUrl();
    }

    const base = configuredBase || (typeof window !== 'undefined' ? window.location.origin : DEFAULT_CANONICAL_BASE);
    const cleanBase = base.replace(/\/+$/, '');
    const cleanPath = normalizePathname(pathname);

    return `${cleanBase}${cleanPath}`;
};

export const getAbsoluteUrl = (pathValue?: string): string => {
    const source = pathValue ?? DEFAULT_OG_IMAGE;
    if (isAbsoluteUrl(source)) {
        return source;
    }

    return getCanonicalUrl(source);
};

export const getDocumentTitle = (metadata: PageMeta): string => `${metadata.title} | ${SITE_NAME}`;

export const getDefaultMetaDescription = (): string => DEFAULT_DESCRIPTION;
