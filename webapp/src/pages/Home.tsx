import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';

export default function Home() {
    return (
        <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden max-w-[1440px] mx-auto w-full relative">
            <div className="absolute inset-0 z-0 bg-grid-pattern-home opacity-[0.07] pointer-events-none"></div>

            {/* Left Column: Identity & Terminal */}
            <section className="lg:w-[40%] flex flex-col justify-center px-8 lg:px-16 py-12 relative z-10 border-b lg:border-b-0 lg:border-r border-border-subtle h-[calc(100vh-96px)]">
                <div className="space-y-8 max-w-lg">
                    {/* Status Badge */}
                    <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-accent-lime/10 border border-accent-lime/20 w-fit">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-lime opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-lime"></span>
                        </span>
                        <span className="font-mono text-xs text-accent-lime tracking-wide">System Online</span>
                    </div>

                    {/* Hero Typography */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="h-px w-8 bg-accent-cyan/50"></span>
                            <h1 className="font-mono text-sm tracking-[0.2em] text-accent-cyan uppercase">Akshay's Portfolio</h1>
                        </div>
                        <h2 className="font-display font-bold text-5xl lg:text-6xl tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-text-muted">
                            Building digital infrastructure.
                        </h2>
                        <p className="text-text-muted text-lg max-w-md leading-relaxed">
                            Architecting scalable interfaces and high-performance design systems for the modern web.
                        </p>
                    </div>

                    {/* Terminal Prompt */}
                    <div className="mt-8 p-4 rounded-lg bg-black/40 border border-border-subtle font-mono text-sm text-text-muted shadow-inner">
                        <div className="flex gap-2 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                        </div>
                        <div className="space-y-1">
                            <p><span className="text-accent-magenta">akshay@portfolio</span>:<span className="text-accent-cyan">~</span>$ ./init_session.sh</p>
                            <p className="text-text-primary">&gt; initializing user_session...</p>
                            <p className="text-text-primary">&gt; loading_modules: [.net, python, angular, azure]</p>
                            <p className="text-text-primary">&gt; status: ready<span className="inline-block w-2 h-4 bg-accent-lime ml-1 align-middle animate-blink"></span></p>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap gap-4 pt-4">
                        <Link to="/projects" className="px-6 py-3 bg-white text-bg-void font-display font-bold rounded hover:bg-gray-200 transition-colors flex items-center gap-2">
                            View Projects <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                        <Link to="/blog" className="px-6 py-3 glass-card text-text-primary font-display font-medium rounded hover:bg-white/5 transition-colors border border-border-subtle hover:border-accent-cyan/50">
                            Read Logs
                        </Link>
                    </div>
                </div>
            </section>

            {/* Right Column: Featured Work Stack */}
            <section className="lg:w-[60%] h-[calc(100vh-96px)] overflow-y-auto relative z-10 p-6 lg:p-16 flex flex-col items-center">
                <div className="flex flex-col gap-8 w-full max-w-xl pb-20">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-mono text-xs text-text-muted uppercase tracking-widest">Featured_Work // 01</h3>
                        <div className="h-px bg-border-subtle flex-1 ml-4"></div>
                    </div>

                    {/* Project Card 1: PluckIt */}
                    <article className="group relative w-full cursor-pointer transition-all duration-500 ease-elastic hover:-translate-y-2">
                        <a href="https://pluckit.omakashay.com" target="_blank" rel="noopener noreferrer" className="block">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-cyan to-accent-magenta opacity-0 group-hover:opacity-20 blur transition duration-500 rounded-xl"></div>
                            <GlassCard className="relative group-hover:border-accent-cyan/50 transition-colors duration-300">
                                <div className="h-48 overflow-hidden relative bg-void flex items-center justify-center">
                                    <span className="material-symbols-outlined text-6xl text-white opacity-50 group-hover:opacity-100 transition-opacity">checkroom</span>
                                    <div className="absolute bottom-3 right-3 z-20">
                                        <span className="bg-black/80 backdrop-blur text-white text-[10px] font-mono px-2 py-1 rounded border border-white/10">v0.2.0</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-2xl font-display font-bold text-text-primary group-hover:text-accent-cyan transition-colors">PluckIt</h3>
                                        <span className="material-symbols-outlined text-text-muted group-hover:text-accent-cyan transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">north_east</span>
                                    </div>
                                    <p className="text-text-muted text-sm mb-6 font-light leading-relaxed">
                                        A wardrobe app with an embedded AI feature to help you organize your closet and get style ideas.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-accent-cyan text-xs font-mono">AI</span>
                                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-accent-magenta text-xs font-mono">Serverless</span>
                                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-text-muted text-xs font-mono">Segemntation</span>
                                    </div>
                                </div>
                            </GlassCard>
                        </a>
                    </article>

                    {/* Project Card 2: Azure Blog */}
                    <article className="group relative w-full cursor-pointer transition-all duration-500 ease-elastic hover:-translate-y-2 lg:-ml-8 lg:mt-[-40px] z-20">
                        <Link to="/blog/queue-trigger-encoding-debug" className="block">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-cyan to-accent-lime opacity-0 group-hover:opacity-20 blur transition duration-500 rounded-xl"></div>
                            <GlassCard className="relative group-hover:border-accent-cyan/50 transition-colors duration-300">
                                <div className="h-48 overflow-hidden relative bg-void flex items-center justify-center p-8">
                                    <span className="material-symbols-outlined text-6xl text-accent-cyan opacity-40 group-hover:opacity-100 transition-opacity">terminal</span>
                                    <div className="absolute bottom-3 right-3 z-20">
                                        <span className="bg-black/80 backdrop-blur text-white text-[10px] font-mono px-2 py-1 rounded border border-white/10">Feb 2026</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-2xl font-display font-bold text-text-primary group-hover:text-accent-cyan transition-colors line-clamp-2">Fixing Azure Storage Queue poisoning</h3>
                                        <span className="material-symbols-outlined text-text-muted group-hover:text-accent-cyan transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">north_east</span>
                                    </div>
                                    <p className="text-text-muted text-sm mb-6 font-light leading-relaxed">
                                        Debugging a critical issue with dotnet isolated functions where message encoding causes instant poisoning.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-accent-cyan text-xs font-mono">Azure</span>
                                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-accent-lime text-xs font-mono">.NET</span>
                                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-text-muted text-xs font-mono">Debugging</span>
                                    </div>
                                </div>
                            </GlassCard>
                        </Link>
                    </article>

                    {/* Project Card 3: Refactoring Blog */}
                    <article className="group relative w-full cursor-pointer transition-all duration-500 ease-elastic hover:-translate-y-2 lg:ml-4 lg:mt-[-40px] z-30">
                        <Link to="/blog/legacy_migration_graph_engine" className="block">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-magenta to-accent-cyan opacity-0 group-hover:opacity-20 blur transition duration-500 rounded-xl"></div>
                            <GlassCard className="relative group-hover:border-accent-cyan/50 transition-colors duration-300">
                                <div className="h-48 overflow-hidden relative bg-void flex items-center justify-center p-8">
                                    <span className="material-symbols-outlined text-6xl text-accent-magenta opacity-40 group-hover:opacity-100 transition-opacity">account_tree</span>
                                    <div className="absolute bottom-3 right-3 z-20">
                                        <span className="bg-black/80 backdrop-blur text-white text-[10px] font-mono px-2 py-1 rounded border border-white/10">Jan 2026</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-2xl font-display font-bold text-text-primary group-hover:text-accent-cyan transition-colors">Dependency Graph Refactoring</h3>
                                        <span className="material-symbols-outlined text-text-muted group-hover:text-accent-cyan transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">north_east</span>
                                    </div>
                                    <p className="text-text-muted text-sm mb-6 font-light leading-relaxed">
                                        How to use dependency graphs to safely refactor complex legacy codebases and improve performance.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-accent-magenta text-xs font-mono">Refactoring</span>
                                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-accent-cyan text-xs font-mono">Architecture</span>
                                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-text-muted text-xs font-mono">Legacy</span>
                                    </div>
                                </div>
                            </GlassCard>
                        </Link>
                    </article>
                </div>
            </section>
        </div>
    );
}
