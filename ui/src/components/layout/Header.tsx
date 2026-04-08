import { Bell, Search, Upload, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { uploadTasks } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const activeUploads = uploadTasks.filter((t) => t.status === 'uploading').length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-gray-950/80 backdrop-blur-md">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search files, projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 pl-9 pr-4 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
          />
        </div>

        {/* Upload indicator */}
        {activeUploads > 0 && (
          <button
            onClick={() => navigate('/files')}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            <Upload size={12} className="animate-bounce" />
            {activeUploads} uploading
          </button>
        )}

        {/* Custom actions */}
        {actions}

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-500 rounded-full" />
        </button>

        {/* User Avatar */}
        <button className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
            DM
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-gray-200">Admin</p>
            <p className="text-[10px] text-gray-500">Dataset Manager</p>
          </div>
          <ChevronDown size={12} className="text-gray-500 hidden md:block" />
        </button>
      </div>
    </header>
  );
}
