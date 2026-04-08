import {
  UploadCloud, Cpu, GitBranch, Download, Files,
  FolderOpen, Clock,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { useAppStore } from '../store/appStore';
import { formatRelativeTime } from '../lib/utils';

const ACTIVITY_CONFIG = {
  upload: { icon: UploadCloud, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Upload' },
  process: { icon: Cpu, color: 'bg-violet-500/20 text-violet-400 border-violet-500/30', label: 'Process' },
  version: { icon: GitBranch, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Version' },
  export: { icon: Download, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Export' },
  annotation: { icon: Files, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', label: 'Annotation' },
  project: { icon: FolderOpen, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', label: 'Project' },
};

export default function Activity() {
  const { activity } = useAppStore();

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Activity"
        subtitle="Full audit log of all actions across projects"
      />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {Object.entries(ACTIVITY_CONFIG).map(([type, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button key={type} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-white/8 rounded-lg text-xs text-gray-400 hover:border-white/20 hover:text-gray-200 transition-all">
                <Icon size={12} />
                {cfg.label}
              </button>
            );
          })}
        </div>

        <Card>
          <div className="divide-y divide-white/5">
            {activity.map((item) => {
              const config = ACTIVITY_CONFIG[item.type as keyof typeof ACTIVITY_CONFIG];
              const Icon = config?.icon ?? Clock;
              return (
                <div key={item.id} className="flex gap-4 px-5 py-4 hover:bg-white/2 transition-colors">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${config?.color ?? 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    {item.projectName && (
                      <p className="text-[10px] text-gray-700 mt-1">Project: {item.projectName}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-600">
                    <Clock size={11} />
                    {formatRelativeTime(item.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
