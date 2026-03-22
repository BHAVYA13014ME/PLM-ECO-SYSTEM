import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { ecoApi } from '../api/ecoApi';
import { productApi } from '../api/productApi';
import { reportApi } from '../api/reportApi';
import { Link, useNavigate } from 'react-router-dom';
import StatusBadge from '../components/shared/StatusBadge';
import { ClipboardSignature, FileText, Anchor, BarChart, Plus, Eye, Loader2 } from 'lucide-react';

/* --- SUB-DASHBOARDS --- */

function EngineerDashboard({ user }) {
  const navigate = useNavigate();

  const { data: ecoResp, isLoading: isLoadingEcos } = useQuery({
    queryKey: ['ecos', { status: 'NEW,IN_PROGRESS', limit: 10 }],
    queryFn: () => ecoApi.getAll({ status: 'NEW,IN_PROGRESS', limit: 10 }),
  });
  
  const { data: prodResp, isLoading: isLoadingProds } = useQuery({
    queryKey: ['products', { status: 'DRAFT', limit: 10 }],
    queryFn: () => productApi.getAll({ status: 'DRAFT', limit: 10 }),
  });

  const myEcos = (ecoResp?.data?.ecos || []).filter(e => e.createdBy?._id === user._id || typeof e.createdBy === 'string' && e.createdBy === user._id);
  const myDrafts = (prodResp?.data?.products || []).filter(p => p.createdBy === user._id || p.createdBy?._id === user._id);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-white shadow-lg overflow-hidden relative">
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold tracking-tight">Initiate modifications safely.</h2>
          <p className="mt-2 text-blue-100 max-w-xl text-lg">Spawn Engineering Change Orders to securely mutate ACTIVE architectures across the application without breaching audit compliances.</p>
          <button onClick={() => navigate('/eco')} className="mt-6 bg-white text-blue-700 px-6 py-3 rounded-md font-bold text-sm shadow hover:bg-gray-50 transition transform hover:-translate-y-0.5 inline-flex items-center">
            <Plus size={18} className="mr-2" /> Start New ECO Pipeline
          </button>
        </div>
        <ClipboardSignature className="absolute -right-8 -bottom-10 h-64 w-64 text-white opacity-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">My Active ECOs</h3>
            <Link to="/eco" className="text-sm text-blue-600 hover:text-blue-500 font-medium">View all &rarr;</Link>
          </div>
          <div className="p-0">
            {isLoadingEcos ? (
               <div className="p-6 text-center"><Loader2 className="animate-spin h-6 w-6 text-blue-500 mx-auto" /></div>
            ) : myEcos.length === 0 ? (
               <div className="p-6 text-center text-gray-500 text-sm">No active ECOs found.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {myEcos.map(eco => (
                  <li key={eco._id} className="p-4 hover:bg-gray-50 flex justify-between items-center transition cursor-pointer" onClick={() => navigate(`/eco/${eco._id}`)}>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{eco.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{eco.targetProductId?.name}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={eco.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">My Draft Products</h3>
            <Link to="/products" className="text-sm text-blue-600 hover:text-blue-500 font-medium">View all &rarr;</Link>
          </div>
          <div className="p-0">
            {isLoadingProds ? (
               <div className="p-6 text-center"><Loader2 className="animate-spin h-6 w-6 text-blue-500 mx-auto" /></div>
            ) : myDrafts.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No DRAFT concepts currently mapped locally.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {myDrafts.map(prod => (
                  <li key={prod._id} className="p-4 hover:bg-gray-50 flex justify-between items-center transition">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{prod.name}</p>
                      <p className="text-xs font-mono text-gray-400 mt-1">{prod.sku}</p>
                    </div>
                    <StatusBadge status={prod.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ApproverDashboard() {
  const { data: resp, isLoading } = useQuery({
    queryKey: ['eco-summary'],
    queryFn: () => reportApi.getEcoSummary(),
    refetchInterval: 30000,
  });

  const pendingEcos = resp?.data?.recentECOs?.filter(e => e.status === 'IN_PROGRESS') || [];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 flex items-center">
          <Anchor className="h-5 w-5 text-indigo-500 mr-2" />
          Pending Your Approval
        </h2>
        
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
        ) : pendingEcos.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-base font-medium">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">There are zero workflows pending your review criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ECO Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Scope</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Elapsed Wait Time</th>
                  <th className="px-6 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingEcos.map((eco) => {
                  const daysWaiting = Math.floor((new Date() - new Date(eco.updatedAt)) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={eco._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{eco.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{eco.targetProductId?.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        {daysWaiting === 0 ? 'Today' : `${daysWaiting} Days`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link to={`/eco/${eco._id}`} className="text-indigo-600 hover:text-indigo-900 font-bold inline-flex items-center">
                          Review Request &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { Package, CheckCircle2, List, ArrowLeftRight } from 'lucide-react';

function AdminDashboard() {
  const { data: dashboardResp, isLoading } = useQuery({ 
    queryKey: ['admin-dashboard'], 
    queryFn: () => reportApi.getAdminDashboard(),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;
  }

  const { metrics, recentActivity, ecoPipeline } = dashboardResp?.data || { 
    metrics: { totalProducts: 0, activeProducts: 0, totalBoms: 0, openEcos: 0 },
    recentActivity: [],
    ecoPipeline: { NEW: 0, IN_PROGRESS: 0, APPROVED: 0, REJECTED: 0 }
  };

  const metricCards = [
    { label: 'Total Products', value: metrics.totalProducts, icon: Package, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
    { label: 'Active Products', value: metrics.activeProducts, icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Total BoMs', value: metrics.totalBoms, icon: List, iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
    { label: 'Open ECOs', value: metrics.openEcos, icon: ArrowLeftRight, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  ];

  const pipelineTotal = (ecoPipeline.NEW || 0) + (ecoPipeline.IN_PROGRESS || 0) + (ecoPipeline.APPROVED || 0) + (ecoPipeline.REJECTED || 0);

  const getBarWidth = (val) => {
    if (pipelineTotal === 0) return '0%';
    return `${(val / pipelineTotal) * 100}%`;
  };

  return (
    <div className="space-y-6">
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metricCards.map((m, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col justify-between h-32">
            <div className={`h-10 w-10 rounded-lg ${m.iconBg} flex items-center justify-center`}>
              <m.icon className={`h-5 w-5 ${m.iconColor}`} />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800">{m.value}</p>
              <p className="text-sm font-medium text-slate-400 mt-1">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity (takes up 2 columns) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <div className="p-5 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Recent Activity</h3>
            <Link to="/reports" className="text-sm text-indigo-500 hover:text-indigo-600 font-medium">View All &rarr;</Link>
          </div>
          <div className="p-5">
            {recentActivity.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-10">No recent activity.</p>
            ) : (
              <ul className="space-y-6">
                {recentActivity.slice(0, 5).map((log) => (
                  <li key={log.id} className="relative flex items-start space-x-3">
                    <div className="relative flex-shrink-0 mt-1">
                      <span className="flex h-2 w-2 rounded-full bg-indigo-400"></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-700">{log.action}</span> — {log.entityName}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">by {log.user}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ECO Pipeline (takes up 1 column) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-5 border-b border-slate-50">
            <h3 className="text-base font-bold text-slate-800">ECO Pipeline</h3>
          </div>
          <div className="p-5">
            {/* Horizontal Stacked Bar */}
            <div className="h-4 w-full flex rounded-full overflow-hidden bg-slate-100 mb-6">
              {pipelineTotal > 0 ? (
                <>
                  <div style={{ width: getBarWidth(ecoPipeline.NEW) }} className="bg-blue-400"></div>
                  <div style={{ width: getBarWidth(ecoPipeline.IN_PROGRESS) }} className="bg-indigo-400"></div>
                  <div style={{ width: getBarWidth(ecoPipeline.APPROVED) }} className="bg-emerald-400"></div>
                  <div style={{ width: getBarWidth(ecoPipeline.REJECTED) }} className="bg-red-400"></div>
                </>
              ) : (
                <div className="w-full bg-slate-200"></div>
              )}
            </div>

            {/* Legend */}
            <ul className="space-y-3">
              <li className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-400 mr-3"></span>
                  <span className="text-slate-600">New</span>
                </div>
                <span className="font-semibold text-slate-800">{ecoPipeline.NEW || 0}</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 mr-3"></span>
                  <span className="text-slate-600">In Progress</span>
                </div>
                <span className="font-semibold text-slate-800">{ecoPipeline.IN_PROGRESS || 0}</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 mr-3"></span>
                  <span className="text-slate-600">Approved</span>
                </div>
                <span className="font-semibold text-slate-800">{ecoPipeline.APPROVED || 0}</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400 mr-3"></span>
                  <span className="text-slate-600">Rejected</span>
                </div>
                <span className="font-semibold text-slate-800">{ecoPipeline.REJECTED || 0}</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

function OperationsDashboard() {
  const { data: matrixResp, isLoading } = useQuery({ queryKey: ['active-matrix'], queryFn: () => reportApi.getActiveMatrix() });
  const matrixParams = matrixResp?.data || [];
  
  const activeProducts = matrixParams.length;
  const activeBoms = matrixParams.filter(m => m.activeBomVersion !== null).length;

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Deployments (Products)</p>
          <p className="mt-2 text-4xl font-extrabold text-blue-600">{isLoading ? '-' : activeProducts}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active BoM Topologies</p>
          <p className="mt-2 text-4xl font-extrabold text-indigo-600">{isLoading ? '-' : activeBoms}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50">
           <h3 className="text-base font-bold text-gray-900 flex items-center"><FileText className="w-5 h-5 mr-2 text-gray-400" /> Operational Matrix Ledger</h3>
        </div>
        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : (
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-100/50">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Signature</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Ver</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BoM Ver</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deep Components</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                 {matrixParams.map((node) => (
                   <tr key={node._id} className="hover:bg-blue-50/50 transition">
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{node.name}</td>
                     <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">{node.sku}</td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">v{node.version}</td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-bold">{node.activeBomVersion ? `v${node.activeBomVersion}` : '-'}</td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{node.totalComponents} nodes</td>
                   </tr>
                 ))}
                 {matrixParams.length === 0 && (
                   <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">No Active Deployments synchronized currently.</td></tr>
                 )}
               </tbody>
             </table>
          </div>
        )}
      </div>

    </div>
  );
}

const CheckCircle = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>);

export default function DashboardPage() {
  const { user } = useAuthStore();
  const userName = user?.name?.split(' ')[0] || 'User';
  const userRoleLabel = user?.role ? user.role.toLowerCase() : 'user';

  const dateFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayFormatted = dateFormatter.format(new Date());

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back, {userName}</h1>
        <p className="text-slate-400 text-sm mt-1">{todayFormatted}</p>
      </div>

      {user?.role === 'ADMIN' && <AdminDashboard user={user} />}
      {user?.role === 'ENGINEER' && <EngineerDashboard user={user} />}
      {user?.role === 'APPROVER' && <ApproverDashboard user={user} />}
      {user?.role === 'OPERATIONS' && <OperationsDashboard />}
    </div>
  );
}
