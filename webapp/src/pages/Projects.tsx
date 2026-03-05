import { useState, useMemo } from 'react';
import { GlassCard } from '../components/ui/GlassCard';

type Project = {
    id: string;
    title: string;
    year: string;
    description: string;
    url: string;
    tags: string[];
    icon: string;
};

const PROJECTS: Project[] = [
    {
        id: 'pluckit',
        title: 'PluckIt',
        year: '2026',
        description: 'A wardrobe app with an embedded AI feature to help you organize your closet and get style ideas.',
        url: 'https://pluckit.omakashay.com',
        tags: ['AI', 'Angular', 'Backend (Polyglot)', 'Serverless', 'DevOps'],
        icon: 'checkroom'
    }
];

export default function Projects() {
    const [activeFilter, setActiveFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Get unique tags from all projects
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        PROJECTS.forEach(p => p.tags.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, []);

    const filteredProjects = useMemo(() => {
        return PROJECTS.filter(project => {
            const matchesFilter = activeFilter === 'All' || project.tags.includes(activeFilter);
            const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

            return matchesFilter && matchesSearch;
        });
    }, [activeFilter, searchQuery]);

    return (
        <div className="flex-grow w-full max-w-7xl mx-auto px-6 py-12">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-magenta/5 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-grid-pattern bg-[length:40px_40px] opacity-20"></div>
            </div>

            <div className="relative z-10">
                {/* Page Title Area */}
                <div className="mb-12 animate-reveal">
                    <div className="flex items-center gap-2 mb-2 text-text-muted font-mono text-sm">
                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                        <span>/root/projects</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight mb-4">
                        Shipped <span className="text-accent-cyan text-glow">Code</span>.
                    </h1>
                    <p className="text-text-muted max-w-2xl text-lg font-light leading-relaxed flex flex-wrap items-center gap-2">
                        A collection of technical case studies, experiments, and production-grade applications.
                        <span className="font-mono text-xs text-accent-magenta bg-accent-magenta/10 px-2 py-0.5 rounded">git status: clean</span>
                    </p>
                </div>

                {/* Filter Bar (VS Code Tabs Style) */}
                <div className="sticky top-[64px] z-40 mb-10 animate-reveal" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center overflow-x-auto bg-[#161b22]/70 backdrop-blur-[12px] border border-border-subtle rounded-t-lg border-b-0 hide-scrollbar scroll-smooth">
                        {/* Active Tab / All Projects */}
                        <button
                            onClick={() => setActiveFilter('All')}
                            className={`relative px-6 py-3 flex items-center gap-2 border-t-2 transition-colors group min-w-max ${activeFilter === 'All'
                                ? 'bg-[#1e2329]/50 border-t-accent-cyan text-text-primary hover:bg-[#1e2329]'
                                : 'border-t-transparent text-text-muted hover:text-text-primary hover:bg-border-subtle/30'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[16px] ${activeFilter === 'All' ? 'text-accent-cyan' : ''}`}>grid_view</span>
                            <span className="font-mono text-sm">All Projects</span>
                            <span className="ml-2 text-[10px] text-text-muted bg-border-subtle px-1.5 rounded-full">{PROJECTS.length}</span>
                        </button>

                        {/* Dynamic Tag Tabs */}
                        {allTags.map(tag => {
                            // Convert Backend (Polyglot) to shorter label for tab
                            const tabLabel = tag.includes('Backend') ? 'backend' : tag.toLowerCase();

                            return (
                                <button
                                    key={tag}
                                    onClick={() => setActiveFilter(tag)}
                                    className={`relative px-6 py-3 flex items-center gap-2 border-t-2 transition-colors min-w-max ${activeFilter === tag
                                        ? 'bg-[#1e2329]/50 border-t-accent-magenta text-text-primary hover:bg-[#1e2329]'
                                        : 'border-t-transparent text-text-muted hover:text-text-primary hover:bg-border-subtle/30'
                                        }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${activeFilter === tag ? 'bg-accent-magenta' : 'bg-[#61DAFB]'}`}></span>
                                    <span className="font-mono text-sm">.{tabLabel}</span>
                                </button>
                            );
                        })}

                        {/* Filter Search Placeholder */}
                        <div className="ml-auto px-4 py-2 hidden sm:flex items-center">
                            <div className="relative">
                                <input
                                    className="bg-void/50 border border-glass-border rounded px-3 py-1 text-xs font-mono text-text-primary focus:border-accent-cyan focus:outline-none w-48 placeholder-text-muted/50"
                                    placeholder="grep search..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    {/* Tab border bottom line */}
                    <div className="h-[1px] w-full bg-border-subtle"></div>
                </div>

                {/* Masonry Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-reveal" style={{ animationDelay: '200ms' }}>
                    {filteredProjects.map(project => (
                        <article key={project.id} className="group relative flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
                            <a href={project.url} target="_blank" rel="noopener noreferrer" className="block h-full cursor-pointer">
                                <GlassCard className="flex flex-col h-full group-hover:border-accent-cyan/50">
                                    {/* Image Viewport */}
                                    <div className="relative aspect-[4/3] overflow-hidden bg-void rounded-t-xl group-hover:rounded-t-[10px]">
                                        <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/20 to-accent-magenta/20 flex items-center justify-center pointer-events-none">
                                            <span className="material-symbols-outlined text-6xl text-white opacity-50 group-hover:opacity-100 transition-opacity">{project.icon}</span>
                                        </div>
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-bg-void/80 to-transparent opacity-60"></div>
                                        {/* Top Right Link Icon */}
                                        <div className="absolute top-4 right-4 w-8 h-8 rounded bg-void/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-glass-border text-accent-cyan">
                                            <span className="material-symbols-outlined text-[18px]">arrow_outward</span>
                                        </div>
                                    </div>

                                    {/* Meta Console */}
                                    <div className="p-5 flex flex-col flex-grow border-t border-border-subtle relative">
                                        {/* Connecting Line Decoration */}
                                        <div className="absolute -top-[1px] left-5 w-8 h-[1px] bg-accent-cyan"></div>
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-display font-bold text-xl tracking-tight text-text-primary group-hover:text-accent-cyan transition-colors">{project.title}</h3>
                                            <span className="font-mono text-[10px] text-text-muted border border-border-subtle px-1.5 py-0.5 rounded bg-void/30">{project.year}</span>
                                        </div>
                                        <p className="text-text-muted text-sm leading-relaxed mb-6">
                                            {project.description}
                                        </p>
                                        <div className="mt-auto flex flex-wrap gap-2">
                                            {project.tags.map((tag, i) => {
                                                // Alternate colors for standard tags
                                                let style = 'text-text-muted bg-border-subtle/50 border-transparent';
                                                if (i === 0) style = 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20';
                                                else if (i === 1) style = 'text-accent-magenta bg-accent-magenta/10 border-accent-magenta/20';

                                                return (
                                                    <span key={tag} className={`font-mono text-[11px] px-2 py-1 rounded border ${style}`}>
                                                        [{tag}]
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </GlassCard>
                            </a>
                        </article>
                    ))}

                    {filteredProjects.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col justify-center items-center text-text-muted text-sm font-mono opacity-50">
                            <span className="material-symbols-outlined text-4xl mb-4">search_off</span>
                            <p>No projects found matching the filter.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
