import { deployedBranch, deployedCommit, deployedVersion, getShortCommit } from '@/utils/buildMetadata';
import { Link } from 'react-router-dom';

export default function Footer() {
    const shortCommit = getShortCommit(deployedCommit, 7);
    const seoArtifactLinks = [
        { href: '/rss.xml', label: 'rss.xml' },
        { href: '/sitemap.xml', label: 'sitemap.xml' },
        { href: '/robots.txt', label: 'robots.txt' },
    ];

    return (
        <footer className="fixed bottom-0 z-50 w-full h-8 bg-[#0D1117] border-t border-glass-border flex items-center justify-between px-4 text-[10px] font-mono text-text-muted select-none">
            <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-accent-lime">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    System Online
                </span>
                <span className="hidden sm:inline">v{deployedVersion}</span>
                <span className="hidden sm:inline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">account_tree</span>
                    {deployedBranch}
                </span>
                <span className="hidden sm:inline" title={deployedCommit}>
                    {shortCommit}
                </span>
            </div>
            <div className="flex items-center gap-4">
                <Link to="/status" className="hover:text-accent-cyan transition-colors">
                    status
                </Link>
                <Link to="/changelog" className="hover:text-accent-cyan transition-colors hidden sm:block">
                    changelog
                </Link>
                <span className="hidden sm:inline">UTF-8</span>
                <span className="hidden sm:inline">React</span>
                <div className="hidden lg:flex items-center gap-3">
                    <span className="text-text-muted/80">Feed + sitemap</span>
                    {seoArtifactLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${link.label}`}
                            className="hover:text-accent-cyan transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
                <div className="flex gap-3 ml-2">
                    <a href="https://github.com/AB-Law" target="_blank" rel="noopener noreferrer" className="hover:text-accent-cyan transition-colors">GitHub</a>
                    <a href="https://www.linkedin.com/in/akshay-biju-/" target="_blank" rel="noopener noreferrer" className="hover:text-accent-cyan transition-colors">LinkedIn</a>
                </div>
            </div>
        </footer>
    );
}
