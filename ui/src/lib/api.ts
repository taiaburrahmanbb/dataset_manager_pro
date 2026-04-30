import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 600000,
});

// ---------------------------------------------------------------------------
//  Wasabi Status & Connection
// ---------------------------------------------------------------------------

export async function testWasabiConnection() {
  const { data } = await api.post('/storage/test-connection');
  return data;
}

export async function getWasabiStatus() {
  const { data } = await api.get('/storage/status');
  return data;
}

export async function getStorageStats() {
  const { data } = await api.get('/storage/stats');
  return data;
}

// ---------------------------------------------------------------------------
//  Bucket Browser
// ---------------------------------------------------------------------------

export interface BrowseResult {
  prefix: string;
  breadcrumb: { name: string; prefix: string }[];
  folders: { name: string; prefix: string; count: number; size: number }[];
  files: { key: string; name: string; size: number; last_modified: string; etag: string }[];
  total_folders: number;
  total_files: number;
}

export async function browseBucket(prefix = '', search = ''): Promise<BrowseResult> {
  const { data } = await api.get('/storage/browse', { params: { prefix, search } });
  return data;
}

export async function getPresignedDownloadUrl(key: string): Promise<{ url: string }> {
  const { data } = await api.get('/storage/presigned-download-url', { params: { key } });
  return data;
}

// ---------------------------------------------------------------------------
//  Category Upload
// ---------------------------------------------------------------------------

export interface UploadCategory {
  id: string;
  path: string;
  label: string;
  description: string;
}

export async function getUploadCategories(): Promise<UploadCategory[]> {
  const { data } = await api.get('/storage/categories');
  return data;
}

export async function uploadToWasabi(
  file: File,
  project: string,
  destPath: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
) {
  const form = new FormData();
  form.append('file', file);
  form.append('project', project);
  form.append('dest_path', destPath);

  const { data } = await api.post('/storage/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal,
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return data;
}

// ---------------------------------------------------------------------------
//  Local Projects
// ---------------------------------------------------------------------------

export interface LocalProject {
  name: string;
  path: string;
  title: string;
  description: string;
  modality: string;
  tags: string[];
  version: string;
  wasabi_prefix: string;
  created_at: string;
  stages: Record<string, { files: number; size: number }>;
  total_files: number;
  total_size: number;
  has_readme: boolean;
  has_changelog: boolean;
  has_report: boolean;
}

export async function getLocalProjects(): Promise<LocalProject[]> {
  const { data } = await api.get('/storage/local/projects');
  return data;
}

export interface CreateProjectRequest {
  name: string;
  title?: string;
  description?: string;
  modality?: string;
  tags?: string[];
  version?: string;
  wasabi_prefix?: string;
}

export async function createLocalProject(req: CreateProjectRequest) {
  const { data } = await api.post('/storage/local/projects', req);
  return data;
}

export async function deleteLocalProject(name: string) {
  const { data } = await api.delete(`/storage/local/projects/${name}`);
  return data;
}

export async function syncProjectFolders(name: string) {
  const { data } = await api.post(`/storage/sync/${name}/folders`);
  return data;
}

export async function getLocalProjectDetail(name: string) {
  const { data } = await api.get(`/storage/local/project/${name}`);
  return data;
}

export async function getLocalProjectTree(name: string, path = '') {
  const { data } = await api.get(`/storage/local/project/${name}/tree`, { params: { path } });
  return data;
}

export async function getProjectReport(name: string) {
  const { data } = await api.get(`/storage/local/project/${name}/report`);
  return data;
}

export interface ProjectStage {
  name: string;
  purpose: string;
  status: string;
  total_files: number;
  total_size: number;
  child_dirs: number;
  child_files: number;
}

export async function getProjectStages(name: string): Promise<{ project: string; stages: ProjectStage[] }> {
  const { data } = await api.get(`/storage/local/project/${name}/stages`);
  return data;
}

export interface TreeEntry {
  name: string;
  type: 'dir' | 'file';
  size?: number;
  ext?: string;
  children_count?: number;
}

export async function createProjectSubdir(projectName: string, path: string) {
  const { data } = await api.post(`/storage/local/project/${projectName}/mkdir`, null, { params: { path } });
  return data;
}

// ---------------------------------------------------------------------------
//  Local Upload
// ---------------------------------------------------------------------------

export async function uploadToLocal(
  file: File,
  project: string,
  destPath: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
) {
  const form = new FormData();
  form.append('file', file);
  form.append('project', project);
  form.append('dest_path', destPath);

  const { data } = await api.post('/storage/local/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal,
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return data;
}

// ---------------------------------------------------------------------------
//  File Sync
// ---------------------------------------------------------------------------

export interface SyncFile {
  relative_path: string;
  local_size?: number;
  wasabi_size?: number;
  wasabi_key?: string;
  size_match?: boolean;
  last_modified?: string;
}

export interface SyncComparison {
  project: string;
  wasabi_prefix: string;
  local_only: SyncFile[];
  wasabi_only: SyncFile[];
  both: SyncFile[];
  summary: {
    local_total: number;
    wasabi_total: number;
    local_only_count: number;
    wasabi_only_count: number;
    synced_count: number;
    size_mismatches: number;
  };
}

export async function compareSyncFiles(projectName: string): Promise<SyncComparison> {
  const { data } = await api.get(`/storage/sync/${projectName}/compare`);
  return data;
}

export async function deleteWasabiFile(projectName: string, relativePath: string): Promise<{ deleted: boolean; key: string }> {
  const { data } = await api.delete(`/storage/sync/${projectName}/wasabi-file`, {
    params: { relative_path: relativePath },
  });
  return data;
}

export async function syncUpload(projectName: string, files?: string[], overwrite = false) {
  const { data } = await api.post(`/storage/sync/${projectName}/upload`, files, {
    params: { overwrite },
  });
  return data;
}

export async function syncDownload(projectName: string, files?: string[], overwrite = false) {
  const { data } = await api.post(`/storage/sync/${projectName}/download`, files, {
    params: { overwrite },
  });
  return data;
}

// ---------------------------------------------------------------------------
//  Streaming File Sync (NDJSON progress)
// ---------------------------------------------------------------------------

export interface SyncProgressEvent {
  event: 'start' | 'file_start' | 'bytes' | 'progress' | 'complete';
  total?: number;
  index?: number;
  file?: string;
  file_size?: number;
  bytes_sent?: number;
  status?: 'success' | 'error';
  error?: string;
  size?: number;
  uploaded?: number;
  downloaded?: number;
  failed?: number;
  results?: { file: string; key: string; size?: number }[];
  errors?: { file: string; error: string }[];
}

async function streamSync(
  url: string,
  body: string[] | null,
  overwrite: boolean,
  onEvent: (evt: SyncProgressEvent) => void,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (overwrite) params.set('overwrite', 'true');
  const fullUrl = `/api/v1${url}?${params.toString()}`;

  const resp = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `HTTP ${resp.status}`);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) {
        onEvent(JSON.parse(line) as SyncProgressEvent);
      }
    }
  }
  if (buffer.trim()) {
    onEvent(JSON.parse(buffer) as SyncProgressEvent);
  }
}

export function syncUploadStream(
  projectName: string,
  files: string[] | undefined,
  overwrite: boolean,
  onEvent: (evt: SyncProgressEvent) => void,
  signal?: AbortSignal,
) {
  return streamSync(
    `/storage/sync/${projectName}/upload-stream`,
    files ?? null,
    overwrite,
    onEvent,
    signal,
  );
}

export function syncDownloadStream(
  projectName: string,
  files: string[] | undefined,
  overwrite: boolean,
  onEvent: (evt: SyncProgressEvent) => void,
  signal?: AbortSignal,
) {
  return streamSync(
    `/storage/sync/${projectName}/download-stream`,
    files ?? null,
    overwrite,
    onEvent,
    signal,
  );
}

// ---------------------------------------------------------------------------
//  Docs
// ---------------------------------------------------------------------------

export async function getProjectReadme(projectName: string): Promise<{ content: string; path: string }> {
  const { data } = await api.get(`/storage/docs/${projectName}/readme`);
  return data;
}

export async function getProjectChangelog(projectName: string): Promise<{ content: string; path: string }> {
  const { data } = await api.get(`/storage/docs/${projectName}/changelog`);
  return data;
}

// ---------------------------------------------------------------------------
//  Health
// ---------------------------------------------------------------------------

export async function checkHealth() {
  const { data } = await axios.get('/api/health');
  return data;
}

export default api;
