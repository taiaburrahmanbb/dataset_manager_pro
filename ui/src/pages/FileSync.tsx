import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRightLeft, RefreshCw, ArrowRight, ArrowLeft,
  CheckCircle, XCircle, AlertTriangle, FolderOpen,
  Cloud, FileText, Search, Clock, Zap, StopCircle,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Progress } from '../components/common/Progress';
import { cn, formatBytes } from '../lib/utils';
import {
  getLocalProjects, compareSyncFiles,
  syncUploadStream, syncDownloadStream,
} from '../lib/api';
import type { LocalProject, SyncComparison, SyncFile, SyncProgressEvent } from '../lib/api';

type SyncTab = 'local_only' | 'wasabi_only' | 'synced';

interface SyncProgress {
  direction: 'upload' | 'download';
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  currentFile: string;
  currentFileSize: number;
  currentBytesSent: number;
  totalBytesSent: number;
  startedAt: number;
  fileLog: { file: string; status: 'success' | 'error'; error?: string }[];
}

function formatETA(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '--';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export default function FileSync() {
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [selectedProject, setSelectedProject] = useState(searchParams.get('project') || '');
  const [comparison, setComparison] = useState<SyncComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [tab, setTab] = useState<SyncTab>('local_only');
  const [overwrite, setOverwrite] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getLocalProjects().then(data => {
      setProjects(data);
      if (!selectedProject && data.length > 0) {
        setSelectedProject(data[0].name);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadComparison();
    }
  }, [selectedProject]);

  const loadComparison = async () => {
    if (!selectedProject) return;
    setLoading(true);
    setSyncResult(null);
    setSelectedFiles(new Set());
    try {
      const data = await compareSyncFiles(selectedProject);
      setComparison(data);
    } catch {
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleSyncUpload = async (files?: string[]) => {
    setSyncing(true);
    setSyncResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const prog: SyncProgress = {
      direction: 'upload', total: 0, completed: 0, succeeded: 0, failed: 0,
      currentFile: 'Preparing...', currentFileSize: 0, currentBytesSent: 0,
      totalBytesSent: 0, startedAt: Date.now(), fileLog: [],
    };
    setProgress({ ...prog });

    try {
      await syncUploadStream(selectedProject, files, overwrite, (evt: SyncProgressEvent) => {
        if (evt.event === 'start') {
          prog.total = evt.total ?? 0;
        } else if (evt.event === 'file_start') {
          prog.currentFile = evt.file ?? '';
          prog.currentFileSize = evt.file_size ?? 0;
          prog.currentBytesSent = 0;
        } else if (evt.event === 'bytes') {
          prog.currentBytesSent = evt.bytes_sent ?? 0;
          prog.totalBytesSent += (evt.bytes_sent ?? 0) - prog.currentBytesSent;
        } else if (evt.event === 'progress') {
          prog.completed = evt.index ?? prog.completed + 1;
          prog.currentBytesSent = 0;
          prog.currentFileSize = 0;
          if (evt.status === 'success') {
            prog.succeeded++;
            prog.totalBytesSent += evt.size ?? 0;
          } else {
            prog.failed++;
          }
          prog.fileLog.push({ file: evt.file ?? '', status: evt.status ?? 'error', error: evt.error });
        } else if (evt.event === 'complete') {
          prog.completed = prog.total;
          prog.currentFile = '';
        }
        setProgress({ ...prog, fileLog: [...prog.fileLog] });
      }, controller.signal);

      setSyncResult(`Uploaded ${prog.succeeded} file(s)${prog.failed > 0 ? `, ${prog.failed} failed` : ''}`);
      await loadComparison();
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        setSyncResult(`Cancelled — uploaded ${prog.succeeded} file(s) before stop`);
      } else {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setSyncResult(`Error: ${msg}`);
      }
    } finally {
      setSyncing(false);
      abortRef.current = null;
    }
  };

  const handleSyncDownload = async (files?: string[]) => {
    setSyncing(true);
    setSyncResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const prog: SyncProgress = {
      direction: 'download', total: 0, completed: 0, succeeded: 0, failed: 0,
      currentFile: 'Preparing...', currentFileSize: 0, currentBytesSent: 0,
      totalBytesSent: 0, startedAt: Date.now(), fileLog: [],
    };
    setProgress({ ...prog });

    try {
      await syncDownloadStream(selectedProject, files, overwrite, (evt: SyncProgressEvent) => {
        if (evt.event === 'start') {
          prog.total = evt.total ?? 0;
        } else if (evt.event === 'file_start') {
          prog.currentFile = evt.file ?? '';
        } else if (evt.event === 'progress') {
          prog.completed = evt.index ?? prog.completed + 1;
          if (evt.status === 'success') prog.succeeded++;
          else prog.failed++;
          prog.fileLog.push({ file: evt.file ?? '', status: evt.status ?? 'error', error: evt.error });
        } else if (evt.event === 'complete') {
          prog.completed = prog.total;
          prog.currentFile = '';
        }
        setProgress({ ...prog, fileLog: [...prog.fileLog] });
      }, controller.signal);

      setSyncResult(`Downloaded ${prog.succeeded} file(s)${prog.failed > 0 ? `, ${prog.failed} failed` : ''}`);
      await loadComparison();
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        setSyncResult(`Cancelled — downloaded ${prog.succeeded} file(s) before stop`);
      } else {
        const msg = err instanceof Error ? err.message : 'Download failed';
        setSyncResult(`Error: ${msg}`);
      }
    } finally {
      setSyncing(false);
      abortRef.current = null;
    }
  };

  const toggleFile = (path: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const selectAll = (files: SyncFile[]) => {
    const paths = files.map(f => f.relative_path);
    setSelectedFiles(prev => {
      const next = new Set(prev);
      const allSelected = paths.every(p => next.has(p));
      if (allSelected) {
        paths.forEach(p => next.delete(p));
      } else {
        paths.forEach(p => next.add(p));
      }
      return next;
    });
  };

  const currentFiles = comparison
    ? tab === 'local_only' ? comparison.local_only
      : tab === 'wasabi_only' ? comparison.wasabi_only
      : comparison.both
    : [];

  const filteredFiles = search
    ? currentFiles.filter(f => f.relative_path.toLowerCase().includes(search.toLowerCase()))
    : currentFiles;

  const summary = comparison?.summary;

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="File Sync"
        subtitle="Synchronize files between local storage and Wasabi"
        actions={
          <Button
            variant="outline"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={loadComparison}
            disabled={loading || !selectedProject}
          >
            Refresh
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Project selector + overwrite toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-violet-500/50"
          >
            <option value="">Select project...</option>
            {projects.map(p => (
              <option key={p.name} value={p.name}>{p.title || p.name} ({p.name})</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-white/8 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={e => setOverwrite(e.target.checked)}
              className="accent-violet-500"
            />
            <span className="text-sm text-gray-300">Overwrite existing</span>
          </label>
        </div>

        {/* Live progress panel */}
        {syncing && progress && <SyncProgressPanel progress={progress} onCancel={handleCancel} />}

        {/* Sync status result */}
        {!syncing && syncResult && (
          <Card className={syncResult.startsWith('Error') || syncResult.startsWith('Cancelled') ? 'border-red-500/30' : 'border-emerald-500/30'}>
            <CardBody className="flex items-center gap-3 py-3">
              {syncResult.startsWith('Error') || syncResult.startsWith('Cancelled') ? (
                <XCircle size={16} className="text-red-400" />
              ) : (
                <CheckCircle size={16} className="text-emerald-400" />
              )}
              <p className={`text-sm ${syncResult.startsWith('Error') || syncResult.startsWith('Cancelled') ? 'text-red-400' : 'text-emerald-400'}`}>{syncResult}</p>
              {!syncing && progress && progress.fileLog.length > 0 && (
                <button
                  onClick={() => setProgress(null)}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </CardBody>
          </Card>
        )}

        {/* Completed file log */}
        {!syncing && progress && progress.fileLog.length > 0 && (
          <SyncFileLog log={progress.fileLog} />
        )}

        {loading && (
          <div className="text-center py-20">
            <RefreshCw size={32} className="mx-auto text-gray-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Comparing local and Wasabi files...</p>
          </div>
        )}

        {!loading && comparison && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <SummaryCard icon={<FolderOpen size={16} />} label="Local Files" value={summary!.local_total} color="blue" />
              <SummaryCard icon={<Cloud size={16} />} label="Wasabi Files" value={summary!.wasabi_total} color="violet" />
              <SummaryCard icon={<ArrowRight size={16} />} label="Local Only" value={summary!.local_only_count} color="amber" />
              <SummaryCard icon={<ArrowLeft size={16} />} label="Wasabi Only" value={summary!.wasabi_only_count} color="rose" />
              <SummaryCard icon={<CheckCircle size={16} />} label="Synced" value={summary!.synced_count} color="emerald"
                sub={summary!.size_mismatches > 0 ? `${summary!.size_mismatches} mismatches` : undefined} />
            </div>

            {/* Bulk actions */}
            <Card>
              <CardBody className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3">
                <p className="text-xs text-gray-500">
                  Wasabi prefix: <code className="text-violet-400">{comparison.wasabi_prefix}</code>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ArrowRight size={13} />}
                    loading={syncing}
                    disabled={syncing || summary!.local_only_count === 0}
                    onClick={() => handleSyncUpload()}
                  >
                    Upload All Local ({summary!.local_only_count})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ArrowLeft size={13} />}
                    loading={syncing}
                    disabled={syncing || summary!.wasabi_only_count === 0}
                    onClick={() => handleSyncDownload()}
                  >
                    Download All Wasabi ({summary!.wasabi_only_count})
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit">
              {([
                { key: 'local_only' as SyncTab, label: 'Local Only', count: comparison.local_only.length, icon: ArrowRight },
                { key: 'wasabi_only' as SyncTab, label: 'Wasabi Only', count: comparison.wasabi_only.length, icon: ArrowLeft },
                { key: 'synced' as SyncTab, label: 'Synced', count: comparison.both.length, icon: CheckCircle },
              ]).map(({ key, label, count, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); setSelectedFiles(new Set()); }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-all',
                    tab === key ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  <Icon size={12} />
                  {label}
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px]', tab === key ? 'bg-white/20' : 'bg-gray-800')}>
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search + selected actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter files..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
                />
              </div>
              {selectedFiles.size > 0 && (
                <div className="flex gap-2">
                  {tab === 'local_only' && (
                    <Button
                      size="sm"
                      icon={<ArrowRight size={13} />}
                      loading={syncing}
                      onClick={() => handleSyncUpload([...selectedFiles])}
                    >
                      Upload Selected ({selectedFiles.size})
                    </Button>
                  )}
                  {tab === 'wasabi_only' && (
                    <Button
                      size="sm"
                      icon={<ArrowLeft size={13} />}
                      loading={syncing}
                      onClick={() => handleSyncDownload([...selectedFiles])}
                    >
                      Download Selected ({selectedFiles.size})
                    </Button>
                  )}
                  {tab === 'synced' && (
                    <>
                      <Button variant="outline" size="sm" icon={<ArrowRight size={13} />} loading={syncing}
                        onClick={() => handleSyncUpload([...selectedFiles])}>
                        Re-upload ({selectedFiles.size})
                      </Button>
                      <Button variant="outline" size="sm" icon={<ArrowLeft size={13} />} loading={syncing}
                        onClick={() => handleSyncDownload([...selectedFiles])}>
                        Re-download ({selectedFiles.size})
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* File List — Dual Pane */}
            <Card>
              <div className="divide-y divide-white/5">
                {/* Header */}
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 px-4 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                  <div className="w-5">
                    <input
                      type="checkbox"
                      className="accent-violet-500"
                      checked={filteredFiles.length > 0 && filteredFiles.every(f => selectedFiles.has(f.relative_path))}
                      onChange={() => selectAll(filteredFiles)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <FolderOpen size={10} /> Local
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud size={10} /> Wasabi
                  </div>
                  <div className="w-20 text-center">Action</div>
                </div>

                {filteredFiles.length === 0 && (
                  <div className="py-12 text-center text-gray-600">
                    <ArrowRightLeft size={28} className="mx-auto mb-2 text-gray-700" />
                    <p className="text-sm">
                      {tab === 'local_only' ? 'All local files are synced to Wasabi' :
                       tab === 'wasabi_only' ? 'All Wasabi files exist locally' :
                       'No files synced between local and Wasabi'}
                    </p>
                  </div>
                )}

                {filteredFiles.map(file => (
                  <div
                    key={file.relative_path}
                    className={cn(
                      'grid grid-cols-[auto_1fr_1fr_auto] gap-2 px-4 py-2.5 items-center hover:bg-white/3 transition-colors',
                      selectedFiles.has(file.relative_path) && 'bg-violet-500/5'
                    )}
                  >
                    <div className="w-5">
                      <input
                        type="checkbox"
                        className="accent-violet-500"
                        checked={selectedFiles.has(file.relative_path)}
                        onChange={() => toggleFile(file.relative_path)}
                      />
                    </div>

                    {/* Local column */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText size={12} className={file.local_size != null ? 'text-blue-400' : 'text-gray-700'} />
                        <span className="text-xs text-gray-300 truncate">{file.relative_path}</span>
                      </div>
                      {file.local_size != null ? (
                        <span className="text-[10px] text-gray-500 ml-5">{formatBytes(file.local_size)}</span>
                      ) : (
                        <span className="text-[10px] text-gray-700 ml-5">— not on disk</span>
                      )}
                    </div>

                    {/* Wasabi column */}
                    <div className="min-w-0">
                      {file.wasabi_size != null ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Cloud size={12} className="text-violet-400" />
                            <span className="text-xs text-gray-300 truncate">{file.wasabi_key || file.relative_path}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-5">
                            <span className="text-[10px] text-gray-500">{formatBytes(file.wasabi_size)}</span>
                            {file.size_match === false && (
                              <Badge className="text-amber-400 bg-amber-500/10 border-amber-500/30">
                                <AlertTriangle size={8} /> size mismatch
                              </Badge>
                            )}
                            {file.size_match === true && (
                              <CheckCircle size={10} className="text-emerald-500" />
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Cloud size={12} className="text-gray-700" />
                          <span className="text-[10px] text-gray-700">— not in Wasabi</span>
                        </div>
                      )}
                    </div>

                    {/* Action column */}
                    <div className="w-20 flex justify-center">
                      {tab === 'local_only' && (
                        <button
                          onClick={() => handleSyncUpload([file.relative_path])}
                          disabled={syncing}
                          className="p-1.5 rounded-md text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Upload to Wasabi"
                        >
                          <ArrowRight size={14} />
                        </button>
                      )}
                      {tab === 'wasabi_only' && (
                        <button
                          onClick={() => handleSyncDownload([file.relative_path])}
                          disabled={syncing}
                          className="p-1.5 rounded-md text-violet-400 hover:bg-violet-500/10 transition-colors"
                          title="Download to local"
                        >
                          <ArrowLeft size={14} />
                        </button>
                      )}
                      {tab === 'synced' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSyncUpload([file.relative_path])}
                            disabled={syncing}
                            className="p-1 rounded text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Re-upload to Wasabi"
                          >
                            <ArrowRight size={12} />
                          </button>
                          <button
                            onClick={() => handleSyncDownload([file.relative_path])}
                            disabled={syncing}
                            className="p-1 rounded text-violet-400 hover:bg-violet-500/10 transition-colors"
                            title="Re-download from Wasabi"
                          >
                            <ArrowLeft size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {!loading && !comparison && selectedProject && (
          <div className="text-center py-20">
            <XCircle size={32} className="mx-auto text-gray-700 mb-3" />
            <p className="text-sm text-gray-400">Could not compare files</p>
            <p className="text-xs text-gray-600 mt-1">Make sure the backend is running and Wasabi is connected</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: number; color: string; sub?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400',
    violet: 'bg-violet-500/10 text-violet-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
  };

  return (
    <Card>
      <CardBody className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <div>
          <p className="text-lg font-bold text-white">{value.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">{label}</p>
          {sub && <p className="text-[10px] text-amber-400">{sub}</p>}
        </div>
      </CardBody>
    </Card>
  );
}

function SyncProgressPanel({ progress, onCancel }: { progress: SyncProgress; onCancel: () => void }) {
  const {
    direction, total, completed, succeeded, failed,
    currentFile, currentFileSize, currentBytesSent, startedAt,
  } = progress;
  const elapsed = Date.now() - startedAt;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const rate = elapsed > 0 ? completed / (elapsed / 1000) : 0;
  const remaining = rate > 0 ? (total - completed) / rate : 0;
  const isUpload = direction === 'upload';

  const filePct = currentFileSize > 0
    ? Math.min(100, Math.round((currentBytesSent / currentFileSize) * 100))
    : 0;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  void tick;

  return (
    <Card className="border-violet-500/30 overflow-hidden">
      <div className="relative">
        <div
          className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-transparent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
        <CardBody className="relative space-y-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                isUpload ? 'bg-blue-500/15 text-blue-400' : 'bg-violet-500/15 text-violet-400',
              )}>
                {isUpload ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {isUpload ? 'Uploading to Wasabi' : 'Downloading from Wasabi'}
                </h3>
                <p className="text-[10px] text-gray-500">
                  {completed} of {total} files processed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white tabular-nums">{pct}%</span>
              <Button variant="ghost" size="sm" icon={<StopCircle size={14} />} onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>

          {/* Overall progress bar */}
          <Progress value={completed} max={total || 1} color={isUpload ? 'blue' : 'violet'} size="lg" />

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill icon={<Clock size={11} />} label="Elapsed" value={formatElapsed(elapsed)} />
            <StatPill icon={<Clock size={11} />} label="ETA" value={formatETA(remaining)} />
            <StatPill icon={<Zap size={11} />} label="Speed" value={rate >= 0.1 ? `${rate.toFixed(1)} files/s` : 'calculating...'} />
            <StatPill
              icon={failed > 0 ? <XCircle size={11} /> : <CheckCircle size={11} />}
              label="Status"
              value={`${succeeded} ok${failed > 0 ? ` / ${failed} fail` : ''}`}
              warn={failed > 0}
            />
          </div>

          {/* Current file with byte-level progress */}
          {currentFile && (
            <div className="space-y-2 px-3 py-2.5 bg-gray-900/60 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw size={11} className="text-violet-400 animate-spin flex-shrink-0" />
                <span className="text-xs text-gray-400 truncate flex-1">{currentFile}</span>
                {currentFileSize > 0 && (
                  <span className="text-[10px] text-gray-500 tabular-nums flex-shrink-0">
                    {formatBytes(currentBytesSent)} / {formatBytes(currentFileSize)} ({filePct}%)
                  </span>
                )}
              </div>
              {currentFileSize > 0 && (
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      isUpload
                        ? 'bg-gradient-to-r from-blue-600 to-blue-400'
                        : 'bg-gradient-to-r from-violet-600 to-violet-400',
                    )}
                    style={{ width: `${filePct}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </CardBody>
      </div>
    </Card>
  );
}

function StatPill({ icon, label, value, warn }: {
  icon: React.ReactNode; label: string; value: string; warn?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-lg">
      <span className={cn('flex-shrink-0', warn ? 'text-amber-400' : 'text-gray-500')}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] text-gray-600 uppercase tracking-wider">{label}</p>
        <p className={cn('text-xs font-medium tabular-nums', warn ? 'text-amber-400' : 'text-gray-300')}>
          {value}
        </p>
      </div>
    </div>
  );
}

function SyncFileLog({ log }: { log: { file: string; status: 'success' | 'error'; error?: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  const errors = log.filter(e => e.status === 'error');
  const displayLog = expanded ? log : log.slice(-8);
  const hasMore = !expanded && log.length > 8;

  return (
    <Card className="border-gray-800">
      <CardBody className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:bg-white/3 transition-colors"
        >
          <span>
            Sync log — {log.length} files
            {errors.length > 0 && <span className="text-amber-400 ml-1">({errors.length} errors)</span>}
          </span>
          <span className="text-gray-600">{expanded ? 'Collapse' : 'Show all'}</span>
        </button>
        <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
          {hasMore && (
            <div className="px-4 py-1.5 text-[10px] text-gray-600 text-center">
              ... {log.length - 8} earlier entries hidden ...
            </div>
          )}
          {displayLog.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-1.5">
              {entry.status === 'success' ? (
                <CheckCircle size={10} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <XCircle size={10} className="text-red-400 flex-shrink-0" />
              )}
              <span className="text-[11px] text-gray-400 truncate flex-1">{entry.file}</span>
              {entry.error && (
                <span className="text-[10px] text-red-400/70 truncate max-w-[200px]">{entry.error}</span>
              )}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
