import { GitBranch } from 'lucide-react';
import { Header } from '../components/layout/Header';

export default function Versioning() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Versioning" subtitle="Dataset version management and lineage tracking" />
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <GitBranch size={48} className="mx-auto text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400">Dataset Versions</h3>
          <p className="text-sm text-gray-600 mt-1 max-w-md">
            Track dataset versions across your projects. Version info is available in each project's CHANGELOG.
          </p>
        </div>
      </div>
    </div>
  );
}
