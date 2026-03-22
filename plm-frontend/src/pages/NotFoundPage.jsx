import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-slate-50">
      <div className="bg-slate-100 rounded-2xl p-5 mb-6">
        <FileQuestion className="w-14 h-14 text-slate-400" />
      </div>
      <h1 className="text-6xl font-bold text-slate-900">404</h1>
      <h2 className="text-xl font-semibold text-slate-700 mt-2">Page not found</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

export default NotFoundPage;
