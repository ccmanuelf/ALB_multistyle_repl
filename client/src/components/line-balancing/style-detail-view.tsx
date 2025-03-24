import React, { useState } from 'react';
import { LineBalancingState, MovementTimeData } from '@/lib/line-balancing';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface StyleDetailViewProps {
  state: LineBalancingState;
}

export default function StyleDetailView({ state }: StyleDetailViewProps) {
  const {
    styles,
    activeStyleIndex,
    setActiveStyleIndex,
    movementTimePerStep,
    setStyles
  } = state;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMovementTimes, setEditingMovementTimes] = useState<MovementTimeData[]>([]);

  if (activeStyleIndex === null || !styles[activeStyleIndex]) {
    return null;
  }

  const style = styles[activeStyleIndex];
  
  // Calculate total SAM
  const totalSAM = style.operations.reduce((sum, op) => sum + op.sam, 0);
  
  // Calculate total movement time
  const totalMovementTime = style.movementTimes.reduce((sum, move) => sum + move.time, 0);

  // Open movement time editor
  const openMovementTimeEditor = () => {
    setEditingMovementTimes([...style.movementTimes]);
    setIsDialogOpen(true);
  };

  // Update movement time for a specific operation
  const updateMovementTime = (fromStep: number, time: number) => {
    setEditingMovementTimes(prev => {
      return prev.map(mt => 
        mt.fromStep === fromStep ? { ...mt, time } : mt
      );
    });
  };

  // Save all movement times
  const saveMovementTimes = () => {
    setStyles(prev => {
      const updated = [...prev];
      updated[activeStyleIndex] = {
        ...updated[activeStyleIndex],
        movementTimes: editingMovementTimes
      };
      return updated;
    });
    setIsDialogOpen(false);
  };

  // Reset all movement times to default
  const resetMovementTimes = () => {
    const defaultMovementTimes = style.operations.map((op, index) => {
      if (index === style.operations.length - 1) return { fromStep: op.step, toStep: -1, time: 0 };
      const nextOp = style.operations[index + 1];
      return { fromStep: op.step, toStep: nextOp.step, time: movementTimePerStep };
    });
    
    setEditingMovementTimes(defaultMovementTimes);
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Style Details: {style.name}
        </h2>
        <button 
          className="text-sm text-neutral-dark hover:text-primary"
          onClick={() => setActiveStyleIndex(null)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-neutral-light">
              <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Step</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Operation</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Type</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">SAM</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Manual</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark bg-blue-50">Movement Time</th>
            </tr>
          </thead>
          <tbody>
            {style.operations.map((op, index) => {
              // Find movement time for this operation
              const movementTime = style.movementTimes.find(mt => mt.fromStep === op.step);
              const moveTime = movementTime ? movementTime.time : 0;
              
              return (
                <tr key={index} className="border-b border-neutral-medium hover:bg-neutral-light">
                  <td className="py-2 px-4">{op.step}</td>
                  <td className="py-2 px-4">{op.operation}</td>
                  <td className="py-2 px-4">{op.type}</td>
                  <td className="py-2 px-4">{op.sam.toFixed(3)}</td>
                  <td className="py-2 px-4">
                    {op.isManual ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    )}
                  </td>
                  <td className="py-2 px-4 bg-blue-50">{moveTime.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-neutral-light font-medium">
              <td className="py-2 px-4" colSpan={3}>Total</td>
              <td className="py-2 px-4">{totalSAM.toFixed(3)}</td>
              <td className="py-2 px-4"></td>
              <td className="py-2 px-4 bg-blue-50">{totalMovementTime.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {/* Edit Movement Times Button */}
      <div className="mt-4">
        <button 
          className="py-2 px-4 bg-primary text-white rounded hover:bg-primary-dark inline-flex items-center"
          onClick={openMovementTimeEditor}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit Movement Times
        </button>
      </div>
      
      {/* Edit Movement Times Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Movement Times for {style.name}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-neutral-dark mb-4">
              Adjust the movement time between operations. Movement time is the time taken to move materials from one operation to the next.
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-light">
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">From Operation</th>
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">To Operation</th>
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Movement Time (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {editingMovementTimes.map((mt, idx) => {
                    const fromOp = style.operations.find(op => op.step === mt.fromStep);
                    const toOp = mt.toStep === -1 
                      ? { step: -1, operation: 'End' } 
                      : style.operations.find(op => op.step === mt.toStep);
                    
                    if (!fromOp || !toOp) return null;
                    
                    return (
                      <tr key={idx} className="border-b border-neutral-medium">
                        <td className="py-2 px-3">{fromOp.step}: {fromOp.operation}</td>
                        <td className="py-2 px-3">{toOp.step === -1 ? 'End' : `${toOp.step}: ${toOp.operation}`}</td>
                        <td className="py-2 px-3">
                          <input 
                            type="number" 
                            className="w-20 p-1 border border-neutral-medium rounded"
                            value={mt.time}
                            onChange={(e) => updateMovementTime(mt.fromStep, parseFloat(e.target.value))}
                            min="0"
                            step="0.1"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between mt-4">
              <button 
                className="py-1 px-3 bg-neutral-light text-neutral-dark rounded hover:bg-neutral-medium transition-colors"
                onClick={resetMovementTimes}
              >
                Reset to Default
              </button>
              
              <div className="space-x-2">
                <button 
                  className="py-1 px-3 bg-neutral-light text-neutral-dark rounded hover:bg-neutral-medium transition-colors"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="py-1 px-3 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                  onClick={saveMovementTimes}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
