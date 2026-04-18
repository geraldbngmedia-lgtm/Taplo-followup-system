import { useState, useEffect } from 'react';
import { CalendarDot, Warning, Fire, Snowflake, TrendUp, Users } from '@phosphor-icons/react';
import { WarmthBadge } from '@/components/WarmthIndicator';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

const groupLabels = {
    silver_medallist: 'Silver Medallist',
    not_ready_yet: 'Not Ready Yet',
    pipeline: 'Pipeline',
    offer_declined: 'Offer Declined',
};

export default function DigestPage() {
    const [digest, setDigest] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDigest = async () => {
            try {
                const { data } = await api.get('/digest');
                setDigest(data);
            } catch (err) {
                console.error('Failed to fetch digest', err);
            } finally {
                setLoading(false);
            }
        };
        loadDigest();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!digest) {
        return <p className="text-[#6E7781] text-center py-20">Failed to load digest.</p>;
    }

    return (
        <div data-testid="digest-page">
            <div className="mb-8">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#F1F3F5]">Daily Digest</h1>
                <p className="text-[#6E7781] text-sm mt-1">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Pipeline', value: digest.stats.total, icon: Users, color: 'text-[#F1F3F5]' },
                    { label: 'Hot', value: digest.stats.hot, icon: Fire, color: 'text-coral' },
                    { label: 'Warm', value: digest.stats.warm, icon: TrendUp, color: 'text-yellow-400' },
                    { label: 'Cold', value: digest.stats.cold, icon: Snowflake, color: 'text-ocean' },
                ].map((s, i) => (
                    <div key={i} className="bg-surface-card border border-white/5 rounded-2xl p-5 opacity-0 animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }} data-testid={`digest-stat-${s.label.toLowerCase().replace(' ', '-')}`}>
                        <s.icon weight="duotone" className={`w-6 h-6 ${s.color} mb-3`} />
                        <p className={`text-3xl font-heading font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[#6E7781] text-sm mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Due Today */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <CalendarDot weight="duotone" className="w-5 h-5 text-coral" />
                    <h2 className="font-heading text-lg font-semibold text-[#F1F3F5]">Due for Follow-Up Today</h2>
                    <Badge className="bg-coral/10 text-coral border-coral/20 rounded-full">{digest.due_today.length}</Badge>
                </div>
                {digest.due_today.length === 0 ? (
                    <div className="bg-surface-card border border-white/5 rounded-2xl p-8 text-center" data-testid="digest-due-empty">
                        <p className="text-[#6E7781]">No candidates due for follow-up today. Nice work!</p>
                    </div>
                ) : (
                    <div className="space-y-3" data-testid="digest-due-list">
                        {digest.due_today.map((c) => (
                            <div key={c.id} className="bg-surface-card border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4 min-w-0">
                                    <WarmthBadge warmth={c.warmth} />
                                    <div className="min-w-0">
                                        <p className="text-[#F1F3F5] font-medium text-sm truncate">{c.name}</p>
                                        <p className="text-[#6E7781] text-xs truncate">{c.role} &middot; {groupLabels[c.group] || c.group}</p>
                                    </div>
                                </div>
                                <Badge className={`rounded-full text-xs ${c.warmth === 'cold' ? 'bg-red-400/10 text-red-400 border-red-400/20' : 'bg-coral/10 text-coral border-coral/20'}`}>
                                    {c.warmth === 'cold' ? 'Going cold' : 'Due'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Going Cold */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <Warning weight="duotone" className="w-5 h-5 text-yellow-400" />
                    <h2 className="font-heading text-lg font-semibold text-[#F1F3F5]">Candidates Going Cold</h2>
                    <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20 rounded-full">{digest.going_cold.length}</Badge>
                </div>
                {digest.going_cold.length === 0 ? (
                    <div className="bg-surface-card border border-white/5 rounded-2xl p-8 text-center" data-testid="digest-cold-empty">
                        <p className="text-[#6E7781]">All candidates are warm. Keep it up!</p>
                    </div>
                ) : (
                    <div className="space-y-3" data-testid="digest-cold-list">
                        {digest.going_cold.map((c) => (
                            <div key={c.id} className="bg-surface-card border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4 min-w-0">
                                    <WarmthBadge warmth={c.warmth} />
                                    <div className="min-w-0">
                                        <p className="text-[#F1F3F5] font-medium text-sm truncate">{c.name}</p>
                                        <p className="text-[#6E7781] text-xs truncate">{c.role} &middot; {groupLabels[c.group] || c.group}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
