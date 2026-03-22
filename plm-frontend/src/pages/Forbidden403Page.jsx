import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

function Forbidden403Page() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="bg-red-50 rounded-2xl p-5 mb-6">
        <ShieldOff className="w-14 h-14 text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Access Restricted</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-sm">
        You don't have permission to access this page. Contact your administrator if you believe this is an error.
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

export default Forbidden403Page;
