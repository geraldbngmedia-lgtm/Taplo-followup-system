import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, EnvelopeSimple, X, Crown, Trash, ArrowsClockwise, Copy } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { API } from '@/config';
import axios from 'axios';
import { toast } from 'sonner';

function formatDate(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return ''; }
}

export default function TeamPage() {
    const { user } = useAuth();
    const isOwner = user?.team_role === 'owner';

    const [members, setMembers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteMessage, setInviteMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [membersRes, invitesRes] = await Promise.all([
                axios.get(`${API}/team/members`),
                isOwner ? axios.get(`${API}/team/invitations`) : Promise.resolve({ data: [] }),
            ]);
            setMembers(membersRes.data.members || []);
            setInvitations(invitesRes.data || []);
        } catch (err) {
            console.error('Failed to load team', err);
        }
        setLoading(false);
    }, [isOwner]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleInvite = async (e) => {
        e.preventDefault();
        setError('');
        if (!inviteEmail.trim()) { setError('Email is required'); return; }
        setSubmitting(true);
        try {
            await axios.post(`${API}/team/invite`, { email: inviteEmail.trim(), message: inviteMessage.trim() });
            toast.success(`Invitation sent to ${inviteEmail.trim()}`);
            setInviteOpen(false);
            setInviteEmail('');
            setInviteMessage('');
            fetchData();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to send invitation');
        }
        setSubmitting(false);
    };

    const handleResend = async (id, email) => {
        try {
            await axios.post(`${API}/team/invitations/${id}/resend`);
            toast.success(`Invitation resent to ${email}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to resend');
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this invitation?')) return;
        try {
            await axios.delete(`${API}/team/invitations/${id}`);
            setInvitations(prev => prev.filter(i => i.id !== id));
            toast.success('Invitation cancelled');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to cancel');
        }
    };

    const handleRemoveMember = async (m) => {
        if (!window.confirm(`Remove ${m.name || m.email} from your team? Their candidates will stay visible to the team but they will lose access.`)) return;
        try {
            await axios.delete(`${API}/team/members/${m.id}`);
            setMembers(prev => prev.filter(x => x.id !== m.id));
            toast.success(`${m.name || m.email} removed`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to remove member');
        }
    };

    return (
        <div data-testid="team-page">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#F1F3F5]">Team Members</h1>
                    <p className="text-[#6E7781] text-sm mt-1">
                        {isOwner
                            ? 'Invite teammates to collaborate on your candidate pipeline.'
                            : 'You are a member of this workspace.'}
                    </p>
                </div>
                {isOwner && (
                    <Button onClick={() => setInviteOpen(true)} className="bg-coral hover:bg-coral-hover text-surface-base rounded-full px-6 font-medium" data-testid="team-invite-button">
                        <UserPlus className="w-4 h-4 mr-2" /> Invite Teammate
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Members */}
                    <section data-testid="team-members-section">
                        <div className="flex items-center gap-2 mb-3">
                            <Users weight="duotone" className="w-5 h-5 text-ocean" />
                            <h2 className="font-heading text-base font-semibold text-[#F1F3F5]">Active members</h2>
                            <Badge className="bg-white/5 text-[#A0AAB2] border-[#2A2E39] rounded-full text-xs">{members.length}</Badge>
                        </div>
                        <div className="bg-surface-card border border-white/5 rounded-2xl divide-y divide-[#1A1E27]">
                            {members.map((m) => (
                                <div key={m.id} className="flex items-center gap-4 p-4" data-testid={`team-member-row-${m.id}`}>
                                    <div className="w-10 h-10 rounded-full bg-ocean/20 flex items-center justify-center text-sm font-bold font-heading text-ocean shrink-0">
                                        {(m.name || m.email)[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium text-[#F1F3F5] truncate">{m.name || '—'}</p>
                                            {m.team_role === 'owner' ? (
                                                <Badge className="bg-coral/10 text-coral border-coral/20 rounded-full text-[10px] uppercase tracking-wider"><Crown className="w-3 h-3 mr-1" /> Owner</Badge>
                                            ) : (
                                                <Badge className="bg-ocean/10 text-ocean border-ocean/20 rounded-full text-[10px] uppercase tracking-wider">Member</Badge>
                                            )}
                                            {m.is_self && <Badge className="bg-white/5 text-[#A0AAB2] border-[#2A2E39] rounded-full text-[10px] uppercase tracking-wider">You</Badge>}
                                        </div>
                                        <p className="text-xs text-[#6E7781] truncate">{m.email}</p>
                                    </div>
                                    {isOwner && !m.is_self && m.team_role !== 'owner' && (
                                        <Button
                                            onClick={() => handleRemoveMember(m)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-[#6E7781] hover:text-red-400 hover:bg-red-400/5 rounded-lg"
                                            data-testid={`team-remove-member-${m.id}`}
                                        >
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Pending invitations (owner only) */}
                    {isOwner && (
                        <section data-testid="team-invitations-section">
                            <div className="flex items-center gap-2 mb-3">
                                <EnvelopeSimple weight="duotone" className="w-5 h-5 text-coral" />
                                <h2 className="font-heading text-base font-semibold text-[#F1F3F5]">Pending invitations</h2>
                                <Badge className="bg-white/5 text-[#A0AAB2] border-[#2A2E39] rounded-full text-xs">{invitations.length}</Badge>
                            </div>
                            {invitations.length === 0 ? (
                                <div className="bg-surface-card border border-dashed border-[#2A2E39] rounded-2xl p-8 text-center">
                                    <p className="text-[#6E7781] text-sm">No pending invitations.</p>
                                    <p className="text-[#6E7781] text-xs mt-1">Click "Invite Teammate" above to add someone.</p>
                                </div>
                            ) : (
                                <div className="bg-surface-card border border-white/5 rounded-2xl divide-y divide-[#1A1E27]">
                                    {invitations.map((inv) => (
                                        <div key={inv.id} className="flex items-center gap-4 p-4" data-testid={`team-invitation-row-${inv.id}`}>
                                            <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center shrink-0">
                                                <EnvelopeSimple weight="duotone" className="w-5 h-5 text-coral" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#F1F3F5] truncate">{inv.email}</p>
                                                <p className="text-xs text-[#6E7781]">
                                                    Sent {formatDate(inv.created_at)} · expires {formatDate(inv.expires_at)}
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => handleResend(inv.id, inv.email)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-[#A0AAB2] hover:text-ocean hover:bg-ocean/5 rounded-lg"
                                                data-testid={`team-resend-${inv.id}`}
                                                title="Resend email"
                                            >
                                                <ArrowsClockwise className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                onClick={() => handleCancel(inv.id)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-[#6E7781] hover:text-red-400 hover:bg-red-400/5 rounded-lg"
                                                data-testid={`team-cancel-${inv.id}`}
                                                title="Cancel invitation"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {!isOwner && (
                        <p className="text-[#6E7781] text-xs">Only the workspace owner can invite or remove teammates.</p>
                    )}
                </div>
            )}

            {/* Invite dialog */}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5] max-w-md" data-testid="team-invite-dialog">
                    <DialogHeader>
                        <DialogTitle className="font-heading text-xl">Invite a teammate</DialogTitle>
                        <DialogDescription className="text-[#6E7781]">
                            They'll get an email with a link to set their own password and join your workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInvite} className="space-y-4 mt-2">
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Email *</Label>
                            <Input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="teammate@yourcompany.com"
                                className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg focus:border-ocean"
                                data-testid="team-invite-email"
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Personal message <span className="text-[#6E7781] font-normal">(optional)</span></Label>
                            <textarea
                                value={inviteMessage}
                                onChange={(e) => setInviteMessage(e.target.value)}
                                rows={3}
                                maxLength={500}
                                placeholder="Hey! Joining me on A-hub so we can keep our pipeline warm together."
                                className="mt-1.5 w-full bg-surface-base border border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg p-3 text-sm resize-none focus:border-ocean focus:ring-1 focus:ring-ocean focus:outline-none"
                                data-testid="team-invite-message"
                            />
                        </div>
                        {error && <p className="text-red-400 text-sm" data-testid="team-invite-error">{error}</p>}
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} className="flex-1 border-[#2A2E39] text-[#A0AAB2] hover:bg-white/5 rounded-full" data-testid="team-invite-cancel">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting} className="flex-1 bg-coral hover:bg-coral-hover text-surface-base rounded-full font-medium" data-testid="team-invite-submit">
                                {submitting ? 'Sending…' : 'Send invitation'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
