export type Modality = 'vision' | 'video' | 'nlp' | 'mixed' | 'unknown';
export type LabelingStatus = 'raw' | 'in_progress' | 'validated' | 'rejected';
export type VersionStatus = 'draft' | 'released' | 'deprecated';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ExportFormat = 'coco' | 'yolo' | 'csv' | 'parquet' | 'jsonl' | 'json';

export interface Project {
  id: string;
  name: string;
  description: string;
  modality: Modality;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  totalSize: number;
  versions: number;
  storageUsed: number;
  labelingProgress: number;
  wasabiBucket?: string;
  wasabiPrefix?: string;
  color: string;
}

export interface DataFile {
  id: string;
  projectId: string;
  name: string;
  path: string;
  size: number;
  modality: Modality;
  mimeType: string;
  status: LabelingStatus;
  uploadedAt: string;
  processedAt?: string;
  metadata: FileMetadata;
  thumbnailUrl?: string;
  wasabiKey?: string;
  presignedUrl?: string;
  checksum: string;
  labels?: Label[];
}

export interface FileMetadata {
  resolution?: string;
  channels?: number;
  duration?: number;
  fps?: number;
  frameCount?: number;
  wordCount?: number;
  charCount?: number;
  language?: string;
  exif?: Record<string, string>;
  dimensions?: { width: number; height: number };
}

export interface Label {
  id: string;
  name: string;
  boundingBox?: BoundingBox;
  confidence?: number;
  annotatorId?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DatasetVersion {
  id: string;
  projectId: string;
  version: string;
  name: string;
  description: string;
  status: VersionStatus;
  createdAt: string;
  releasedAt?: string;
  fileCount: number;
  totalSize: number;
  manifest: VersionManifest;
  parentVersionId?: string;
  lineage: LineageEntry[];
  tags: string[];
}

export interface VersionManifest {
  files: ManifestEntry[];
  checksum: string;
  generatedAt: string;
}

export interface ManifestEntry {
  fileId: string;
  path: string;
  checksum: string;
  size: number;
  status: 'ok' | 'missing' | 'modified';
}

export interface LineageEntry {
  type: 'upload' | 'process' | 'export' | 'annotation';
  description: string;
  timestamp: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessingJob {
  id: string;
  projectId: string;
  type: 'vision' | 'video' | 'nlp';
  status: JobStatus;
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  config: ProcessingConfig;
  inputCount: number;
  outputCount?: number;
  errorMessage?: string;
  logs: string[];
}

export interface ProcessingConfig {
  // Vision
  resize?: { width: number; height: number };
  grayscale?: boolean;
  normalize?: boolean;
  stripExif?: boolean;
  augmentation?: AugmentationConfig;

  // Video
  extractKeyframes?: boolean;
  fpsSampling?: number;
  clipDuration?: number;
  outputFormat?: string;

  // NLP
  tokenize?: boolean;
  removeStopwords?: boolean;
  lemmatize?: boolean;
  language?: string;
  sentimentAnalysis?: boolean;
}

export interface AugmentationConfig {
  horizontalFlip?: boolean;
  verticalFlip?: boolean;
  rotation?: number;
  brightness?: { min: number; max: number };
  contrast?: { min: number; max: number };
  noise?: boolean;
}

export interface ExportJob {
  id: string;
  projectId: string;
  versionId?: string;
  format: ExportFormat;
  status: JobStatus;
  progress: number;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  fileCount: number;
  filters: ExportFilter;
}

export interface ExportFilter {
  status?: LabelingStatus[];
  modality?: Modality[];
  dateRange?: { start: string; end: string };
  labels?: string[];
}

export interface WasabiConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export interface StorageStats {
  totalStorage: number;
  usedStorage: number;
  fileCount: number;
  projectCount: number;
  processingJobs: number;
  exportJobs: number;
}

export interface ActivityItem {
  id: string;
  type: 'upload' | 'process' | 'export' | 'version' | 'annotation' | 'project';
  title: string;
  description: string;
  timestamp: string;
  projectId?: string;
  projectName?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadTask {
  id: string;
  file: File;
  projectId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
  wasabiKey?: string;
}
