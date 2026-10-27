import React, { useState } from 'react';
import { 
  Play, 
  Terminal, 
  Clock, 
  Copy, 
  Check, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  SlidersHorizontal 
} from 'lucide-react';
import { PYTHON_SNIPPETS } from '../data/pythonSnippets';
import { PythonRunResult } from '../types';

interface PythonConsoleProps {
  onCodeExecuted?: () => void;
}

export const PythonConsole: React.FC<PythonConsoleProps> = ({ onCodeExecuted }) => {
  const [selectedSnippetId, setSelectedSnippetId] = useState<string>(PYTHON_SNIPPETS[0].id);
  const [code, setCode] = useState<string>(PYTHON_SNIPPETS[0].code);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<PythonRunResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSelectSnippet = (id: string) => {
    setSelectedSnippetId(id);
    const found = PYTHON_SNIPPETS.find((s) => s.id === id);
    if (found) {
      setCode(found.code);
    }
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const resp = await fetch('/api/python/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await resp.json();
      if (data.success && data.result) {
        setResult(data.result);
      } else {
        setResult({
          success: false,
          stdout: '',
          stderr: data.error || 'Execution failed on server.',
          return_code: 1,
          execution_time_ms: 0,
        });
      }
      if (onCodeExecuted) {
        onCodeExecuted();
      }
    } catch (err: any) {
      setResult({
        success: false,
        stdout: '',
        stderr: err.message || 'Network error connecting to Python backend.',
        return_code: 1,
        execution_time_ms: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyOutput = () => {
    const textToCopy = (result?.stdout || '') + (result?.stderr ? '\n' + result.stderr : '');
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 border-r border-slate-800/80">
      {/* Snippet Selection Toolbar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            Python 3 Scripts
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {code.split('\n').length} lines
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PYTHON_SNIPPETS.map((snippet) => (
            <button
              key={snippet.id}
              onClick={() => handleSelectSnippet(snippet.id)}
              className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
                selectedSnippetId === snippet.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {snippet.title}
            </button>
          ))}
        </div>
      </div>

      {/* Code Editor */}
      <div className="relative flex-1 flex flex-col min-h-[220px]">
        <div className="bg-slate-900/80 px-3 py-1.5 text-[11px] font-mono text-slate-400 border-b border-slate-800/60 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            script.py
          </span>
          <span className="text-[10px] text-slate-500">
            Press Run to execute in server Python 3.10
          </span>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full p-3 font-mono text-xs bg-slate-950 text-emerald-100 placeholder-slate-600 focus:outline-none resize-none leading-relaxed selection:bg-emerald-500/30"
          placeholder="# Write or paste Python code here..."
        />

        {/* Floating Execute Button */}
        <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {PYTHON_SNIPPETS.find((s) => s.id === selectedSnippetId)?.description}
          </div>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-semibold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run in Python Backend
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output Console / Terminal */}
      <div className="border-t border-slate-800 bg-slate-950 flex flex-col h-[280px]">
        <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              Terminal Output
            </span>
            {result && (
              <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${
                result.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {result.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                Exit {result.return_code}
              </span>
            )}
            {result && result.execution_time_ms > 0 && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                {result.execution_time_ms} ms
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyOutput}
              disabled={!result}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800/60 rounded border border-slate-700/60 transition-all disabled:opacity-30"
              title="Copy Output"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => setResult(null)}
              className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-800/60 rounded border border-slate-700/60"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex-1 p-3 font-mono text-xs overflow-y-auto bg-slate-950/90 leading-relaxed">
          {result ? (
            <div>
              {result.stdout && (
                <pre className="text-emerald-300 whitespace-pre-wrap">{result.stdout}</pre>
              )}
              {result.stderr && (
                <pre className="text-rose-400 whitespace-pre-wrap mt-2">{result.stderr}</pre>
              )}
              {!result.stdout && !result.stderr && (
                <span className="text-slate-500 italic">(Process completed with no console output)</span>
              )}
            </div>
          ) : (
            <div className="text-slate-600 text-xs italic flex flex-col items-center justify-center h-full">
              <Terminal className="w-6 h-6 mb-2 text-slate-700" />
              Click "Run in Python Backend" to execute code and view output here
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
