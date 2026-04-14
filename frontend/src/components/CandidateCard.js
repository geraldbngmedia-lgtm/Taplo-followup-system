import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { WarmthDot, WarmthBadge } from '@/components/WarmthIndicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaperPlaneTilt, Trash, CalendarDot, Briefcase, PlugsConnected } from '@phosphor-icons/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DotsThreeVertical } from '@phosphor-icons/react';

const groupLabels = {
    silver_medallist: 'Silver Medallist',
    not_ready_yet: 'Not Ready Yet',
    pipeline: 'Pipeline',
    offer_declined: 'Offer Declined',
};

const groupColors = {
    silver_medallist: 'bg-coral/10 text-coral border-coral/20',
    not_ready_yet: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    pipeline: 'bg-ocean/10 text-ocean border-ocean/20',
    offer_declined: 'bg-[#6E7781]/10 text-[#A0AAB2] border-[#6E7781]/20',
};

function safeDateFormat(dateStr) {
    if (!dateStr) return 'Never';
    try {
        return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
        return 'Unknown';
    }
}

function safeNextFollowUp(dateStr) {
    if (!dateStr) return 'Not scheduled';
    try {
        const d = parseISO(dateStr);
        const now = new Date();
        if (d <= now) return 'Due now';
        return format(d, 'MMM d, yyyy');
    } catch {
        return 'Unknown';
    }
}

export default function CandidateCard({ candidate, index, onFollowUp, onDelete }) {
    const c = candidate;
    const isOverdue = c.next_followup && new Date(c.next_followup) <= new Date();

    return (
        <div
            className={`pipeline-card bg-surface-card border border-white/5 rounded-2xl p-5 opacity-0 animate-fade-up`}
            style={{ animationDelay: `${index * 0.04}s` }}
            data-testid={`candidate-card-${c.id}`}
        >
            {/* Top row */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <WarmthDot warmth={c.warmth} size="md" />
                    <div className="min-w-0">
                        <h3 className="text-[#F1F3F5] font-heading font-semibold text-base truncate" data-testid={`candidate-name-${c.id}`}>{c.name}</h3>
                        <p className="text-[#6E7781] text-xs truncate">{c.email}</p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-1 text-[#6E7781] hover:text-[#A0AAB2] hover:bg-white/5 rounded-lg transition-colors" data-testid={`candidate-menu-${c.id}`}>
                            <DotsThreeVertical weight="bold" className="w-5 h-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5]">
                        <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400 focus:bg-red-400/5" data-testid={`candidate-delete-${c.id}`}>
                            <Trash className="w-4 h-4 mr-2" /> Remove
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Info */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                    <Briefcase weight="duotone" className="w-4 h-4 text-[#6E7781] shrink-0" />
                    <span className="text-sm text-[#A0AAB2] truncate">{c.role}</span>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarDot weight="duotone" className="w-4 h-4 text-[#6E7781] shrink-0" />
                    <span className="text-sm text-[#A0AAB2]">Contacted {safeDateFormat(c.last_contact_date)}</span>
                </div>
            </div>

            {/* Tags row */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Badge className={`text-xs border rounded-full px-2.5 py-0.5 ${groupColors[c.group] || groupColors.pipeline}`} data-testid={`candidate-group-badge-${c.id}`}>
                    {groupLabels[c.group] || c.group}
                </Badge>
                <WarmthBadge warmth={c.warmth} />
                {c.source === 'teamtailor' && (
                    <Badge className="text-xs border rounded-full px-2 py-0.5 bg-ocean/10 text-ocean border-ocean/20" data-testid={`candidate-tt-badge-${c.id}`}>
                        <PlugsConnected className="w-3 h-3 mr-1" /> TT
                    </Badge>
                )}
            </div>

            {/* Next follow-up */}
            <div className={`text-xs mb-4 ${isOverdue ? 'text-coral font-medium' : 'text-[#6E7781]'}`} data-testid={`candidate-next-followup-${c.id}`}>
                Next follow-up: {safeNextFollowUp(c.next_followup)}
            </div>

            {/* Action */}
            <Button
                onClick={onFollowUp}
                className="w-full bg-ocean/10 hover:bg-ocean/20 text-ocean rounded-full text-sm font-medium h-9 border border-ocean/20 transition-all"
                data-testid={`candidate-followup-button-${c.id}`}
            >
                <PaperPlaneTilt weight="fill" className="w-4 h-4 mr-2" />
                Follow Up
            </Button>
        </div>
    );
}
