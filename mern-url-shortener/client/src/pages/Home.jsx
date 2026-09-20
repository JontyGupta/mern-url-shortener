import React, { useState, useContext } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { AuthContext } from '../context/AuthContext';
import { Copy, Check, Clock, Sparkles } from 'lucide-react';

export default function Home() {
  const { user } = useContext(AuthContext);
  const [longUrl, setLongUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [customLength, setCustomLength] = useState(6);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await axios.post('http://localhost:5000/api/url/shorten', {
        longUrl,
        customAlias: customAlias.trim() || undefined,
        customLength: parseInt(customLength)
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 py-12 px-4 transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Shorten URLs in Seconds
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Fast, secure, and smart link management.
          </p>
          {!user && (
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800">
              <Clock className="w-3.5 h-3.5" /> Guest links auto-delete in 24 hours. Sign in to save permanently!
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl space-y-4 border border-gray-200 dark:border-gray-800">
          <div>
            <label className="block text-sm font-medium mb-1">Destination Long URL</label>
            <input
              type="url"
              required
              placeholder="https://example.com/very-long-url"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Custom Alias (Optional)</label>
              <input
                type="text"
                placeholder="my-custom-link"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Generated Code Length</label>
              <input
                type="number"
                min="4"
                max="12"
                value={customLength}
                onChange={(e) => setCustomLength(e.target.value)}
                disabled={!!customAlias}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Shortening...' : 'Shorten URL'}
          </button>
        </form>

        {result && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Shortened URL</p>
                <a href={result.shortUrl} target="_blank" rel="noreferrer" className="text-lg font-bold text-indigo-700 dark:text-indigo-300 hover:underline break-all">
                  {result.shortUrl}
                </a>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Auto Category
                </div>
                <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium">
                  {result.category}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl shadow-md border">
                <QRCodeSVG value={result.shortUrl} size={110} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}