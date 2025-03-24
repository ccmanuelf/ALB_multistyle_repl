import React from 'react';
import { LineBalancingState } from '@/lib/line-balancing';

interface StyleManagementProps {
  state: LineBalancingState;
}

export default function StyleManagement({ state }: StyleManagementProps) {
  const {
    styles,
    setStyles,
    setActiveStyleIndex,
    outputDistribution,
    setOutputDistribution
  } = state;

  // Handle style ratio change
  const handleStyleRatioChange = (index: number, newRatio: string) => {
    setStyles(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        customRatio: parseFloat(newRatio) || 1
      };
      return updated;
    });
  };

  // Handle removing a specific style
  const handleRemoveStyle = (indexToRemove: number) => {
    setStyles(prevStyles => {
      return prevStyles.filter((_, index) => index !== indexToRemove);
    });
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>
        </svg>
        Style Management and Output Distribution
      </h2>
      
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-3">Output Distribution Method</h3>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input 
              type="radio" 
              name="outputDistribution" 
              value="balanced" 
              checked={outputDistribution === 'balanced'} 
              className="h-4 w-4 text-primary" 
              onChange={() => setOutputDistribution('balanced')}
            />
            <span className="ml-2">Balanced (Equal Units per Style)</span>
          </label>
          <label className="inline-flex items-center">
            <input 
              type="radio" 
              name="outputDistribution" 
              value="custom" 
              checked={outputDistribution === 'custom'} 
              className="h-4 w-4 text-primary" 
              onChange={() => setOutputDistribution('custom')}
            />
            <span className="ml-2">Custom Ratios</span>
          </label>
        </div>
      </div>
      
      {/* Style List with Ratios */}
      {styles.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-neutral-light">
                <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Style Name</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Total SAM</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Operations</th>
                {outputDistribution === 'custom' && (
                  <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Ratio</th>
                )}
                <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {styles.map((style, index) => (
                <tr key={index} className="border-b border-neutral-medium hover:bg-neutral-light">
                  <td className="py-3 px-4">{style.name}</td>
                  <td className="py-3 px-4">{style.totalWorkContent.toFixed(3)}</td>
                  <td className="py-3 px-4">{style.operations.length} Operations</td>
                  {outputDistribution === 'custom' && (
                    <td className="py-3 px-4">
                      <input 
                        type="number" 
                        value={style.customRatio} 
                        min="0.1" 
                        step="0.1" 
                        className="w-20 p-1 border border-neutral-medium rounded"
                        onChange={(e) => handleStyleRatioChange(index, e.target.value)}
                      />
                    </td>
                  )}
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button 
                        className="text-primary hover:text-primary-dark" 
                        title="View Details"
                        onClick={() => setActiveStyleIndex(index)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <button 
                        className="text-error hover:text-red-700" 
                        title="Remove Style"
                        onClick={() => handleRemoveStyle(index)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-neutral-dark">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <p>No styles available. Please upload CSV files or use sample data.</p>
        </div>
      )}
    </div>
  );
}
