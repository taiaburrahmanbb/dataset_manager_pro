import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/common/Button';

export default function ProjectDetail() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Project Detail" subtitle="Project overview and management" />
      <div className="flex-1 p-6">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6"
        >
          <ArrowLeft size={13} /> Back to Projects
        </button>
        <div className="text-center py-12">
          <FolderOpen size={48} className="mx-auto text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400">Project Details</h3>
          <p className="text-sm text-gray-600 mt-1 max-w-md mx-auto">
            Use the Project Summary page to view full project details, documentation, and file structure.
          </p>
          <Button className="mt-6" onClick={() => navigate('/project-summary')}>
            Go to Project Summary
          </Button>
        </div>
      </div>
    </div>
  );
}
