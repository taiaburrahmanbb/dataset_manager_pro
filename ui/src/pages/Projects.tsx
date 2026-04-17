import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, HardDrive, FolderOpen,
  Trash2, ArrowRightLeft, BookOpen, RefreshCw,
  FileArchive, Layers,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Progress } from '../components/common/Progress';
import { Modal } from '../components/common/Modal';
import { formatBytes } from '../lib/utils';
import { getLocalProjects, createLocalProject, deleteLocalProject, syncProjectFolders } from '../lib/api';
import type { LocalProject } from '../lib/api';

const MODALITY_OPTIONS = ['vision', 'video', 'nlp', 'mixed'];

function CreateProjectForm({ onSubmit, onClose }: { onSubmit: (data: { name: string; title: string; description: string; modality: string; tags: string[]; version: string }) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '', title: '', description: '', modality: 'vision', tags: '', version: 'v1',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit({
      name: form.name.trim().replace(/\s+/g, '_'),
      title: form.title || form.name,
      description: form.description,
      modality: form.modality,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      version: form.version || 'v1',
    });
  };

  const inputCls = 'w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Project ID (folder name) *</label>
        <input required className={inputCls} placeholder="e.g. GAID, MyDataset" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <p className="text-[10px] text-gray-600 mt-1">Used as the folder name — no spaces recommended</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Display Title</label>
        <input className={inputCls} placeholder="e.g. GenAI Image Detector Dataset" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
        <textarea rows={3} className={inputCls + ' resize-none'} placeholder="Describe the dataset and its purpose..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Modality</label>
          <div className="grid grid-cols-2 gap-2">
            {MODALITY_OPTIONS.map(m => (
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
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Initial Version</label>
          <input className={inputCls} placeholder="v1" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Tags (comma-separated)</label>
        <input className={inputCls} placeholder="e.g. detection, classification, medical" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">Create Project</Button>
      </div>
    </form>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getLocalProjects();
      setProjects(data);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = async (data: { name: string; title: string; description: string; modality: string; tags: string[]; version: string }) => {
    try {
      await createLocalProject(data);
      syncProjectFolders(data.name).catch(() => {});
      setShowCreate(false);
      await refresh();
    } catch {
      // Handle error
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete project "${name}" and all its files? This cannot be undone.`)) return;
    setDeleting(name);
    try {
      await deleteLocalProject(name);
      await refresh();
    } finally {
      setDeleting(null);
    }
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''} on disk`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />} onClick={refresh} disabled={loading}>
              Refresh
            </Button>
            <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
              New Project
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
          />
        </div>

        {loading && projects.length === 0 && (
          <div className="text-center py-20">
            <RefreshCw size={32} className="mx-auto text-gray-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading projects...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <FolderOpen size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-400 font-medium">No projects found</p>
            <p className="text-gray-600 text-sm mt-1">Create a new project with the Option E directory structure</p>
            <Button className="mt-6" icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
              Create Project
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => {
            const stageEntries = Object.entries(project.stages);
            const maxStage = Math.max(...stageEntries.map(([, s]) => s.size), 1);

            return (
              <Card key={project.name} hover className="relative group">
                <CardBody className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {project.name[0]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{project.title || project.name}</h3>
                        <p className="text-[10px] text-gray-500 font-mono">{project.name}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-4 leading-relaxed line-clamp-2">
                    {project.description || 'No description'}
                  </p>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="flex flex-col items-center p-2 bg-white/3 rounded-lg">
                      <FileArchive size={12} className="text-gray-500 mb-1" />
                      <span className="text-xs font-semibold text-gray-200">{project.total_files.toLocaleString()}</span>
                      <span className="text-[10px] text-gray-600">files</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-white/3 rounded-lg">
                      <HardDrive size={12} className="text-gray-500 mb-1" />
                      <span className="text-xs font-semibold text-gray-200">{formatBytes(project.total_size, 1)}</span>
                      <span className="text-[10px] text-gray-600">storage</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-white/3 rounded-lg">
                      <Layers size={12} className="text-gray-500 mb-1" />
                      <span className="text-xs font-semibold text-gray-200">{stageEntries.length}</span>
                      <span className="text-[10px] text-gray-600">stages</span>
                    </div>
                  </div>

                  {/* Stage progress bars */}
                  <div className="space-y-1.5 mb-4">
                    {stageEntries.slice(0, 4).map(([name, info]) => (
                      <div key={name}>
                        <div className="flex justify-between text-[10px] text-gray-600 mb-0.5">
                          <span>{name}</span>
                          <span>{info.files} files</span>
                        </div>
                        <Progress value={info.size} max={maxStage} size="sm" color="violet" />
                      </div>
                    ))}
                    {stageEntries.length > 4 && (
                      <p className="text-[10px] text-gray-600">+{stageEntries.length - 4} more stages</p>
                    )}
                  </div>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {project.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-500 rounded-md border border-white/8">{tag}</span>
                      ))}
                      {project.tags.length > 3 && <span className="text-[10px] text-gray-600">+{project.tags.length - 3}</span>}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => navigate('/project-summary')} icon={<BookOpen size={12} />}>
                      Summary
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => navigate(`/file-sync?project=${project.name}`)} icon={<ArrowRightLeft size={12} />}>
                      Sync
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(project.name)}
                      disabled={deleting === project.name}
                      icon={<Trash2 size={12} />}
                    />
                  </div>

                  {project.created_at && (
                    <p className="text-[10px] text-gray-700 mt-2">Created {project.created_at}</p>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Project" size="lg">
        <CreateProjectForm onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
      </Modal>
    </div>
  );
}
