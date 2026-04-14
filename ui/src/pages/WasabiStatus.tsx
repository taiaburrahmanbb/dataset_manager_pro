import { useState, useEffect } from 'react';
import {
  Cloud, RefreshCw, CheckCircle, XCircle, HardDrive,
  FolderOpen, FileText, BarChart3, Globe, Server,
  ArrowRight, Wifi, WifiOff, ChevronRight,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Progress } from '../components/common/Progress';
import { Badge } from '../components/common/Badge';
import { useAppStore } from '../store/appStore';
import { getWasabiStatus, testWasabiConnection } from '../lib/api';
import { formatBytes, cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface ProjectStat {
  count: number;
  size: number;
  stages: Record<string, { count: number; size: number }>;
}

interface WasabiStatusData {
  connected: boolean;
  bucket: string;
  region: string;
  endpoint: string;
  base_prefix: string;
  total_objects: number;
  total_size_bytes: number;
  projects: Record<string, ProjectStat>;
  extension_breakdown: Record<string, number>;
  error?: string;
}

export default function WasabiStatus() {
  const { wasabiConnected, setWasabiConnected } = useAppStore();
  const [status, setStatus] = useState<WasabiStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWasabiStatus();
      setStatus(data);
      setWasabiConnected(data.connected);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(msg);
      setWasabiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await testWasabiConnection();
      setWasabiConnected(true);
      await fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
      setWasabiConnected(false);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const projectEntries = status?.projects
    ? Object.entries(status.projects).sort(([, a], [, b]) => b.size - a.size)
    : [];

  const maxProjSize = projectEntries.length > 0 ? projectEntries[0][1].size : 1;

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Wasabi Storage Status"
        subtitle="Cloud storage health and project overview"
        actions={
          <Button
            variant="outline"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchStatus}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Connection Banner */}
        <Card className={wasabiConnected ? 'border-emerald-500/30' : 'border-red-500/30'}>
          <CardBody className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${wasabiConnected ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                {wasabiConnected ? <Wifi size={24} className="text-emerald-400" /> : <WifiOff size={24} className="text-red-400" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {wasabiConnected ? 'Connected to Wasabi' : 'Wasabi Disconnected'}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {status?.bucket && (
                    <>
                      <span className="text-gray-400 font-medium">{status.bucket}</span>
                      <span className="text-gray-700 mx-1">/</span>
                      <span className="text-violet-400">{status.base_prefix}</span>
                    </>
                  )}
                  {!status?.bucket && 'Configure connection in Settings'}
                  {status?.region && <span className="text-gray-600 ml-2">({status.region})</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                loading={testing}
                icon={testing ? undefined : <CheckCircle size={14} />}
                onClick={handleTestConnection}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/settings')}>
                Settings <ArrowRight size={14} />
              </Button>
            </div>
          </CardBody>
        </Card>

        {error && (
          <Card className="border-red-500/30">
            <CardBody className="flex items-center gap-3">
              <XCircle size={18} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </CardBody>
          </Card>
        )}

        {status?.connected && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard icon={<FolderOpen size={18} />} label="Projects" value={String(projectEntries.length)} color="violet" />
              <KPICard icon={<FileText size={18} />} label="Total Objects" value={status.total_objects.toLocaleString()} color="blue" />
              <KPICard icon={<HardDrive size={18} />} label="Total Storage" value={formatBytes(status.total_size_bytes)} color="emerald" />
              <KPICard icon={<Globe size={18} />} label="Region" value={status.region} color="amber" />
            </div>

            {/* Path indicator */}
            <Card className="border-violet-500/20">
              <CardBody className="py-3 flex items-center gap-3">
                <Cloud size={16} className="text-violet-400 flex-shrink-0" />
                <div className="flex items-center gap-1.5 text-sm flex-wrap">
                  <span className="text-gray-400 font-medium">{status.bucket}</span>
                  <ChevronRight size={12} className="text-gray-700" />
                  <span className="text-gray-500">datasets</span>
                  <ChevronRight size={12} className="text-gray-700" />
                  <span className="text-violet-400 font-medium">projects</span>
                </div>
                <div className="ml-auto">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/wasabi-browser?prefix=datasets/projects/')}>
                    Browse <ArrowRight size={12} />
                  </Button>
                </div>
              </CardBody>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Projects Breakdown */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BarChart3 size={16} className="text-violet-400" />
                      <h3 className="text-sm font-semibold text-white">Storage by Project</h3>
                    </div>
                    <span className="text-xs text-gray-600">{projectEntries.length} project{projectEntries.length !== 1 ? 's' : ''}</span>
                  </CardHeader>
                  <CardBody className="space-y-1 max-h-[500px] overflow-y-auto">
                    {projectEntries.map(([name, info]) => {
                      const isExpanded = expandedProject === name;
                      const stageEntries = Object.entries(info.stages).sort(([, a], [, b]) => b.size - a.size);
                      const maxStageSize = stageEntries.length > 0 ? stageEntries[0][1].size : 1;

                      return (
                        <div key={name} className="rounded-lg border border-white/5 overflow-hidden">
                          <button
                            onClick={() => setExpandedProject(isExpanded ? null : name)}
                            className="w-full text-left p-3 hover:bg-white/3 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                  {name[0]}
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-white">{name}</span>
                                  <p className="text-[10px] text-gray-600">
                                    {info.count.toLocaleString()} objects | {Object.keys(info.stages).length} stages
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-300">{formatBytes(info.size)}</span>
                                <ChevronRight size={14} className={cn('text-gray-600 transition-transform', isExpanded && 'rotate-90')} />
                              </div>
                            </div>
                            <Progress value={info.size} max={maxProjSize} size="sm" color="violet" />
                          </button>

                          {isExpanded && stageEntries.length > 0 && (
                            <div className="border-t border-white/5 bg-gray-900/50">
                              {stageEntries.map(([stage, stageInfo]) => (
                                <button
                                  key={stage}
                                  onClick={() => navigate(`/wasabi-browser?prefix=datasets/projects/${name}/${stage}/`)}
                                  className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-white/3 transition-colors group"
                                >
                                  <FolderOpen size={12} className="text-gray-600 group-hover:text-violet-400 flex-shrink-0" />
                                  <span className="text-xs text-gray-400 group-hover:text-gray-200 flex-1 truncate">{stage}/</span>
                                  <span className="text-[10px] text-gray-600 flex-shrink-0">{stageInfo.count.toLocaleString()} files</span>
                                  <span className="text-[10px] text-gray-500 flex-shrink-0 w-16 text-right">{formatBytes(stageInfo.size)}</span>
                                  <div className="w-20 flex-shrink-0">
                                    <Progress value={stageInfo.size} max={maxStageSize} size="sm" color="blue" />
                                  </div>
                                </button>
                              ))}
                              <div className="px-4 py-2 border-t border-white/5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-violet-400"
                                  onClick={() => navigate(`/wasabi-browser?prefix=datasets/projects/${name}/`)}
                                >
                                  Browse {name} in Wasabi <ArrowRight size={11} />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {projectEntries.length === 0 && (
                      <div className="text-center py-8">
                        <FolderOpen size={28} className="mx-auto text-gray-700 mb-2" />
                        <p className="text-sm text-gray-500">No projects in Wasabi yet</p>
                        <p className="text-xs text-gray-600 mt-0.5">Upload files to get started</p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>

              {/* Right column: File types + Connection details */}
              <div className="space-y-5">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-blue-400" />
                      <h3 className="text-sm font-semibold text-white">File Types</h3>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(status.extension_breakdown).map(([ext, count]) => (
                        <Badge key={ext} className="text-gray-300 bg-gray-800 border-gray-700">
                          .{ext}
                          <span className="ml-1 text-gray-500">{count.toLocaleString()}</span>
                        </Badge>
                      ))}
                      {Object.keys(status.extension_breakdown).length === 0 && (
                        <p className="text-sm text-gray-600">No files found</p>
                      )}
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Server size={16} className="text-emerald-400" />
                      <h3 className="text-sm font-semibold text-white">Connection</h3>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-3">
                    <DetailItem label="Endpoint" value={status.endpoint} />
                    <DetailItem label="Region" value={status.region} />
                    <DetailItem label="Bucket" value={status.bucket} />
                    <DetailItem label="Root Path" value={status.base_prefix} />
                    <DetailItem label="Status" value="Active" />
                  </CardBody>
                </Card>
              </div>
            </div>
          </>
        )}

        {!status?.connected && !loading && !error && (
          <div className="text-center py-20">
            <Cloud size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">Not Connected</h3>
            <p className="text-sm text-gray-600 mt-1 mb-4">Configure your Wasabi credentials in Settings to get started</p>
            <Button onClick={() => navigate('/settings')}>Go to Settings</Button>
          </div>
        )}

        {loading && !status && (
          <div className="text-center py-20">
            <RefreshCw size={32} className="mx-auto text-gray-600 animate-spin mb-4" />
            <p className="text-sm text-gray-500">Fetching Wasabi status...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-500/10 text-violet-400',
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
  };

  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>{icon}</div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-white">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-600 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-200 font-medium break-all mt-0.5">{value}</p>
    </div>
  );
}
