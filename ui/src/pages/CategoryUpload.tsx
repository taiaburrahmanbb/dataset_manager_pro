import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud, FolderOpen, CheckCircle, XCircle,
  X, ChevronRight, FolderPlus, ArrowLeft,
  FileArchive, FileText, HardDrive, RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Progress } from '../components/common/Progress';
import { Badge } from '../components/common/Badge';
import { cn, formatBytes } from '../lib/utils';
import {
  getLocalProjects, getProjectStages, getLocalProjectTree,
  uploadToWasabi, createProjectSubdir,
} from '../lib/api';
import type { LocalProject, ProjectStage, TreeEntry } from '../lib/api';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  result?: { key: string; size: number };
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

const STAGE_DESCRIPTIONS: Record<string, string> = {
  '01.raw': 'Immutable original archives',
  '02.processing': 'Intermediate transforms (resized, augmented)',
  '03.processed': 'Cleaned & validated training-ready data',
  '04.models': 'Trained model checkpoints & configs',
  '05.benchmarks': 'Curated test sets & evaluation results',
  '06.monitoring': 'Production predictions, drift data, flagged samples',
  '07.csv': 'Dataset manifests & metadata CSVs',
  '08.docs': 'Documentation (README, CHANGELOG)',
};

export default function CategoryUpload() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [browsingPath, setBrowsingPath] = useState('');
  const [treeEntries, setTreeEntries] = useState<TreeEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [newDirName, setNewDirName] = useState('');
  const [creatingDir, setCreatingDir] = useState(false);
  const [showNewDir, setShowNewDir] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingStages, setLoadingStages] = useState(false);

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

  const loadTree = async (path: string) => {
    setLoadingTree(true);
    try {
      const data = await getLocalProjectTree(selectedProject, path);
      setTreeEntries(data.entries);
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

  const handleCreateDir = async () => {
    if (!newDirName.trim() || !browsingPath) return;
    setCreatingDir(true);
    try {
      const fullPath = `${browsingPath}/${newDirName.trim()}`;
      await createProjectSubdir(selectedProject, fullPath);
      setNewDirName('');
      setShowNewDir(false);
      loadTree(browsingPath);
    } catch {
      // error
    } finally {
      setCreatingDir(false);
    }
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

  const categoryFromPath = (): string => {
    if (!browsingPath) return '';
    const top = browsingPath.split('/')[0];
    for (const [catId, catPath] of Object.entries({
      raw_fake: '01.raw/fake', raw_real: '01.raw/real', raw_testset: '01.raw/testset',
      processing: '02.processing', processed: '03.processed', models: '04.models',
      benchmarks: '05.benchmarks', monitoring: '06.monitoring', csv: '07.csv', docs: '08.docs',
    })) {
      if (browsingPath.startsWith(catPath)) return catId;
    }
    const stageMap: Record<string, string> = {
      '01.raw': 'raw_fake', '02.processing': 'processing', '03.processed': 'processed',
      '04.models': 'models', '05.benchmarks': 'benchmarks', '06.monitoring': 'monitoring',
      '07.csv': 'csv', '08.docs': 'docs',
    };
    return stageMap[top] || 'raw_fake';
  };

  const subfolderFromPath = (): string => {
    if (!browsingPath) return '';
    const top = browsingPath.split('/')[0];
    const rest = browsingPath.slice(top.length + 1);
    return rest;
  };

  const startUpload = async () => {
    if (!browsingPath) return;
    setUploading(true);
    const category = categoryFromPath();
    const subfolder = subfolderFromPath();

    const pending = uploads.filter(u => u.status === 'pending');
    for (const item of pending) {
      setUploads(prev => prev.map(u => (u.id === item.id ? { ...u, status: 'uploading' as const } : u)));
      try {
        const result = await uploadToWasabi(item.file, selectedProject, category, subfolder, pct => {
          setUploads(prev => prev.map(u => (u.id === item.id ? { ...u, progress: pct } : u)));
        });
        setUploads(prev => prev.map(u =>
          u.id === item.id ? { ...u, progress: 100, status: 'done' as const, result: { key: result.key, size: result.size } } : u
        ));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploads(prev => prev.map(u => (u.id === item.id ? { ...u, status: 'error' as const, error: msg } : u)));
      }
    }
    setUploading(false);
    loadTree(browsingPath);
  };

  const pendingCount = uploads.filter(u => u.status === 'pending').length;
  const doneCount = uploads.filter(u => u.status === 'done').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;

  const destPath = browsingPath
    ? `datasets/projects/${selectedProject}/${browsingPath}/`
    : '';

  const breadcrumbParts = browsingPath ? browsingPath.split('/') : [];
  const currentStageDesc = selectedStage
    ? (stages.find(s => s.name === selectedStage)?.purpose || STAGE_DESCRIPTIONS[selectedStage] || '')
    : '';

  const dirs = treeEntries.filter(e => e.type === 'dir');
  const files = treeEntries.filter(e => e.type === 'file');

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Upload Assets"
        subtitle="Browse project folders, create subdirectories, and upload files"
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Project selector */}
        <div className="flex gap-3">
          <select
            value={selectedProject}
            onChange={e => { setSelectedProject(e.target.value); }}
            className="flex-1 max-w-xs px-3 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-violet-500/50"
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

        {/* Stage grid — only when no stage selected */}
        {selectedProject && !selectedStage && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Select Folder</h3>
              </div>
              <span className="text-xs text-gray-500">{stages.length} stages in {selectedProject}</span>
            </CardHeader>
            <CardBody>
              {loadingStages ? (
                <div className="py-12 text-center">
                  <RefreshCw size={24} className="mx-auto text-gray-600 animate-spin mb-2" />
                  <p className="text-sm text-gray-500">Loading folders...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {stages.map(stage => {
                    const gradient = STAGE_COLORS[stage.name] || 'from-gray-600 to-gray-700';
                    return (
                      <button
                        key={stage.name}
                        onClick={() => selectStage(stage.name)}
                        className="group text-left p-4 rounded-xl border border-white/8 bg-gray-900/50 hover:border-violet-500/40 hover:bg-gray-800/60 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                            <FolderOpen size={16} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{stage.name}</p>
                            <p className="text-[10px] text-gray-600">
                              {stage.child_dirs} folder{stage.child_dirs !== 1 ? 's' : ''}, {stage.child_files} file{stage.child_files !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">
                          {stage.purpose || STAGE_DESCRIPTIONS[stage.name] || ''}
                        </p>
                        {stage.total_files > 0 && (
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

        {/* Browsing + Upload area — when a stage is selected */}
        {selectedStage && (
          <>
            {/* Destination highlight */}
            <Card className="border-violet-500/30 bg-violet-500/5">
              <CardBody className="py-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">
                      <span className="font-medium text-gray-300">Description:</span>{' '}
                      <span className="text-violet-300">{currentStageDesc}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium text-gray-400">Destination:</span>{' '}
                      <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                        {destPath}
                      </code>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-violet-400"
                    icon={<ExternalLink size={12} />}
                    onClick={() => navigate('/wasabi-browser')}
                  >
                    View in Wasabi
                  </Button>
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
                        ? 'text-violet-400 font-medium'
                        : 'text-gray-500 hover:text-gray-300'
                    )}
                  >
                    {part}
                  </button>
                </div>
              ))}
            </div>

            {/* Existing contents + actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: existing files/folders */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FolderOpen size={14} className="text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">Contents</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {!showNewDir ? (
                      <Button variant="ghost" size="sm" icon={<FolderPlus size={12} />} onClick={() => setShowNewDir(true)}>
                        New Folder
                      </Button>
                    ) : (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="folder name"
                          value={newDirName}
                          onChange={e => setNewDirName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleCreateDir()}
                          className="w-32 px-2 py-1 bg-gray-800 border border-white/10 rounded text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleCreateDir} loading={creatingDir} disabled={!newDirName.trim()}>
                          Create
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setShowNewDir(false); setNewDirName(''); }}>
                          <X size={12} />
                        </Button>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" icon={<RefreshCw size={11} className={loadingTree ? 'animate-spin' : ''} />}
                      onClick={() => loadTree(browsingPath)} />
                  </div>
                </CardHeader>

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
                      <p className="text-[10px] text-gray-600 mt-0.5">Create a subfolder or upload files here</p>
                    </div>
                  )}

                  {/* Folders first */}
                  {dirs.map(entry => (
                    <button
                      key={entry.name}
                      onClick={() => navigateToSubdir(entry.name)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-white/3 transition-colors group"
                    >
                      <FolderOpen size={14} className="text-amber-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-200 truncate">{entry.name}</p>
                        <p className="text-[10px] text-gray-600">{entry.children_count ?? 0} items</p>
                      </div>
                      <ChevronRight size={12} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
                    </button>
                  ))}

                  {/* Files */}
                  {files.map(entry => (
                    <div
                      key={entry.name}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors"
                    >
                      {entry.ext === 'lz4' || entry.ext === 'tar' || entry.ext === 'gz' ? (
                        <FileArchive size={14} className="text-orange-400 flex-shrink-0" />
                      ) : (
                        <FileText size={14} className="text-gray-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate">{entry.name}</p>
                      </div>
                      <span className="text-[10px] text-gray-600 flex-shrink-0">
                        {entry.size != null ? formatBytes(entry.size) : ''}
                      </span>
                    </div>
                  ))}
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
                        ? 'border-violet-500 bg-violet-500/5'
                        : 'border-white/10 hover:border-violet-500/40 hover:bg-white/2'
                    )}
                  >
                    <input {...getInputProps()} />
                    <UploadCloud size={28} className={cn('mx-auto mb-2', isDragActive ? 'text-violet-400' : 'text-gray-600')} />
                    <p className="text-sm font-medium text-gray-400">
                      {isDragActive ? 'Drop files here...' : 'Drag & drop files, or click to browse'}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      Files will be uploaded to the current folder
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
                                <span className="text-[10px] text-emerald-500 truncate">{item.result.key}</span>
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
