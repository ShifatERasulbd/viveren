import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, LogOut, Package, UserRound } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

const NAV = [
    { to: '/customer/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/customer/profile',   label: 'Edit Profile', icon: UserRound },
    { to: '/customer/orders',    label: 'Orders',       icon: Package },
];

export default function CustomerLayout() {
    const { logout } = useAppContext();

    return (
        <div className="flex min-h-screen bg-zinc-100">
            <aside className="hidden w-56 shrink-0 p-4 md:block">
                <nav className="flex flex-col gap-1">
                    {NAV.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    isActive
                                        ? 'bg-gradient-to-r from-[#2f4d73] to-[#1b2e4b] text-white shadow'
                                        : 'text-zinc-600 hover:bg-zinc-200'
                                }`
                            }
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </NavLink>
                    ))}
                    <button
                        onClick={logout}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-200"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </nav>
            </aside>
            <main className="min-w-0 flex-1 p-4 sm:p-6">
                <Outlet />
            </main>
        </div>
    );
}