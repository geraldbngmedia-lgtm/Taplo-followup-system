import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { API } from '@/config';
import axios from 'axios';

const groups = [
    { value: 'silver_medallist', label: 'Silver Medallist' },
    { value: 'not_ready_yet', label: 'Not Ready Yet' },
    { value: 'pipeline', label: 'Pipeline' },
    { value: 'offer_declined', label: 'Offer Declined' },
];

const reasons = {
    silver_medallist: ['Strong runner-up', 'Great culture fit', 'Close second choice', 'Other'],
    not_ready_yet: ['Needs more experience', 'Timing wasn\'t right', 'Missing a key skill', 'Other'],
    pipeline: ['General interest', 'Future headcount', 'Networking', 'Other'],
    offer_declined: ['Accepted elsewhere', 'Compensation mismatch', 'Relocation concerns', 'Other'],
};

export default function AddCandidateDialog({ open, onOpenChange, onCandidateAdded }) {
    const [form, setForm] = useState({
        name: '', email: '', role: '', group: '', reason: '', notes: '', gdpr_consent: true,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.role || !form.group) {
            setError('Please fill in all required fields');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const { data } = await axios.post(`${API}/candidates`, form, { withCredentials: true });
            onCandidateAdded(data);
            setForm({ name: '', email: '', role: '', group: '', reason: '', notes: '', gdpr_consent: true });
            onOpenChange(false);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to add candidate');
        }
        setSubmitting(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5] max-w-lg" data-testid="add-candidate-dialog">
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl">Add Candidate to Taplo</DialogTitle>
                    <DialogDescription className="text-[#6E7781]">
                        Keep this candidate warm with personalised follow-ups
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Name *</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg focus:border-ocean"
                                placeholder="Jane Doe"
                                data-testid="add-candidate-name"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Email *</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg focus:border-ocean"
                                placeholder="jane@example.com"
                                data-testid="add-candidate-email"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[#A0AAB2] text-sm">Role Applied For *</Label>
                        <Input
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg focus:border-ocean"
                            placeholder="Senior Frontend Developer"
                            data-testid="add-candidate-role"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Group *</Label>
                            <Select value={form.group} onValueChange={(v) => setForm({ ...form, group: v, reason: '' })}>
                                <SelectTrigger className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean" data-testid="add-candidate-group">
                                    <SelectValue placeholder="Select group" />
                                </SelectTrigger>
                                <SelectContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5]">
                                    {groups.map((g) => (
                                        <SelectItem key={g.value} value={g.value} className="focus:bg-white/5 focus:text-[#F1F3F5]">{g.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Reason</Label>
                            <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })} disabled={!form.group}>
                                <SelectTrigger className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean" data-testid="add-candidate-reason">
                                    <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5]">
                                    {(reasons[form.group] || []).map((r) => (
                                        <SelectItem key={r} value={r} className="focus:bg-white/5 focus:text-[#F1F3F5]">{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <Label className="text-[#A0AAB2] text-sm">Notes</Label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="mt-1.5 w-full bg-surface-base border border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg p-3 text-sm min-h-[80px] resize-none focus:border-ocean focus:ring-1 focus:ring-ocean focus:outline-none"
                            placeholder="Any notes about this candidate..."
                            data-testid="add-candidate-notes"
                        />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <Label className="text-[#F1F3F5] text-sm font-medium">GDPR Consent</Label>
                            <p className="text-[#6E7781] text-xs">Candidate has given consent in Teamtailor</p>
                        </div>
                        <Switch
                            checked={form.gdpr_consent}
                            onCheckedChange={(c) => setForm({ ...form, gdpr_consent: c })}
                            className="data-[state=checked]:bg-coral"
                            data-testid="add-candidate-gdpr-switch"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-[#2A2E39] text-[#A0AAB2] hover:bg-white/5 rounded-full" data-testid="add-candidate-cancel">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} className="flex-1 bg-coral hover:bg-coral-hover text-surface-base rounded-full font-medium" data-testid="add-candidate-submit">
                            {submitting ? 'Adding...' : 'Add Candidate'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
