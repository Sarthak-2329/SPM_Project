import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role; // ADMIN, TECHNICIAN, REQUESTER

  const navItems = [
    // General
    { label: 'Dashboard', path: '/dashboard', roles: ['ADMIN', 'TECHNICIAN', 'REQUESTER'], icon: '📊' },
    { label: 'Work Orders', path: '/work-orders', roles: ['ADMIN', 'TECHNICIAN'], icon: '🔧' },
    { label: 'PM Schedules', path: '/pm-schedules', roles: ['ADMIN', 'TECHNICIAN'], icon: '📅' },
    { label: 'Spare Parts & Inventory', path: '/inventory', roles: ['ADMIN', 'TECHNICIAN'], icon: '📦' },
    { label: 'Executive Reports', path: '/reports', roles: ['ADMIN', 'TECHNICIAN'], icon: '📑' },
    { label: 'Fault Requests', path: '/requests', roles: ['ADMIN', 'REQUESTER'], icon: '📋' },
    { label: 'Asset Registry', path: '/assets', roles: ['ADMIN', 'TECHNICIAN', 'REQUESTER'], icon: '🏗️' },
    { label: 'Campus Locations', path: '/locations', roles: ['ADMIN'], icon: '📍' },
    { label: 'User Directory', path: '/users', roles: ['ADMIN'], icon: '👥' },
    { label: 'Audit Trail', path: '/audit-log', roles: ['ADMIN'], icon: '📜' },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 min-h-screen">
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <span className="text-2xl">🔧</span>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight">CAMPUS CMMS</h1>
          <p className="text-xs text-slate-400">Facilities Management</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
          Navigation
        </div>
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-sm">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded bg-slate-800 text-blue-400 uppercase">
              {user.role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
