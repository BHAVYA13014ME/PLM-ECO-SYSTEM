import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/settingsApi';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

function StageForm({ stageId, initialData, onClose }) {
  const queryClient = useQueryClient();
  const isEditing = !!stageId;

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: initialData || {
      name: '', order: 1, requiresApproval: false, isFinal: false, isDefault: false, approvers: []
    }
  });

  const watchFinal = watch('isFinal');
  const watchDefault = watch('isDefault');
  const watchApproval = watch('requiresApproval');

  const createMutation = useMutation({
    mutationFn: settingsApi.createStage,
    onSuccess: () => { queryClient.invalidateQueries(['settings-stages']); toast.success('Stage created successfully'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Error generating stage.')
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => settingsApi.updateStage(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['settings-stages']); toast.success('Stage bounds updated'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Error updating stage.')
  });

  const onSubmit = async (data) => {
    // Convert to explicit booleans and ints
    const payload = {
      ...data,
      order: parseInt(data.order, 10),
      // Mongoose expects full string objectIds for approvers. For now, since we mock approvers in UI, we pass empty if demo to prevent CastError if using mock strings.
      approvers: [] 
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: stageId, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
      
      <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all max-w-lg w-full relative z-10">
         <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
           <h3 className="text-lg leading-6 font-bold text-gray-900">{isEditing ? 'Configure Execution Logic Node' : 'Initialize Action Pipeline'}</h3>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5"/></button>
         </div>

         <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
           
           <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2 sm:col-span-1">
               <label className="block text-sm font-medium text-gray-700">Stage Name *</label>
               <input type="text" {...register('name')} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g. QUALITY_ASSURANCE" />
             </div>
             
             <div className="col-span-2 sm:col-span-1">
               <label className="block text-sm font-medium text-gray-700">Sorting Precedence Order *</label>
               <input type="number" {...register('order')} required min="1" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono" />
             </div>
           </div>

           <div className="space-y-4 pt-2 border-t border-gray-100">
             
             <div className="flex items-start">
               <div className="flex items-center h-5"><input type="checkbox" {...register('requiresApproval')} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded" /></div>
               <div className="ml-3 text-sm">
                 <label className="font-medium text-gray-700">Requires Manual Validation</label>
                 <p className="text-gray-500 mt-0.5">Pause execution implicitly ensuring users intercept validation.</p>
               </div>
             </div>

             {watchApproval && (
               <div className="ml-7 p-3 bg-gray-50 border border-gray-200 rounded-md">
                 <label className="block text-xs font-medium text-gray-700 mb-1">Assigned Approver Roles (Static Mock Array)</label>
                 <select disabled className="block w-full text-sm border-gray-300 rounded bg-gray-100 text-gray-500">
                   <option>Dynamic assignment restricted in Phase bounds</option>
                 </select>
               </div>
             )}

             <div className="flex items-start">
               <div className="flex items-center h-5"><input type="checkbox" {...register('isDefault')} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded" /></div>
               <div className="ml-3 text-sm">
                 <label className="font-medium text-gray-700">Is Default Initiation Boundary</label>
               </div>
             </div>

             {watchDefault && (
               <div className="ml-7 bg-indigo-50 p-2 rounded border-l-2 border-indigo-500 text-xs text-indigo-700 italic font-medium">
                 This parameter immediately dictates the starting index layout pipeline map globally.
               </div>
             )}

             <div className="flex items-start">
               <div className="flex items-center h-5"><input type="checkbox" {...register('isFinal')} className="focus:ring-yellow-500 h-4 w-4 text-yellow-600 border-gray-300 rounded" /></div>
               <div className="ml-3 text-sm">
                 <label className="font-medium text-gray-700">Final Terminal Node Execution Boundary</label>
               </div>
             </div>

             {watchFinal && (
               <div className="ml-7 bg-yellow-50 p-3 rounded border-l-4 border-yellow-500 flex items-start mt-1">
                 <AlertTriangle size={16} className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                 <p className="text-xs text-yellow-800 font-medium">Configuring this parameter immediately dictates native ECO Execution injection triggering massive Database Multi-Transactions natively.</p>
               </div>
             )}

           </div>

           <div className="pt-5 border-t border-gray-200 flex justify-end space-x-3">
             <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
             <button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending} className="inline-flex justify-center items-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:bg-blue-400">
               {isSubmitting || createMutation.isPending || updateMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Apply Boundaries'}
             </button>
           </div>
         </form>
      </div>
    </div>
  );
}

export default StageForm;
