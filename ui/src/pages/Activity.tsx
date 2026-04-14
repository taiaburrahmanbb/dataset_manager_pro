import { Clock, ArrowRightLeft } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';

export default function Activity() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Activity" subtitle="Activity log for sync and upload operations" />
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <Clock size={48} className="mx-auto text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400">Activity Feed</h3>
          <p className="text-sm text-gray-600 mt-1 max-w-md">
            Upload and sync activity will appear here. Use the File Sync or Upload pages to start managing your data.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" icon={<ArrowRightLeft size={14} />} onClick={() => navigate('/file-sync')}>
              File Sync
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
