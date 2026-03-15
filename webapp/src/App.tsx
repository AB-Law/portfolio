import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { type ReactElement, Suspense, lazy, useEffect, useMemo, useState } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CommandPalette from './components/CommandPalette';
import { RouteMetadata } from './components/seo/RouteMetadata';
import { getPageMetadata } from './utils/seo';
import { buildCommandPaletteItems, type CommandPaletteItem } from './utils/commandSuggestions';
import { MAX_RECENT_VISITS_DISPLAY, getRecentNavigationItems, persistNavigationVisit } from './utils/recentNavigation';

const Home = lazy(() => import('./pages/Home'));
const Projects = lazy(() => import('./pages/Projects'));
const Blog = lazy(() => import('./pages/Blog'));
const Article = lazy(() => import('./pages/Article'));
const About = lazy(() => import('./pages/About.tsx'));
const Status = lazy(() => import('./pages/Status.tsx'));
const Changelog = lazy(() => import('./pages/Changelog.tsx'));
const NotFoundPage = lazy(() => import('./pages/NotFound.tsx'));

const RouteFallback = () => (
    <div className="font-mono text-xs text-accent-lime text-center py-20 animate-pulse">Loading route...</div>
);

type ThemeMode = 'terminal' | 'amber';
type AppRoute = {
    path: string;
    element: ReactElement;
    commandLabel: string;
    commandDescription: string;
    includeInCommandPalette?: boolean;
};

const APP_ROUTES: AppRoute[] = [
    { path: '/', element: <Home />, commandLabel: 'Home', commandDescription: 'Landing page for the terminal portfolio' },
    { path: '/projects', element: <Projects />, commandLabel: 'Projects', commandDescription: 'Explore shipped work and experiments' },
    { path: '/blog', element: <Blog />, commandLabel: 'Blog', commandDescription: 'Browse technical posts and notes' },
    { path: '/status', element: <Status />, commandLabel: 'System Status', commandDescription: 'Check deployment and runtime state' },
    { path: '/changelog', element: <Changelog />, commandLabel: 'Changelog', commandDescription: 'Recent releases and platform updates' },
    { path: '/blog/:slug', element: <Article />, commandLabel: 'Article', commandDescription: 'Read a specific blog entry', includeInCommandPalette: false },
    { path: '/about', element: <About />, commandLabel: 'About', commandDescription: 'Identity, experience, and contact context' },
];

const RouteMetadataController = () => {
    const location = useLocation();
    const metadata = useMemo(() => getPageMetadata(location.pathname), [location.pathname]);

    return <RouteMetadata metadata={metadata} />;
};

export function AppRoutes() {
    return (
        <Suspense fallback={<RouteFallback />}>
            <RouteMetadataController />
            <Routes>
                {APP_ROUTES.map(route => (
                    <Route key={route.path} path={route.path} element={route.element} />
                ))}
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Suspense>
    );
}

function AppShell() {
    const navigate = useNavigate();
    const location = useLocation();
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        if (typeof window === 'undefined') {
            return 'terminal';
        }

        const savedTheme = localStorage.getItem('portfolio-theme');
        if (savedTheme === 'terminal' || savedTheme === 'amber') {
            return savedTheme;
        }

        return 'terminal';
    });
    const [isPaletteOpen, setPaletteOpen] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    const baseCommandPaletteItems = useMemo<CommandPaletteItem[]>(() => buildCommandPaletteItems(), []);
    const recentCommandPaletteItems = useMemo(
        () => getRecentNavigationItems(baseCommandPaletteItems, {
            excludePath: location.pathname,
            maxItems: MAX_RECENT_VISITS_DISPLAY,
        }),
        [baseCommandPaletteItems, location.pathname]
    );
    const commandPaletteItems = useMemo<CommandPaletteItem[]>(() => [
        ...recentCommandPaletteItems,
        ...baseCommandPaletteItems.filter((item) => !recentCommandPaletteItems.some((recent) => recent.path === item.path)),
    ], [baseCommandPaletteItems, recentCommandPaletteItems]);

    const openPalette = () => setPaletteOpen(true);
    const closePalette = () => setPaletteOpen(false);

    const handleThemeToggle = () => {
        setThemeMode((previous) => (previous === 'terminal' ? 'amber' : 'terminal'));
    };

    const handleSelectCommand = (path: string) => {
        closePalette();
        navigate(path);
    };

    useEffect(() => {
        persistNavigationVisit(location.pathname, baseCommandPaletteItems);
    }, [baseCommandPaletteItems, location.pathname]);

    useEffect(() => {
        const root = document.documentElement;
        root.dataset.theme = themeMode;
        localStorage.setItem('portfolio-theme', themeMode);
    }, [themeMode]);

    useEffect(() => {
        const root = document.documentElement;
        root.dataset.motion = prefersReducedMotion ? 'reduce' : 'auto';
    }, [prefersReducedMotion]);

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') {
            return;
        }

        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const syncMotionPreference = () => setPrefersReducedMotion(query.matches);
        syncMotionPreference();

        if (typeof query.addEventListener === 'function') {
            query.addEventListener('change', syncMotionPreference);
            return () => query.removeEventListener('change', syncMotionPreference);
        }

        if (typeof query.addListener === 'function') {
            query.addListener(syncMotionPreference);
            return () => query.removeListener(syncMotionPreference);
        }

        return;
    }, []);

    useEffect(() => {
        const handleKeyboardShortcut = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTypingTarget = !!target && (
                target.tagName === 'INPUT'
                || target.tagName === 'TEXTAREA'
                || target.isContentEditable
                || target.closest('[contenteditable="true"]')
            );

            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !isTypingTarget) {
                event.preventDefault();
                openPalette();
            }

            if (event.key === 'Escape' && isPaletteOpen) {
                event.preventDefault();
                closePalette();
            }
        };

        window.addEventListener('keydown', handleKeyboardShortcut);
        return () => {
            window.removeEventListener('keydown', handleKeyboardShortcut);
        };
    }, [isPaletteOpen]);

    useEffect(() => {
        if (!isPaletteOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isPaletteOpen]);

    return (
        <>
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>

            <Navbar
                key={location.pathname}
                onOpenCommandPalette={openPalette}
                onThemeToggle={handleThemeToggle}
                themeMode={themeMode}
            />

            <div className="relative z-10 flex flex-col min-h-screen">
                <main id="main-content" role="main" className="flex-grow w-full">
                    <AppRoutes />
                </main>
                <Footer />
            </div>

            {isPaletteOpen && (
                <CommandPalette
                    isOpen={isPaletteOpen}
                    items={commandPaletteItems}
                    onClose={closePalette}
                    onSelect={handleSelectCommand}
                />
            )}
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppShell />
        </BrowserRouter>
    );
}

export default App;
