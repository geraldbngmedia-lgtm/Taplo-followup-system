import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setSubmitting(true);
        const result = await register(name, email, password);
        setSubmitting(false);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="min-h-screen bg-surface-base flex items-center justify-center px-6" data-testid="register-page">
            <div className="w-full max-w-sm">
                <Link to="/" className="flex items-baseline justify-center gap-1 mb-10 group" data-testid="register-wordmark">
                    <span className="font-heading text-3xl font-bold text-[#F1F3F5] tracking-tight">Taplo</span>
                    <span className="w-2 h-2 rounded-full bg-coral translate-y-[-3px] group-hover:bg-ocean transition-colors" />
                </Link>
                <div className="bg-surface-card border border-white/5 rounded-2xl p-8">
                    <h1 className="font-heading text-2xl font-bold text-[#F1F3F5] mb-1">Create your account</h1>
                    <p className="text-[#6E7781] text-sm mb-6">Start nurturing your talent pipeline</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Full Name</Label>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1.5 h-11 bg-surface-base border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg focus:border-ocean focus:ring-1 focus:ring-ocean"
                                placeholder="Jane Smith"
                                data-testid="register-name-input"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Email</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1.5 h-11 bg-surface-base border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg focus:border-ocean focus:ring-1 focus:ring-ocean"
                                placeholder="you@company.com"
                                data-testid="register-email-input"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Password</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1.5 h-11 bg-surface-base border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg focus:border-ocean focus:ring-1 focus:ring-ocean"
                                placeholder="Min 6 characters"
                                data-testid="register-password-input"
                                required
                            />
                        </div>
                        {error && <p className="text-red-400 text-sm" data-testid="register-error">{error}</p>}
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-11 bg-coral hover:bg-coral-hover text-surface-base rounded-full font-medium"
                            data-testid="register-submit-button"
                        >
                            {submitting ? 'Creating account...' : 'Create Account'}
                        </Button>
                    </form>
                    <p className="text-center text-[#6E7781] text-sm mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-ocean hover:underline" data-testid="register-login-link">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
