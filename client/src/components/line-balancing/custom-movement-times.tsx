import React, { useState } from 'react';
import { LineBalancingState, MovementTimeData } from '@/lib/line-balancing';

interface CustomMovementTimesProps {
  state: LineBalancingState;
}

export default function CustomMovementTimes({ state }: CustomMovementTimesProps) {
  const {
    styles,
    activeStyleIndex,
    setStyles,
    customMovementTimes,
    setCustomMovementTimes
  } = state;

  const [fromStep, setFromStep] = useState<number | ''>('');
  const [toStep, setToStep] = useState<number | ''>('');
  const [time, setTime] = useState<number | ''>('');

  // Get active style for operation selection
  const activeStyle = activeStyleIndex !== null && activeStyleIndex < styles.length 
    ? styles[activeStyleIndex] 
    : styles.length > 0 ? styles[0] : null;

  // Handle adding a custom movement time
  const addCustomMovementTime = () => {
    if (!activeStyle || fromStep === '' || toStep === '' || time === '') return;

    const newMovementTime: MovementTimeData = {
      fromStep: typeof fromStep === 'number' ? fromStep : parseInt(fromStep as string),
      toStep: typeof toStep === 'number' ? toStep : parseInt(toStep as string),
      time: typeof time === 'number' ? time : parseFloat(time as string)
    };

    // Update the active style
    setStyles(prev => {
      const updated = [...prev];
      const index = activeStyleIndex !== null ? activeStyleIndex : 0;
      
      // Find if there's already a movement time for this step combination
      const existingIndex = updated[index].movementTimes.findIndex(
        mt => mt.fromStep === newMovementTime.fromStep && mt.toStep === newMovementTime.toStep
      );
      
      if (existingIndex >= 0) {
        // Update existing
        updated[index].movementTimes[existingIndex].time = newMovementTime.time;
      } else {
        // Add new
        updated[index].movementTimes.push(newMovementTime);
      }
      
      return updated;
    });

    // Add to global custom movement times
    setCustomMovementTimes(prev => {
      const existingIndex = prev.findIndex(
        mt => mt.fromStep === newMovementTime.fromStep && mt.toStep === newMovementTime.toStep
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].time = newMovementTime.time;
        return updated;
      } else {
        return [...prev, newMovementTime];
      }
    });

    // Reset form
    setFromStep('');
    setToStep('');
    setTime('');
  };

  // Remove a custom movement time
  const removeCustomMovementTime = (fromStep: number, toStep: number) => {
    if (!activeStyle) return;

    // Update the active style
    setStyles(prev => {
      const updated = [...prev];
      const index = activeStyleIndex !== null ? activeStyleIndex : 0;
      
      updated[index].movementTimes = updated[index].movementTimes.filter(
        mt => !(mt.fromStep === fromStep && mt.toStep === toStep)
      );
      
      return updated;
    });

    // Remove from global custom movement times
    setCustomMovementTimes(prev => 
      prev.filter(mt => !(mt.fromStep === fromStep && mt.toStep === toStep))
    );
  };

  if (!activeStyle) {
    return (
      <div className="mt-3 border border-neutral-medium rounded p-3 bg-white">
        <p className="text-sm text-neutral-dark">Please select a style to define custom movement times.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 border border-neutral-medium rounded p-3 bg-white">
      <p className="text-sm text-neutral-dark mb-2">Define specific movement times between operations:</p>
      
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <select 
          className="p-2 border border-neutral-medium rounded"
          value={fromStep}
          onChange={(e) => setFromStep(e.target.value ? parseInt(e.target.value) : '')}
        >
          <option value="">Select From Operation</option>
          {activeStyle.operations.map(op => (
            <option key={`from-${op.step}`} value={op.step}>
              {op.step}: {op.operation}
            </option>
          ))}
        </select>
        
        <select 
          className="p-2 border border-neutral-medium rounded"
          value={toStep}
          onChange={(e) => setToStep(e.target.value ? parseInt(e.target.value) : '')}
        >
          <option value="">Select To Operation</option>
          {activeStyle.operations.map(op => (
            <option key={`to-${op.step}`} value={op.step}>
              {op.step}: {op.operation}
            </option>
          ))}
        </select>
        
        <input 
          type="number" 
          placeholder="Time (min)" 
          className="p-2 border border-neutral-medium rounded w-28"
          value={time}
          onChange={(e) => setTime(e.target.value ? parseFloat(e.target.value) : '')}
          min="0"
          step="0.1"
        />
        
        <button 
          className="p-2 bg-primary text-white rounded hover:bg-primary-dark"
          onClick={addCustomMovementTime}
          disabled={fromStep === '' || toStep === '' || time === ''}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
      
      {/* List of custom movement times */}
      {activeStyle.movementTimes.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium mb-2">Defined Movement Times:</p>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-neutral-light">
                  <th className="py-1 px-2 text-left text-xs font-medium text-neutral-dark">From Operation</th>
                  <th className="py-1 px-2 text-left text-xs font-medium text-neutral-dark">To Operation</th>
                  <th className="py-1 px-2 text-left text-xs font-medium text-neutral-dark">Time (min)</th>
                  <th className="py-1 px-2 text-left text-xs font-medium text-neutral-dark"></th>
                </tr>
              </thead>
              <tbody>
                {activeStyle.movementTimes.map((mt, idx) => {
                  const fromOp = activeStyle.operations.find(op => op.step === mt.fromStep);
                  const toOp = mt.toStep === -1 
                    ? { step: -1, operation: 'End' } 
                    : activeStyle.operations.find(op => op.step === mt.toStep);
                  
                  if (!fromOp || !toOp) return null;
                  
                  return (
                    <tr key={idx} className="border-b border-neutral-medium">
                      <td className="py-1 px-2 text-xs">{fromOp.step}: {fromOp.operation}</td>
                      <td className="py-1 px-2 text-xs">{toOp.step === -1 ? 'End' : `${toOp.step}: ${toOp.operation}`}</td>
                      <td className="py-1 px-2 text-xs">{mt.time}</td>
                      <td className="py-1 px-2 text-xs">
                        <button 
                          className="text-error hover:text-red-700" 
                          onClick={() => removeCustomMovementTime(mt.fromStep, mt.toStep)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
