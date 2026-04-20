import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ROLE_CATEGORIES } from '@/constants/roleCategories';
import { API } from '@/config';
import axios from 'axios';

const groups = [
    { value: 'silver_medallist', label: 'Silver Medallist' },
    { value: 'not_ready_yet', label: 'Not Ready Yet' },
    { value: 'pipeline', label: 'Pipeline' },
    { value: 'offer_declined', label: 'Offer Declined' },
];

export default function EditCandidateDialog({ open, onOpenChange, candidate, onCandidateUpdated }) {
    const [form, setForm] = useState({ name: '', email: '', role: '', group: '', reason: '', notes: '', gdpr_consent: true });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (candidate) {
            setForm({
                name: candidate.name || '',
                email: candidate.email || '',
                role: candidate.role || '',
                group: candidate.group || 'pipeline',
                reason: candidate.reason || '',
                notes: candidate.notes || '',
                gdpr_consent: candidate.gdpr_consent !== false,
            });
            setError('');
        }
    }, [candidate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email) {
            setError('Name and email are required');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const { data } = await axios.patch(`${API}/candidates/${candidate.id}`, form);
            onCandidateUpdated(data);
            onOpenChange(false);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update candidate');
        }
        setSubmitting(false);
    };

    if (!candidate) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5] max-w-lg" data-testid="edit-candidate-dialog">
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl">Edit Candidate</DialogTitle>
                    <DialogDescription className="text-[#6E7781]">
                        Update {candidate.name}'s details
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Name *</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean"
                                data-testid="edit-candidate-name"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Email *</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean"
                                data-testid="edit-candidate-email"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[#A0AAB2] text-sm">Role Category</Label>
                        <Select value={form.role || ''} onValueChange={(v) => setForm({ ...form, role: v })}>
                            <SelectTrigger className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean" data-testid="edit-candidate-role">
                                <SelectValue placeholder="Select a role category" />
                            </SelectTrigger>
                            <SelectContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5] max-h-72">
                                {/* Preserve any legacy free-text role so existing records stay editable */}
                                {form.role && !ROLE_CATEGORIES.includes(form.role) && (
                                    <SelectItem value={form.role} className="focus:bg-white/5 focus:text-[#F1F3F5] italic text-[#A0AAB2]">{form.role} (legacy)</SelectItem>
                                )}
                                {ROLE_CATEGORIES.map((r) => (
                                    <SelectItem key={r} value={r} className="focus:bg-white/5 focus:text-[#F1F3F5]">{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Group</Label>
                            <Select value={form.group} onValueChange={(v) => setForm({ ...form, group: v })}>
                                <SelectTrigger className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg" data-testid="edit-candidate-group">
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
                            <Label className="text-[#A0AAB2] text-sm">Reason</Label>
                            <Input
                                value={form.reason}
                                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean"
                                placeholder="e.g. Strong runner-up"
                                data-testid="edit-candidate-reason"
                            />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[#A0AAB2] text-sm">Notes</Label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="mt-1.5 w-full bg-surface-base border border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg p-3 text-sm min-h-[80px] resize-none focus:border-ocean focus:ring-1 focus:ring-ocean focus:outline-none"
                            placeholder="Notes about this candidate..."
                            data-testid="edit-candidate-notes"
                        />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <Label className="text-[#F1F3F5] text-sm font-medium">GDPR Consent</Label>
                            <p className="text-[#6E7781] text-xs">Candidate has given consent</p>
                        </div>
                        <Switch
                            checked={form.gdpr_consent}
                            onCheckedChange={(c) => setForm({ ...form, gdpr_consent: c })}
                            className="data-[state=checked]:bg-coral"
                            data-testid="edit-candidate-gdpr"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-[#2A2E39] text-[#A0AAB2] hover:bg-white/5 rounded-full">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} className="flex-1 bg-coral hover:bg-coral-hover text-surface-base rounded-full font-medium" data-testid="edit-candidate-save">
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
