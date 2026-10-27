import React, { useState } from 'react';
import { X, Code2, Sparkles, Check, Image as ImageIcon, Link2, ExternalLink } from 'lucide-react';
import { HTMLAnalysisResult } from '../types';

interface CustomHtmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCustomImages: (images: string[]) => void;
}

const DEFAULT_SNIPPET = `<div class="device-card">
  <h2>Quantum Optics Sensor Station</h2>
  <img src="https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80" alt="Photon Detector" />
  <img src="https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=800&q=80" alt="Spectrometry Unit" />
  <img src="https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80" alt="Laser Optics Lab" />
</div>`;

export const CustomHtmlModal: React.FC<CustomHtmlModalProps> = ({
  isOpen,
  onClose,
  onApplyCustomImages,
}) => {
  const [htmlCode, setHtmlCode] = useState(DEFAULT_SNIPPET);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<HTMLAnalysisResult | null>(null);

  if (!isOpen) return null;

  const handleProcess = async () => {
    if (!htmlCode.trim()) return;
    setIsProcessing(true);
    try {
      const resp = await fetch('/api/analyze-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlCode }),
      });
      const data = await resp.json();
      if (data.success && data.result) {
        setAnalysis(data.result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (analysis && analysis.images.length > 0) {
      const urls = analysis.images.map((img) => img.src);
      onApplyCustomImages(urls);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Import & Hotlink Images from HTML
              </h3>
              <p className="text-xs text-slate-400">
                Paste any HTML snippet to extract and hotlink images using the Python backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
              HTML Code Snippet
            </label>
            <textarea
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
              placeholder="Paste HTML with <img src='...'> tags..."
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Parses &lt;img&gt; attributes directly via Python's standard library parser
            </span>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-teal-500/20 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              {isProcessing ? 'Analyzing in Python...' : 'Extract Hotlinks'}
            </button>
          </div>

          {analysis && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                  Found {analysis.total_images} Images ({analysis.secure_ratio}% HTTPS)
                </span>
                <button
                  onClick={handleApply}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline"
                >
                  Use for Hardware Screen
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-1">
                {analysis.images.map((img, i) => (
                  <div
                    key={i}
                    className="relative group rounded-lg overflow-hidden border border-slate-800 bg-slate-950 aspect-video"
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between text-[10px]">
                      <span className="text-slate-200 font-mono truncate">{img.domain}</span>
                      <a
                        href={img.src}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!analysis || analysis.images.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
            Apply to Screen
          </button>
        </div>
      </div>
    </div>
  );
};
