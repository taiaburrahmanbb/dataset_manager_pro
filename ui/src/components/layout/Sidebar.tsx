import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Files, Cpu, GitBranch,
  Download, Settings, ChevronLeft, Database, Wifi, WifiOff,
  Activity,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/appStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/files', icon: Files, label: 'File Browser' },
  { to: '/processing', icon: Cpu, label: 'Processing' },
  { to: '/versioning', icon: GitBranch, label: 'Versioning' },
  { to: '/export', icon: Download, label: 'Export' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, wasabiConnected, jobs } = useAppStore();
  const location = useLocation();
  const activeJobs = jobs.filter((j) => j.status === 'running').length;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-40 flex flex-col border-r border-white/8 bg-gray-950/95 backdrop-blur-md transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-white/8', sidebarCollapsed && 'justify-center')}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-900/40">
          <Database size={18} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Dataset Manager</h1>
            <p className="text-[10px] text-gray-500 leading-tight">Pro Edition</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5',
                sidebarCollapsed && 'justify-center px-2'
              )}
              title={sidebarCollapsed ? label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon size={18} />
                {label === 'Processing' && activeJobs > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full text-[8px] flex items-center justify-center text-white font-bold">
                    {activeJobs}
                  </span>
                )}
              </div>
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Wasabi Status */}
      <div className={cn('px-3 py-4 border-t border-white/8', sidebarCollapsed && 'flex justify-center')}>
        {sidebarCollapsed ? (
          <div className={cn('w-2 h-2 rounded-full', wasabiConnected ? 'bg-emerald-400' : 'bg-gray-600')} />
        ) : (
          <div className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs',
            wasabiConnected
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-gray-700 bg-gray-800/50 text-gray-500'
          )}>
            {wasabiConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{wasabiConnected ? 'Wasabi Connected' : 'Wasabi Disconnected'}</span>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-16 w-6 h-6 bg-gray-800 border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
      >
        <ChevronLeft size={12} className={cn('transition-transform', sidebarCollapsed && 'rotate-180')} />
      </button>
    </aside>
  );
}
