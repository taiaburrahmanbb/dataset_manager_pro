import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import FileBrowser from './pages/FileBrowser';
import Processing from './pages/Processing';
import Versioning from './pages/Versioning';
import Export from './pages/Export';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import WasabiStatus from './pages/WasabiStatus';
import CategoryUpload from './pages/CategoryUpload';
import WasabiBrowser from './pages/WasabiBrowser';
import ProjectSummary from './pages/ProjectSummary';
import FileSync from './pages/FileSync';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/files" element={<FileBrowser />} />
            <Route path="/wasabi-status" element={<WasabiStatus />} />
            <Route path="/upload" element={<CategoryUpload />} />
            <Route path="/wasabi-browser" element={<WasabiBrowser />} />
            <Route path="/project-summary" element={<ProjectSummary />} />
            <Route path="/file-sync" element={<FileSync />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/versioning" element={<Versioning />} />
            <Route path="/export" element={<Export />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
