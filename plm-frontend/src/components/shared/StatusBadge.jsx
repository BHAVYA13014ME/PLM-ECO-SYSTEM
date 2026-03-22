import React from 'react';

const statusStyles = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  ARCHIVED: 'bg-amber-100 text-amber-700 border-amber-200',
  NEW: 'bg-blue-100 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-700 border-purple-200',
  APPROVED: 'bg-teal-100 text-teal-700 border-teal-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
};

function StatusBadge({ status }) {
  const style = statusStyles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
