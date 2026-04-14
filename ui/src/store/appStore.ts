import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UploadTask } from '../types';

interface AppState {
  uploadTasks: UploadTask[];
  sidebarCollapsed: boolean;
  wasabiConnected: boolean;

  toggleSidebar: () => void;
  addUploadTask: (task: UploadTask) => void;
  updateUploadTask: (id: string, updates: Partial<UploadTask>) => void;
  removeUploadTask: (id: string) => void;
  setWasabiConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      uploadTasks: [],
      sidebarCollapsed: false,
      wasabiConnected: false,

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      addUploadTask: (task) =>
        set((state) => ({ uploadTasks: [...state.uploadTasks, task] })),

      updateUploadTask: (id, updates) =>
        set((state) => ({
          uploadTasks: state.uploadTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      removeUploadTask: (id) =>
        set((state) => ({ uploadTasks: state.uploadTasks.filter((t) => t.id !== id) })),

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
