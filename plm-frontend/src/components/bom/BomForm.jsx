import React, { useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { X, Loader2, Info, Plus, Trash2 } from 'lucide-react';
import { useGetBom, useCreateBom, useUpdateBom } from '../../hooks/useBom';
import { useGetProducts } from '../../hooks/useProducts';

const bomSchema = z.object({
  productId: z.string().min(1, 'Target Product is required'),
  components: z.array(z.object({
    componentProductId: z.string().min(1, 'Component Product is required'),
    quantity: z.coerce.number().min(0.0001, 'Qty must be > 0'),
  })).min(1, 'At least one component is required in a BoM'),
  operations: z.array(z.object({
    name: z.string().min(1, 'Operation name is required'),
    duration: z.coerce.number().min(0, 'Duration must be >= 0'),
    workCenter: z.string().min(1, 'Work Center is required'),
  })).optional(),
});

function BomForm({ bomId, onClose }) {
  const isEditing = !!bomId;

  // Products filter for dropdown: only ACTIVE products can have BoMs generally
  const { data: productsResp } = useGetProducts({ status: 'ACTIVE', limit: 100 });
  const activeProducts = productsResp?.data?.products || [];

  const { data: bomResp, isLoading: isLoadingBom } = useGetBom(bomId);
  const bom = bomResp?.data;

  const createMutation = useCreateBom();
  const updateMutation = useUpdateBom();

  const isReadOnly = isEditing && bom && ['ACTIVE', 'ARCHIVED'].includes(bom.status);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(bomSchema),
    defaultValues: {
      productId: '',
      components: [{ componentProductId: '', quantity: 1 }],
      operations: [],
    },
  });

  const { fields: compFields, append: appendComp, remove: removeComp } = useFieldArray({
    control,
    name: "components"
  });

  const { fields: opFields, append: appendOp, remove: removeOp } = useFieldArray({
    control,
    name: "operations"
  });

  useEffect(() => {
    if (bom && isEditing) {
      reset({
        productId: typeof bom.productId === 'object' ? bom.productId._id : bom.productId,
        components: bom.components?.length > 0
          ? bom.components.map((item) => ({
              componentProductId:
                typeof item.componentProductId === 'object'
                  ? item.componentProductId?._id
                  : item.componentProductId,
              quantity: item.quantity,
            }))
          : [],
        operations: bom.operations?.length > 0 ? bom.operations : [],
      });
    }
  }, [bom, isEditing, reset]);

  const onSubmit = async (data) => {
    if (isReadOnly) return;
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: bomId, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-25 transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-2xl transform transition ease-in-out duration-500 translate-x-0">
          <div className="h-full flex flex-col bg-white shadow-2xl overflow-y-scroll">
            
            <div className="py-6 px-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between sm:px-6 sticky top-0 z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing ? (isReadOnly ? 'View Bill of Materials' : 'Edit Bill of Materials') : 'New Bill of Materials'}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none bg-white p-1 rounded-full shadow-sm">
                <X size={24} />
              </button>
            </div>

            {isEditing && isLoadingBom ? (
              <div className="flex justify-center flex-1 items-center">
                <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 sm:px-6 space-y-8 flex-1 flex flex-col">
                
                {isReadOnly && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
                    <div className="flex">
                      <Info className="h-5 w-5 text-blue-400 shrink-0" />
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          This BoM is {bom.status}. To make changes, create an Engineering Change Order.
                        </p>
                        <p className="mt-2">
                          <Link to={`/eco?bomId=${bomId}`} className="text-sm font-medium text-blue-700 underline hover:text-blue-600" onClick={onClose}>
                            Create ECO for this BoM &rarr;
                          </Link>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Target Product Selection */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Product *</label>
                  {isReadOnly ? (
                    <p className="text-sm text-gray-900 font-medium">{bom?.productId?.name} <span className="text-gray-500 text-xs">({bom?.productId?.sku})</span></p>
                  ) : (
                    <select
                      {...register('productId')}
                      disabled={isEditing}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">Select a product...</option>
                      {activeProducts.map(p => (
                        <option key={p._id} value={p._id}>{p.name} (v{p.version})</option>
                      ))}
                    </select>
                  )}
                  {errors.productId && <p className="mt-1 text-sm text-red-600">{errors.productId.message}</p>}
                  {errors.components?.root && <p className="mt-2 text-sm text-red-600 font-medium bg-red-50 p-2 rounded">{errors.components.root.message}</p>}
                </div>

                {/* Components List */}
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Components List</h3>
                    {!isReadOnly && (
                      <button type="button" onClick={() => appendComp({ componentProductId: '', quantity: 1 })} className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium">
                        <Plus size={16} className="mr-1" /> Add Component
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {compFields.map((field, index) => (
                      <div key={field.id} className="relative flex items-center space-x-3 bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                        <div className="flex-1 grid grid-cols-12 gap-3">
                          <div className="col-span-12 sm:col-span-8">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Component Product</label>
                            {isReadOnly ? (
                              <p className="text-sm py-1 font-medium text-gray-900">
                                {bom?.components?.[index]?.componentProductId?.name || 'Unknown Product'}
                              </p>
                            ) : (
                              <select
                                {...register(`components.${index}.componentProductId`)}
                                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select component product...</option>
                                {activeProducts
                                  .filter((p) => p._id !== (isEditing ? bom?.productId?._id || bom?.productId : undefined))
                                  .map((p) => (
                                    <option key={p._id} value={p._id}>
                                      {p.name} ({p.sku})
                                    </option>
                                  ))}
                              </select>
                            )}
                            {errors.components?.[index]?.componentProductId && <p className="mt-1 text-xs text-red-500">{errors.components[index].componentProductId.message}</p>}
                          </div>
                          <div className="col-span-12 sm:col-span-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                            {isReadOnly ? <p className="text-sm py-1 font-mono">{field.quantity}</p> : <input type="number" step="0.01" {...register(`components.${index}.quantity`)} className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono" />}
                            {errors.components?.[index]?.quantity && <p className="mt-1 text-xs text-red-500">{errors.components[index].quantity.message}</p>}
                          </div>
                        </div>
                        {!isReadOnly && (
                          <button type="button" onClick={() => removeComp(index)} className="text-red-400 hover:text-red-600 p-2 ml-2 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                    {compFields.length === 0 && <p className="text-sm text-gray-500 py-4 text-center border-2 border-dashed border-gray-200 rounded-lg">No components added yet.</p>}
                  </div>

                </div>

                {/* Operations List */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Routing Operations</h3>
                    {!isReadOnly && (
                      <button type="button" onClick={() => appendOp({ name: '', duration: 0, workCenter: '' })} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center font-medium">
                        <Plus size={16} className="mr-1" /> Add Operation
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {opFields.map((field, index) => (
                      <div key={field.id} className="relative flex items-center space-x-3 bg-white p-3 border border-gray-200 rounded-lg shadow-sm border-l-4 border-l-indigo-400">
                        <div className="flex-1 grid grid-cols-12 gap-3">
                          <div className="col-span-12 sm:col-span-5">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Operation Step</label>
                            {isReadOnly ? <p className="text-sm py-1 font-medium">{field.name}</p> : <input {...register(`operations.${index}.name`)} placeholder="e.g. Final Assembly" className="block w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />}
                            {errors.operations?.[index]?.name && <p className="mt-1 text-xs text-red-500">{errors.operations[index].name.message}</p>}
                          </div>
                          <div className="col-span-6 sm:col-span-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Work Center</label>
                            {isReadOnly ? <p className="text-sm py-1 flex items-center"><span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-xs font-mono">{field.workCenter}</span></p> : <input {...register(`operations.${index}.workCenter`)} placeholder="e.g. WC-ASM-01" className="block w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-mono" />}
                            {errors.operations?.[index]?.workCenter && <p className="mt-1 text-xs text-red-500">{errors.operations[index].workCenter.message}</p>}
                          </div>
                          <div className="col-span-6 sm:col-span-3">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Duration (mins)</label>
                            {isReadOnly ? <p className="text-sm py-1 font-mono">{field.duration}m</p> : <input type="number" step="1" {...register(`operations.${index}.duration`)} className="block w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-mono" />}
                          </div>
                        </div>
                        {!isReadOnly && (
                          <button type="button" onClick={() => removeOp(index)} className="text-red-400 hover:text-red-600 p-2 ml-2 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                    {opFields.length === 0 && <p className="text-sm text-gray-400 py-3 text-center">No routing operations defined.</p>}
                  </div>
                </div>

                {/* Footer Controls */}
                {!isReadOnly && (
                  <div className="mt-auto pt-8 flex justify-end space-x-3 pb-8">
                    <button type="button" onClick={onClose} className="bg-white py-2.5 px-5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending} className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors">
                      {isSubmitting || createMutation.isPending || updateMutation.isPending ? (
                        <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Saving...</>
                      ) : (
                        isEditing ? 'Save BoM Draft' : 'Create BoM Matrix'
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

export default BomForm;
