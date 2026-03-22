import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGetECO, useAdvanceECO, useRejectECO } from '../hooks/useECO';
import { useGetAuditTrail } from '../hooks/useReports';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settingsApi';
import { useAuthStore } from '../store/authStore';
import { canApprove, canValidate } from '../utils/roleGuard';
import StatusBadge from '../components/shared/StatusBadge';
import { ArrowLeft, Loader2, CheckCircle, XCircle, ChevronRight, Settings, Lock, Clock, User, Filter, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen p-8 bg-slate-50 flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-red-200">
            <div className="flex items-center text-red-600 mb-4">
              <AlertTriangle className="w-10 h-10 mr-4" />
              <h1 className="text-2xl font-bold">Something went wrong.</h1>
            </div>
            <p className="text-slate-700 mb-6 bg-red-50 p-4 rounded-lg font-mono text-sm border border-red-100 overflow-auto">
              {this.state.error?.toString()}
            </p>
            {this.state.errorInfo && (
              <details className="mt-4 text-xs text-slate-500 bg-slate-100 p-4 rounded-lg overflow-auto max-h-64">
                <summary className="cursor-pointer font-bold mb-2">Component Stack Trace</summary>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
            <button onClick={() => window.location.reload()} className="mt-8 bg-slate-900 text-white px-6 py-2 rounded-lg font-bold">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Refined Stepper Component ───
function ExplicitStageStepper({ stages = [], currentStageId, ecoStatus }) {
  const isApproved = ecoStatus === 'APPROVED';
  const isRejected = ecoStatus === 'REJECTED';
  
  const currentIdx = Array.isArray(stages) ? stages.findIndex(s => s._id === currentStageId) : -1;

  return (
    <div className="mt-8 px-2">
      <div className="relative">
        <div className="absolute left-4 top-4 bottom-4 w-px bg-slate-200"></div>
        
        <ul className="space-y-8 relative">
          {(stages || []).map((stg, i) => {
            const isCompleted = isApproved || (currentIdx > i);
            const isCurrent = currentStageId && stg._id === currentStageId && !isApproved && !isRejected;
            
            let circleStyle = 'bg-slate-200 text-slate-500';
            if (isCompleted) circleStyle = 'bg-emerald-500 text-white';
            else if (isCurrent) circleStyle = 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600 font-bold';

            return (
              <li key={stg._id || i} className="relative flex items-center">
                <div className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full text-xs transition-all ring-4 ring-white ${circleStyle}`}>
                  {isCompleted ? <CheckCircle size={16} /> : i + 1}
                </div>
                <div className="ml-4 flex flex-col">
                  <span className={`text-xs font-bold tracking-widest uppercase ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                    {stg.name}
                  </span>
                  {stg.requiresApproval && (
                     <div className="flex items-center text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-tight">
                       <Lock className="w-2.5 h-2.5 mr-1" />
                       Requires Approval
                     </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─── Refined Stage History Component ───
function StageHistoryTimeline({ stageHistory = [] }) {
  const history = Array.isArray(stageHistory) ? [...stageHistory] : [];
  
  return (
    <div className="flow-root mt-4">
      <ul className="space-y-6">
        {history.reverse().map((sh, idx) => {
          const isApprove = sh.action === 'APPROVED';
          const isReject = sh.action === 'REJECTED';
          const isNew = sh.action === 'CREATED' || sh.action === 'MOVED';

          return (
            <li key={idx} className="flex items-start space-x-4">
              <div className="mt-1">
                <div className={`h-2.5 w-2.5 rounded-full ring-4 ring-white ${isApprove ? 'bg-emerald-500' : isReject ? 'bg-rose-500' : 'bg-indigo-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                    isApprove ? 'bg-emerald-100 text-emerald-700' : 
                    isReject ? 'bg-rose-100 text-rose-700' : 
                    'bg-indigo-100 text-indigo-700'
                  }`}>
                    {sh.action === 'VALIDATED' ? 'In Progress' : isNew ? 'New' : sh.action}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{sh.stageName || 'NEW'}</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  By <span className="text-slate-700 font-bold">{sh.enteredBy?.name || sh.enteredBy?.email || 'admin@plm.com'}</span> on {sh.enteredAt ? new Date(sh.enteredAt).toLocaleString() : 'N/A'}
                </p>
                {sh.comments && (
                  <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                    "{sh.comments}"
                  </p>
                )}
              </div>
            </li>
          );
        })}
        {history.length === 0 && <p className="text-sm text-slate-400 italic py-10 text-center">No stage history recorded yet.</p>}
      </ul>
    </div>
  );
}

// ─── Refined Audit Trail Table ───
function AuditTrailTable({ entityId }) {
  const { data: resp, isLoading } = useGetAuditTrail({ entityId, limit: 10 });
  const logs = resp?.data?.logs || [];

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
        <thead className="bg-[#fcfdfd]">
          <tr>
            <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[9px]">Timestamp</th>
            <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[9px]">Action</th>
            <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[9px]">By</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {(logs || []).map((log) => (
            <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold text-[9px] uppercase tracking-wider">
                  {log.action || log.actionType}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-bold">
                {log.performedBy?.name || log.performedBy?.email || 'System'}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
             <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No audit records found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ECODetailPageInner() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('proposed');

  const { data: ecoResp, isLoading: isLoadingEco } = useGetECO(id);
  const eco = ecoResp?.data;

  const advanceMutation = useAdvanceECO();
  const rejectMutation = useRejectECO();

  const { data: stagesResp } = useQuery({
    queryKey: ['settings-stages'],
    queryFn: () => settingsApi.getStages(),
  });
  const allStages = stagesResp?.data || [];

  if (isLoadingEco) return (
    <div className="min-h-screen flex justify-center items-center bg-slate-50">
      <Loader2 className="animate-spin h-10 w-10 text-indigo-600" />
    </div>
  );

  if (!eco) return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white p-10 space-y-4">
      <Settings className="w-12 h-12 text-slate-200" />
      <h2 className="text-xl font-bold text-slate-800">ECO Not Found</h2>
      <Link to="/eco" className="text-indigo-600 font-bold text-sm hover:underline flex items-center">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to ECO List
      </Link>
    </div>
  );

  const currentStage = eco.stage;
  const isApproved = eco.status === 'APPROVED';
  const isRejected = eco.status === 'REJECTED';
  const canValid = canValidate(user, currentStage);
  const canApprv = canApprove(user, currentStage);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Header */}
      <div className="px-6 pt-4 pb-2 border-b border-slate-200 bg-white shadow-sm z-10">
        <div className="flex items-center">
            <Link to="/eco" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition mr-3">
            <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xl font-bold text-slate-900 tracking-tight">{eco._id}</span>
        </div>
        <div className="text-sm font-medium text-slate-400 pl-[44px]">Engineering Change Orders / {eco._id}</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[350px] bg-white border-r border-slate-200 flex flex-col p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col items-start">
             <h1 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">{eco.title || 'Untitled ECO'}</h1>
             <div className="flex space-x-2 mb-8">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 uppercase tracking-widest">{eco.ecoType}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 uppercase tracking-widest">{eco.status}</span>
             </div>

             <div className="w-full space-y-4">
               {[
                 { label: 'PRODUCT', value: eco.targetProductId?.name || (typeof eco.targetProductId === 'string' ? eco.targetProductId : 'Unknown'), color: 'text-indigo-600' },
                 { label: 'TARGET VERSION', value: `v${eco.targetProductId?.version || (typeof eco.targetProductId === 'object' ? eco.targetProductId?.version : '') || '1'}` },
                 { label: 'EFFECTIVE DATE', value: eco.effectiveDate ? new Date(eco.effectiveDate).toLocaleDateString() : 'N/A' },
                 { label: 'CREATED BY', value: eco.createdBy?.name || eco.createdBy?.email || 'System' }
               ].map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold tracking-widest uppercase">{item.label}</span>
                    <span className={`font-bold truncate max-w-[150px] ${item.color || 'text-slate-800'}`}>{item.value}</span>
                 </div>
               ))}
             </div>
          </div>

          <ExplicitStageStepper stages={allStages} currentStageId={currentStage?._id || currentStage} ecoStatus={eco.status} />

          <div className="mt-auto pt-8">
            {isApproved ? (
              <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200 text-center">
                <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-xs font-bold text-emerald-800 tracking-tight">ECO Applied</h3>
                <p className="text-[10px] text-emerald-600 font-medium">Applied on {eco.appliedAt ? new Date(eco.appliedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
              </div>
            ) : isRejected ? (
              <div className="bg-rose-50 rounded-xl p-5 border border-rose-200 text-center text-rose-800 text-xs font-bold">
                 ECO Rejected
              </div>
            ) : (
                <div className="space-y-3">
                    {currentStage?.requiresApproval ? (
                        <>
                        <button disabled={!canApprv || advanceMutation.isPending} onClick={() => advanceMutation.mutate(id)} className={`w-full font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center text-sm ${canApprv ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}>
                            {advanceMutation.isPending ? <Loader2 size={18} className="mr-2 animate-spin" /> : <CheckCircle size={18} className="mr-2" />} 
                            {advanceMutation.isPending ? 'Processing...' : 'Approve ECO'}
                        </button>
                        <button disabled={!canApprv || rejectMutation.isPending} onClick={() => rejectMutation.mutate(id)} className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center text-sm ${canApprv ? 'bg-white border border-rose-200 text-rose-500 hover:bg-rose-50' : 'bg-slate-100 border-none text-slate-400 cursor-not-allowed'}`}>
                            {rejectMutation.isPending ? <Loader2 size={18} className="mr-2 animate-spin" /> : <XCircle size={18} className="mr-2" />} 
                            {rejectMutation.isPending ? 'Processing...' : 'Reject ECO'}
                        </button>
                        {!canApprv && <p className="text-center text-[10px] text-slate-400 uppercase font-bold tracking-widest">Only Approvers can evaluate</p>}
                        </>
                    ) : (
                        <button disabled={!canValid || advanceMutation.isPending} onClick={() => advanceMutation.mutate(id)} className={`w-full ${canValid ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg' : 'bg-slate-100 text-slate-400 cursor-not-allowed'} font-bold py-4 rounded-xl transition-all flex items-center justify-center text-sm`}>
                            {advanceMutation.isPending ? <Loader2 size={18} className="mr-2 animate-spin" /> : null} 
                            {advanceMutation.isPending ? 'Processing...' : 'Validate & Advance'}
                        </button>
                    )}
                </div>
            )}
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col p-10 overflow-hidden">
           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="border-b border-slate-200 px-8">
                  <nav className="flex space-x-10">
                      {['Proposed Changes', 'Stage History', 'Audit Trail'].map((tab) => {
                          const tabId = tab.toLowerCase().split(' ')[0];
                          return (
                              <button key={tabId} onClick={() => setActiveTab(tabId)} className={`py-5 text-xs font-bold tracking-widest uppercase border-b-2 transition-colors ${activeTab === tabId ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                  {tab}
                              </button>
                          );
                      })}
                  </nav>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                  {activeTab === 'proposed' && (
                    <div>
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Change Summary</h2>
                            <div className="flex items-center space-x-6 text-[10px] font-bold tracking-widest uppercase text-slate-400">
                                <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div> Added</span>
                                <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div> Updated</span>
                                <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-rose-500 mr-2"></div> Removed</span>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <table className="min-w-full divide-y divide-slate-100 text-left">
                                <thead className="bg-[#fcfdfd]">
                                    <tr className="divide-x divide-slate-100">
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Field</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Old Value</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Value</th>
                                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {(eco.proposedChanges?.fields || []).map((diff, i) => (
                                        <tr key={i} className="divide-x divide-slate-100 hover:bg-slate-50/30 group">
                                            <td className={`px-8 py-6 text-xs font-bold text-slate-800 border-l-4 ${diff.changeType === 'ADD' ? 'border-emerald-500' : diff.changeType === 'REMOVE' ? 'border-rose-500' : 'border-amber-400'}`}>
                                              {diff.fieldName}
                                            </td>
                                            <td className="px-8 py-6 text-xs font-semibold text-slate-400 truncate max-w-[200px]">
                                              {typeof diff.oldValue === 'object' ? JSON.stringify(diff.oldValue) : String(diff.oldValue ?? '')}
                                            </td>
                                            <td className="px-8 py-6 text-xs font-bold text-slate-900 truncate max-w-[200px]">
                                              {typeof diff.newValue === 'object' ? JSON.stringify(diff.newValue) : String(diff.newValue ?? '')}
                                            </td>
                                            <td className="px-8 py-6">
                                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border italic ${
                                                diff.changeType === 'ADD' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                diff.changeType === 'REMOVE' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                                'bg-amber-50 text-amber-600 border-amber-100'
                                              }`}>
                                                {diff.changeType || 'Update'}
                                              </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!eco.proposedChanges?.fields || eco.proposedChanges.fields.length === 0) && (
                                      <tr><td colSpan="4" className="px-8 py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No field changes specified.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                  )}

                  {activeTab === 'stage' && <StageHistoryTimeline stageHistory={eco.stageHistory} />}
                  {activeTab === 'audit' && <AuditTrailTable entityId={eco._id} />}
              </div>
           </div>
        </div>
      </div>

    </div>
  );
}

function ECODetailPage() {
  return (
    <ErrorBoundary>
      <ECODetailPageInner />
    </ErrorBoundary>
  );
}

export default ECODetailPage;
