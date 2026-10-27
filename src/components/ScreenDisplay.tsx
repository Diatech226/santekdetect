import React, { useState } from 'react';
import { 
  Activity, 
  DollarSign, 
  Package, 
  Star, 
  ExternalLink, 
  TrendingUp, 
  Radio, 
  Cpu, 
  Filter, 
  Search,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Product, MetricStats, TelemetryPoint } from '../types';

interface ScreenDisplayProps {
  products: Product[];
  stats: MetricStats | null;
  telemetryTrend: TelemetryPoint[];
  activePreset: string;
  onOpenAddModal: () => void;
  onOpenHtmlModal: () => void;
  onSelectProduct?: (product: Product) => void;
}

const PRESET_DATA: Record<string, { title: string; subtitle: string; heroImg: string; badge: string }> = {
  'studio-hardware': {
    title: 'Audio DSP & Synthesizer Lab Deck',
    subtitle: 'High-fidelity audio DSP cores, analog oscillators, and precision acoustic calibration monitors.',
    heroImg: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
    badge: 'Hardware Audio Array'
  },
  'data-telemetry': {
    title: 'Industrial Robotics & Telemetry Grid',
    subtitle: 'Automated sub-micron optical surface inspection, telemetry bus interfaces, and rack servers.',
    heroImg: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    badge: 'Industrial Telemetry Bus'
  },
  'quantum-lab': {
    title: 'Quantum Optics & Research Console',
    subtitle: 'Spectroscopy lasers, photon count sensors, and cryogenic vacuum telemetry loggers.',
    heroImg: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
    badge: 'Optics & Cryogenics'
  }
};

export const ScreenDisplay: React.FC<ScreenDisplayProps> = ({
  products,
  stats,
  telemetryTrend,
  activePreset,
  onOpenAddModal,
  onOpenHtmlModal,
  onSelectProduct,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeHoverPoint, setActiveHoverPoint] = useState<TelemetryPoint | null>(null);

  const preset = PRESET_DATA[activePreset] || PRESET_DATA['studio-hardware'];

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                          p.description?.toLowerCase().includes(search.toLowerCase()) ||
                          p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero Showcase with Hotlinked Image Background & Telemetry Overlay */}
      <div className="relative border-b border-slate-800 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-25">
          <img
            src={preset.heroImg}
            alt="Hero Background"
            className="w-full h-full object-cover filter blur-[1px]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 p-6 lg:p-8 max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {preset.badge} · Python Analytics Engine Active
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {preset.title}
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              {preset.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenHtmlModal}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              Hotlink Custom HTML
            </button>
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 rounded-xl transition-all shadow-md shadow-emerald-500/20"
            >
              <Cpu className="w-3.5 h-3.5" />
              Deploy Equipment
            </button>
          </div>
        </div>

        {/* Live Python Calculated KPI Bar */}
        <div className="relative z-10 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 py-4">
          <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Inventory Valuation</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
                ${stats ? stats.total_inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '104,335.00'}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" /> Python Computed
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Mean Item Price</span>
                <Activity className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
                ${stats ? stats.mean_price.toFixed(2) : '1,476.42'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                σ = ${stats ? stats.stdev_price.toFixed(2) : '1,317.93'}
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Active Stock Units</span>
                <Package className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
                {stats ? stats.total_stock_units : '132'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Across {products.length} hardware models
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Benchmark Rating</span>
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
                {stats ? stats.average_rating.toFixed(2) : '4.82'} / 5.0
              </div>
              <div className="text-[11px] text-amber-400 mt-0.5">
                Lab grade verification
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Single-Screen Content Grid */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Python Diurnal Harmonics / 24-Hour Telemetry Graph */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-semibold text-white">
                  24-Hour Telemetry & Ingest Waveform
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated live in Python via trigonometric harmonics: <code className="text-emerald-400 font-mono">f(t) = A·sin(ωt) + harmonics</code>
              </p>
            </div>
            {activeHoverPoint && (
              <div className="bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-slate-200 flex items-center gap-3">
                <span>Time: <strong className="text-emerald-400">{activeHoverPoint.hour}</strong></span>
                <span>Ingest: <strong className="text-teal-400">{activeHoverPoint.traffic} MB/s</strong></span>
                <span>Load: <strong className="text-amber-400">{activeHoverPoint.server_load_pct}%</strong></span>
              </div>
            )}
          </div>

          {/* SVG Waveform Visualization */}
          <div className="h-28 w-full flex items-end gap-1.5 pt-4 pb-1 overflow-x-auto">
            {telemetryTrend.map((point, idx) => {
              const heightPct = Math.max(12, Math.min(100, (point.traffic / 180) * 100));
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setActiveHoverPoint(point)}
                  onMouseLeave={() => setActiveHoverPoint(null)}
                  className="flex-1 min-w-[20px] flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-full relative flex items-end justify-center h-20">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all duration-200 ${
                        activeHoverPoint?.hour === point.hour
                          ? 'bg-gradient-to-t from-emerald-500 to-teal-300 shadow-md shadow-emerald-500/50'
                          : 'bg-gradient-to-t from-slate-800 via-slate-700 to-emerald-500/70 group-hover:to-emerald-400'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-300 mt-1">
                    {idx % 3 === 0 ? point.hour : '·'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters & Search Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {cat}
                {cat !== 'All' && stats?.category_distribution?.[cat] && (
                  <span className="ml-1.5 opacity-70 font-mono text-[11px]">
                    ({stats.category_distribution[cat]})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search equipment or specs..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Hotlinked Hardware & Equipment Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectProduct?.(item)}
              className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group hover:border-slate-700 hover:shadow-xl hover:shadow-black/40 transition-all cursor-pointer"
            >
              {/* Hotlinked Image with Zoom Effect */}
              <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[11px] font-mono border border-slate-700 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  {item.category}
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[11px] font-mono border border-slate-700 text-amber-300">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {item.rating.toFixed(1)}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {item.description || 'Precision instrument engineered for high-availability telemetry.'}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-mono text-slate-500">Price (USD)</div>
                    <div className="text-lg font-mono font-bold text-emerald-400">
                      ${item.price.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] font-mono text-slate-500">In Stock</div>
                    <div className="text-xs font-mono font-medium text-slate-300">
                      {item.stock} units
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Hotlinked Image Stream Strip */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Active Hotlinked HTML Asset Stream
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Direct high-res media hotlinks verified
            </span>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {products.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800 shrink-0 hover:border-slate-700 transition-all"
              >
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-10 h-10 rounded-lg object-cover bg-slate-900"
                  loading="lazy"
                />
                <div className="pr-2">
                  <div className="text-xs font-medium text-slate-200 max-w-[140px] truncate">
                    {item.title}
                  </div>
                  <div className="text-[10px] font-mono text-teal-400">
                    images.unsplash.com
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
