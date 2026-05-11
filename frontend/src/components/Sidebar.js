import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Users, CalendarDots, ChartBar, SignOut, House, PuzzlePiece, UserCircle, UsersThree } from '@phosphor-icons/react';

const navItems = [
    { path: '/dashboard', label: 'Pipeline', icon: Users },
    { path: '/dashboard/digest', label: 'Daily Digest', icon: CalendarDots },
    { path: '/dashboard/stats', label: 'Stats', icon: ChartBar },
    { path: '/dashboard/team', label: 'Team', icon: UsersThree },
    { path: '/dashboard/extension', label: 'Extension', icon: PuzzlePiece },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    return (
        <aside className="w-64 border-r border-[#2A2E39] bg-surface-base flex flex-col h-screen fixed left-0 top-0 z-40" data-testid="sidebar">
            <div className="p-6 border-b border-[#2A2E39]">
                <Link to="/" className="inline-flex items-baseline gap-1 group" data-testid="sidebar-wordmark">
                    <span className="font-heading text-2xl font-bold text-[#F1F3F5] tracking-tight">Taplo</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-coral translate-y-[-2px] group-hover:bg-ocean transition-colors" />
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
                <Link to="/dashboard/profile" className={`flex items-center gap-3 px-4 py-2 mb-2 rounded-lg transition-all ${location.pathname === '/dashboard/profile' ? 'bg-coral/10' : 'hover:bg-white/5'}`} data-testid="sidebar-profile-link">
                    <div className={`w-8 h-8 rounded-full bg-ocean/20 flex items-center justify-center text-sm font-bold font-heading ${location.pathname === '/dashboard/profile' ? 'text-coral' : 'text-ocean'}`}>
                        {user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#F1F3F5] truncate">{user?.name}</p>
                        <p className="text-xs text-[#6E7781] truncate">{user?.email}</p>
                    </div>
                </Link>
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
