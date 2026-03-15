import { useEffect } from 'react';
import {
    getAbsoluteUrl,
    getCanonicalUrl,
    getDocumentTitle,
    type PageMeta,
    SITE_NAME,
    type ArticlePageMeta,
} from '../../utils/seo';

type JsonLdDescriptor = Record<string, unknown>;

type MetaDescriptor = {
    name?: string;
    property?: string;
    value: string;
};

const isArticleMeta = (metadata: PageMeta): metadata is ArticlePageMeta => metadata.type === 'article';

const updateTag = (name: string, value: string) => {
    const selector = `meta[name="${name}"]`;
    const existing = document.querySelector<HTMLMetaElement>(selector);

    if (existing) {
        existing.setAttribute('content', value);
        return;
    }

    const tag = document.createElement('meta');
    tag.setAttribute('name', name);
    tag.setAttribute('content', value);
    document.head.appendChild(tag);
};

const updateProperty = (property: string, value: string) => {
    const selector = `meta[property="${property}"]`;
    const existing = document.querySelector<HTMLMetaElement>(selector);

    if (existing) {
        existing.setAttribute('content', value);
        return;
    }

    const tag = document.createElement('meta');
    tag.setAttribute('property', property);
    tag.setAttribute('content', value);
    document.head.appendChild(tag);
};

const appendProperty = (property: string, value: string) => {
    const tag = document.createElement('meta');
    tag.setAttribute('property', property);
    tag.setAttribute('content', value);
    document.head.appendChild(tag);
};

const setOrAppendProperty = (property: string, value: string, append = false) => {
    if (append) {
        appendProperty(property, value);
        return;
    }

    updateProperty(property, value);
};

const removeBySelector = (selector: string) => {
    document.querySelectorAll(selector).forEach(node => node.remove());
};

const setTags = (tags: readonly MetaDescriptor[]) => {
    tags.forEach(({ name, property, value }) => {
        if (name) {
            updateTag(name, value);
        } else if (property) {
            updateProperty(property, value);
        }
    });
};

const setJsonLd = (payload: JsonLdDescriptor | JsonLdDescriptor[]) => {
    const selector = 'script[type="application/ld+json"][data-route-jsonld="true"]';
    const payloadText = JSON.stringify(payload, null, 2);
    const existing = document.querySelector<HTMLScriptElement>(selector);

    if (existing) {
        existing.text = payloadText;
        return;
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-route-jsonld', 'true');
    script.text = payloadText;
    document.head.appendChild(script);
};

const updateLink = (selector: string, attributes: Record<string, string>) => {
    const existing = document.querySelector<HTMLLinkElement>(selector);
    const link = existing || document.createElement('link');

    Object.entries(attributes).forEach(([name, value]) => {
        link.setAttribute(name, value);
    });

    if (!link.isConnected) {
        document.head.appendChild(link);
    }
};

const buildImageObject = (imageUrl: string): JsonLdDescriptor => ({
    '@type': 'ImageObject',
    url: imageUrl,
});

const buildBaseOrganization = (): JsonLdDescriptor => ({
    '@type': 'Organization',
    name: SITE_NAME,
    url: getCanonicalUrl('/'),
    logo: buildImageObject(getAbsoluteUrl('/favicon.svg')),
});

const buildArticleJsonLd = (metadata: ArticlePageMeta, canonicalUrl: string, imageUrl: string): JsonLdDescriptor => ({
    '@context': 'https://schema.org',
    '@type': ['Article', 'BlogPosting'],
    headline: metadata.title,
    description: metadata.description,
    datePublished: metadata.publishedTime,
    dateModified: metadata.publishedTime,
    author: {
        '@type': 'Person',
        name: 'Akshay',
        url: getCanonicalUrl('/about'),
    },
    publisher: buildBaseOrganization(),
    mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl,
    },
    image: [buildImageObject(imageUrl)],
    articleSection: metadata.section || 'Blog',
    keywords: metadata.tags?.join(', '),
    url: canonicalUrl,
});

const buildWebPageJsonLd = (metadata: PageMeta, canonicalUrl: string, imageUrl: string): JsonLdDescriptor => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: metadata.title,
    description: metadata.description,
    url: canonicalUrl,
    inLanguage: 'en-US',
    isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: getCanonicalUrl('/'),
    },
    primaryImageOfPage: buildImageObject(imageUrl),
    publisher: buildBaseOrganization(),
});

const resolveJsonLd = (metadata: PageMeta, canonicalUrl: string, imageUrl: string): JsonLdDescriptor | JsonLdDescriptor[] => {
    if (isArticleMeta(metadata)) {
        return buildArticleJsonLd(metadata, canonicalUrl, imageUrl);
    }

    return buildWebPageJsonLd(metadata, canonicalUrl, imageUrl);
};

export const RouteMetadata = ({ metadata }: { metadata: PageMeta }) => {
    useEffect(() => {
        const canonical = getCanonicalUrl(metadata.canonicalPath);
        const image = getAbsoluteUrl(metadata.image);
        const jsonLd = resolveJsonLd(metadata, canonical, image);
        const feedUrl = getAbsoluteUrl('/rss.xml');
        const sitemapUrl = getAbsoluteUrl('/sitemap.xml');

        document.title = getDocumentTitle(metadata);
        setTags([
            { name: 'description', value: metadata.description },
            { name: 'robots', value: metadata.robots ?? 'index, follow' },
            { name: 'twitter:title', value: metadata.title },
            { name: 'twitter:description', value: metadata.description },
            { name: 'twitter:image', value: image },
            { name: 'twitter:image:alt', value: `${metadata.title} - ${SITE_NAME}` },
            { name: 'twitter:card', value: metadata.image ? 'summary_large_image' : 'summary' },
            { property: 'og:title', value: metadata.title },
            { property: 'og:description', value: metadata.description },
            { property: 'og:type', value: metadata.type },
            { property: 'og:url', value: canonical },
            { property: 'og:site_name', value: SITE_NAME },
            { property: 'og:image', value: image },
            { property: 'og:image:alt', value: `${metadata.title} - ${SITE_NAME}` },
        ]);
        setJsonLd(jsonLd);

        if (!isArticleMeta(metadata)) {
            removeBySelector('meta[property="article:published_time"]');
            removeBySelector('meta[property="article:section"]');
            removeBySelector('meta[property="article:tag"]');
        } else {
            if (metadata.publishedTime != null) {
                setOrAppendProperty('article:published_time', metadata.publishedTime);
            } else {
                removeBySelector('meta[property="article:published_time"]');
            }
            if (metadata.section) {
                setOrAppendProperty('article:section', metadata.section);
            } else {
                removeBySelector('meta[property="article:section"]');
            }
            removeBySelector('meta[property="article:tag"]');
            metadata.tags?.forEach((tag) => {
                setOrAppendProperty('article:tag', tag, true);
            });
        }

        updateLink('link[rel="alternate"][type="application/rss+xml"]', {
            rel: 'alternate',
            type: 'application/rss+xml',
            title: `${SITE_NAME} RSS Feed`,
            href: feedUrl,
        });

        updateLink('link[rel="sitemap"]', {
            rel: 'sitemap',
            type: 'application/xml',
            href: sitemapUrl,
        });

        const canonicalTag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]') || document.createElement('link');
        canonicalTag.setAttribute('rel', 'canonical');
        canonicalTag.setAttribute('href', canonical);
        if (!canonicalTag.isConnected) {
            document.head.appendChild(canonicalTag);
        }
    }, [metadata]);

    return null;
};
