import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FolderOpen, FileText, Search, ChevronRight, Cloud,
  Download, RefreshCw, HardDrive, ArrowUpRight, File,
  FileImage, FileArchive, FileSpreadsheet, Copy, Check,
  X, Calendar, Hash, Globe, ArrowRight,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { formatBytes } from '../lib/utils';
import { browseBucket, getPresignedDownloadUrl, getWasabiStatus } from '../lib/api';
import type { BrowseResult } from '../lib/api';

const BASE_PREFIX = 'datasets/projects/';

const QUICK_PATHS: { label: string; value: string; hint?: string }[] = [
  { label: 'Projects', value: 'datasets/projects/', hint: 'datasets/projects/' },
  { label: 'Datasets', value: 'datasets/', hint: 'datasets/' },
  { label: 'GAID', value: 'datasets/projects/GAID/', hint: 'datasets/projects/GAID/' },
  { label: 'Bucket root', value: '', hint: '/' },
];

const EXT_ICONS: Record<string, React.ElementType> = {
  jpg: FileImage, jpeg: FileImage, png: FileImage, gif: FileImage, webp: FileImage, bmp: FileImage,
  csv: FileSpreadsheet, tsv: FileSpreadsheet, xlsx: FileSpreadsheet,
  lz4: FileArchive, tar: FileArchive, gz: FileArchive, zip: FileArchive, '7z': FileArchive,
  md: FileText, txt: FileText, json: FileText, pdf: FileText,
};

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (name.endsWith('.tar.lz4')) return FileArchive;
  return EXT_ICONS[ext] || File;
}

type FolderEntry = BrowseResult['folders'][number];
type FileEntry = BrowseResult['files'][number];
type Selected =
  | { kind: 'folder'; data: FolderEntry }
  | { kind: 'file'; data: FileEntry }
  | null;

const STAGGER_MS = 18;
const STAGGER_MAX = 600;
const staggerStyle = (i: number): React.CSSProperties => ({
  animationDelay: `${Math.min(i * STAGGER_MS, STAGGER_MAX)}ms`,
  animationFillMode: 'backwards',
});

function normalizePrefix(value: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed === '/') return '';
  const stripped = trimmed.replace(/^\/+/, '');
  return stripped.endsWith('/') ? stripped : stripped + '/';
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const idx = lower.indexOf(ql);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-violet-500/30 text-violet-100 rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function WasabiBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [searchEverywhere, setSearchEverywhere] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState('');
  const [bucketName, setBucketName] = useState<string>('bbvision');
  const [selected, setSelected] = useState<Selected>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  const rawPrefix = searchParams.get('prefix');
  const currentPrefix = rawPrefix ?? BASE_PREFIX;

  useEffect(() => {
    setPathInput(currentPrefix);
  }, [currentPrefix]);

  useEffect(() => {
    getWasabiStatus()
      .then((s) => {
        if (s?.bucket) setBucketName(s.bucket);
      })
      .catch(() => {
        // ignore — fall back to default
      });
  }, []);

  const fetchData = async (prefix: string, q = '', everywhere = false) => {
    setLoading(true);
    setSelected(null);
    try {
      const effectivePrefix = q && everywhere ? '' : prefix;
      const result = await browseBucket(effectivePrefix, q);
      setData(result);
      setActiveQuery(q);
      setGeneration((g) => g + 1);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPrefix, '', false);
    setSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrefix]);

  const navigateTo = (prefix: string) => {
    const norm = normalizePrefix(prefix);
    if (norm) {
      setSearchParams({ prefix: norm });
    } else {
      setSearchParams({});
    }
    setSearch('');
    setActiveQuery('');
  };

  const handleGo = () => {
    navigateTo(pathInput);
  };

  const handleSearch = () => {
    fetchData(currentPrefix, search.trim(), searchEverywhere);
  };

  const handleClearSearch = () => {
    setSearch('');
    fetchData(currentPrefix, '', false);
  };

  const handleDownload = async (key: string) => {
    setDownloadingKey(key);
    try {
      const { url } = await getPresignedDownloadUrl(key);
      window.open(url, '_blank');
    } catch {
      // silent
    } finally {
      setDownloadingKey(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied((c) => (c === text ? null : c)), 1500);
    } catch {
      // ignore
    }
  };

  const totalSize = data
    ? data.files.reduce((s, f) => s + f.size, 0) +
      data.folders.reduce((s, f) => s + f.size, 0)
    : 0;

  const isSearchView = !!activeQuery;

  const canGoUp =
    !isSearchView && currentPrefix !== '' && currentPrefix !== BASE_PREFIX;

  const parentPrefix = useMemo(() => {
    const stripped = currentPrefix.replace(/\/$/, '');
    const parts = stripped.split('/');
    parts.pop();
    const parent = parts.length > 0 ? parts.join('/') + '/' : '';
    if (parent.length < BASE_PREFIX.length && currentPrefix.startsWith(BASE_PREFIX)) {
      return BASE_PREFIX;
    }
    return parent;
  }, [currentPrefix]);

  const breadcrumb = useMemo(() => {
    const parts = currentPrefix.replace(/\/$/, '').split('/').filter(Boolean);
    const crumbs: { name: string; prefix: string }[] = [];
    parts.forEach((part, i) => {
      crumbs.push({
        name: part,
        prefix: parts.slice(0, i + 1).join('/') + '/',
      });
    });
    return crumbs;
  }, [currentPrefix]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Wasabi Browser"
        subtitle="Browse, search, and inspect your cloud storage"
        actions={
          <Button
            variant="outline"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={() => fetchData(currentPrefix, activeQuery, searchEverywhere)}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Path input + quick paths */}
        <Card>
          <div className="p-4 space-y-3">
            <div className="flex items-stretch gap-0 rounded-lg overflow-hidden border border-white/10 focus-within:border-violet-500/60 transition-all bg-gray-800">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-900/60 text-xs text-gray-400 border-r border-white/10 whitespace-nowrap">
                <Cloud size={12} className="text-violet-400" />
                <span className="font-mono">{bucketName}</span>
                <span className="text-gray-600">/</span>
              </div>
              <input
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGo()}
                placeholder="datasets/projects/  (leave empty for bucket root)"
                className="flex-1 px-3 py-2 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none font-mono"
              />
              <button
                onClick={handleGo}
                className="px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                Go <ArrowRight size={12} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-600">Quick paths:</span>
              {QUICK_PATHS.map((p) => {
                const active = currentPrefix === p.value || (p.value === '' && currentPrefix === '');
                return (
                  <button
                    key={p.label}
                    onClick={() => navigateTo(p.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                      active
                        ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                        : 'border-white/10 text-gray-500 hover:text-gray-200 hover:border-white/20'
                    }`}
                    title={p.hint}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Breadcrumb */}
        {!isSearchView && (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => navigateTo('')}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
            >
              <Cloud size={14} className="text-violet-400" />
              <span className="text-gray-500">{bucketName}</span>
            </button>
            {breadcrumb.map((crumb, i, arr) => (
              <div key={crumb.prefix} className="flex items-center gap-1">
                <ChevronRight size={12} className="text-gray-700" />
                <button
                  onClick={() => navigateTo(crumb.prefix)}
                  className={`text-sm px-2 py-1 rounded-md transition-colors ${
                    i === arr.length - 1
                      ? 'text-violet-400 font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder={
                searchEverywhere
                  ? `Search the whole ${bucketName} bucket…`
                  : 'Search files and folders in current path…'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-9 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
            />
            {search && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-white/5"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <label
            className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer px-3 py-2 rounded-lg border border-white/8 hover:border-white/15 transition-colors select-none"
            title="When enabled, search ignores the current prefix and looks across the entire bucket."
          >
            <input
              type="checkbox"
              checked={searchEverywhere}
              onChange={(e) => setSearchEverywhere(e.target.checked)}
              className="accent-violet-500"
            />
            <Globe size={12} className="text-violet-400" />
            Search whole bucket
          </label>
          <Button variant="outline" onClick={handleSearch} icon={<Search size={14} />}>
            Search
          </Button>
          {data && (
            <div className="flex items-center gap-2">
              <Badge className="text-gray-300 bg-gray-800 border-gray-700">
                <FolderOpen size={10} /> {data.total_folders}
              </Badge>
              <Badge className="text-gray-300 bg-gray-800 border-gray-700">
                <FileText size={10} /> {data.total_files}
              </Badge>
              <Badge className="text-gray-300 bg-gray-800 border-gray-700">
                <HardDrive size={10} /> {formatBytes(totalSize)}
              </Badge>
            </div>
          )}
        </div>

        {isSearchView && (
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>
              Showing matches for{' '}
              <span className="text-gray-200">“{activeQuery}”</span>{' '}
              {searchEverywhere ? (
                <span className="text-violet-300">across the whole bucket</span>
              ) : (
                <span>in <span className="font-mono text-gray-300">{currentPrefix || '/'}</span></span>
              )}
            </span>
            <button
              onClick={handleClearSearch}
              className="flex items-center gap-1 text-violet-400 hover:text-violet-300"
            >
              <X size={11} /> Clear
            </button>
          </div>
        )}

        {loading && !data && (
          <div className="text-center py-20">
            <RefreshCw size={32} className="mx-auto text-gray-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading bucket contents…</p>
          </div>
        )}

        {/* Two-column explorer */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
            {/* List */}
            <Card>
              <div className="divide-y divide-white/5">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                  <div>Name</div>
                  <div className="w-24 text-right">Size</div>
                  <div className="w-32 text-right hidden md:block">Modified</div>
                </div>

                {canGoUp && (
                  <button
                    onClick={() => navigateTo(parentPrefix)}
                    className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center hover:bg-white/3 transition-colors w-full text-left animate-fadeIn"
                    style={staggerStyle(0)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center">
                        <ArrowUpRight size={13} className="text-gray-500 rotate-[225deg]" />
                      </div>
                      <span className="text-sm text-gray-400">..</span>
                    </div>
                    <div className="w-24" />
                    <div className="w-32 hidden md:block" />
                  </button>
                )}

                {/* Folders */}
                {data.folders.map((folder, i) => {
                  const isSelected =
                    selected?.kind === 'folder' && selected.data.prefix === folder.prefix;
                  return (
                    <div
                      key={`${generation}-${folder.prefix}`}
                      onClick={() => setSelected({ kind: 'folder', data: folder })}
                      onDoubleClick={() => navigateTo(folder.prefix)}
                      className={`grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center cursor-pointer transition-colors group animate-fadeIn ${
                        isSelected
                          ? 'bg-violet-500/10 border-l-2 border-violet-500'
                          : 'hover:bg-white/3 border-l-2 border-transparent'
                      }`}
                      style={staggerStyle(i + (canGoUp ? 1 : 0))}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                          <FolderOpen size={13} className="text-amber-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                            {highlight(folder.name, activeQuery)}/
                          </p>
                          <p className="text-[10px] text-gray-600 truncate">
                            {isSearchView ? folder.prefix : `${folder.count.toLocaleString()} items`}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateTo(folder.prefix);
                          }}
                          className="p-1 rounded text-gray-500 hover:text-violet-300 opacity-0 group-hover:opacity-100 transition-all"
                          title="Open folder"
                        >
                          <ArrowRight size={13} />
                        </button>
                      </div>
                      <div className="w-24 text-right">
                        <span className="text-xs text-gray-400">{formatBytes(folder.size)}</span>
                      </div>
                      <div className="w-32 hidden md:block" />
                    </div>
                  );
                })}

                {/* Files */}
                {data.files.map((file, i) => {
                  const Icon = getFileIcon(file.name);
                  const isSelected =
                    selected?.kind === 'file' && selected.data.key === file.key;
                  return (
                    <div
                      key={`${generation}-${file.key}`}
                      onClick={() => setSelected({ kind: 'file', data: file })}
                      className={`grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center cursor-pointer transition-colors group animate-fadeIn ${
                        isSelected
                          ? 'bg-violet-500/10 border-l-2 border-violet-500'
                          : 'hover:bg-white/3 border-l-2 border-transparent'
                      }`}
                      style={staggerStyle(
                        i + data.folders.length + (canGoUp ? 1 : 0),
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <Icon size={13} className="text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-300 truncate">
                            {highlight(file.name, activeQuery)}
                          </p>
                          <p className="text-[10px] text-gray-700 truncate font-mono">
                            {file.key}
                          </p>
                        </div>
                      </div>
                      <div className="w-24 text-right">
                        <span className="text-xs text-gray-400">{formatBytes(file.size)}</span>
                      </div>
                      <div className="w-32 text-right hidden md:block">
                        <span className="text-xs text-gray-600">
                          {new Date(file.last_modified).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {data.folders.length === 0 && data.files.length === 0 && (
                  <div className="py-12 text-center text-gray-600">
                    <FolderOpen size={32} className="mx-auto mb-2 text-gray-700" />
                    <p className="text-sm">
                      {isSearchView
                        ? `No matches for “${activeQuery}”`
                        : 'This prefix is empty'}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Detail panel */}
            <div className="lg:sticky lg:top-6">
              <Card>
                {!selected ? (
                  <div className="p-6 text-center">
                    <FileText size={32} className="mx-auto text-gray-700 mb-3" />
                    <p className="text-sm text-gray-400 font-medium">No selection</p>
                    <p className="text-xs text-gray-600 mt-1.5">
                      Click an item on the left to see its details here. Double-click a folder
                      to open it.
                    </p>
                  </div>
                ) : selected.kind === 'folder' ? (
                  <FolderDetails
                    folder={selected.data}
                    bucketName={bucketName}
                    onOpen={() => navigateTo(selected.data.prefix)}
                    onClose={() => setSelected(null)}
                    onCopy={copyToClipboard}
                    copied={copied}
                  />
                ) : (
                  <FileDetails
                    file={selected.data}
                    bucketName={bucketName}
                    downloading={downloadingKey === selected.data.key}
                    onDownload={() => handleDownload(selected.data.key)}
                    onJumpTo={() => {
                      const idx = selected.data.key.lastIndexOf('/');
                      const parent = idx >= 0 ? selected.data.key.slice(0, idx + 1) : '';
                      if (parent) navigateTo(parent);
                    }}
                    onClose={() => setSelected(null)}
                    onCopy={copyToClipboard}
                    copied={copied}
                  />
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail panel components
// ---------------------------------------------------------------------------

interface CopyButtonProps {
  text: string;
  copied: string | null;
  onCopy: (text: string) => void;
  label?: string;
}

function CopyButton({ text, copied, onCopy, label }: CopyButtonProps) {
  const isCopied = copied === text;
  return (
    <button
      onClick={() => onCopy(text)}
      className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border border-white/10 text-gray-400 hover:text-gray-100 hover:border-white/20 transition-colors"
      title={`Copy ${label ?? 'path'}`}
    >
      {isCopied ? (
        <>
          <Check size={11} className="text-emerald-400" /> Copied
        </>
      ) : (
        <>
          <Copy size={11} /> Copy {label ?? 'path'}
        </>
      )}
    </button>
  );
}

interface DetailRowProps {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}

function DetailRow({ icon: Icon, label, children }: DetailRowProps) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={12} className="text-gray-600 mt-1 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-gray-600 font-semibold">
          {label}
        </p>
        <div className="text-xs text-gray-200 mt-0.5 break-all">{children}</div>
      </div>
    </div>
  );
}

interface FolderDetailsProps {
  folder: FolderEntry;
  bucketName: string;
  onOpen: () => void;
  onClose: () => void;
  onCopy: (text: string) => void;
  copied: string | null;
}

function FolderDetails({
  folder,
  bucketName,
  onOpen,
  onClose,
  onCopy,
  copied,
}: FolderDetailsProps) {
  const fullPath = `${bucketName}/${folder.prefix}`;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen size={16} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{folder.name}/</p>
            <p className="text-[10px] text-gray-500">Folder</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-white/5"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        <DetailRow icon={Hash} label="Items">
          {folder.count.toLocaleString()}
        </DetailRow>
        <DetailRow icon={HardDrive} label="Total size">
          {formatBytes(folder.size)}
        </DetailRow>
        <DetailRow icon={Cloud} label="Wasabi path">
          <span className="font-mono text-[11px]">{fullPath}</span>
        </DetailRow>
        <DetailRow icon={FolderOpen} label="Key prefix">
          <span className="font-mono text-[11px]">{folder.prefix}</span>
        </DetailRow>
      </div>

      <div className="px-4 py-3 border-t border-white/8 flex flex-wrap items-center gap-2">
        <Button onClick={onOpen} icon={<ArrowRight size={13} />}>
          Open folder
        </Button>
        <CopyButton text={folder.prefix} onCopy={onCopy} copied={copied} label="prefix" />
        <CopyButton text={fullPath} onCopy={onCopy} copied={copied} label="full path" />
      </div>
    </div>
  );
}

interface FileDetailsProps {
  file: FileEntry;
  bucketName: string;
  downloading: boolean;
  onDownload: () => void;
  onJumpTo: () => void;
  onClose: () => void;
  onCopy: (text: string) => void;
  copied: string | null;
}

function FileDetails({
  file,
  bucketName,
  downloading,
  onDownload,
  onJumpTo,
  onClose,
  onCopy,
  copied,
}: FileDetailsProps) {
  const Icon = getFileIcon(file.name);
  const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
  const fullPath = `${bucketName}/${file.key}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
            <Icon size={16} className="text-gray-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate" title={file.name}>
              {file.name}
            </p>
            <p className="text-[10px] text-gray-500">
              File{ext ? ` · .${ext}` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-white/5"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        <DetailRow icon={HardDrive} label="Size">
          {formatBytes(file.size)}
        </DetailRow>
        <DetailRow icon={Calendar} label="Last modified">
          {new Date(file.last_modified).toLocaleString()}
        </DetailRow>
        <DetailRow icon={Cloud} label="Wasabi path">
          <span className="font-mono text-[11px]">{fullPath}</span>
        </DetailRow>
        <DetailRow icon={FileText} label="Key">
          <span className="font-mono text-[11px]">{file.key}</span>
        </DetailRow>
        {file.etag && (
          <DetailRow icon={Hash} label="ETag">
            <span className="font-mono text-[11px]">{file.etag}</span>
          </DetailRow>
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/8 flex flex-wrap items-center gap-2">
        <Button
          onClick={onDownload}
          loading={downloading}
          icon={downloading ? undefined : <Download size={13} />}
        >
          {downloading ? 'Preparing…' : 'Download'}
        </Button>
        <Button variant="outline" onClick={onJumpTo} icon={<FolderOpen size={13} />}>
          Open folder
        </Button>
        <CopyButton text={file.key} onCopy={onCopy} copied={copied} label="key" />
        <CopyButton text={fullPath} onCopy={onCopy} copied={copied} label="full path" />
      </div>
    </div>
  );
}
