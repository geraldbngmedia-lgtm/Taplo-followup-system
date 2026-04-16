import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, EnvelopeSimple, Lock, Trash, CheckCircle, Warning, CreditCard, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { API } from '@/config';
import axios from 'axios';

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [pwMsg, setPwMsg] = useState(null);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteMsg, setDeleteMsg] = useState('');

    const handleProfileSave = async () => {
        setProfileSaving(true);
        setProfileMsg(null);
        try {
            await axios.patch(`${API}/auth/profile`, { name, email });
            setProfileMsg({ type: 'success', text: 'Profile updated' });
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update' });
        }
        setProfileSaving(false);
    };

    const handlePasswordChange = async () => {
        setPwMsg(null);
        if (newPassword !== confirmPassword) {
            setPwMsg({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        if (newPassword.length < 6) {
            setPwMsg({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }
        setPwSaving(true);
        try {
            await axios.post(`${API}/auth/change-password`, { current_password: currentPassword, new_password: newPassword });
            setPwMsg({ type: 'success', text: 'Password changed' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPwMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to change password' });
        }
        setPwSaving(false);
    };

    const handleDelete = async () => {
        setDeleting(true);
        setDeleteMsg('');
        try {
            await axios.delete(`${API}/auth/delete-account`, { data: { password: deletePassword } });
            logout();
        } catch (err) {
            setDeleteMsg(err.response?.data?.detail || 'Failed to delete account');
        }
        setDeleting(false);
    };

    return (
        <div data-testid="profile-page" className="max-w-2xl">
            <div className="mb-8">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#F1F3F5]">Profile</h1>
                <p className="text-[#6E7781] text-sm mt-1">Manage your account settings</p>
            </div>

            {/* Profile Info */}
            <div className="bg-surface-card border border-white/5 rounded-2xl p-6 mb-6" data-testid="profile-info-card">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-ocean/10 flex items-center justify-center">
                        <User weight="duotone" className="w-5 h-5 text-ocean" />
                    </div>
                    <h2 className="font-heading text-lg font-semibold text-[#F1F3F5]">Account Details</h2>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label className="text-[#A0AAB2] text-sm">Full Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean"
                            data-testid="profile-name-input"
                        />
                    </div>
                    <div>
                        <Label className="text-[#A0AAB2] text-sm">Email</Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean"
                            data-testid="profile-email-input"
                        />
                    </div>
                    {profileMsg && (
                        <div className={`flex items-center gap-2 text-sm ${profileMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {profileMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <Warning className="w-4 h-4" />}
                            {profileMsg.text}
                        </div>
                    )}
                    <Button
                        onClick={handleProfileSave}
                        disabled={profileSaving}
                        className="bg-coral hover:bg-coral-hover text-surface-base rounded-full font-medium"
                        data-testid="profile-save-button"
                    >
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Subscription */}
            <div className="bg-surface-card border border-white/5 rounded-2xl p-6 mb-6" data-testid="profile-subscription-card">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <CreditCard weight="duotone" className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-heading text-lg font-semibold text-[#F1F3F5]">Subscription</h2>
                        <p className="text-[#6E7781] text-xs">Manage your plan</p>
                    </div>
                    <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-semibold px-3 py-1 rounded-full" data-testid="subscription-badge">Free Plan</span>
                </div>
                <div className="bg-surface-base border border-[#2A2E39] rounded-xl p-5">
                    <p className="text-[#F1F3F5] font-medium text-sm mb-3">You're on the free plan — all features included</p>
                    <div className="grid grid-cols-2 gap-2">
                        {['Unlimited candidates', 'AI follow-up drafts', 'Warmth scoring', 'Chrome extension', 'Daily digest email', 'GDPR compliant'].map((f, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Check weight="bold" className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                <span className="text-[#A0AAB2] text-xs">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="bg-surface-card border border-white/5 rounded-2xl p-6 mb-6" data-testid="profile-password-card">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center">
                        <Lock weight="duotone" className="w-5 h-5 text-coral" />
                    </div>
                    <h2 className="font-heading text-lg font-semibold text-[#F1F3F5]">Change Password</h2>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label className="text-[#A0AAB2] text-sm">Current Password</Label>
                        <Input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean"
                            placeholder="Enter current password"
                            data-testid="profile-current-password"
                        />
                    </div>
                    <div>
                        <Label className="text-[#A0AAB2] text-sm">New Password</Label>
                        <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean"
                            placeholder="Min 6 characters"
                            data-testid="profile-new-password"
                        />
                    </div>
                    <div>
                        <Label className="text-[#A0AAB2] text-sm">Confirm New Password</Label>
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-ocean"
                            placeholder="Repeat new password"
                            data-testid="profile-confirm-password"
                        />
                    </div>
                    {pwMsg && (
                        <div className={`flex items-center gap-2 text-sm ${pwMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {pwMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <Warning className="w-4 h-4" />}
                            {pwMsg.text}
                        </div>
                    )}
                    <Button
                        onClick={handlePasswordChange}
                        disabled={pwSaving || !currentPassword || !newPassword}
                        variant="outline"
                        className="border-[#2A2E39] text-[#A0AAB2] hover:bg-white/5 rounded-full"
                        data-testid="profile-change-password-button"
                    >
                        {pwSaving ? 'Changing...' : 'Change Password'}
                    </Button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-surface-card border border-red-400/20 rounded-2xl p-6" data-testid="profile-danger-zone">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center">
                        <Trash weight="duotone" className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h2 className="font-heading text-lg font-semibold text-red-400">Delete Account</h2>
                        <p className="text-[#6E7781] text-xs">This permanently deletes your account and all candidate data</p>
                    </div>
                </div>
                <Button
                    onClick={() => setDeleteOpen(true)}
                    variant="outline"
                    className="border-red-400/30 text-red-400 hover:bg-red-400/5 rounded-full"
                    data-testid="profile-delete-account-button"
                >
                    Delete My Account
                </Button>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="bg-surface-card border-[#2A2E39] text-[#F1F3F5] max-w-sm" data-testid="delete-account-dialog">
                    <DialogHeader>
                        <DialogTitle className="font-heading text-xl text-red-400">Delete Account</DialogTitle>
                        <DialogDescription className="text-[#6E7781]">
                            This action cannot be undone. All your candidates and data will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Enter your password to confirm</Label>
                            <Input
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                className="mt-1.5 bg-surface-base border-[#2A2E39] text-[#F1F3F5] rounded-lg focus:border-red-400"
                                placeholder="Your password"
                                data-testid="delete-confirm-password"
                            />
                        </div>
                        {deleteMsg && <p className="text-red-400 text-sm">{deleteMsg}</p>}
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="flex-1 border-[#2A2E39] text-[#A0AAB2] hover:bg-white/5 rounded-full">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDelete}
                                disabled={deleting || !deletePassword}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                                data-testid="delete-confirm-button"
                            >
                                {deleting ? 'Deleting...' : 'Delete Forever'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
