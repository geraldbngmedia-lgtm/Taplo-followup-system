import { useState, useEffect, useRef } from 'react';
import { PaperPlaneTilt, MagnifyingGlass, Briefcase, CalendarDot, Users, CalendarDots, ChartBar, SignOut, Lightning, Copy, CheckCircle } from '@phosphor-icons/react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_2aa63b04-78ab-456d-9fa0-9e31428b8786/artifacts/bvbae1hz_taplo-logo-inverted-rgb-3000px-w-72ppi.png";

const demoCandidates = [
    { id: 1, name: 'Sarah Chen', email: 'sarah.c@gmail.com', role: 'Senior Product Designer', group: 'silver_medallist', warmth: 'hot', lastContact: '2 days ago', nextFollowup: 'In 5 days', reason: 'Strong runner-up' },
    { id: 2, name: 'James Okonkwo', email: 'james.o@outlook.com', role: 'Full Stack Engineer', group: 'pipeline', warmth: 'warm', lastContact: '5 days ago', nextFollowup: 'In 5 days', reason: 'Future headcount' },
    { id: 3, name: 'Emma Lindqvist', email: 'emma.l@proton.me', role: 'Engineering Manager', group: 'not_ready_yet', warmth: 'cool', lastContact: '12 days ago', nextFollowup: 'Due now', reason: 'Needs more experience' },
    { id: 4, name: 'Raj Patel', email: 'raj.p@company.co', role: 'Data Scientist', group: 'offer_declined', warmth: 'cold', lastContact: '20 days ago', nextFollowup: 'Due now', reason: 'Accepted elsewhere' },
    { id: 5, name: 'Lisa Nakamura', email: 'lisa.n@email.com', role: 'DevOps Lead', group: 'silver_medallist', warmth: 'warm', lastContact: '6 days ago', nextFollowup: 'Tomorrow', reason: 'Close second choice' },
    { id: 6, name: 'Tom Eriksson', email: 'tom.e@tech.io', role: 'Frontend Developer', group: 'pipeline', warmth: 'hot', lastContact: '1 day ago', nextFollowup: 'In 9 days', reason: 'General interest' },
];

const groupLabels = { silver_medallist: 'Silver Medallist', not_ready_yet: 'Not Ready Yet', pipeline: 'Pipeline', offer_declined: 'Offer Declined' };
const groupColors = { silver_medallist: 'bg-[#F97B5C]/10 text-[#F97B5C] border-[#F97B5C]/20', not_ready_yet: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20', pipeline: 'bg-[#4E9BE8]/10 text-[#4E9BE8] border-[#4E9BE8]/20', offer_declined: 'bg-[#6E7781]/10 text-[#A0AAB2] border-[#6E7781]/20' };
const warmthConfig = { hot: { color: 'bg-[#F97B5C]', glow: 'shadow-[0_0_10px_rgba(249,123,92,0.5)]', label: 'Hot', text: 'text-[#F97B5C]' }, warm: { color: 'bg-yellow-400', glow: 'shadow-[0_0_8px_rgba(241,196,15,0.4)]', label: 'Warm', text: 'text-yellow-400' }, cool: { color: 'bg-[#4E9BE8]', glow: 'shadow-[0_0_6px_rgba(78,155,232,0.3)]', label: 'Cool', text: 'text-[#4E9BE8]' }, cold: { color: 'bg-[#6E7781]', glow: '', label: 'Cold', text: 'text-[#6E7781]' } };

const demoMessage = {
    subject: "Thinking of you — exciting things ahead at Acme",
    body: `Hi Sarah,

I hope you're doing well! I wanted to reach out because I've been thinking about our conversations during the interview process — your product thinking and design sensibility really stood out.

We have some exciting projects kicking off in Q2, and I'd love to keep you in the loop. No pressure at all — just wanted to make sure you know the door is always open.

Would you be open to a quick coffee chat sometime in the next couple of weeks?

Warm regards,
Alex`
};

const tabs = [
    { value: 'all', label: 'All' },
    { value: 'silver_medallist', label: 'Silver Medallist' },
    { value: 'not_ready_yet', label: 'Not Ready Yet' },
    { value: 'pipeline', label: 'Pipeline' },
    { value: 'offer_declined', label: 'Offer Declined' },
];

export default function LiveDemoSection() {
    const [activeTab, setActiveTab] = useState('all');
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [demoStep, setDemoStep] = useState('idle'); // idle, generating, generated
    const [typedText, setTypedText] = useState('');
    const [typedSubject, setTypedSubject] = useState('');
    const [copied, setCopied] = useState(false);
    const typingRef = useRef(null);

    const filtered = activeTab === 'all' ? demoCandidates : demoCandidates.filter(c => c.group === activeTab);

    const handleFollowUp = (candidate) => {
        setSelectedCandidate(candidate);
        setDemoStep('idle');
        setTypedText('');
        setTypedSubject('');
        setCopied(false);
    };

    const handleGenerate = () => {
        setDemoStep('generating');
        setTypedSubject('');
        setTypedText('');

        // Type subject first
        let subIdx = 0;
        const subjectInterval = setInterval(() => {
            if (subIdx <= demoMessage.subject.length) {
                setTypedSubject(demoMessage.subject.slice(0, subIdx));
                subIdx++;
            } else {
                clearInterval(subjectInterval);
                // Then type body
                let bodyIdx = 0;
                typingRef.current = setInterval(() => {
                    if (bodyIdx <= demoMessage.body.length) {
                        setTypedText(demoMessage.body.slice(0, bodyIdx));
                        bodyIdx += 2;
                    } else {
                        clearInterval(typingRef.current);
                        setDemoStep('generated');
                    }
                }, 12);
            }
        }, 25);
    };

    const handleBack = () => {
        if (typingRef.current) clearInterval(typingRef.current);
        setSelectedCandidate(null);
        setDemoStep('idle');
    };

    useEffect(() => {
        return () => { if (typingRef.current) clearInterval(typingRef.current); };
    }, []);

    return (
        <section className="py-24 md:py-32 border-t border-white/5 relative overflow-hidden" data-testid="live-demo-section">
            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                <div className="text-center mb-12">
                    <p className="text-xs tracking-[0.2em] uppercase font-bold text-ocean mb-4 font-heading">Live Preview</p>
                    <h2 className="font-heading text-3xl sm:text-4xl tracking-tight font-bold">See Taplo in action</h2>
                    <p className="text-[#A0AAB2] text-base mt-3 max-w-lg mx-auto">Click around — this is a real interactive preview of the dashboard</p>
                </div>

                {/* Dashboard Shell */}
                <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0A0C10] shadow-2xl shadow-black/40 max-w-5xl mx-auto" data-testid="demo-dashboard">
                    <div className="flex h-[520px]">
                        {/* Mini Sidebar */}
                        <div className="w-48 border-r border-[#2A2E39] bg-[#0A0C10] flex flex-col shrink-0 hidden md:flex">
                            <div className="p-4 border-b border-[#2A2E39]">
                                <img src={LOGO_URL} alt="Taplo" className="h-5" />
                            </div>
                            <nav className="p-3 space-y-0.5 flex-1">
                                {[
                                    { label: 'Pipeline', icon: Users, active: true },
                                    { label: 'Daily Digest', icon: CalendarDots, active: false },
                                    { label: 'Stats', icon: ChartBar, active: false },
                                ].map((item) => (
                                    <div key={item.label} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${item.active ? 'bg-[#F97B5C]/10 text-[#F97B5C]' : 'text-[#6E7781]'}`}>
                                        <item.icon weight={item.active ? 'fill' : 'regular'} className="w-4 h-4" />
                                        {item.label}
                                    </div>
                                ))}
                            </nav>
                            <div className="p-3 border-t border-[#2A2E39]">
                                <div className="flex items-center gap-2 px-3 py-1.5">
                                    <div className="w-6 h-6 rounded-full bg-[#4E9BE8]/20 flex items-center justify-center text-[#4E9BE8] text-[10px] font-bold">A</div>
                                    <span className="text-[#A0AAB2] text-xs truncate">Alex R.</span>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 p-5 overflow-y-auto">
                            {!selectedCandidate ? (
                                <>
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-heading text-base font-bold text-[#F1F3F5]">Candidate Pipeline</h3>
                                            <p className="text-[#6E7781] text-[11px]">{filtered.length} candidates being nurtured</p>
                                        </div>
                                        <button className="bg-[#F97B5C] text-[#0A0C10] text-[11px] font-medium px-3.5 py-1.5 rounded-full hover:bg-[#E86A4B] transition-colors">
                                            + Add Candidate
                                        </button>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex gap-1 mb-4 bg-[#12151C] p-1 rounded-lg overflow-x-auto" data-testid="demo-tabs">
                                        {tabs.map((t) => (
                                            <button
                                                key={t.value}
                                                onClick={() => setActiveTab(t.value)}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${activeTab === t.value ? 'bg-[#F97B5C]/10 text-[#F97B5C]' : 'text-[#6E7781] hover:text-[#A0AAB2]'}`}
                                                data-testid={`demo-tab-${t.value}`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Candidate Cards */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" data-testid="demo-candidate-grid">
                                        {filtered.map((c, i) => {
                                            const w = warmthConfig[c.warmth];
                                            const isOverdue = c.nextFollowup === 'Due now';
                                            return (
                                                <div
                                                    key={c.id}
                                                    className="bg-[#12151C] border border-white/5 rounded-xl p-4 hover:-translate-y-0.5 hover:border-[#2A2E39] transition-all duration-200 cursor-pointer"
                                                    style={{ animationDelay: `${i * 0.04}s` }}
                                                    data-testid={`demo-card-${c.id}`}
                                                >
                                                    <div className="flex items-center gap-2.5 mb-2.5">
                                                        <span className={`w-2.5 h-2.5 rounded-full ${w.color} ${w.glow} ${c.warmth === 'hot' ? 'animate-pulse' : ''}`} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[#F1F3F5] font-heading font-semibold text-sm truncate">{c.name}</p>
                                                            <p className="text-[#6E7781] text-[10px] truncate">{c.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[#A0AAB2] text-[11px] mb-1.5">
                                                        <Briefcase weight="duotone" className="w-3 h-3 text-[#6E7781]" />
                                                        {c.role}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[#A0AAB2] text-[11px] mb-3">
                                                        <CalendarDot weight="duotone" className="w-3 h-3 text-[#6E7781]" />
                                                        Contacted {c.lastContact}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                                                        <span className={`text-[10px] border rounded-full px-2 py-0.5 ${groupColors[c.group]}`}>
                                                            {groupLabels[c.group]}
                                                        </span>
                                                        <span className={`inline-flex items-center gap-1 text-[10px] ${w.text} bg-white/5 rounded-full px-2 py-0.5`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${w.color}`} />
                                                            {w.label}
                                                        </span>
                                                    </div>
                                                    <p className={`text-[10px] mb-3 ${isOverdue ? 'text-[#F97B5C] font-medium' : 'text-[#6E7781]'}`}>
                                                        Next follow-up: {c.nextFollowup}
                                                    </p>
                                                    <button
                                                        onClick={() => handleFollowUp(c)}
                                                        className="w-full bg-[#4E9BE8]/10 hover:bg-[#4E9BE8]/20 text-[#4E9BE8] rounded-full text-[11px] font-medium py-1.5 border border-[#4E9BE8]/20 transition-all flex items-center justify-center gap-1.5"
                                                        data-testid={`demo-followup-${c.id}`}
                                                    >
                                                        <PaperPlaneTilt weight="fill" className="w-3 h-3" />
                                                        Follow Up
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                /* Follow-Up View */
                                <div data-testid="demo-followup-view">
                                    <button onClick={handleBack} className="text-[#6E7781] text-xs hover:text-[#A0AAB2] mb-4 transition-colors" data-testid="demo-back-button">
                                        &larr; Back to pipeline
                                    </button>
                                    <div className="flex items-center gap-3 mb-5">
                                        <span className={`w-3 h-3 rounded-full ${warmthConfig[selectedCandidate.warmth].color} ${warmthConfig[selectedCandidate.warmth].glow}`} />
                                        <div>
                                            <h3 className="font-heading text-base font-bold text-[#F1F3F5]">Follow Up with {selectedCandidate.name}</h3>
                                            <p className="text-[#6E7781] text-[11px]">Generate a personalised AI message</p>
                                        </div>
                                    </div>

                                    {/* Context card */}
                                    <div className="bg-[#0A0C10] border border-[#2A2E39] rounded-xl p-3 mb-4 space-y-1.5 text-[11px]">
                                        <div className="flex justify-between"><span className="text-[#6E7781]">Role:</span><span className="text-[#F1F3F5]">{selectedCandidate.role}</span></div>
                                        <div className="flex justify-between"><span className="text-[#6E7781]">Group:</span><span className="text-[#F1F3F5]">{groupLabels[selectedCandidate.group]}</span></div>
                                        <div className="flex justify-between"><span className="text-[#6E7781]">Email:</span><span className="text-[#F1F3F5]">{selectedCandidate.email}</span></div>
                                    </div>

                                    {demoStep === 'idle' && (
                                        <button
                                            onClick={handleGenerate}
                                            className="w-full bg-[#4E9BE8] hover:bg-[#3D8AD7] text-[#0A0C10] rounded-full text-xs font-medium py-2.5 transition-colors flex items-center justify-center gap-2"
                                            data-testid="demo-generate-button"
                                        >
                                            <Lightning weight="fill" className="w-3.5 h-3.5" />
                                            Generate AI Message
                                        </button>
                                    )}

                                    {(demoStep === 'generating' || demoStep === 'generated') && (
                                        <div className="space-y-3">
                                            <div className="bg-[#0A0C10] border border-[#2A2E39] rounded-xl p-4">
                                                <p className="text-[10px] text-[#6E7781] mb-1">Subject</p>
                                                <p className="text-xs text-[#F1F3F5] font-medium mb-3" data-testid="demo-subject">
                                                    {typedSubject}<span className={demoStep === 'generating' && typedText.length === 0 ? 'inline-block w-0.5 h-3.5 bg-[#4E9BE8] ml-0.5 animate-pulse' : 'hidden'} />
                                                </p>
                                                <p className="text-[10px] text-[#6E7781] mb-1">Body</p>
                                                <pre className="text-xs text-[#A0AAB2] whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }} data-testid="demo-body">
                                                    {typedText}<span className={demoStep === 'generating' && typedText.length > 0 ? 'inline-block w-0.5 h-3.5 bg-[#4E9BE8] ml-0.5 animate-pulse' : 'hidden'} />
                                                </pre>
                                            </div>

                                            {demoStep === 'generated' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                                                        className="flex-1 border border-[#2A2E39] text-[#A0AAB2] hover:bg-white/5 rounded-full text-[11px] font-medium py-2 transition-all flex items-center justify-center gap-1.5"
                                                        data-testid="demo-copy-button"
                                                    >
                                                        {copied ? <><CheckCircle className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                                                    </button>
                                                    <button
                                                        className="flex-1 bg-[#F97B5C] hover:bg-[#E86A4B] text-[#0A0C10] rounded-full text-[11px] font-medium py-2 transition-colors flex items-center justify-center gap-1.5"
                                                        data-testid="demo-send-button"
                                                        onClick={handleBack}
                                                    >
                                                        <PaperPlaneTilt weight="fill" className="w-3 h-3" />
                                                        Open Email Client
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-center text-[#6E7781] text-xs mt-6">
                    Interactive demo with sample data &middot; Try clicking the tabs and Follow Up buttons
                </p>
            </div>
        </section>
    );
}
