import React from 'react';
import { LineBalancingState } from '@/lib/line-balancing';

interface HandlingParametersProps {
  state: LineBalancingState;
}

export default function HandlingParameters({ state }: HandlingParametersProps) {
  // Use direct references to state properties to avoid hoisting issues
  const handlingOverheadPercentage = state.handlingOverheadPercentage;
  const setHandlingOverheadPercentage = state.setHandlingOverheadPercentage;
  const materialComplexity = state.materialComplexity;
  const setMaterialComplexity = state.setMaterialComplexity;
  const specialHandlingRequirements = state.specialHandlingRequirements;
  const setSpecialHandlingRequirements = state.setSpecialHandlingRequirements;

  const toggleSpecialHandling = (requirement: string) => {
    setSpecialHandlingRequirements(prev => {
      if (prev.includes(requirement)) {
        return prev.filter(r => r !== requirement);
      } else {
        return [...prev, requirement];
      }
    });
  };

  return (
    <div className="bg-neutral-light p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
          <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
          <path d="M12 3v6"/>
        </svg>
        Material Handling Overhead
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-dark mb-1">Handling Overhead (%)</label>
          <input 
            type="number" 
            value={handlingOverheadPercentage} 
            min="0" 
            max="100" 
            step="1" 
            className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary" 
            onChange={(e) => setHandlingOverheadPercentage(parseFloat(e.target.value))}
          />
          <p className="text-xs text-neutral-dark mt-1">Additional time for material preparation/handling</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-dark mb-1">Material Complexity Factor</label>
          <select 
            className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary"
            value={materialComplexity}
            onChange={(e) => setMaterialComplexity(e.target.value as 'low' | 'medium' | 'high' | 'very-high')}
          >
            <option value="low">Low (Few Components)</option>
            <option value="medium">Medium (Standard Components)</option>
            <option value="high">High (Many Components)</option>
            <option value="very-high">Very High (Complex Assembly)</option>
          </select>
        </div>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-neutral-dark mb-1">Special Handling Requirements</label>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center">
            <input 
              type="checkbox" 
              className="h-4 w-4 text-primary rounded" 
              checked={specialHandlingRequirements.includes('fragile')}
              onChange={() => toggleSpecialHandling('fragile')}
            />
            <span className="ml-2 text-sm">Fragile Materials</span>
          </label>
          <label className="inline-flex items-center">
            <input 
              type="checkbox" 
              className="h-4 w-4 text-primary rounded" 
              checked={specialHandlingRequirements.includes('heavy')}
              onChange={() => toggleSpecialHandling('heavy')}
            />
            <span className="ml-2 text-sm">Heavy Components</span>
          </label>
          <label className="inline-flex items-center">
            <input 
              type="checkbox" 
              className="h-4 w-4 text-primary rounded" 
              checked={specialHandlingRequirements.includes('hazardous')}
              onChange={() => toggleSpecialHandling('hazardous')}
            />
            <span className="ml-2 text-sm">Hazardous Materials</span>
          </label>
          <label className="inline-flex items-center">
            <input 
              type="checkbox" 
              className="h-4 w-4 text-primary rounded" 
              checked={specialHandlingRequirements.includes('temperature')}
              onChange={() => toggleSpecialHandling('temperature')}
            />
            <span className="ml-2 text-sm">Temperature Control</span>
          </label>
        </div>
      </div>
    </div>
  );
}
