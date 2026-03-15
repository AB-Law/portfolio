import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildCommandPaletteItems, getRouteSuggestionItems, type CommandPaletteItem } from '../utils/commandSuggestions';

const QUICK_LINK_PATHS = new Set(['/','/blog','/projects','/about']);

type NotFoundState = {
    from?: string;
    commandPaletteItems?: CommandPaletteItem[];
};

const NotFound = () => {
    const location = useLocation();
    const state = (location.state as NotFoundState | null) ?? null;
    const from = state?.from ?? location.pathname;
    const fallbackCommandPaletteItems = useMemo(() => buildCommandPaletteItems(), []);
    const commandPaletteItems = state?.commandPaletteItems?.length
        ? state.commandPaletteItems
        : fallbackCommandPaletteItems;

    const closestMatches = useMemo(() => getRouteSuggestionItems(from, commandPaletteItems, {
        limit: 3,
        minScore: 60,
    }).filter((item) => !QUICK_LINK_PATHS.has(item.path)), [from, commandPaletteItems]);

    return (
        <div className="flex-grow w-full max-w-4xl mx-auto px-4 md:px-6 py-16">
            <div className="text-center">
                <p className="text-accent-lime text-sm font-mono mb-4">system.error:404</p>
                <h1 className="text-6xl md:text-8xl font-display font-black text-white mb-6">404</h1>
                <p className="text-text-muted text-lg mb-2">
                    The requested path
                    <span className="font-mono text-white mx-2">`{from}`</span>
                    could not be located.
                </p>
                <p className="text-text-muted text-sm mb-10">
                    It may have moved or the link might be outdated. Browse the available options below.
                </p>
                <div className="inline-flex flex-wrap gap-3 justify-center">
                    <Link to="/" className="inline-flex items-center gap-2 px-5 py-2 rounded border border-accent-cyan/30 text-text-primary hover:border-accent-cyan hover:text-white font-mono">
                        <span aria-hidden="true" className="material-symbols-outlined text-sm">home</span>
                        /home
                    </Link>
                    <Link to="/blog" className="inline-flex items-center gap-2 px-5 py-2 rounded border border-border-subtle text-text-primary hover:border-accent-magenta hover:text-white font-mono">
                        <span aria-hidden="true" className="material-symbols-outlined text-sm">terminal</span>
                        /blog
                    </Link>
                    <Link to="/projects" className="inline-flex items-center gap-2 px-5 py-2 rounded border border-border-subtle text-text-primary hover:border-accent-cyan hover:text-white font-mono">
                        <span aria-hidden="true" className="material-symbols-outlined text-sm">folder_open</span>
                        /projects
                    </Link>
                    <Link to="/about" className="inline-flex items-center gap-2 px-5 py-2 rounded border border-border-subtle text-text-primary hover:border-accent-magenta hover:text-white font-mono">
                        <span aria-hidden="true" className="material-symbols-outlined text-sm">person</span>
                        /about
                    </Link>
                </div>
                {closestMatches.length > 0 ? (
                    <div className="mt-10">
                        <p className="text-xs font-mono text-text-muted mb-4">Did you mean one of these?</p>
                        <div className="inline-flex flex-wrap gap-3 justify-center">
                            {closestMatches.map((item) => (
                                <Link
                                    key={item.id}
                                    to={item.path}
                                    aria-label={item.path}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded border border-accent-magenta/40 text-text-primary hover:border-accent-magenta hover:text-white font-mono text-sm"
                                >
                                    <span aria-hidden="true" className="material-symbols-outlined text-sm">search</span>
                                    {item.path}
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default NotFound;
