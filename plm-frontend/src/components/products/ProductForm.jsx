import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { X, Loader2, Info, ArrowRight } from 'lucide-react';
import { useGetProduct, useCreateProduct, useUpdateProduct } from '../../hooks/useProducts';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  salePrice: z.coerce.number().min(0, 'Must be positive'),
  costPrice: z.coerce.number().min(0, 'Must be positive'),
  attachmentsText: z.string().optional(),
});

function ProductForm({ productId, onClose }) {
  const isEditing = !!productId;

  const { data: productResp, isLoading: isLoadingProduct } = useGetProduct(productId);
  const navigate = useNavigate();
  const product = productResp?.data;

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const isReadOnly = isEditing && product && ['ACTIVE', 'ARCHIVED'].includes(product.status);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      salePrice: 0,
      costPrice: 0,
      attachmentsText: '',
    },
  });

  useEffect(() => {
    if (product && isEditing) {
      reset({
        name: product.name || '',
        description: product.description || '',
        salePrice: product.salePrice || 0,
        costPrice: product.costPrice || 0,
        attachmentsText: (product.attachments || []).map((item) => item.url).join('\n'),
      });
    }
  }, [product, isEditing, reset]);

  const onSubmit = async (data) => {
    if (isReadOnly) return;
    try {
      const attachments = (data.attachmentsText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((url) => ({
          url,
          fileName: url.split('/').pop() || 'attachment',
        }));

      const payload = {
        name: data.name,
        description: data.description,
        salePrice: data.salePrice,
        costPrice: data.costPrice,
        attachments,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ id: productId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-md transform transition ease-in-out duration-500 translate-x-0">
          <div className="h-full flex flex-col bg-white shadow-2xl overflow-y-scroll">
            
            {/* Header */}
            <div className="py-6 px-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between sm:px-6">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {isEditing ? (isReadOnly ? 'View Product' : 'Edit Product') : 'New Product'}
              </h2>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-500 focus:outline-none transition-colors"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            {/* Loading State for Edit */}
            {isEditing && isLoadingProduct ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 sm:px-6 space-y-6 flex-1 flex flex-col bg-linear-to-b from-white to-slate-50">
                
                {/* Read-Only Banner */}
                {isReadOnly && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md shadow-sm">
                    <div className="flex">
                      <div className="shrink-0">
                        <Info className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-bold text-amber-800">
                          This product is currently {product.status}.
                        </p>
                        <p className="mt-1 text-sm text-amber-700">
                          To make changes or modify specifications, an Engineering Change Order (ECO) is required.
                        </p>
                        <p className="mt-3">
                          <button
                            onClick={() => navigate(`/eco/new?productId=${product._id}`)}
                            className="flex items-center text-sm font-semibold text-amber-900 border border-amber-300 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md transition-colors"
                          >
                            Create ECO
                            <ArrowRight size={16} className="ml-1.5" />
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fields */}
                <div className="space-y-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  
                  {isEditing && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">SKU</label>
                      <p className="text-sm text-slate-900 font-mono tracking-tight bg-slate-50 p-2 rounded-md border border-slate-200">
                        {product?.sku}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
                    <div>
                      {isReadOnly ? (
                        <p className="text-sm text-slate-900 border-b border-transparent py-2 font-medium">{product?.name}</p>
                      ) : (
                        <input
                          type="text"
                          {...register('name')}
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md transition-shadow"
                        />
                      )}
                      {errors.name && <p className="mt-1 text-sm font-medium text-red-600">{errors.name.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                    <div>
                      {isReadOnly ? (
                        <p className="text-sm text-slate-900 py-2">{product?.description || '—'}</p>
                      ) : (
                        <textarea
                          rows={3}
                          {...register('description')}
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-slate-300 rounded-md transition-shadow"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Sale Price ($)</label>
                      <div>
                        {isReadOnly ? (
                          <p className="text-sm text-slate-900 py-2 font-mono">${product?.salePrice?.toFixed(2)}</p>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            {...register('salePrice')}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-slate-300 rounded-md transition-shadow"
                          />
                        )}
                        {errors.salePrice && <p className="mt-1 text-sm font-medium text-red-600">{errors.salePrice.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Cost Price ($)</label>
                      <div>
                        {isReadOnly ? (
                          <p className="text-sm text-slate-900 py-2 font-mono">${product?.costPrice?.toFixed(2)}</p>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            {...register('costPrice')}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-slate-300 rounded-md transition-shadow"
                          />
                        )}
                        {errors.costPrice && <p className="mt-1 text-sm font-medium text-red-600">{errors.costPrice.message}</p>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Attachments (1 URL/line)</label>
                    <div className="mt-1">
                      {isReadOnly ? (
                        <div className="space-y-1 bg-slate-50 p-3 rounded-md border border-slate-100">
                          {(product?.attachments || []).length === 0 ? (
                            <p className="text-sm text-slate-500 italic">No attachments provided.</p>
                          ) : (
                            (product.attachments || []).map((attachment, idx) => (
                              <p key={idx} className="text-sm text-indigo-600 hover:underline truncate break-all">{attachment.url}</p>
                            ))
                          )}
                        </div>
                      ) : (
                        <textarea
                          rows={4}
                          {...register('attachmentsText')}
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-slate-300 rounded-md transition-shadow"
                          placeholder="https://example.com/spec.pdf"
                        />
                      )}
                    </div>
                  </div>

                </div>

                {/* Footer Controls */}
                {!isReadOnly && (
                  <div className="mt-auto pt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                      className="inline-flex justify-center items-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition-colors"
                    >
                      {isSubmitting || createMutation.isPending || updateMutation.isPending ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Saving...
                        </>
                      ) : (
                        isEditing ? 'Save Changes' : 'Create Product'
                      )}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductForm;
