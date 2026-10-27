import React from 'react';
import { 
  Terminal, 
  Layers, 
  Code2, 
  PlusCircle, 
  FileCode, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { PythonBackendStatus } from '../types';

interface HeaderProps {
  status: PythonBackendStatus | null;
  loadingStatus: boolean;
  viewMode: 'split' | 'screen' | 'console';
  setViewMode: (mode: 'split' | 'screen' | 'console') => void;
  activePreset: string;
  setActivePreset: (presetId: string) => void;
  onOpenHtmlModal: () => void;
  onOpenAddModal: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  loadingStatus,
  viewMode,
  setViewMode,
  activePreset,
  setActivePreset,
  onOpenHtmlModal,
  onOpenAddModal,
  onRefreshData,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 text-slate-100 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Python Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                PyScreen Studio
                <span className="text-[10px] uppercase font-mono font-medium tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Full-Stack
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {loadingStatus ? (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <RefreshCw className="w-3 h-3 animate-spin text-slate-400" /> Connecting Python...
                </span>
              ) : status && status.success ? (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">
                    Python 3.10 · SQLite {status.sqlite_version}
                  </span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-400">
                  <AlertCircle className="w-3 h-3" /> Python Offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="hidden lg:flex items-center bg-slate-950/60 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActivePreset('studio-hardware')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              activePreset === 'studio-hardware'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audio & Hardware
          </button>
          <button
            onClick={() => setActivePreset('data-telemetry')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              activePreset === 'data-telemetry'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Robotics Telemetry
          </button>
          <button
            onClick={() => setActivePreset('quantum-lab')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              activePreset === 'quantum-lab'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Optics Lab
          </button>
        </div>
      </div>

      {/* Center Layout Toggles */}
      <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 text-xs shadow-inner">
        <button
          onClick={() => setViewMode('split')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
            viewMode === 'split'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Split View (Python Backend + Screen Display)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Split Screen</span>
        </button>
        <button
          onClick={() => setViewMode('screen')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
            viewMode === 'screen'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Screen Only View"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Screen Only</span>
        </button>
        <button
          onClick={() => setViewMode('console')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
            viewMode === 'console'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Python Backend Console & DB"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Python Console</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefreshData}
          disabled={isRefreshing}
          className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-all text-xs disabled:opacity-50"
          title="Refresh Python Stats & Database"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

        <button
          onClick={onOpenHtmlModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition-all shadow-sm"
          title="Import or Paste HTML code with hotlink images"
        >
          <FileCode className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden md:inline">Hotlink HTML</span>
        </button>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-lg transition-all shadow-md shadow-emerald-500/20 active:scale-95"
        >
          <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
          <span>New Item</span>
        </button>
      </div>
    </header>
  );
};
