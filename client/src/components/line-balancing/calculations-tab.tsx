import React from 'react';
import { LineBalancingState } from '@/lib/line-balancing';

interface CalculationsTabProps {
  state: LineBalancingState;
}

export default function CalculationsTab({ state }: CalculationsTabProps) {
  const { results } = state;

  // Function to determine impact color class
  const getImpactColorClass = (value: number, isNegative: boolean = false) => {
    if (isNegative) {
      // For values where negative is bad
      if (value < -10) return 'text-error';
      if (value < -5) return 'text-warning';
      return 'text-success';
    } else {
      // For values where positive is bad
      if (value > 10) return 'text-error';
      if (value > 5) return 'text-warning';
      return 'text-success';
    }
  };

  // Function to determine impact text
  const getImpactText = (value: number) => {
    if (Math.abs(value) > 10) return 'High Impact';
    if (Math.abs(value) > 5) return 'Medium Impact';
    return 'Low Impact';
  };

  // Determine batch size recommendation based on results
  const getBatchSizeRecommendation = () => {
    if (!results) return null;
    
    if (results.batchProcessingImpact < -5) {
      return {
        text: 'Consider increasing batch size to reduce setup impact.',
        color: 'text-warning'
      };
    } else if (results.batchProcessingImpact > -2) {
      return {
        text: 'Current batch size is optimal.',
        color: 'text-success'
      };
    } else {
      return {
        text: 'Review batch setup time to improve efficiency.',
        color: 'text-neutral-dark'
      };
    }
  };

  // Determine movement recommendation based on results
  const getMovementRecommendation = () => {
    if (!results) return null;
    
    if (results.movementTimeImpact > 10) {
      return {
        text: 'Optimize layout to reduce movement between operations.',
        color: 'text-error'
      };
    } else if (results.movementTimeImpact > 5) {
      return {
        text: 'Consider co-locating sequential operations to reduce movement time.',
        color: 'text-warning'
      };
    } else {
      return {
        text: 'Current movement times are well-optimized.',
        color: 'text-success'
      };
    }
  };

  const batchRecommendation = getBatchSizeRecommendation();
  const movementRecommendation = getMovementRecommendation();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Calculation Results</h2>
      
      {!results ? (
        <div className="text-center py-8 text-neutral-dark">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"/>
            <path d="M9 15h3l8.5-8.5a1.5 1.5 0 0 0-3-3L9 12v3"/>
            <path d="M16 5l3 3"/>
          </svg>
          <p>No results available. Please set up your production line parameters first.</p>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <div className="p-4 bg-neutral-light rounded-lg">
              <h3 className="text-lg font-medium mb-3">Summary</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {results.calculationMode === 'operators-to-output' && (
                  <div className="bg-white p-3 rounded border border-neutral-medium">
                    <div className="text-sm text-neutral-dark">Available Operators</div>
                    <div className="text-xl font-semibold">{results.availableOperators}</div>
                  </div>
                )}

                {results.calculationMode === 'output-to-operators' && (
                  <div className="bg-white p-3 rounded border border-neutral-medium">
                    <div className="text-sm text-neutral-dark">Required Operators</div>
                    <div className="text-xl font-semibold">{results.totalOperatorsRequired}</div>
                  </div>
                )}
                
                <div className="bg-white p-3 rounded border border-neutral-medium">
                  <div className="text-sm text-neutral-dark">Cycle Time</div>
                  <div className="text-xl font-semibold">
                    {results.actualCycleTime 
                      ? results.actualCycleTime.toFixed(2) 
                      : results.styleResults[0]?.cycleTime.toFixed(2)} min
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded border border-neutral-medium">
                  <div className="text-sm text-neutral-dark">Line Efficiency</div>
                  <div className="text-xl font-semibold">
                    {results.efficiency.toFixed(1)}%
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded border border-neutral-medium">
                  <div className="text-sm text-neutral-dark">Weekly Output</div>
                  <div className="text-xl font-semibold">
                    {results.totalAllocatedOutput.toLocaleString()} units
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded border border-neutral-medium">
                  <div className="text-sm text-neutral-dark">Total Work Content</div>
                  <div className="text-xl font-semibold">
                    {results.totalWorkContent.toFixed(3)} min
                  </div>
                </div>
                
                {/* Batch Processing Summary */}
                <div className="bg-white p-3 rounded border border-primary">
                  <div className="text-sm text-primary">Batch Processing Impact</div>
                  <div className={`text-xl font-semibold ${getImpactColorClass(results.batchProcessingImpact, true)}`}>
                    {results.batchProcessingImpact.toFixed(1)}%
                  </div>
                  <div className="text-xs text-neutral-dark">Due to batch handling</div>
                </div>
                
                {/* Material Movement Summary */}
                <div className="bg-white p-3 rounded border border-primary">
                  <div className="text-sm text-primary">Movement Time Impact</div>
                  <div className={`text-xl font-semibold ${getImpactColorClass(results.movementTimeImpact)}`}>
                    +{results.movementTimeImpact.toFixed(1)}%
                  </div>
                  <div className="text-xs text-neutral-dark">Added to total work content</div>
                </div>
                
                {/* Material Handling Summary */}
                <div className="bg-white p-3 rounded border border-primary">
                  <div className="text-sm text-primary">Handling Overhead</div>
                  <div className={`text-xl font-semibold ${getImpactColorClass(results.handlingOverheadImpact)}`}>
                    +{results.handlingOverheadImpact.toFixed(1)}%
                  </div>
                  <div className="text-xs text-neutral-dark">Added to total process time</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Detailed Results Table */}
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-neutral-light">
                  <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Style</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Allocated Output</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Operators Required</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Work Content</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark">Cycle Time</th>
                  {/* Additional Metrics */}
                  <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark bg-blue-50">Movement Time</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark bg-blue-50">Batch Impact</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-neutral-dark bg-blue-50">Total Time</th>
                </tr>
              </thead>
              <tbody>
                {results.styleResults.map((style, index) => (
                  <tr key={index} className="border-b border-neutral-medium">
                    <td className="py-2 px-4">{style.name}</td>
                    <td className="py-2 px-4">{style.allocatedOutput.toLocaleString()}</td>
                    <td className="py-2 px-4">{style.operatorsRequired}</td>
                    <td className="py-2 px-4">{style.totalWorkContent.toFixed(3)} min</td>
                    <td className="py-2 px-4">{style.cycleTime.toFixed(2)} min</td>
                    {/* Additional Values */}
                    <td className="py-2 px-4 bg-blue-50">{style.totalMovementTime.toFixed(1)} min</td>
                    <td className="py-2 px-4 bg-blue-50">{style.batchImpact.toFixed(2)} min</td>
                    <td className="py-2 px-4 bg-blue-50">{style.totalAdjustedTime.toFixed(3)} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Advanced Analysis Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Batch Processing Analysis */}
            <div className="bg-neutral-light p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-3">Batch Processing Analysis</h3>
              
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Parameter</th>
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Value</th>
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Impact</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-b border-neutral-medium">
                    <td className="py-2 px-3">Batch Size</td>
                    <td className="py-2 px-3">{state.batchSize} units</td>
                    <td className="py-2 px-3 text-neutral-dark">Standard</td>
                  </tr>
                  <tr className="border-b border-neutral-medium">
                    <td className="py-2 px-3">Setup Time per Batch</td>
                    <td className="py-2 px-3">{state.batchSetupTime} min</td>
                    <td className="py-2 px-3 text-warning">
                      {state.batchSetupTime > 10 ? 'High Impact' : 'Medium Impact'}
                    </td>
                  </tr>
                  <tr className="border-b border-neutral-medium">
                    <td className="py-2 px-3">Transport Time</td>
                    <td className="py-2 px-3">{state.batchTransportTime} min</td>
                    <td className="py-2 px-3 text-success">
                      {state.batchTransportTime > 10 ? 'High Impact' : 
                        state.batchTransportTime > 5 ? 'Medium Impact' : 'Low Impact'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Processing Factor</td>
                    <td className="py-2 px-3">{state.batchProcessingFactor}</td>
                    <td className="py-2 px-3 text-success">
                      {state.batchProcessingFactor > 0.9 ? 'Positive' : 
                        state.batchProcessingFactor > 0.8 ? 'Neutral' : 'Negative'}
                    </td>
                  </tr>
                </tbody>
              </table>
              
              {batchRecommendation && (
                <div className="mt-3 text-sm">
                  <p className="font-medium">Recommendation:</p>
                  <p className={batchRecommendation.color}>{batchRecommendation.text}</p>
                </div>
              )}
            </div>
            
            {/* Material Movement Analysis */}
            <div className="bg-neutral-light p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-3">Material Movement Analysis</h3>
              
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Parameter</th>
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Value</th>
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Impact</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-b border-neutral-medium">
                    <td className="py-2 px-3">Average Movement Time</td>
                    <td className="py-2 px-3">{state.movementTimePerStep} min</td>
                    <td className="py-2 px-3 text-neutral-dark">Standard</td>
                  </tr>
                  <tr className="border-b border-neutral-medium">
                    <td className="py-2 px-3">Total Movement Time</td>
                    <td className="py-2 px-3">
                      {results.styleResults.reduce((sum, style) => sum + style.totalMovementTime, 0).toFixed(1)} min
                    </td>
                    <td className="py-2 px-3 text-warning">
                      +{results.movementTimeImpact.toFixed(1)}% Work Content
                    </td>
                  </tr>
                  <tr className="border-b border-neutral-medium">
                    <td className="py-2 px-3">Distance Factor</td>
                    <td className="py-2 px-3">{state.movementDistanceFactor}</td>
                    <td className="py-2 px-3 text-neutral-dark">
                      {state.movementDistanceFactor === 1.0 ? 'Standard' : 
                        state.movementDistanceFactor < 1.0 ? 'Optimized' : 'Extended'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Bottleneck Impact</td>
                    <td className="py-2 px-3">
                      {results.movementTimeImpact > 10 ? 'High' : 
                        results.movementTimeImpact > 5 ? 'Medium' : 'Low'}
                    </td>
                    <td className={`py-2 px-3 ${getImpactColorClass(results.movementTimeImpact)}`}>
                      {getImpactText(results.movementTimeImpact)}
                    </td>
                  </tr>
                </tbody>
              </table>
              
              {movementRecommendation && (
                <div className="mt-3 text-sm">
                  <p className="font-medium">Recommendation:</p>
                  <p className={movementRecommendation.color}>{movementRecommendation.text}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Material Handling Analysis */}
          <div className="mt-6 bg-neutral-light p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Material Handling Analysis</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Parameter</th>
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Value</th>
                    <th className="py-2 px-3 text-left text-sm font-medium text-neutral-dark">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-medium">
                    <td className="py-2 px-3">Handling Overhead</td>
                    <td className="py-2 px-3">{state.handlingOverheadPercentage}%</td>
                    <td className="py-2 px-3 text-neutral-dark">
                      {state.handlingOverheadPercentage <= 5 ? 'Standard' : 
                        state.handlingOverheadPercentage <= 10 ? 'Moderate' : 'High'}
                    </td>
                  </tr>
                  <tr className="border-b border-neutral-medium">
                    <td className="py-2 px-3">Material Complexity</td>
                    <td className="py-2 px-3">{state.materialComplexity}</td>
                    <td className="py-2 px-3 text-neutral-dark">
                      {state.materialComplexity === 'low' ? 'Low Impact' : 
                        state.materialComplexity === 'medium' ? 'Standard' : 
                        state.materialComplexity === 'high' ? 'Significant' : 'Critical'}
                    </td>
                  </tr>
                  <tr className="border-b border-neutral-medium">
                    <td className="py-2 px-3">Special Requirements</td>
                    <td className="py-2 px-3">
                      {state.specialHandlingRequirements.length === 0 ? 'None' : 
                        state.specialHandlingRequirements.join(', ')}
                    </td>
                    <td className={`py-2 px-3 ${state.specialHandlingRequirements.length === 0 ? 'text-success' : 'text-warning'}`}>
                      {state.specialHandlingRequirements.length === 0 ? 'No Impact' : 
                        state.specialHandlingRequirements.length > 2 ? 'High Impact' : 'Medium Impact'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Adjusted Work Content</td>
                    <td className="py-2 px-3">
                      +{(results.handlingOverheadImpact * results.totalWorkContent / 100).toFixed(3)} min
                    </td>
                    <td className={`py-2 px-3 ${getImpactColorClass(results.handlingOverheadImpact)}`}>
                      {getImpactText(results.handlingOverheadImpact)}
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <div>
                <h4 className="text-md font-medium mb-2">Handling Impact by Factor</h4>
                <div className="bg-white p-4 rounded border border-neutral-medium">
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span>Base Overhead:</span>
                      <span className="font-medium">{state.handlingOverheadPercentage}%</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Complexity Factor:</span>
                      <span className="font-medium">
                        {state.materialComplexity === 'low' ? '0.8x' : 
                          state.materialComplexity === 'medium' ? '1.0x' : 
                          state.materialComplexity === 'high' ? '1.3x' : '1.7x'}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Special Handling:</span>
                      <span className="font-medium">
                        +{state.specialHandlingRequirements.length * 5}%
                      </span>
                    </li>
                    <li className="flex justify-between border-t pt-2 mt-2">
                      <span className="font-medium">Total Impact:</span>
                      <span className="font-medium text-primary">
                        +{results.handlingOverheadImpact.toFixed(1)}%
                      </span>
                    </li>
                  </ul>
                  
                  <div className="mt-4">
                    <div className="w-full bg-neutral-light rounded-full h-2.5">
                      <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ width: `${Math.min(100, results.handlingOverheadImpact * 5)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1 text-neutral-dark">
                      <span>0%</span>
                      <span>10%</span>
                      <span>20%</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 text-sm">
                  <p className="font-medium">Key Finding:</p>
                  <p className="text-neutral-dark">
                    {state.materialComplexity === 'high' || state.materialComplexity === 'very-high'
                      ? 'Material complexity is the main contributor to handling overhead.'
                      : state.specialHandlingRequirements.length > 0
                      ? 'Special handling requirements significantly increase overhead.'
                      : 'Standard handling overhead with no critical factors.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
