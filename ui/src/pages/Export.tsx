import { Download } from 'lucide-react';
import { Header } from '../components/layout/Header';

export default function Export() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Export" subtitle="Export datasets in various formats" />
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <Download size={48} className="mx-auto text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400">Data Export</h3>
          <p className="text-sm text-gray-600 mt-1 max-w-md">
            Export your datasets to COCO, YOLO, CSV, or Parquet formats. Use the Wasabi Browser to download files directly.
          </p>
        </div>
      </div>
    </div>
  );
}
