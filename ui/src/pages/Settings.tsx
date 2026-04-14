import { useState } from 'react';
import {
  Cloud, Database, Server, Shield, Bell,
  Eye, EyeOff, CheckCircle, RefreshCw, Wifi, WifiOff,
  ChevronRight, Key, XCircle,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAppStore } from '../store/appStore';
import { testWasabiConnection } from '../lib/api';

const SECTIONS = [
  { id: 'wasabi', icon: Cloud, label: 'Wasabi Storage' },
  { id: 'database', icon: Database, label: 'Database' },
  { id: 'processing', icon: Server, label: 'Processing' },
  { id: 'security', icon: Shield, label: 'Security' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
];

export default function Settings() {
  const { wasabiConnected, setWasabiConnected } = useAppStore();
  const [activeSection, setActiveSection] = useState('wasabi');
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [wasabiForm, setWasabiForm] = useState({
    endpoint: 'https://s3.wasabisys.com',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    bucket: '',
    watchInterval: '30',
  });

  const [dbForm, setDbForm] = useState({
    host: 'localhost',
    port: '5432',
    database: 'dataset_manager',
    username: 'postgres',
    password: '••••••••',
    poolSize: '10',
  });

  const [processingForm, setProcessingForm] = useState({
    maxConcurrentJobs: '4',
    defaultBatchSize: '64',
    tmpDir: '/tmp/dataset_manager',
    redisHost: 'localhost',
    redisPort: '6379',
  });

  const inputCls = 'w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 transition-all';
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5';

  const testWasabi = async () => {
    setTesting(true);
    setTestError(null);
    try {
      await testWasabiConnection();
      setWasabiConnected(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setTestError(msg);
      setWasabiConnected(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Settings" subtitle="Configure storage, database, and processing options" />

      <div className="flex-1 p-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-52 flex-shrink-0">
            <nav className="space-y-1">
              {SECTIONS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeSection === id
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} />
                    {label}
                  </div>
                  <ChevronRight size={12} className={activeSection === id ? 'text-violet-400' : 'text-gray-700'} />
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-5">
            {activeSection === 'wasabi' && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Cloud size={16} className="text-violet-400" />
                      <h3 className="text-sm font-semibold text-white">Wasabi S3 Configuration</h3>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                      wasabiConnected
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-gray-700 bg-gray-800 text-gray-500'
                    }`}>
                      {wasabiConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
                      {wasabiConnected ? 'Connected' : 'Disconnected'}
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Endpoint URL</label>
                        <input className={inputCls} value={wasabiForm.endpoint} onChange={(e) => setWasabiForm({ ...wasabiForm, endpoint: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}>Region</label>
                        <select className={inputCls} value={wasabiForm.region} onChange={(e) => setWasabiForm({ ...wasabiForm, region: e.target.value })}>
                          <option value="us-east-1">us-east-1 (US East - N. Virginia)</option>
                          <option value="us-east-2">us-east-2 (US East - N. Virginia 2)</option>
                          <option value="us-west-1">us-west-1 (US West)</option>
                          <option value="us-central-1">us-central-1 (US Central)</option>
                          <option value="eu-central-1">eu-central-1 (EU Central)</option>
                          <option value="eu-central-2">eu-central-2 (EU Central 2)</option>
                          <option value="eu-west-1">eu-west-1 (EU West)</option>
                          <option value="eu-west-2">eu-west-2 (EU West 2)</option>
                          <option value="ap-southeast-1">ap-southeast-1 (Asia Pacific SE)</option>
                          <option value="ap-northeast-1">ap-northeast-1 (Asia Pacific NE)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}><Key size={10} className="inline mr-1" />Access Key ID</label>
                        <input className={inputCls} value={wasabiForm.accessKeyId} onChange={(e) => setWasabiForm({ ...wasabiForm, accessKeyId: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}><Key size={10} className="inline mr-1" />Secret Access Key</label>
                        <div className="relative">
                          <input
                            type={showSecret ? 'text' : 'password'}
                            className={inputCls + ' pr-10'}
                            value={wasabiForm.secretAccessKey}
                            onChange={(e) => setWasabiForm({ ...wasabiForm, secretAccessKey: e.target.value })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                          >
                            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Default Bucket</label>
                      <input className={inputCls} value={wasabiForm.bucket} onChange={(e) => setWasabiForm({ ...wasabiForm, bucket: e.target.value })} placeholder="ml-datasets-prod" />
                    </div>
                    <div className="flex gap-3">
                      <Button loading={testing} icon={testing ? undefined : <RefreshCw size={14} />} onClick={testWasabi} variant="outline">
                        {testing ? 'Testing connection…' : 'Test Connection'}
                      </Button>
                      <Button>Save Configuration</Button>
                      {wasabiConnected && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <CheckCircle size={13} /> Connection verified
                        </div>
                      )}
                      {testError && (
                        <div className="flex items-center gap-1.5 text-xs text-red-400">
                          <XCircle size={13} /> {testError}
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-sm font-semibold text-white">Bucket Sync</h3>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="relative w-9 h-5 bg-violet-600 rounded-full cursor-pointer">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-200 font-medium">Auto-sync Enabled</p>
                        <p className="text-xs text-gray-500 mt-0.5">Watch the Wasabi bucket and automatically import new files into the matching project</p>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Sync Interval (seconds)</label>
                      <input type="number" className={inputCls} value={wasabiForm.watchInterval} onChange={(e) => setWasabiForm({ ...wasabiForm, watchInterval: e.target.value })} min="10" max="3600" />
                    </div>
                  </CardBody>
                </Card>
              </>
            )}

            {activeSection === 'database' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">PostgreSQL Configuration</h3>
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className={labelCls}>Host</label>
                      <input className={inputCls} value={dbForm.host} onChange={(e) => setDbForm({ ...dbForm, host: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Port</label>
                      <input className={inputCls} value={dbForm.port} onChange={(e) => setDbForm({ ...dbForm, port: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Database</label>
                      <input className={inputCls} value={dbForm.database} onChange={(e) => setDbForm({ ...dbForm, database: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Username</label>
                      <input className={inputCls} value={dbForm.username} onChange={(e) => setDbForm({ ...dbForm, username: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Password</label>
                      <input type="password" className={inputCls} value={dbForm.password} onChange={(e) => setDbForm({ ...dbForm, password: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Connection Pool Size</label>
                    <input type="number" className={inputCls} value={dbForm.poolSize} onChange={(e) => setDbForm({ ...dbForm, poolSize: e.target.value })} min="1" max="100" />
                  </div>
                  <Button>Save Database Settings</Button>
                </CardBody>
              </Card>
            )}

            {activeSection === 'processing' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Server size={16} className="text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Processing Engine</h3>
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Max Concurrent Jobs</label>
                      <input type="number" className={inputCls} value={processingForm.maxConcurrentJobs} onChange={(e) => setProcessingForm({ ...processingForm, maxConcurrentJobs: e.target.value })} min="1" max="32" />
                    </div>
                    <div>
                      <label className={labelCls}>Default Batch Size</label>
                      <input type="number" className={inputCls} value={processingForm.defaultBatchSize} onChange={(e) => setProcessingForm({ ...processingForm, defaultBatchSize: e.target.value })} min="1" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Temp Directory</label>
                    <input className={inputCls} value={processingForm.tmpDir} onChange={(e) => setProcessingForm({ ...processingForm, tmpDir: e.target.value })} />
                  </div>
                  <div className="border-t border-white/8 pt-4">
                    <p className="text-xs font-medium text-gray-400 mb-3">Redis (Task Queue)</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className={labelCls}>Redis Host</label>
                        <input className={inputCls} value={processingForm.redisHost} onChange={(e) => setProcessingForm({ ...processingForm, redisHost: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}>Port</label>
                        <input className={inputCls} value={processingForm.redisPort} onChange={(e) => setProcessingForm({ ...processingForm, redisPort: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <Button>Save Processing Settings</Button>
                </CardBody>
              </Card>
            )}

            {activeSection === 'security' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-amber-400" />
                    <h3 className="text-sm font-semibold text-white">Security</h3>
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div>
                    <label className={labelCls}>Presigned URL Expiry (hours)</label>
                    <input type="number" className={inputCls} defaultValue={24} min={1} max={168} />
                    <p className="text-xs text-gray-600 mt-1">Temporary links for external annotators — auto-expire after this duration</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Enforce HTTPS for all storage operations', checked: true },
                      { label: 'Enable audit logging', checked: true },
                      { label: 'Require 2FA for data deletion', checked: false },
                      { label: 'IP allowlist for API access', checked: false },
                    ].map(({ label, checked }) => (
                      <label key={label} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked={checked} className="accent-violet-500" />
                        <span className="text-sm text-gray-300">{label}</span>
                      </label>
                    ))}
                  </div>
                  <Button>Save Security Settings</Button>
                </CardBody>
              </Card>
            )}

            {activeSection === 'notifications' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-rose-400" />
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  {[
                    { label: 'Processing job completed', checked: true },
                    { label: 'Processing job failed', checked: true },
                    { label: 'Upload completed', checked: false },
                    { label: 'Version released', checked: true },
                    { label: 'Export ready for download', checked: true },
                    { label: 'Storage > 90% used', checked: true },
                    { label: 'File integrity check failed', checked: true },
                  ].map(({ label, checked }) => (
                    <label key={label} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked={checked} className="accent-violet-500" />
                      <span className="text-sm text-gray-300">{label}</span>
                    </label>
                  ))}
                  <Button>Save Notification Settings</Button>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
