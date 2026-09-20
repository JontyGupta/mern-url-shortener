import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminDashboard() {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/url/all-urls')
      .then((res) => setUrls(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-amber-600 dark:text-amber-400">Admin Control Panel</h1>
        
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="p-4">Short Link</th>
                <th className="p-4">Original URL</th>
                <th className="p-4">Category</th>
                <th className="p-4">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {urls.map((u) => (
                <tr key={u._id}>
                  <td className="p-4 font-semibold text-indigo-600 dark:text-indigo-400">{u.shortCode || u.urlCode}</td>
                  <td className="p-4 max-w-xs truncate">{u.longUrl}</td>
                  <td className="p-4">{u.category}</td>
                  <td className="p-4 font-bold">{u.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}