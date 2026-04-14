import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FolderOpen, FileText, Search, ChevronRight, Cloud,
  Download, RefreshCw, HardDrive, ArrowUpRight, File,
  FileImage, FileArchive, FileSpreadsheet,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { formatBytes } from '../lib/utils';
import { browseBucket, getPresignedDownloadUrl } from '../lib/api';
import type { BrowseResult } from '../lib/api';

const BASE_PREFIX = 'datasets/projects/';

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

export default function WasabiBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const rawPrefix = searchParams.get('prefix');
  const currentPrefix = rawPrefix ?? BASE_PREFIX;

  const fetchData = async (prefix: string, searchQuery = '') => {
    setLoading(true);
    try {
      const result = await browseBucket(prefix, searchQuery);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPrefix, search);
  }, [currentPrefix]);

  const navigateTo = (prefix: string) => {
    setSearchParams(prefix ? { prefix } : {});
    setSearch('');
  };

  const handleSearch = () => {
    fetchData(currentPrefix, search);
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

  const totalSize = data
    ? data.files.reduce((s, f) => s + f.size, 0) + data.folders.reduce((s, f) => s + f.size, 0)
    : 0;

  const canGoUp = currentPrefix !== '' && currentPrefix !== BASE_PREFIX;

  const parentPrefix = (() => {
    const stripped = currentPrefix.replace(/\/$/, '');
    const parts = stripped.split('/');
    parts.pop();
    const parent = parts.length > 0 ? parts.join('/') + '/' : '';
    if (parent.length < BASE_PREFIX.length) return BASE_PREFIX;
    return parent;
  })();

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Wasabi Browser"
        subtitle="Browse and search your cloud storage"
        actions={
          <Button
            variant="outline"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={() => fetchData(currentPrefix, search)}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => navigateTo(BASE_PREFIX)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
          >
            <Cloud size={14} className="text-violet-400" />
            <span className="text-gray-500">bbvision</span>
            <ChevronRight size={10} className="text-gray-700" />
            <span className="text-gray-500">datasets</span>
            <ChevronRight size={10} className="text-gray-700" />
            <span className="text-violet-400 font-medium">projects</span>
          </button>

          {data?.breadcrumb
            .filter((_, i) => i >= BASE_PREFIX.replace(/\/$/, '').split('/').length)
            .map((crumb, i, arr) => (
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

        {/* Search & Stats */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search files and folders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-white/8 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
          <Button variant="outline" onClick={handleSearch} icon={<Search size={14} />}>Search</Button>
          {data && (
            <div className="flex items-center gap-3">
              <Badge className="text-gray-300 bg-gray-800 border-gray-700">
                <FolderOpen size={10} /> {data.total_folders} folders
              </Badge>
              <Badge className="text-gray-300 bg-gray-800 border-gray-700">
                <FileText size={10} /> {data.total_files} files
              </Badge>
              <Badge className="text-gray-300 bg-gray-800 border-gray-700">
                <HardDrive size={10} /> {formatBytes(totalSize)}
              </Badge>
            </div>
          )}
        </div>

        {loading && !data && (
          <div className="text-center py-20">
            <RefreshCw size={32} className="mx-auto text-gray-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading bucket contents...</p>
          </div>
        )}

        {data && (
          <Card>
            <div className="divide-y divide-white/5">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                <div>Name</div>
                <div className="w-24 text-right">Size</div>
                <div className="w-36 text-right">Modified</div>
                <div className="w-10" />
              </div>

              {/* Parent directory */}
              {canGoUp && (
                <button
                  onClick={() => navigateTo(parentPrefix)}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-white/3 transition-colors w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center">
                      <ArrowUpRight size={13} className="text-gray-500 rotate-[225deg]" />
                    </div>
                    <span className="text-sm text-gray-400">..</span>
                  </div>
                  <div className="w-24" />
                  <div className="w-36" />
                  <div className="w-10" />
                </button>
              )}

              {/* Folders */}
              {data.folders.map(folder => (
                <button
                  key={folder.prefix}
                  onClick={() => navigateTo(folder.prefix)}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-white/3 transition-colors w-full text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <FolderOpen size={13} className="text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">{folder.name}/</p>
                      <p className="text-[10px] text-gray-600">{folder.count.toLocaleString()} items</p>
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-xs text-gray-400">{formatBytes(folder.size)}</span>
                  </div>
                  <div className="w-36" />
                  <div className="w-10" />
                </button>
              ))}

              {/* Files */}
              {data.files.map(file => {
                const Icon = getFileIcon(file.name);
                return (
                  <div
                    key={file.key}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-white/3 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Icon size={13} className="text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-300 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-700 truncate">{file.key}</p>
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <span className="text-xs text-gray-400">{formatBytes(file.size)}</span>
                    </div>
                    <div className="w-36 text-right">
                      <span className="text-xs text-gray-600">
                        {new Date(file.last_modified).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="w-10 flex justify-center">
                      <button
                        onClick={() => handleDownload(file.key)}
                        disabled={downloadingKey === file.key}
                        className="p-1 rounded text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all"
                        title="Download"
                      >
                        <Download size={13} className={downloadingKey === file.key ? 'animate-bounce' : ''} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {data.folders.length === 0 && data.files.length === 0 && (
                <div className="py-12 text-center text-gray-600">
                  <FolderOpen size={32} className="mx-auto mb-2 text-gray-700" />
                  <p className="text-sm">This prefix is empty</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
