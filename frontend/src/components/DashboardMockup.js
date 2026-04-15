import { PaperPlaneTilt, Briefcase, CalendarDot, Users, CalendarDots, ChartBar, MagnifyingGlass, Plus, Lightning } from '@phosphor-icons/react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_2aa63b04-78ab-456d-9fa0-9e31428b8786/artifacts/bvbae1hz_taplo-logo-inverted-rgb-3000px-w-72ppi.png";

const candidates = [
    { name: 'Sarah Chen', email: 'sarah.c@gmail.com', role: 'Senior Product Designer', group: 'silver_medallist', warmth: 'hot', lastContact: '2d ago', nextFu: 'Apr 21' },
    { name: 'James Okonkwo', role: 'Full Stack Engineer', group: 'pipeline', warmth: 'warm', lastContact: '5d ago', nextFu: 'Apr 24' },
    { name: 'Emma Lindqvist', role: 'Engineering Manager', group: 'not_ready_yet', warmth: 'cool', lastContact: '12d ago', nextFu: 'Due now' },
];

const groupColors = {
    silver_medallist: 'bg-[#F97B5C]/15 text-[#F97B5C]',
    pipeline: 'bg-[#4E9BE8]/15 text-[#4E9BE8]',
    not_ready_yet: 'bg-yellow-400/15 text-yellow-400',
};
const groupLabels = { silver_medallist: 'Silver Medallist', pipeline: 'Pipeline', not_ready_yet: 'Not Ready Yet' };
const warmthDot = { hot: 'bg-[#F97B5C] shadow-[0_0_8px_rgba(249,123,92,0.6)]', warm: 'bg-yellow-400 shadow-[0_0_6px_rgba(241,196,15,0.4)]', cool: 'bg-[#4E9BE8] shadow-[0_0_5px_rgba(78,155,232,0.3)]' };
const warmthLabel = { hot: 'Hot', warm: 'Warm', cool: 'Cool' };
const warmthText = { hot: 'text-[#F97B5C]', warm: 'text-yellow-400', cool: 'text-[#4E9BE8]' };

export default function DashboardMockup() {
    return (
        <div className="relative" data-testid="dashboard-mockup">
            {/* Glow behind */}
            <div className="absolute -inset-4 bg-gradient-to-br from-[#F97B5C]/8 via-transparent to-[#4E9BE8]/8 rounded-3xl blur-2xl pointer-events-none" />

            {/* Shell */}
            <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-[#0A0C10] shadow-2xl shadow-black/50">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0A0C10] border-b border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                    <span className="ml-3 text-[10px] text-[#6E7781] font-mono">app.taplo.io/dashboard</span>
                </div>

                <div className="flex h-[340px]">
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
                                <div key={n.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[10px] font-medium ${n.active ? 'bg-[#F97B5C]/10 text-[#F97B5C]' : 'text-[#6E7781]'}`}>
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

                    {/* Main */}
                    <div className="flex-1 p-4 overflow-hidden">
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
                            {['All', 'Silver Medallist', 'Not Ready Yet', 'Pipeline'].map((t, i) => (
                                <span key={t} className={`px-2 py-1 rounded text-[9px] font-medium ${i === 0 ? 'bg-[#F97B5C]/10 text-[#F97B5C]' : 'text-[#6E7781]'}`}>
                                    {t}{i === 0 && <span className="ml-1 text-[8px] opacity-60">12</span>}
                                </span>
                            ))}
                        </div>

                        {/* Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {candidates.map((c, i) => (
                                <div key={i} className="bg-[#12151C] border border-white/[0.04] rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${warmthDot[c.warmth]}`} />
                                        <div className="min-w-0">
                                            <p className="text-[#F1F3F5] text-[10px] font-semibold font-heading truncate">{c.name}</p>
                                        </div>
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
                                    <button className="w-full bg-[#4E9BE8]/10 text-[#4E9BE8] rounded-full text-[9px] font-medium py-1 border border-[#4E9BE8]/15 flex items-center justify-center gap-1">
                                        <PaperPlaneTilt weight="fill" className="w-2.5 h-2.5" /> Follow Up
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* AI banner */}
                        <div className="mt-2 bg-[#F97B5C]/5 border border-[#F97B5C]/10 rounded-lg px-3 py-2 flex items-center gap-2">
                            <Lightning weight="fill" className="w-3.5 h-3.5 text-[#F97B5C] shrink-0" />
                            <p className="text-[9px] text-[#A0AAB2]"><span className="text-[#F1F3F5] font-medium">AI generated</span> a follow-up draft for Sarah Chen — ready to review</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
