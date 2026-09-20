import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Lock, ArrowRight } from 'lucide-react';

export default function Unlock() {
  const { code } = useParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/url/unlock/${code}`, { password });
      window.location.href = res.data.longUrl; // Redirect to actual destination
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to unlock URL');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 transition-colors">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl space-y-6 border border-gray-200 dark:border-gray-800 text-center">
        <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center rounded-full mb-4">
          <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Protected Link</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">This URL requires a password to access the destination.</p>
        </div>

        {error && <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-lg font-medium">{error}</div>}

        <div className="text-left">
          <input
            type="password"
            required
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? 'Verifying...' : 'Unlock Link'} <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}