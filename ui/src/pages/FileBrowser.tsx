import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud, Grid3X3, List, Search,
  FileImage, FileVideo, FileText, File,
  CheckCircle, Clock, AlertCircle, MoreVertical,
  Download, Trash2, Eye, Tag, X,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Progress } from '../components/common/Progress';
import { useAppStore } from '../store/appStore';
import {
  formatBytes, formatRelativeTime, getStatusColor, generateId,
} from '../lib/utils';
import type { DataFile, LabelingStatus, UploadTask } from '../types';

const FILE_ICONS: Record<string, React.ElementType> = {
  vision: FileImage,
  video: FileVideo,
  nlp: FileText,
  unknown: File,
};

const STATUS_LABELS: Record<LabelingStatus, string> = {
  raw: 'Raw',
  in_progress: 'In Progress',
  validated: 'Validated',
  rejected: 'Rejected',
};

const STATUS_ICONS: Record<LabelingStatus, React.ElementType> = {
  raw: Clock,
  in_progress: Clock,
  validated: CheckCircle,
  rejected: AlertCircle,
};

export default function FileBrowser() {
  const { files, projects, uploadTasks, addUploadTask, updateUploadTask, removeUploadTask } = useAppStore();
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<LabelingStatus | 'all'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = files.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || f.status === filterStatus;
    const matchProject = filterProject === 'all' || f.projectId === filterProject;
    return matchSearch && matchStatus && matchProject;
  });

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      const projectId = filterProject !== 'all' ? filterProject : projects[0]?.id ?? 'proj-1';
      acceptedFiles.forEach((file) => {
        const task: UploadTask = {
          id: generateId(),
          file,
          projectId,
          progress: 0,
          status: 'pending',
        };
        addUploadTask(task);
        simulateUpload(task.id);
      });
    },
    [filterProject, projects, addUploadTask]
  );

  const simulateUpload = (taskId: string) => {
    updateUploadTask(taskId, { status: 'uploading' });
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        clearInterval(interval);
        updateUploadTask(taskId, { progress: 100, status: 'done' });
        setTimeout(() => removeUploadTask(taskId), 3000);
      } else {
        updateUploadTask(taskId, { progress: Math.min(progress, 99) });
      }
    }, 400);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'],
      'video/*': ['.mp4', '.avi', '.mov', '.mkv'],
      'text/*': ['.txt', '.csv', '.tsv'],
      'application/pdf': ['.pdf'],
      'application/json': ['.json', '.jsonl'],
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getFileIcon = (file: DataFile) => {
    const Icon = FILE_ICONS[file.modality] ?? File;
    return Icon;
  };

  const getProjectName = (projectId: string) =>
    projects.find((p) => p.id === projectId)?.name ?? 'Unknown';

  const statusCounts = {
    raw: files.filter((f) => f.status === 'raw').length,
    in_progress: files.filter((f) => f.status === 'in_progress').length,
    validated: files.filter((f) => f.status === 'validated').length,
    rejected: files.filter((f) => f.status === 'rejected').length,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="File Browser"
        subtitle={`${files.length} files across ${projects.length} projects`}
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Status Summary */}
        <div className="grid grid-cols-4 gap-3">
          {(Object.entries(statusCounts) as [LabelingStatus, number][]).map(([status, count]) => {
            const Icon = STATUS_ICONS[status];
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  filterStatus === status
                    ? 'border-violet-500/50 bg-violet-500/10'
                    : 'border-white/8 bg-gray-900/60 hover:border-white/15'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${getStatusColor(status)}`}>
                  <Icon size={14} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white">{count.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500">{STATUS_LABELS[status]}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-violet-500 bg-violet-500/5'
              : 'border-white/10 hover:border-violet-500/40 hover:bg-white/2'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud size={28} className={`mx-auto mb-2 ${isDragActive ? 'text-violet-400' : 'text-gray-600'}`} />
          <p className="text-sm font-medium text-gray-400">
            {isDragActive ? 'Drop files here...' : 'Drag & drop files, or click to browse'}
          </p>
          <p className="text-xs text-gray-600 mt-1">Images (JPG, PNG, DICOM), Videos (MP4, AVI, MOV), Text (TXT, PDF, JSON)</p>
        </div>

        {/* Active Uploads */}
        {uploadTasks.length > 0 && (
          <Card>
            <CardBody className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Active Uploads</p>
              {uploadTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <UploadCloud size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-200 truncate">{task.file.name}</p>
                    <p className="text-[10px] text-gray-600">{formatBytes(task.file.size)}</p>
                    <Progress value={task.progress} size="sm" color="blue" className="mt-1" />
                  </div>
                  <div className="flex-shrink-0">
                    {task.status === 'done' ? (
                      <CheckCircle size={16} className="text-emerald-400" />
                    ) : (
                      <span className="text-xs text-gray-500">{Math.round(task.progress)}%</span>
                    )}
                  </div>
                  <button onClick={() => removeUploadTask(task.id)} className="text-gray-600 hover:text-gray-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-violet-500/50"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex items-center gap-1 bg-gray-900 border border-white/8 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Grid3X3 size={14} />
            </button>
          </div>

          {selectedFiles.size > 0 && (
            <div className="flex gap-2">
              <Button variant="secondary" size="md" icon={<Tag size={14} />}>
                Label ({selectedFiles.size})
              </Button>
              <Button variant="danger" size="md" icon={<Trash2 size={14} />}>
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* File List */}
        {view === 'list' ? (
          <Card>
            <div className="divide-y divide-white/5">
              {/* Header row */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                <div className="w-5" />
                <div>File Name</div>
                <div className="w-24 text-center">Project</div>
                <div className="w-20 text-center">Size</div>
                <div className="w-24 text-center">Status</div>
                <div className="w-24 text-center">Uploaded</div>
                <div className="w-8" />
              </div>
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-gray-600">No files match your filters</div>
              ) : (
                filtered.map((file) => {
                  const Icon = getFileIcon(file);
                  const StatusIcon = STATUS_ICONS[file.status];
                  const isSelected = selectedFiles.has(file.id);
                  return (
                    <div
                      key={file.id}
                      className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-white/3 transition-colors group ${isSelected ? 'bg-violet-500/5' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(file.id)}
                        className="w-3.5 h-3.5 accent-violet-500 cursor-pointer"
                      />
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <Icon size={13} className="text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                          <p className="text-[10px] text-gray-600 truncate">{file.path}</p>
                        </div>
                      </div>
                      <div className="w-24 text-center">
                        <span className="text-xs text-gray-500 truncate">{getProjectName(file.projectId).substring(0, 12)}</span>
                      </div>
                      <div className="w-20 text-center">
                        <span className="text-xs text-gray-400">{formatBytes(file.size)}</span>
                      </div>
                      <div className="w-24 flex justify-center">
                        <Badge className={getStatusColor(file.status)}>
                          <StatusIcon size={9} />
                          {STATUS_LABELS[file.status]}
                        </Badge>
                      </div>
                      <div className="w-24 text-center">
                        <span className="text-xs text-gray-600">{formatRelativeTime(file.uploadedAt)}</span>
                      </div>
                      <div className="w-8 flex justify-center relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === file.id ? null : file.id)}
                          className="p-1 rounded text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <MoreVertical size={12} />
                        </button>
                        {menuOpen === file.id && (
                          <div className="absolute right-0 top-6 z-20 bg-gray-800 border border-white/10 rounded-xl shadow-xl py-1 min-w-32">
                            <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors">
                              <Eye size={11} /> Preview
                            </button>
                            <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors">
                              <Download size={11} /> Download
                            </button>
                            <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((file) => {
              const Icon = getFileIcon(file);
              const isSelected = selectedFiles.has(file.id);
              return (
                <Card
                  key={file.id}
                  className={`group cursor-pointer ${isSelected ? 'border-violet-500/40 bg-violet-500/5' : ''}`}
                  onClick={() => toggleSelect(file.id)}
                >
                  <div className="aspect-video bg-gray-800/50 rounded-t-xl flex items-center justify-center">
                    <Icon size={32} className="text-gray-600" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium text-gray-200 truncate">{file.name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge className={`text-[10px] ${getStatusColor(file.status)}`}>
                        {STATUS_LABELS[file.status]}
                      </Badge>
                      <span className="text-[10px] text-gray-600">{formatBytes(file.size)}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
