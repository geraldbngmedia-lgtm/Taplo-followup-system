import { useState, useEffect, useCallback } from 'react';
import { Plus, MagnifyingGlass, Funnel } from '@phosphor-icons/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

    const filtered = candidates.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.role.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    );

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
                <Button onClick={() => setAddOpen(true)} className="bg-coral hover:bg-coral-hover text-surface-base rounded-full px-6 font-medium" data-testid="add-candidate-button">
                    <Plus className="w-4 h-4 mr-2" /> Add Candidate
                </Button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E7781] w-4 h-4" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, role, or email..."
                    className="pl-11 h-11 bg-surface-card border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-xl focus:border-ocean"
                    data-testid="pipeline-search-input"
                />
            </div>

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
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-20" data-testid="pipeline-empty">
                                <Funnel weight="duotone" className="w-12 h-12 text-[#2A2E39] mx-auto mb-4" />
                                <p className="text-[#6E7781] text-lg font-heading">No candidates yet</p>
                                <p className="text-[#6E7781] text-sm mt-1">Add your first candidate to start nurturing</p>
                                <Button onClick={() => setAddOpen(true)} className="mt-4 bg-coral hover:bg-coral-hover text-surface-base rounded-full px-6 font-medium" data-testid="empty-add-candidate-button">
                                    <Plus className="w-4 h-4 mr-2" /> Add Candidate
                                </Button>
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
