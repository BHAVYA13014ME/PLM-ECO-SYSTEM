import React from 'react';
import { Check, X, Circle, Lock, Star } from 'lucide-react';

function StagePipelineVisualizer({ stages = [], currentStageId, ecoStatus }) {
  const currentStageIndex = stages.findIndex(s => s._id === currentStageId);

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center">
            {stages.map((stage, stepIdx) => {
              const isRejected = ecoStatus === 'REJECTED';
              const isApproved = ecoStatus === 'APPROVED';
              
              let StateStatus = 'future';
              if (isApproved) {
                StateStatus = 'complete';
              } else if (isRejected) {
                if (stepIdx < currentStageIndex) StateStatus = 'complete';
                else if (stepIdx === currentStageIndex) StateStatus = 'rejected';
                else StateStatus = 'future';
              } else {
                if (stepIdx < currentStageIndex) StateStatus = 'complete';
                else if (stepIdx === currentStageIndex) StateStatus = 'current';
                else StateStatus = 'future';
              }

              return (
                <li key={stage._id} className={`relative ${stepIdx !== stages.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                  {/* Connector Line */}
                  {stepIdx !== stages.length - 1 && (
                    <div className="absolute top-4 left-0 -ml-px mt-0.5 w-full h-1" aria-hidden="true">
                      <div className={`h-full ${StateStatus === 'complete' || (StateStatus === 'rejected' && isApproved) ? 'bg-green-500' : 'bg-gray-200'}`} />
                    </div>
                  )}

                  {/* Marker Node */}
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    {StateStatus === 'complete' ? (
                      <div className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center ring-4 ring-white shadow transition">
                        <Check className="h-5 w-5 text-white" aria-hidden="true" />
                      </div>
                    ) : StateStatus === 'current' ? (
                      <>
                        <div className="absolute inset-0 rounded-full bg-blue-200 animate-pulse" aria-hidden="true" />
                        <div className="relative h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center ring-4 ring-white shadow z-10">
                          {stage.requiresApproval ? <Lock className="h-4 w-4 text-white" /> : <span className="h-2.5 w-2.5 bg-white rounded-full" />}
                        </div>
                      </>
                    ) : StateStatus === 'rejected' ? (
                      <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center ring-4 ring-white shadow z-10">
                        <X className="h-5 w-5 text-white" aria-hidden="true" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center ring-4 ring-white hover:border-gray-400 z-10 transition group">
                        <span className="text-gray-500 font-medium text-xs group-hover:text-gray-900">{stepIdx + 1}</span>
                      </div>
                    )}
                  </div>

                  {/* Label Text below node */}
                  <div className="absolute top-10 whitespace-nowrap -ml-4">
                    <p className={`text-xs font-semibold ${StateStatus === 'current' ? 'text-blue-700' : StateStatus === 'complete' ? 'text-green-700' : StateStatus === 'rejected' ? 'text-red-700' : 'text-gray-500'}`}>
                      {stage.name} {stage.isFinal && <Star size={10} className="inline ml-1 mb-0.5 text-yellow-500 fill-yellow-500" />}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}

export default StagePipelineVisualizer;
