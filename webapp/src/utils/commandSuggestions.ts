import { BLOG_POSTS } from '../data/blogPosts';

export type CommandPaletteItem = {
    id: string;
    label: string;
    path: string;
    type: 'Page' | 'Blog post' | 'Recent';
    description: string;
};

type RouteSuggestion = {
    path?: string;
    label: string;
    description: string;
};

const COMMAND_ROUTE_ITEMS: RouteSuggestion[] = [
    { path: '/', label: 'Home', description: 'Landing page for the terminal portfolio' },
    { path: '/projects', label: 'Projects', description: 'Explore shipped work and experiments' },
    { path: '/blog', label: 'Blog', description: 'Browse technical posts and notes' },
    { path: '/status', label: 'System Status', description: 'Check deployment and runtime state' },
    { path: '/changelog', label: 'Changelog', description: 'Recent releases and platform updates' },
    { path: '/about', label: 'About', description: 'Identity, experience, and contact context' },
];

export const buildCommandPaletteItems = (): CommandPaletteItem[] => {
    return [
        ...COMMAND_ROUTE_ITEMS.map((item) => ({
            id: `page-${item.path}`,
            label: item.label,
            path: item.path,
            type: 'Page' as const,
            description: item.description,
        })),
            ...BLOG_POSTS
            .slice()
            .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
            .map((post) => ({
                id: `post-${post.id}`,
                label: post.title,
                path: `/blog/${post.id}`,
                type: 'Blog post' as const,
                description: post.description,
            })),
    ];
};

const normalizeValue = (value: string): string => value.toLowerCase().trim().replace(/\s+/g, ' ');
const normalizeRouteValue = (value: string): string => normalizeValue(value).replace(/^\/+|\/+$/g, '');
const splitRouteTerms = (value: string): string[] => normalizeRouteValue(value).split(/[^a-z0-9]+/g).filter(Boolean);

const levenshtein = (leftValue: string, rightValue: string): number => {
    const left = leftValue;
    const right = rightValue;

    if (left.length === 0) return right.length;
    if (right.length === 0) return left.length;
    if (left === right) return 0;

    const matrix: number[][] = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1));
    for (let row = 0; row <= left.length; row += 1) {
        matrix[row][0] = row;
    }
    for (let col = 0; col <= right.length; col += 1) {
        matrix[0][col] = col;
    }

    for (let row = 1; row <= left.length; row += 1) {
        const leftChar = left[row - 1];
        for (let col = 1; col <= right.length; col += 1) {
            const rightChar = right[col - 1];
            const insertion = matrix[row][col - 1] + 1;
            const deletion = matrix[row - 1][col] + 1;
            const replacement = matrix[row - 1][col - 1] + (leftChar === rightChar ? 0 : 1);

            matrix[row][col] = Math.min(insertion, deletion, replacement);
        }
    }

    return matrix[left.length][right.length];
};

const getItemDistance = (queryTerms: string[], candidateTerms: string[], fallbackPath: string): number => {
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const queryTerm of queryTerms) {
        for (const candidateTerm of candidateTerms) {
            const termDistance = levenshtein(queryTerm, candidateTerm);
            if (termDistance < bestDistance) {
                bestDistance = termDistance;
            }
            if (termDistance <= 1) {
                break;
            }
        }

        if (bestDistance <= 1) {
            break;
        }
    }

    const pathDistance = levenshtein(queryTerms.join(' '), fallbackPath);
    return Math.min(bestDistance, pathDistance);
};

const getSuggestionScore = (query: string, item: CommandPaletteItem): number => {
    const normalizedQuery = normalizeRouteValue(query);
    const queryTerms = splitRouteTerms(normalizedQuery);
    if (normalizedQuery.length < 2 || queryTerms.length === 0) {
        return 0;
    }

    const normalizedPath = normalizeRouteValue(item.path);
    const normalizedPathForScore = normalizedPath || item.label.toLowerCase();
    const pathContainsQuery = normalizedPath ? normalizedQuery.includes(normalizedPath) || normalizedPath.includes(normalizedQuery) : false;

    const candidateTerms = [
        ...new Set([
            ...splitRouteTerms(item.path),
            ...splitRouteTerms(item.label),
            ...splitRouteTerms(item.description),
            normalizeRouteValue(item.path),
            normalizeValue(item.label),
            normalizeValue(item.description),
            normalizedPathForScore,
        ]),
    ].filter(Boolean);

    let score = 0;

    if (normalizedPath && normalizedQuery === normalizedPath) {
        score += 210;
    } else if (normalizedQuery.startsWith(`${normalizedPath}/`) && normalizedPath.length > 0) {
        score += 160;
    } else if (`${normalizedPath}/`.startsWith(`${normalizedQuery}/`) && normalizedQuery.length > 0 && normalizedPath.length > 0) {
        score += 130;
    }

    if (item.label.toLowerCase().includes(normalizedQuery)) {
        score += 80;
    }
    if (item.description.toLowerCase().includes(normalizedQuery)) {
        score += 30;
    }
    if (pathContainsQuery) {
        score += 45;
    }

    for (const queryTerm of queryTerms) {
        for (const candidateTerm of candidateTerms) {
            if (queryTerm === candidateTerm) {
                score += 34;
                break;
            }
            if (queryTerm.includes(candidateTerm) || candidateTerm.includes(queryTerm)) {
                score += 16;
                break;
            }
        }
    }

    const distance = getItemDistance(queryTerms, candidateTerms, normalizedPathForScore);
    if (distance <= 1) {
        score += 95;
    } else if (distance <= 2) {
        score += 60;
    } else if (distance <= 3) {
        score += 34;
    } else if (distance <= 4) {
        score += 18;
    } else if (distance <= 5) {
        score += 6;
    }

    return score;
};

export const getRouteSuggestionItems = (
    query: string,
    candidates: readonly CommandPaletteItem[],
    options: {
        limit?: number;
        minScore?: number;
    } = {}
): CommandPaletteItem[] => {
    const maxResults = options.limit ?? 4;
    const minScore = options.minScore ?? 50;

    return [...candidates]
        .map((item) => ({ item, score: getSuggestionScore(query, item) }))
        .filter(({ score }) => score >= minScore)
        .sort((left, right) => {
            if (left.score !== right.score) {
                return right.score - left.score;
            }
            return left.item.path.localeCompare(right.item.path);
        })
        .slice(0, maxResults)
        .map(({ item }) => item);
};
