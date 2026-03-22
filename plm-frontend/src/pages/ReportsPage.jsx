import React, { useState } from 'react';
import { useGetEcoSummary, useGetEcoList, useGetProductHistory, useGetBomHistory, useGetActiveMatrix, useGetAuditTrail } from '../hooks/useReports';
import { useGetProducts } from '../hooks/useProducts';
import StatusBadge from '../components/shared/StatusBadge';
import { Download, Loader2, Database, Table, GitCommit, Search, FileText, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

function ReportsPage() {
  const [activeTab, setActiveTab] = useState('eco');
  const [selectedProductId, setSelectedProductId] = useState('');

  const { data: summaryResp } = useGetEcoSummary();
  const { data: ecosResp, isLoading: isLoadingEcos } = useGetEcoList({ limit: 100 });
  const { data: prodsResp } = useGetProducts({ limit: 100 });
  const { data: historyResp, isLoading: isLoadingHist } = useGetProductHistory(selectedProductId);
  const { data: bomHistResp, isLoading: isLoadingBomHist } = useGetBomHistory(selectedProductId);
  const { data: activeMatrixResp, isLoading: isLoadingMatrix } = useGetActiveMatrix();
  const { data: auditResp, isLoading: isLoadingAudit } = useGetAuditTrail({ limit: 100 });

  const metrics = summaryResp?.data || { total: 0, byStatus: { APPROVED: 0, REJECTED: 0, IN_PROGRESS: 0, NEW: 0 } };

  const tabs = [
    { id: 'eco', label: 'ECO Report' },
    { id: 'product', label: 'Product History' },
    { id: 'bom', label: 'BoM History' },
    { id: 'audit', label: 'Audit Trail' },
    { id: 'matrix', label: 'Active Matrix' },
  ];

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-10 bg-[#f8fafc] min-h-full">
      
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-2 font-medium">ECO activity, version history, and audit data</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total ECOs', value: metrics.total, icon: RefreshCw, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Approved', value: metrics.byStatus.APPROVED || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Rejected', value: metrics.byStatus.REJECTED || 0, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Pending', value: (metrics.byStatus.IN_PROGRESS || 0) + (metrics.byStatus.NEW || 0), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex items-start space-x-6 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[40px] font-extrabold text-slate-900 leading-none">{stat.value}</p>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* Tabs Navigation */}
        <div className="border-b border-slate-100 flex px-8 pt-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-6 px-4 text-xs font-bold tracking-widest uppercase border-b-2 transition-all ${
                activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-10 flex-1 overflow-x-auto">
          {activeTab === 'eco' && (
            <div className="space-y-6">
              {isLoadingEcos ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-slate-300 w-12 h-12" /></div> : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-[#fcfdfd]">
                      <tr>
                        <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Title</th>
                        <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Type</th>
                        <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Product</th>
                        <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Stage</th>
                        <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Status</th>
                        <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                      {ecosResp?.data?.ecos?.map(e => (
                        <tr key={e._id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5 font-bold text-slate-800">{e.ecoTitle || e.title}</td>
                          <td className="px-8 py-5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              e.ecoType === 'BOM' ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                            }`}>
                              {e.ecoType}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-slate-500 font-bold">{e.productName}</td>
                          <td className="px-8 py-5 text-slate-800 font-bold text-xs uppercase tracking-tight">{e.currentStage || 'DONE'}</td>
                          <td className="px-8 py-5"><StatusBadge status={e.status} /></td>
                          <td className="px-8 py-5 text-slate-400 font-bold text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'product' && (
            <div className="space-y-10">
              <div className="w-full max-w-md">
                <select 
                  value={selectedProductId} 
                  onChange={e => setSelectedProductId(e.target.value)} 
                  className="block w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                >
                  <option value="">Select a product...</option>
                  {prodsResp?.data?.products?.map(p => <option key={p._id} value={p._id}>{p.name} (v{p.version})</option>)}
                </select>
              </div>

              {selectedProductId ? (
                isLoadingHist ? <Loader2 className="animate-spin text-slate-300 w-10 h-10 ml-4" /> : (
                  <div className="relative pl-8 space-y-10">
                    <div className="absolute left-10 top-2 bottom-2 w-px bg-slate-100"></div>
                    {historyResp?.data?.map((h, i) => (
                      <div key={i} className="relative flex items-center group">
                        <div className="absolute left-0 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-white shadow-sm z-10 transition-transform group-hover:scale-125"></div>
                        <div className="ml-10 flex items-center space-x-6">
                           <span className="text-sm font-bold text-slate-900">Version {h.version}</span>
                           <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-widest ${
                             h.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                           }`}>
                             {h.status}
                           </span>
                           {h.archivedByEcoId && (
                             <span className="text-xs text-slate-400 font-bold">ECO: {h.archivedByEcoId?.title || 'Unknown'}</span>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">Please select a product to view version history</div>
              )}
            </div>
          )}

          {activeTab === 'bom' && (
             <div className="space-y-10">
                <div className="w-full max-w-md">
                  <select 
                    value={selectedProductId} 
                    onChange={e => setSelectedProductId(e.target.value)} 
                    className="block w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  >
                    <option value="">Select a product...</option>
                    {prodsResp?.data?.products?.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>

                {selectedProductId ? (
                  isLoadingBomHist ? <Loader2 className="animate-spin text-slate-300 w-10 h-10" /> : (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-[#fcfdfd]">
                          <tr>
                            <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">BoM Version</th>
                            <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Product Version</th>
                            <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Components</th>
                            <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Status</th>
                            <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">ECO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                          {bomHistResp?.data?.map((b, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-5 font-bold text-slate-900">v{b.bomVersion}</td>
                              <td className="px-8 py-5 text-slate-500 font-bold">v{b.productVersion}</td>
                              <td className="px-8 py-5 text-slate-800 font-bold">{b.componentsCount || 0}</td>
                              <td className="px-8 py-5"><StatusBadge status={b.status} /></td>
                              <td className="px-8 py-5 text-slate-400 font-bold">—</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">Please select a product to view BoM history</div>
                )}
             </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
               {isLoadingAudit ? <Loader2 className="animate-spin text-slate-300 w-12 h-12" /> : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-[#fcfdfd]">
                        <tr>
                          <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Timestamp</th>
                          <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Action</th>
                          <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Entity</th>
                          <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Name</th>
                          <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white">
                        {auditResp?.data?.logs?.map(log => (
                          <tr key={log._id} className="hover:bg-slate-50/50">
                            <td className="px-8 py-5 whitespace-nowrap text-slate-400 font-bold text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="px-8 py-5 font-mono text-[10px] font-bold text-indigo-600">
                              <span className="bg-indigo-50 px-2.5 py-1 rounded-md">{log.action || log.actionType}</span>
                            </td>
                            <td className="px-8 py-5 text-slate-800 font-bold uppercase text-[10px] tracking-widest">{log.entityType}</td>
                            <td className="px-8 py-5 text-slate-900 font-bold">{log.entityName || 'AC'}</td>
                            <td className="px-8 py-5 text-slate-700 font-bold">{log.performedBy?.name || 'Apurva Jayswal'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               )}
            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="space-y-4">
               <p className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest">Current active product-to-BoM mapping.</p>
               {isLoadingMatrix ? <Loader2 className="animate-spin text-slate-300 w-12 h-12" /> : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-[#fcfdfd]">
                        <tr>
                          <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Product</th>
                          <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">SKU</th>
                          <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Version</th>
                          <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">BoM Version</th>
                          <th className="px-8 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Components</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white">
                        {activeMatrixResp?.data?.map(mat => (
                          <tr key={mat._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5 font-bold text-slate-900">{mat.productName}</td>
                            <td className="px-8 py-5 font-mono font-bold text-xs text-slate-400">
                              <span className="bg-slate-100 px-2 py-1 rounded">{mat.sku}</span>
                            </td>
                            <td className="px-8 py-5 text-slate-600 font-bold">v{mat.productVersion}</td>
                            <td className="px-8 py-5 text-slate-600 font-bold">v{mat.bomVersion}</td>
                            <td className="px-8 py-5 font-bold text-slate-800">{mat.componentsCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
