import { useState } from 'react';
import {
  GitBranch, Tag, CheckCircle, Clock, Archive, Plus,
  UploadCloud, Cpu, Download, FileText, ArrowRight,
  ChevronDown, ChevronRight, Shield, Lock,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useAppStore } from '../store/appStore';
import { formatBytes, formatRelativeTime, getVersionStatusColor } from '../lib/utils';
import type { DatasetVersion, VersionStatus } from '../types';

const STATUS_ICONS: Record<VersionStatus, React.ElementType> = {
  draft: Clock,
  released: CheckCircle,
  deprecated: Archive,
};

const LINEAGE_ICONS: Record<string, React.ElementType> = {
  upload: UploadCloud,
  process: Cpu,
  export: Download,
  annotation: FileText,
};

const LINEAGE_COLORS: Record<string, string> = {
  upload: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  process: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  export: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  annotation: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

function CreateVersionModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId?: string }) {
  const { projects } = useAppStore();
  const [form, setForm] = useState({
    version: '',
    name: '',
    description: '',
    projectId: projectId ?? projects[0]?.id ?? '',
    tags: '',
  });

  const inputCls = 'w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Create Version Snapshot" size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <Shield size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Creating a snapshot generates an immutable manifest of all current file hashes. Even if files are later deleted from Wasabi, the versioning system will flag the discrepancy.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Project</label>
          <select className={inputCls} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Version Tag *</label>
            <input required className={inputCls} placeholder="v2.0.0" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Version Name</label>
            <input className={inputCls} placeholder="e.g. Night Conditions" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
          <textarea rows={2} className={inputCls + ' resize-none'} placeholder="What changed in this version?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Tags (comma-separated)</label>
          <input className={inputCls} placeholder="e.g. stable, production, augmented" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<GitBranch size={14} />} onClick={onClose}>Create Snapshot</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Versioning() {
  const { versions, projects } = useAppStore();
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = versions.filter((v) => {
    const matchProject = filterProject === 'all' || v.projectId === filterProject;
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchProject && matchStatus;
  });

  // Group by project for timeline view
  const byProject = projects.reduce<Record<string, DatasetVersion[]>>((acc, p) => {
    const pvs = filtered.filter((v) => v.projectId === p.id);
    if (pvs.length > 0) acc[p.id] = pvs;
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Versioning"
        subtitle="Git-like dataset snapshots with immutable manifests and lineage tracking"
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            New Snapshot
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-violet-500/50"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-violet-500/50"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="released">Released</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>

        {/* Versioning Explanation */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Lock, title: 'Immutable Snapshots', desc: 'File hashes are locked at release time. Changes after release are flagged automatically.', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
            { icon: GitBranch, title: 'Lineage Tracking', desc: 'Track which raw data version produced each processed dataset, CSV, or export.', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { icon: Shield, title: 'Integrity Verification', desc: 'SHA-256 checksums verify file integrity. Missing files are flagged with status alerts.', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <Card key={title}>
              <CardBody className="p-4">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${color}`}>
                  <Icon size={18} />
                </div>
                <p className="text-sm font-semibold text-white mb-1">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Version Timeline by Project */}
        {Object.entries(byProject).map(([projectId, pvs]) => {
          const project = projects.find((p) => p.id === projectId);
          return (
            <Card key={projectId}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${project?.color ?? 'from-gray-600 to-gray-800'} flex items-center justify-center text-xs font-bold text-white`}>
                    {project?.name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{project?.name}</h3>
                    <p className="text-xs text-gray-500">{pvs.length} versions</p>
                  </div>
                </div>
              </CardHeader>

              <div className="p-5 space-y-0">
                {pvs.map((version, idx) => {
                  const isExpanded = expandedVersion === version.id;
                  const StatusIcon = STATUS_ICONS[version.status];
                  return (
                    <div key={version.id} className="relative">
                      {/* Timeline line */}
                      {idx < pvs.length - 1 && (
                        <div className="absolute left-4 top-10 w-px h-full bg-gradient-to-b from-white/10 to-transparent" />
                      )}
                      <div className="flex gap-4">
                        {/* Timeline dot */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                          version.status === 'released' ? 'bg-emerald-500/20 border border-emerald-500/40' :
                          version.status === 'draft' ? 'bg-amber-500/20 border border-amber-500/40' :
                          'bg-gray-700 border border-gray-600'
                        }`}>
                          <StatusIcon size={14} className={
                            version.status === 'released' ? 'text-emerald-400' :
                            version.status === 'draft' ? 'text-amber-400' : 'text-gray-400'
                          } />
                        </div>

                        <div className="flex-1 pb-6">
                          <div
                            className="flex items-start justify-between cursor-pointer group"
                            onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-white font-mono">{version.version}</span>
                                {version.name && <span className="text-sm text-gray-400">— {version.name}</span>}
                                <Badge className={getVersionStatusColor(version.status)}>
                                  {version.status}
                                </Badge>
                                {version.parentVersionId && (
                                  <span className="text-xs text-gray-600 flex items-center gap-1">
                                    <ArrowRight size={10} /> forked from prev
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{version.description}</p>
                              <div className="flex items-center gap-4 text-[10px] text-gray-600">
                                <span>{version.fileCount.toLocaleString()} files</span>
                                <span>{formatBytes(version.totalSize)}</span>
                                <span>{formatRelativeTime(version.createdAt)}</span>
                              </div>
                              {version.tags.length > 0 && (
                                <div className="flex gap-1.5 mt-2">
                                  {version.tags.map((tag) => (
                                    <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-gray-800 text-gray-500 rounded border border-white/8">
                                      <Tag size={8} /> {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {version.status === 'draft' && (
                                <Button size="sm" variant="outline" icon={<CheckCircle size={12} />}>
                                  Release
                                </Button>
                              )}
                              {isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                            </div>
                          </div>

                          {/* Expanded lineage */}
                          {isExpanded && (
                            <div className="mt-4 space-y-3">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Lineage</p>
                              <div className="space-y-2">
                                {version.lineage.map((entry, i) => {
                                  const Icon = LINEAGE_ICONS[entry.type] ?? FileText;
                                  return (
                                    <div key={i} className="flex items-start gap-3">
                                      <div className={`flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center ${LINEAGE_COLORS[entry.type] ?? 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                                        <Icon size={10} />
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-300">{entry.description}</p>
                                        <p className="text-[10px] text-gray-600 mt-0.5">{formatRelativeTime(entry.timestamp)}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Manifest integrity */}
                              <div className="mt-3 p-3 bg-gray-950 rounded-lg border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                  <Shield size={12} className="text-emerald-400" />
                                  <span className="text-xs font-medium text-gray-400">Manifest Integrity</span>
                                </div>
                                <p className="font-mono text-[10px] text-gray-600 break-all">
                                  {version.manifest.checksum}
                                </p>
                                <p className="text-[10px] text-gray-700 mt-1">
                                  Generated: {new Date(version.manifest.generatedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <CreateVersionModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
