import React, { useState } from 'react';
import StageManager from '../components/settings/StageManager';
import { useAuthStore } from '../store/authStore';
import { Settings as SettingsIcon, Shield, Layers, Server } from 'lucide-react';
import { Navigate } from 'react-router-dom';

function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('stages');

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-full bg-white">
      {/* Settings Navigation Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-bold flex items-center text-gray-900">
            <SettingsIcon className="mr-2 h-6 w-6 text-gray-500" /> Settings
          </h2>
          <p className="text-sm text-gray-500 mt-1">Global administrative controls.</p>
        </div>
        <nav className="flex-1 space-y-1 px-4 mt-2">
           <button
             onClick={() => setActiveTab('stages')}
             className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md ${activeTab === 'stages' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
           >
             <Layers className="mr-3 h-5 w-5" /> ECO Pipeline Stages
           </button>
           <button
             onClick={() => setActiveTab('about')}
             className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md ${activeTab === 'about' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
           >
             <Server className="mr-3 h-5 w-5" /> System About
           </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'stages' && (
          <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
               <h1 className="text-2xl font-bold text-gray-900">Workflow Node Parameterization</h1>
               <p className="mt-1 text-sm text-gray-500">Construct deterministic dependencies cascading execution validations across standard users systematically.</p>
            </div>
            <StageManager />
          </div>
        )}
        {activeTab === 'about' && (
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">System About</h1>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4 max-w-2xl">
               <p className="flex items-center text-sm font-medium text-gray-700"><Shield className="mr-2 h-5 w-5 text-green-500" /> Platform: AntiGravity V1 Framework</p>
               <p className="text-sm text-gray-600">Enterprise Product Lifecycle Management Architecture built concurrently mimicking standard strict monolithic boundaries.</p>
               <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-mono text-gray-400">Environment Node: NODE_ENV=production</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
