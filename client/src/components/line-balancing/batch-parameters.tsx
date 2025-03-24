import React from 'react';
import { LineBalancingState } from '@/lib/line-balancing';

interface BatchParametersProps {
  state: LineBalancingState;
}

export default function BatchParameters({ state }: BatchParametersProps) {
  const {
    batchSize,
    setBatchSize,
    batchSetupTime,
    setBatchSetupTime,
    batchTransportTime,
    setBatchTransportTime,
    batchProcessingFactor,
    setBatchProcessingFactor
  } = state;

  return (
    <div className="mb-6 bg-neutral-light p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
          <path d="M3 9h18"/>
          <path d="M9 21V9"/>
        </svg>
        Batch Processing Parameters
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-dark mb-1">Batch Size</label>
          <input 
            type="number" 
            value={batchSize} 
            min="1" 
            step="1" 
            className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary" 
            onChange={(e) => setBatchSize(parseInt(e.target.value))}
          />
          <p className="text-xs text-neutral-dark mt-1">Number of units processed together</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-dark mb-1">Batch Setup Time (min)</label>
          <input 
            type="number" 
            value={batchSetupTime} 
            min="0" 
            step="1" 
            className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary" 
            onChange={(e) => setBatchSetupTime(parseFloat(e.target.value))}
          />
          <p className="text-xs text-neutral-dark mt-1">Time to prepare each batch</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-dark mb-1">Batch Transport Time (min)</label>
          <input 
            type="number" 
            value={batchTransportTime} 
            min="0" 
            step="1" 
            className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary" 
            onChange={(e) => setBatchTransportTime(parseFloat(e.target.value))}
          />
          <p className="text-xs text-neutral-dark mt-1">Time to move each batch</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-dark mb-1">Batch Processing Factor</label>
          <input 
            type="number" 
            value={batchProcessingFactor} 
            min="0.1" 
            max="1" 
            step="0.01" 
            className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary" 
            onChange={(e) => setBatchProcessingFactor(parseFloat(e.target.value))}
          />
          <p className="text-xs text-neutral-dark mt-1">Efficiency factor for batch processing</p>
        </div>
      </div>
    </div>
  );
}
