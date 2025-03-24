import React from 'react';
import { LineBalancingState } from '@/lib/line-balancing';

interface HandlingParametersProps {
  state: LineBalancingState;
}

export default function HandlingParameters({ state }: HandlingParametersProps) {
  return (
    <div className="bg-neutral-light p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">Material Handling Overhead</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-dark mb-1">Handling Overhead (%)</label>
          <input 
            type="number" 
            min="0" 
            max="100" 
            step="1"
            value={5}
            className="w-full p-2 border border-neutral-medium rounded" 
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
