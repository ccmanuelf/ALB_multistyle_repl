import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

export default function EnhancedLineBalancing3() {
  // State for file upload and data
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [styles, setStyles] = useState<any[]>([]);
  const [activeStyleIndex, setActiveStyleIndex] = useState<number>(0);
  const [useSampleData, setUseSampleData] = useState<boolean>(true);
  
  // State for inputs
  const [totalHours, setTotalHours] = useState<number>(45);
  const [pfdFactor, setPfdFactor] = useState<number>(0.85);
  const [availableOperators, setAvailableOperators] = useState<number>(17);
  const [targetWeeklyOutput, setTargetWeeklyOutput] = useState<number>(1000);
  const [targetMode, setTargetMode] = useState<'operators' | 'output'>('operators');
  const [outputDistribution, setOutputDistribution] = useState<'balanced' | 'custom'>('balanced');
  
  // Batch processing parameters
  const [batchSize, setBatchSize] = useState<number>(12);
  const [batchSetupTime, setBatchSetupTime] = useState<number>(5);
  const [batchEfficiencyFactor, setBatchEfficiencyFactor] = useState<number>(10); // Percentage reduction
  
  // Material movement parameters
  const [movementTimePerOperation, setMovementTimePerOperation] = useState<number>(2); // In seconds
  
  // Material handling parameters
  const [materialHandlingOverhead, setMaterialHandlingOverhead] = useState<number>(15); // Percentage
  
  // State for results
  const [results, setResults] = useState<any>(null);
  
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
  const handleRemoveStyle = (indexToRemove: number) => {
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
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
          const styleOperations = results.data.map((row: any, index: number) => ({
            step: parseInt(row.Step) || index + 1,
            operation: row.Operation || `Operation ${index + 1}`,
            type: row.Type || 'Unknown',
            sam: parseFloat(row.SAM) || 0,
            isManual: row.Type === 'Manual'
          })).filter((op: any) => !isNaN(op.sam) && op.sam > 0);
          
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
        error: (error: Error) => {
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
        (max: any, op: any) => op.sam > max.sam ? op : max, 
        { sam: 0 }
      );
      
      // Count unique machines
      const uniqueMachines = new Set(
        style.operations.filter((op: any) => !op.isManual).map((op: any) => op.type)
      ).size;
      
      // Calculate total manual work content
      const manualOperations = style.operations.filter((op: any) => op.isManual);
      const manualWorkContent = manualOperations.reduce((sum: number, op: any) => sum + op.sam, 0);
      
      // Apply batch processing effects
      // 1. Distribution of setup time across the batch
      const setupTimePerUnit = batchSetupTime / batchSize;
      
      // 2. Efficiency improvement from batch processing (reduction in processing time)
      const batchEfficiencyMultiplier = 1 - (batchEfficiencyFactor / 100);
      const adjustedWorkContent = style.totalWorkContent * batchEfficiencyMultiplier;
      
      // 3. Calculate total work content with batch setup
      const batchProcessedWorkContent = adjustedWorkContent + setupTimePerUnit;
      
      // Apply material movement time
      // Calculate number of movements (operations - 1)
      const numMovements = style.operations.length - 1;
      // Convert movement time from seconds to minutes
      const movementTimeInMinutes = movementTimePerOperation / 60;
      // Total movement time
      const totalMovementTime = numMovements * movementTimeInMinutes;
      
      // Apply material handling overhead
      const handlingOverheadTime = batchProcessedWorkContent * (materialHandlingOverhead / 100);
      
      // Calculate the combined total work content
      const totalAdjustedWorkContent = batchProcessedWorkContent + totalMovementTime + handlingOverheadTime;
      
      return {
        ...style,
        bottleneckOperation,
        bottleneckTime: bottleneckOperation.sam,
        uniqueMachines,
        manualWorkContent,
        // Add new calculations
        originalWorkContent: style.totalWorkContent,
        batchSetupTimePerUnit: setupTimePerUnit,
        batchEfficiencyGain: style.totalWorkContent - adjustedWorkContent,
        batchProcessedWorkContent,
        totalMovementTime,
        handlingOverheadTime,
        totalAdjustedWorkContent
      };
    });
    
    let outputResults = [];
    let operatorResults = [];
    
    if (targetMode === 'operators') {
      // Given operators, calculate output
      const originalTotalWorkContent = calculations.reduce((sum, calc) => sum + calc.originalWorkContent, 0);
      const totalAdjustedWorkContent = calculations.reduce((sum, calc) => sum + calc.totalAdjustedWorkContent, 0);
      const totalOperators = availableOperators;
      
      // Calculate theoretical cycle time based on adjusted work content
      const theoreticalCycleTime = totalAdjustedWorkContent / totalOperators;
      
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
          operatorsRequired: Math.ceil(calc.totalAdjustedWorkContent / actualCycleTime)
        }));
      } else {
        // Custom distribution based on ratios
        const totalRatio = calculations.reduce((sum, calc) => sum + calc.customRatio, 0);
        outputResults = calculations.map(calc => ({
          ...calc,
          allocatedOutput: Math.floor(totalPossibleOutput * (calc.customRatio / totalRatio)),
          allocatedPercentage: (calc.customRatio / totalRatio) * 100,
          cycleTime: actualCycleTime,
          operatorsRequired: Math.ceil(calc.totalAdjustedWorkContent / actualCycleTime)
        }));
      }
      
      const totalAllocatedOutput = outputResults.reduce((sum, res) => sum + res.allocatedOutput, 0);
      const totalOperatorsRequired = outputResults.reduce((sum, res) => sum + res.operatorsRequired, 0);
      const efficiencyPercentage = (totalAdjustedWorkContent / (totalOperators * actualCycleTime)) * 100;
      
      // Calculate the impact of each factor
      const totalBatchEffect = calculations.reduce((sum, calc) => sum + calc.batchProcessedWorkContent - calc.originalWorkContent, 0);
      const totalMovementEffect = calculations.reduce((sum, calc) => sum + calc.totalMovementTime, 0);
      const totalHandlingEffect = calculations.reduce((sum, calc) => sum + calc.handlingOverheadTime, 0);
      
      setResults({
        originalWorkContent: originalTotalWorkContent,
        totalAdjustedWorkContent,
        availableOperators: totalOperators,
        theoreticalCycleTime,
        actualCycleTime,
        totalPossibleOutput,
        totalAllocatedOutput,
        totalOperatorsRequired: Math.min(totalOperatorsRequired, totalOperators),
        efficiency: efficiencyPercentage,
        styleResults: outputResults,
        calculationMode: 'operators-to-output',
        // Add impact factors
        batchProcessingImpact: totalBatchEffect,
        movementTimeImpact: totalMovementEffect,
        handlingOverheadImpact: totalHandlingEffect
      });
      
    } else {
      // Given output, calculate operators
      const totalTargetOutput = targetWeeklyOutput;
      const originalTotalWorkContent = calculations.reduce((sum, calc) => sum + calc.originalWorkContent, 0);
      const totalAdjustedWorkContent = calculations.reduce((sum, calc) => sum + calc.totalAdjustedWorkContent, 0);
      
      // Distribute output by style
      if (outputDistribution === 'balanced') {
        // Equal units per style
        const unitsPerStyle = Math.floor(totalTargetOutput / calculations.length);
        operatorResults = calculations.map(calc => {
          // Calculate required cycle time to meet output
          const requiredCycleTime = availableMinutes / unitsPerStyle;
          // Actual cycle time can't be less than the bottleneck
          const actualCycleTime = Math.max(requiredCycleTime, calc.bottleneckTime);
          // Calculate operators needed using adjusted work content
          const operatorsRequired = Math.ceil(calc.totalAdjustedWorkContent / actualCycleTime);
          
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
          // Calculate operators needed using adjusted work content
          const operatorsRequired = Math.ceil(calc.totalAdjustedWorkContent / actualCycleTime);
          
          return {
            ...calc,
            allocatedOutput: styleOutput,
            allocatedPercentage: (calc.customRatio / totalRatio) * 100,
            cycleTime: actualCycleTime,
            operatorsRequired
          };
        });
      }
      
      const totalOperatorsRequired = operatorResults.reduce((sum, res) => sum + res.operatorsRequired, 0);
      const totalAllocatedOutput = operatorResults.reduce((sum, res) => sum + res.allocatedOutput, 0);
      const weightedCycleTime = operatorResults.reduce((sum, res) => sum + res.cycleTime * res.allocatedOutput, 0) / totalAllocatedOutput;
      const efficiencyPercentage = (totalAdjustedWorkContent / (totalOperatorsRequired * weightedCycleTime)) * 100;
      
      // Calculate the impact of each factor
      const totalBatchEffect = calculations.reduce((sum, calc) => sum + calc.batchProcessedWorkContent - calc.originalWorkContent, 0);
      const totalMovementEffect = calculations.reduce((sum, calc) => sum + calc.totalMovementTime, 0);
      const totalHandlingEffect = calculations.reduce((sum, calc) => sum + calc.handlingOverheadTime, 0);
      
      setResults({
        originalWorkContent: originalTotalWorkContent,
        totalAdjustedWorkContent,
        targetWeeklyOutput: totalTargetOutput,
        totalAllocatedOutput,
        totalOperatorsRequired,
        efficiency: efficiencyPercentage,
        styleResults: operatorResults,
        calculationMode: 'output-to-operators',
        // Add impact factors
        batchProcessingImpact: totalBatchEffect,
        movementTimeImpact: totalMovementEffect,
        handlingOverheadImpact: totalHandlingEffect
      });
    }
  }, [styles, totalHours, pfdFactor, availableOperators, targetWeeklyOutput, targetMode, outputDistribution, 
    batchSize, batchSetupTime, batchEfficiencyFactor, movementTimePerOperation, materialHandlingOverhead]);
  
  // Recalculate when inputs change
  useEffect(() => {
    calculateLineBalancing();
  }, [calculateLineBalancing]);
  
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
  
  // Prepare data for distribution chart
  const prepareDistributionChart = () => {
    if (!results || !results.styleResults) return [];
    
    return results.styleResults.map((style: any) => ({
      name: style.name,
      output: style.allocatedOutput,
      operators: style.operatorsRequired,
      workContent: style.totalWorkContent
    }));
  };
  
  // Constants for styling
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  return (
    <div className="p-4 bg-gray-50 min-h-screen">
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
                      {styles[activeStyleIndex]?.operations.map((op: any, i: number) => (
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
      </div>
      
      {/* Parameters Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-3">Line Parameters</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Working Hours per Week
              </label>
              <input
                type="number"
                value={totalHours}
                onChange={(e) => setTotalHours(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                min="1"
                step="0.5"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PFD Factor (0.0 - 1.0)
              </label>
              <input
                type="number"
                value={pfdFactor}
                onChange={(e) => setPfdFactor(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                min="0.1"
                max="1.0"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">
                Personal, Fatigue, and Delay allowance
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calculation Mode
              </label>
              <div className="flex border rounded overflow-hidden">
                <button
                  className={`flex-1 py-2 ${targetMode === 'operators' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                  onClick={() => setTargetMode('operators')}
                >
                  Fixed Operators
                </button>
                <button
                  className={`flex-1 py-2 ${targetMode === 'output' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                  onClick={() => setTargetMode('output')}
                >
                  Fixed Output
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-3">
            {targetMode === 'operators' ? 'Operator Parameters' : 'Output Parameters'}
          </h3>
          
          <div className="space-y-4">
            {targetMode === 'operators' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Operators
                </label>
                <input
                  type="number"
                  value={availableOperators}
                  onChange={(e) => setAvailableOperators(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border rounded"
                  min="1"
                  step="1"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Weekly Output (units)
                </label>
                <input
                  type="number"
                  value={targetWeeklyOutput}
                  onChange={(e) => setTargetWeeklyOutput(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border rounded"
                  min="1"
                  step="1"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Distribution
              </label>
              <div className="flex border rounded overflow-hidden">
                <button
                  className={`flex-1 py-2 ${outputDistribution === 'balanced' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                  onClick={() => setOutputDistribution('balanced')}
                >
                  Balanced
                </button>
                <button
                  className={`flex-1 py-2 ${outputDistribution === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                  onClick={() => setOutputDistribution('custom')}
                >
                  Custom Ratios
                </button>
              </div>
            </div>
            
            {outputDistribution === 'custom' && styles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Style Ratios:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {styles.map((style, index) => (
                    <div key={index} className="flex items-center">
                      <span className="w-1/2 truncate">{style.name}:</span>
                      <input
                        type="number"
                        value={style.customRatio}
                        onChange={(e) => handleStyleRatioChange(index, e.target.value)}
                        className="w-16 p-1 border rounded ml-2"
                        min="0.1"
                        step="0.1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Results Section */}
      {results && (
        <div className="p-4 border rounded bg-white mb-8">
          <h3 className="text-lg font-semibold mb-3">Line Balancing Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-sm text-gray-600">Original Work Content</div>
              <div className="text-xl font-bold">{results.originalWorkContent.toFixed(2)} min</div>
            </div>
            
            <div className="p-3 bg-blue-100 rounded">
              <div className="text-sm text-gray-600">Adjusted Work Content</div>
              <div className="text-xl font-bold">{results.totalAdjustedWorkContent.toFixed(2)} min</div>
            </div>
            
            {results.calculationMode === 'operators-to-output' ? (
              <>
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-sm text-gray-600">Available Operators</div>
                  <div className="text-xl font-bold">{results.availableOperators}</div>
                </div>
                
                <div className="p-3 bg-purple-50 rounded">
                  <div className="text-sm text-gray-600">Total Output per Week</div>
                  <div className="text-xl font-bold">{results.totalAllocatedOutput} units</div>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-sm text-gray-600">Target Weekly Output</div>
                  <div className="text-xl font-bold">{results.targetWeeklyOutput} units</div>
                </div>
                
                <div className="p-3 bg-purple-50 rounded">
                  <div className="text-sm text-gray-600">Total Operators Required</div>
                  <div className="text-xl font-bold">{results.totalOperatorsRequired}</div>
                </div>
              </>
            )}
            
            <div className="p-3 bg-yellow-50 rounded">
              <div className="text-sm text-gray-600">Efficiency</div>
              <div className="text-xl font-bold">{results.efficiency.toFixed(2)}%</div>
            </div>
            
            {results.calculationMode === 'operators-to-output' && (
              <>
                <div className="p-3 bg-indigo-50 rounded">
                  <div className="text-sm text-gray-600">Theoretical Cycle Time</div>
                  <div className="text-xl font-bold">{results.theoreticalCycleTime.toFixed(2)} min</div>
                </div>
                
                <div className="p-3 bg-red-50 rounded">
                  <div className="text-sm text-gray-600">Actual Cycle Time</div>
                  <div className="text-xl font-bold">{results.actualCycleTime.toFixed(2)} min</div>
                </div>
              </>
            )}
          </div>
          
          {/* Style Results Table */}
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full table-auto text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Style</th>
                  <th className="p-2 text-right">Work Content (min)</th>
                  <th className="p-2 text-right">Output (units)</th>
                  <th className="p-2 text-right">Operators</th>
                  <th className="p-2 text-right">Cycle Time (min)</th>
                  <th className="p-2 text-right">Distribution %</th>
                </tr>
              </thead>
              <tbody>
                {results.styleResults.map((style: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="p-2 border-t">{style.name}</td>
                    <td className="p-2 border-t text-right">{style.totalAdjustedWorkContent.toFixed(2)}</td>
                    <td className="p-2 border-t text-right">{style.allocatedOutput}</td>
                    <td className="p-2 border-t text-right">{style.operatorsRequired}</td>
                    <td className="p-2 border-t text-right">{style.cycleTime.toFixed(2)}</td>
                    <td className="p-2 border-t text-right">{style.allocatedPercentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-80">
              <h4 className="text-sm font-medium mb-2">Output Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prepareDistributionChart()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="output" name="Output (units)" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="h-80">
              <h4 className="text-sm font-medium mb-2">Operator Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prepareDistributionChart()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="operators" name="Operators" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}