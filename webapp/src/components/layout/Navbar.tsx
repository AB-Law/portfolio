import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

type ThemeMode = 'terminal' | 'amber';
type ConnectActionKind = 'route' | 'external' | 'command';

type ConnectAction = {
    id: string;
    label: string;
    icon: string;
    href: string;
    kind: ConnectActionKind;
};

const CONTACT_EMAIL = 'akshay.law35@gmail.com';
const CONTACT_LINKS: ConnectAction[] = [
    {
        id: 'system-contact-card',
        label: 'SYSTEM_CONTACT',
        icon: 'badge',
        href: '/about',
        kind: 'route',
    },
    {
        id: 'email',
        label: 'EMAIL',
        icon: 'mail',
        href: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Portfolio connection')}&body=${encodeURIComponent('Hi Akshay,')}`,
        kind: 'external',
    },
    {
        id: 'github',
        label: 'GITHUB',
        icon: 'code',
        href: 'https://github.com/AB-Law',
        kind: 'external',
    },
    {
        id: 'linkedin',
        label: 'LINKEDIN',
        icon: 'link',
        href: 'https://www.linkedin.com/in/akshay-biju-/',
        kind: 'external',
    },
    {
        id: 'command-center',
        label: 'COMMAND_CENTER',
        icon: 'terminal',
        href: 'command-center',
        kind: 'command',
    },
];

const SEO_ARTIFACT_LINKS = [
    { href: '/rss.xml', label: 'RSS' },
    { href: '/sitemap.xml', label: 'Sitemap' },
    { href: '/robots.txt', label: 'Robots' },
];

interface NavbarProps {
    onOpenCommandPalette: () => void;
    onThemeToggle: () => void;
    themeMode: ThemeMode;
}

export default function Navbar({ onOpenCommandPalette, onThemeToggle, themeMode }: NavbarProps) {
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isConnectOpen, setIsConnectOpen] = useState(false);
    const isActive = (path: string) => location.pathname === path;
    const menuId = 'primary-mobile-nav';
    const connectMenuId = 'primary-connect-menu';

    const toggleMenu = () => {
        setIsMenuOpen((previous) => !previous);
        closeConnectMenu();
    };
    const closeMenu = () => {
        setIsMenuOpen(false);
        closeConnectMenu();
    };
    const toggleConnectMenu = () => setIsConnectOpen((previous) => !previous);
    const closeConnectMenu = () => setIsConnectOpen(false);

    useEffect(() => {
        if (!isConnectOpen) {
            return;
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeConnectMenu();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isConnectOpen]);

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen]);

    const navLinks = [
        { path: '/', label: '_home', ariaLabel: 'Home' },
        { path: '/projects', label: '_projects', ariaLabel: 'Projects' },
        { path: '/blog', label: '_blog', ariaLabel: 'Blog' },
        { path: '/status', label: '_status', ariaLabel: 'System Status' },
        { path: '/changelog', label: '_changelog', ariaLabel: 'Changelog' },
        { path: '/about', label: '_about', ariaLabel: 'About' },
    ];

    const themeLabel = themeMode === 'terminal' ? 'Amber' : 'Terminal';

    return (
        <>
            <header className="sticky top-0 z-50 w-full glass-panel border-b-0 border-b-glass-border" aria-label="Site header">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 font-mono text-sm">
                        <Link
                            to="/"
                            className="flex items-center gap-3"
                            onClick={closeMenu}
                            aria-label="Go to home page"
                        >
                            <span className="text-accent-cyan material-symbols-outlined text-xl">terminal</span>
                            <span className="text-white font-bold tracking-tight">Terminal_Glass</span>
                        </Link>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 font-mono text-xs" aria-label="Primary">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`${isActive(link.path) ? 'text-accent-cyan relative after:content-[""] after:absolute after:-bottom-6 after:left-0 after:w-full after:h-[2px] after:bg-accent-cyan' : 'text-text-muted hover:text-text-primary transition-colors'}`}
                                aria-current={isActive(link.path) ? 'page' : undefined}
                                aria-label={link.ariaLabel}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-4 relative">
                        <button
                            type="button"
                            onClick={onOpenCommandPalette}
                            className="hidden md:flex items-center justify-center h-9 px-4 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-mono font-bold hover:bg-accent-cyan hover:text-bg-void transition-all duration-300 gap-2"
                            aria-label="Open command palette (Ctrl or Cmd plus K)"
                            aria-keyshortcuts="Meta+K Ctrl+K"
                        >
                            <span className="material-symbols-outlined text-sm">terminal</span>
                            <span>COMMAND</span>
                            <span className="text-[10px] px-2 py-0.5 rounded border border-accent-cyan/30 bg-accent-cyan/10">⌘K</span>
                        </button>
                        <div className="hidden lg:flex items-center gap-2 text-[10px] text-text-muted font-mono">
                            <span className="text-text-muted/70">Feed + sitemap</span>
                            {SEO_ARTIFACT_LINKS.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Open ${link.label} artifact`}
                                    className="hover:text-accent-cyan transition-colors"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={onThemeToggle}
                            className="hidden md:flex items-center justify-center h-9 px-4 rounded bg-white/5 border border-glass-border text-text-muted text-xs font-mono font-bold hover:text-accent-cyan transition-all duration-300"
                            aria-label={`Switch to ${themeLabel} theme`}
                        >
                            <span className="material-symbols-outlined text-sm">light_mode</span>
                            <span>{themeMode}</span>
                        </button>
                        <button
                            type="button"
                            onClick={toggleConnectMenu}
                            className="hidden md:flex items-center justify-center h-9 px-4 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-mono font-bold hover:bg-accent-cyan hover:text-bg-void transition-all duration-300 relative"
                            aria-expanded={isConnectOpen}
                            aria-controls={connectMenuId}
                            aria-label="Open connect matrix"
                        >
                            <span className="mr-2 animate-pulse">●</span> CONNECT
                        </button>
                        {isConnectOpen && (
                            <div
                                id={connectMenuId}
                                role="menu"
                                className="absolute right-0 top-full mt-2 w-64 border border-glass-border rounded-lg bg-[#0D1117]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
                            >
                                <div className="px-3 py-2 text-[10px] font-mono text-text-muted uppercase border-b border-white/10">Connect Matrix</div>
                                <div className="p-1 flex flex-col">
                                    {CONTACT_LINKS.map((action) => {
                                        if (action.kind === 'command') {
                                            return (
                                                <button
                                                    key={action.id}
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => {
                                                        onOpenCommandPalette();
                                                        closeConnectMenu();
                                                    }}
                                                    className="w-full text-left px-2 py-2 rounded text-xs font-mono text-text-muted hover:text-accent-cyan hover:bg-white/5 transition-all duration-200 flex items-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-sm">{action.icon}</span>
                                                    {action.label}
                                                </button>
                                            );
                                        }

                                        if (action.kind === 'route') {
                                            return (
                                                <Link
                                                    key={action.id}
                                                    role="menuitem"
                                                    to={action.href}
                                                    onClick={closeConnectMenu}
                                                    className="w-full text-left px-2 py-2 rounded text-xs font-mono text-text-muted hover:text-accent-cyan hover:bg-white/5 transition-all duration-200 flex items-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-sm">{action.icon}</span>
                                                    {action.label}
                                                </Link>
                                            );
                                        }

                                        return (
                                            <a
                                                key={action.id}
                                                role="menuitem"
                                                href={action.href}
                                                target={action.href.startsWith('mailto:') ? undefined : '_blank'}
                                                rel={action.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                                                onClick={closeConnectMenu}
                                                className="w-full text-left px-2 py-2 rounded text-xs font-mono text-text-muted hover:text-accent-cyan hover:bg-white/5 transition-all duration-200 flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">{action.icon}</span>
                                                {action.label}
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            className="md:hidden text-text-muted hover:text-white"
                            onClick={toggleMenu}
                            aria-label={isMenuOpen ? 'Close main navigation' : 'Open main navigation'}
                            aria-expanded={isMenuOpen}
                            aria-controls={menuId}
                        >
                            <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu - Moved outside header to avoid containing block issues */}
            {isMenuOpen && (
                <div
                    id={menuId}
                    className="md:hidden fixed inset-0 top-16 z-[9999] flex flex-col border-t border-white/10"
                    style={{ backgroundColor: '#0D1117', opacity: 1 }}
                >
                    <nav className="flex flex-col p-8 gap-6 font-mono text-base" aria-label="Primary">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={closeMenu}
                                className={`py-2 ${isActive(link.path) ? 'text-accent-cyan' : 'text-text-muted'}`}
                                aria-label={link.ariaLabel}
                            >
                                <span className="opacity-50 mr-2">&gt;</span>
                                {link.label}
                            </Link>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                onOpenCommandPalette();
                                closeMenu();
                            }}
                            className="mt-4 flex items-center justify-center h-11 rounded bg-white/10 border border-glass-border text-text-muted text-xs font-mono font-bold hover:text-accent-cyan"
                            aria-label="Open command palette (Ctrl or Cmd plus K)"
                            aria-keyshortcuts="Meta+K Ctrl+K"
                        >
                            <span className="material-symbols-outlined text-sm mr-2">terminal</span> COMMAND_PALETTE
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onThemeToggle();
                                closeMenu();
                            }}
                            className="mt-3 flex items-center justify-center h-11 rounded bg-white/5 border border-glass-border text-text-muted text-xs font-mono font-bold hover:text-accent-cyan"
                            aria-label={`Switch to ${themeLabel} theme`}
                        >
                            <span className="material-symbols-outlined text-sm mr-2">light_mode</span> THEME: {themeMode}
                        </button>
                        <div className="mt-3 border-t border-white/10 pt-4 flex flex-col gap-2">
                            {CONTACT_LINKS.map((action) => {
                                if (action.kind === 'command') {
                                    return (
                                        <button
                                            key={action.id}
                                            type="button"
                                            onClick={() => {
                                                onOpenCommandPalette();
                                                closeMenu();
                                                closeConnectMenu();
                                            }}
                                            className="flex items-center justify-center h-11 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-mono font-bold"
                                        >
                                            <span className="mr-2 animate-pulse">●</span> {action.label}
                                        </button>
                                    );
                                }

                                if (action.kind === 'route') {
                                    return (
                                        <Link
                                            key={action.id}
                                            to={action.href}
                                            onClick={() => {
                                                closeMenu();
                                                closeConnectMenu();
                                            }}
                                            className="flex items-center justify-center h-11 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-mono font-bold"
                                        >
                                            <span className="material-symbols-outlined text-sm mr-2">{action.icon}</span>
                                            {action.label}
                                        </Link>
                                    );
                                }

                                return (
                                    <a
                                        key={action.id}
                                        href={action.href}
                                        target={action.href.startsWith('mailto:') ? undefined : '_blank'}
                                        rel={action.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                                        onClick={() => {
                                            closeMenu();
                                            closeConnectMenu();
                                        }}
                                        className="flex items-center justify-center h-11 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-mono font-bold"
                                    >
                                        <span className="material-symbols-outlined text-sm mr-2">{action.icon}</span> {action.label}
                                    </a>
                                );
                            })}
                            <div className="mt-3 border-t border-white/10 pt-4 flex flex-col gap-2">
                                <span className="text-xs uppercase tracking-wide text-text-muted">Feed + sitemap</span>
                                {SEO_ARTIFACT_LINKS.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Open ${link.label} artifact`}
                                        className="text-sm font-mono text-text-muted px-2 py-2 rounded bg-white/5 border border-glass-border hover:text-accent-cyan transition-colors"
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </nav>
                </div>
            )}
        </>
    );
}
