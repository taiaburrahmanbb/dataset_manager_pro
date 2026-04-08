import { useState } from 'react';
import {
  ImageIcon, Film, FileText, Play, Pause, AlertTriangle,
  CheckCircle, XCircle, Clock, Loader2, ChevronDown,
  ChevronUp, Terminal, Plus,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Progress } from '../components/common/Progress';
import { Modal } from '../components/common/Modal';
import { useAppStore } from '../store/appStore';
import { getJobStatusColor, formatRelativeTime } from '../lib/utils';
import type { ProcessingConfig } from '../types';

const JOB_STATUS_ICONS: Record<string, React.ElementType> = {
  queued: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: AlertTriangle,
};

const JOB_TYPE_COLORS: Record<string, string> = {
  vision: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  video: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  nlp: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

function NewJobModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId?: string }) {
  const { projects } = useAppStore();
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [jobType, setJobType] = useState<'vision' | 'video' | 'nlp'>('vision');
  const [selProject, setSelProject] = useState(projectId ?? projects[0]?.id ?? '');
  const [config, setConfig] = useState<ProcessingConfig>({
    resize: { width: 640, height: 640 },
    normalize: true,
    stripExif: true,
    grayscale: false,
    extractKeyframes: true,
    fpsSampling: 1,
    tokenize: true,
    removeStopwords: true,
    lemmatize: false,
    sentimentAnalysis: false,
    language: 'en',
  });

  const inputCls = 'w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/60 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="New Processing Job" size="lg">
      {step === 'type' ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Select the type of processing pipeline to run</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { type: 'vision' as const, icon: ImageIcon, title: 'Vision', desc: 'Images (JPG, PNG, DICOM)' },
              { type: 'video' as const, icon: Film, title: 'Video', desc: 'MP4, AVI, MOV files' },
              { type: 'nlp' as const, icon: FileText, title: 'NLP', desc: 'TXT, PDF, JSON, JSONL' },
            ].map(({ type, icon: Icon, title, desc }) => (
              <button
                key={type}
                onClick={() => setJobType(type)}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${
                  jobType === type
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <Icon size={28} className={jobType === type ? 'text-violet-400' : 'text-gray-500'} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-200">{title}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Target Project</label>
            <select value={selProject} onChange={(e) => setSelProject(e.target.value)} className={inputCls}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep('config')}>Configure Pipeline →</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setStep('type')} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
            ← Back to type selection
          </button>

          {jobType === 'vision' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><ImageIcon size={14} /> Vision Processing Options</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Output Width (px)</label>
                  <input type="number" className={inputCls} value={config.resize?.width} onChange={(e) => setConfig({ ...config, resize: { width: +e.target.value, height: config.resize?.height ?? 640 } })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Output Height (px)</label>
                  <input type="number" className={inputCls} value={config.resize?.height} onChange={(e) => setConfig({ ...config, resize: { width: config.resize?.width ?? 640, height: +e.target.value } })} />
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { key: 'normalize', label: 'Normalize pixel values (0-1)' },
                  { key: 'stripExif', label: 'Strip EXIF metadata' },
                  { key: 'grayscale', label: 'Convert to grayscale' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!config[key as keyof ProcessingConfig]}
                      onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                      className="accent-violet-500"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Augmentation</p>
                <div className="space-y-2 pl-3 border-l border-white/10">
                  {[
                    { key: 'horizontalFlip', label: 'Horizontal Flip' },
                    { key: 'verticalFlip', label: 'Vertical Flip' },
                    { key: 'noise', label: 'Add Gaussian Noise' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!config.augmentation?.[key as keyof typeof config.augmentation]}
                        onChange={(e) => setConfig({ ...config, augmentation: { ...config.augmentation, [key]: e.target.checked } })}
                        className="accent-violet-500"
                      />
                      <span className="text-sm text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {jobType === 'video' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><Film size={14} /> Video Processing Options</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!config.extractKeyframes} onChange={(e) => setConfig({ ...config, extractKeyframes: e.target.checked })} className="accent-violet-500" />
                  <span className="text-sm text-gray-300">Extract Keyframes (scene changes)</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">FPS Sampling Rate</label>
                  <input type="number" className={inputCls} value={config.fpsSampling} onChange={(e) => setConfig({ ...config, fpsSampling: +e.target.value })} min={0.1} max={30} step={0.5} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Clip Duration (sec, 0=no clip)</label>
                  <input type="number" className={inputCls} value={config.clipDuration ?? 0} onChange={(e) => setConfig({ ...config, clipDuration: +e.target.value })} min={0} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Output Format</label>
                <select className={inputCls} value={config.outputFormat ?? 'jpg'} onChange={(e) => setConfig({ ...config, outputFormat: e.target.value })}>
                  <option value="jpg">JPEG frames</option>
                  <option value="png">PNG frames</option>
                  <option value="mp4">MP4 clips</option>
                </select>
              </div>
            </div>
          )}

          {jobType === 'nlp' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><FileText size={14} /> NLP Processing Options</h4>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Language</label>
                <select className={inputCls} value={config.language} onChange={(e) => setConfig({ ...config, language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="es">Spanish</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <div className="space-y-2">
                {[
                  { key: 'tokenize', label: 'Tokenization (word/sentence splitting)' },
                  { key: 'removeStopwords', label: 'Remove Stop Words' },
                  { key: 'lemmatize', label: 'Lemmatization (root word extraction)' },
                  { key: 'sentimentAnalysis', label: 'Sentiment Score Analysis' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!config[key as keyof ProcessingConfig]}
                      onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                      className="accent-violet-500"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button icon={<Play size={14} />} onClick={onClose}>Start Job</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Processing() {
  const { jobs, projects } = useAppStore();
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [showNewJob, setShowNewJob] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = jobs.filter((j) => filterStatus === 'all' || j.status === filterStatus);

  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name ?? 'Unknown';

  const statusCounts = {
    running: jobs.filter((j) => j.status === 'running').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
    queued: jobs.filter((j) => j.status === 'queued').length,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Processing"
        subtitle="Manage vision, video, and NLP processing pipelines"
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setShowNewJob(true)}>
            New Job
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Status Summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { key: 'running', label: 'Running', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { key: 'completed', label: 'Completed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { key: 'failed', label: 'Failed', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
            { key: 'queued', label: 'Queued', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
          ].map(({ key, label, color }) => {
            const count = statusCounts[key as keyof typeof statusCounts];
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  filterStatus === key ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/8 bg-gray-900/60 hover:border-white/15'
                }`}
              >
                <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </button>
            );
          })}
        </div>

        {/* Job List */}
        <div className="space-y-3">
          {filtered.map((job) => {
            const isExpanded = expandedJob === job.id;
            const StatusIcon = JOB_STATUS_ICONS[job.status] ?? Clock;
            return (
              <Card key={job.id}>
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer"
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                >
                  <div className={`p-2.5 rounded-xl border ${JOB_TYPE_COLORS[job.type]}`}>
                    {job.type === 'vision' && <ImageIcon size={18} />}
                    {job.type === 'video' && <Film size={18} />}
                    {job.type === 'nlp' && <FileText size={18} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white capitalize">{job.type} Processing</p>
                      <Badge className={getJobStatusColor(job.status)}>
                        <StatusIcon size={10} className={job.status === 'running' ? 'animate-spin' : ''} />
                        {job.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {getProjectName(job.projectId)} · {job.inputCount.toLocaleString()} files
                      {job.outputCount && ` → ${job.outputCount.toLocaleString()} outputs`}
                    </p>
                    {job.status === 'running' && (
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={job.progress} size="sm" color="blue" className="flex-1" animated />
                        <span className="text-xs text-gray-400">{job.progress}%</span>
                      </div>
                    )}
                    {job.status === 'failed' && job.errorMessage && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertTriangle size={10} /> {job.errorMessage}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">{formatRelativeTime(job.createdAt)}</p>
                    {job.completedAt && job.startedAt && (
                      <p className="text-[10px] text-gray-700 mt-0.5">
                        {Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 60000)} min
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    {job.status === 'running' && (
                      <Button variant="ghost" size="sm" icon={<Pause size={12} />} onClick={(e) => { e.stopPropagation(); }}>
                        Pause
                      </Button>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                  </div>
                </div>

                {/* Expanded logs */}
                {isExpanded && (
                  <div className="border-t border-white/8 px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal size={12} className="text-gray-500" />
                      <span className="text-xs font-medium text-gray-400">Processing Logs</span>
                    </div>
                    <div className="bg-gray-950 rounded-lg p-4 font-mono text-xs space-y-1">
                      {job.logs.map((log, i) => (
                        <p key={i} className={`${i === job.logs.length - 1 ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="text-gray-700 mr-2">[{String(i + 1).padStart(2, '0')}]</span>
                          {log}
                        </p>
                      ))}
                      {job.status === 'running' && (
                        <p className="text-blue-400 flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" /> Processing...
                        </p>
                      )}
                    </div>

                    {/* Config Preview */}
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-400 mb-2">Configuration</p>
                      <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs text-gray-500 overflow-auto max-h-32">
                        {JSON.stringify(job.config, null, 2)}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <NewJobModal open={showNewJob} onClose={() => setShowNewJob(false)} />
    </div>
  );
}
