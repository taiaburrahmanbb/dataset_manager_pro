import { useState } from 'react';
import {
  Download, FileJson, FileText, Table, Package,
  CheckCircle, ArrowRight, Loader2,
  Zap, ImageIcon, Type,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Progress } from '../components/common/Progress';
import { Modal } from '../components/common/Modal';
import { useAppStore } from '../store/appStore';
import type { ExportFormat, LabelingStatus, Modality } from '../types';
import { getJobStatusColor, formatRelativeTime, formatBytes } from '../lib/utils';

interface FormatOption {
  id: ExportFormat;
  label: string;
  desc: string;
  icon: React.ElementType;
  modalities: Modality[];
  color: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { id: 'coco', label: 'COCO JSON', desc: 'Common Objects in Context format for object detection', icon: FileJson, modalities: ['vision'], color: 'border-violet-500/40 bg-violet-500/5 text-violet-300' },
  { id: 'yolo', label: 'YOLO', desc: 'Darknet / Ultralytics YOLO annotation format', icon: Package, modalities: ['vision', 'video'], color: 'border-blue-500/40 bg-blue-500/5 text-blue-300' },
  { id: 'csv', label: 'CSV Manifest', desc: 'Tabular export with metadata, labels, and file paths', icon: Table, modalities: ['vision', 'video', 'nlp'], color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300' },
  { id: 'parquet', label: 'Parquet', desc: 'Columnar binary format, ideal for large NLP datasets', icon: FileText, modalities: ['nlp'], color: 'border-amber-500/40 bg-amber-500/5 text-amber-300' },
  { id: 'jsonl', label: 'JSONL', desc: 'Newline-delimited JSON for NLP training pipelines', icon: FileJson, modalities: ['nlp'], color: 'border-rose-500/40 bg-rose-500/5 text-rose-300' },
  { id: 'json', label: 'JSON', desc: 'Generic JSON export with full metadata', icon: FileJson, modalities: ['vision', 'video', 'nlp'], color: 'border-cyan-500/40 bg-cyan-500/5 text-cyan-300' },
];

const MOCK_EXPORT_JOBS = [
  {
    id: 'exp-1',
    projectName: 'Traffic Sign Detection',
    format: 'yolo' as ExportFormat,
    status: 'completed' as const,
    progress: 100,
    createdAt: '2024-03-21T10:00:00Z',
    fileCount: 11500,
    size: 4513476321,
    downloadUrl: '#',
  },
  {
    id: 'exp-2',
    projectName: 'Medical Report NLP',
    format: 'parquet' as ExportFormat,
    status: 'completed' as const,
    progress: 100,
    createdAt: '2024-03-19T15:30:00Z',
    fileCount: 5230,
    size: 892428288,
    downloadUrl: '#',
  },
  {
    id: 'exp-3',
    projectName: 'Customer Review Sentiment',
    format: 'jsonl' as ExportFormat,
    status: 'running' as const,
    progress: 63,
    createdAt: '2024-03-23T11:00:00Z',
    fileCount: 89430,
    size: 0,
    downloadUrl: null,
  },
];

function ExportWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { projects } = useAppStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? '',
    format: 'csv' as ExportFormat,
    statusFilter: [] as LabelingStatus[],
    versionId: '',
    includeMetadata: true,
    includeBoundingBoxes: true,
  });

  const selectedFormat = FORMAT_OPTIONS.find((f) => f.id === form.format);

  const steps = ['Project & Format', 'Filters', 'Columns', 'Review'];

  const statusOptions: LabelingStatus[] = ['raw', 'in_progress', 'validated', 'rejected'];

  const toggleStatus = (s: LabelingStatus) => {
    setForm((prev) => ({
      ...prev,
      statusFilter: prev.statusFilter.includes(s)
        ? prev.statusFilter.filter((x) => x !== s)
        : [...prev.statusFilter, s],
    }));
  };

  const inputCls = 'w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Export Dataset" size="xl">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              i === step ? 'bg-violet-600 text-white' :
              i < step ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-gray-800 text-gray-500'
            }`}>
              {i < step ? <CheckCircle size={10} /> : <span>{i + 1}</span>}
              {s}
            </div>
            {i < steps.length - 1 && <ArrowRight size={12} className="text-gray-700" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Source Project</label>
            <select className={inputCls} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((fmt) => {
                const Icon = fmt.icon;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setForm({ ...form, format: fmt.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.format === fmt.id ? fmt.color : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Icon size={16} className="mb-1.5" />
                    <p className="text-xs font-semibold text-gray-200">{fmt.label}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">{fmt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Filter by Labeling Status</label>
            <p className="text-xs text-gray-600 mb-3">Leave empty to include all statuses</p>
            <div className="flex gap-2 flex-wrap">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                    form.statusFilter.includes(s)
                      ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                      : 'border-white/10 text-gray-500 hover:border-white/20'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Dataset Version (optional)</label>
            <select className={inputCls} value={form.versionId} onChange={(e) => setForm({ ...form, versionId: e.target.value })}>
              <option value="">Latest (all files)</option>
              <option value="ver-1">v1.0.0 — Initial Release</option>
              <option value="ver-2">v1.1.0 — Augmented Dataset</option>
            </select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Select columns for the {selectedFormat?.label} export</p>

          {(form.format === 'csv' || form.format === 'yolo') && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Image/Video Columns</p>
              {[
                { key: 'file_path', label: 'file_path', desc: 'Full path in Wasabi bucket' },
                { key: 'file_name', label: 'file_name', desc: 'Original filename' },
                { key: 'resolution', label: 'resolution', desc: 'Width x Height in pixels' },
                { key: 'channels', label: 'channels', desc: 'Number of color channels' },
                { key: 'label_id', label: 'label_id', desc: 'Primary label identifier' },
                { key: 'bounding_box', label: 'bounding_box_coords', desc: '[x, y, w, h] normalized' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/3 transition-colors">
                  <input type="checkbox" defaultChecked className="accent-violet-500" />
                  <div>
                    <p className="text-xs font-mono text-gray-300">{label}</p>
                    <p className="text-[10px] text-gray-600">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {(form.format === 'parquet' || form.format === 'jsonl') && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">NLP Columns</p>
              {[
                { key: 'text_snippet', label: 'text_snippet', desc: 'First 512 characters of text' },
                { key: 'char_count', label: 'char_count', desc: 'Total character count' },
                { key: 'word_count', label: 'word_count', desc: 'Total word count' },
                { key: 'sentiment_score', label: 'sentiment_score', desc: 'Sentiment score [-1, 1]' },
                { key: 'category', label: 'category', desc: 'Assigned category/label' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/3 transition-colors">
                  <input type="checkbox" defaultChecked className="accent-violet-500" />
                  <div>
                    <p className="text-xs font-mono text-gray-300">{label}</p>
                    <p className="text-[10px] text-gray-600">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-950 rounded-xl border border-white/5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Export Summary</p>
            {[
              ['Project', projects.find((p) => p.id === form.projectId)?.name ?? '—'],
              ['Format', selectedFormat?.label ?? form.format.toUpperCase()],
              ['Status Filter', form.statusFilter.length > 0 ? form.statusFilter.join(', ') : 'All statuses'],
              ['Version', form.versionId ? form.versionId : 'Latest'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-200 font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <Zap size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              Export will be processed in the background. A presigned download URL will be generated automatically upon completion.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4 mt-4 border-t border-white/8">
        <Button variant="secondary" onClick={step === 0 ? onClose : () => setStep(step - 1)}>
          {step === 0 ? 'Cancel' : '← Back'}
        </Button>
        <Button
          icon={step === steps.length - 1 ? <Download size={14} /> : undefined}
          onClick={step === steps.length - 1 ? onClose : () => setStep(step + 1)}
        >
          {step === steps.length - 1 ? 'Start Export' : 'Continue →'}
        </Button>
      </div>
    </Modal>
  );
}

export default function Export() {
  const [showWizard, setShowWizard] = useState(false);

  const formatIcons: Record<ExportFormat, React.ElementType> = {
    coco: FileJson,
    yolo: Package,
    csv: Table,
    parquet: FileText,
    jsonl: FileJson,
    json: FileJson,
  };

  const formatColors: Record<ExportFormat, string> = {
    coco: 'text-violet-400',
    yolo: 'text-blue-400',
    csv: 'text-emerald-400',
    parquet: 'text-amber-400',
    jsonl: 'text-rose-400',
    json: 'text-cyan-400',
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Export"
        subtitle="Generate CSV manifests, COCO/YOLO annotations, and Parquet files"
        actions={
          <Button icon={<Download size={16} />} onClick={() => setShowWizard(true)}>
            New Export
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Format Cards */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Supported Export Formats</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {FORMAT_OPTIONS.map((fmt) => {
              const Icon = fmt.icon;
              return (
                <Card key={fmt.id} className="card-hover">
                  <CardBody className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg border ${fmt.color} flex-shrink-0`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{fmt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{fmt.desc}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {fmt.modalities.map((m) => (
                            <span key={m} className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded border border-white/8 capitalize">{m}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CSV Schema Reference */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-white">CSV Schema Reference</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon size={14} className="text-violet-400" />
                  <p className="text-xs font-semibold text-gray-300">Image / Video Schema</p>
                </div>
                <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs text-gray-500 space-y-1">
                  {['file_path', 'file_name', 'resolution', 'channels', 'label_id', 'bounding_box_coords'].map((col) => (
                    <p key={col} className="text-emerald-400">{col}</p>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Type size={14} className="text-emerald-400" />
                  <p className="text-xs font-semibold text-gray-300">NLP Schema</p>
                </div>
                <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs text-gray-500 space-y-1">
                  {['text_snippet', 'char_count', 'word_count', 'sentiment_score', 'category'].map((col) => (
                    <p key={col} className="text-emerald-400">{col}</p>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Export History */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-white">Export History</h3>
          </CardHeader>
          <div className="divide-y divide-white/5">
            {MOCK_EXPORT_JOBS.map((job) => {
              const Icon = formatIcons[job.format] ?? FileJson;
              const colorClass = formatColors[job.format] ?? 'text-gray-400';
              return (
                <div key={job.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center">
                    <Icon size={16} className={colorClass} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-200">{job.projectName}</p>
                      <Badge className="text-xs border-white/10 text-gray-500 bg-gray-800/50 uppercase">
                        {job.format}
                      </Badge>
                      <Badge className={getJobStatusColor(job.status)}>
                        {job.status === 'running' && <Loader2 size={9} className="animate-spin" />}
                        {job.status === 'completed' && <CheckCircle size={9} />}
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>{job.fileCount.toLocaleString()} files</span>
                      {job.size > 0 && <span>{formatBytes(job.size)}</span>}
                      <span>{formatRelativeTime(job.createdAt)}</span>
                    </div>
                    {job.status === 'running' && (
                      <Progress value={job.progress} size="sm" color="blue" className="mt-2 max-w-xs" animated />
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {job.downloadUrl ? (
                      <Button variant="outline" size="sm" icon={<Download size={12} />}>
                        Download
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-600">Processing…</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <ExportWizard open={showWizard} onClose={() => setShowWizard(false)} />
    </div>
  );
}
