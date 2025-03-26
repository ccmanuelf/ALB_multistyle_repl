import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Colors for the operator allocation chart
const OPERATOR_COLORS = [
  '#3b82f6', '#f97316', '#10b981', '#6366f1', '#f59e0b', '#14b8a6', 
  '#8b5cf6', '#ec4899', '#ef4444', '#0ea5e9', '#64748b', '#84cc16',
  '#d946ef', '#f43f5e', '#0284c7', '#4f46e5', '#be123c', '#166534'
];

// Function to generate recommendations based on line balancing results
// Compare automatic versus manual allocation efficiency
function compareAllocations(styleResult: any) {
  // Calculate automatic allocation efficiency
  const automaticOperators = calculateOperatorWorkload(
    calculateOperatorAllocation(styleResult, styleResult.cycleTime),
    styleResult.cycleTime
  );
  
  const automaticAvgUtilization = automaticOperators.reduce((sum, op) => sum + op.utilized, 0) / automaticOperators.length;
  const automaticUtilizationVariance = automaticOperators.reduce(
    (sum, op) => sum + Math.pow(op.utilized - automaticAvgUtilization, 2), 0
  ) / automaticOperators.length;
  
  // Create a workload balance score (0-100) where 100 is perfect balance
  const automaticBalanceScore = 100 - (Math.sqrt(automaticUtilizationVariance) * 2);
  
  // Calculate manual allocation
  const manualOperators = calculateManualAllocation(styleResult);
  
  const manualAvgUtilization = manualOperators.reduce((sum, op) => sum + op.utilized, 0) / manualOperators.length;
  const manualUtilizationVariance = manualOperators.reduce(
    (sum, op) => sum + Math.pow(op.utilized - manualAvgUtilization, 2), 0
  ) / manualOperators.length;
  
  const manualBalanceScore = 100 - (Math.sqrt(manualUtilizationVariance) * 2);
  
  return {
    automatic: {
      efficiency: automaticAvgUtilization,
      workloadBalance: automaticBalanceScore
    },
    manual: {
      efficiency: manualAvgUtilization,
      workloadBalance: manualBalanceScore
    }
  };
}

// Calculate operator allocation based on manual assignments
function calculateManualAllocation(styleResult: any) {
  const styleIdx = activeStyleIndex!.toString();
  const cycleTime = styleResult.cycleTime;
  
  // Find the highest operator number assigned
  let maxOperator = 0;
  if (manualAssignments[styleIdx]) {
    Object.values(manualAssignments[styleIdx]).forEach(opNumber => {
      maxOperator = Math.max(maxOperator, Number(opNumber));
    });
  }
  
  // Initialize operators array
  const operators: Operator[] = Array.from({length: maxOperator}, (_, idx) => ({
    id: idx + 1,
    name: `Operator ${idx + 1}`,
    skills: [],
    utilized: 0,
    workload: 0,
    operations: []
  }));
  
  // Assign operations to operators
  styleResult.operations.forEach((op: any) => {
    const stepStr = op.step.toString();
    let opNumber = 1; // Default to first operator
    
    if (manualAssignments[styleIdx] && manualAssignments[styleIdx][stepStr]) {
      opNumber = manualAssignments[styleIdx][stepStr];
    }
    
    // Ensure operator exists (might need to expand array)
    if (opNumber > operators.length) {
      for (let i = operators.length + 1; i <= opNumber; i++) {
        operators.push({
          id: i,
          name: `Operator ${i}`,
          skills: [],
          utilized: 0,
          workload: 0,
          operations: []
        });
      }
    }
    
    // Assign operation to operator
    const opIndex = opNumber - 1;
    operators[opIndex].operations.push(op.step);
    operators[opIndex].workload += op.sam;
    operators[opIndex].utilized = (operators[opIndex].workload / cycleTime) * 100;
  });
  
  return operators;
}

function generateRecommendations() {
  const recommendations: string[] = [];
  
  // Add default recommendations if no results available
  if (!results) {
    return [
      "Run calculations to see personalized recommendations for your production line.",
      "Consider batch sizes of 10-20 units for optimal efficiency balance."
    ];
  }
  
  // Efficiency recommendation
  if (results.efficiency < 75) {
    recommendations.push(
      `Current line efficiency is ${results.efficiency.toFixed(1)}%. Consider redistributing operations to balance workload across operators and reduce idle time.`
    );
  } else if (results.efficiency >= 90) {
    recommendations.push(
      `Excellent line efficiency at ${results.efficiency.toFixed(1)}%. Current operation distribution is well optimized, though careful monitoring is recommended to maintain this level.`
    );
  } else {
    recommendations.push(
      `Good line efficiency at ${results.efficiency.toFixed(1)}%. Small improvements could be made by fine-tuning operation assignments to reduce remaining idle time.`
    );
  }
  
  // Batch processing recommendation
  if (results.batchProcessingImpact > 0.15) {
    recommendations.push(
      `Batch processing is adding ${(results.batchProcessingImpact * 100).toFixed(1)}% to your total work content. Consider reducing batch size or optimizing setup procedures to minimize this impact.`
    );
  }
  
  // Movement time recommendation
  if (results.movementTimeImpact > 0.1) {
    recommendations.push(
      `Material movement between operations accounts for ${(results.movementTimeImpact * 100).toFixed(1)}% of total work content. Consider reorganizing workstations to minimize travel distances.`
    );
  }
  
  // Material handling recommendation
  if (results.handlingOverheadImpact > 0.12) {
    recommendations.push(
      `Material handling overhead is significant at ${(results.handlingOverheadImpact * 100).toFixed(1)}% of work content. Implementing improved material presentation methods could reduce this overhead.`
    );
  }
  
  // Bottleneck recommendation
  if (results.styleResults.length > 0) {
    const bottlenecks = results.styleResults
      .filter(style => style.bottleneckOperation && style.bottleneckTime > 0)
      .map(style => ({
        styleName: style.name,
        operation: style.bottleneckOperation,
        time: style.bottleneckTime
      }));
    
    if (bottlenecks.length > 0) {
      const worstBottleneck = bottlenecks.reduce((prev, current) => 
        current.time > prev.time ? current : prev, bottlenecks[0]);
      
      recommendations.push(
        `Bottleneck identified in "${worstBottleneck.styleName}" at step ${worstBottleneck.operation.step} - "${worstBottleneck.operation.operation}" (${worstBottleneck.time.toFixed(2)} min). Consider splitting this operation or adding additional operators.`
      );
    }
  }
  
  // General productivity improvement suggestion
  recommendations.push(
    "Consider implementing a continuous improvement program focused on reducing non-value-added time in the production process."
  );
  
  return recommendations;
}

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
  
  // Shift parameters
  const [shiftsPerDay, setShiftsPerDay] = useState<number>(1);
  const [shiftHours, setShiftHours] = useState<number[]>([9, 8, 7]); // Hours per shift: [1st, 2nd, 3rd]
  const [selectiveOperations, setSelectiveOperations] = useState<boolean>(false);
  const [selectedOperations, setSelectedOperations] = useState<{[styleIndex: string]: {[operationId: string]: boolean}}>({});
  
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
  
  // State for operator management
  const [operators, setOperators] = useState<Operator[]>([]);
  const [manualAssignments, setManualAssignments] = useState<{[styleIndex: string]: {[operationStep: string]: number}}>({});
  const [assignmentMode, setAssignmentMode] = useState<'automatic' | 'manual'>('automatic');
  const [allocationComparison, setAllocationComparison] = useState<{
    automatic: {efficiency: number, workloadBalance: number},
    manual: {efficiency: number, workloadBalance: number}
  } | null>(null);
  
  // Interface definitions
  interface Operator {
    id: number;
    name: string;
    skills: string[];
    utilized: number; // Percentage of operator's time used (0-100)
    workload: number; // Time allocated in minutes
    operations: number[]; // Step numbers of operations assigned
  }

  interface OperationAllocation {
    step: number;
    operation: string;
    type: string;
    sam: number;
    operatorNumber: number;
    startTime: number;
    endTime: number;
    isManuallyAssigned?: boolean; // Flag to indicate if this was manually assigned
  }
  
  // Initialize operators based on calculation results
  const initializeOperators = useCallback((requiredOperators: number) => {
    // Create default operators with sequential IDs and names
    const newOperators: Operator[] = [];
    for (let i = 1; i <= requiredOperators; i++) {
      newOperators.push({
        id: i,
        name: `Operator ${i}`,
        skills: [],
        utilized: 0, // Will be calculated later
        workload: 0, // Will be calculated later
        operations: []
      });
    }
    setOperators(newOperators);
    return newOperators;
  }, []);
  
  // Calculate operator allocation based on style and cycle time
  const calculateOperatorAllocation = (style: any, cycleTime: number, useManualAssignment = false): OperationAllocation[] => {
    if (!style || !style.operations) return [];
    
    const operations = [...style.operations].sort((a, b) => a.step - b.step);
    const result: OperationAllocation[] = [];
    let currentOperator = 1;
    let currentTime = 0;
    
    for (const op of operations) {
      // Check if we have a manual assignment for this operation
      if (useManualAssignment && manualAssignments[activeStyleIndex] && 
          manualAssignments[activeStyleIndex][op.step]) {
        // Use manually assigned operator
        const assignedOperator = manualAssignments[activeStyleIndex][op.step];
        result.push({
          step: op.step,
          operation: op.operation,
          type: op.type,
          sam: op.sam,
          operatorNumber: assignedOperator,
          startTime: 0, // Will be calculated later
          endTime: op.sam,
          isManuallyAssigned: true
        });
      } else {
        // Use automatic allocation
        if (currentTime + op.sam > cycleTime) {
          // Move to next operator
          currentOperator++;
          currentTime = 0;
        }
        
        result.push({
          step: op.step,
          operation: op.operation,
          type: op.type,
          sam: op.sam,
          operatorNumber: currentOperator,
          startTime: currentTime,
          endTime: currentTime + op.sam
        });
        
        currentTime += op.sam;
      }
    }
    
    // If using manual assignments, calculate proper start/end times within each operator
    if (useManualAssignment) {
      // Group by operator
      const operatorGroups: {[key: number]: OperationAllocation[]} = {};
      
      for (const alloc of result) {
        if (!operatorGroups[alloc.operatorNumber]) {
          operatorGroups[alloc.operatorNumber] = [];
        }
        operatorGroups[alloc.operatorNumber].push(alloc);
      }
      
      // Calculate sequential timing for each operator's operations
      for (const opNum in operatorGroups) {
        let opTime = 0;
        for (const alloc of operatorGroups[opNum]) {
          alloc.startTime = opTime;
          alloc.endTime = opTime + alloc.sam;
          opTime += alloc.sam;
        }
      }
    }
    
    return result;
  };

  // Calculate workload for each operator based on allocations
  const calculateOperatorWorkload = (allocation: OperationAllocation[], cycleTime: number): Operator[] => {
    if (!allocation || allocation.length === 0) return [];
    
    // Group operations by operator
    const operatorMap: {[key: number]: Operator} = {};
    
    for (const op of allocation) {
      if (!operatorMap[op.operatorNumber]) {
        operatorMap[op.operatorNumber] = {
          id: op.operatorNumber,
          name: `Operator ${op.operatorNumber}`,
          skills: [],
          utilized: 0,
          workload: 0,
          operations: []
        };
      }
      
      // Add operation to this operator
      operatorMap[op.operatorNumber].workload += op.sam;
      operatorMap[op.operatorNumber].operations.push(op.step);
    }
    
    // Calculate utilization percentage
    const operators = Object.values(operatorMap);
    for (const op of operators) {
      op.utilized = (op.workload / cycleTime) * 100;
    }
    
    // Sort by operator ID
    return operators.sort((a, b) => a.id - b.id);
  };
  
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
          const styleOperations = results.data.map((row: any, index: number) => {
            const sam = parseFloat(row.SAM) || 0;
            return {
              step: parseInt(row.Step) || index + 1,
              operation: row.Operation || `Operation ${index + 1}`,
              type: row.Type || 'Unknown',
              sam: sam,
              originalSam: sam, // Store original SAM
              skillLevel: 100, // Default to 100% skill level
              isManual: row.Type === 'Manual'
            };
          }).filter((op: any) => !isNaN(op.sam) && op.sam > 0);
          
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
    
    // Calculate available minutes based on shifts
    let availableMinutes;
    
    if (shiftsPerDay === 1) {
      // Single shift (standard calculation)
      availableMinutes = totalHours * 60 * pfdFactor;
    } else {
      // Multiple shifts
      // Get hours from each active shift
      const totalShiftHours = shiftHours.slice(0, shiftsPerDay).reduce((sum, hours) => sum + hours, 0) * 5; // 5 days per week
      availableMinutes = totalShiftHours * 60 * pfdFactor;
    }
    
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
    batchSize, batchSetupTime, batchEfficiencyFactor, movementTimePerOperation, materialHandlingOverhead,
    shiftsPerDay, shiftHours, selectiveOperations, selectedOperations]);
  
  // Recalculate when inputs change
  useEffect(() => {
    calculateLineBalancing();
  }, [calculateLineBalancing]);
  
  // Initialize operators when results change
  useEffect(() => {
    if (results && results.styleResults && results.styleResults.length > 0) {
      const totalOperators = results.totalOperatorsRequired || 
        results.styleResults.reduce((sum: number, style: any) => sum + style.operatorsRequired, 0);
      
      // Initialize operators
      initializeOperators(totalOperators);
      
      // Reset manual assignments if needed
      if (!manualAssignments[activeStyleIndex]) {
        setManualAssignments({
          ...manualAssignments,
          [activeStyleIndex]: {}
        });
      }
      
      // Calculate comparison metrics if in manual assignment mode
      if (assignmentMode === 'manual' && results.styleResults[activeStyleIndex]) {
        const comparison = compareAllocations(results.styleResults[activeStyleIndex]);
        setAllocationComparison(comparison);
      }
    }
  }, [results, initializeOperators, activeStyleIndex, assignmentMode, manualAssignments]);
  
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
      workContent: style.totalAdjustedWorkContent
    }));
  };
  
  // Prepare data for factor impact chart
  const prepareFactorImpactChart = () => {
    if (!results) return [];
    
    return [
      {
        name: 'Original',
        value: results.originalWorkContent || 0
      },
      {
        name: 'Batch Processing',
        value: results.batchProcessingImpact || 0
      },
      {
        name: 'Material Movement',
        value: results.movementTimeImpact || 0
      },
      {
        name: 'Material Handling',
        value: results.handlingOverheadImpact || 0
      }
    ];
  };
  
  // Define interfaces for the operator allocation system
  interface Operator {
    id: number;
    name: string;
    skills: string[];
    utilized: number; // Percentage of operator's time used (0-100)
    workload: number; // Time allocated in minutes
    operations: number[]; // Step numbers of operations assigned
  }

  interface OperationAllocation {
    step: number;
    operation: string;
    type: string;
    sam: number;
    operatorNumber: number;
    startTime: number;
    endTime: number;
    isManuallyAssigned?: boolean; // Flag to indicate if this was manually assigned
  }

  // Calculate workload balance (standard deviation of workload as percentage)
  const calculateWorkloadBalance = (operatorsWithWorkload: Operator[], cycleTime: number): number => {
    if (operatorsWithWorkload.length === 0) return 0;
    
    // Calculate utilization percentages
    const utilizations = operatorsWithWorkload.map(op => (op.workload / cycleTime) * 100);
    
    // Calculate mean
    const mean = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
    
    // Calculate standard deviation
    const squaredDiffs = utilizations.map(u => Math.pow(u - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / utilizations.length;
    const stdDev = Math.sqrt(variance);
    
    // Return balance score (100 - stdDev)
    // Higher is better (100 = perfect balance, lower numbers = imbalance)
    return Math.max(0, 100 - stdDev);
  };

  // Calculate operator allocation for a specific style is already defined above
  
  // Calculate operator workload from allocation is already defined above
  
  // Compare automatic vs manual allocation efficiency
  const compareAllocations = (style: any) => {
    if (!style) return null;
    
    const cycleTime = style.cycleTime;
    
    // Get automatic allocation
    const autoAllocation = calculateOperatorAllocation(style, cycleTime, false);
    const autoOperators = calculateOperatorWorkload(autoAllocation, cycleTime);
    const autoBalance = calculateWorkloadBalance(autoOperators, cycleTime);
    
    // Get manual allocation
    const manualAllocation = calculateOperatorAllocation(style, cycleTime, true);
    const manualOperators = calculateOperatorWorkload(manualAllocation, cycleTime);
    const manualBalance = calculateWorkloadBalance(manualOperators, cycleTime);
    
    // Calculate efficiency for each (actual work content / total possible work content)
    const autoEfficiency = (style.totalAdjustedWorkContent / (autoOperators.length * cycleTime)) * 100;
    const manualEfficiency = (style.totalAdjustedWorkContent / (manualOperators.length * cycleTime)) * 100;
    
    return {
      automatic: {
        efficiency: autoEfficiency,
        workloadBalance: autoBalance
      },
      manual: {
        efficiency: manualEfficiency,
        workloadBalance: manualBalance
      }
    };
  };
  
  // Calculate hourly production
  const calculateHourlyProduction = (style: any, cycleTime: number) => {
    if (!cycleTime) return 0;
    
    // Units per hour = 60 minutes / cycle time
    return Math.floor(60 / cycleTime);
  };
  
  // Calculate total daily hours based on shift configuration
  const calculateDailyHours = () => {
    // Always use the actual hours from the shift configuration
    return shiftHours.slice(0, shiftsPerDay).reduce((sum, hours) => sum + hours, 0);
  };
  
  // Constants for styling
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // Reference for PDF export
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Function to generate recommendations based on results
  const generateRecommendations = () => {
    if (!results) return [];
    
    const recommendations = [];
    
    // Check efficiency
    if (results.efficiency < 70) {
      recommendations.push("Line efficiency is below 70%. Consider rebalancing operations across operators.");
    }
    
    // Check bottlenecks
    if (results.styleResults && results.styleResults.length > 0) {
      const bottlenecks = results.styleResults
        .map((style: any) => style.bottleneckOperation)
        .filter((op: any) => op.sam > results.actualCycleTime * 0.8);
      
      if (bottlenecks.length > 0) {
        recommendations.push(`Critical bottlenecks detected: ${bottlenecks.map((op: any) => op.operation).join(', ')}. Consider breaking down these operations.`);
      }
    }
    
    // Check multi-shift operations
    if (shiftsPerDay > 1 && selectiveOperations) {
      const multiShiftOpsCount = Object.values(selectedOperations).reduce((count, styleOps: any) => {
        return count + Object.values(styleOps).filter(Boolean).length;
      }, 0);
      
      if (multiShiftOpsCount === 0) {
        recommendations.push("No operations selected for multi-shift processing. Consider selecting key operations to run across multiple shifts.");
      }
    }
    
    // Check operator balance
    if (results.styleResults && results.styleResults.length > 0) {
      const styleWithMostOperators = results.styleResults.reduce(
        (max: any, style: any) => style.operatorsRequired > max.operatorsRequired ? style : max, 
        { operatorsRequired: 0 }
      );
      
      if (styleWithMostOperators.operatorsRequired > 0) {
        recommendations.push(`Style '${styleWithMostOperators.name}' requires the most operators (${styleWithMostOperators.operatorsRequired}). Ensure proper training and resource allocation.`);
      }
    }
    
    return recommendations.length > 0 ? recommendations : ["Production line is well-balanced with no critical issues detected."];
  };
  
  // Function to export results as PDF
  const exportPDF = async () => {
    if (!results || !resultsRef.current) return;
    
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    
    // Add title
    pdf.setFontSize(18);
    pdf.text('Line Balancing Analysis Report', 105, 15, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });
    
    // Add summary section
    pdf.setFontSize(14);
    pdf.text('Summary', 14, 30);
    pdf.setFontSize(10);
    pdf.text(`Total Work Content: ${results.totalAdjustedWorkContent.toFixed(2)} minutes`, 14, 38);
    pdf.text(`Efficiency: ${results.efficiency.toFixed(2)}%`, 14, 44);
    
    if (results.calculationMode === 'operators-to-output') {
      pdf.text(`Available Operators: ${results.availableOperators}`, 14, 50);
      pdf.text(`Total Output per Week: ${results.totalAllocatedOutput} units`, 14, 56);
    } else {
      pdf.text(`Target Output per Week: ${results.targetWeeklyOutput} units`, 14, 50);
      pdf.text(`Total Operators Required: ${results.totalOperatorsRequired}`, 14, 56);
    }
    
    // Shift information
    pdf.text(`Shifts per Day: ${shiftsPerDay}`, 14, 62);
    if (shiftsPerDay > 1) {
      const shiftHoursText = shiftHours.slice(0, shiftsPerDay).map((hours, idx) => `Shift ${idx+1}: ${hours} hours`).join(', ');
      pdf.text(`Shift Hours: ${shiftHoursText}`, 14, 68);
    }
    
    // Add style details
    pdf.setFontSize(14);
    pdf.text('Style Details', 14, 76);
    
    const styleData = results.styleResults.map((style: any, idx: number) => [
      idx + 1,
      style.name,
      style.totalAdjustedWorkContent.toFixed(2),
      style.cycleTime.toFixed(2),
      style.operatorsRequired,
      style.allocatedOutput,
      Math.floor(60 / style.cycleTime)
    ]);
    
    (pdf as any).autoTable({
      startY: 80,
      head: [['#', 'Style', 'Work Content (min)', 'Cycle Time (min)', 'Operators', 'Weekly Output', 'Units/Hour']],
      body: styleData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Add bottleneck analysis
    const bottleneckData = results.styleResults.map((style: any) => [
      style.name,
      style.bottleneckOperation.operation,
      style.bottleneckOperation.type,
      style.bottleneckOperation.sam.toFixed(3),
      `${((style.bottleneckOperation.sam / style.cycleTime) * 100).toFixed(1)}%`
    ]);
    
    (pdf as any).autoTable({
      startY: (pdf as any).lastAutoTable.finalY + 10,
      head: [['Style', 'Bottleneck Operation', 'Machine/Type', 'Time (min)', 'Cycle Time %']],
      body: bottleneckData,
      theme: 'striped',
      headStyles: { fillColor: [231, 76, 60] }
    });
    
    // Add recommendations
    pdf.setFontSize(14);
    pdf.text('Recommendations', 14, (pdf as any).lastAutoTable.finalY + 15);
    
    const recommendations = generateRecommendations();
    let yPos = (pdf as any).lastAutoTable.finalY + 20;
    
    recommendations.forEach((rec, idx) => {
      pdf.setFontSize(10);
      pdf.text(`${idx+1}. ${rec}`, 14, yPos);
      yPos += 6;
    });
    
    // Save the PDF
    pdf.save('Line_Balancing_Analysis.pdf');
  };
  
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
                        <th className="p-2 text-center">Skill Level (%)</th>
                        <th className="p-2 text-right">SAM (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {styles[activeStyleIndex]?.operations.map((op: any, i: number) => (
                        <tr key={i} className={op.sam >= 1 ? 'bg-yellow-50' : ''}>
                          <td className="p-2 border-t">{op.step}</td>
                          <td className="p-2 border-t">{op.operation}</td>
                          <td className="p-2 border-t">{op.type}</td>
                          <td className="p-2 border-t text-center">
                            <input 
                              type="number" 
                              className="w-16 p-1 text-center border rounded"
                              value={op.skillLevel || 100}
                              step="5"
                              min="10"
                              max="100"
                              onChange={(e) => {
                                const newSkillLevel = parseFloat(e.target.value) || 100;
                                const newOperations = [...styles[activeStyleIndex].operations];
                                // Calculate the new SAM based on original SAM / skill level
                                const originalSam = op.originalSam || op.sam;
                                const newSam = originalSam / (newSkillLevel / 100);
                                
                                newOperations[i] = {
                                  ...newOperations[i], 
                                  skillLevel: newSkillLevel,
                                  sam: Number(newSam.toFixed(3)), // Round to 3 decimal places
                                  originalSam: originalSam
                                };
                                
                                const newStyles = [...styles];
                                newStyles[activeStyleIndex] = {
                                  ...newStyles[activeStyleIndex],
                                  operations: newOperations,
                                  totalWorkContent: newOperations.reduce((sum, op) => sum + op.sam, 0)
                                };
                                
                                setStyles(newStyles);
                              }}
                            />
                          </td>
                          <td className="p-2 border-t text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <input 
                                type="number" 
                                className="w-20 p-1 text-right border rounded"
                                value={op.sam}
                                step="0.001"
                                min="0.001"
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value) || 0;
                                  const newOperations = [...styles[activeStyleIndex].operations];
                                  newOperations[i] = {
                                    ...newOperations[i], 
                                    sam: newValue,
                                    originalSam: newValue * (op.skillLevel / 100) // Update original SAM
                                  };
                                  
                                  const newStyles = [...styles];
                                  newStyles[activeStyleIndex] = {
                                    ...newStyles[activeStyleIndex],
                                    operations: newOperations,
                                    totalWorkContent: newOperations.reduce((sum, op) => sum + op.sam, 0)
                                  };
                                  
                                  setStyles(newStyles);
                                }}
                              />
                              
                              {shiftsPerDay > 1 && selectiveOperations && (
                                <div className="flex items-center pl-2">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600"
                                    checked={
                                      selectedOperations[activeStyleIndex] && 
                                      selectedOperations[activeStyleIndex][op.step] || 
                                      false
                                    }
                                    onChange={(e) => {
                                      setSelectedOperations(prev => {
                                        // Create a copy of the current state
                                        const newSelected = {...prev};
                                        
                                        // Initialize style's operations if not exists
                                        if (!newSelected[activeStyleIndex]) {
                                          newSelected[activeStyleIndex] = {};
                                        }
                                        
                                        // Set the operation selection state
                                        newSelected[activeStyleIndex][op.step] = e.target.checked;
                                        
                                        return newSelected;
                                      });
                                    }}
                                  />
                                  <span className="ml-1 text-xs text-gray-500">Multi-shift</span>
                                </div>
                              )}
                            </div>
                          </td>
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
            {/* Shift configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shifts per Day
              </label>
              <div className="flex border rounded overflow-hidden">
                <button
                  className={`flex-1 py-2 ${shiftsPerDay === 1 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                  onClick={() => setShiftsPerDay(1)}
                >
                  1 Shift
                </button>
                <button
                  className={`flex-1 py-2 ${shiftsPerDay === 2 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                  onClick={() => setShiftsPerDay(2)}
                >
                  2 Shifts
                </button>
                <button
                  className={`flex-1 py-2 ${shiftsPerDay === 3 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                  onClick={() => setShiftsPerDay(3)}
                >
                  3 Shifts
                </button>
              </div>
              
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-500">
                  Hours per shift (5 days per week)
                </p>
                
                {Array.from({ length: shiftsPerDay }).map((_, idx) => (
                  <div key={idx} className="flex items-center">
                    <span className="w-24 text-sm">Shift {idx + 1}:</span>
                    <input
                      type="number"
                      value={shiftHours[idx]}
                      onChange={(e) => {
                        const newHours = [...shiftHours];
                        newHours[idx] = parseFloat(e.target.value) || 0;
                        setShiftHours(newHours);
                      }}
                      className="w-16 p-1 border rounded"
                      min="1"
                      max="12"
                      step="0.5"
                    />
                    <span className="ml-2 text-sm text-gray-500">hours</span>
                  </div>
                ))}
                
                {shiftsPerDay > 1 && (
                  <div className="pt-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectiveOperations}
                        onChange={(e) => setSelectiveOperations(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm">Enable selective operations for shifts</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      When enabled, you can select which operations run in multiple shifts
                    </p>
                  </div>
                )}
              </div>
              
              {shiftsPerDay === 1 && (
                <div className="mt-3">
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
              )}
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
      
      {/* Advanced Production Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Batch Processing Parameters */}
        <div className="p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-3">Batch Processing</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Size (units)
              </label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
                className="w-full p-2 border rounded"
                min="1"
                max="59"
                step="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of units processed together
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Setup Time (min)
              </label>
              <input
                type="number"
                value={batchSetupTime}
                onChange={(e) => setBatchSetupTime(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                min="0"
                max="59"
                step="0.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Time to set up each batch
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Efficiency Improvement (%)
              </label>
              <input
                type="number"
                value={batchEfficiencyFactor}
                onChange={(e) => setBatchEfficiencyFactor(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                min="0"
                max="50"
                step="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentage reduction in processing time
              </p>
            </div>
          </div>
        </div>
        
        {/* Material Movement Parameters */}
        <div className="p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-3">Material Movement</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Movement Time per Step (sec)
              </label>
              <input
                type="number"
                value={movementTimePerOperation}
                onChange={(e) => setMovementTimePerOperation(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                min="0"
                max="59"
                step="0.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Time to move materials between operations
              </p>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Impact on Work Content</h4>
              {results && (
                <div className="text-sm border p-3 rounded bg-gray-50">
                  <div className="flex justify-between mb-2">
                    <span>Total Movements:</span>
                    <span className="font-medium">{styles.reduce((sum, style) => sum + (style.operations.length - 1), 0)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Total Movement Time:</span>
                    <span className="font-medium">{results.movementTimeImpact ? results.movementTimeImpact.toFixed(2) : '0.00'} min</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Material Handling Parameters */}
        <div className="p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-3">Material Handling</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Handling Overhead (%)
              </label>
              <input
                type="number"
                value={materialHandlingOverhead}
                onChange={(e) => setMaterialHandlingOverhead(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                min="0"
                max="50"
                step="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentage of additional time for material handling
              </p>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Impact on Work Content</h4>
              {results && (
                <div className="text-sm border p-3 rounded bg-gray-50">
                  <div className="flex justify-between mb-2">
                    <span>Handling Overhead Time:</span>
                    <span className="font-medium">{results.handlingOverheadImpact ? results.handlingOverheadImpact.toFixed(2) : '0.00'} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Additional Operators Needed:</span>
                    <span className="font-medium">
                      {results.handlingOverheadImpact && results.actualCycleTime
                        ? Math.ceil(results.handlingOverheadImpact / results.actualCycleTime)
                        : '0'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Results Section */}
      {results && (
        <div className="p-4 border rounded bg-white mb-8" ref={resultsRef}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Line Balancing Results</h3>
            <button
              onClick={exportPDF}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
            >
              <span>Export PDF Report</span>
            </button>
          </div>
          
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
          
          {/* Factor Impact Visualization */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2">Impact of Production Factors</h4>
            <div className="p-4 bg-gray-50 rounded border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-orange-50 rounded border border-orange-100">
                  <div className="text-sm text-gray-600">Batch Processing Impact</div>
                  <div className="text-xl font-bold">{results.batchProcessingImpact ? results.batchProcessingImpact.toFixed(2) : '0.00'} min</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {results.batchProcessingImpact && results.originalWorkContent 
                      ? ((results.batchProcessingImpact / results.originalWorkContent) * 100).toFixed(1) 
                      : '0.0'}% of original work content
                  </div>
                </div>
                
                <div className="p-3 bg-teal-50 rounded border border-teal-100">
                  <div className="text-sm text-gray-600">Material Movement Impact</div>
                  <div className="text-xl font-bold">{results.movementTimeImpact ? results.movementTimeImpact.toFixed(2) : '0.00'} min</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {results.movementTimeImpact && results.originalWorkContent 
                      ? ((results.movementTimeImpact / results.originalWorkContent) * 100).toFixed(1) 
                      : '0.0'}% of original work content
                  </div>
                </div>
                
                <div className="p-3 bg-violet-50 rounded border border-violet-100">
                  <div className="text-sm text-gray-600">Material Handling Impact</div>
                  <div className="text-xl font-bold">{results.handlingOverheadImpact ? results.handlingOverheadImpact.toFixed(2) : '0.00'} min</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {results.handlingOverheadImpact && results.originalWorkContent 
                      ? ((results.handlingOverheadImpact / results.originalWorkContent) * 100).toFixed(1) 
                      : '0.0'}% of original work content
                  </div>
                </div>
              </div>
              
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    Total Impact: {results.totalAdjustedWorkContent && results.originalWorkContent 
                      ? ((results.totalAdjustedWorkContent - results.originalWorkContent) / results.originalWorkContent * 100).toFixed(1) 
                      : '0.0'}%
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {results.originalWorkContent ? results.originalWorkContent.toFixed(2) : '0.00'} → {results.totalAdjustedWorkContent ? results.totalAdjustedWorkContent.toFixed(2) : '0.00'} min
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-6 mb-4 text-xs flex rounded bg-gray-200">
                  <div style={{ width: "100%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-100">
                    <div style={{ 
                      width: `${results.originalWorkContent && results.totalAdjustedWorkContent ? (results.originalWorkContent / results.totalAdjustedWorkContent) * 100 : 100}%` 
                    }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500">
                      Original
                    </div>
                  </div>
                </div>
                <div className="flex text-xs text-gray-500 justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-400 mr-1 rounded-sm"></div>
                    <span>Batch</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-teal-400 mr-1 rounded-sm"></div>
                    <span>Movement</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-violet-400 mr-1 rounded-sm"></div>
                    <span>Handling</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="h-80">
              <h4 className="text-sm font-medium mb-2">Impact Factors</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={prepareFactorImpactChart()} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false}
                    outerRadius={80} 
                    fill="#8884d8" 
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {prepareFactorImpactChart().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        index === 0 ? '#1E40AF' : // Original
                        index === 1 ? '#F97316' : // Batch
                        index === 2 ? '#14B8A6' : // Movement
                        '#8B5CF6'                 // Handling
                      } />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(2)} min`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
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
          
          {/* Hourly Production Section */}
          <div className="p-4 border rounded bg-white mb-6">
            <h3 className="text-lg font-semibold mb-3">Hourly Production</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results && results.styleResults && results.styleResults.map((style: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-2">{style.name}</h4>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Cycle Time:</span>
                    <span className="font-medium">{style.cycleTime.toFixed(2)} min</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Operators Required:</span>
                    <span className="font-medium">{style.operatorsRequired}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Hourly Output:</span>
                    <span className="font-medium text-green-600">
                      {calculateHourlyProduction(style, style.cycleTime)} units/hour
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Weekly Output:</span>
                    <span className="font-medium">{style.allocatedOutput} units/week</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Daily Output ({calculateDailyHours()}hr):</span>
                    <span className="font-medium">
                      {Math.round(style.allocatedOutput / 5)} units/day
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Operator Allocation Section */}
          {results && results.styleResults && results.styleResults.length > 0 && (
            <div className="p-4 border rounded bg-white mb-6">
              <h3 className="text-lg font-semibold mb-3">Operator Allocation</h3>
              
              <div className="mb-4">
                <select 
                  className="p-2 border rounded w-full md:w-1/3"
                  value={activeStyleIndex}
                  onChange={(e) => setActiveStyleIndex(parseInt(e.target.value))}
                >
                  {styles.map((style, idx) => (
                    <option key={idx} value={idx}>{style.name}</option>
                  ))}
                </select>
              </div>
              
              {activeStyleIndex !== null && results.styleResults[activeStyleIndex] && (
                <>
                  <div className="mb-4 text-sm">
                    <p className="mb-2">The following chart shows how operations are allocated to each operator.</p>
                    <div className="flex items-center mb-1">
                      <span className="font-medium mr-2">Cycle Time:</span>
                      <span>{results.styleResults[activeStyleIndex].cycleTime.toFixed(2)} minutes</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Total Operators:</span>
                      <span>{results.styleResults[activeStyleIndex].operatorsRequired}</span>
                    </div>
                  </div>
                
                  <div className="relative overflow-x-auto">
                    <div className="min-w-full border-b">
                      {/* Headers for operator columns */}
                      <div className="flex">
                        <div className="w-1/4 font-medium p-2 bg-gray-100 border-r">Operation</div>
                        {Array.from({ length: results.styleResults[activeStyleIndex].operatorsRequired }).map((_, idx) => (
                          <div 
                            key={idx} 
                            className="flex-1 font-medium p-2 text-center bg-gray-100 border-r"
                            style={{ backgroundColor: `${OPERATOR_COLORS[idx % OPERATOR_COLORS.length]}20` }}
                          >
                            Operator {idx + 1}
                          </div>
                        ))}
                      </div>
                      
                      {/* Operation allocations */}
                      {calculateOperatorAllocation(
                        results.styleResults[activeStyleIndex], 
                        results.styleResults[activeStyleIndex].cycleTime
                      ).map((op, idx) => (
                        <div key={idx} className="flex border-t">
                          <div className="w-1/4 p-2 border-r flex flex-col">
                            <span className="font-medium text-sm">{op.operation}</span>
                            <span className="text-xs text-gray-500">{op.sam.toFixed(2)} min</span>
                          </div>
                          
                          {Array.from({ length: results.styleResults[activeStyleIndex].operatorsRequired }).map((_, opIdx) => (
                            <div 
                              key={opIdx} 
                              className={`flex-1 p-2 border-r ${opIdx + 1 === op.operatorNumber ? 'bg-opacity-20' : ''}`}
                              style={{ backgroundColor: opIdx + 1 === op.operatorNumber ? `${OPERATOR_COLORS[opIdx % OPERATOR_COLORS.length]}20` : '' }}
                            >
                              {opIdx + 1 === op.operatorNumber && (
                                <div 
                                  className="h-8 rounded-sm flex items-center justify-center text-white text-xs"
                                  style={{ 
                                    backgroundColor: OPERATOR_COLORS[opIdx % OPERATOR_COLORS.length],
                                    width: `${Math.min(100, (op.sam / results.styleResults[activeStyleIndex].cycleTime) * 100)}%`
                                  }}
                                >
                                  {op.sam.toFixed(2)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                      
                      {/* Time scale at bottom */}
                      <div className="flex border-t">
                        <div className="w-1/4 p-2 border-r font-medium text-sm">Time Scale</div>
                        {Array.from({ length: results.styleResults[activeStyleIndex].operatorsRequired }).map((_, idx) => (
                          <div key={idx} className="flex-1 p-2 border-r">
                            <div className="w-full flex justify-between text-xs text-gray-500">
                              <span>0.00</span>
                              <span>{(results.styleResults[activeStyleIndex].cycleTime / 2).toFixed(2)}</span>
                              <span>{results.styleResults[activeStyleIndex].cycleTime.toFixed(2)}</span>
                            </div>
                            <div className="w-full h-1 bg-gray-200 mt-1 rounded-full">
                              <div className="h-1 bg-gray-400 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Manual Operation Assignment Section */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-md font-semibold mb-3">Operator Assignment Mode</h4>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="automatic-mode"
                          name="assignment-mode"
                          checked={assignmentMode === 'automatic'}
                          onChange={() => setAssignmentMode('automatic')}
                          className="h-4 w-4 text-blue-600"
                        />
                        <label htmlFor="automatic-mode" className="text-sm">Automatic Assignment</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="manual-mode"
                          name="assignment-mode"
                          checked={assignmentMode === 'manual'}
                          onChange={() => setAssignmentMode('manual')}
                          className="h-4 w-4 text-blue-600"
                        />
                        <label htmlFor="manual-mode" className="text-sm">Manual Assignment</label>
                      </div>
                    </div>
                    
                    {assignmentMode === 'manual' && results && results.styleResults && activeStyleIndex !== null && (
                      <div className="bg-gray-50 p-4 rounded-md border mb-4">
                        <h5 className="font-medium mb-2">Manual Operation Assignment</h5>
                        <p className="text-sm text-gray-600 mb-4">
                          Assign each operation to a specific operator by selecting the operator number below.
                        </p>
                        
                        <div className="max-h-80 overflow-y-auto">
                          <table className="min-w-full table-auto text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-2 text-left">Step</th>
                                <th className="p-2 text-left">Operation</th>
                                <th className="p-2 text-left">Type</th>
                                <th className="p-2 text-right">SAM (min)</th>
                                <th className="p-2 text-center">Assigned Operator</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.styleResults[activeStyleIndex].operations.map((op: any, i: number) => {
                                const styleIdx = activeStyleIndex.toString();
                                const opStep = op.step.toString();
                                const currentAssignment = 
                                  manualAssignments[styleIdx] && 
                                  manualAssignments[styleIdx][opStep] ? 
                                  manualAssignments[styleIdx][opStep] : 1;
                                
                                return (
                                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="p-2 border-t">{op.step}</td>
                                    <td className="p-2 border-t">{op.operation}</td>
                                    <td className="p-2 border-t">{op.type}</td>
                                    <td className="p-2 border-t text-right">{op.sam.toFixed(3)}</td>
                                    <td className="p-2 border-t text-center">
                                      <select
                                        value={currentAssignment}
                                        onChange={(e) => {
                                          const operatorNumber = parseInt(e.target.value);
                                          setManualAssignments(prev => {
                                            const newAssignments = {...prev};
                                            if (!newAssignments[styleIdx]) {
                                              newAssignments[styleIdx] = {};
                                            }
                                            newAssignments[styleIdx][opStep] = operatorNumber;
                                            return newAssignments;
                                          });
                                        }}
                                        className="p-1 border rounded"
                                      >
                                        {Array.from({length: results.styleResults[activeStyleIndex].operatorsRequired + 2}, (_, i) => i + 1).map(num => (
                                          <option key={num} value={num}>
                                            Operator {num}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        
                        {allocationComparison && (
                          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-100">
                            <h5 className="font-medium mb-2">Assignment Comparison</h5>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="text-sm font-medium">Automatic Assignment:</p>
                                <p className="text-sm">Efficiency: {allocationComparison.automatic.efficiency.toFixed(1)}%</p>
                                <p className="text-sm">Balance Score: {allocationComparison.automatic.workloadBalance.toFixed(1)}/100</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Manual Assignment:</p>
                                <p className="text-sm">Efficiency: {allocationComparison.manual.efficiency.toFixed(1)}%</p>
                                <p className="text-sm">Balance Score: {allocationComparison.manual.workloadBalance.toFixed(1)}/100</p>
                              </div>
                            </div>
                            
                            {/* Visual comparison section */}
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <h5 className="font-medium mb-2">Visual Operation Allocation Comparison</h5>
                              
                              {/* Automatic allocation chart */}
                              <div className="mb-4">
                                <p className="text-sm font-medium mb-2">Automatic Allocation:</p>
                                <div className="relative h-[160px] bg-gray-50 border rounded p-2 overflow-hidden">
                                  {(() => {
                                    const cycleTime = results.styleResults[activeStyleIndex].cycleTime;
                                    const allocations = calculateOperatorAllocation(
                                      results.styleResults[activeStyleIndex], 
                                      cycleTime,
                                      false
                                    );
                                    
                                    // Group allocations by operator
                                    const operatorGroups = {};
                                    allocations.forEach(alloc => {
                                      if (!operatorGroups[alloc.operatorNumber]) {
                                        operatorGroups[alloc.operatorNumber] = [];
                                      }
                                      operatorGroups[alloc.operatorNumber].push(alloc);
                                    });
                                    
                                    return (
                                      <>
                                        <div className="absolute top-0 left-0 w-full h-full">
                                          {/* Time scale markers */}
                                          {Array.from({length: Math.ceil(cycleTime)+1}, (_, i) => (
                                            <div key={i} className="absolute border-l border-gray-200 h-full"
                                                style={{ left: `${(i / cycleTime) * 100}%` }}>
                                              <div className="text-[10px] text-gray-400">{i.toFixed(1)}</div>
                                            </div>
                                          ))}
                                        </div>
                                        
                                        {Object.entries(operatorGroups).map(([opNumber, ops]: [string, any[]]) => (
                                          <div key={opNumber} className="relative h-8 mb-2 flex items-center">
                                            <div className="w-16 text-xs font-medium">Operator {opNumber}:</div>
                                            <div className="flex-1 relative">
                                              {ops.map((op, i) => (
                                                <div
                                                  key={i}
                                                  className="absolute h-7 rounded flex items-center justify-center text-xs text-white font-medium overflow-hidden"
                                                  style={{
                                                    left: `${(op.startTime / cycleTime) * 100}%`,
                                                    width: `${(op.sam / cycleTime) * 100}%`,
                                                    backgroundColor: OPERATOR_COLORS[(parseInt(opNumber) - 1) % OPERATOR_COLORS.length],
                                                    minWidth: '12px'
                                                  }}
                                                  title={`${op.operation} (${op.sam.toFixed(3)} min)`}
                                                >
                                                  <span className="truncate px-1">{op.step}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              
                              {/* Manual allocation chart */}
                              <div>
                                <p className="text-sm font-medium mb-2">Manual Allocation:</p>
                                <div className="relative h-[160px] bg-gray-50 border rounded p-2 overflow-hidden">
                                  {(() => {
                                    const cycleTime = results.styleResults[activeStyleIndex].cycleTime;
                                    const allocations = calculateOperatorAllocation(
                                      results.styleResults[activeStyleIndex], 
                                      cycleTime,
                                      true
                                    );
                                    
                                    // Group allocations by operator
                                    const operatorGroups = {};
                                    allocations.forEach(alloc => {
                                      if (!operatorGroups[alloc.operatorNumber]) {
                                        operatorGroups[alloc.operatorNumber] = [];
                                      }
                                      operatorGroups[alloc.operatorNumber].push(alloc);
                                    });
                                    
                                    return (
                                      <>
                                        <div className="absolute top-0 left-0 w-full h-full">
                                          {/* Time scale markers */}
                                          {Array.from({length: Math.ceil(cycleTime)+1}, (_, i) => (
                                            <div key={i} className="absolute border-l border-gray-200 h-full"
                                                style={{ left: `${(i / cycleTime) * 100}%` }}>
                                              <div className="text-[10px] text-gray-400">{i.toFixed(1)}</div>
                                            </div>
                                          ))}
                                        </div>
                                        
                                        {Object.entries(operatorGroups).map(([opNumber, ops]: [string, any[]]) => (
                                          <div key={opNumber} className="relative h-8 mb-2 flex items-center">
                                            <div className="w-16 text-xs font-medium">Operator {opNumber}:</div>
                                            <div className="flex-1 relative">
                                              {ops.map((op, i) => (
                                                <div
                                                  key={i}
                                                  className="absolute h-7 rounded flex items-center justify-center text-xs text-white font-medium overflow-hidden"
                                                  style={{
                                                    left: `${(op.startTime / cycleTime) * 100}%`,
                                                    width: `${(op.sam / cycleTime) * 100}%`,
                                                    backgroundColor: OPERATOR_COLORS[(parseInt(opNumber) - 1) % OPERATOR_COLORS.length],
                                                    minWidth: '12px'
                                                  }}
                                                  title={`${op.operation} (${op.sam.toFixed(3)} min)`}
                                                >
                                                  <span className="truncate px-1">{op.step}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Operator Workload Visualization */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-md font-semibold mb-3">Operator Workload Analysis</h4>
                    <p className="mb-4 text-sm">
                      This chart shows the workload distribution across operators. Ideally, all operators should have
                      balanced workloads close to 100% utilization.
                    </p>
                    
                    {/* Display mode selection */}
                    {assignmentMode === 'manual' && (
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          Showing both allocation methods for comparison
                        </div>
                      </div>
                    )}
                    
                    {/* Automatic workload bars */}
                    <div className="mb-6">
                      <h5 className="text-sm font-medium mb-3">
                        {assignmentMode === 'manual' ? 'Automatic Assignment Workload:' : 'Current Workload:'}
                      </h5>
                      <div className="space-y-3">
                        {calculateOperatorWorkload(
                          calculateOperatorAllocation(
                            results.styleResults[activeStyleIndex],
                            results.styleResults[activeStyleIndex].cycleTime,
                            false
                          ),
                          results.styleResults[activeStyleIndex].cycleTime
                        ).map((operator, idx) => {
                          const utilizationPercentage = operator.utilized;
                          
                          // Determine color based on utilization
                          let barColor, textColor;
                          if (utilizationPercentage < 70) {
                            barColor = 'bg-blue-400'; // Underutilized
                            textColor = 'text-blue-700';
                          } else if (utilizationPercentage < 90) {
                            barColor = 'bg-green-500'; // Well utilized
                            textColor = 'text-green-700';
                          } else {
                            barColor = 'bg-amber-500'; // Fully/Over utilized
                            textColor = 'text-amber-700';
                          }
                          
                          return (
                            <div key={idx} className="flex flex-col">
                              <div className="flex justify-between mb-1 items-center">
                                <div className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: OPERATOR_COLORS[idx % OPERATOR_COLORS.length] }}
                                  ></div>
                                  <span className="text-sm font-medium">{operator.name}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-xs font-semibold ${textColor}`}>
                                    {utilizationPercentage.toFixed(1)}% utilized
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({operator.workload.toFixed(2)} min)
                                  </span>
                                </div>
                              </div>
                              
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
                                  style={{ width: `${Math.min(100, utilizationPercentage)}%` }}
                                ></div>
                              </div>
                              
                              <div className="text-xs text-gray-500 mt-1">
                                <span>Assigned steps: {operator.operations.join(', ')}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Automatic summary stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg mt-4">
                        {(() => {
                          const operators = calculateOperatorWorkload(
                            calculateOperatorAllocation(
                              results.styleResults[activeStyleIndex],
                              results.styleResults[activeStyleIndex].cycleTime,
                              false
                            ),
                            results.styleResults[activeStyleIndex].cycleTime
                          );
                          
                          // Calculate average utilization
                          const avgUtilization = operators.reduce((sum, op) => sum + op.utilized, 0) / operators.length;
                          
                          // Find most and least utilized operators
                          const mostUtilized = operators.reduce((max, op) => op.utilized > max.utilized ? op : max, operators[0]);
                          const leastUtilized = operators.reduce((min, op) => op.utilized < min.utilized ? op : min, operators[0]);
                          
                          // Calculate utilization variance (as a basic workload balance metric)
                          const utilizationVariance = operators.reduce((sum, op) => sum + Math.pow(op.utilized - avgUtilization, 2), 0) / operators.length;
                          
                          return (
                            <>
                              <div className="text-center">
                                <div className="text-sm font-medium text-gray-500">Average Utilization</div>
                                <div className="text-xl font-semibold">{avgUtilization.toFixed(1)}%</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-medium text-gray-500">Workload Imbalance</div>
                                <div className="text-xl font-semibold">{Math.sqrt(utilizationVariance).toFixed(1)}%</div>
                                <div className="text-xs text-gray-400">(std. deviation)</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-medium text-gray-500">Utilization Range</div>
                                <div className="text-xl font-semibold">
                                  {leastUtilized.utilized.toFixed(1)}% - {mostUtilized.utilized.toFixed(1)}%
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Manual workload bars - only shown in manual mode */}
                    {assignmentMode === 'manual' && (
                      <div className="mt-8 pt-6 border-t">
                        <h5 className="text-sm font-medium mb-3">Manual Assignment Workload:</h5>
                        <div className="space-y-3">
                          {calculateOperatorWorkload(
                            calculateOperatorAllocation(
                              results.styleResults[activeStyleIndex],
                              results.styleResults[activeStyleIndex].cycleTime,
                              true
                            ),
                            results.styleResults[activeStyleIndex].cycleTime
                          ).map((operator, idx) => {
                            const utilizationPercentage = operator.utilized;
                            
                            // Determine color based on utilization
                            let barColor, textColor;
                            if (utilizationPercentage < 70) {
                              barColor = 'bg-blue-400'; // Underutilized
                              textColor = 'text-blue-700';
                            } else if (utilizationPercentage < 90) {
                              barColor = 'bg-green-500'; // Well utilized
                              textColor = 'text-green-700';
                            } else {
                              barColor = 'bg-amber-500'; // Fully/Over utilized
                              textColor = 'text-amber-700';
                            }
                            
                            return (
                              <div key={idx} className="flex flex-col">
                                <div className="flex justify-between mb-1 items-center">
                                  <div className="flex items-center">
                                    <div 
                                      className="w-3 h-3 rounded-full mr-2"
                                      style={{ backgroundColor: OPERATOR_COLORS[idx % OPERATOR_COLORS.length] }}
                                    ></div>
                                    <span className="text-sm font-medium">{operator.name}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-xs font-semibold ${textColor}`}>
                                      {utilizationPercentage.toFixed(1)}% utilized
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ({operator.workload.toFixed(2)} min)
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.min(100, utilizationPercentage)}%` }}
                                  ></div>
                                </div>
                                
                                <div className="text-xs text-gray-500 mt-1">
                                  <span>Assigned steps: {operator.operations.join(', ')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      
                        {/* Manual summary stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg mt-4">
                          {(() => {
                            const operators = calculateOperatorWorkload(
                              calculateOperatorAllocation(
                                results.styleResults[activeStyleIndex],
                                results.styleResults[activeStyleIndex].cycleTime,
                                true
                              ),
                              results.styleResults[activeStyleIndex].cycleTime
                            );
                            
                            // Calculate average utilization
                            const avgUtilization = operators.reduce((sum, op) => sum + op.utilized, 0) / operators.length;
                            
                            // Find most and least utilized operators
                            const mostUtilized = operators.reduce((max, op) => op.utilized > max.utilized ? op : max, operators[0]);
                            const leastUtilized = operators.reduce((min, op) => op.utilized < min.utilized ? op : min, operators[0]);
                            
                            // Calculate utilization variance
                            const utilizationVariance = operators.reduce((sum, op) => sum + Math.pow(op.utilized - avgUtilization, 2), 0) / operators.length;
                            
                            return (
                              <>
                                <div className="text-center">
                                  <div className="text-sm font-medium text-gray-500">Average Utilization</div>
                                  <div className="text-xl font-semibold">{avgUtilization.toFixed(1)}%</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium text-gray-500">Workload Imbalance</div>
                                  <div className="text-xl font-semibold">{Math.sqrt(utilizationVariance).toFixed(1)}%</div>
                                  <div className="text-xs text-gray-400">(std. deviation)</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium text-gray-500">Utilization Range</div>
                                  <div className="text-xl font-semibold">
                                    {leastUtilized.utilized.toFixed(1)}% - {mostUtilized.utilized.toFixed(1)}%
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Recommendations Section */}
          <div className="p-4 border rounded bg-white mb-6">
            <h3 className="text-lg font-semibold mb-3">Analysis & Recommendations</h3>
            <div className="space-y-2">
              {generateRecommendations().map((recommendation, idx) => (
                <div key={idx} className="flex items-start p-3 bg-blue-50 rounded border border-blue-100">
                  <div className="mr-2 mt-0.5 text-blue-500">
                    {idx === 0 ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-sm">{recommendation}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}