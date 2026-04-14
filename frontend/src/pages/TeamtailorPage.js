import { useState, useEffect, useCallback } from 'react';
import { ArrowsClockwise, PlugsConnected, Plug, Trash, CloudArrowDown, CheckCircle, XCircle, Warning, UserPlus, Briefcase, Shield } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const groups = [
    { value: 'silver_medallist', label: 'Silver Medallist' },
    { value: 'not_ready_yet', label: 'Not Ready Yet' },
    { value: 'pipeline', label: 'Pipeline' },
    { value: 'offer_declined', label: 'Offer Declined' },
];

export default function TeamtailorPage() {
    const [status, setStatus] = useState(null);
    const [apiKey, setApiKey] = useState('');
    const [connecting, setConnecting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [connectError, setConnectError] = useState('');
    const [syncResults, setSyncResults] = useState(null);

    // Candidates & Jobs tabs
    const [ttCandidates, setTtCandidates] = useState([]);
    const [ttJobs, setTtJobs] = useState([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [loadingJobs, setLoadingJobs] = useState(false);

    // Import
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importGroup, setImportGroup] = useState('pipeline');
    const [importReason, setImportReason] = useState('');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [selectAll, setSelectAll] = useState(false);

    // Active view tab
    const [viewTab, setViewTab] = useState('candidates');

    const fetchStatus = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API}/teamtailor/status`, { withCredentials: true });
            setStatus(data);
            if (data.last_sync_results) setSyncResults(data.last_sync_results);
        } catch { setStatus({ connected: false, has_key: false }); }
    }, []);

    const fetchCandidates = useCallback(async () => {
        setLoadingCandidates(true);
        try {
            const { data } = await axios.get(`${API}/teamtailor/candidates`, { withCredentials: true });
            setTtCandidates(data);
        } catch (err) { console.error('Failed to fetch TT candidates', err); }
        setLoadingCandidates(false);
    }, []);

    const fetchJobs = useCallback(async () => {
        setLoadingJobs(true);
        try {
            const { data } = await axios.get(`${API}/teamtailor/jobs`, { withCredentials: true });
            setTtJobs(data);
        } catch (err) { console.error('Failed to fetch TT jobs', err); }
        setLoadingJobs(false);
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    useEffect(() => {
        if (status?.connected) {
            fetchCandidates();
            fetchJobs();
        }
    }, [status?.connected, fetchCandidates, fetchJobs]);

    const handleConnect = async () => {
        if (!apiKey.trim()) return;
        setConnecting(true);
        setConnectError('');
        try {
            const { data } = await axios.post(`${API}/teamtailor/connect`, { api_key: apiKey }, { withCredentials: true });
            setStatus({ connected: true, has_key: true, company_name: data.company_name });
            setApiKey('');
        } catch (err) {
            setConnectError(err.response?.data?.detail || 'Failed to connect');
        }
        setConnecting(false);
    };

    const handleDisconnect = async () => {
        try {
            await axios.delete(`${API}/teamtailor/disconnect`, { withCredentials: true });
            setStatus({ connected: false, has_key: false });
            setTtCandidates([]);
            setTtJobs([]);
            setSyncResults(null);
        } catch (err) { console.error(err); }
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncResults(null);
        try {
            const { data } = await axios.post(`${API}/teamtailor/sync`, {}, { withCredentials: true });
            setSyncResults(data.results);
            fetchCandidates();
            fetchJobs();
            fetchStatus();
        } catch (err) {
            console.error('Sync failed', err);
        }
        setSyncing(false);
    };

    const toggleSelect = (ttId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(ttId)) next.delete(ttId);
            else next.add(ttId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedIds(new Set());
        } else {
            const importable = ttCandidates.filter(c => !c.already_imported && c.has_consent).map(c => c.tt_id);
            setSelectedIds(new Set(importable));
        }
        setSelectAll(!selectAll);
    };

    const handleImport = async () => {
        if (selectedIds.size === 0) return;
        setImporting(true);
        setImportResult(null);
        try {
            const { data } = await axios.post(`${API}/teamtailor/import`, {
                candidate_tt_ids: Array.from(selectedIds),
                group: importGroup,
                reason: importReason,
            }, { withCredentials: true });
            setImportResult(data);
            setSelectedIds(new Set());
            setSelectAll(false);
            fetchCandidates();
        } catch (err) { console.error(err); }
        setImporting(false);
    };

    const importableCandidates = ttCandidates.filter(c => !c.already_imported && c.has_consent);

    return (
        <div data-testid="teamtailor-page">
            <div className="mb-8">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#F1F3F5]">Teamtailor Integration</h1>
                <p className="text-[#6E7781] text-sm mt-1">Connect your ATS to import and sync candidates</p>
            </div>

            {/* Connection Card */}
            <div className="bg-surface-card border border-white/5 rounded-2xl p-6 mb-6" data-testid="tt-connection-card">
                {status?.connected ? (
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <PlugsConnected weight="duotone" className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-[#F1F3F5] font-medium font-heading">Connected to Teamtailor</p>
                                <p className="text-[#6E7781] text-sm">{status.company_name || 'Company'} &middot; EU Region</p>
                                {status.last_sync && (
                                    <p className="text-[#6E7781] text-xs mt-0.5">Last sync: {new Date(status.last_sync).toLocaleString()}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={handleSync}
                                disabled={syncing}
                                className="bg-ocean hover:bg-ocean-hover text-surface-base rounded-full font-medium"
                                data-testid="tt-sync-button"
                            >
                                <ArrowsClockwise className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                {syncing ? 'Syncing...' : 'Sync Now'}
                            </Button>
                            <Button
                                onClick={handleDisconnect}
                                variant="outline"
                                className="border-red-400/30 text-red-400 hover:bg-red-400/5 rounded-full"
                                data-testid="tt-disconnect-button"
                            >
                                <Trash className="w-4 h-4 mr-2" />
                                Disconnect
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-[#1A1E27] flex items-center justify-center">
                                <Plug weight="duotone" className="w-6 h-6 text-[#6E7781]" />
                            </div>
                            <div>
                                <p className="text-[#F1F3F5] font-medium font-heading">Connect Teamtailor</p>
                                <p className="text-[#6E7781] text-sm">Enter your Admin-scoped API key to get started</p>
                            </div>
                        </div>
                        <div className="flex gap-3 max-w-xl">
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Enter your Teamtailor API key"
                                className="flex-1 h-11 bg-surface-base border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg focus:border-ocean"
                                data-testid="tt-api-key-input"
                            />
                            <Button
                                onClick={handleConnect}
                                disabled={connecting || !apiKey.trim()}
                                className="bg-coral hover:bg-coral-hover text-surface-base rounded-full px-6 font-medium"
                                data-testid="tt-connect-button"
                            >
                                {connecting ? 'Connecting...' : 'Connect'}
                            </Button>
                        </div>
                        {connectError && <p className="text-red-400 text-sm mt-3" data-testid="tt-connect-error">{connectError}</p>}
                        <div className="mt-4 p-4 bg-surface-base rounded-xl border border-[#2A2E39]">
                            <p className="text-[#A0AAB2] text-sm font-medium mb-2">How to get your API key:</p>
                            <ol className="text-[#6E7781] text-sm space-y-1 list-decimal list-inside">
                                <li>Go to your Teamtailor account &rarr; Settings &rarr; Integrations &rarr; API keys</li>
                                <li>Create a new key with <span className="text-ocean font-medium">Admin Read/Write</span> scope</li>
                                <li>Copy the key and paste it above</li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>

            {/* Sync Results */}
            {syncResults && (
                <div className="bg-surface-card border border-white/5 rounded-2xl p-6 mb-6 opacity-0 animate-fade-up" data-testid="tt-sync-results">
                    <h3 className="font-heading text-lg font-semibold text-[#F1F3F5] mb-4">Last Sync Results</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { label: 'Candidates', value: syncResults.candidates },
                            { label: 'Jobs', value: syncResults.jobs },
                            { label: 'Stages', value: syncResults.stages },
                            { label: 'Applications', value: syncResults.applications },
                            { label: 'Custom Fields', value: syncResults.custom_fields },
                        ].map((s, i) => (
                            <div key={i} className="text-center p-3 bg-surface-base rounded-xl border border-[#2A2E39]">
                                <p className="text-xl font-heading font-bold text-[#F1F3F5]">{s.value}</p>
                                <p className="text-[#6E7781] text-xs">{s.label}</p>
                            </div>
                        ))}
                    </div>
                    {syncResults.errors?.length > 0 && (
                        <div className="mt-4 p-3 bg-red-400/5 border border-red-400/20 rounded-xl">
                            <p className="text-red-400 text-sm font-medium mb-1">Sync Errors:</p>
                            {syncResults.errors.map((e, i) => <p key={i} className="text-red-400/80 text-xs">{e}</p>)}
                        </div>
                    )}
                </div>
            )}

            {/* Data Tabs */}
            {status?.connected && (
                <>
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setViewTab('candidates')}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${viewTab === 'candidates' ? 'bg-coral/10 text-coral' : 'text-[#6E7781] hover:text-[#A0AAB2] hover:bg-white/5'}`}
                            data-testid="tt-tab-candidates"
                        >
                            Candidates ({ttCandidates.length})
                        </button>
                        <button
                            onClick={() => setViewTab('jobs')}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${viewTab === 'jobs' ? 'bg-ocean/10 text-ocean' : 'text-[#6E7781] hover:text-[#A0AAB2] hover:bg-white/5'}`}
                            data-testid="tt-tab-jobs"
                        >
                            Jobs ({ttJobs.length})
                        </button>
                    </div>

                    {/* Candidates View */}
                    {viewTab === 'candidates' && (
                        <div>
                            {/* Import bar */}
                            {importableCandidates.length > 0 && (
                                <div className="flex items-center justify-between bg-surface-card border border-white/5 rounded-xl p-4 mb-4" data-testid="tt-import-bar">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={selectAll}
                                            onCheckedChange={toggleSelectAll}
                                            className="data-[state=checked]:bg-coral"
                                            data-testid="tt-select-all-switch"
                                        />
                                        <span className="text-sm text-[#A0AAB2]">
                                            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all importable'}
                                        </span>
                                    </div>
                                    <Button
                                        onClick={() => setImportDialogOpen(true)}
                                        disabled={selectedIds.size === 0}
                                        className="bg-coral hover:bg-coral-hover text-surface-base rounded-full font-medium"
                                        data-testid="tt-import-button"
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Import to Taplo ({selectedIds.size})
                                    </Button>
                                </div>
                            )}

                            {loadingCandidates ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : ttCandidates.length === 0 ? (
                                <div className="text-center py-16 bg-surface-card border border-white/5 rounded-2xl">
                                    <CloudArrowDown weight="duotone" className="w-12 h-12 text-[#2A2E39] mx-auto mb-4" />
                                    <p className="text-[#6E7781] text-lg font-heading">No candidates synced yet</p>
                                    <p className="text-[#6E7781] text-sm mt-1">Click "Sync Now" to pull candidates from Teamtailor</p>
                                </div>
                            ) : (
                                <div className="space-y-2" data-testid="tt-candidates-list">
                                    {ttCandidates.map((c) => {
                                        const isSelected = selectedIds.has(c.tt_id);
                                        const canImport = !c.already_imported && c.has_consent;
                                        return (
                                            <div
                                                key={c.tt_id}
                                                className={`bg-surface-card border rounded-xl p-4 flex items-center justify-between transition-all ${isSelected ? 'border-coral/40' : 'border-white/5'} ${!canImport ? 'opacity-60' : ''}`}
                                                data-testid={`tt-candidate-${c.tt_id}`}
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    {canImport && (
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelect(c.tt_id)}
                                                            className="w-4 h-4 rounded border-[#2A2E39] accent-coral"
                                                            data-testid={`tt-candidate-check-${c.tt_id}`}
                                                        />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-[#F1F3F5] font-medium text-sm truncate">{c.full_name || 'Unknown'}</p>
                                                        <p className="text-[#6E7781] text-xs truncate">{c.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {c.latest_role && c.latest_role !== 'No applications' && (
                                                        <Badge className="bg-ocean/10 text-ocean border-ocean/20 rounded-full text-xs hidden md:flex">
                                                            <Briefcase className="w-3 h-3 mr-1" />
                                                            {c.latest_role}
                                                        </Badge>
                                                    )}
                                                    {c.latest_stage && (
                                                        <Badge className="bg-white/5 text-[#A0AAB2] border-[#2A2E39] rounded-full text-xs hidden lg:flex">
                                                            {c.latest_stage}
                                                        </Badge>
                                                    )}
                                                    {c.has_consent ? (
                                                        <Shield weight="fill" className="w-4 h-4 text-green-400" title="GDPR consent" />
                                                    ) : (
                                                        <Shield weight="duotone" className="w-4 h-4 text-red-400" title="No GDPR consent" />
                                                    )}
                                                    {c.already_imported ? (
                                                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 rounded-full text-xs">
                                                            <CheckCircle className="w-3 h-3 mr-1" /> Imported
                                                        </Badge>
                                                    ) : !c.has_consent ? (
                                                        <Badge className="bg-red-400/10 text-red-400 border-red-400/20 rounded-full text-xs">
                                                            <XCircle className="w-3 h-3 mr-1" /> No consent
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Jobs View */}
                    {viewTab === 'jobs' && (
                        <div>
                            {loadingJobs ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-8 h-8 border-2 border-ocean border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : ttJobs.length === 0 ? (
                                <div className="text-center py-16 bg-surface-card border border-white/5 rounded-2xl">
                                    <Briefcase weight="duotone" className="w-12 h-12 text-[#2A2E39] mx-auto mb-4" />
                                    <p className="text-[#6E7781] text-lg font-heading">No jobs synced yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2" data-testid="tt-jobs-list">
                                    {ttJobs.map((j) => (
                                        <div key={j.tt_id} className="bg-surface-card border border-white/5 rounded-xl p-4 flex items-center justify-between" data-testid={`tt-job-${j.tt_id}`}>
                                            <div className="min-w-0">
                                                <p className="text-[#F1F3F5] font-medium text-sm">{j.title}</p>
                                                <p className="text-[#6E7781] text-xs">{[j.department, j.location].filter(Boolean).join(' · ')}</p>
                                            </div>
                                            <Badge className={`rounded-full text-xs ${j.status === 'open' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 text-[#6E7781] border-[#2A2E39]'}`}>
                                                {j.status || 'unknown'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Import Dialog */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5] max-w-md" data-testid="tt-import-dialog">
                    <DialogHeader>
                        <DialogTitle className="font-heading text-xl">Import {selectedIds.size} Candidate{selectedIds.size !== 1 ? 's' : ''}</DialogTitle>
                        <DialogDescription className="text-[#6E7781]">
                            Choose how to categorise these candidates in your Taplo pipeline
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Pipeline Group</Label>
                            <Select value={importGroup} onValueChange={setImportGroup}>
                                <SelectTrigger className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg" data-testid="tt-import-group-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5]">
                                    {groups.map((g) => (
                                        <SelectItem key={g.value} value={g.value} className="focus:bg-white/5 focus:text-[#F1F3F5]">{g.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Reason (optional)</Label>
                            <Input
                                value={importReason}
                                onChange={(e) => setImportReason(e.target.value)}
                                className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg focus:border-ocean"
                                placeholder="e.g., Strong culture fit"
                                data-testid="tt-import-reason-input"
                            />
                        </div>

                        {importResult && (
                            <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                                <p className="text-green-400 text-sm">Imported {importResult.imported} candidate{importResult.imported !== 1 ? 's' : ''}{importResult.skipped > 0 ? `, ${importResult.skipped} skipped (already imported)` : ''}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={() => setImportDialogOpen(false)} className="flex-1 border-[#2A2E39] text-[#A0AAB2] hover:bg-white/5 rounded-full" data-testid="tt-import-cancel">
                                Cancel
                            </Button>
                            <Button onClick={handleImport} disabled={importing} className="flex-1 bg-coral hover:bg-coral-hover text-surface-base rounded-full font-medium" data-testid="tt-import-confirm">
                                {importing ? 'Importing...' : `Import ${selectedIds.size}`}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
