import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ExternalLink, BarChart3, Copy, Check, Tag, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchUserUrls();
  }, []);

  const fetchUserUrls = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/url/my-urls');
      setUrls(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const copyLink = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteUrl = async (id) => {
    if (!window.confirm('Are you sure you want to delete this URL?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/url/${id}`);
      // Remove the deleted URL from local state instantly
      setUrls(urls.filter(url => url._id !== id));
    } catch (err) {
      console.error('Error deleting URL:', err);
      alert('Failed to delete URL');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Your URL Dashboard</h1>

        <div className="grid gap-4">
          {urls.length === 0 ? (
            <p className="text-gray-500">You haven't created any shortened URLs yet.</p>
          ) : (
            urls.map((url) => (
              <div key={url._id} className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:shadow-md">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <a href={url.shortUrl} target="_blank" rel="noreferrer" className="text-lg font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                      {url.shortUrl} <ExternalLink className="w-4 h-4" />
                    </a>
                    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full font-medium">
                      <Tag className="w-3 h-3" /> {url.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{url.longUrl}</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-0 pt-3 md:pt-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                    <BarChart3 className="w-4 h-4" /> {url.clicks} Clicks
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyLink(url.shortUrl, url._id)}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Copy URL"
                    >
                      {copiedId === url._id ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => deleteUrl(url._id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Delete URL"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}