import React from 'react';
import { useGetBomDiff } from '../../hooks/useBom';
import { Loader2, ArrowRight } from 'lucide-react';

function DiffRow({ change }) {
  const { fieldPath, oldValue, newValue, changeType } = change;

  let bgColor = 'bg-white';
  let borderLeft = 'border-l-4 border-transparent';
  
  if (changeType === 'ADDED') {
    bgColor = 'bg-emerald-50';
    borderLeft = 'border-l-4 border-emerald-500';
  } else if (changeType === 'REMOVED') {
    bgColor = 'bg-red-50';
    borderLeft = 'border-l-4 border-red-500';
  } else if (changeType === 'UPDATED') {
    bgColor = 'bg-amber-50';
    borderLeft = 'border-l-4 border-amber-400';
  }

  return (
    <tr className={`${bgColor} border-b border-gray-100`}>
      <td className={`px-4 py-3 text-sm font-mono text-gray-600 ${borderLeft}`}>
        {fieldPath}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {changeType}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {changeType === 'UPDATED' ? (
          <div className="flex items-center space-x-2">
            <span className="line-through text-slate-400">{JSON.stringify(oldValue)}</span>
            <ArrowRight size={14} className="text-slate-400" />
            <span className="text-slate-900 font-semibold">{JSON.stringify(newValue)}</span>
          </div>
        ) : changeType === 'ADDED' ? (
          <span className="text-green-600 font-medium">{JSON.stringify(newValue)}</span>
        ) : (
          <span className="line-through text-red-500">{JSON.stringify(oldValue)}</span>
        )}
      </td>
    </tr>
  );
}

function BomDiffViewer({ bomId, compareId }) {
  const { data: resp, isLoading } = useGetBomDiff(bomId, compareId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin h-6 w-6 text-blue-500 mr-3" />
        <span className="text-sm text-gray-500">Computing object diffs...</span>
      </div>
    );
  }

  const diffs = resp?.data || [];

  if (diffs.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center border border-gray-200">
        <p className="text-sm text-gray-500 font-medium">No structural changes detected between these versions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-4 mb-4 bg-white p-3 rounded-md shadow-sm border border-gray-200 text-xs">
        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span> Added</div>
        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span> Removed</div>
        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-amber-400 mr-2"></span> Updated</div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field Path</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change Type</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value Mutation</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {diffs.map((change, idx) => (
              <DiffRow key={`${change.fieldPath}-${idx}`} change={change} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BomDiffViewer;
