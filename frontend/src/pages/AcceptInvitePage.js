import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { API } from '@/config';
import axios from 'axios';

export default function AcceptInvitePage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { setAuthFromAccept } = useAuth();

    const [loading, setLoading] = useState(true);
    const [invite, setInvite] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await axios.get(`${API}/invitations/${token}`);
                if (!cancelled) setInvite(data);
            } catch (err) {
                if (!cancelled) setLoadError(err.response?.data?.detail || 'Invitation not found or already used');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        if (!name.trim()) { setSubmitError('Please enter your name'); return; }
        if (password.length < 6) { setSubmitError('Password must be at least 6 characters'); return; }
        setSubmitting(true);
        try {
            const { data } = await axios.post(`${API}/invitations/${token}/accept`, { name: name.trim(), password });
            setAuthFromAccept(data);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setSubmitError(err.response?.data?.detail || 'Failed to accept invitation');
        }
        setSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-surface-base flex items-center justify-center p-6" data-testid="accept-invite-page">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-baseline gap-1 group" data-testid="invite-wordmark">
                        <span className="font-heading text-3xl font-bold text-[#F1F3F5] tracking-tight">Taplo</span>
                        <span className="w-2 h-2 rounded-full bg-coral translate-y-[-3px] group-hover:bg-ocean transition-colors" />
                    </Link>
                </div>
                <div className="bg-surface-card border border-white/5 rounded-2xl p-8">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : loadError ? (
                        <div className="text-center" data-testid="accept-invite-error-state">
                            <h1 className="font-heading text-2xl font-bold text-[#F1F3F5] mb-2">Invitation unavailable</h1>
                            <p className="text-[#6E7781] text-sm mb-6">{loadError}</p>
                            <Link to="/login">
                                <Button className="bg-coral hover:bg-coral-hover text-surface-base rounded-full px-6">
                                    Go to login
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h1 className="font-heading text-2xl font-bold text-[#F1F3F5] mb-1">
                                Join {invite.workspace_owner_name || invite.invited_by_name || 'the team'} on Taplo
                            </h1>
                            <p className="text-[#A0AAB2] text-sm mb-1">
                                <span className="text-[#F1F3F5]">{invite.invited_by_name}</span> invited you to collaborate on their candidate pipeline.
                            </p>
                            <p className="text-[#6E7781] text-xs mb-6">Invite for <span className="text-[#A0AAB2]">{invite.email}</span></p>
                            {invite.message && (
                                <div className="bg-surface-base border-l-2 border-ocean rounded-md p-3 mb-6">
                                    <p className="text-[#A0AAB2] text-sm italic">"{invite.message}"</p>
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label className="text-[#A0AAB2] text-sm">Your name</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Jane Doe"
                                        className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean"
                                        data-testid="accept-invite-name"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <Label className="text-[#A0AAB2] text-sm">Choose a password</Label>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean"
                                        data-testid="accept-invite-password"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                {submitError && <p className="text-red-400 text-sm" data-testid="accept-invite-submit-error">{submitError}</p>}
                                <Button type="submit" disabled={submitting} className="w-full bg-coral hover:bg-coral-hover text-surface-base rounded-full font-medium" data-testid="accept-invite-submit">
                                    {submitting ? 'Joining…' : 'Accept & join team'}
                                </Button>
                            </form>
                            <p className="text-[#6E7781] text-xs mt-6 text-center">
                                Already have an account? <Link to="/login" className="text-ocean hover:underline">Log in instead</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
