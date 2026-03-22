import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/settingsApi';
import toast from 'react-hot-toast';
import StageForm from './StageForm';
import { Plus, Loader2, ArrowRight, Star, Lock, MoveRight, Trash2 } from 'lucide-react';

function StageManager() {
  const queryClient = useQueryClient();
  const [editingStage, setEditingStage] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: resp, isLoading } = useQuery({ queryKey: ['settings-stages'], queryFn: settingsApi.getStages });
  const deleteMutation = useMutation({
    mutationFn: settingsApi.deleteStage,
    onSuccess: () => {
      queryClient.invalidateQueries(['settings-stages']);
      toast.success('Stage removed successfully.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error deleting stage.'),
  });

  const allStages = resp?.data || [];
  
  const handleAddNew = () => {
    setEditingStage(null);
    setIsFormOpen(true);
  };

  const handleEdit = (stage) => {
    setEditingStage(stage);
    setIsFormOpen(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you absolutely sure you want to delete this structural stage boundary?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) return <div className="py-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
       
       <div className="flex justify-between items-center mb-10">
         <h2 className="text-lg font-bold text-gray-900 border-l-4 border-blue-600 pl-3">Live Active Pipeline</h2>
       </div>

       {/* Horizontal Pipeline Visualization */}
       <div className="flex flex-wrap items-center gap-y-8">
         {allStages.map((stage, i) => (
           <React.Fragment key={stage._id}>
             
             {/* Stage Card */}
             <div 
               onClick={() => handleEdit(stage)}
               className={`relative flex flex-col items-center justify-center p-6 border-2 rounded-xl cursor-pointer shadow-sm min-w-[220px] transition-all hover:-translate-y-1 hover:shadow-md group ${stage.isFinal ? 'border-yellow-400 bg-yellow-50/30' : stage.isDefault ? 'border-indigo-400 bg-indigo-50/30' : 'border-gray-200 bg-white hover:border-blue-400'}`}
             >
                {/* Badges corner */}
                <div className="absolute -top-3 left-3 flex space-x-2">
                   {stage.isDefault && <span className="bg-indigo-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow">Default Entry</span>}
                   {stage.isFinal && <span className="bg-yellow-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow flex items-center"><Star size={10} className="mr-1 fill-white" /> Terminal</span>}
                </div>
                
                {/* Delete button (top right, visible on hover) */}
                {!stage.isDefault && !stage.isFinal && (
                  <button onClick={(e) => handleDelete(e, stage._id)} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Delete Stage">
                     <Trash2 size={16} />
                  </button>
                )}

                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight mt-2 text-center">{stage.name}</h3>
                <p className="text-xs text-gray-500 font-mono mt-1 mb-4">Node Offset: {stage.order}</p>

                {stage.requiresApproval ? (
                  <div className="flex flex-col items-center space-y-1">
                     <span className="flex items-center text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full"><Lock size={12} className="mr-1.5" /> Requires Approval</span>
                     <p className="text-[10px] text-gray-400">{stage.approvers?.length || 0} Assigner(s) explicitly linked.</p>
                  </div>
                ) : (
                  <span className="flex items-center text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full"><MoveRight size={12} className="mr-1.5" /> Auto Validated Engine</span>
                )}
             </div>

             {/* Connector Arrow */}
             {i !== allStages.length - 1 && (
               <div className="flex-1 flex justify-center min-w-[40px]">
                 <ArrowRight className="h-8 w-8 text-gray-300" />
               </div>
             )}

           </React.Fragment>
         ))}

         {/* Add Stage Button */}
         {allStages.length > 0 && (
           <>
              <div className="flex-1 flex justify-center min-w-[40px]">
                 <ArrowRight className="h-8 w-8 text-gray-300 border-dashed border-gray-300 border-b-2 hidden sm:block" />
              </div>
              <button onClick={handleAddNew} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl min-w-[220px] text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors h-full">
                 <Plus className="h-10 w-10 mb-2 opacity-50" />
                 <span className="font-bold">Append Action Node</span>
              </button>
           </>
         )}
       </div>

       {isFormOpen && (
         <StageForm 
           stageId={editingStage?._id} 
           initialData={editingStage} 
           onClose={() => { setIsFormOpen(false); setEditingStage(null); }} 
         />
       )}
    </div>
  );
}

export default StageManager;
