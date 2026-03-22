import React, { useState, useEffect } from 'react';
import { useGetProducts, useDeleteProduct, useActivateProduct } from '../hooks/useProducts';
import { useAuthStore } from '../store/authStore';
import { canEdit, canDelete, canActivateProduct } from '../utils/roleGuard';
import StatusBadge from '../components/shared/StatusBadge';
import { Eye, Edit, Trash2, Plus, Search } from 'lucide-react';
import ProductForm from '../components/products/ProductForm';
import ProductDetailDrawer from '../components/products/ProductDetailDrawer';
import toast from 'react-hot-toast';

function ProductsPage() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFormId, setActiveFormId] = useState(null); // null = off, 'new' = create, stringId = edit
  const [activeDetailId, setActiveDetailId] = useState(null);

  const deleteMutation = useDeleteProduct();
  const activateMutation = useActivateProduct();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: resp, isLoading } = useGetProducts({
    search: debouncedSearch,
    limit: 200,
  });

  const products = resp?.data?.products || [];
  
  const columns = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
  const groupedProducts = columns.reduce((acc, status) => {
    acc[status] = products.filter(e => e.status === status) || [];
    return acc;
  }, {});

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to soft-delete this product?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleActivate = async (id) => {
    if (window.confirm('Are you sure you want to manually activate this product? This bypasses standard ECO workflows.')) {
      await activateMutation.mutateAsync(id);
    }
  };

  const showNewButton = ['ADMIN', 'ENGINEER'].includes(user?.role);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products <span className="text-sm font-normal text-slate-500 ml-2">({resp?.data?.total || 0} total)</span></h1>
        </div>
        
        {showNewButton && (
          <button
            onClick={() => setActiveFormId('new')}
            className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            <Plus className="mr-2 h-4 w-4" /> New Product
          </button>
        )}
      </div>

      {/* Filters (Search & Segmented Control) */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:max-w-xs xl:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
      </div>

      {/* Kanban Board View */}
      <div className="relative flex-1 -mx-6 px-6 overflow-x-auto">
        <div className="flex gap-6 min-w-max pb-4 h-full items-start">
          {columns.map(status => {
            if (user?.role === 'OPERATIONS' && (status === 'DRAFT' || status === 'ARCHIVED')) return null;

            const colProducts = groupedProducts[status];
            
            return (
              <div key={status} className="w-80 flex flex-col bg-slate-100/50 rounded-xl p-4 border border-slate-200/60 shadow-sm min-h-[calc(100vh-280px)]">
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">
                    {status}
                  </h3>
                  <span className="bg-white text-slate-500 text-xs font-bold px-2 py-0.5 rounded shadow-sm border border-slate-200">
                    {colProducts.length}
                  </span>
                </div>
                <div className="flex flex-col gap-4 flex-1">
                  {isLoading ? (
                    <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div></div>
                  ) : colProducts.length === 0 ? (
                     <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center p-6 text-center text-sm font-medium text-slate-400">
                      No products
                    </div>
                  ) : (
                    colProducts.map(p => (
                      <div key={p._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all group">
                         <div className="flex justify-between items-start mb-2">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold font-mono rounded inline-block">{p.sku}</span>
                            <span className="text-xs font-bold text-slate-400">v{p.version}</span>
                         </div>
                         <h4 className="text-sm font-bold text-slate-900 mb-1">{p.name}</h4>
                         <div className="flex items-center text-xs text-slate-500 font-medium font-mono mb-4">
                            <span className="mr-3">Sale: ${p.salePrice?.toLocaleString()}</span>
                            <span>Cost: ${p.costPrice?.toLocaleString()}</span>
                         </div>
                         <div className="flex items-center justify-end space-x-2 border-t border-slate-100 pt-3 opacity-80 group-hover:opacity-100">
                           <button onClick={() => setActiveDetailId(p._id)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-md transition-colors" title="View details">
                             <Eye className="w-4 h-4" />
                           </button>
                           {canEdit(user, p) && (
                             <button onClick={() => setActiveFormId(p._id)} className="p-1.5 text-slate-400 hover:text-amber-600 bg-white hover:bg-amber-50 rounded-md transition-colors" title="Edit">
                               <Edit className="w-4 h-4" />
                             </button>
                           )}
                           {canActivateProduct(user, p) && (
                             <button onClick={() => handleActivate(p._id)} disabled={activateMutation.isPending} className="px-2 py-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold rounded-md transition-colors uppercase disabled:opacity-50" title="Bypass ECO to activate">
                               Activate
                             </button>
                           )}
                           {canDelete(user, p) && (
                             <button onClick={() => handleDelete(p._id)} disabled={deleteMutation.isPending} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-md transition-colors disabled:opacity-50" title="Delete">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           )}
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeFormId && (
        <ProductForm 
          productId={activeFormId === 'new' ? null : activeFormId} 
          onClose={() => setActiveFormId(null)} 
        />
      )}

      {activeDetailId && (
        <ProductDetailDrawer
          productId={activeDetailId}
          onClose={() => setActiveDetailId(null)}
        />
      )}

    </div>
  );
}

export default ProductsPage;

const Package = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>);
