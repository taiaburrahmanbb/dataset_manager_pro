import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Files, HardDrive, GitBranch, Calendar,
  Tag, Cloud, UploadCloud, Cpu, CheckCircle,
  Clock, AlertCircle,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Progress } from '../components/common/Progress';
import { useAppStore } from '../store/appStore';
import {
  formatBytes, formatNumber, formatRelativeTime,
  getModalityColor,
} from '../lib/utils';

const MODALITY_LABELS: Record<string, string> = {
  vision: 'Vision', video: 'Video', nlp: 'NLP', mixed: 'Mixed', unknown: 'Unknown',
};

const STATUS_COLORS: Record<string, string> = {
  raw: 'text-gray-400',
  in_progress: 'text-amber-400',
  validated: 'text-emerald-400',
  rejected: 'text-red-400',
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, files, versions } = useAppStore();

  const project = projects.find((p) => p.id === id);
  if (!project) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center text-gray-500">
        <p>Project not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/projects')}>
          ← Back to Projects
        </Button>
      </div>
    );
  }

  const projectFiles = files.filter((f) => f.projectId === id);
  const projectVersions = versions.filter((v) => v.projectId === id);

  const statusCounts = {
    raw: projectFiles.filter((f) => f.status === 'raw').length,
    in_progress: projectFiles.filter((f) => f.status === 'in_progress').length,
    validated: projectFiles.filter((f) => f.status === 'validated').length,
    rejected: projectFiles.filter((f) => f.status === 'rejected').length,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={project.name}
        subtitle={`${formatNumber(project.fileCount)} files · ${formatBytes(project.storageUsed)}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" icon={<UploadCloud size={14} />} onClick={() => navigate('/files')}>
              Upload
            </Button>
            <Button icon={<Cpu size={14} />} onClick={() => navigate('/processing')}>
              Process
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={13} /> Back to Projects
        </button>

        {/* Project Header */}
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${project.color} flex items-center justify-center text-2xl font-bold text-white flex-shrink-0`}>
            {project.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-white">{project.name}</h2>
              <Badge className={getModalityColor(project.modality)}>
                {MODALITY_LABELS[project.modality]}
              </Badge>
            </div>
            <p className="text-sm text-gray-400 mt-1.5 max-w-2xl">{project.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-800 text-gray-500 rounded border border-white/8">
                  <Tag size={9} /> {tag}
                </span>
              ))}
            </div>
          </div>
          {project.wasabiBucket && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
              <Cloud size={13} />
              {project.wasabiBucket}/{project.wasabiPrefix}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Files, label: 'Total Files', value: formatNumber(project.fileCount) },
            { icon: HardDrive, label: 'Storage Used', value: formatBytes(project.storageUsed) },
            { icon: GitBranch, label: 'Versions', value: project.versions },
            { icon: Calendar, label: 'Last Updated', value: formatRelativeTime(project.updatedAt) },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label}>
              <CardBody className="p-4">
                <Icon size={14} className="text-gray-500 mb-2" />
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Labeling Status */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-white">Labeling Status</h3>
              <span className="text-xs text-gray-500">{project.labelingProgress}% complete</span>
            </CardHeader>
            <CardBody className="space-y-4">
              <Progress value={project.labelingProgress} size="lg" color="violet" />
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg">
                    {status === 'validated' && <CheckCircle size={14} className="text-emerald-400" />}
                    {status === 'in_progress' && <Clock size={14} className="text-amber-400" />}
                    {status === 'raw' && <Clock size={14} className="text-gray-400" />}
                    {status === 'rejected' && <AlertCircle size={14} className="text-red-400" />}
                    <div>
                      <p className="text-sm font-semibold text-white">{count.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{status.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Versions */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-white">Dataset Versions</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/versioning')}>
                View all →
              </Button>
            </CardHeader>
            <div className="divide-y divide-white/5">
              {projectVersions.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-600">No versions yet</div>
              ) : (
                projectVersions.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      v.status === 'released' ? 'bg-emerald-400' :
                      v.status === 'draft' ? 'bg-amber-400' : 'bg-gray-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold text-white">{v.version}</span>
                        <span className="text-xs text-gray-500">{v.name}</span>
                      </div>
                      <p className="text-xs text-gray-600">{formatNumber(v.fileCount)} files · {formatRelativeTime(v.createdAt)}</p>
                    </div>
                    <Badge className={
                      v.status === 'released' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                      v.status === 'draft' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                      'text-gray-400 bg-gray-500/10 border-gray-500/30'
                    }>{v.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Recent Files */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-white">Recent Files</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/files')}>
              View all →
            </Button>
          </CardHeader>
          <div className="divide-y divide-white/5">
            {projectFiles.length === 0 ? (
              <div className="py-8 text-center">
                <Files size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No files in this project yet</p>
                <Button className="mt-4" size="sm" icon={<UploadCloud size={13} />} onClick={() => navigate('/files')}>
                  Upload Files
                </Button>
              </div>
            ) : (
              projectFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                    <p className="text-xs text-gray-600 truncate">{file.path}</p>
                  </div>
                  <span className="text-xs text-gray-500">{formatBytes(file.size)}</span>
                  <span className={`text-xs font-medium ${STATUS_COLORS[file.status]}`}>
                    {file.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-700">{formatRelativeTime(file.uploadedAt)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
