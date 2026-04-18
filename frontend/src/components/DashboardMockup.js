import { useState, useEffect, useRef } from 'react';
import { PaperPlaneTilt, Briefcase, CalendarDot, Users, CalendarDots, ChartBar, MagnifyingGlass, Plus, Lightning, CursorClick } from '@phosphor-icons/react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_2aa63b04-78ab-456d-9fa0-9e31428b8786/artifacts/bvbae1hz_taplo-logo-inverted-rgb-3000px-w-72ppi.png";

const candidates = [
    { name: 'Sarah Chen', role: 'Senior Product Designer', group: 'silver_medallist', warmth: 'hot', lastContact: '2d ago', nextFu: 'Apr 21' },
    { name: 'James Okonkwo', role: 'Full Stack Engineer', group: 'pipeline', warmth: 'warm', lastContact: '5d ago', nextFu: 'Apr 24' },
    { name: 'Emma Lindqvist', role: 'Engineering Manager', group: 'not_ready_yet', warmth: 'cool', lastContact: '12d ago', nextFu: 'Due now' },
];

const groupColors = { silver_medallist: 'bg-[#F97B5C]/15 text-[#F97B5C]', pipeline: 'bg-[#4E9BE8]/15 text-[#4E9BE8]', not_ready_yet: 'bg-yellow-400/15 text-yellow-400' };
const groupLabels = { silver_medallist: 'Silver Medallist', pipeline: 'Pipeline', not_ready_yet: 'Not Ready Yet' };
const warmthDot = { hot: 'bg-[#F97B5C] shadow-[0_0_8px_rgba(249,123,92,0.6)]', warm: 'bg-yellow-400 shadow-[0_0_6px_rgba(241,196,15,0.4)]', cool: 'bg-[#4E9BE8] shadow-[0_0_5px_rgba(78,155,232,0.3)]' };
const warmthLabel = { hot: 'Hot', warm: 'Warm', cool: 'Cool' };
const warmthText = { hot: 'text-[#F97B5C]', warm: 'text-yellow-400', cool: 'text-[#4E9BE8]' };

// Timeline: [x%, y%, duration_ms, action]
const timeline = [
    { x: 50, y: 30, dur: 800, action: 'idle' },           // Start center
    { x: 28, y: 22, dur: 700, action: 'hover-tab-1' },    // Move to Silver Medallist tab
    { x: 28, y: 22, dur: 400, action: 'click-tab-1' },    // Click it
    { x: 28, y: 22, dur: 1200, action: 'show-tab-1' },    // Show filtered
    { x: 14, y: 22, dur: 600, action: 'hover-tab-0' },    // Move to All tab
    { x: 14, y: 22, dur: 400, action: 'click-tab-0' },    // Click All
    { x: 14, y: 22, dur: 800, action: 'show-tab-0' },     // Show all
    { x: 24, y: 48, dur: 700, action: 'hover-card-0' },   // Move to Sarah's card
    { x: 24, y: 48, dur: 1000, action: 'highlight-card-0' }, // Highlight her card
    { x: 24, y: 72, dur: 500, action: 'hover-followup-0' }, // Move to Follow Up btn
    { x: 24, y: 72, dur: 400, action: 'click-followup' },  // Click it
    { x: 50, y: 50, dur: 600, action: 'show-ai' },         // Show AI panel
    { x: 55, y: 65, dur: 700, action: 'hover-send' },      // Move to send btn
    { x: 55, y: 65, dur: 400, action: 'click-send' },      // Click send
    { x: 55, y: 65, dur: 1200, action: 'show-sent' },      // Show sent state
    { x: 50, y: 30, dur: 800, action: 'reset' },           // Reset
];

function Cursor({ x, y, clicking }) {
    return (
        <div
            className="absolute z-50 pointer-events-none"
            style={{
                left: `${x}%`,
                top: `${y}%`,
                transition: 'left 0.6s cubic-bezier(0.4, 0, 0.2, 1), top 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: 'translate(-2px, -2px)',
            }}
        >
            <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className={`drop-shadow-lg transition-transform duration-150 ${clicking ? 'scale-90' : 'scale-100'}`}>
                <path d="M1 1L1 17.5L5.5 13.5L9 21L12 19.5L8.5 12H14.5L1 1Z" fill="white" stroke="#0A0C10" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            {clicking && (
                <span className="absolute top-3 left-3 w-4 h-4 rounded-full bg-white/20 animate-ping" />
            )}
        </div>
    );
}

export default function DashboardMockup() {
    const [step, setStep] = useState(0);
    const [cursorPos, setCursorPos] = useState({ x: 50, y: 30 });
    const [clicking, setClicking] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [hoveredCard, setHoveredCard] = useState(-1);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [aiTyping, setAiTyping] = useState('');
    const [sentState, setSentState] = useState(false);
    const timerRef = useRef(null);
    const typingRef = useRef(null);

    const aiSubject = "Thinking of you — exciting roles ahead";
    const aiBody = "Hi Sarah,\n\nI hope you're doing well! I've been thinking about our conversations — your product thinking really stood out.\n\nWe have exciting projects in Q2. Would you be open to a quick chat?\n\nBest,\nAlex";

    useEffect(() => {
        const runStep = (idx) => {
            const s = timeline[idx % timeline.length];
            setCursorPos({ x: s.x, y: s.y });

            const isClick = s.action.startsWith('click');
            if (isClick) {
                setTimeout(() => setClicking(true), 200);
                setTimeout(() => setClicking(false), 500);
            }

            // Actions
            switch (s.action) {
                case 'click-tab-1': case 'show-tab-1':
                    setActiveTab(1); setShowAiPanel(false); setSentState(false); setHoveredCard(-1); break;
                case 'click-tab-0': case 'show-tab-0':
                    setActiveTab(0); setShowAiPanel(false); setSentState(false); setHoveredCard(-1); break;
                case 'hover-card-0': case 'highlight-card-0':
                    setHoveredCard(0); break;
                case 'hover-followup-0':
                    setHoveredCard(0); break;
                case 'click-followup':
                    setHoveredCard(-1); break;
                case 'show-ai':
                    setShowAiPanel(true); setAiTyping('');
                    // Start typing
                    let charIdx = 0;
                    const fullText = aiBody;
                    if (typingRef.current) clearInterval(typingRef.current);
                    typingRef.current = setInterval(() => {
                        if (charIdx <= fullText.length) {
                            setAiTyping(fullText.slice(0, charIdx));
                            charIdx += 3;
                        } else {
                            clearInterval(typingRef.current);
                        }
                    }, 20);
                    break;
                case 'click-send':
                    setSentState(true); break;
                case 'show-sent':
                    break;
                case 'reset':
                    setShowAiPanel(false); setSentState(false); setHoveredCard(-1); setActiveTab(0); setAiTyping('');
                    if (typingRef.current) clearInterval(typingRef.current);
                    break;
                default: break;
            }

            timerRef.current = setTimeout(() => runStep((idx + 1) % timeline.length), s.dur);
        };

        // Start after a short delay
        timerRef.current = setTimeout(() => runStep(0), 1500);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (typingRef.current) clearInterval(typingRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const tabs = ['All', 'Silver Medallist', 'Not Ready Yet', 'Pipeline'];
    const filteredCandidates = activeTab === 0 ? candidates : candidates.filter(c => {
        if (activeTab === 1) return c.group === 'silver_medallist';
        if (activeTab === 2) return c.group === 'not_ready_yet';
        return c.group === 'pipeline';
    });

    return (
        <div className="relative" data-testid="dashboard-mockup">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#F97B5C]/8 via-transparent to-[#4E9BE8]/8 rounded-3xl blur-2xl pointer-events-none" />

            <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-[#0A0C10] shadow-2xl shadow-black/50">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0A0C10] border-b border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                    <span className="ml-3 text-[10px] text-[#6E7781] font-mono">app.taplo.io/dashboard</span>
                </div>

                <div className="relative flex" style={{ height: '360px' }}>
                    {/* Animated cursor */}
                    <Cursor x={cursorPos.x} y={cursorPos.y} clicking={clicking} />

                    {/* Mini sidebar */}
                    <div className="w-[140px] border-r border-[#2A2E39]/60 bg-[#0A0C10] shrink-0 hidden sm:flex flex-col">
                        <div className="p-3 border-b border-[#2A2E39]/60">
                            <img src={LOGO_URL} alt="Taplo" className="h-4" />
                        </div>
                        <nav className="p-2 space-y-0.5 flex-1">
                            {[
                                { icon: Users, label: 'Pipeline', active: true },
                                { icon: CalendarDots, label: 'Digest', active: false },
                                { icon: ChartBar, label: 'Stats', active: false },
                            ].map((n) => (
                                <div key={n.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors duration-200 ${n.active ? 'bg-[#F97B5C]/10 text-[#F97B5C]' : 'text-[#6E7781]'}`}>
                                    <n.icon weight={n.active ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
                                    {n.label}
                                </div>
                            ))}
                        </nav>
                        <div className="p-2 border-t border-[#2A2E39]/60">
                            <div className="flex items-center gap-2 px-2.5 py-1">
                                <div className="w-5 h-5 rounded-full bg-[#4E9BE8]/20 flex items-center justify-center text-[#4E9BE8] text-[8px] font-bold">A</div>
                                <span className="text-[#A0AAB2] text-[10px]">Alex R.</span>
                            </div>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 p-4 overflow-hidden relative">
                        {!showAiPanel ? (
                            <>
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-heading text-xs font-bold text-[#F1F3F5]">Candidate Pipeline</h3>
                                        <p className="text-[#6E7781] text-[9px]">12 candidates nurtured</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-1 bg-[#12151C] rounded-md px-2 py-1 border border-[#2A2E39]/60">
                                            <MagnifyingGlass className="w-2.5 h-2.5 text-[#6E7781]" />
                                            <span className="text-[#6E7781] text-[9px]">Search...</span>
                                        </div>
                                        <div className="bg-[#F97B5C] text-[#0A0C10] text-[9px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                                            <Plus weight="bold" className="w-2.5 h-2.5" /> Add
                                        </div>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-0.5 mb-3 bg-[#12151C] p-0.5 rounded-md w-fit">
                                    {tabs.map((t, i) => (
                                        <span key={t} className={`px-2 py-1 rounded text-[9px] font-medium transition-all duration-300 ${activeTab === i ? 'bg-[#F97B5C]/10 text-[#F97B5C]' : 'text-[#6E7781]'}`}>
                                            {t}{i === 0 && <span className="ml-1 text-[8px] opacity-60">12</span>}
                                        </span>
                                    ))}
                                </div>

                                {/* Cards */}
                                <div className={`grid gap-2 ${filteredCandidates.length === 1 ? 'grid-cols-1 max-w-[250px]' : filteredCandidates.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                                    {filteredCandidates.map((c, i) => (
                                        <div key={c.name} className={`bg-[#12151C] border rounded-lg p-3 transition-all duration-300 ${hoveredCard === i ? 'border-[#F97B5C]/30 -translate-y-0.5 shadow-lg shadow-[#F97B5C]/5' : 'border-white/[0.04]'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${warmthDot[c.warmth]}`} />
                                                <p className="text-[#F1F3F5] text-[10px] font-semibold font-heading truncate">{c.name}</p>
                                            </div>
                                            <div className="flex items-center gap-1 text-[#A0AAB2] text-[9px] mb-1">
                                                <Briefcase className="w-2.5 h-2.5 text-[#6E7781]" />{c.role}
                                            </div>
                                            <div className="flex items-center gap-1 text-[#A0AAB2] text-[9px] mb-2">
                                                <CalendarDot className="w-2.5 h-2.5 text-[#6E7781]" />{c.lastContact}
                                            </div>
                                            <div className="flex items-center gap-1 mb-2 flex-wrap">
                                                <span className={`text-[8px] rounded-full px-1.5 py-[1px] ${groupColors[c.group]}`}>{groupLabels[c.group]}</span>
                                                <span className={`text-[8px] flex items-center gap-0.5 ${warmthText[c.warmth]}`}>
                                                    <span className={`w-1 h-1 rounded-full ${warmthDot[c.warmth]}`} />{warmthLabel[c.warmth]}
                                                </span>
                                            </div>
                                            <p className={`text-[8px] mb-2 ${c.nextFu === 'Due now' ? 'text-[#F97B5C] font-medium' : 'text-[#6E7781]'}`}>
                                                Next: {c.nextFu}
                                            </p>
                                            <div className={`w-full rounded-full text-[9px] font-medium py-1 flex items-center justify-center gap-1 transition-all duration-200 ${hoveredCard === i ? 'bg-[#4E9BE8]/20 text-[#4E9BE8] border border-[#4E9BE8]/30' : 'bg-[#4E9BE8]/10 text-[#4E9BE8] border border-[#4E9BE8]/15'}`}>
                                                <PaperPlaneTilt weight="fill" className="w-2.5 h-2.5" /> Follow Up
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* AI banner */}
                                <div className="mt-2 bg-[#F97B5C]/5 border border-[#F97B5C]/10 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <Lightning weight="fill" className="w-3.5 h-3.5 text-[#F97B5C] shrink-0" />
                                    <p className="text-[9px] text-[#A0AAB2]"><span className="text-[#F1F3F5] font-medium">AI generated</span> a follow-up draft for Sarah Chen — ready to review</p>
                                </div>
                            </>
                        ) : (
                            /* AI Follow-up Panel */
                            <div className="animate-fade-in">
                                <p className="text-[#6E7781] text-[9px] mb-3">&larr; Back to pipeline</p>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#F97B5C] shadow-[0_0_8px_rgba(249,123,92,0.6)]" />
                                    <div>
                                        <h3 className="font-heading text-xs font-bold text-[#F1F3F5]">Follow Up with Sarah Chen</h3>
                                        <p className="text-[#6E7781] text-[9px]">AI-generated personalised message</p>
                                    </div>
                                </div>

                                <div className="bg-[#0A0C10] border border-[#2A2E39] rounded-lg p-3 mb-3 text-[9px] space-y-1">
                                    <div className="flex justify-between"><span className="text-[#6E7781]">Role:</span><span className="text-[#F1F3F5]">Senior Product Designer</span></div>
                                    <div className="flex justify-between"><span className="text-[#6E7781]">Group:</span><span className="text-[#F1F3F5]">Silver Medallist</span></div>
                                </div>

                                <div className="bg-[#0A0C10] border border-[#2A2E39] rounded-lg p-3 mb-3">
                                    <p className="text-[8px] text-[#6E7781] mb-0.5">Subject</p>
                                    <p className="text-[10px] text-[#F1F3F5] font-medium mb-2">{aiSubject}</p>
                                    <p className="text-[8px] text-[#6E7781] mb-0.5">Body</p>
                                    <pre className="text-[9px] text-[#A0AAB2] whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                        {aiTyping}<span className={`inline-block w-[3px] h-[10px] bg-[#4E9BE8] ml-[1px] ${aiTyping.length < aiBody.length ? 'animate-pulse' : 'hidden'}`} />
                                    </pre>
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex-1 border border-[#2A2E39] text-[#A0AAB2] rounded-full text-[9px] font-medium py-1.5 flex items-center justify-center gap-1">
                                        Copy
                                    </div>
                                    <div className={`flex-1 rounded-full text-[9px] font-medium py-1.5 flex items-center justify-center gap-1 transition-all duration-300 ${sentState ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-[#F97B5C] text-[#0A0C10]'}`}>
                                        <PaperPlaneTilt weight="fill" className="w-2.5 h-2.5" />
                                        {sentState ? 'Email Client Opened!' : 'Open Email Client'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
