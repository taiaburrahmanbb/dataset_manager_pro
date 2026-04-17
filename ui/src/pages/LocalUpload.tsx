import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud, FolderOpen, CheckCircle, XCircle,
  X, ChevronRight, ArrowLeft, HardDrive,
  FileArchive, FileText, RefreshCw,
  Clock, Zap, StopCircle,
  Copy, ChevronDown, ChevronUp, FileCheck, AlertTriangle,
  BarChart3, FolderPlus,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Progress } from '../components/common/Progress';
import { Badge } from '../components/common/Badge';
import { cn, formatBytes } from '../lib/utils';
import {
  getLocalProjects, getLocalProjectTree, getProjectStages,
  uploadToLocal, createProjectSubdir,
} from '../lib/api';
import type { LocalProject, ProjectStage } from '../lib/api';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  result?: { path: string; size: number };
}

const STAGE_COLORS: Record<string, string> = {
  '01.raw': 'from-red-600 to-orange-600',
  '02.processing': 'from-blue-600 to-cyan-600',
  '03.processed': 'from-emerald-600 to-teal-600',
  '04.models': 'from-violet-600 to-purple-600',
  '05.benchmarks': 'from-fuchsia-600 to-pink-600',
  '06.monitoring': 'from-rose-600 to-red-600',
  '07.csv': 'from-indigo-600 to-blue-600',
  '08.docs': 'from-gray-600 to-slate-600',
};

interface TreeEntry {
  name: string;
  type: 'dir' | 'file';
  size?: number;
  ext?: string;
  children_count?: number;
}

interface OverallProgress {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  currentFile: string;
  currentFileSize: number;
  currentFilePct: number;
  totalBytes: number;
  bytesSent: number;
  startedAt: number;
  finishedAt: number;
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

export default function LocalUpload() {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [browsingPath, setBrowsingPath] = useState('');
  const [treeEntries, setTreeEntries] = useState<TreeEntry[]>([]);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingStages, setLoadingStages] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState<OverallProgress | null>(null);
  const [reportExpanded, setReportExpanded] = useState(true);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getLocalProjects().then(data => {
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0].name);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedProject) {
      setSelectedStage('');
      setBrowsingPath('');
      setTreeEntries([]);
      loadStages();
    }
  }, [selectedProject]);

  const loadStages = async () => {
    if (!selectedProject) return;
    setLoadingStages(true);
    try {
      const data = await getProjectStages(selectedProject);
      setStages(data.stages);
    } catch {
      setStages([]);
    } finally {
      setLoadingStages(false);
    }
  };

  const selectStage = (stageName: string) => {
    setSelectedStage(stageName);
    setBrowsingPath(stageName);
    loadTree(stageName);
  };

  const loadTree = async (relativePath: string) => {
    setLoadingTree(true);
    try {
      const data = await getLocalProjectTree(selectedProject, relativePath);
      setTreeEntries(data.entries || []);
    } catch {
      setTreeEntries([]);
    } finally {
      setLoadingTree(false);
    }
  };

  const navigateToSubdir = (dirName: string) => {
    const newPath = browsingPath ? `${browsingPath}/${dirName}` : dirName;
    setBrowsingPath(newPath);
    loadTree(newPath);
  };

  const navigateToBreadcrumb = (index: number) => {
    const parts = browsingPath.split('/');
    const newPath = parts.slice(0, index + 1).join('/');
    setBrowsingPath(newPath);
    loadTree(newPath);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const path = browsingPath
      ? `${browsingPath}/${newFolderName.trim()}`
      : newFolderName.trim();
    try {
      await createProjectSubdir(selectedProject, path);
      setNewFolderName('');
      setShowNewFolder(false);
      loadTree(browsingPath);
    } catch { /* ignore */ }
  };

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: UploadItem[] = acceptedFiles.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      progress: 0,
      status: 'pending' as const,
    }));
    setUploads(prev => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: handleDrop });

  const removeUpload = (id: string) => setUploads(prev => prev.filter(u => u.id !== id));
  const clearCompleted = () => setUploads(prev => prev.filter(u => u.status !== 'done'));

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const startUpload = async () => {
    if (!browsingPath) return;
    setUploading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const pending = uploads.filter(u => u.status === 'pending');
    const totalBytes = pending.reduce((s, u) => s + u.file.size, 0);
    const prog: OverallProgress = {
      total: pending.length, completed: 0, succeeded: 0, failed: 0,
      currentFile: '', currentFileSize: 0, currentFilePct: 0,
      totalBytes, bytesSent: 0, startedAt: Date.now(), finishedAt: 0,
    };
    setOverallProgress({ ...prog });

    let cancelled = false;
    for (const item of pending) {
      if (controller.signal.aborted) { cancelled = true; break; }

      prog.currentFile = item.file.name;
      prog.currentFileSize = item.file.size;
      prog.currentFilePct = 0;
      setOverallProgress({ ...prog });
      setUploads(prev => prev.map(u => (u.id === item.id ? { ...u, status: 'uploading' as const } : u)));

      try {
        const result = await uploadToLocal(item.file, selectedProject, browsingPath, pct => {
          prog.currentFilePct = pct;
          setOverallProgress({ ...prog });
          setUploads(prev => prev.map(u => (u.id === item.id ? { ...u, progress: pct } : u)));
        }, controller.signal);

        prog.completed++;
        prog.succeeded++;
        prog.bytesSent += item.file.size;
        prog.currentFilePct = 100;
        setOverallProgress({ ...prog });
        setUploads(prev => prev.map(u =>
          u.id === item.id ? { ...u, progress: 100, status: 'done' as const, result: { path: result.path, size: result.size } } : u
        ));
      } catch (err: unknown) {
        if (controller.signal.aborted) { cancelled = true; break; }
        prog.completed++;
        prog.failed++;
        setOverallProgress({ ...prog });
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploads(prev => prev.map(u => (u.id === item.id ? { ...u, status: 'error' as const, error: msg } : u)));
      }
    }

    prog.currentFile = '';
    prog.currentFilePct = 0;
    prog.finishedAt = Date.now();
    if (cancelled) prog.completed = prog.succeeded + prog.failed;
    setOverallProgress({ ...prog });
    setReportExpanded(true);
    setUploading(false);
    abortRef.current = null;
    loadTree(browsingPath);
  };

  const pendingCount = uploads.filter(u => u.status === 'pending').length;
  const doneCount = uploads.filter(u => u.status === 'done').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;

  const destDisplay = browsingPath
    ? `data/projects/${selectedProject}/${browsingPath}/`
    : '';

  const breadcrumbParts = browsingPath ? browsingPath.split('/') : [];

  const dirs = treeEntries.filter(e => e.type === 'dir');
  const files = treeEntries.filter(e => e.type === 'file');

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Local Upload"
        subtitle="Upload files directly to local project folders"
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Project selector */}
        <div className="flex gap-3">
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="flex-1 max-w-xs px-3 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-blue-500/50"
          >
            <option value="">Select project...</option>
            {projects.map(p => (
              <option key={p.name} value={p.name}>{p.title || p.name}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" icon={<RefreshCw size={13} className={loadingStages ? 'animate-spin' : ''} />} onClick={loadStages} disabled={!selectedProject}>
            Refresh
          </Button>
        </div>

        {/* Stage grid */}
        {selectedProject && !selectedStage && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Local Folders</h3>
              </div>
              <span className="text-xs text-gray-500">{stages.length} stages in {selectedProject}</span>
            </CardHeader>
            <CardBody>
              {loadingStages ? (
                <div className="py-12 text-center">
                  <RefreshCw size={24} className="mx-auto text-gray-600 animate-spin mb-2" />
                  <p className="text-sm text-gray-500">Loading local folders...</p>
                </div>
              ) : stages.length === 0 ? (
                <div className="py-12 text-center">
                  <FolderOpen size={28} className="mx-auto text-gray-700 mb-2" />
                  <p className="text-sm text-gray-500">No stage folders found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {stages.map(stage => {
                    const gradient = STAGE_COLORS[stage.name] || 'from-gray-600 to-gray-700';
                    return (
                      <button
                        key={stage.name}
                        onClick={() => selectStage(stage.name)}
                        className="group text-left p-4 rounded-xl border border-white/8 bg-gray-900/50 hover:border-blue-500/40 hover:bg-gray-800/60 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                            <HardDrive size={16} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{stage.name}</p>
                            <p className="text-[10px] text-gray-600">
                              {stage.total_files} file{stage.total_files !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">
                          {stage.purpose}
                        </p>
                        {stage.total_size > 0 && (
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
                            <HardDrive size={9} />
                            <span>{stage.total_files.toLocaleString()} files</span>
                            <span className="text-gray-700">|</span>
                            <span>{formatBytes(stage.total_size)}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Browsing + Upload area */}
        {selectedStage && (
          <>
            {/* Destination highlight */}
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardBody className="py-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium text-gray-400">Destination:</span>{' '}
                      <code className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {destDisplay}
                      </code>
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Breadcrumb navigation */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => { setSelectedStage(''); setBrowsingPath(''); setTreeEntries([]); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ArrowLeft size={12} />
                {selectedProject}
              </button>
              {breadcrumbParts.map((part, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <ChevronRight size={10} className="text-gray-700" />
                  <button
                    onClick={() => navigateToBreadcrumb(i)}
                    className={cn(
                      'text-xs transition-colors',
                      i === breadcrumbParts.length - 1
                        ? 'text-blue-400 font-medium'
                        : 'text-gray-500 hover:text-gray-300'
                    )}
                  >
                    {part}
                  </button>
                </div>
              ))}
            </div>

            {/* Overall upload progress panel */}
            {uploading && overallProgress && (
              <UploadProgressPanel progress={overallProgress} onCancel={handleCancel} />
            )}

            {/* Upload report */}
            {!uploading && overallProgress && overallProgress.completed > 0 && (
              <UploadReport
                progress={overallProgress}
                items={uploads}
                destPath={destDisplay}
                expanded={reportExpanded}
                onToggle={() => setReportExpanded(e => !e)}
                onDismiss={() => setOverallProgress(null)}
              />
            )}

            {/* Existing contents + upload */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: local contents */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <HardDrive size={14} className="text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">Local Contents</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" icon={<FolderPlus size={11} />}
                      onClick={() => setShowNewFolder(v => !v)}
                      title="New folder"
                    />
                    <Button variant="ghost" size="sm" icon={<RefreshCw size={11} className={loadingTree ? 'animate-spin' : ''} />}
                      onClick={() => loadTree(browsingPath)} />
                  </div>
                </CardHeader>

                {showNewFolder && (
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                      placeholder="New folder name..."
                      className="flex-1 px-2 py-1.5 bg-gray-800 border border-white/10 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500/50"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
                    <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="text-gray-500 hover:text-gray-300">
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                  {loadingTree && (
                    <div className="py-8 text-center">
                      <RefreshCw size={18} className="mx-auto text-gray-600 animate-spin mb-2" />
                      <p className="text-xs text-gray-500">Loading...</p>
                    </div>
                  )}

                  {!loadingTree && dirs.length === 0 && files.length === 0 && (
                    <div className="py-8 text-center">
                      <FolderOpen size={24} className="mx-auto text-gray-700 mb-2" />
                      <p className="text-xs text-gray-500">Empty folder</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">Upload files or create a subfolder</p>
                    </div>
                  )}

                  {dirs.map(d => (
                    <button
                      key={d.name}
                      onClick={() => navigateToSubdir(d.name)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-white/3 transition-colors group"
                    >
                      <FolderOpen size={14} className="text-amber-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-200 truncate">{d.name}</p>
                        <p className="text-[10px] text-gray-600">{d.children_count ?? 0} items</p>
                      </div>
                      <ChevronRight size={12} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
                    </button>
                  ))}

                  {files.map(f => {
                    const ext = f.ext || '';
                    return (
                      <div key={f.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors">
                        {['lz4', 'tar', 'gz', 'zip', '7z'].includes(ext) ? (
                          <FileArchive size={14} className="text-orange-400 flex-shrink-0" />
                        ) : (
                          <FileText size={14} className="text-gray-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-300 truncate">{f.name}</p>
                        </div>
                        <span className="text-[10px] text-gray-600 flex-shrink-0">
                          {f.size != null ? formatBytes(f.size) : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {(dirs.length > 0 || files.length > 0) && (
                  <div className="px-4 py-2 border-t border-white/5 text-[10px] text-gray-600">
                    {dirs.length} folder{dirs.length !== 1 ? 's' : ''}, {files.length} file{files.length !== 1 ? 's' : ''}
                    {files.length > 0 && (
                      <span className="ml-2">({formatBytes(files.reduce((a, f) => a + (f.size || 0), 0))})</span>
                    )}
                  </div>
                )}
              </Card>

              {/* Right: upload zone */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <UploadCloud size={14} className="text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Upload Files</h3>
                  </div>
                  {uploads.length > 0 && (
                    <div className="flex items-center gap-2">
                      {doneCount > 0 && (
                        <Badge className="text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                          <CheckCircle size={9} /> {doneCount}
                        </Badge>
                      )}
                      {errorCount > 0 && (
                        <Badge className="text-red-400 bg-red-500/10 border-red-500/30">
                          <XCircle size={9} /> {errorCount}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardBody className="space-y-3">
                  <div
                    {...getRootProps()}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                      isDragActive
                        ? 'border-blue-500 bg-blue-500/5'
                        : 'border-white/10 hover:border-blue-500/40 hover:bg-white/2'
                    )}
                  >
                    <input {...getInputProps()} />
                    <UploadCloud size={28} className={cn('mx-auto mb-2', isDragActive ? 'text-blue-400' : 'text-gray-600')} />
                    <p className="text-sm font-medium text-gray-400">
                      {isDragActive ? 'Drop files here...' : 'Drag & drop files, or click to browse'}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      Files will be saved to the current local folder
                    </p>
                  </div>

                  {/* Queue */}
                  {uploads.length > 0 && (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {uploads.map(item => (
                        <div
                          key={item.id}
                          className={cn(
                            'flex items-center gap-2.5 p-2.5 rounded-lg border transition-all',
                            item.status === 'done' ? 'border-emerald-500/20 bg-emerald-500/5' :
                            item.status === 'error' ? 'border-red-500/20 bg-red-500/5' :
                            'border-white/5 bg-gray-800/30'
                          )}
                        >
                          <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-gray-800">
                            {item.status === 'done' ? <CheckCircle size={12} className="text-emerald-400" /> :
                             item.status === 'error' ? <XCircle size={12} className="text-red-400" /> :
                             <UploadCloud size={12} className="text-blue-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-gray-200 truncate">{item.file.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-600">{formatBytes(item.file.size)}</span>
                              {item.error && <span className="text-[10px] text-red-400 truncate">{item.error}</span>}
                              {item.status === 'done' && item.result && (
                                <span className="text-[10px] text-emerald-500 truncate">{item.result.path}</span>
                              )}
                            </div>
                            {item.status === 'uploading' && <Progress value={item.progress} size="sm" color="blue" className="mt-1" />}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {item.status === 'uploading' && <span className="text-[10px] text-gray-500">{item.progress}%</span>}
                            {(item.status === 'pending' || item.status === 'error') && (
                              <button onClick={() => removeUpload(item.id)} className="text-gray-600 hover:text-gray-400">
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploads.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <p className="text-[10px] text-gray-600">
                        {pendingCount > 0 && `${pendingCount} pending`}
                        {pendingCount > 0 && doneCount > 0 && ' | '}
                        {doneCount > 0 && `${doneCount} uploaded`}
                      </p>
                      <div className="flex gap-2">
                        {doneCount > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearCompleted}>Clear</Button>
                        )}
                        <Button
                          size="sm"
                          loading={uploading}
                          disabled={pendingCount === 0}
                          onClick={startUpload}
                          icon={<UploadCloud size={12} />}
                        >
                          Upload {pendingCount}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </>
        )}

        {!selectedProject && (
          <div className="text-center py-20">
            <FolderOpen size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-sm text-gray-400">Select a project to start uploading</p>
          </div>
        )}
      </div>
    </div>
  );
}

function UploadProgressPanel({ progress, onCancel }: { progress: OverallProgress; onCancel: () => void }) {
  const {
    total, completed, succeeded, failed,
    currentFile, currentFileSize, currentFilePct,
    totalBytes, bytesSent, startedAt,
  } = progress;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  void tick;

  const elapsed = Date.now() - startedAt;
  const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const bytePct = totalBytes > 0 ? Math.round((bytesSent / totalBytes) * 100) : 0;
  const rate = elapsed > 0 ? bytesSent / (elapsed / 1000) : 0;
  const remainingBytes = totalBytes - bytesSent;
  const eta = rate > 0 ? remainingBytes / rate : 0;

  return (
    <Card className="border-blue-500/30 overflow-hidden">
      <div className="relative">
        <div
          className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent transition-all duration-300"
          style={{ width: `${bytePct}%` }}
        />
        <CardBody className="relative space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400">
                <UploadCloud size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Uploading to Local Storage</h3>
                <p className="text-[10px] text-gray-500">
                  {completed} of {total} files &middot; {formatBytes(bytesSent)} / {formatBytes(totalBytes)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white tabular-nums">{overallPct}%</span>
              <Button variant="ghost" size="sm" icon={<StopCircle size={14} />} onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>

          <Progress value={bytesSent} max={totalBytes || 1} color="blue" size="lg" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill icon={<Clock size={11} />} label="Elapsed" value={formatElapsed(elapsed)} />
            <StatPill icon={<Clock size={11} />} label="ETA" value={formatETA(eta)} />
            <StatPill icon={<Zap size={11} />} label="Speed" value={rate > 0 ? `${formatBytes(rate)}/s` : 'calculating...'} />
            <StatPill
              icon={failed > 0 ? <XCircle size={11} /> : <CheckCircle size={11} />}
              label="Status"
              value={`${succeeded} ok${failed > 0 ? ` / ${failed} fail` : ''}`}
              warn={failed > 0}
            />
          </div>

          {currentFile && (
            <div className="space-y-2 px-3 py-2.5 bg-gray-900/60 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw size={11} className="animate-spin flex-shrink-0 text-blue-400" />
                <span className="text-xs text-gray-400 truncate flex-1">{currentFile}</span>
                <span className="text-[10px] text-gray-500 tabular-nums flex-shrink-0">
                  {formatBytes(currentFileSize * currentFilePct / 100)} / {formatBytes(currentFileSize)} ({currentFilePct}%)
                </span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-400"
                  style={{ width: `${currentFilePct}%` }}
                />
              </div>
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

function UploadReport({
  progress, items, destPath, expanded, onToggle, onDismiss,
}: {
  progress: OverallProgress;
  items: UploadItem[];
  destPath: string;
  expanded: boolean;
  onToggle: () => void;
  onDismiss: () => void;
}) {
  const { total, succeeded, failed, totalBytes, bytesSent, startedAt, finishedAt } = progress;
  const elapsed = (finishedAt || Date.now()) - startedAt;
  const avgSpeed = elapsed > 0 ? bytesSent / (elapsed / 1000) : 0;
  const allOk = failed === 0;
  const cancelled = succeeded + failed < total;

  const doneItems = items.filter(u => u.status === 'done');
  const errorItems = items.filter(u => u.status === 'error');

  const [copied, setCopied] = useState(false);

  const copyReport = () => {
    const lines: string[] = [
      `Local Upload Report — ${new Date(finishedAt || Date.now()).toLocaleString()}`,
      `Destination: ${destPath}`,
      `Total: ${total} files (${formatBytes(totalBytes)})`,
      `Succeeded: ${succeeded} | Failed: ${failed}${cancelled ? ` | Cancelled: ${total - succeeded - failed}` : ''}`,
      `Duration: ${formatElapsed(elapsed)} | Avg Speed: ${formatBytes(avgSpeed)}/s`,
      '',
      '--- Files ---',
    ];
    for (const item of doneItems) {
      lines.push(`  [OK]  ${item.file.name} (${formatBytes(item.file.size)}) → ${item.result?.path || '?'}`);
    }
    for (const item of errorItems) {
      lines.push(`  [ERR] ${item.file.name} (${formatBytes(item.file.size)}) — ${item.error || 'Unknown error'}`);
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      allOk ? 'border-emerald-500/30' : 'border-amber-500/30',
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/2 transition-colors"
      >
        <div className={cn(
          'p-2 rounded-lg',
          allOk ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400',
        )}>
          <BarChart3 size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">
            Upload Report
            {cancelled && <span className="ml-1.5 text-xs font-normal text-gray-500">(cancelled)</span>}
          </h3>
          <p className="text-[10px] text-gray-500">
            {succeeded} succeeded{failed > 0 ? `, ${failed} failed` : ''} &middot; {formatBytes(bytesSent)} in {formatElapsed(elapsed)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {allOk ? (
            <CheckCircle size={16} className="text-emerald-400" />
          ) : (
            <AlertTriangle size={16} className="text-amber-400" />
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-4 py-3 bg-gray-900/30">
            <ReportStat label="Total Files" value={String(total)} />
            <ReportStat label="Succeeded" value={String(succeeded)} color="emerald" />
            <ReportStat label="Failed" value={String(failed)} color={failed > 0 ? 'red' : undefined} />
            <ReportStat label="Duration" value={formatElapsed(elapsed)} />
            <ReportStat label="Avg Speed" value={avgSpeed > 0 ? `${formatBytes(avgSpeed)}/s` : '--'} />
          </div>

          <div className="px-4 py-2 border-t border-white/5 flex items-center gap-2">
            <HardDrive size={11} className="text-blue-400 flex-shrink-0" />
            <span className="text-[10px] text-gray-500">Destination:</span>
            <code className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded truncate">
              {destPath}
            </code>
          </div>

          <div className="border-t border-white/5 max-h-64 overflow-y-auto divide-y divide-white/3">
            {doneItems.map(item => (
              <div key={item.id} className="flex items-center gap-2.5 px-4 py-2 hover:bg-white/2 transition-colors">
                <FileCheck size={12} className="text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-200 truncate">{item.file.name}</p>
                  {item.result && (
                    <p className="text-[10px] text-gray-600 truncate">{item.result.path}</p>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 tabular-nums flex-shrink-0">
                  {formatBytes(item.file.size)}
                </span>
              </div>
            ))}

            {errorItems.map(item => (
              <div key={item.id} className="flex items-center gap-2.5 px-4 py-2 bg-red-500/3 hover:bg-red-500/5 transition-colors">
                <XCircle size={12} className="text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-200 truncate">{item.file.name}</p>
                  <p className="text-[10px] text-red-400 truncate">{item.error || 'Unknown error'}</p>
                </div>
                <span className="text-[10px] text-gray-500 tabular-nums flex-shrink-0">
                  {formatBytes(item.file.size)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-gray-900/20">
            <button
              onClick={copyReport}
              className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Copy size={10} />
              {copied ? 'Copied!' : 'Copy report'}
            </button>
            <button
              onClick={onDismiss}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ReportStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const textColor = color === 'emerald' ? 'text-emerald-400'
    : color === 'red' ? 'text-red-400'
    : 'text-gray-300';
  return (
    <div className="text-center px-2 py-1">
      <p className="text-[9px] text-gray-600 uppercase tracking-wider">{label}</p>
      <p className={cn('text-sm font-semibold tabular-nums', textColor)}>{value}</p>
    </div>
  );
}
