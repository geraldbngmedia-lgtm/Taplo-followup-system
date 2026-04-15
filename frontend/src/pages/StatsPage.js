import { useState, useEffect } from 'react';
import { Users, Fire, TrendUp, Snowflake, Thermometer } from '@phosphor-icons/react';
import { API } from '@/config';
import axios from 'axios';

const groupLabels = {
    silver_medallist: 'Silver Medallist',
    not_ready_yet: 'Not Ready Yet',
    pipeline: 'Pipeline',
    offer_declined: 'Offer Declined',
};

const groupColors = {
    silver_medallist: '#F97B5C',
    not_ready_yet: '#F1C40F',
    pipeline: '#4E9BE8',
    offer_declined: '#6E7781',
};

export default function StatsPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await axios.get(`${API}/stats`, { withCredentials: true });
                setStats(data);
            } catch (err) {
                console.error('Failed to fetch stats', err);
            }
            setLoading(false);
        };
        fetch();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!stats) {
        return <p className="text-[#6E7781] text-center py-20">Failed to load stats.</p>;
    }

    return (
        <div data-testid="stats-page">
            <div className="mb-8">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#F1F3F5]">Pipeline Stats</h1>
                <p className="text-[#6E7781] text-sm mt-1">Overview of your nurturing pipeline</p>
            </div>

            {/* Total */}
            <div className="bg-surface-card border border-white/5 rounded-2xl p-8 mb-8 text-center opacity-0 animate-fade-up" data-testid="stats-total-card">
                <Users weight="duotone" className="w-10 h-10 text-coral mx-auto mb-3" />
                <p className="text-5xl font-heading font-bold text-[#F1F3F5]">{stats.total}</p>
                <p className="text-[#6E7781] text-sm mt-2">Total Candidates Being Nurtured</p>
            </div>

            {/* Groups */}
            <h2 className="font-heading text-lg font-semibold text-[#F1F3F5] mb-4">By Group</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {Object.entries(stats.groups).map(([key, val], i) => (
                    <div key={key} className="bg-surface-card border border-white/5 rounded-2xl p-5 opacity-0 animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }} data-testid={`stats-group-${key}`}>
                        <div className="w-3 h-3 rounded-full mb-3" style={{ backgroundColor: groupColors[key] }} />
                        <p className="text-2xl font-heading font-bold text-[#F1F3F5]">{val}</p>
                        <p className="text-[#6E7781] text-sm mt-1">{groupLabels[key]}</p>
                    </div>
                ))}
            </div>

            {/* Warmth Distribution */}
            <h2 className="font-heading text-lg font-semibold text-[#F1F3F5] mb-4">Warmth Distribution</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { key: 'hot', label: 'Hot', icon: Fire, color: 'text-coral', bg: 'bg-coral' },
                    { key: 'warm', label: 'Warm', icon: TrendUp, color: 'text-yellow-400', bg: 'bg-yellow-400' },
                    { key: 'cool', label: 'Cool', icon: Thermometer, color: 'text-ocean', bg: 'bg-ocean' },
                    { key: 'cold', label: 'Cold', icon: Snowflake, color: 'text-[#6E7781]', bg: 'bg-[#6E7781]' },
                ].map((w, i) => (
                    <div key={w.key} className="bg-surface-card border border-white/5 rounded-2xl p-5 opacity-0 animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }} data-testid={`stats-warmth-${w.key}`}>
                        <w.icon weight="duotone" className={`w-6 h-6 ${w.color} mb-3`} />
                        <p className={`text-2xl font-heading font-bold ${w.color}`}>{stats.warmth[w.key]}</p>
                        <p className="text-[#6E7781] text-sm mt-1">{w.label}</p>
                        {stats.total > 0 && (
                            <div className="mt-3 w-full bg-white/5 rounded-full h-1.5">
                                <div className={`${w.bg} h-1.5 rounded-full transition-all`} style={{ width: `${(stats.warmth[w.key] / stats.total) * 100}%` }} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
