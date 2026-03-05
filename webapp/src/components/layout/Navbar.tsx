import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isActive = (path: string) => location.pathname === path;

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

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
        { path: '/', label: '_home' },
        { path: '/projects', label: '_projects' },
        { path: '/blog', label: '_blog' },
        { path: '/about', label: '_about' },
    ];

    return (
        <>
            <header className="sticky top-0 z-50 w-full glass-panel border-b-0 border-b-glass-border">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 font-mono text-sm">
                        <Link to="/" className="flex items-center gap-3" onClick={closeMenu}>
                            <span className="text-accent-cyan material-symbols-outlined text-xl">terminal</span>
                            <span className="text-white font-bold tracking-tight">Terminal_Glass</span>
                        </Link>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 font-mono text-xs">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`${isActive(link.path) ? 'text-accent-cyan relative after:content-[""] after:absolute after:-bottom-6 after:left-0 after:w-full after:h-[2px] after:bg-accent-cyan' : 'text-text-muted hover:text-text-primary transition-colors'}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-4">
                        <button className="hidden md:flex items-center justify-center h-9 px-4 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-mono font-bold hover:bg-accent-cyan hover:text-bg-void transition-all duration-300">
                            <span className="mr-2 animate-pulse">●</span> CONNECT
                        </button>
                        <button className="md:hidden text-text-muted hover:text-white" onClick={toggleMenu}>
                            <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu - Moved outside header to avoid containing block issues */}
            {isMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 top-16 z-[9999] flex flex-col border-t border-white/10"
                    style={{ backgroundColor: '#0D1117', opacity: 1 }}
                >
                    <nav className="flex flex-col p-8 gap-6 font-mono text-base">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={closeMenu}
                                className={`py-2 ${isActive(link.path) ? 'text-accent-cyan' : 'text-text-muted'}`}
                            >
                                <span className="opacity-50 mr-2">&gt;</span>
                                {link.label}
                            </Link>
                        ))}
                        <button className="mt-4 flex items-center justify-center h-11 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-mono font-bold">
                            <span className="mr-2 animate-pulse">●</span> CONNECT_SYSTEM
                        </button>
                    </nav>
                </div>
            )}
        </>
    );
}
