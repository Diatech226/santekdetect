import React, { useState } from 'react';
import { 
  Link2, 
  ShieldCheck, 
  ShieldAlert, 
  Globe, 
  Image as ImageIcon, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink,
  Code
} from 'lucide-react';
import { HTMLAnalysisResult } from '../types';

interface HotlinkInspectorProps {
  onApplyImagesToScreen?: (images: string[]) => void;
}

const SAMPLE_HTML_SNIPPETS = [
  {
    name: 'Hardware & Audio Setup',
    html: `<div class="setup-grid">
  <img src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80" alt="Analog Synth" width="800" />
  <img src="https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80" alt="Studio Monitors" width="800" />
  <img src="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80" alt="Control Deck" width="800" />
</div>`
  },
  {
    name: 'Industrial Robotics',
    html: `<div class="robotics-gallery">
  <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80" alt="Laser Probe" />
  <img src="https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80" alt="Robotics Circuit" />
  <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80" alt="Microprocessor" />
</div>`
  }
];

export const HotlinkInspector: React.FC<HotlinkInspectorProps> = ({ onApplyImagesToScreen }) => {
  const [htmlInput, setHtmlInput] = useState<string>(SAMPLE_HTML_SNIPPETS[0].html);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<HTMLAnalysisResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!htmlInput.trim()) return;
    setIsAnalyzing(true);
    try {
      const resp = await fetch('/api/analyze-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlInput }),
      });
      const data = await resp.json();
      if (data.success && data.result) {
        setAnalysis(data.result);
      }
    } catch (err) {
      console.error('Failed to analyze HTML images:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Top Controls */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-medium text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-teal-400" />
            Python HTML Image Hotlink Parser
          </span>
          <div className="flex items-center gap-1">
            {SAMPLE_HTML_SNIPPETS.map((snip, idx) => (
              <button
                key={idx}
                onClick={() => setHtmlInput(snip.html)}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Sample {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={htmlInput}
          onChange={(e) => setHtmlInput(e.target.value)}
          rows={3}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
          placeholder="Paste any HTML snippet with <img> tags to hotlink images..."
        />

        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-slate-500">
            Uses Python's native <code className="text-slate-400">html.parser.HTMLParser</code> to extract hotlink URLs
          </span>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded-lg transition-all shadow-md shadow-teal-500/20 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            {isAnalyzing ? 'Extracting with Python...' : 'Extract & Hotlink Images'}
          </button>
        </div>
      </div>

      {/* Analysis Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {analysis ? (
          <div>
            {/* Summary KPI Pills */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-teal-400" /> Total Images
                </div>
                <div className="text-lg font-mono font-semibold text-white mt-0.5">
                  {analysis.total_images}
                </div>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Secure HTTPS
                </div>
                <div className="text-lg font-mono font-semibold text-emerald-400 mt-0.5">
                  {analysis.secure_ratio}%
                </div>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-cyan-400" /> Host Domains
                </div>
                <div className="text-lg font-mono font-semibold text-cyan-300 mt-0.5">
                  {analysis.unique_domains.length}
                </div>
              </div>
            </div>

            {/* Extracted Images Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase font-mono tracking-wider">
                Extracted Hotlinked Media
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.images.map((img, i) => (
                  <div
                    key={i}
                    className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden flex flex-col group hover:border-slate-700 transition-all"
                  >
                    <div className="relative aspect-video bg-slate-950 overflow-hidden">
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm text-[10px] font-mono border border-slate-700">
                        {img.is_secure ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5" /> HTTPS
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1">
                            <ShieldAlert className="w-2.5 h-2.5" /> HTTP
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-medium text-slate-200 line-clamp-1">
                          {img.alt || 'Untitled Media'}
                        </div>
                        <div className="text-[11px] font-mono text-cyan-400 mt-0.5 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-500" />
                          {img.domain}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <button
                          onClick={() => handleCopy(img.src)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                        >
                          {copiedUrl === img.src ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy URL</span>
                            </>
                          )}
                        </button>
                        <a
                          href={img.src}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-cyan-400"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
            <Link2 className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-xs font-medium text-slate-400">No HTML analyzed yet</p>
            <p className="text-[11px] text-slate-600 mt-1 max-w-sm">
              Paste HTML containing &lt;img src="..."&gt; above and click "Extract & Hotlink Images" to run the Python parser.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
