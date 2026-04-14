import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_2aa63b04-78ab-456d-9fa0-9e31428b8786/artifacts/bvbae1hz_taplo-logo-inverted-rgb-3000px-w-72ppi.png";

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        const result = await login(email, password);
        setSubmitting(false);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="min-h-screen bg-surface-base flex items-center justify-center px-6" data-testid="login-page">
            <div className="w-full max-w-sm">
                <Link to="/" className="block mb-10">
                    <img src={LOGO_URL} alt="Taplo" className="h-8 mx-auto" />
                </Link>
                <div className="bg-surface-card border border-white/5 rounded-2xl p-8">
                    <h1 className="font-heading text-2xl font-bold text-[#F1F3F5] mb-1">Welcome back</h1>
                    <p className="text-[#6E7781] text-sm mb-6">Sign in to your Taplo account</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label className="text-[#A0AAB2] text-sm">Email</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1.5 h-11 bg-surface-base border-[#2A2E39] text-[#F1F3F5] placeholder:text-[#6E7781] rounded-lg focus:border-ocean focus:ring-1 focus:ring-ocean"
                                placeholder="you@company.com"
                                data-testid="login-email-input"
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
                                placeholder="Enter your password"
                                data-testid="login-password-input"
                                required
                            />
                        </div>
                        {error && <p className="text-red-400 text-sm" data-testid="login-error">{error}</p>}
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-11 bg-coral hover:bg-coral-hover text-surface-base rounded-full font-medium"
                            data-testid="login-submit-button"
                        >
                            {submitting ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>
                    <p className="text-center text-[#6E7781] text-sm mt-6">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-ocean hover:underline" data-testid="login-register-link">Sign up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
