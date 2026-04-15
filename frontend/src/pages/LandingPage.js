import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lightning, Users, Timer, ShieldCheck, Envelope, ChartLineUp } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DashboardMockup from '@/components/DashboardMockup';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_2aa63b04-78ab-456d-9fa0-9e31428b8786/artifacts/bvbae1hz_taplo-logo-inverted-rgb-3000px-w-72ppi.png";

export default function LandingPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleWaitlist = async (e) => {
        e.preventDefault();
        if (!email) return;
        try {
            await axios.post(`${API}/waitlist`, { email });
            setSubmitted(true);
            setError('');
        } catch (err) {
            setError('Something went wrong. Try again.');
        }
    };

    return (
        <div className="min-h-screen bg-surface-base text-[#F1F3F5] overflow-hidden">
            {/* Nav */}
            <nav className="glass-header fixed top-0 left-0 right-0 z-50" data-testid="landing-nav">
                <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
                    <img src={LOGO_URL} alt="Taplo" className="h-8" data-testid="landing-logo" />
                    <div className="flex items-center gap-4">
                        <Link to="/login">
                            <Button variant="ghost" className="text-[#A0AAB2] hover:text-[#F1F3F5] hover:bg-white/5 font-body" data-testid="nav-login-button">
                                Log in
                            </Button>
                        </Link>
                        <Link to="/register">
                            <Button className="bg-coral hover:bg-coral-hover text-surface-base rounded-full px-6 font-body font-medium" data-testid="nav-signup-button">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-32 pb-12 md:pt-40 md:pb-16" data-testid="hero-section">
                <div className="hero-glow hero-glow-coral" />
                <div className="hero-glow hero-glow-blue" />
                <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                    {/* Text + Waitlist */}
                    <div className="text-center max-w-3xl mx-auto mb-14">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-[#A0AAB2] mb-8 opacity-0 animate-fade-up">
                            <Lightning weight="fill" className="text-coral w-4 h-4" />
                            <span>AI-powered candidate nurturing</span>
                        </div>
                        <h1 className="font-heading text-5xl sm:text-6xl tracking-tight leading-tight font-bold mb-6 opacity-0 animate-fade-up stagger-1" data-testid="hero-headline">
                            Never lose a great<br />
                            <span className="text-coral">candidate</span> again.
                        </h1>
                        <p className="text-base md:text-lg text-[#A0AAB2] leading-relaxed max-w-xl mx-auto mb-10 opacity-0 animate-fade-up stagger-2" data-testid="hero-subheadline">
                            Taplo keeps your best talent warm automatically. Personalised follow-ups, smart scheduling, and warmth tracking — so recruiters never lose top candidates to silence.
                        </p>

                        {!submitted ? (
                            <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto opacity-0 animate-fade-up stagger-3" data-testid="waitlist-form">
                                <Input
                                    type="email"
                                    placeholder="Enter your work email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 bg-[#12151C] border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-full px-5 focus:border-ocean focus:ring-1 focus:ring-ocean"
                                    data-testid="waitlist-email-input"
                                    required
                                />
                                <Button type="submit" className="h-12 bg-coral hover:bg-coral-hover text-surface-base rounded-full px-8 font-medium whitespace-nowrap" data-testid="waitlist-submit-button">
                                    Join Waitlist <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </form>
                        ) : (
                            <div className="flex items-center justify-center gap-3 text-coral opacity-0 animate-fade-up" data-testid="waitlist-success">
                                <ShieldCheck weight="fill" className="w-6 h-6" />
                                <span className="text-lg font-medium">You're on the list! We'll be in touch soon.</span>
                            </div>
                        )}
                        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    </div>

                    {/* Dashboard Mockup */}
                    <div className="max-w-5xl mx-auto opacity-0 animate-fade-up stagger-4" data-testid="hero-mockup">
                        <DashboardMockup />
                    </div>
                </div>
            </section>

            {/* Problem */}
            <section className="py-24 md:py-32 border-t border-white/5" data-testid="problem-section">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="max-w-3xl mx-auto text-center">
                        <p className="text-xs tracking-[0.2em] uppercase font-bold text-coral mb-4 font-heading">The Problem</p>
                        <h2 className="font-heading text-3xl sm:text-4xl tracking-tight font-bold mb-6">
                            Great candidates slip away in silence
                        </h2>
                        <p className="text-[#A0AAB2] text-base leading-relaxed mb-6">
                            Every recruiter knows the feeling. You had an incredible silver medallist, a promising candidate who wasn't quite ready, or someone who declined an offer but might return. Then weeks pass, follow-ups fall through the cracks, and they're gone.
                        </p>
                        <p className="text-[#A0AAB2] text-base leading-relaxed mb-10">
                            Manual follow-ups don't scale. Spreadsheets get forgotten. Your ATS tracks pipelines, not relationships. Taplo bridges the gap.
                        </p>
                        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
                            {[
                                { value: '72%', label: 'of candidates go cold within 2 weeks' },
                                { value: '3x', label: 'more likely to re-engage with follow-ups' },
                                { value: '10h', label: 'saved per week on manual outreach' },
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <p className="text-2xl sm:text-3xl font-heading font-bold text-coral">{stat.value}</p>
                                    <p className="text-[#6E7781] text-xs mt-1 leading-snug">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="py-24 md:py-32 border-t border-white/5 relative" data-testid="how-it-works-section">
                <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                    <div className="text-center mb-16">
                        <p className="text-xs tracking-[0.2em] uppercase font-bold text-ocean mb-4 font-heading">How it works</p>
                        <h2 className="font-heading text-3xl sm:text-4xl tracking-tight font-bold">Three steps to warmer pipelines</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { num: "01", title: "Tag & Categorise", desc: "When a candidate exits active hiring, add them to Taplo with one tap. Choose their group: Silver Medallist, Not Ready Yet, Pipeline, or Offer Declined.", icon: Users },
                            { num: "02", title: "AI Drafts the Message", desc: "When it's time to follow up, Taplo's AI generates a personalised, context-aware email draft. Review it, tweak if needed, and send with one click.", icon: Envelope },
                            { num: "03", title: "Track & Stay Warm", desc: "Monitor warmth scores, see who's going cold, and get daily digests showing exactly who needs attention today.", icon: ChartLineUp },
                        ].map((step, i) => (
                            <div key={i} className="glass-card rounded-2xl p-8 opacity-0 animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                                <span className="text-4xl font-heading font-bold text-white/10 block mb-4">{step.num}</span>
                                <step.icon weight="duotone" className="w-8 h-8 text-coral mb-4" />
                                <h3 className="font-heading text-xl font-semibold mb-3">{step.title}</h3>
                                <p className="text-[#A0AAB2] text-sm leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 md:py-32 border-t border-white/5" data-testid="features-section">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="text-center mb-16">
                        <p className="text-xs tracking-[0.2em] uppercase font-bold text-coral mb-4 font-heading">Features</p>
                        <h2 className="font-heading text-3xl sm:text-4xl tracking-tight font-bold">Everything you need to keep talent warm</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { title: "Smart Pipeline", desc: "Candidates auto-grouped by Silver Medallist, Not Ready Yet, Pipeline, and Offer Declined.", icon: Users },
                            { title: "AI Follow-Ups", desc: "Personalised messages drafted in seconds based on candidate context, role, and relationship stage.", icon: Lightning },
                            { title: "Warmth Scoring", desc: "Visual warmth indicators show who's hot, warm, cool, or going cold at a glance.", icon: ChartLineUp },
                            { title: "Follow-Up Schedule", desc: "Smart suggested timelines for when to reach out next, based on candidate group and last touchpoint.", icon: Timer },
                            { title: "Daily Digest", desc: "Morning summary of who needs follow-up today, pipeline health, and candidates at risk.", icon: Envelope },
                            { title: "GDPR Compliant", desc: "Only candidates with ATS consent appear. Respect for privacy built into every interaction.", icon: ShieldCheck },
                        ].map((f, i) => (
                            <div key={i} className="bg-surface-card border border-white/5 rounded-2xl p-6 hover:-translate-y-1 hover:border-[#2A2E39] transition-all duration-200 opacity-0 animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                                <f.icon weight="duotone" className="w-7 h-7 text-ocean mb-4" />
                                <h3 className="font-heading text-lg font-semibold mb-2">{f.title}</h3>
                                <p className="text-[#A0AAB2] text-sm leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 md:py-32 border-t border-white/5" data-testid="cta-section">
                <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
                    <h2 className="font-heading text-3xl sm:text-4xl tracking-tight font-bold mb-4">Ready to keep your talent pipeline warm?</h2>
                    <p className="text-[#A0AAB2] text-base mb-8 max-w-xl mx-auto">Join the waitlist and be first to try Taplo when we launch.</p>
                    <Link to="/register">
                        <Button className="h-12 bg-coral hover:bg-coral-hover text-surface-base rounded-full px-10 font-medium text-base" data-testid="cta-get-started-button">
                            Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12" data-testid="footer">
                <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
                    <img src={LOGO_URL} alt="Taplo" className="h-6 opacity-70" />
                    <p className="text-[#6E7781] text-sm">&copy; {new Date().getFullYear()} Taplo. All rights reserved.</p>
                    <div className="flex gap-6 text-[#6E7781] text-sm">
                        <span className="hover:text-[#A0AAB2] cursor-pointer transition-colors">Privacy</span>
                        <span className="hover:text-[#A0AAB2] cursor-pointer transition-colors">Terms</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
