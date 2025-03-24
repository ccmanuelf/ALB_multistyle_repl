import React from 'react';
import { LineBalancingState } from '@/lib/line-balancing';

interface MovementParametersProps {
  state: LineBalancingState;
}

export default function MovementParameters({ state }: MovementParametersProps) {
  return (
    <div className="mb-6 bg-neutral-light p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">Material Movement Parameters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-dark mb-1">Movement Time per Step (min)</label>
          <input 
            type="number" 
            value={0.5} 
            className="w-full p-2 border border-neutral-medium rounded" 
            readOnly
          />
          <p className="text-xs text-neutral-dark mt-1">Average time to move materials between operations</p>
        </div>
      </div>
    </div>
  );
}
