export type SearchIndexItem = {
    title: string;
    description: string;
    tags: string[];
    tagsText: string;
    headings: string[];
    headingsText: string;
    bodyText: string;
    searchText: string;
    defaultPreview: string;
};

export type SearchResult<T extends SearchIndexItem> = T & {
    searchScore: number;
    searchPreview: string;
};

type SearchFilterArgs<T extends SearchIndexItem> = {
    items: readonly T[];
    searchQuery: string;
    activeTag: string;
    defaultPreviewLength?: number;
};

const DEFAULT_PREVIEW_LENGTH = 220;
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const HEADING_PATTERN = /^\s*(#{1,6})\s+(.*)$/gm;
const WHITESPACE_PATTERN = /\s+/g;

const normalizeSearchText = (value: string): string => value.toLowerCase().trim().replace(WHITESPACE_PATTERN, ' ');

const splitSearchTokens = (value: string): string[] => normalizeSearchText(value).split(' ').filter(Boolean);

const trimToWordBoundary = (value: string, maxLength: number): string => {
    const safeLength = Math.max(maxLength, 40);
    if (value.length <= safeLength) {
        return value;
    }

    const cutoff = value.slice(0, safeLength + 1);
    const lastBoundary = cutoff.lastIndexOf(' ');
    if (lastBoundary <= 0) {
        return `${value.slice(0, safeLength).trimEnd()}…`;
    }

    return `${cutoff.slice(0, lastBoundary).trimEnd()}…`;
};

const countSubstringOccurrences = (haystack: string, needle: string): number => {
    if (!haystack || !needle) {
        return 0;
    }

    let total = 0;
    let position = haystack.indexOf(needle);
    while (position >= 0) {
        total += 1;
        position = haystack.indexOf(needle, position + needle.length);
    }

    return total;
};

const scoreTokenInText = (haystack: string, token: string, exactMatchScore: number, partialScore: number, repeatScore: number): number => {
    if (!token) {
        return 0;
    }
    if (haystack === token) {
        return exactMatchScore;
    }
    if (!haystack.includes(token)) {
        return 0;
    }

    const matches = countSubstringOccurrences(haystack, token);
    return partialScore + Math.max(matches - 1, 0) * repeatScore;
};

const scoreSearchMatch = (item: SearchIndexItem, query: string, tokens: string[]): number => {
    if (!query) {
        return 0;
    }

    let score = 0;
    const normalizedTitle = normalizeSearchText(item.title);
    const normalizedDescription = normalizeSearchText(item.description);
    const normalizedHeadings = normalizeSearchText(item.headingsText);
    const normalizedBody = normalizeSearchText(item.bodyText);
    const normalizedTags = item.tags.map(normalizeSearchText);
    const normalizedTagText = normalizeSearchText(item.tagsText);

    if (item.searchText.includes(query)) {
        score += 160;
    }

    for (const token of tokens) {
        if (!token) {
            continue;
        }

        score += scoreTokenInText(normalizedTitle, token, 140, 80, 10);
        score += scoreTokenInText(normalizedDescription, token, 70, 35, 4);
        score += scoreTokenInText(normalizedHeadings, token, 110, 50, 8);
        score += countSubstringOccurrences(normalizedBody, token) * 15;

        if (normalizedTags.some(tag => tag === token)) {
            score += 120;
            continue;
        }

        if (normalizedTagText.includes(token)) {
            score += 45;
        }
    }

    return score;
};

const findBestMatch = (bodyText: string, tokens: string[]): { index: number; token: string; radius: number } | null => {
    const sortedTokens = [...tokens].sort((left, right) => right.length - left.length);
    for (const token of sortedTokens) {
        const index = bodyText.indexOf(token);
        if (index >= 0) {
            return {
                index,
                token,
                radius: Math.max(Math.floor((DEFAULT_PREVIEW_LENGTH - token.length) / 2), 60),
            };
        }
    }

    return null;
};

export const extractMarkdownHeadings = (markdown: string): string[] => {
    const headings: string[] = [];
    for (const match of markdown.matchAll(HEADING_PATTERN)) {
        const headingLevel = match[1]?.length ?? 0;
        const headingText = match[2]?.trim();
        if (headingLevel > 1 && headingText) {
            headings.push(headingText);
        }
    }

    return headings;
};

export const markdownToSearchText = (markdown: string): string => {
    if (!markdown) {
        return '';
    }

    return markdown
        .replace(CODE_BLOCK_PATTERN, ' ')
        .replace(/!\[[^\]]*]\([^)]+\)/g, '')
        .replace(/\[([^\]]+)]\((?:[^)]+)\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^\s{0,3}>\s?/gm, '')
        .replace(/^\s{0,3}[-*+]\s+/gm, '')
        .replace(/^\s{0,3}\d+\.\s+/gm, '')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/[.*_,`~]/g, '')
        .replace(/[|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const buildSearchText = (entry: {
    title: string;
    description: string;
    tagsText: string;
    headingsText: string;
    bodyText: string;
}): string => normalizeSearchText([
    entry.title,
    entry.description,
    entry.tagsText,
    entry.headingsText,
    entry.bodyText,
].join(' '));

export const buildSearchPreview = (
    bodyText: string,
    query: string,
    options?: {
        headings?: string[];
        fallback?: string;
        maxLength?: number;
    }
): string => {
    const maxLength = options?.maxLength ?? DEFAULT_PREVIEW_LENGTH;
    const trimmedBody = bodyText.trim().replace(WHITESPACE_PATTERN, ' ');
    const fallback = options?.fallback ?? '';

    if (!trimmedBody) {
        return fallback;
    }

    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
        return trimToWordBoundary(trimmedBody, maxLength);
    }

    const tokens = splitSearchTokens(normalizedQuery);
    const lowerBody = trimmedBody.toLowerCase();
    const match = findBestMatch(lowerBody, tokens);

    if (match) {
        const prefix = match.index > 0;
        const radius = match.radius;
        const start = Math.max(0, match.index - radius);
        const end = Math.min(trimmedBody.length, match.index + match.token.length + radius);
        const snippet = trimmedBody.slice(start, end);
        const suffix = end < trimmedBody.length;
        const compactSnippet = trimToWordBoundary(snippet, maxLength - (prefix ? 1 : 0) - (suffix ? 1 : 0));

        return `${prefix ? '…' : ''}${compactSnippet}${suffix ? '…' : ''}`;
    }

    if (options?.headings?.length) {
        const normalizedHeadings = options.headings.map((heading) => normalizeSearchText(heading));
        const matchedHeading = normalizedHeadings.find(heading => heading.includes(tokens[0] ?? ''));
        if (matchedHeading) {
            return `Heading: ${options.headings[normalizedHeadings.indexOf(matchedHeading)]}. ${trimToWordBoundary(trimmedBody, Math.max(maxLength - 10, 40))}`;
        }
    }

    return trimToWordBoundary(trimmedBody, maxLength);
};

export const filterSearchIndex = <T extends SearchIndexItem>(args: SearchFilterArgs<T>): SearchResult<T>[] => {
    const { items, searchQuery, activeTag, defaultPreviewLength } = args;
    const trimmedTag = activeTag.trim().toLowerCase();
    const normalizedQuery = normalizeSearchText(searchQuery);
    const tokens = splitSearchTokens(normalizedQuery);
    const results: Array<SearchResult<T> & { originalOrder: number }> = [];

    const filteredItems = items
        .map((item, originalOrder) => ({ item, originalOrder }))
        .filter(({ item }) => {
            if (trimmedTag === 'all') {
                return true;
            }

            return item.tags.some(tag => normalizeSearchText(tag) === trimmedTag);
        });

    if (tokens.length === 0) {
        return filteredItems.map(({ item }) => ({
            ...item,
            searchScore: 0,
            searchPreview: item.defaultPreview,
        }));
    }

    for (const { item, originalOrder } of filteredItems) {
        const searchScore = scoreSearchMatch(item, normalizedQuery, tokens);
        if (searchScore <= 0) {
            continue;
        }

        results.push({
            ...item,
            originalOrder,
            searchScore,
            searchPreview: buildSearchPreview(item.bodyText, searchQuery, {
                headings: item.headings,
                fallback: item.defaultPreview,
                maxLength: defaultPreviewLength ?? DEFAULT_PREVIEW_LENGTH,
            }),
        });
    }

    return results
        .sort((left, right) => {
            if (left.searchScore !== right.searchScore) {
                return right.searchScore - left.searchScore;
            }
            return left.originalOrder - right.originalOrder;
        });
};

