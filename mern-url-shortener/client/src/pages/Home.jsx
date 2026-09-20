import React, { useState, useContext, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { AuthContext } from '../context/AuthContext';
import { Copy, Check, Clock, Sparkles, Layers, Link2, Upload, Calendar, Lock } from 'lucide-react';

export default function Home() {
  const { user } = useContext(AuthContext);
  const [mode, setMode] = useState('single'); 
  
  // Single Mode State
  const [longUrl, setLongUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [customLength, setCustomLength] = useState(6);
  const [result, setResult] = useState(null);
  
  // Bulk Mode State
  const [bulkInput, setBulkInput] = useState('');
  const [bulkResults, setBulkResults] = useState([]);
  const fileInputRef = useRef(null);
  
  // Shared State
  const [expiresAt, setExpiresAt] = useState('');
  const [password, setPassword] = useState(''); // <-- NEW PASSWORD STATE
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getCurrentDateTime = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await axios.post('http://localhost:5000/api/url/shorten', {
        longUrl,
        customAlias: customAlias.trim() || undefined,
        customLength: parseInt(customLength),
        expiresAt: expiresAt || undefined,
        password: password || undefined // <-- NEW AXIOS PAYLOAD
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setBulkResults([]);
    
    const urls = bulkInput.split('\n').map(u => u.trim()).filter(u => u !== '');
    
    if (urls.length > 10) {
      setError('You can only shorten up to 10 URLs at a time.');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/url/shorten-bulk', { 
        urls,
        expiresAt: expiresAt || undefined,
        password: password || undefined // <-- NEW AXIOS PAYLOAD
      });
      setBulkResults(res.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const extractedUrls = text.split(/\r?\n/)
        .map(line => line.split(',')[0].trim())
        .filter(url => url.startsWith('http://') || url.startsWith('https://'));

      if (extractedUrls.length === 0) {
        setError('No valid HTTP/HTTPS URLs found in the first column of the CSV.');
        return;
      }
      
      if (extractedUrls.length > 10) {
        setError('Found more than 10 URLs. Only the first 10 have been loaded.');
        extractedUrls.length = 10;
      } else {
        setError('');
      }

      setBulkInput(extractedUrls.join('\n'));
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const copyToClipboard = (url, id = 'single') => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 py-12 px-4 transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Shorten URLs in Seconds</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Fast, secure, and smart link management.</p>
          {!user && (
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800">
              <Clock className="w-3.5 h-3.5" /> Guest links auto-delete in 24 hours. Sign in to save permanently!
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
            <button onClick={() => { setMode('single'); setError(''); }} className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'single' ? 'bg-white dark:bg-gray-900 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}>
              <Link2 className="w-4 h-4" /> Single
            </button>
            <button onClick={() => { setMode('bulk'); setError(''); }} className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'bulk' ? 'bg-white dark:bg-gray-900 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}>
              <Layers className="w-4 h-4" /> Bulk
            </button>
          </div>
        </div>

        {/* SINGLE MODE FORM */}
        {mode === 'single' && (
          <form onSubmit={handleSingleSubmit} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl space-y-4 border border-gray-200 dark:border-gray-800">
            <div>
              <label className="block text-sm font-medium mb-1">Destination Long URL</label>
              <input type="url" required placeholder="https://example.com/very-long-url" value={longUrl} onChange={(e) => setLongUrl(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Custom Alias (Optional)</label>
                <input type="text" placeholder="my-custom-link" value={customAlias} onChange={(e) => setCustomAlias(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Generated Code Length</label>
                <input type="number" min="4" max="12" value={customLength} onChange={(e) => setCustomLength(e.target.value)} disabled={!!customAlias} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50" />
              </div>
            </div>
            
            {user && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1 text-indigo-600 dark:text-indigo-400">
                    <Calendar className="w-4 h-4" /> Link Expiration (Optional)
                  </label>
                  <input type="datetime-local" min={getCurrentDateTime()} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
                {/* NEW PASSWORD INPUT */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1 text-indigo-600 dark:text-indigo-400">
                    <Lock className="w-4 h-4" /> Password Protection (Optional)
                  </label>
                  <input 
                    type="text" 
                    placeholder="Leave blank for public access" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
              </div>
            )}

            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
              {loading ? 'Shortening...' : 'Shorten URL'}
            </button>
          </form>
        )}

        {/* BULK MODE FORM */}
        {mode === 'bulk' && (
          <form onSubmit={handleBulkSubmit} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl space-y-4 border border-gray-200 dark:border-gray-800">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium">Paste Multiple URLs (One per line, max 10)</label>
                <div>
                  <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" id="csv-upload" />
                  <label htmlFor="csv-upload" className="cursor-pointer text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                    <Upload className="w-3.5 h-3.5" /> Upload .CSV
                  </label>
                </div>
              </div>
              <textarea required rows="6" placeholder="https://example.com/page1&#10;https://example.com/page2" value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
            </div>

            {user && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1 text-indigo-600 dark:text-indigo-400">
                    <Calendar className="w-4 h-4" /> Batch Expiration (Optional)
                  </label>
                  <input type="datetime-local" min={getCurrentDateTime()} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
                {/* NEW PASSWORD INPUT */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1 text-indigo-600 dark:text-indigo-400">
                    <Lock className="w-4 h-4" /> Password Protection (Optional)
                  </label>
                  <input 
                    type="text" 
                    placeholder="Leave blank for public access" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
              </div>
            )}

            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
              {loading ? 'Processing Batch...' : 'Shorten All URLs'}
            </button>
          </form>
        )}

        {/* SINGLE RESULT */}
        {mode === 'single' && result && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Shortened URL</p>
                <a href={result.shortUrl} target="_blank" rel="noreferrer" className="text-lg font-bold text-indigo-700 dark:text-indigo-300 hover:underline break-all">
                  {result.shortUrl}
                </a>
              </div>
              <button onClick={() => copyToClipboard(result.shortUrl, 'single')} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                {copiedId === 'single' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiedId === 'single' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Auto Category
                </div>
                <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium">{result.category}</span>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-md border"><QRCodeSVG value={result.shortUrl} size={110} /></div>
            </div>
          </div>
        )}

        {/* BULK RESULTS */}
        {mode === 'bulk' && bulkResults.length > 0 && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-bold text-lg border-b border-gray-200 dark:border-gray-800 pb-2">Batch Results ({bulkResults.length})</h3>
            <div className="space-y-3">
              {bulkResults.map((res) => (
                <div key={res._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="min-w-0 flex-1">
                    <a href={res.shortUrl} target="_blank" rel="noreferrer" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline block truncate">
                      {res.shortUrl}
                    </a>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{res.longUrl}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-medium">{res.category}</span>
                    <button onClick={() => copyToClipboard(res.shortUrl, res._id)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors">
                      {copiedId === res._id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}