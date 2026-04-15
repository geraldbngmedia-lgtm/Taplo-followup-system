import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, MagnifyingGlass, Funnel, X, PuzzlePiece, Lightning, Briefcase } from '@phosphor-icons/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import CandidateCard from '@/components/CandidateCard';
import AddCandidateDialog from '@/components/AddCandidateDialog';
import FollowUpDialog from '@/components/FollowUpDialog';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const tabGroups = [
    { value: 'all', label: 'All Candidates' },
    { value: 'silver_medallist', label: 'Silver Medallist' },
    { value: 'not_ready_yet', label: 'Not Ready Yet' },
    { value: 'pipeline', label: 'Pipeline' },
    { value: 'offer_declined', label: 'Offer Declined' },
];

export default function DashboardPipeline() {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('all');
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [followUpCandidate, setFollowUpCandidate] = useState(null);
    const [roleFilter, setRoleFilter] = useState('all');
    const [warmthFilter, setWarmthFilter] = useState('all');

    const fetchCandidates = useCallback(async () => {
        try {
            const params = tab !== 'all' ? { group: tab } : {};
            const { data } = await axios.get(`${API}/candidates`, { params, withCredentials: true });
            setCandidates(data);
        } catch (err) {
            console.error('Failed to fetch candidates', err);
        }
        setLoading(false);
    }, [tab]);

    useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

    const handleCandidateAdded = (newCandidate) => {
        setCandidates(prev => [newCandidate, ...prev]);
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API}/candidates/${id}`, { withCredentials: true });
            setCandidates(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Failed to delete candidate', err);
        }
    };

    const handleFollowUpSent = () => {
        fetchCandidates();
    };

    // Extract unique roles for the filter dropdown
    const uniqueRoles = useMemo(() => {
        const roles = [...new Set(candidates.map(c => c.role).filter(Boolean))].sort();
        return roles;
    }, [candidates]);

    const hasActiveFilters = roleFilter !== 'all' || warmthFilter !== 'all' || search.length > 0;

    const filtered = candidates.filter(c => {
        const matchesSearch = !search ||
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.role.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'all' || c.role === roleFilter;
        const matchesWarmth = warmthFilter === 'all' || c.warmth === warmthFilter;
        return matchesSearch && matchesRole && matchesWarmth;
    });

    const clearFilters = () => {
        setSearch('');
        setRoleFilter('all');
        setWarmthFilter('all');
    };

    const groupCounts = candidates.reduce((acc, c) => {
        acc[c.group] = (acc[c.group] || 0) + 1;
        acc.all = (acc.all || 0) + 1;
        return acc;
    }, { all: 0 });

    return (
        <div data-testid="dashboard-pipeline">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#F1F3F5]">Candidate Pipeline</h1>
                    <p className="text-[#6E7781] text-sm mt-1">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} being nurtured</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={() => setAddOpen(true)} className="bg-coral hover:bg-coral-hover text-surface-base rounded-full px-6 font-medium" data-testid="add-candidate-button">
                        <Plus className="w-4 h-4 mr-2" /> Add Candidate
                    </Button>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E7781] w-4 h-4" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, role, or email..."
                        className="pl-11 h-11 bg-surface-card border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-xl focus:border-ocean"
                        data-testid="pipeline-search-input"
                    />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-11 w-full sm:w-52 bg-surface-card border-[#2A2E39] text-[#F1F3F5] rounded-xl focus:border-ocean" data-testid="pipeline-role-filter">
                        <Funnel className="w-4 h-4 mr-2 text-[#6E7781] shrink-0" />
                        <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5] max-h-60">
                        <SelectItem value="all" className="focus:bg-white/5 focus:text-[#F1F3F5]">All Roles</SelectItem>
                        {uniqueRoles.map((r) => (
                            <SelectItem key={r} value={r} className="focus:bg-white/5 focus:text-[#F1F3F5]">{r}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={warmthFilter} onValueChange={setWarmthFilter}>
                    <SelectTrigger className="h-11 w-full sm:w-44 bg-surface-card border-[#2A2E39] text-[#F1F3F5] rounded-xl focus:border-ocean" data-testid="pipeline-warmth-filter">
                        <SelectValue placeholder="All Warmth" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5]">
                        <SelectItem value="all" className="focus:bg-white/5 focus:text-[#F1F3F5]">All Warmth</SelectItem>
                        <SelectItem value="hot" className="focus:bg-white/5 focus:text-[#F1F3F5]">
                            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-coral" />Hot</span>
                        </SelectItem>
                        <SelectItem value="warm" className="focus:bg-white/5 focus:text-[#F1F3F5]">
                            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400" />Warm</span>
                        </SelectItem>
                        <SelectItem value="cool" className="focus:bg-white/5 focus:text-[#F1F3F5]">
                            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-ocean" />Cool</span>
                        </SelectItem>
                        <SelectItem value="cold" className="focus:bg-white/5 focus:text-[#F1F3F5]">
                            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#6E7781]" />Cold</span>
                        </SelectItem>
                    </SelectContent>
                </Select>
                {hasActiveFilters && (
                    <Button
                        onClick={clearFilters}
                        variant="ghost"
                        className="h-11 text-[#6E7781] hover:text-[#F1F3F5] hover:bg-white/5 rounded-xl px-3 shrink-0"
                        data-testid="pipeline-clear-filters"
                    >
                        <X className="w-4 h-4 mr-1" /> Clear
                    </Button>
                )}
            </div>

            {/* Active filter badges */}
            {hasActiveFilters && (
                <div className="flex items-center gap-2 mb-4 flex-wrap" data-testid="pipeline-active-filters">
                    <span className="text-[#6E7781] text-xs">Showing {filtered.length} of {candidates.length}:</span>
                    {search && (
                        <Badge className="bg-white/5 text-[#A0AAB2] border-[#2A2E39] rounded-full text-xs cursor-pointer hover:bg-white/10" onClick={() => setSearch('')}>
                            Search: "{search}" <X className="w-3 h-3 ml-1" />
                        </Badge>
                    )}
                    {roleFilter !== 'all' && (
                        <Badge className="bg-ocean/10 text-ocean border-ocean/20 rounded-full text-xs cursor-pointer hover:bg-ocean/20" onClick={() => setRoleFilter('all')} data-testid="pipeline-role-filter-badge">
                            Role: {roleFilter} <X className="w-3 h-3 ml-1" />
                        </Badge>
                    )}
                    {warmthFilter !== 'all' && (
                        <Badge className="bg-coral/10 text-coral border-coral/20 rounded-full text-xs cursor-pointer hover:bg-coral/20" onClick={() => setWarmthFilter('all')} data-testid="pipeline-warmth-filter-badge">
                            Warmth: {warmthFilter} <X className="w-3 h-3 ml-1" />
                        </Badge>
                    )}
                </div>
            )}

            {/* Tabs */}
            <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="bg-surface-card border border-white/5 rounded-xl p-1 h-auto flex-wrap" data-testid="pipeline-tabs">
                    {tabGroups.map((t) => (
                        <TabsTrigger
                            key={t.value}
                            value={t.value}
                            className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-coral/10 data-[state=active]:text-coral data-[state=active]:shadow-none text-[#6E7781] font-medium"
                            data-testid={`pipeline-tab-${t.value}`}
                        >
                            {t.label}
                            {groupCounts[t.value] > 0 && (
                                <span className="ml-2 text-xs bg-white/5 px-2 py-0.5 rounded-full">
                                    {groupCounts[t.value]}
                                </span>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {tabGroups.map((t) => (
                    <TabsContent key={t.value} value={t.value} className="mt-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filtered.length === 0 && candidates.length === 0 ? (
                            <div className="py-8" data-testid="pipeline-onboarding">
                                <div className="text-center mb-8">
                                    <h2 className="font-heading text-xl font-bold text-[#F1F3F5] mb-2">Welcome to Taplo</h2>
                                    <p className="text-[#6E7781] text-sm">Get started in 3 easy steps</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    {[
                                        {
                                            num: '1',
                                            icon: PuzzlePiece,
                                            title: 'Install the Chrome Extension',
                                            desc: 'Go to the Extension page to get your API key and set up the Taplo Chrome extension.',
                                            action: <Link to="/dashboard/extension"><Button variant="outline" className="mt-3 border-ocean/30 text-ocean hover:bg-ocean/5 rounded-full text-xs" data-testid="onboarding-extension-btn"><PuzzlePiece className="w-3.5 h-3.5 mr-1.5" /> Set Up Extension</Button></Link>
                                        },
                                        {
                                            num: '2',
                                            icon: Briefcase,
                                            title: 'Add Your First Candidate',
                                            desc: 'Push a candidate from Teamtailor or LinkedIn using the extension, or add one manually.',
                                            action: <Button onClick={() => setAddOpen(true)} className="mt-3 bg-coral hover:bg-coral-hover text-surface-base rounded-full text-xs" data-testid="onboarding-add-btn"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Manually</Button>
                                        },
                                        {
                                            num: '3',
                                            icon: Lightning,
                                            title: 'Follow Up with AI',
                                            desc: 'Click "Follow Up" on any candidate to generate a personalised AI message and send it.',
                                            action: null
                                        },
                                    ].map((step) => (
                                        <div key={step.num} className="bg-surface-card border border-white/5 rounded-2xl p-6 text-center">
                                            <span className="text-3xl font-heading font-bold text-white/10 block mb-3">{step.num}</span>
                                            <step.icon weight="duotone" className="w-7 h-7 text-coral mx-auto mb-3" />
                                            <h3 className="font-heading text-sm font-semibold text-[#F1F3F5] mb-2">{step.title}</h3>
                                            <p className="text-[#6E7781] text-xs leading-relaxed">{step.desc}</p>
                                            {step.action}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-20" data-testid="pipeline-empty">
                                <Funnel weight="duotone" className="w-12 h-12 text-[#2A2E39] mx-auto mb-4" />
                                <p className="text-[#6E7781] text-lg font-heading">No matching candidates</p>
                                <p className="text-[#6E7781] text-sm mt-1">Try adjusting your filters or search</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filtered.map((c, i) => (
                                    <CandidateCard
                                        key={c.id}
                                        candidate={c}
                                        index={i}
                                        onFollowUp={() => setFollowUpCandidate(c)}
                                        onDelete={() => handleDelete(c.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>

            <AddCandidateDialog open={addOpen} onOpenChange={setAddOpen} onCandidateAdded={handleCandidateAdded} />
            <FollowUpDialog
                open={!!followUpCandidate}
                onOpenChange={(v) => { if (!v) setFollowUpCandidate(null); }}
                candidate={followUpCandidate}
                onFollowUpSent={handleFollowUpSent}
            />
        </div>
    );
}
