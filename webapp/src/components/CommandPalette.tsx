import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { getRouteSuggestionItems, type CommandPaletteItem } from '../utils/commandSuggestions';

interface CommandPaletteProps {
    isOpen: boolean;
    items: CommandPaletteItem[];
    onClose: () => void;
    onSelect: (path: string) => void;
}

const MAX_RESULTS = 12;
const QUICK_JUMP_LIMIT = 5;
const MIN_SEARCH_SCORE = 35;

type PaletteTypeFilter = CommandPaletteItem['type'] | undefined;
type PaletteSectionFilter = string | undefined;

type ParsedPaletteQuery = {
    searchText: string;
    sectionFilter: PaletteSectionFilter;
    typeFilter: PaletteTypeFilter;
};

const normalizeValue = (value: string): string => value.toLowerCase().trim().replace(/\s+/g, ' ');
const normalizeRouteSegment = (value: string): string => value.toLowerCase().trim().replace(/^\/+|\/+$/g, '');

const getItemSection = (path: string): string => {
    const normalizedPath = normalizeRouteSegment(path);
    if (!normalizedPath) {
        return 'home';
    }

    const [section] = normalizedPath.split('/');
    return section || 'home';
};

const resolveTypeFilter = (value: string): PaletteTypeFilter => {
    const normalized = normalizeValue(value);

    if (['page', 'pages', 'route', 'routes'].includes(normalized)) {
        return 'Page';
    }

    if (['blog', 'blogs', 'post', 'posts', 'article', 'articles'].includes(normalized)) {
        return 'Blog post';
    }

    if (['recent', 'recents', 'history', 'visit', 'visits'].includes(normalized)) {
        return 'Recent';
    }

    return undefined;
};

const resolveSectionFilter = (value: string): PaletteSectionFilter => {
    const normalized = normalizeRouteSegment(value);
    if (!normalized) {
        return undefined;
    }

    return normalized;
};

const parsePaletteQuery = (query: string): ParsedPaletteQuery => {
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    const searchableTokens: string[] = [];

    let typeFilter: PaletteTypeFilter = undefined;
    let sectionFilter: PaletteSectionFilter = undefined;

    tokens.forEach((token, index) => {
        const typeMatch = /^type:(.+)$/i.exec(token);
        if (typeMatch) {
            const candidateType = resolveTypeFilter(typeMatch[1]);
            if (candidateType) {
                typeFilter = candidateType;
                return;
            }
        }

        const sectionMatch = /^section:(.+)$/i.exec(token);
        if (sectionMatch) {
            const candidateSection = resolveSectionFilter(sectionMatch[1]);
            if (candidateSection) {
                sectionFilter = candidateSection;
                return;
            }
        }

        const directType = resolveTypeFilter(token);
        if (directType && index === 0 && tokens.length > 1) {
            typeFilter = directType;
            return;
        }

        searchableTokens.push(token);
    });

    return {
        searchText: searchableTokens.join(' ').trim(),
        sectionFilter,
        typeFilter,
    };
};

const filterByRouteSection = (items: CommandPaletteItem[], sectionFilter: PaletteSectionFilter): CommandPaletteItem[] => {
    if (!sectionFilter) {
        return items;
    }

    return items.filter((item) => {
        const section = getItemSection(item.path);
        return section.includes(sectionFilter) || sectionFilter.includes(section);
    });
};

export default function CommandPalette({ isOpen, items, onClose, onSelect }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const parsedQuery = useMemo(() => parsePaletteQuery(query), [query]);
    const sectionedItems = useMemo(
        () => filterByRouteSection(items, parsedQuery.sectionFilter),
        [items, parsedQuery.sectionFilter]
    );
    const filteredItems = useMemo(() => {
        if (!parsedQuery.typeFilter) {
            return sectionedItems;
        }

        return sectionedItems.filter((item) => item.type === parsedQuery.typeFilter);
    }, [parsedQuery.typeFilter, sectionedItems]);

    const hasSearchText = parsedQuery.searchText.length >= 2;
    const rankedItems = useMemo(() => {
        if (!hasSearchText) {
            return filteredItems;
        }

        return getRouteSuggestionItems(parsedQuery.searchText, filteredItems, {
            limit: MAX_RESULTS,
            minScore: MIN_SEARCH_SCORE,
        });
    }, [filteredItems, hasSearchText, parsedQuery.searchText]);
    const visibleItems = useMemo(() => {
        if (hasSearchText) {
            return rankedItems;
        }

        return filteredItems.slice(0, MAX_RESULTS);
    }, [hasSearchText, rankedItems, filteredItems]);
    const isSearching = parsedQuery.searchText.length > 0;

    const safeActiveIndex = visibleItems.length === 0 ? 0 : Math.min(activeIndex, visibleItems.length - 1);
    const recentQuickJumpItems = useMemo(() => {
        if (isSearching) {
            return [];
        }

        return visibleItems
            .filter((item) => item.type === 'Recent')
            .slice(0, QUICK_JUMP_LIMIT);
    }, [isSearching, visibleItems]);
    const recentShortcutById = useMemo(() => {
        const next = new Map<string, number>();
        recentQuickJumpItems.forEach((item, index) => {
            next.set(item.id, index + 1);
        });
        return next;
    }, [recentQuickJumpItems]);

    const handleQuickJump = (shortcutIndex: number) => {
        const item = recentQuickJumpItems[shortcutIndex];
        if (!item) {
            return;
        }

        handleSelect(item.path);
    };

    useEffect(() => {
        requestAnimationFrame(() => inputRef.current?.focus());
    }, []);

    const handleClose = () => onClose();
    const handleSelect = (path: string) => onSelect(path);

    const moveDown = () => {
        if (visibleItems.length === 0) {
            return;
        }
        setActiveIndex((safeActiveIndex + 1) % visibleItems.length);
    };

    const moveUp = () => {
        if (visibleItems.length === 0) {
            return;
        }
        setActiveIndex((safeActiveIndex - 1 + visibleItems.length) % visibleItems.length);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (visibleItems.length === 0 && event.key !== 'Escape') {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
            }
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveDown();
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveUp();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            handleClose();
            return;
        }

        if (!isSearching && event.key >= '1' && event.key <= String(QUICK_JUMP_LIMIT)) {
            const shortcutIndex = Number(event.key) - 1;
            if (shortcutIndex >= 0 && shortcutIndex < recentQuickJumpItems.length) {
                event.preventDefault();
                handleQuickJump(shortcutIndex);
                return;
            }
        }

        if (event.key === 'Enter' && visibleItems.length > 0) {
            event.preventDefault();
            handleSelect(visibleItems[safeActiveIndex].path);
        }
    };

    if (!isOpen) {
        return null;
    }

    const activeResultId = visibleItems.length > 0 ? `result-${safeActiveIndex}-${visibleItems[safeActiveIndex]?.id}` : undefined;
    const getResultId = (index: number, itemId: string) => `result-${index}-${itemId}`;

    return (
        <div
            className="command-palette-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    handleClose();
                }
            }}
        >
            <section
                className="command-palette-shell"
                role="dialog"
                aria-modal="true"
                aria-labelledby="command-palette-title"
                onKeyDown={handleKeyDown}
            >
                <div className="command-palette-header">
                    <div className="command-palette-title-wrap">
                        <span className="material-symbols-outlined text-lg text-accent-cyan">terminal</span>
                        <h2 id="command-palette-title" className="text-sm font-mono text-text-primary">
                            Command Palette
                        </h2>
                    {recentQuickJumpItems.length > 0 ? (
                        <span className="text-[10px] font-mono text-text-muted">
                            {`Quick jump: ${Math.min(QUICK_JUMP_LIMIT, recentQuickJumpItems.length)} recents`}
                        </span>
                    ) : null}
                    </div>
                    <button
                        type="button"
                        className="command-palette-close font-mono text-xs"
                        onClick={handleClose}
                        aria-label="Close command palette"
                    >
                        ESC
                    </button>
                </div>

                <div className="command-palette-search">
                    <label htmlFor="command-palette-input" className="sr-only">
                        Search pages and posts
                    </label>
                    <input
                        id="command-palette-input"
                        role="combobox"
                        ref={inputRef}
                        className="command-palette-input"
                        aria-expanded={visibleItems.length > 0}
                        aria-haspopup="listbox"
                        aria-controls="command-palette-results"
                        aria-autocomplete="list"
                        aria-activedescendant={activeResultId}
                        placeholder="Search pages, blog posts, or sections..."
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        aria-label="Search pages and posts"
                    />
                </div>

                <div id="command-palette-results" className="command-palette-list" role="listbox" aria-label="Navigation results">
                    {visibleItems.length > 0 ? visibleItems.map((item, index) => {
                        const shortcut = recentShortcutById.get(item.id);
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`command-palette-option ${index === safeActiveIndex ? 'is-active' : ''}`}
                                role="option"
                                id={getResultId(index, item.id)}
                                aria-selected={index === safeActiveIndex}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => handleSelect(item.path)}
                                aria-label={`Go to ${item.label}`}
                            >
                                <span className={`command-palette-shortcut ${shortcut == null ? 'command-palette-shortcut-spacer' : ''}`}>
                                    {shortcut ?? ''}
                                </span>
                                <span className="command-palette-option-type">{item.type}</span>
                                <span className="command-palette-option-label font-mono text-base">{item.label}</span>
                                <span className="command-palette-option-meta text-text-muted text-xs">{item.description}</span>
                            </button>
                        );
                    }) : (
                        <p className="command-palette-empty font-mono text-sm text-text-muted">
                            No command matches.
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}
