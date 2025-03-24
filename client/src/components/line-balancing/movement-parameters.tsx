import React from 'react';
import { LineBalancingState } from '@/lib/line-balancing';
import CustomMovementTimes from './custom-movement-times';

interface MovementParametersProps {
  state: LineBalancingState;
}

export default function MovementParameters({ state }: MovementParametersProps) {
  // Use direct references to state properties to avoid hoisting issues
  const movementTimePerStep = state.movementTimePerStep;
  const setMovementTimePerStep = state.setMovementTimePerStep;
  const movementDistanceFactor = state.movementDistanceFactor;
  const setMovementDistanceFactor = state.setMovementDistanceFactor;
  const useCustomMovementTimes = state.useCustomMovementTimes;
  const setUseCustomMovementTimes = state.setUseCustomMovementTimes;

  return (
    <div className="mb-6 bg-neutral-light p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 18v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/>
          <path d="M2 8h20"/>
          <path d="m9 9 3 3 3-3"/>
          <rect width="6" height="6" x="9" y="15" rx="1"/>
        </svg>
        Material Movement Parameters
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-dark mb-1">Movement Time per Step (min)</label>
          <input 
            type="number" 
            value={movementTimePerStep} 
            min="0" 
            step="0.1" 
            className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary" 
            onChange={(e) => setMovementTimePerStep(parseFloat(e.target.value))}
          />
          <p className="text-xs text-neutral-dark mt-1">Average time to move materials between operations</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-dark mb-1">Movement Distance Factor</label>
          <input 
            type="number" 
            value={movementDistanceFactor} 
            min="0.1" 
            step="0.1" 
            className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary" 
            onChange={(e) => setMovementDistanceFactor(parseFloat(e.target.value))}
          />
          <p className="text-xs text-neutral-dark mt-1">Adjust for layout complexity (1.0 = standard)</p>
        </div>
      </div>
      
      <div className="mt-3">
        <label className="inline-flex items-center">
          <input 
            type="checkbox" 
            className="h-4 w-4 text-primary rounded" 
            checked={useCustomMovementTimes}
            onChange={() => setUseCustomMovementTimes(!useCustomMovementTimes)}
          />
          <span className="ml-2 text-sm">Use custom movement times between specific operations</span>
        </label>
        
        {useCustomMovementTimes && (
          <CustomMovementTimes state={state} />
        )}
      </div>
    </div>
  );
}
