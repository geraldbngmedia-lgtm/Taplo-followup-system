import { useState, useEffect, useCallback } from 'react';
import { PuzzlePiece, Key, ArrowsClockwise, Copy, CheckCircle, Globe, Code, Lightning, Briefcase } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ExtensionPage() {
    const [extKey, setExtKey] = useState('');
    const [pushCount, setPushCount] = useState(0);
    const [recentPushes, setRecentPushes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [showKey, setShowKey] = useState(false);

    const fetchKey = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API}/extension/key`, { withCredentials: true });
            setExtKey(data.ext_key);
            setPushCount(data.push_count);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, []);

    const fetchRecent = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API}/extension/recent-pushes`, { withCredentials: true });
            setRecentPushes(data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => { fetchKey(); fetchRecent(); }, [fetchKey, fetchRecent]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(extKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRegenerate = async () => {
        setRegenerating(true);
        try {
            const { data } = await axios.post(`${API}/extension/regenerate-key`, {}, { withCredentials: true });
            setExtKey(data.ext_key);
            setShowKey(true);
        } catch (err) { console.error(err); }
        setRegenerating(false);
    };

    const maskedKey = extKey ? `${extKey.slice(0, 12)}${'•'.repeat(20)}${extKey.slice(-6)}` : '';

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div data-testid="extension-page">
            <div className="mb-8">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#F1F3F5]">Chrome Extension</h1>
                <p className="text-[#6E7781] text-sm mt-1">Push candidates from Teamtailor directly into Taplo</p>
            </div>

            {/* How it Works */}
            <div className="bg-surface-card border border-white/5 rounded-2xl p-6 mb-6" data-testid="extension-how-it-works">
                <h2 className="font-heading text-lg font-semibold text-[#F1F3F5] mb-4">How it works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { num: '1', icon: Globe, title: 'Browse Teamtailor', desc: 'Open any candidate profile in your Teamtailor dashboard' },
                        { num: '2', icon: PuzzlePiece, title: 'Click the Extension', desc: 'Hit the Taplo extension icon in your browser toolbar' },
                        { num: '3', icon: Lightning, title: 'Candidate Pushed', desc: 'The candidate data is instantly pushed into your Taplo pipeline' },
                    ].map((step) => (
                        <div key={step.num} className="flex gap-4">
                            <span className="text-2xl font-heading font-bold text-white/10 shrink-0">{step.num}</span>
                            <div>
                                <step.icon weight="duotone" className="w-6 h-6 text-coral mb-2" />
                                <h3 className="text-[#F1F3F5] font-medium text-sm mb-1">{step.title}</h3>
                                <p className="text-[#6E7781] text-xs leading-relaxed">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Extension API Key */}
            <div className="bg-surface-card border border-white/5 rounded-2xl p-6 mb-6" data-testid="extension-key-card">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-ocean/10 flex items-center justify-center">
                        <Key weight="duotone" className="w-5 h-5 text-ocean" />
                    </div>
                    <div>
                        <h2 className="font-heading text-lg font-semibold text-[#F1F3F5]">Extension API Key</h2>
                        <p className="text-[#6E7781] text-xs">Configure your Chrome extension with this key</p>
                    </div>
                </div>

                <div className="bg-surface-base border border-[#2A2E39] rounded-xl p-4 mb-4">
                    <p className="text-xs text-[#6E7781] mb-2">Your Key</p>
                    <div className="flex items-center gap-3">
                        <code className="flex-1 text-sm text-[#F1F3F5] font-mono bg-transparent break-all" data-testid="extension-key-display">
                            {showKey ? extKey : maskedKey}
                        </code>
                        <Button
                            onClick={() => setShowKey(!showKey)}
                            variant="ghost"
                            className="text-[#6E7781] hover:text-[#A0AAB2] text-xs shrink-0"
                            data-testid="extension-toggle-key"
                        >
                            {showKey ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                            onClick={handleCopy}
                            variant="outline"
                            className="border-[#2A2E39] text-[#A0AAB2] hover:bg-white/5 rounded-full text-xs shrink-0"
                            data-testid="extension-copy-key"
                        >
                            {copied ? <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy</>}
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-[#6E7781]">Candidates pushed: <span className="text-[#F1F3F5] font-medium">{pushCount}</span></span>
                    </div>
                    <Button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        variant="outline"
                        className="border-[#2A2E39] text-[#A0AAB2] hover:bg-white/5 rounded-full text-sm"
                        data-testid="extension-regenerate-key"
                    >
                        <ArrowsClockwise className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                        Regenerate Key
                    </Button>
                </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-surface-card border border-white/5 rounded-2xl p-6 mb-6" data-testid="extension-setup">
                <div className="flex items-center gap-3 mb-4">
                    <Code weight="duotone" className="w-5 h-5 text-coral" />
                    <h2 className="font-heading text-lg font-semibold text-[#F1F3F5]">Extension Setup</h2>
                </div>
                <div className="space-y-4 text-sm">
                    <div className="bg-surface-base border border-[#2A2E39] rounded-xl p-4">
                        <p className="text-[#A0AAB2] mb-2">The extension sends candidate data to this endpoint:</p>
                        <code className="block text-ocean text-xs font-mono bg-[#0A0C10] rounded-lg p-3 border border-[#2A2E39]">
                            POST {process.env.REACT_APP_BACKEND_URL}/api/extension/push-candidate
                        </code>
                    </div>
                    <div className="bg-surface-base border border-[#2A2E39] rounded-xl p-4">
                        <p className="text-[#A0AAB2] mb-2">Required header:</p>
                        <code className="block text-ocean text-xs font-mono bg-[#0A0C10] rounded-lg p-3 border border-[#2A2E39]">
                            X-Extension-Key: {showKey ? extKey : 'your-extension-key'}
                        </code>
                    </div>
                    <div className="bg-surface-base border border-[#2A2E39] rounded-xl p-4">
                        <p className="text-[#A0AAB2] mb-2">JSON body fields:</p>
                        <pre className="text-[#6E7781] text-xs font-mono bg-[#0A0C10] rounded-lg p-3 border border-[#2A2E39] overflow-x-auto">{`{
  "name": "Sarah Chen",          // required
  "email": "sarah@example.com",  // required
  "role": "Product Designer",    // optional
  "phone": "+44...",             // optional
  "stage": "Rejected",          // optional
  "tags": ["senior", "design"], // optional
  "notes": "Great candidate",   // optional
  "gdpr_consent": true,         // optional (default: true)
  "tt_candidate_id": "12345",   // optional
  "tt_profile_url": "https://..." // optional
}`}</pre>
                    </div>
                </div>
            </div>

            {/* Recent Pushes */}
            <div data-testid="extension-recent-pushes">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-heading text-lg font-semibold text-[#F1F3F5]">Recently Pushed</h2>
                    <Button onClick={fetchRecent} variant="ghost" className="text-[#6E7781] hover:text-[#A0AAB2] text-sm" data-testid="extension-refresh-pushes">
                        <ArrowsClockwise className="w-4 h-4 mr-1.5" /> Refresh
                    </Button>
                </div>
                {recentPushes.length === 0 ? (
                    <div className="bg-surface-card border border-white/5 rounded-2xl p-8 text-center">
                        <PuzzlePiece weight="duotone" className="w-10 h-10 text-[#2A2E39] mx-auto mb-3" />
                        <p className="text-[#6E7781] text-sm">No candidates pushed yet</p>
                        <p className="text-[#6E7781] text-xs mt-1">Use the Chrome extension while browsing Teamtailor to push candidates here</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentPushes.map((c) => (
                            <div key={c.id} className="bg-surface-card border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <PuzzlePiece weight="duotone" className="w-4 h-4 text-ocean shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[#F1F3F5] font-medium text-sm truncate">{c.name}</p>
                                        <p className="text-[#6E7781] text-xs truncate">{c.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {c.role && (
                                        <Badge className="bg-ocean/10 text-ocean border-ocean/20 rounded-full text-xs hidden md:flex">
                                            <Briefcase className="w-3 h-3 mr-1" />{c.role}
                                        </Badge>
                                    )}
                                    <span className="text-[#6E7781] text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
