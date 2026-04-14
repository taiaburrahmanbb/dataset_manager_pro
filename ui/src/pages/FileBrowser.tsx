import { useNavigate } from 'react-router-dom';
import { Files, UploadCloud, Search, ArrowRightLeft } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/common/Button';

export default function FileBrowser() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="File Browser" subtitle="Browse and manage your dataset files" />
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <Files size={48} className="mx-auto text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400">File Management</h3>
          <p className="text-sm text-gray-600 mt-1 max-w-md">
            Use the specialized tools below to browse and manage your files across local storage and Wasabi.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" icon={<UploadCloud size={14} />} onClick={() => navigate('/upload')}>
              Upload Assets
            </Button>
            <Button variant="outline" icon={<Search size={14} />} onClick={() => navigate('/wasabi-browser')}>
              Wasabi Browser
            </Button>
            <Button icon={<ArrowRightLeft size={14} />} onClick={() => navigate('/file-sync')}>
              File Sync
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
