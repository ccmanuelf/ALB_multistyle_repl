import React from 'react';
import { LineBalancingState } from '@/lib/line-balancing';
import BatchParameters from './batch-parameters';
import MovementParameters from './movement-parameters';
import HandlingParameters from './handling-parameters';

interface SetupTabProps {
  state: LineBalancingState;
}

export default function SetupTab({ state }: SetupTabProps) {
  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Sections */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Line Configuration</h2>
          
          {/* Batch Processing Parameters */}
          <BatchParameters state={state} />
          
          {/* Material Movement Parameters */}
          <MovementParameters state={state} />
          
          {/* Material Handling Overhead */}
          <HandlingParameters state={state} />
        </div>
      </div>
    </div>
  );
}
