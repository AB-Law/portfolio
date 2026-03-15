import type { CommandPaletteItem } from './commandSuggestions';

const RECENT_NAVIGATION_STORAGE_KEY = 'portfolio:recent-navigation-v1';
const MAX_STORED_RECENT_PATHS = 12;

type StoredVisit = {
    path: string;
    visitedAt: number;
};

const normalizePath = (path: string): string => {
    if (!path) {
        return '/';
    }

    const normalized = path.split('?')[0].split('#')[0];
    const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
    const trimmed = withLeadingSlash.replace(/\/+$/g, '');
    return trimmed || '/';
};

const isStoredVisit = (value: unknown): value is StoredVisit =>
    typeof value === 'object'
    && value !== null
    && 'path' in value
    && typeof (value as { path: unknown }).path === 'string'
    && 'visitedAt' in value
    && typeof (value as { visitedAt: unknown }).visitedAt === 'number'
    && Number.isFinite((value as { visitedAt: unknown }).visitedAt);

const readStoredVisits = (): StoredVisit[] => {
    if (typeof window === 'undefined') {
        return [];
    }

    const rawValue = localStorage.getItem(RECENT_NAVIGATION_STORAGE_KEY);
    if (!rawValue) {
        return [];
    }

    try {
        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter(isStoredVisit)
            .map((entry) => ({ path: normalizePath(entry.path), visitedAt: entry.visitedAt }))
            .sort((left, right) => right.visitedAt - left.visitedAt);
    } catch {
        return [];
    }
};

const writeStoredVisits = (visits: StoredVisit[]): void => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(RECENT_NAVIGATION_STORAGE_KEY, JSON.stringify(visits));
    } catch {
        // Ignore storage write failures (private mode, quota issues, etc).
    }
};

const deduplicateAndSortVisits = (visits: StoredVisit[]): StoredVisit[] => {
    const seen = new Set<string>();
    const deduped: StoredVisit[] = [];

    for (const visit of visits) {
        if (seen.has(visit.path)) {
            continue;
        }

        seen.add(visit.path);
        deduped.push(visit);
    }

    return deduped.sort((left, right) => right.visitedAt - left.visitedAt);
};

const buildItemLookup = (items: readonly CommandPaletteItem[]): Map<string, CommandPaletteItem> => {
    const lookup = new Map<string, CommandPaletteItem>();
    for (const item of items) {
        lookup.set(normalizePath(item.path), item);
    }

    return lookup;
};

export const MAX_RECENT_VISITS_DISPLAY = 6;

export const persistNavigationVisit = (path: string, commandItems: readonly CommandPaletteItem[]): void => {
    if (typeof window === 'undefined') {
        return;
    }

    const normalizedPath = normalizePath(path);
    const lookup = buildItemLookup(commandItems);
    if (!lookup.has(normalizedPath)) {
        return;
    }

    const next = [
        { path: normalizedPath, visitedAt: Date.now() },
        ...readStoredVisits(),
    ];
    const uniqueSorted = deduplicateAndSortVisits(next).slice(0, MAX_STORED_RECENT_PATHS);
    writeStoredVisits(uniqueSorted);
};

export const getRecentNavigationItems = (
    commandItems: readonly CommandPaletteItem[],
    options: {
        excludePath?: string;
        maxItems?: number;
    } = {},
): CommandPaletteItem[] => {
    const excludePath = options.excludePath ? normalizePath(options.excludePath) : undefined;
    const maxItems = options.maxItems ?? MAX_RECENT_VISITS_DISPLAY;
    const history = readStoredVisits();
    const lookup = buildItemLookup(commandItems);

    return history
        .filter((visit) => visit.path !== excludePath)
        .map((visit) => ({
            visit,
            item: lookup.get(visit.path),
        }))
        .filter((entry): entry is { visit: StoredVisit; item: CommandPaletteItem } => !!entry.item)
        .slice(0, maxItems)
        .map(({ visit, item }) => ({
            ...item,
            id: `recent-${visit.path}-${visit.visitedAt}`,
            type: 'Recent',
            description: `Quick jump: ${item.description}`,
        }));
};
