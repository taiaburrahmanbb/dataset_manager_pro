import {
  Files, FolderOpen, HardDrive, Cpu, TrendingUp, Clock,
  ArrowUpRight, UploadCloud, GitBranch, Download,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Progress } from '../components/common/Progress';
import { Button } from '../components/common/Button';
import { useAppStore } from '../store/appStore';
import { mockStats, storageChartData, uploadTrendData } from '../lib/mockData';
import { formatBytes, formatNumber, formatRelativeTime } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const PIE_COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#06b6d4'];

export default function Dashboard() {
  const { projects, jobs, activity } = useAppStore();
  const navigate = useNavigate();
  const activeJobs = jobs.filter((j) => j.status === 'running');

  const statCards = [
    {
      label: 'Total Files',
      value: formatNumber(mockStats.fileCount),
      icon: Files,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      change: '+1,347 today',
    },
    {
      label: 'Projects',
      value: mockStats.projectCount,
      icon: FolderOpen,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      change: '+1 this week',
    },
    {
      label: 'Storage Used',
      value: formatBytes(mockStats.usedStorage),
      icon: HardDrive,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      change: `of ${formatBytes(mockStats.totalStorage)}`,
    },
    {
      label: 'Active Jobs',
      value: activeJobs.length,
      icon: Cpu,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      change: 'processing now',
    },
  ];

  const activityIcons: Record<string, React.ElementType> = {
    upload: UploadCloud,
    process: Cpu,
    version: GitBranch,
    export: Download,
    annotation: Files,
    project: FolderOpen,
  };

  const activityColors: Record<string, string> = {
    upload: 'bg-blue-500/20 text-blue-400',
    process: 'bg-violet-500/20 text-violet-400',
    version: 'bg-emerald-500/20 text-emerald-400',
    export: 'bg-amber-500/20 text-amber-400',
    annotation: 'bg-cyan-500/20 text-cyan-400',
    project: 'bg-rose-500/20 text-rose-400',
  };

  const storageUsedPct = (mockStats.usedStorage / mockStats.totalStorage) * 100;

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Welcome back — here's what's happening"
        actions={
          <Button icon={<UploadCloud size={16} />} onClick={() => navigate('/files')}>
            Upload Data
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="animate-fadeIn">
                <CardBody className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{card.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <TrendingUp size={10} className="text-emerald-400" />
                        {card.change}
                      </p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${card.bg} border ${card.border}`}>
                      <Icon size={20} className={card.color} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Upload Trend Chart */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <div>
                <h3 className="text-sm font-semibold text-white">Upload Activity</h3>
                <p className="text-xs text-gray-500 mt-0.5">Files uploaded per day (last 7 days)</p>
              </div>
              <Badge className="text-violet-400 bg-violet-500/10 border-violet-500/30">Last 7 days</Badge>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={uploadTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e5e7eb' }}
                    itemStyle={{ color: '#a78bfa' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="files"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#uploadGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Storage Distribution */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-white">Storage by Project</h3>
            </CardHeader>
            <CardBody className="p-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={storageChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {storageChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                    formatter={(v) => [`${v} GB`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {storageChartData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-gray-400 truncate max-w-28">{item.name}</span>
                    </div>
                    <span className="text-gray-300 font-medium">{item.value} GB</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <h3 className="text-sm font-semibold text-white">Projects Overview</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                View all <ArrowUpRight size={12} />
              </Button>
            </CardHeader>
            <div className="divide-y divide-white/5">
              {projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/3 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${project.color} flex items-center justify-center flex-shrink-0 text-sm font-bold text-white`}>
                    {project.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{project.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatNumber(project.fileCount)} files · {formatBytes(project.storageUsed)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-32">
                    <Progress value={project.labelingProgress} size="sm" color="violet" />
                    <p className="text-[10px] text-gray-600 mt-1 text-right">{project.labelingProgress}% labeled</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
                See all <ArrowUpRight size={12} />
              </Button>
            </CardHeader>
            <div className="px-4 py-3 space-y-3">
              {activity.slice(0, 6).map((item) => {
                const Icon = activityIcons[item.type] || Files;
                return (
                  <div key={item.id} className="flex gap-3">
                    <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${activityColors[item.type] || 'bg-gray-700 text-gray-400'}`}>
                      <Icon size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-200 leading-tight">{item.title}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5 leading-tight truncate">{item.description}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={9} className="text-gray-600" />
                        <span className="text-[10px] text-gray-600">{formatRelativeTime(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Storage Bar */}
        <Card>
          <CardBody className="py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Wasabi Storage</span>
              </div>
              <span className="text-sm text-gray-400">
                {formatBytes(mockStats.usedStorage)} / {formatBytes(mockStats.totalStorage)}
              </span>
            </div>
            <Progress value={storageUsedPct} size="lg" color={storageUsedPct > 85 ? 'rose' : 'violet'} />
            <p className="text-xs text-gray-600 mt-2">
              {formatBytes(mockStats.totalStorage - mockStats.usedStorage)} available
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
