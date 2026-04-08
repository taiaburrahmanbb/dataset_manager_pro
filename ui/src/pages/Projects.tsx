import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, SlidersHorizontal, Files, GitBranch,
  HardDrive, MoreVertical, Trash2, Edit2, ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Progress } from '../components/common/Progress';
import { Modal } from '../components/common/Modal';
import { useAppStore } from '../store/appStore';
import {
  formatBytes, formatNumber, formatRelativeTime,
  getModalityColor, generateId, PROJECT_COLORS,
} from '../lib/utils';
import type { Modality, Project } from '../types';

const MODALITY_OPTIONS: Modality[] = ['vision', 'video', 'nlp', 'mixed'];
const MODALITY_LABELS: Record<Modality, string> = { vision: 'Vision', video: 'Video', nlp: 'NLP', mixed: 'Mixed', unknown: 'Unknown' };

function ProjectForm({ onSubmit, onClose, initial }: { onSubmit: (p: Partial<Project>) => void; onClose: () => void; initial?: Project }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    modality: initial?.modality ?? 'vision' as Modality,
    tags: initial?.tags.join(', ') ?? '',
    wasabiBucket: initial?.wasabiBucket ?? '',
    wasabiPrefix: initial?.wasabiPrefix ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: form.name,
      description: form.description,
      modality: form.modality,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      wasabiBucket: form.wasabiBucket,
      wasabiPrefix: form.wasabiPrefix,
    });
  };

  const inputCls = 'w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Project Name *</label>
        <input required className={inputCls} placeholder="e.g. Traffic Sign Detection" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
        <textarea rows={3} className={inputCls + ' resize-none'} placeholder="Describe the dataset and its purpose..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Data Modality *</label>
        <div className="grid grid-cols-4 gap-2">
          {MODALITY_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setForm({ ...form, modality: m })}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                form.modality === m
                  ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                  : 'border-white/10 bg-gray-800 text-gray-400 hover:border-white/20'
              }`}
            >
              {MODALITY_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Tags (comma-separated)</label>
        <input className={inputCls} placeholder="e.g. detection, yolo, autonomous" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Wasabi Bucket</label>
          <input className={inputCls} placeholder="ml-datasets-prod" value={form.wasabiBucket} onChange={(e) => setForm({ ...form, wasabiBucket: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Bucket Prefix</label>
          <input className={inputCls} placeholder="project-name/" value={form.wasabiPrefix} onChange={(e) => setForm({ ...form, wasabiPrefix: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{initial ? 'Save Changes' : 'Create Project'}</Button>
      </div>
    </form>
  );
}

export default function Projects() {
  const { projects, addProject, updateProject, deleteProject } = useAppStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterModality, setFilterModality] = useState<Modality | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchModality = filterModality === 'all' || p.modality === filterModality;
    return matchSearch && matchModality;
  });

  const handleCreate = (data: Partial<Project>) => {
    addProject({
      id: generateId(),
      name: data.name!,
      description: data.description ?? '',
      modality: data.modality ?? 'vision',
      tags: data.tags ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileCount: 0,
      totalSize: 0,
      versions: 0,
      storageUsed: 0,
      labelingProgress: 0,
      wasabiBucket: data.wasabiBucket,
      wasabiPrefix: data.wasabiPrefix,
      color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
    });
    setShowCreate(false);
  };

  const handleEdit = (data: Partial<Project>) => {
    if (editProject) {
      updateProject(editProject.id, { ...data, updatedAt: new Date().toISOString() });
      setEditProject(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Projects"
        subtitle={`${projects.length} projects · ${filtered.length} shown`}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            New Project
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterModality}
              onChange={(e) => setFilterModality(e.target.value as Modality | 'all')}
              className="px-3 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-violet-500/50 transition-all"
            >
              <option value="all">All Modalities</option>
              {MODALITY_OPTIONS.map((m) => <option key={m} value={m}>{MODALITY_LABELS[m]}</option>)}
            </select>
            <Button
              variant="secondary"
              icon={<SlidersHorizontal size={14} />}
              size="md"
            >
              Filter
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen size={48} className="text-gray-700 mb-4" />
            <p className="text-gray-400 font-medium">No projects found</p>
            <p className="text-gray-600 text-sm mt-1">Try adjusting your search or create a new project</p>
            <Button className="mt-6" icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <Card key={project.id} hover className="relative group">
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${project.color} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                        {project.name[0]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{project.name}</h3>
                        <Badge className={`mt-0.5 ${getModalityColor(project.modality)}`}>
                          {MODALITY_LABELS[project.modality]}
                        </Badge>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === project.id ? null : project.id); }}
                      className="p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>

                  {/* Context menu */}
                  {menuOpen === project.id && (
                    <div
                      className="absolute right-4 top-14 z-20 bg-gray-800 border border-white/10 rounded-xl shadow-xl py-1 min-w-36"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button onClick={() => { navigate(`/projects/${project.id}`); setMenuOpen(null); }} className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                        <ExternalLink size={12} /> Open
                      </button>
                      <button onClick={() => { setEditProject(project); setMenuOpen(null); }} className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                        <Edit2 size={12} /> Edit
                      </button>
                      <button onClick={() => { deleteProject(project.id); setMenuOpen(null); }} className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mb-4 leading-relaxed line-clamp-2">{project.description}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { icon: Files, label: formatNumber(project.fileCount), sub: 'files' },
                      { icon: HardDrive, label: formatBytes(project.storageUsed, 1), sub: 'storage' },
                      { icon: GitBranch, label: project.versions, sub: 'versions' },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div key={sub} className="flex flex-col items-center p-2 bg-white/3 rounded-lg">
                        <Icon size={12} className="text-gray-500 mb-1" />
                        <span className="text-xs font-semibold text-gray-200">{label}</span>
                        <span className="text-[10px] text-gray-600">{sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* Labeling Progress */}
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                      <span>Labeling Progress</span>
                      <span>{project.labelingProgress}%</span>
                    </div>
                    <Progress
                      value={project.labelingProgress}
                      size="sm"
                      color={project.labelingProgress === 100 ? 'emerald' : 'violet'}
                    />
                  </div>

                  {/* Tags */}
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-500 rounded-md border border-white/8">
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 text-gray-600">+{project.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-gray-700 mt-3">
                    Updated {formatRelativeTime(project.updatedAt)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Project" size="lg">
        <ProjectForm onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
      </Modal>

      <Modal open={!!editProject} onClose={() => setEditProject(null)} title="Edit Project" size="lg">
        {editProject && <ProjectForm onSubmit={handleEdit} onClose={() => setEditProject(null)} initial={editProject} />}
      </Modal>

      {/* Click outside to close menu */}
      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
