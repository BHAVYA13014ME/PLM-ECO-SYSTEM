import React from 'react';

function SkeletonRow({ cols = 5 }) {
  return (
    <tr className="animate-pulse">
      {Array(cols)
        .fill(null)
        .map((_, i) => (
          <td key={i} className="px-4 py-3">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
          </td>
        ))}
    </tr>
  );
}

function SkeletonLoader({ rows = 5, cols = 5 }) {
  return (
    <>
      {Array(rows)
        .fill(null)
        .map((_, i) => (
          <SkeletonRow key={i} cols={cols} />
        ))}
    </>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <div className="h-4 bg-slate-200 rounded w-1/3" />
      <div className="h-3 bg-slate-200 rounded w-2/3" />
      <div className="h-3 bg-slate-200 rounded w-1/2" />
    </div>
  );
}

export { SkeletonLoader, SkeletonRow, SkeletonCard };
export default SkeletonLoader;
