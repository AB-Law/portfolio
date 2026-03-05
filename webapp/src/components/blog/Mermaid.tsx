import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'JetBrains Mono',
    themeVariables: {
        primaryColor: '#79C0FF',
        primaryTextColor: '#F0F6FC',
        primaryBorderColor: '#79C0FF',
        lineColor: '#8B949E',
        secondaryColor: '#FF79C6',
        tertiaryColor: '#7EE787',
    }
});

interface MermaidProps {
    chart: string;
}

export const Mermaid = ({ chart }: MermaidProps) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current && chart) {
            // Remove any existing SVG to prevent duplicates
            ref.current.removeAttribute('data-processed');
            ref.current.innerHTML = chart;
            mermaid.contentLoaded();

            // Re-render
            const renderChart = async () => {
                try {
                    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                    const { svg } = await mermaid.render(id, chart);
                    if (ref.current) {
                        ref.current.innerHTML = svg;
                    }
                } catch (error) {
                    console.error('Mermaid render error:', error);
                }
            };
            renderChart();
        }
    }, [chart]);

    return (
        <div className="flex justify-center my-8 p-6 rounded-lg bg-bg-void/40 border border-border-subtle overflow-x-auto selection:bg-transparent">
            <div ref={ref} className="mermaid flex justify-center w-full"></div>
        </div>
    );
};
