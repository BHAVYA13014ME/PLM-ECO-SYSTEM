import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardSignature, Clock, CheckCircle, XCircle, ChevronRight, User } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';

const ECOCard = ({ eco }) => {
  const isRejected = eco.status === 'REJECTED';
  const isApproved = eco.status === 'APPROVED';

  return (
    <Link 
      to={`/eco/${eco._id}`}
      className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex flex-col h-full bg-linear-to-b from-white to-slate-50/50"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isApproved ? 'bg-emerald-50' : isRejected ? 'bg-rose-50' : 'bg-slate-50'} group-hover:bg-indigo-50 transition-colors`}>
            <ClipboardSignature size={20} className={`${isApproved ? 'text-emerald-600' : isRejected ? 'text-rose-600' : 'text-slate-500'} group-hover:text-indigo-600`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 line-clamp-1 transition-colors">{eco.title}</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{eco._id}</p>
          </div>
        </div>
        <StatusBadge status={eco.status} />
      </div>

      <div className="flex-1 space-y-3 mb-4">
        <div className="flex items-center text-xs text-slate-500">
          <User size={14} className="mr-1.5 opacity-70" />
          <span className="truncate">Target: <span className="font-semibold text-slate-700">{eco.targetProductId?.name || 'Unknown'}</span></span>
        </div>
        <div className="flex items-center text-xs text-slate-500">
          <Clock size={14} className="mr-1.5 opacity-70" />
          <span>Stage: <span className="font-semibold text-slate-700">{eco.stage?.name || 'Draft'}</span></span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
        <div className="flex -space-x-1.5 overflow-hidden">
          <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
             {eco.createdBy?.name?.charAt(0) || 'U'}
          </div>
        </div>
        <div className="flex items-center text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
          Details
          <ChevronRight size={14} className="ml-1" />
        </div>
      </div>
    </Link>
  );
};

export default ECOCard;
