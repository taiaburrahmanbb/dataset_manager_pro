import { Cpu } from 'lucide-react';
import { Header } from '../components/layout/Header';

export default function Processing() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Processing" subtitle="Data processing pipelines and job management" />
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <Cpu size={48} className="mx-auto text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400">Processing Pipeline</h3>
          <p className="text-sm text-gray-600 mt-1 max-w-md">
            Image resizing, augmentation, and data transformation jobs. Connect your processing backend to get started.
          </p>
        </div>
      </div>
    </div>
  );
}
