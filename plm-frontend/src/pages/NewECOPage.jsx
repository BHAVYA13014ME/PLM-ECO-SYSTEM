import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Check, ChevronRight, AlertTriangle, ArrowLeft, ArrowRight, Loader2, Package, List as ListIcon, Trash2, Plus } from 'lucide-react';
import { useGetProducts, useGetProduct } from '../hooks/useProducts';
import { useGetBoms, useGetBom } from '../hooks/useBom';
import { useCreateECO } from '../hooks/useECO';

const step1Schema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['PRODUCT', 'BOM']),
  targetProductId: z.string().min(1, 'Target Product is required'),
  targetBomId: z.string().optional(),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  isVersionUpdate: z.boolean(),
});

function NewECOPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProductId = searchParams.get('productId') || '';
  
  const [step, setStep] = useState(1);
  const [proposedChanges, setProposedChanges] = useState({ fields: [] });
  const createMutation = useCreateECO();

  // Data queries
  const { data: prodResp } = useGetProducts({ status: 'ACTIVE', limit: 100 });
  const activeProducts = prodResp?.data?.products || [];

  const { register, handleSubmit, watch, trigger, setValue, control, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: '',
      type: 'PRODUCT',
      targetProductId: initialProductId,
      targetBomId: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      isVersionUpdate: true,
    },
  });

  const watchType = watch('type');
  const watchProductId = watch('targetProductId');
  const watchTargetBomId = watch('targetBomId');

  const { data: bomsResp } = useGetBoms({ productId: watchProductId, status: 'ACTIVE' });
  const activeBoms = bomsResp?.data?.boms || [];
  
  const { data: targetBomResp } = useGetBom(watchType === 'BOM' && watchTargetBomId ? watchTargetBomId : null, {
    enabled: !!(watchType === 'BOM' && watchTargetBomId)
  });
  const targetBom = targetBomResp?.data;

  const { data: targetProdResp } = useGetProduct(watchProductId, {
    enabled: !!watchProductId
  });
  const targetProduct = targetProdResp?.data;

  // Local state for Step 2
  const [productEdits, setProductEdits] = useState({});
  const [bomEdits, setBomEdits] = useState({ components: [], operations: [] });

  useEffect(() => {
    if (watchType === 'PRODUCT' && targetProduct) {
      setProductEdits({
        name: targetProduct.name,
        description: targetProduct.description,
        salePrice: targetProduct.salePrice,
        costPrice: targetProduct.costPrice,
        attachmentsText: (targetProduct.attachments || []).map((item) => item.url).join('\n'),
      });
      setProposedChanges({ fields: [] });
    }
  }, [targetProduct, watchType]);

  useEffect(() => {
    if (watchType === 'BOM' && targetBom) {
      setBomEdits({
        components: (targetBom.components || []).map((item) => ({
          componentName: item.componentProductId?.name || 'Unknown Product',
          quantity: Number(item.quantity || 0),
          unit: item.unit || 'pcs',
          unitCost: Number(item.unitCost || 0),
        })),
        operations: (targetBom.operations || []).map((item) => ({
          name: item.name,
          duration: Number(item.duration || 0),
          workCenter: item.workCenter || '',
        })),
      });
      setProposedChanges({ fields: [] });
    }
  }, [targetBom, watchType]);

  const handleNextStep1 = async () => {
    const valid = await trigger();
    if (valid) {
      if (watchType === 'BOM' && !watchTargetBomId) {
        toast.error('Please select a Target BoM');
        return;
      }
      setStep(2);
      window.scrollTo(0, 0);
    }
  };

  const handleNextStep2 = () => {
    const newChanges = [];
    if (watchType === 'PRODUCT') {
      ['name', 'description', 'salePrice', 'costPrice'].forEach((key) => {
        let oldVal = targetProduct[key];
        let newVal = productEdits[key];
        
        if (key.includes('Price')) {
          oldVal = Number(oldVal) || 0;
          newVal = Number(newVal) || 0;
        }

        if (oldVal !== newVal) {
          newChanges.push({ fieldName: key, oldValue: oldVal, newValue: newVal, changeType: 'UPDATE' });
        }
      });

      const oldAttachments = (targetProduct.attachments || []).map((item) => item.url);
      const newAttachments = (productEdits.attachmentsText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((url) => ({ fileName: url.split('/').pop() || 'attachment', url }));

      if (JSON.stringify(oldAttachments) !== JSON.stringify(newAttachments.map((item) => item.url))) {
        newChanges.push({
          fieldName: 'attachments',
          oldValue: oldAttachments,
          newValue: newAttachments,
          changeType: 'UPDATE',
        });
      }
    } else {
      // BoM Changes
      (targetBom?.components || []).forEach((component, index) => {
        const oldQty = Number(component.quantity || 0);
        const newQty = Number(bomEdits.components?.[index]?.quantity ?? oldQty);
        
        // Spec shows UNIT COST in screenshot, though maybe not mapped to component. Let's map quantity at least.
        if (oldQty !== newQty) {
          newChanges.push({
            fieldName: `components[${index}].quantity`,
            oldValue: oldQty,
            newValue: newQty,
            changeType: 'UPDATE',
          });
        }
      });

      (targetBom?.operations || []).forEach((operation, index) => {
        const oldDuration = Number(operation.duration || 0);
        const newDuration = Number(bomEdits.operations?.[index]?.duration ?? oldDuration);
        
        if (oldDuration !== newDuration) {
          newChanges.push({
            fieldName: `operations[${index}].duration`,
            oldValue: oldDuration,
            newValue: newDuration,
            changeType: 'UPDATE',
          });
        }
      });
    }

    setProposedChanges({ fields: newChanges });
    setStep(3);
    window.scrollTo(0, 0);
  };

  const onSubmitFinal = async (data) => {
    const resolvedTargetVersion = data.type === 'BOM' ? targetBom?.bomVersion : targetProduct?.version;

    if (!resolvedTargetVersion) {
      toast.error('Unable to resolve target version. Please reselect target entity.');
      return;
    }

    const payload = {
      title: data.title,
      ecoType: data.type,
      targetProductId: data.targetProductId,
      targetVersion: resolvedTargetVersion,
      versionUpdate: data.isVersionUpdate,
      effectiveDate: data.effectiveDate,
      proposedChanges: { fields: proposedChanges.fields },
    };
    
    if (data.type === 'BOM') {
      payload.targetBomId = data.targetBomId;
    }

    try {
      const response = await createMutation.mutateAsync(payload);
      toast.success('ECO created successfully');
      navigate(`/eco/${response.data._id}`);
    } catch (e) {
      console.error('Failed to create ECO:', e);
    }
  };

  // Render Helpers
  const renderStepIcon = (stepNum) => {
    if (step > stepNum) {
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
          <Check size={16} strokeWidth={3} />
        </div>
      );
    }
    if (step === stepNum) {
      return (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-[0_0_0_4px_rgba(79,70,229,0.1)]">
          {stepNum}
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold text-sm shrink-0">
        {stepNum}
      </div>
    );
  };

  const stepLabels = ['Basic Info', 'Propose Changes', 'Review & Submit'];

  return (
    <div className="min-h-screen bg-white">
      {/* Header aligned with screenshots */}
      <div className="px-8 py-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">New ECO</h1>
        <div className="text-sm text-slate-500 mt-1 flex items-center">
          <span className="cursor-pointer hover:text-indigo-600" onClick={() => navigate('/eco')}>Engineering Change Orders</span>
          <span className="mx-2">/</span>
          <span className="text-slate-900">New ECO</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        
        {/* Stepper */}
        <div className="mb-12 flex items-center justify-center">
          <div className="flex items-center space-x-4 max-w-3xl w-full">
            {stepLabels.map((label, idx) => {
              const stepNum = idx + 1;
              const isActive = step === stepNum;
              const isPast = step > stepNum;
              
              return (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center">
                    {renderStepIcon(stepNum)}
                    <span className={`mt-2 text-sm font-medium ${isActive ? 'text-indigo-600' : isPast ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                  {stepNum < 3 && (
                    <div className={`flex-1 h-[2px] mb-6 ${isPast ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="bg-white">
          {step === 1 && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-8 shadow-sm">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm text-amber-800 font-semibold tracking-wide">
                      Proposing Changes — Not Direct Editing
                    </h3>
                    <p className="text-sm text-amber-700 mt-1">
                      You are proposing changes via an ECO. The product will NOT change until this ECO is fully reviewed and approved through the workflow.
                    </p>
                  </div>
                </div>
              </div>

              <form className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ECO Title <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    {...register('title')} 
                    className={`block w-full rounded-md border ${errors.title ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'} sm:text-sm py-2 px-3 shadow-sm`} 
                    placeholder="Describe the proposed change" 
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Change Type <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`cursor-pointer rounded-lg border-2 p-4 flex items-start transition-colors ${watchType === 'PRODUCT' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300'}`}
                      onClick={() => setValue('type', 'PRODUCT', { shouldValidate: true })}
                    >
                      <Package className={`h-5 w-5 mt-0.5 ${watchType === 'PRODUCT' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${watchType === 'PRODUCT' ? 'text-indigo-900' : 'text-slate-900'}`}>Product Change</p>
                        <p className={`text-xs mt-1 ${watchType === 'PRODUCT' ? 'text-indigo-700' : 'text-slate-500'}`}>Modify product fields</p>
                      </div>
                    </div>

                    <div 
                      className={`cursor-pointer rounded-lg border-2 p-4 flex items-start transition-colors ${watchType === 'BOM' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300'}`}
                      onClick={() => setValue('type', 'BOM', { shouldValidate: true })}
                    >
                      <ListIcon className={`h-5 w-5 mt-0.5 ${watchType === 'BOM' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${watchType === 'BOM' ? 'text-indigo-900' : 'text-slate-900'}`}>BoM Change</p>
                        <p className={`text-xs mt-1 ${watchType === 'BOM' ? 'text-indigo-700' : 'text-slate-500'}`}>Modify components or operations</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Product <span className="text-red-500">*</span></label>
                  <select 
                    {...register('targetProductId')} 
                    onChange={(e) => { 
                      setValue('targetProductId', e.target.value, { shouldValidate: true }); 
                      setValue('targetBomId', ''); 
                    }} 
                    className={`block w-full rounded-md border ${errors.targetProductId ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'} sm:text-sm py-2 px-3 shadow-sm`}
                  >
                    <option value="">Select an active product</option>
                    {activeProducts.map(p => <option key={p._id} value={p._id}>{p.name} — {p.sku} (v{p.version})</option>)}
                  </select>
                  {errors.targetProductId && <p className="mt-1 text-sm text-red-600">{errors.targetProductId.message}</p>}
                </div>

                {watchType === 'BOM' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target BoM <span className="text-red-500">*</span></label>
                    <select 
                      {...register('targetBomId')} 
                      className={`block w-full rounded-md border border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 shadow-sm`}
                    >
                      <option value="">Select an active BoM...</option>
                      {activeBoms.map(b => <option key={b._id} value={b._id}>BoM v{b.bomVersion} — {b.components?.length || 0} components</option>)}
                    </select>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-6 flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Create New Version</label>
                    <p className="text-xs text-slate-500 mt-0.5">When applied, increment the version number</p>
                  </div>
                  <Controller
                    control={control}
                    name="isVersionUpdate"
                    render={({ field }) => (
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${field.value ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        role="switch"
                        aria-checked={field.value}
                      >
                        <span className="sr-only">Create New Version</span>
                        <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${field.value ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Effective Date</label>
                  <input 
                    type="date" 
                    {...register('effectiveDate')} 
                    className="block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3" 
                  />
                </div>
              </form>

              <div className="mt-10 flex justify-end">
                <button 
                  onClick={handleNextStep1}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-colors"
                >
                  Next: Propose Changes
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               
               {watchType === 'PRODUCT' && targetProduct ? (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                     <h3 className="font-semibold text-slate-800">Product Metadata Changes</h3>
                     <span className="text-sm text-slate-500">Target: {targetProduct.name} (v{targetProduct.version})</span>
                   </div>
                   
                   <div className="p-6 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Name</label>
                         <p className="text-sm text-slate-700 py-2 px-3 bg-slate-50 rounded border border-slate-200">{targetProduct.name}</p>
                       </div>
                       <div>
                         <label className="block text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Proposed Name</label>
                         <input type="text" value={productEdits.name} onChange={(e) => setProductEdits({...productEdits, name: e.target.value})} className="block w-full text-sm border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 shadow-sm" />
                       </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Sale Price</label>
                         <p className="text-sm text-slate-700 py-2 px-3 bg-slate-50 rounded border border-slate-200 font-mono">${targetProduct.salePrice}</p>
                       </div>
                       <div>
                         <label className="block text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Proposed Sale Price</label>
                         <input type="number" step="0.01" value={productEdits.salePrice} onChange={(e) => setProductEdits({...productEdits, salePrice: e.target.value})} className="block w-full text-sm border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 shadow-sm font-mono" />
                       </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Cost Price</label>
                         <p className="text-sm text-slate-700 py-2 px-3 bg-slate-50 rounded border border-slate-200 font-mono">${targetProduct.costPrice}</p>
                       </div>
                       <div>
                         <label className="block text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Proposed Cost Price</label>
                         <input type="number" step="0.01" value={productEdits.costPrice} onChange={(e) => setProductEdits({...productEdits, costPrice: e.target.value})} className="block w-full text-sm border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 shadow-sm font-mono" />
                       </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Description</label>
                         <p className="text-sm text-slate-700 py-2 px-3 bg-slate-50 rounded border border-slate-200 min-h-[5rem]">{targetProduct.description || 'N/A'}</p>
                       </div>
                       <div>
                         <label className="block text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Proposed Description</label>
                         <textarea rows="3" value={productEdits.description} onChange={(e) => setProductEdits({...productEdits, description: e.target.value})} className="block w-full text-sm border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 shadow-sm" />
                       </div>
                     </div>
                   </div>
                 </div>
               ) : watchType === 'BOM' && targetBom ? (
                 <div className="space-y-8">
                   
                   {/* Components Section */}
                   <div>
                     <div className="flex justify-between items-center mb-4">
                       <h3 className="text-lg font-semibold text-slate-800">Components</h3>
                       <button 
                         onClick={() => setBomEdits(prev => ({ ...prev, components: [...prev.components, { componentName: '', quantity: 1, unit: 'pcs', unitCost: 0 }] }))}
                         className="text-sm font-medium text-indigo-600 flex items-center hover:text-indigo-800"
                       >
                         <Plus size={16} className="mr-1" /> Add New Component
                       </button>
                     </div>
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                       <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                         <div className="col-span-4">Part Name</div>
                         <div className="col-span-2">Qty</div>
                         <div className="col-span-2">Unit</div>
                         <div className="col-span-3">Unit Cost</div>
                         <div className="col-span-1 text-center"></div>
                       </div>
                       
                       <div className="divide-y divide-slate-100">
                         {bomEdits.components.map((comp, idx) => (
                           <div key={`comp-${idx}`} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                             <div className="col-span-4">
                               <input type="text" value={comp.componentName} onChange={(e) => {
                                 const newComps = [...bomEdits.components];
                                 newComps[idx].componentName = e.target.value;
                                 setBomEdits({ ...bomEdits, components: newComps });
                               }} className="block w-full text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 shadow-sm" placeholder="Search product..." />
                             </div>
                             <div className="col-span-2">
                               <input type="number" value={comp.quantity} onChange={(e) => {
                                 const newComps = [...bomEdits.components];
                                 newComps[idx].quantity = e.target.value;
                                 setBomEdits({ ...bomEdits, components: newComps });
                               }} className="block w-full text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 shadow-sm" />
                             </div>
                             <div className="col-span-2">
                               <input type="text" value={comp.unit} onChange={(e) => {
                                 const newComps = [...bomEdits.components];
                                 newComps[idx].unit = e.target.value;
                                 setBomEdits({ ...bomEdits, components: newComps });
                               }} className="block w-full text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 shadow-sm" />
                             </div>
                             <div className="col-span-3">
                               <input type="number" value={comp.unitCost} onChange={(e) => {
                                 const newComps = [...bomEdits.components];
                                 newComps[idx].unitCost = e.target.value;
                                 setBomEdits({ ...bomEdits, components: newComps });
                               }} className="block w-full text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 shadow-sm" />
                             </div>
                             <div className="col-span-1 flex justify-center">
                               <button 
                                 onClick={() => {
                                   const newComps = [...bomEdits.components];
                                   newComps.splice(idx, 1);
                                   setBomEdits({ ...bomEdits, components: newComps });
                                 }}
                                 className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                               >
                                 <Trash2 size={18} />
                               </button>
                             </div>
                           </div>
                         ))}
                         {bomEdits.components.length === 0 && (
                           <div className="p-8 text-center text-slate-500 text-sm">No components added.</div>
                         )}
                       </div>
                     </div>
                   </div>

                   {/* Operations Section */}
                   <div>
                     <div className="flex justify-between items-center mb-4">
                       <h3 className="text-lg font-semibold text-slate-800">Operations</h3>
                       <button 
                         onClick={() => setBomEdits(prev => ({ ...prev, operations: [...prev.operations, { name: '', duration: 0, workCenter: '' }] }))}
                         className="text-sm font-medium text-indigo-600 flex items-center hover:text-indigo-800"
                       >
                         <Plus size={16} className="mr-1" /> Add Operation
                       </button>
                     </div>
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                       <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                         <div className="col-span-5">Operation</div>
                         <div className="col-span-3">Duration (min)</div>
                         <div className="col-span-3">Work Center</div>
                         <div className="col-span-1 text-center"></div>
                       </div>
                       
                       <div className="divide-y divide-slate-100">
                         {bomEdits.operations.map((op, idx) => (
                           <div key={`op-${idx}`} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                             <div className="col-span-5">
                               <input type="text" value={op.name} onChange={(e) => {
                                 const newOps = [...bomEdits.operations];
                                 newOps[idx].name = e.target.value;
                                 setBomEdits({ ...bomEdits, operations: newOps });
                               }} className="block w-full text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 shadow-sm" placeholder="e.g. Assembly" />
                             </div>
                             <div className="col-span-3">
                               <input type="number" value={op.duration} onChange={(e) => {
                                 const newOps = [...bomEdits.operations];
                                 newOps[idx].duration = e.target.value;
                                 setBomEdits({ ...bomEdits, operations: newOps });
                               }} className="block w-full text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 shadow-sm" />
                             </div>
                             <div className="col-span-3">
                               <input type="text" value={op.workCenter} onChange={(e) => {
                                 const newOps = [...bomEdits.operations];
                                 newOps[idx].workCenter = e.target.value;
                                 setBomEdits({ ...bomEdits, operations: newOps });
                               }} className="block w-full text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 shadow-sm" placeholder="e.g. Line 1" />
                             </div>
                             <div className="col-span-1 flex justify-center">
                               <button 
                                 onClick={() => {
                                   const newOps = [...bomEdits.operations];
                                   newOps.splice(idx, 1);
                                   setBomEdits({ ...bomEdits, operations: newOps });
                                 }}
                                 className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                               >
                                 <Trash2 size={18} />
                               </button>
                             </div>
                           </div>
                         ))}
                         {bomEdits.operations.length === 0 && (
                           <div className="p-8 text-center text-slate-500 text-sm">No operations added.</div>
                         )}
                       </div>
                     </div>
                   </div>

                 </div>
               ) : (
                  <div className="p-12 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-slate-500">Please select a valid target entity in Step 1.</p>
                  </div>
               )}

               {/* Bottom Navigation */}
               <div className="flex items-center justify-between pt-6 mt-8 border-t border-slate-200">
                 <div className="text-sm font-medium text-slate-500">
                   Adjust inputs above to propose changes
                 </div>
                 <div className="flex space-x-3">
                    <button 
                      onClick={() => { setStep(1); window.scrollTo(0, 0); }}
                      className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium rounded-md text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    >
                      <ArrowLeft size={16} className="mr-2" />
                      Back
                    </button>
                    <button 
                      onClick={handleNextStep2}
                      className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      Next: Review
                      <ArrowRight size={16} className="ml-2" />
                    </button>
                 </div>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
              
               <div className="bg-white rounded-xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-8">
                 <h2 className="text-xl font-bold text-slate-900 mb-6">Review Your ECO</h2>
                 
                 <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-8">
                   <div>
                     <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Title</p>
                     <p className="text-sm font-medium text-slate-900">{watch('title')}</p>
                   </div>
                   <div>
                     <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Type</p>
                     <p className="text-sm font-medium text-slate-900">{watchType === 'BOM' ? 'BOM Configuration' : 'Product Metadata'}</p>
                   </div>
                   <div>
                     <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Target Product</p>
                     <p className="text-sm font-medium text-slate-900">{targetProduct?.name || 'N/A'}</p>
                   </div>
                   <div>
                     <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Version Update</p>
                     <p className="text-sm font-medium text-slate-900">{watch('isVersionUpdate') ? 'Yes' : 'No'}</p>
                   </div>
                 </div>

                 <div className="border border-slate-200 rounded-lg overflow-hidden">
                   <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-b border-slate-200">
                     <h3 className="text-sm font-semibold text-slate-700">Change Summary</h3>
                     <div className="flex gap-4 text-xs font-medium">
                       <span className="flex items-center text-emerald-600"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div> Added</span>
                       <span className="flex items-center text-amber-600"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></div> Updated</span>
                       <span className="flex items-center text-red-600"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5"></div> Removed</span>
                     </div>
                   </div>

                   <table className="w-full text-sm">
                     <thead className="bg-white border-b border-slate-100">
                       <tr>
                         <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Field</th>
                         <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Old Value</th>
                         <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">New Value</th>
                         <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {proposedChanges.fields.length === 0 ? (
                         <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-500">No substantive changes detected.</td></tr>
                       ) : proposedChanges.fields.map((change, i) => (
                         <tr key={i} className="bg-amber-50/30">
                           <td className="px-4 py-3 font-mono text-slate-700 border-l-4 border-amber-400">{change.fieldName}</td>
                           <td className="px-4 py-3 text-slate-500 line-through decoration-slate-300">{JSON.stringify(change.oldValue)}</td>
                           <td className="px-4 py-3 font-medium text-slate-900">{JSON.stringify(change.newValue)}</td>
                           <td className="px-4 py-3">
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                               {change.changeType}
                             </span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>

                 <div className="mt-8">
                   <button 
                     onClick={handleSubmit(onSubmitFinal)}
                     disabled={createMutation.isPending}
                     className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex justify-center items-center"
                   >
                     {createMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : 'Submit ECO'}
                   </button>
                 </div>
               </div>

               <div className="mt-6 flex justify-start">
                 <button onClick={() => { setStep(2); window.scrollTo(0, 0); }} className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center transition-colors">
                   <ArrowLeft size={16} className="mr-1.5" />
                   Back to Changes
                 </button>
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default NewECOPage;
