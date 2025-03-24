import React from 'react';
import { LineBalancingState } from '@/lib/line-balancing';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Sankey,
  Scatter,
  ScatterChart,
  ZAxis
} from 'recharts';

interface VisualizationTabProps {
  state: LineBalancingState;
}

export default function VisualizationTab({ state }: VisualizationTabProps) {
  const { results, styles } = state;

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // Prepare data for output distribution chart
  const prepareOutputDistributionData = () => {
    if (!results) return [];
    return results.styleResults.map((style, index) => ({
      name: style.name,
      output: style.allocatedOutput,
      fill: COLORS[index % COLORS.length]
    }));
  };

  // Prepare data for operator allocation chart
  const prepareOperatorAllocationData = () => {
    if (!results) return [];
    return results.styleResults.map((style, index) => ({
      name: style.name,
      operators: style.operatorsRequired,
      fill: COLORS[index % COLORS.length]
    }));
  };

  // Prepare data for time breakdown chart
  const prepareTimeBreakdownData = () => {
    if (!results) return [];
    return results.styleResults.map(style => ({
      name: style.name,
      sam: style.totalWorkContent,
      movement: style.totalMovementTime,
      batch: style.batchImpact * style.allocatedOutput,
      handling: style.handlingOverhead
    }));
  };

  // Prepare data for impact visualization chart
  const prepareImpactVisualizationData = () => {
    if (!results) return [];
    return [
      { name: 'Base SAM', value: 100 },
      { name: 'After Movement', value: 100 + results.movementTimeImpact },
      { name: 'After Batch', value: 100 + results.movementTimeImpact + results.batchProcessingImpact },
      { name: 'After Handling', value: 100 + results.movementTimeImpact + results.batchProcessingImpact + results.handlingOverheadImpact }
    ];
  };

  // Prepare data for bottleneck analysis
  const prepareBottleneckData = () => {
    if (!results || results.styleResults.length === 0) return [];
    
    const style = results.styleResults[0]; // Use first style for bottleneck analysis
    return style.operations.map(op => ({
      name: `Step ${op.step}`,
      value: op.sam,
      bottleneck: op.step === style.bottleneckOperation.step ? 1 : 0
    }));
  };

  // Prepare data for process flow
  const prepareProcessFlowData = () => {
    if (!results || results.styleResults.length === 0 || !styles[0]) return [];
    
    const style = styles[0]; // Use first style for process flow
    const nodes = style.operations.map((op, index) => ({
      name: `${op.step}: ${op.operation}`
    }));
    
    const links = [];
    for (let i = 0; i < style.operations.length - 1; i++) {
      links.push({
        source: i,
        target: i + 1,
        value: style.movementTimes[i]?.time || 0.5
      });
    }
    
    return { nodes, links };
  };

  // Material handling breakdown data
  const prepareMaterialHandlingData = () => {
    if (!results) return [];
    
    // Create data based on material complexity and special requirements
    const data = [
      { name: 'Base Overhead', value: state.handlingOverheadPercentage },
      { name: 'Complexity', value: state.materialComplexity === 'low' ? 1 : 
                                  state.materialComplexity === 'medium' ? 2 : 
                                  state.materialComplexity === 'high' ? 3 : 4 }
    ];
    
    // Add special requirements
    if (state.specialHandlingRequirements.includes('fragile')) {
      data.push({ name: 'Fragile', value: 2 });
    }
    if (state.specialHandlingRequirements.includes('heavy')) {
      data.push({ name: 'Heavy', value: 2 });
    }
    if (state.specialHandlingRequirements.includes('hazardous')) {
      data.push({ name: 'Hazardous', value: 3 });
    }
    if (state.specialHandlingRequirements.includes('temperature')) {
      data.push({ name: 'Temperature', value: 2 });
    }
    
    return data;
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-neutral-medium rounded shadow-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const outputDistributionData = prepareOutputDistributionData();
  const operatorAllocationData = prepareOperatorAllocationData();
  const timeBreakdownData = prepareTimeBreakdownData();
  const impactVisualizationData = prepareImpactVisualizationData();
  const bottleneckData = prepareBottleneckData();
  const materialHandlingData = prepareMaterialHandlingData();

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Output Distribution Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Output Distribution</h2>
          
          {!results ? (
            <div className="h-80 w-full flex items-center justify-center text-neutral-dark border border-dashed border-neutral-medium rounded">
              <p>No data available for output distribution</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={outputDistributionData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="output" name="Allocated Output" fill="#3F51B5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* Operator Allocation Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Operator Allocation</h2>
          
          {!results ? (
            <div className="h-80 w-full flex items-center justify-center text-neutral-dark border border-dashed border-neutral-medium rounded">
              <p>No data available for operator allocation</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={operatorAllocationData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="operators" name="Operators Required" fill="#FF5722" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* Time Breakdown Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Time Breakdown Analysis</h2>
          
          {!results ? (
            <div className="h-80 w-full flex items-center justify-center text-neutral-dark border border-dashed border-neutral-medium rounded">
              <p>No data available for time breakdown</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeBreakdownData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="sam" name="Base SAM" stackId="a" fill="#3F51B5" />
                  <Bar dataKey="movement" name="Movement Time" stackId="a" fill="#FF5722" />
                  <Bar dataKey="batch" name="Batch Impact" stackId="a" fill="#00BCD4" />
                  <Bar dataKey="handling" name="Handling Overhead" stackId="a" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* Impact Visualization */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Impact Visualization</h2>
          
          {!results ? (
            <div className="h-80 w-full flex items-center justify-center text-neutral-dark border border-dashed border-neutral-medium rounded">
              <p>No data available for impact visualization</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={impactVisualizationData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[
                    Math.floor(Math.min(...impactVisualizationData.map(d => d.value)) * 0.95), 
                    Math.ceil(Math.max(...impactVisualizationData.map(d => d.value)) * 1.05)
                  ]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name="Efficiency Impact (%)" 
                    stroke="#00BCD4" 
                    strokeWidth={3}
                    dot={{ r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      
      {/* Production Flow Visualization */}
      <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Production Flow Visualization</h2>
        
        {!results ? (
          <div className="text-center py-8 text-neutral-dark">
            <p>No data available for production flow visualization</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Process Flow */}
            <div>
              <h3 className="text-lg font-medium mb-3">Bottleneck Analysis</h3>
              <div className="h-80 w-full border border-neutral-medium rounded p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bottleneckData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70}/>
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="value" 
                      fill="#8884d8" 
                      background={{ fill: '#eee' }}
                      name="Operation Time (min)"
                    >
                      {bottleneckData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.bottleneck === 1 ? '#FF5722' : '#3F51B5'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-center">
                <span className="inline-block px-2 py-1 text-xs bg-primary text-white rounded mr-2">Standard</span>
                <span className="inline-block px-2 py-1 text-xs bg-secondary text-white rounded">Bottleneck</span>
              </div>
            </div>
            
            {/* Material Handling Breakdown */}
            <div>
              <h3 className="text-lg font-medium mb-3">Material Handling Breakdown</h3>
              <div className="h-80 w-full border border-neutral-medium rounded p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={materialHandlingData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={(entry) => entry.name}
                    >
                      {materialHandlingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Efficiency vs. Batch Size Analysis */}
            <div>
              <h3 className="text-lg font-medium mb-3">Efficiency Analysis</h3>
              <div className="h-80 w-full border border-neutral-medium rounded p-3">
                {results.styleResults.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="Cycle Time"
                        domain={[0, 'dataMax + 0.5']}
                        label={{ value: 'Cycle Time (min)', position: 'bottom' }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Operators"
                        domain={[0, 'dataMax + 5']}
                        label={{ value: 'Operators', angle: -90, position: 'left' }}
                      />
                      <ZAxis 
                        type="number" 
                        dataKey="z" 
                        range={[50, 400]} 
                        name="Output"
                      />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Legend />
                      <Scatter 
                        name="Style Efficiency" 
                        data={results.styleResults.map(style => ({
                          x: style.cycleTime,
                          y: style.operatorsRequired,
                          z: style.allocatedOutput / 100,
                          name: style.name
                        }))} 
                        fill="#3F51B5" 
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
