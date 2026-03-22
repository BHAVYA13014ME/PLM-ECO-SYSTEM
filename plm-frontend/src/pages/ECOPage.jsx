import React, { useState } from 'react';
import { useGetECOs } from '../hooks/useECO';
import { useAuthStore } from '../store/authStore';
import { canEditEco } from '../utils/roleGuard';
import StatusBadge from '../components/shared/StatusBadge';
import { Eye, Edit, ClipboardSignature, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ECOCard from '../components/eco/ECOCard';

function ECOPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');
  // fetch more to populate columns
  const { data: resp, isLoading } = useGetECOs({
    ecoType: typeFilter,
    limit: 100,
  });

  const ecos = resp?.data?.ecos || [];
  
  const columns = ['NEW', 'IN_PROGRESS', 'APPROVED', 'REJECTED'];
  const groupedEcos = columns.reduce((acc, status) => {
    acc[status] = ecos.filter(e => e.status === status) || [];
    return acc;
  }, {});

  const showNewButton = ['ADMIN', 'ENGINEER'].includes(user?.role);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Engineering Change Orders <span className="text-sm font-normal text-slate-500 ml-2">({resp?.data?.total || ecos.length} total)</span></h1>
        </div>
        
        {showNewButton && (
            <button 
              onClick={() => navigate('/eco/new')}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 sm:w-auto"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              New ECO
            </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:max-w-xs xl:w-72">
          <input
            type="text"
            className="block w-full pl-3 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm"
            placeholder="Search ECOs..."
            disabled
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm"
          >
            <option value="">All Types</option>
            <option value="PRODUCT">Product</option>
            <option value="BOM">BoM</option>
          </select>
        </div>
      </div>

      {/* Main Kanban View */}
      <div className="relative flex-1 -mx-6 px-6 overflow-x-auto">
        <div className="flex gap-6 min-w-max pb-4 h-full items-start">
          {columns.map(status => {
            const colEcos = groupedEcos[status];
            return (
              <div key={status} className="w-80 flex flex-col bg-slate-100/50 rounded-xl p-4 border border-slate-200/60 shadow-sm min-h-[calc(100vh-280px)]">
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">
                    {status.replace('_', ' ')}
                  </h3>
                  <span className="bg-white text-slate-500 text-xs font-bold px-2 py-0.5 rounded shadow-sm border border-slate-200">
                    {colEcos.length}
                  </span>
                </div>
                <div className="flex flex-col gap-4 flex-1">
                  {isLoading ? (
                    <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div></div>
                  ) : colEcos.length === 0 ? (
                    <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center p-6 text-center text-sm font-medium text-slate-400">
                      Drop area empty
                    </div>
                  ) : (
                    colEcos.map(eco => (
                      <ECOCard key={eco._id} eco={eco} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>


  );
}

export default ECOPage;
