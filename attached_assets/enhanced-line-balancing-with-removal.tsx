import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';

const EnhancedLineBalancing = () => {
  // State for file upload and data
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [styles, setStyles] = useState([]);
  const [activeStyleIndex, setActiveStyleIndex] = useState(0);
  const [useSampleData, setUseSampleData] = useState(true);
  
  // State for inputs
  const [totalHours, setTotalHours] = useState(45);
  const [pfdFactor, setPfdFactor] = useState(0.85);
  const [availableOperators, setAvailableOperators] = useState(17);
  const [targetWeeklyOutput, setTargetWeeklyOutput] = useState(1000);
  const [targetMode, setTargetMode] = useState('operators'); // 'operators' or 'output'
  const [outputDistribution, setOutputDistribution] = useState('balanced'); // 'balanced' or 'custom'
  
  // State for results
  const [results, setResults] = useState(null);
  
  // Sample data for initial load
  const sampleJoggerData = [
    {step: 1, operation: 'Estampar etiqueta', type: 'Ink Transfer', sam: 0.429, isManual: false},
    {step: 2, operation: 'Estampar (Logo Cross)', type: 'Heat Press Transfer', sam: 0.45, isManual: false},
    {step: 3, operation: 'Cortar elástico', type: 'Guillotina Neumatica', sam: 0.083, isManual: false},
    {step: 40, operation: 'Unir laterales', type: 'Seaming Stitch 514', sam: 2.0, isManual: false},
    {step: 43, operation: 'Coser bolsas de cargo', type: 'S.N.L.S. 301', sam: 2.0, isManual: false},
    {step: 60, operation: 'Desehebrar e inspeccionar', type: 'Manual', sam: 2.0, isManual: true},
  ];
  
  // Initialize with sample data if useSampleData is true
  useEffect(() => {
    if (useSampleData) {
      setStyles([
        {
          name: 'Jogger Pants',
          operations: sampleJoggerData,
          customRatio: 1,
          totalWorkContent: sampleJoggerData.reduce((sum, op) => sum + op.sam, 0)
        }
      ]);
    }
  }, [useSampleData]);
  
  // Handle removing sample data
  const handleClearSampleData = () => {
    setUseSampleData(false);
    setStyles([]);
    setActiveStyleIndex(0);
  };
  
  // Handle removing a specific style
  const handleRemoveStyle = (indexToRemove) => {
    setStyles(prevStyles => {
      const newStyles = prevStyles.filter((_, index) => index !== indexToRemove);
      
      // Adjust active style index if needed
      if (activeStyleIndex >= newStyles.length) {
        setActiveStyleIndex(Math.max(0, newStyles.length - 1));
      } else if (activeStyleIndex === indexToRemove) {
        setActiveStyleIndex(Math.max(0, activeStyleIndex - 1));
      }
      
      return newStyles;
    });
  };
  
  // Handle file upload
  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const newUploadedFiles = Array.from(files);
    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    
    // If this is the first upload and sample data is still shown, clear it
    if (useSampleData && styles.length === 1 && styles[0].name === 'Jogger Pants') {
      setUseSampleData(false);
      setStyles([]);
    }
    
    // Process each file
    newUploadedFiles.forEach(file => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Process parsed CSV data
          const styleOperations = results.data.map((row, index) => ({
            step: parseInt(row.Step) || index + 1,
            operation: row.Operation || `Operation ${index + 1}`,
            type: row.Type || 'Unknown',
            sam: parseFloat(row.SAM) || 0,
            isManual: row.Type === 'Manual'
          })).filter(op => !isNaN(op.sam) && op.sam > 0);
          
          // Add new style
          const styleName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
          
          setStyles(prev => [
            ...prev, 
            {
              name: styleName,
              operations: styleOperations,
              customRatio: 1,
              totalWorkContent: styleOperations.reduce((sum, op) => sum + op.sam, 0)
            }
          ]);
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          alert(`Error parsing file ${file.name}: ${error.message}`);
        }
      });
    });
  };
  
  // Calculate line balancing
  const calculateLineBalancing = useCallback(() => {
    if (styles.length === 0) {
      setResults(null);
      return;
    }
    
    // Calculate available minutes
    const availableMinutes = totalHours * 60 * pfdFactor;
    
    const calculations = styles.map(style => {
      // Find the bottleneck operation
      const bottleneckOperation = style.operations.reduce(
        (max, op) => op.sam > max.sam ? op : max, 
        { sam: 0 }
      );
      
      // Count unique machines
      const uniqueMachines = new Set(
        style.operations.filter(op => !op.isManual).map(op => op.type)
      ).size;
      
      // Calculate total manual work content
      const manualOperations = style.operations.filter(op => op.isManual);
      const manualWorkContent = manualOperations.reduce((sum, op) => sum + op.sam, 0);
      
      return {
        ...style,
        bottleneckOperation,
        bottleneckTime: bottleneckOperation.sam,
        uniqueMachines,
        manualWorkContent
      };
    });
    
    let outputResults = [];
    let operatorResults = [];
    
    if (targetMode === 'operators') {
      // Given operators, calculate output
      const totalWorkContent = calculations.reduce((sum, calc) => sum + calc.totalWorkContent, 0);
      const totalOperators = availableOperators;
      
      // Calculate theoretical cycle time
      const theoreticalCycleTime = totalWorkContent / totalOperators;
      
      // Find the bottleneck across all styles
      const maxBottleneckTime = Math.max(...calculations.map(calc => calc.bottleneckTime));
      
      // Actual cycle time can't be less than the bottleneck
      const actualCycleTime = Math.max(theoreticalCycleTime, maxBottleneckTime);
      
      // Calculate total output
      const totalPossibleOutput = Math.floor(availableMinutes / actualCycleTime);
      
      // Distribute output by style
      if (outputDistribution === 'balanced') {
        // Equal units per style
        const unitsPerStyle = Math.floor(totalPossibleOutput / calculations.length);
        outputResults = calculations.map(calc => ({
          ...calc,
          allocatedOutput: unitsPerStyle,
          allocatedPercentage: 100 / calculations.length,
          cycleTime: actualCycleTime,
          operatorsRequired: Math.ceil(calc.totalWorkContent / actualCycleTime)
        }));
      } else {
        // Custom distribution based on ratios
        const totalRatio = calculations.reduce((sum, calc) => sum + calc.customRatio, 0);
        outputResults = calculations.map(calc => ({
          ...calc,
          allocatedOutput: Math.floor(totalPossibleOutput * (calc.customRatio / totalRatio)),
          allocatedPercentage: (calc.customRatio / totalRatio) * 100,
          cycleTime: actualCycleTime,
          operatorsRequired: Math.ceil(calc.totalWorkContent / actualCycleTime)
        }));
      }
      
      const totalAllocatedOutput = outputResults.reduce((sum, res) => sum + res.allocatedOutput, 0);
      const totalOperatorsRequired = outputResults.reduce((sum, res) => sum + res.operatorsRequired, 0);
      const efficiencyPercentage = (totalWorkContent / (totalOperators * actualCycleTime)) * 100;
      
      setResults({
        totalWorkContent,
        availableOperators: totalOperators,
        theoreticalCycleTime,
        actualCycleTime,
        totalPossibleOutput,
        totalAllocatedOutput,
        totalOperatorsRequired: Math.min(totalOperatorsRequired, totalOperators),
        efficiency: efficiencyPercentage,
        styleResults: outputResults,
        calculationMode: 'operators-to-output'
      });
      
    } else {
      // Given output, calculate operators
      const totalTargetOutput = targetWeeklyOutput;
      
      // Distribute output by style
      if (outputDistribution === 'balanced') {
        // Equal units per style
        const unitsPerStyle = Math.floor(totalTargetOutput / calculations.length);
        operatorResults = calculations.map(calc => {
          // Calculate required cycle time to meet output
          const requiredCycleTime = availableMinutes / unitsPerStyle;
          // Actual cycle time can't be less than the bottleneck
          const actualCycleTime = Math.max(requiredCycleTime, calc.bottleneckTime);
          // Calculate operators needed
          const operatorsRequired = Math.ceil(calc.totalWorkContent / actualCycleTime);
          
          return {
            ...calc,
            allocatedOutput: unitsPerStyle,
            allocatedPercentage: 100 / calculations.length,
            cycleTime: actualCycleTime,
            operatorsRequired
          };
        });
      } else {
        // Custom distribution based on ratios
        const totalRatio = calculations.reduce((sum, calc) => sum + calc.customRatio, 0);
        operatorResults = calculations.map(calc => {
          const styleOutput = Math.floor(totalTargetOutput * (calc.customRatio / totalRatio));
          // Calculate required cycle time to meet output
          const requiredCycleTime = availableMinutes / styleOutput;
          // Actual cycle time can't be less than the bottleneck
          const actualCycleTime = Math.max(requiredCycleTime, calc.bottleneckTime);
          // Calculate operators needed
          const operatorsRequired = Math.ceil(calc.totalWorkContent / actualCycleTime);
          
          return {
            ...calc,
            allocatedOutput: styleOutput,
            allocatedPercentage: (calc.customRatio / totalRatio) * 100,
            cycleTime: actualCycleTime,
            operatorsRequired
          };
        });
      }
      
      const totalWorkContent = calculations.reduce((sum, calc) => sum + calc.totalWorkContent, 0);
      const totalOperatorsRequired = operatorResults.reduce((sum, res) => sum + res.operatorsRequired, 0);
      const totalAllocatedOutput = operatorResults.reduce((sum, res) => sum + res.allocatedOutput, 0);
      const weightedCycleTime = operatorResults.reduce((sum, res) => sum + res.cycleTime * res.allocatedOutput, 0) / totalAllocatedOutput;
      const efficiencyPercentage = (totalWorkContent / (totalOperatorsRequired * weightedCycleTime)) * 100;
      
      setResults({
        totalWorkContent,
        targetWeeklyOutput: totalTargetOutput,
        totalAllocatedOutput,
        totalOperatorsRequired,
        efficiency: efficiencyPercentage,
        styleResults: operatorResults,
        calculationMode: 'output-to-operators'
      });
    }
  }, [styles, totalHours, pfdFactor, availableOperators, targetWeeklyOutput, targetMode, outputDistribution]);
  
  // Recalculate when inputs change
  useEffect(() => {
    calculateLineBalancing();
  }, [calculateLineBalancing]);
  
  // Handle style ratio change
  const handleStyleRatioChange = (index, newRatio) => {
    setStyles(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        customRatio: parseFloat(newRatio) || 1
      };
      return updated;
    });
  };
  
  // Prepare data for distribution chart
  const prepareDistributionChart = () => {
    if (!results || !results.styleResults) return [];
    
    return results.styleResults.map(style => ({
      name: style.name,
      output: style.allocatedOutput,
      operators: style.operatorsRequired,
      workContent: style.totalWorkContent
    }));
  };
  
  // Constants for styling
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  return (
    <div className="p-4 bg-gray-50">
      <h2 className="text-2xl font-bold mb-6">Enhanced Assembly Line Balancing Tool</h2>
      
      {/* File Upload Section */}
      <div className="mb-8 p-4 border rounded bg-white">
        <h3 className="text-lg font-semibold mb-3">Style Data Import</h3>
        <p className="mb-4 text-sm text-gray-600">
          Upload CSV files with operation data. Each file should contain columns for Step, Operation, Type, and SAM.
        </p>
        
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileUpload}
            className="p-2 border rounded"
          />
          <span className="text-sm text-gray-500">
            {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) uploaded` : 'No files uploaded'}
          </span>
          
          {useSampleData && styles.length > 0 && (
            <button
              onClick={handleClearSampleData}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Remove Sample Data
            </button>
          )}
        </div>
        
        {/* Style Tabs */}
        {styles.length > 0 && (
          <div className="mt-6">
            <div className="border-b flex flex-wrap">
              {styles.map((style, index) => (
                <div key={index} className="relative">
                  <button
                    className={`py-2 px-4 mr-2 ${
                      index === activeStyleIndex 
                        ? 'border-b-2 border-blue-500 font-semibold' 
                        : 'text-gray-500'
                    }`}
                    onClick={() => setActiveStyleIndex(index)}
                  >
                    {style.name} ({style.operations.length} ops)
                  </button>
                  <button
                    className="absolute top-0 right-0 text-red-500 font-bold p-1 text-xs rounded-full hover:bg-red-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveStyle(index);
                    }}
                    title="Remove style"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            
            {/* Active Style Details */}
            {styles.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold">
                  {styles[activeStyleIndex]?.name} Details:
                </h4>
                <p>
                  Total Operations: {styles[activeStyleIndex]?.operations.length} |
                  Total Work Content: {styles[activeStyleIndex]?.totalWorkContent.toFixed(2)} min
                </p>
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <table className="min-w-full table-auto text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Step</th>
                        <th className="p-2 text-left">Operation</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-right">SAM (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {styles[activeStyleIndex]?.operations.map((op, i) => (
                        <tr key={i} className={op.sam >= 1 ? 'bg-yellow-50' : ''}>
                          <td className="p-2 border-t">{op.step}</td>
                          <td className="p-2 border-t">{op.operation}</td>
                          <td className="p-2 border-t">{op.type}</td>
                          <td className="p-2 border-t text-right">{op.sam.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        
        {styles.length === 0 && (
          <div className="my-6 p-4 bg-yellow-50 rounded">
            <p className="text-amber-700">
              No styles loaded. Please upload a CSV file or enable the sample data to continue.
            </p>
            {!useSampleData && (
              <button
                onClick={() => setUseSampleData(true)}
                className="mt-2 px-3 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
              >
                Load Sample Data
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Input Parameters Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-3">Production Parameters</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Total Hours per Week:</label>
              <input
                type="number"
                min="1"
                value={totalHours}
                onChange={(e) => setTotalHours(Number(e.target.value))}
                className="w-full p-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">Hours of operation per week</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">PFD Factor:</label>
              <input
                type="number"
                min="0.1"
                max="1"
                step="0.01"
                value={pfdFactor}
                onChange={(e) => setPfdFactor(Number(e.target.value))}
                className="w-full p-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">Efficiency factor (0.85 = 85% efficient)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Calculation Mode:</label>
              <select
                value={targetMode}
                onChange={(e) => setTargetMode(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="operators">Calculate Output from Operators</option>
                <option value="output">Calculate Operators from Output</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Output Distribution:</label>
              <select
                value={outputDistribution}
                onChange={(e) => setOutputDistribution(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="balanced">Balanced (Equal Units)</option>
                <option value="custom">Custom Ratio</option>
              </select>
            </div>
            
            {targetMode === 'operators' ? (
              <div>
                <label className="block text-sm font-medium mb-1">Available Operators:</label>
                <input
                  type="number"
                  min="1"
                  value={availableOperators}
                  onChange={(e) => setAvailableOperators(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">Total operators available</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Target Weekly Output:</label>
                <input
                  type="number"
                  min="1"
                  value={targetWeeklyOutput}
                  onChange={(e) => setTargetWeeklyOutput(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">Units to produce per week</p>
              </div>
            )}
          </div>
          
          {outputDistribution === 'custom' && styles.length > 1 && (
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-2">Style Production Ratios:</h4>
              <div className="space-y-2">
                {styles.map((style, index) => (
                  <div key={index} className="flex items-center">
                    <span className="w-1/3 text-sm">{style.name}:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={style.customRatio}
                      onChange={(e) => handleStyleRatioChange(index, e.target.value)}
                      className="w-20 p-1 border rounded text-right"
                    />
                    <span className="ml-2 text-sm text-gray-500">
                      {styles.reduce((sum, s) => sum + s.customRatio, 0) > 0 
                        ? `${(style.customRatio / styles.reduce((sum, s) => sum + s.customRatio, 0) * 100).toFixed(1)}%` 
                        : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {results && (
          <div className="p-4 border rounded bg-white">
            <h3 className="text-lg font-semibold mb-3">Calculation Results</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {results.calculationMode === 'operators-to-output' ? (
                <>
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="text-sm font-medium">Available Operators:</div>
                    <div className="text-xl font-bold">{results.availableOperators}</div>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <div className="text-sm font-medium">Weekly Output:</div>
                    <div className="text-xl font-bold">{results.totalAllocatedOutput.toLocaleString()} units</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="text-sm font-medium">Target Output:</div>
                    <div className="text-xl font-bold">{results.targetWeeklyOutput.toLocaleString()} units</div>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <div className="text-sm font-medium">Operators Required:</div>
                    <div className="text-xl font-bold">{results.totalOperatorsRequired}</div>
                  </div>
                </>
              )}
              
              <div className="p-2 bg-purple-50 rounded">
                <div className="text-sm font-medium">Cycle Time:</div>
                <div className="text-xl font-bold">
                  {results.calculationMode === 'operators-to-output' 
                    ? results.actualCycleTime.toFixed(2) 
                    : (results.styleResults.reduce((sum, style) => sum + style.cycleTime, 0) / results.styleResults.length).toFixed(2)} min
                </div>
              </div>
              
              <div className="p-2 bg-yellow-50 rounded">
                <div className="text-sm font-medium">Line Efficiency:</div>
                <div className="text-xl font-bold">{results.efficiency.toFixed(1)}%</div>
              </div>
              
              <div className="p-2 bg-indigo-50 rounded">
                <div className="text-sm font-medium">Total Work Content:</div>
                <div className="text-xl font-bold">{results.totalWorkContent.toFixed(2)} min</div>
              </div>
              
              <div className="p-2 bg-red-50 rounded">
                <div className="text-sm font-medium">Available Production Minutes:</div>
                <div className="text-xl font-bold">
                  {(totalHours * 60 * pfdFactor).toLocaleString()} min/week
                </div>
              </div>
            </div>
            
            {/* Style-specific results */}
            {results.styleResults && results.styleResults.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Style Breakdown:</h4>
                <table className="min-w-full table-auto text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Style</th>
                      <th className="p-2 text-right">Output</th>
                      <th className="p-2 text-right">Percentage</th>
                      <th className="p-2 text-right">Operators</th>
                      <th className="p-2 text-right">Cycle Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.styleResults.map((style, index) => (
                      <tr key={index}>
                        <td className="p-2 border-t">{style.name}</td>
                        <td className="p-2 border-t text-right">{style.allocatedOutput.toLocaleString()}</td>
                        <td className="p-2 border-t text-right">{style.allocatedPercentage.toFixed(1)}%</td>
                        <td className="p-2 border-t text-right">{style.operatorsRequired}</td>
                        <td className="p-2 border-t text-right">{style.cycleTime.toFixed(2)} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Visualization Section */}
      {results && results.styleResults && results.styleResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Output Distribution Chart */}
          <div className="p-4 border rounded bg-white">
            <h3 className="text-lg font-semibold mb-3">Style Output Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepareDistributionChart()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="output" name="Weekly Output" fill="#0088FE" />
                <Bar yAxisId="right" dataKey="operators" name="Operators Required" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Work Content Distribution */}
          <div className="p-4 border rounded bg-white">
            <h3 className="text-lg font-semibold mb-3">Style Work Content Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prepareDistributionChart()}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="workContent"
                  nameKey="name"
                  label={({name, workContent, percent}) => 
                    `${name}: ${workContent.toFixed(1)} min (${(percent * 100).toFixed(0)}%)`}
                >
                  {prepareDistributionChart().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(2)} minutes`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Explanation Section */}
      <div className="p-4 border rounded bg-white mb-6">
        <h3 className="text-lg font-semibold mb-3">Understanding the Calculations</h3>
        
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium">Total Work Content</h4>
            <p>The sum of all Standard Allowed Minutes (SAM) required to produce one complete garment.</p>
            <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
              Total Work Content = Σ(SAM for all operations)
            </div>
          </div>
          
          <div>
            <h4 className="font-medium">Cycle Time</h4>
            <p>The maximum time at any workstation, which determines how often a unit can be completed.</p>
            <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
              Theoretical Cycle Time = Total Work Content / Available Operators<br />
              Actual Cycle Time = max(Theoretical Cycle Time, Bottleneck Operation Time)
            </div>
          </div>
          
          <div>
            <h4 className="font-medium">Weekly Output</h4>
            <p>The number of units that can be produced in a week based on available time and cycle time.</p>
            <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
              Weekly Output = Available Minutes per Week / Cycle Time
            </div>
            <p className="mt-1">Where Available Minutes = Total Hours × 60 × PFD Factor</p>
          </div>
          
          <div>
            <h4 className="font-medium">Line Efficiency</h4>
            <p>A measure of how well the work is balanced across operators.</p>
            <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
              Efficiency = (Total Work Content / (Number of Operators × Cycle Time)) × 100%
            </div>
          </div>
          
          <div>
            <h4 className="font-medium">Multiple Styles Balancing</h4>
            <p>When balancing multiple styles, we can either:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>Distribute output evenly across styles ("Balanced" option)</li>
              <li>Distribute output according to custom ratios ("Custom Ratio" option)</li>
            </ul>
            <p className="mt-1">The tool calculates operator requirements for each style separately, then combines them for the total.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedLineBalancing;
