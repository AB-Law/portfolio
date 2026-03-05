import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';

export default function About() {
    return (
        <div className="flex-grow w-full max-w-7xl mx-auto px-6 py-12">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-accent-magenta/5 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-grid-pattern bg-[length:40px_40px] opacity-20"></div>
            </div>

            <div className="relative z-10">
                {/* Page Title Area */}
                <div className="mb-12 animate-reveal">
                    <div className="flex items-center gap-2 mb-2 text-text-muted font-mono text-sm">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        <span>/root/identity</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight mb-4">
                        System <span className="text-accent-magenta text-glow">Identity</span>.
                    </h1>
                    <p className="text-text-muted max-w-2xl text-lg font-light leading-relaxed">
                        Full-stack architect specializing in cloud infrastructure, .NET ecosystems, and high-performance digital experiences.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Main Bio Content */}
                    <div className="lg:col-span-8 space-y-8 animate-reveal" style={{ animationDelay: '100ms' }}>
                        <section className="prose prose-invert max-w-none">
                            <h2 className="text-2xl font-display font-bold text-white mb-4 flex items-center gap-3">
                                <span className="text-accent-cyan font-mono text-lg">&gt;</span> overview.exe
                            </h2>
                            <p className="text-text-muted leading-relaxed text-lg">
                                I am a passionate software engineer with a focus on building robust, scalable applications using
                                <span className="text-white font-medium"> .NET</span>,
                                <span className="text-white font-medium"> Python</span>, and
                                <span className="text-white font-medium"> Azure Cloud Architecture</span>.
                                My approach combines rigorous backend engineering with clean, performant frontend experiences.
                            </p>
                            <p className="text-text-muted leading-relaxed text-lg">
                                With a polyglot mindset and a deep interest in AI integration, I thrive on solving complex
                                technical challenges—whether it's optimizing serverless workflows or architecting
                                multi-tier enterprise systems. I believe in code that isn't just functional, but
                                sustainable and performant.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                                <span className="text-accent-cyan font-mono text-lg">&gt;</span> tech_stack
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { category: 'Languages', items: ['C#', 'Python', 'TypeScript', 'SQL'] },
                                    { category: 'Frameworks', items: ['.NET Core', 'Angular', 'React', 'FastAPI'] },
                                    { category: 'Cloud', items: ['Azure', 'Serverless', 'Docker', 'CI/CD'] }
                                ].map((group) => (
                                    <div key={group.category} className="p-4 rounded-lg bg-white/5 border border-border-subtle">
                                        <h4 className="text-xs font-mono uppercase text-accent-cyan mb-3">{group.category}</h4>
                                        <ul className="space-y-1">
                                            {group.items.map(item => (
                                                <li key={item} className="text-sm font-mono text-text-muted">{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar: Socials & Stats */}
                    <aside className="lg:col-span-4 space-y-6 animate-reveal" style={{ animationDelay: '200ms' }}>
                        <GlassCard className="p-8">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-cyan to-accent-magenta p-1 mb-6">
                                    <div className="w-full h-full rounded-full bg-bg-void flex items-center justify-center overflow-hidden">
                                        <span className="material-symbols-outlined text-4xl text-white">fingerprint</span>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-display font-bold text-white mb-1">Akshay Biju</h3>
                                <p className="text-accent-cyan font-mono text-sm mb-6">Full Stack Engineer</p>

                                <div className="w-full space-y-3">
                                    <a
                                        href="https://www.linkedin.com/in/akshay-biju-/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#0077b5]/10 border border-[#0077b5]/30 text-[#0077b5] hover:bg-[#0077b5]/20 transition-all font-mono text-sm"
                                    >
                                        <span className="material-symbols-outlined text-lg">link</span>
                                        LINKEDIN
                                    </a>
                                    <a
                                        href="https://github.com/AB-Law"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-white/5 border border-white/20 text-white hover:bg-white/10 transition-all font-mono text-sm"
                                    >
                                        <span className="material-symbols-outlined text-lg">code</span>
                                        GITHUB
                                    </a>
                                </div>
                            </div>
                        </GlassCard>

                        <div className="p-6 rounded-lg border border-dashed border-border-subtle bg-bg-void/40">
                            <h4 className="text-xs font-mono uppercase text-text-muted mb-4 opacity-70">Current_Status</h4>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-accent-lime animate-pulse"></div>
                                    <span className="text-sm font-mono text-text-primary">Open for new projects</span>
                                </div>
                                <div className="flex items-center gap-3 text-text-muted">
                                    <span className="material-symbols-outlined text-sm">location_on</span>
                                    <span className="text-sm font-mono">Based in Bengaluru, India</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Bottom CTA */}
                <div className="mt-20 text-center animate-reveal" style={{ animationDelay: '300ms' }}>
                    <div className="h-px w-24 bg-accent-magenta mx-auto mb-8"></div>
                    <Link to="/projects" className="inline-flex items-center gap-2 text-text-muted hover:text-accent-cyan transition-colors font-mono">
                        <span>cd ../projects</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
