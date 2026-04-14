import { useState, useEffect } from 'react';
import {
  FolderOpen, HardDrive, Cloud, UploadCloud,
  ArrowUpRight, RefreshCw, BookOpen, Search,
  ArrowRightLeft,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Progress } from '../components/common/Progress';
import { Badge } from '../components/common/Badge';
import { useAppStore } from '../store/appStore';
import { getLocalProjects, getWasabiStatus } from '../lib/api';
import type { LocalProject } from '../lib/api';
import { formatBytes } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface WasabiStatusData {
  connected: boolean;
  bucket: string;
  region: string;
  total_objects: number;
  total_size_bytes: number;
}

export default function Dashboard() {
  const { wasabiConnected, setWasabiConnected } = useAppStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [wasabi, setWasabi] = useState<WasabiStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [p, w] = await Promise.all([
        getLocalProjects().catch(() => []),
        getWasabiStatus().catch(() => null),
      ]);
      setProjects(p);
      if (w) {
        setWasabi(w);
        setWasabiConnected(w.connected);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const totalFiles = projects.reduce((a, p) => a + p.total_files, 0);
  const totalSize = projects.reduce((a, p) => a + p.total_size, 0);

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Welcome back — here's your project overview"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />} onClick={refresh} disabled={loading}>
              Refresh
            </Button>
            <Button icon={<UploadCloud size={16} />} onClick={() => navigate('/upload')}>
              Upload
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard icon={<FolderOpen size={20} />} label="Local Projects" value={String(projects.length)} sub="on disk" color="violet" onClick={() => navigate('/projects')} />
          <KPICard icon={<HardDrive size={20} />} label="Local Files" value={totalFiles.toLocaleString()} sub={formatBytes(totalSize)} color="blue" onClick={() => navigate('/project-summary')} />
          <KPICard
            icon={<Cloud size={20} />}
            label="Wasabi Objects"
            value={wasabi?.total_objects?.toLocaleString() ?? '—'}
            sub={wasabi ? formatBytes(wasabi.total_size_bytes) : 'Not connected'}
            color="emerald"
            onClick={() => navigate('/wasabi-status')}
          />
          <KPICard
            icon={<ArrowRightLeft size={20} />}
            label="Connection"
            value={wasabiConnected ? 'Active' : 'Offline'}
            sub={wasabi?.bucket ?? 'Configure in Settings'}
            color={wasabiConnected ? 'emerald' : 'amber'}
            onClick={() => navigate('/settings')}
          />
        </div>

        {/* Projects list */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderOpen size={16} className="text-violet-400" />
              <h3 className="text-sm font-semibold text-white">Projects</h3>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                Manage <ArrowUpRight size={12} />
              </Button>
            </div>
          </CardHeader>
          <div className="divide-y divide-white/5">
            {loading && projects.length === 0 && (
              <div className="py-12 text-center">
                <RefreshCw size={24} className="mx-auto text-gray-600 animate-spin mb-2" />
                <p className="text-sm text-gray-500">Loading projects...</p>
              </div>
            )}

            {!loading && projects.length === 0 && (
              <div className="py-12 text-center">
                <FolderOpen size={32} className="mx-auto text-gray-700 mb-3" />
                <p className="text-sm text-gray-400">No projects yet</p>
                <p className="text-xs text-gray-600 mt-1">Create your first project to get started</p>
                <Button className="mt-4" size="sm" onClick={() => navigate('/projects')}>
                  Create Project
                </Button>
              </div>
            )}

            {projects.map((project) => {
              const maxStage = Math.max(...Object.values(project.stages).map(s => s.size), 1);
              return (
                <div
                  key={project.name}
                  className="px-6 py-4 hover:bg-white/3 transition-colors cursor-pointer"
                  onClick={() => navigate(`/project-summary`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {project.name[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{project.title || project.name}</h4>
                        <p className="text-xs text-gray-500">{project.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{project.total_files.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">files</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{formatBytes(project.total_size)}</p>
                        <p className="text-[10px] text-gray-500">storage</p>
                      </div>
                      <div className="flex gap-1">
                        {project.has_readme && (
                          <Badge className="text-gray-400 bg-gray-800 border-gray-700"><BookOpen size={9} /> Docs</Badge>
                        )}
                        {Object.keys(project.stages).length > 0 && (
                          <Badge className="text-violet-400 bg-violet-500/10 border-violet-500/30">
                            {Object.keys(project.stages).length} stages
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stage bars */}
                  <div className="flex gap-1 mt-2">
                    {Object.entries(project.stages).slice(0, 8).map(([name, info]) => (
                      <div key={name} className="flex-1" title={`${name}: ${info.files} files, ${formatBytes(info.size)}`}>
                        <Progress value={info.size} max={maxStage} size="sm" color="violet" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ActionCard icon={<UploadCloud size={20} />} title="Upload Assets" desc="Category-wise upload to Wasabi" color="blue" onClick={() => navigate('/upload')} />
          <ActionCard icon={<Search size={20} />} title="Browse Wasabi" desc="Search & navigate bucket contents" color="emerald" onClick={() => navigate('/wasabi-browser')} />
          <ActionCard icon={<ArrowRightLeft size={20} />} title="Sync Files" desc="Sync local and Wasabi files" color="violet" onClick={() => navigate('/file-sync')} />
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, sub, color, onClick }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string; onClick?: () => void;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  };
  const c = colorMap[color] ?? colorMap.violet;

  return (
    <Card className="cursor-pointer card-hover" onClick={onClick}>
      <CardBody className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border}`}>
            <div className={c.text}>{icon}</div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ActionCard({ icon, title, desc, color, onClick }: {
  icon: React.ReactNode; title: string; desc: string; color: string; onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  };

  return (
    <Card className="cursor-pointer card-hover" onClick={onClick}>
      <CardBody className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl border ${colorMap[color]}`}>{icon}</div>
        <div>
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
      </CardBody>
    </Card>
  );
}
