import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, DataFile, DatasetVersion, ProcessingJob, UploadTask, ActivityItem } from '../types';
import {
  mockProjects, mockFiles, mockVersions, mockJobs, mockActivity,
} from '../lib/mockData';

interface AppState {
  projects: Project[];
  files: DataFile[];
  versions: DatasetVersion[];
  jobs: ProcessingJob[];
  activity: ActivityItem[];
  uploadTasks: UploadTask[];
  selectedProjectId: string | null;
  sidebarCollapsed: boolean;
  wasabiConnected: boolean;

  // Actions
  setSelectedProject: (id: string | null) => void;
  toggleSidebar: () => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addUploadTask: (task: UploadTask) => void;
  updateUploadTask: (id: string, updates: Partial<UploadTask>) => void;
  removeUploadTask: (id: string) => void;
  addActivity: (item: ActivityItem) => void;
  setWasabiConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      projects: mockProjects,
      files: mockFiles,
      versions: mockVersions,
      jobs: mockJobs,
      activity: mockActivity,
      uploadTasks: [],
      selectedProjectId: null,
      sidebarCollapsed: false,
      wasabiConnected: false,

      setSelectedProject: (id) => set({ selectedProjectId: id }),

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      addProject: (project) =>
        set((state) => ({ projects: [project, ...state.projects] })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deleteProject: (id) =>
        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),

      addUploadTask: (task) =>
        set((state) => ({ uploadTasks: [...state.uploadTasks, task] })),

      updateUploadTask: (id, updates) =>
        set((state) => ({
          uploadTasks: state.uploadTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      removeUploadTask: (id) =>
        set((state) => ({ uploadTasks: state.uploadTasks.filter((t) => t.id !== id) })),

      addActivity: (item) =>
        set((state) => ({ activity: [item, ...state.activity.slice(0, 49)] })),

      setWasabiConnected: (connected) => set({ wasabiConnected: connected }),
    }),
    {
      name: 'dataset-manager-pro',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        wasabiConnected: state.wasabiConnected,
      }),
    }
  )
);
