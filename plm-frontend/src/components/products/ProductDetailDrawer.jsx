import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { X, Loader2, GitMerge } from 'lucide-react';
import { productApi } from '../../api/productApi';
import { reportApi } from '../../api/reportApi';
import StatusBadge from '../shared/StatusBadge';

function ProductDetailDrawer({ productId, onClose }) {
  const { data: prodResp, isLoading: isLoadingProd } = useQuery({
    queryKey: ['products', productId],
    queryFn: () => productApi.getById(productId),
    enabled: !!productId,
  });

  const { data: histResp, isLoading: isLoadingHist } = useQuery({
    queryKey: ['product-history', productId],
    queryFn: () => reportApi.getProductHistory(productId),
    enabled: !!productId,
  });

  const product = prodResp?.data;
  const history = histResp?.data || [];

  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-25 transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-2xl transform transition ease-in-out duration-500 translate-x-0">
          <div className="h-full flex flex-col bg-white shadow-2xl overflow-y-scroll border-l border-gray-200">
            
            {/* Header */}
            <div className="py-6 px-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between sm:px-6 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-3">
                  <span>Product File</span>
                  {product && <StatusBadge status={product.status} />}
                </h2>
                {product && <p className="text-sm font-mono text-gray-500 mt-1">{product.sku}</p>}
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 bg-white rounded-full p-2 shadow-sm border border-gray-200 outline-none"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            {isLoadingProd || isLoadingHist ? (
              <div className="flex-1 flex justify-center items-center">
                <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
              </div>
            ) : (
              <div className="flex-1 p-6 space-y-8 pb-20">
                
                {/* Product Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-t-4 border-t-blue-500">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Name</p>
                    <p className="mt-1 text-base font-medium text-gray-900">{product.name}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-t-4 border-t-indigo-500">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Current Version</p>
                    <p className="mt-1 text-base font-medium text-gray-900">v{product.version}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-t-4 border-t-emerald-500 col-span-2 sm:col-span-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Sale Price</p>
                    <p className="mt-1 text-lg font-bold text-green-600">${product.salePrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-t-4 border-t-rose-500 col-span-2 sm:col-span-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Cost Price</p>
                    <p className="mt-1 text-lg font-bold text-red-500">${product.costPrice.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Description</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{product.description || 'No description provided.'}</p>
                  </div>
                </div>

                {/* History Matrix */}
                <div className="mt-10">
                  <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center">
                    <GitMerge className="mr-2 h-5 w-5 text-gray-400" />
                    Lifecycle Trace (Versions)
                  </h3>
                  <div className="mt-4 flow-root">
                    <ul className="-mb-8">
                      {history.map((hRecord, index) => (
                        <li key={hRecord.version}>
                          <div className="relative pb-8">
                            {index !== history.length - 1 && (
                              <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            )}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${hRecord.status === 'ARCHIVED' ? 'bg-gray-100' : 'bg-blue-100'}`}>
                                  {hRecord.status !== 'ARCHIVED' ? <div className="h-3 w-3 rounded-full bg-blue-600" /> : <div className="h-2 w-2 rounded-full bg-gray-400" />}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-800 font-medium">
                                    Version {hRecord.version}
                                  </p>
                                  <div className="mt-1 flex items-center space-x-2">
                                    <StatusBadge status={hRecord.status} />
                                    {hRecord.archivedByEcoId ? (
                                      <span className="text-sm text-gray-500">
                                        Applied via <Link to={`/eco/${hRecord.archivedByEcoId._id}`} className="text-blue-600 hover:underline">{hRecord.archivedByEcoId.title}</Link>
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-500">Current active file</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  <time dateTime={hRecord.createdAt}>
                                    {new Date(hRecord.createdAt).toLocaleDateString()}
                                  </time>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailDrawer;
