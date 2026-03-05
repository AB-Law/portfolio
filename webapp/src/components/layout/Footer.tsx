export default function Footer() {
    return (
        <footer className="fixed bottom-0 z-50 w-full h-8 bg-[#0D1117] border-t border-glass-border flex items-center justify-between px-4 text-[10px] font-mono text-text-muted select-none">
            <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-accent-lime">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    System Online
                </span>
                <span className="hidden sm:inline">v2.4.0-stable</span>
                <span className="hidden sm:inline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">account_tree</span>
                    main
                </span>
            </div>
            <div className="flex items-center gap-4">
                <span className="hidden sm:inline">UTF-8</span>
                <span className="hidden sm:inline">React</span>
                <div className="flex gap-3 ml-2">
                    <a href="https://github.com/AB-Law" target="_blank" rel="noopener noreferrer" className="hover:text-accent-cyan transition-colors">GitHub</a>
                    <a href="https://www.linkedin.com/in/akshay-biju-/" target="_blank" rel="noopener noreferrer" className="hover:text-accent-cyan transition-colors">LinkedIn</a>
                </div>
            </div>
        </footer>
    );
}
