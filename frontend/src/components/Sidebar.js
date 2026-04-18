import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Users, CalendarDots, ChartBar, SignOut, House, PuzzlePiece } from '@phosphor-icons/react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_2aa63b04-78ab-456d-9fa0-9e31428b8786/artifacts/bvbae1hz_taplo-logo-inverted-rgb-3000px-w-72ppi.png";

const navItems = [
    { path: '/dashboard', label: 'Pipeline', icon: Users },
    { path: '/dashboard/digest', label: 'Daily Digest', icon: CalendarDots },
    { path: '/dashboard/stats', label: 'Stats', icon: ChartBar },
    { path: '/dashboard/extension', label: 'Extension', icon: PuzzlePiece },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    return (
        <aside className="w-64 border-r border-[#2A2E39] bg-surface-base flex flex-col h-screen fixed left-0 top-0 z-40" data-testid="sidebar">
            <div className="p-6 border-b border-[#2A2E39]">
                <Link to="/">
                    <img src={LOGO_URL} alt="Taplo" className="h-7" />
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                isActive
                                    ? 'bg-coral/10 text-coral'
                                    : 'text-[#A0AAB2] hover:text-[#F1F3F5] hover:bg-white/5'
                            }`}
                            data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                        >
                            <item.icon weight={isActive ? 'fill' : 'duotone'} className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-[#2A2E39]">
                <div className="flex items-center gap-3 px-4 py-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-ocean/20 flex items-center justify-center text-ocean text-sm font-bold font-heading">
                        {user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#F1F3F5] truncate">{user?.name}</p>
                        <p className="text-xs text-[#6E7781] truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-[#6E7781] hover:text-red-400 hover:bg-red-400/5 transition-all w-full"
                    data-testid="sidebar-logout-button"
                >
                    <SignOut weight="duotone" className="w-5 h-5" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
