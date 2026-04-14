import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const warmthConfig = {
    hot: { label: 'Hot', color: 'bg-coral', glow: 'shadow-[0_0_12px_rgba(249,123,92,0.6)]', textColor: 'text-coral' },
    warm: { label: 'Warm', color: 'bg-yellow-400', glow: 'shadow-[0_0_10px_rgba(241,196,15,0.5)]', textColor: 'text-yellow-400' },
    cool: { label: 'Cool', color: 'bg-ocean', glow: 'shadow-[0_0_8px_rgba(78,155,232,0.4)]', textColor: 'text-ocean' },
    cold: { label: 'Cold', color: 'bg-[#6E7781]', glow: 'shadow-[0_0_4px_rgba(110,119,129,0.3)]', textColor: 'text-[#6E7781]' },
};

export function WarmthDot({ warmth, size = 'md' }) {
    const config = warmthConfig[warmth] || warmthConfig.cold;
    const sizeClass = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={`inline-block rounded-full ${sizeClass} ${config.color} ${config.glow} ${warmth === 'hot' ? 'animate-pulse-warm' : ''}`} data-testid={`warmth-dot-${warmth}`} />
                </TooltipTrigger>
                <TooltipContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5]">
                    <p className="text-xs">{config.label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function WarmthBadge({ warmth }) {
    const config = warmthConfig[warmth] || warmthConfig.cold;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.textColor} bg-white/5`} data-testid={`warmth-badge-${warmth}`}>
            <span className={`w-2 h-2 rounded-full ${config.color} ${config.glow}`} />
            {config.label}
        </span>
    );
}
