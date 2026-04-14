import { useState, useEffect } from 'react';
import {
  FolderOpen, FileText, BookOpen, HardDrive,
  ChevronRight, RefreshCw, FileArchive,
  Layers, GitBranch,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Progress } from '../components/common/Progress';
import { cn, formatBytes } from '../lib/utils';
import {
  getLocalProjects, getProjectReadme, getProjectChangelog,
  getLocalProjectTree,
} from '../lib/api';
import type { LocalProject } from '../lib/api';

type DocTab = 'readme' | 'changelog';

interface TreeEntry {
  name: string;
  type: 'dir' | 'file';
  size?: number;
  ext?: string;
  children_count?: number;
}

const STAGE_COLORS: Record<string, string> = {
  '01.raw': 'text-emerald-400 bg-emerald-500/10',
  '02.processing': 'text-blue-400 bg-blue-500/10',
  '03.processed': 'text-cyan-400 bg-cyan-500/10',
  '04.models': 'text-violet-400 bg-violet-500/10',
  '05.benchmarks': 'text-fuchsia-400 bg-fuchsia-500/10',
  '06.monitoring': 'text-rose-400 bg-rose-500/10',
  '07.csv': 'text-indigo-400 bg-indigo-500/10',
  '08.docs': 'text-gray-400 bg-gray-500/10',
};

export default function ProjectSummary() {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [docTab, setDocTab] = useState<DocTab>('readme');
  const [readme, setReadme] = useState('');
  const [changelog, setChangelog] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [browserPath, setBrowserPath] = useState('');
  const [browserEntries, setBrowserEntries] = useState<TreeEntry[]>([]);
  const [browserLoading, setBrowserLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLocalProjects()
      .then((data) => {
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0].name);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    loadDocs(selectedProject);
    loadBrowser(selectedProject, '');
  }, [selectedProject]);

  const loadDocs = async (name: string) => {
    setLoadingDocs(true);
    try {
      const [rm, cl] = await Promise.all([
        getProjectReadme(name).catch(() => ({ content: '*No README.md found.*' })),
        getProjectChangelog(name).catch(() => ({ content: '*No CHANGELOG.md found.*' })),
      ]);
      setReadme(rm.content);
      setChangelog(cl.content);
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadBrowser = async (name: string, path: string) => {
    setBrowserLoading(true);
    setBrowserPath(path);
    try {
      const data = await getLocalProjectTree(name, path);
      setBrowserEntries(data.entries);
    } catch {
      setBrowserEntries([]);
    } finally {
      setBrowserLoading(false);
    }
  };

  const currentProject = projects.find((p) => p.name === selectedProject);
  const stages = currentProject?.stages ?? {};
  const maxStageSize = Math.max(...Object.values(stages).map((s) => s.size), 1);

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Project Summary"
        subtitle="Local project overview, documentation, and asset inventory"
        actions={
          <Button
            variant="outline"
            icon={<RefreshCw size={14} />}
            onClick={() => {
              setLoading(true);
              getLocalProjects().then(setProjects).finally(() => setLoading(false));
            }}
          >
            Refresh
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {loading && (
          <div className="text-center py-20">
            <RefreshCw size={32} className="mx-auto text-gray-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Scanning local projects...</p>
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-20">
            <FolderOpen size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">No Local Projects</h3>
            <p className="text-sm text-gray-600 mt-1">
              No project folders found in <code className="text-gray-500">data/projects/</code>
            </p>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <>
            {/* Project Selector + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} className="text-violet-400" />
                    <h3 className="text-sm font-semibold text-white">Projects</h3>
                  </div>
                </CardHeader>
                <CardBody className="space-y-1">
                  {projects.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => setSelectedProject(p.name)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        selectedProject === p.name
                          ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                      )}
                    >
                      <span>{p.name}</span>
                      <ChevronRight size={12} className={selectedProject === p.name ? 'text-violet-400' : 'text-gray-700'} />
                    </button>
                  ))}
                </CardBody>
              </Card>

              {currentProject && (
                <div className="lg:col-span-3 grid grid-cols-3 gap-4">
                  <StatCard icon={<FileArchive size={18} />} label="Total Files" value={currentProject.total_files.toLocaleString()} color="blue" />
                  <StatCard icon={<HardDrive size={18} />} label="Total Size" value={formatBytes(currentProject.total_size)} color="violet" />
                  <StatCard icon={<Layers size={18} />} label="Pipeline Stages" value={String(Object.keys(stages).length)} color="emerald" />
                </div>
              )}
            </div>

            {/* Pipeline Stages */}
            {currentProject && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <GitBranch size={16} className="text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">Pipeline Stages</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(stages).map(([name, info]) => {
                      const colorClass = STAGE_COLORS[name] ?? 'text-gray-400 bg-gray-500/10';
                      return (
                        <button
                          key={name}
                          onClick={() => loadBrowser(selectedProject, name)}
                          className="p-3 rounded-xl border border-white/8 bg-gray-900/60 hover:border-violet-500/30 transition-all text-left group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={colorClass}>{name}</Badge>
                            <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors">
                              {info.files} files
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-white">{formatBytes(info.size)}</p>
                          <Progress value={info.size} max={maxStageSize} size="sm" color="violet" className="mt-2" />
                        </button>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Docs + Browser */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Documentation Viewer */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-amber-400" />
                    <h3 className="text-sm font-semibold text-white">Documentation</h3>
                  </div>
                  <div className="flex bg-gray-800 rounded-lg p-0.5">
                    <button
                      onClick={() => setDocTab('readme')}
                      className={cn(
                        'px-3 py-1 text-xs font-medium rounded-md transition-all',
                        docTab === 'readme' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-300'
                      )}
                    >
                      README
                    </button>
                    <button
                      onClick={() => setDocTab('changelog')}
                      className={cn(
                        'px-3 py-1 text-xs font-medium rounded-md transition-all',
                        docTab === 'changelog' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-300'
                      )}
                    >
                      CHANGELOG
                    </button>
                  </div>
                </CardHeader>
                <CardBody className="max-h-[600px] overflow-y-auto">
                  {loadingDocs ? (
                    <div className="text-center py-8">
                      <RefreshCw size={20} className="mx-auto text-gray-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none prose-headings:text-gray-200 prose-p:text-gray-400 prose-a:text-violet-400 prose-strong:text-gray-200 prose-code:text-violet-300 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-800/50 prose-pre:border prose-pre:border-white/5 prose-td:text-gray-400 prose-th:text-gray-300 prose-td:border-gray-700/50 prose-th:border-gray-700/50 prose-tr:border-gray-700/50 prose-table:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {docTab === 'readme' ? readme : changelog}
                      </ReactMarkdown>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* File Browser */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} className="text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Local Files</h3>
                  </div>
                </CardHeader>
                <CardBody className="max-h-[600px] overflow-y-auto">
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-1 mb-3 flex-wrap">
                    <button
                      onClick={() => loadBrowser(selectedProject, '')}
                      className="text-xs text-gray-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/5"
                    >
                      {selectedProject}
                    </button>
                    {browserPath && browserPath.split('/').filter(Boolean).map((part, i, arr) => (
                      <div key={i} className="flex items-center gap-1">
                        <ChevronRight size={10} className="text-gray-700" />
                        <button
                          onClick={() => loadBrowser(selectedProject, arr.slice(0, i + 1).join('/'))}
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            i === arr.length - 1 ? 'text-violet-400 font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'
                          )}
                        >
                          {part}
                        </button>
                      </div>
                    ))}
                  </div>

                  {browserLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw size={20} className="mx-auto text-gray-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {browserPath && (
                        <button
                          onClick={() => {
                            const parts = browserPath.split('/').filter(Boolean);
                            parts.pop();
                            loadBrowser(selectedProject, parts.join('/'));
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-gray-500"
                        >
                          <FolderOpen size={14} />
                          <span className="text-xs">..</span>
                        </button>
                      )}
                      {browserEntries.map((entry) => (
                        <div key={entry.name}>
                          {entry.type === 'dir' ? (
                            <button
                              onClick={() => loadBrowser(selectedProject, browserPath ? `${browserPath}/${entry.name}` : entry.name)}
                              className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FolderOpen size={14} className="text-amber-400 flex-shrink-0" />
                                <span className="text-xs text-gray-300 truncate group-hover:text-white">{entry.name}/</span>
                              </div>
                              <span className="text-[10px] text-gray-600">{entry.children_count} items</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={14} className="text-gray-500 flex-shrink-0" />
                                <span className="text-xs text-gray-400 truncate">{entry.name}</span>
                              </div>
                              <span className="text-[10px] text-gray-600">{entry.size ? formatBytes(entry.size) : ''}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {browserEntries.length === 0 && (
                        <p className="text-xs text-gray-600 text-center py-8">Empty directory</p>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-500/10 text-violet-400',
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
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
