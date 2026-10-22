'use client';
import { useState, useRef } from 'react';

interface SmartUploadProps {
  onSuccess?: () => void;
  buttonLabel?: string;
  className?: string;
}

async function loadPDFJS(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).__pdfjsLib) return (window as any).__pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/pdf.min.js';
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (!lib) { reject(new Error('PDF.js failed to load')); return; }
      lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      (window as any).__pdfjsLib = lib;
      resolve(lib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

async function extractPDFText(file: File): Promise<string> {
  const pdfjsLib = await loadPDFJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const rowMap: Record<number, Array<{x: number, str: string}>> = {};
    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      const x = item.transform[4];
      if (!rowMap[y]) rowMap[y] = [];
      rowMap[y].push({ x, str: item.str });
    }
    const sortedRows = Object.keys(rowMap)
      .sort((a, b) => Number(b) - Number(a))
      .map(y => rowMap[Number(y)].sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim())
      .filter(row => row.length > 2);
    fullText += sortedRows.join('\n') + '\n';
  }
  return fullText;
}

export default function SmartUpload({ onSuccess, buttonLabel = '+ Upload Statement', className = 'btn-gold text-sm' }: SmartUploadProps) {
  const [modal, setModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File): Promise<any> {
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    if (isCSV) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('auto_detect', 'true');
      try {
        const res = await fetch('/api/statements', { method: 'POST', body: fd });
        const text = await res.text();
        if (!text) return { ok: false, error: 'Empty server response' };
        return JSON.parse(text);
      } catch (e: any) { return { ok: false, error: e.message }; }
    }
    try {
      setProgress(p => ({ ...p, stage: 'Reading PDF...' }));
      const pdfText = await extractPDFText(file);
      if (!pdfText || pdfText.trim().length < 50) {
        return { ok: false, error: 'Could not read PDF. Only digital bank statements are supported.' };
      }
      setProgress(p => ({ ...p, stage: 'Saving to database...' }));
      const res = await fetch('/api/statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_text: pdfText, file_name: file.name, file_size: file.size, auto_detect: true }),
      });
      const text = await res.text();
      if (!text) return { ok: false, error: 'Server returned empty response' };
      try { return JSON.parse(text); } catch { return { ok: false, error: `Server error: ${text.substring(0, 100)}` }; }
    } catch (err: any) { return { ok: false, error: err.message || 'PDF processing failed' }; }
  }

  async function handleUpload() {
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return;
    setUploading(true); setResults([]);
    setProgress({ current: 0, total: files.length, stage: '' });
    const allResults: any[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length, stage: 'Starting...' });
      const data = await uploadFile(files[i]);
      allResults.push({ fileName: files[i].name, fileSize: files[i].size, ...data });
      setResults([...allResults]);
    }
    setUploading(false);
    if (allResults.some(r => r.ok && r.inserted > 0) && onSuccess) onSuccess();
  }

  const totalInserted = results.reduce((s, r) => s + (r.inserted || 0), 0);
  const totalSkipped = results.reduce((s, r) => s + (r.skipped || 0), 0);
  const successCount = results.filter(r => r.ok && !r.already_exists).length;
  const failCount = results.filter(r => !r.ok).length;

  function getStatus(r: any) {
    if (!r.ok) return { text: r.error, color: '#ef4444' };
    if (r.already_exists) return { text: 'Already uploaded', color: '#f59e0b' };
    if (r.inserted === 0) return { text: `All ${r.skipped} transactions already exist`, color: '#f59e0b' };
    return { text: `+${r.inserted} new · ${r.skipped} duplicates skipped`, color: 'rgba(255,255,255,0.5)' };
  }

  function fmt(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return (
    <>
      <button className={className} onClick={() => { setModal(true); setResults([]); if (fileRef.current) fileRef.current.value = ''; }}>
        {buttonLabel}
      </button>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
             style={{ background: 'rgba(0,0,0,0.85)' }}
             onClick={e => e.target === e.currentTarget && !uploading && setModal(false)}>
          <div className="card w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-5 md:p-6 rounded-t-3xl md:rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">Upload Statements</h2>
              {!uploading && <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white text-2xl">×</button>}
            </div>
            <div className="rounded-xl p-4 border" style={{ background: 'rgba(201,168,76,0.05)', borderColor: 'rgba(201,168,76,0.2)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#c9a84c' }}>✨ Smart Import</p>
              <div className="text-xs space-y-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <p>• PDFs are read in your browser — no size limit</p>
                <p>• Select multiple files at once</p>
                <p>• Duplicate transactions are never imported twice</p>
                <p>• Supports: DIB · CBD · WIO · Emirates Islamic · Emirates NBD</p>
              </div>
            </div>
            <div>
              <label>Select Statements (PDF or CSV)</label>
              <input ref={fileRef} type="file" accept=".pdf,.csv" multiple onChange={() => setResults([])} />
            </div>
            {uploading && (
              <div>
                <div className="flex justify-between text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <span>File {progress.current} of {progress.total} — {progress.stage}</span>
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%`, background: 'linear-gradient(90deg,#c9a84c,#e8c96a)' }} />
                </div>
              </div>
            )}
            {results.length > 0 && (
              <div className="space-y-2">
                <div className="rounded-xl p-3 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {successCount > 0 && <span className="text-green-400 font-semibold">✓ {successCount} imported</span>}
                    {failCount > 0 && <span className="text-red-400 font-semibold">✗ {failCount} failed</span>}
                    {totalInserted > 0 && <span style={{ color: 'rgba(255,255,255,0.5)' }}>{totalInserted} new transactions</span>}
                    {totalSkipped > 0 && <span style={{ color: 'rgba(255,255,255,0.4)' }}>{totalSkipped} skipped</span>}
                  </div>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {results.map((r, i) => {
                    const s = getStatus(r);
                    return (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <span className="text-base shrink-0">{!r.ok ? '❌' : r.already_exists ? '⚠️' : r.inserted === 0 ? '🔁' : '✅'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium truncate">{r.fileName}</p>
                            {r.fileSize && <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>{fmt(r.fileSize)}</span>}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: s.color }}>{s.text}</p>
                          {r.ok && !r.already_exists && r.bank_detected && (
                            <span className="text-xs px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                              🏦 {r.bank_detected} {r.date_range && `· ${r.date_range}`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button className="btn-gold flex-1" disabled={uploading} onClick={handleUpload}>
                {uploading ? `⏳ ${progress.current}/${progress.total} — ${progress.stage}` : results.length > 0 ? '🔄 Upload More' : '🚀 Upload & Import'}
              </button>
              {!uploading && <button className="btn-ghost" onClick={() => setModal(false)}>{results.length > 0 ? 'Done' : 'Cancel'}</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}