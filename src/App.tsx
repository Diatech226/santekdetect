import React, { useState, useEffect, useCallback } from 'react';
import { 
  Terminal, 
  Database, 
  Link2, 
  Layers, 
  Sparkles, 
  RefreshCw,
  Cpu
} from 'lucide-react';
import { Header } from './components/Header';
import { PythonConsole } from './components/PythonConsole';
import { DatabaseExplorer } from './components/DatabaseExplorer';
import { HotlinkInspector } from './components/HotlinkInspector';
import { ScreenDisplay } from './components/ScreenDisplay';
import { CustomHtmlModal } from './components/CustomHtmlModal';
import { AddProductModal } from './components/AddProductModal';
import { Product, MetricStats, TelemetryPoint, PythonBackendStatus } from './types';

export default function App() {
  const [status, setStatus] = useState<PythonBackendStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<MetricStats | null>(null);
  const [telemetryTrend, setTelemetryTrend] = useState<TelemetryPoint[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState<'split' | 'screen' | 'console'>('split');
  const [consoleTab, setConsoleTab] = useState<'scripts' | 'database' | 'hotlinks'>('scripts');
  const [activePreset, setActivePreset] = useState<string>('studio-hardware');

  // Modals
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (err) {
      console.error('Error fetching Python status:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Fetch metrics and products from Python backend
  const fetchMetrics = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/metrics');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        setStats(data.stats || null);
        setTelemetryTrend(data.simulation_trend || []);
      }
    } catch (err) {
      console.error('Error fetching Python metrics:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchMetrics();
  }, [fetchStatus, fetchMetrics]);

  // Handle delete
  const handleDeleteProduct = async (id: number) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  // Handle add
  const handleAddProduct = async (newProduct: any) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to add product:', err);
    }
  };

  // Handle applying custom images from HTML modal
  const handleApplyCustomImages = (images: string[]) => {
    if (images.length === 0) return;
    // Map existing products with the new hotlinked images
    setProducts((prev) =>
      prev.map((p, idx) => ({
        ...p,
        image_url: images[idx % images.length],
      }))
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Top Header */}
      <Header
        status={status}
        loadingStatus={loadingStatus}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activePreset={activePreset}
        setActivePreset={setActivePreset}
        onOpenHtmlModal={() => setIsHtmlModalOpen(true)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onRefreshData={() => {
          fetchStatus();
          fetchMetrics();
        }}
        isRefreshing={isRefreshing}
      />

      {/* Main Single-Screen Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Python Backend Command Center */}
        {(viewMode === 'split' || viewMode === 'console') && (
          <div
            className={`flex flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300 ${
              viewMode === 'console' ? 'w-full' : 'w-full lg:w-[48%] xl:w-[45%]'
            }`}
          >
            {/* Sub-tab Navigation */}
            <div className="flex items-center bg-slate-900 border-b border-slate-800 px-3 py-1.5 gap-2 text-xs">
              <button
                onClick={() => setConsoleTab('scripts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  consoleTab === 'scripts'
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Python Runner</span>
              </button>

              <button
                onClick={() => setConsoleTab('database')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  consoleTab === 'database'
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>SQLite DB Explorer</span>
              </button>

              <button
                onClick={() => setConsoleTab('hotlinks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  consoleTab === 'hotlinks'
                    ? 'bg-slate-800 text-teal-400 border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Link2 className="w-3.5 h-3.5 text-teal-400" />
                <span>HTML Hotlinks</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-hidden">
              {consoleTab === 'scripts' && (
                <PythonConsole onCodeExecuted={fetchMetrics} />
              )}
              {consoleTab === 'database' && (
                <DatabaseExplorer
                  products={products}
                  onDeleteProduct={handleDeleteProduct}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  onRefresh={fetchMetrics}
                  isLoading={isRefreshing}
                />
              )}
              {consoleTab === 'hotlinks' && (
                <HotlinkInspector onApplyImagesToScreen={handleApplyCustomImages} />
              )}
            </div>
          </div>
        )}

        {/* Right Pane: Live Rendered Screen */}
        {(viewMode === 'split' || viewMode === 'screen') && (
          <div
            className={`flex-1 flex flex-col h-full overflow-hidden ${
              viewMode === 'screen' ? 'w-full' : 'w-full lg:w-[52%] xl:w-[55%]'
            }`}
          >
            <ScreenDisplay
              products={products}
              stats={stats}
              telemetryTrend={telemetryTrend}
              activePreset={activePreset}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenHtmlModal={() => setIsHtmlModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <CustomHtmlModal
        isOpen={isHtmlModalOpen}
        onClose={() => setIsHtmlModalOpen(false)}
        onApplyCustomImages={handleApplyCustomImages}
      />

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProduct={handleAddProduct}
      />
    </div>
  );
}
