import React, { useState, useEffect } from 'react';
import { useGetBoms, useActivateBom } from '../hooks/useBom';
import { useGetProducts } from '../hooks/useProducts';
import { useAuthStore } from '../store/authStore';
import { canEdit } from '../utils/roleGuard';
import StatusBadge from '../components/shared/StatusBadge';
import { Eye, Edit, Plus, Component } from 'lucide-react';
import BomForm from '../components/bom/BomForm';

function BomPage() {
  const { user } = useAuthStore();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeFormId, setActiveFormId] = useState(null); // 'new' | id
  
  // Products filter for dropdown: only ACTIVE products can have new BoMs generally
  const { data: productsResp } = useGetProducts({ status: 'ACTIVE', limit: 100 });
  const activeProducts = productsResp?.data?.products || [];

  const { data: bomsResp, isLoading: isLoadingBoms } = useGetBoms({
    productId: selectedProductId || undefined,
    status: statusFilter || undefined,
  });
  
  const boms = bomsResp?.data?.boms || [];

  const activateMutation = useActivateBom();

  const handleActivate = async (id) => {
    if (window.confirm('Directly activating bypasses ECO governance. Ensure you have ADMIN authority. Proceed?')) {
      await activateMutation.mutateAsync(id);
    }
  };

  const showNewButton = ['ADMIN', 'ENGINEER'].includes(user?.role);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bills of Materials <span className="text-sm font-normal text-slate-500 ml-2">({bomsResp?.data?.total || boms.length} total)</span></h1>
        </div>
        
        {showNewButton && (
          <button
            onClick={() => setActiveFormId('new')}
            className="inline-flex items-center justify-center py-2 px-4 shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            <Plus className="mr-2 h-4 w-4" /> New BoM
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:max-w-xs xl:w-64">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 rounded-lg leading-5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm"
          >
            <option value="">All Products</option>
            {activeProducts.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200">
          {['', 'DRAFT', 'ACTIVE', 'ARCHIVED'].map((tab) => {
            if (user?.role === 'OPERATIONS' && tab === 'DRAFT') return null;
            if (user?.role === 'OPERATIONS' && tab === 'ARCHIVED') return null;

            const label = tab === '' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase();
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  statusFilter === tab 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
        {isLoadingBoms ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
        ) : boms.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <Component className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No BoMs found</h3>
            <p className="mt-1 text-sm text-slate-500">Select another product or create a new BoM.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-[#fcfdfd] border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">BoM Ver.</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">Prod. Ver.</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">Components</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">Operations</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {boms.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">
                      {b.productId?.name || 'Unknown Product'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">v{b.bomVersion}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">v{b.productId?.version || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{b.components?.length || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{b.operations?.length || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={b.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-4">
                      <button onClick={() => setActiveFormId(b._id)} className="text-slate-400 hover:text-slate-600 transition-colors" title="View details">
                        <Eye className="w-[18px] h-[18px] inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeFormId && (
        <BomForm bomId={activeFormId === 'new' ? null : activeFormId} onClose={() => setActiveFormId(null)} />
      )}
    </div>
  );
}

export default BomPage;
