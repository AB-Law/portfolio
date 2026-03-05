import { cn } from '@/lib/utils';
import React from 'react';

interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    intensity?: 'low' | 'medium' | 'high';
}

export function GlassCard({ children, className, intensity = 'medium', ...props }: GlassProps) {
    const blurMap = {
        low: 'backdrop-blur-sm',
        medium: 'backdrop-blur-[12px]',
        high: 'backdrop-blur-xl',
    };

    return (
        <div
            className={cn(
                'bg-glass-panel border border-border-subtle rounded-xl overflow-hidden',
                blurMap[intensity],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
