import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Modality, LabelingStatus, JobStatus, VersionStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function getModalityColor(modality: Modality): string {
  const colors: Record<Modality, string> = {
    vision: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    video: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    nlp: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    mixed: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    unknown: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  };
  return colors[modality];
}

export function getModalityIcon(modality: Modality): string {
  const icons: Record<Modality, string> = {
    vision: '🖼️',
    video: '🎬',
    nlp: '📝',
    mixed: '🔀',
    unknown: '❓',
  };
  return icons[modality];
}

export function getStatusColor(status: LabelingStatus): string {
  const colors: Record<LabelingStatus, string> = {
    raw: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    in_progress: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    validated: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    rejected: 'text-red-400 bg-red-500/10 border-red-500/30',
  };
  return colors[status];
}

export function getJobStatusColor(status: JobStatus): string {
  const colors: Record<JobStatus, string> = {
    queued: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    running: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    failed: 'text-red-400 bg-red-500/10 border-red-500/30',
    cancelled: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  };
  return colors[status];
}

export function getVersionStatusColor(status: VersionStatus): string {
  const colors: Record<VersionStatus, string> = {
    draft: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    released: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    deprecated: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  };
  return colors[status];
}

export function detectModality(fileName: string): Modality {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'dicom'].includes(ext)) return 'vision';
  if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'].includes(ext)) return 'video';
  if (['txt', 'pdf', 'json', 'jsonl', 'csv', 'tsv', 'xml', 'md'].includes(ext)) return 'nlp';
  return 'unknown';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const PROJECT_COLORS = [
  'from-violet-600 to-violet-800',
  'from-blue-600 to-blue-800',
  'from-emerald-600 to-emerald-800',
  'from-amber-600 to-amber-800',
  'from-rose-600 to-rose-800',
  'from-cyan-600 to-cyan-800',
  'from-fuchsia-600 to-fuchsia-800',
  'from-indigo-600 to-indigo-800',
];
