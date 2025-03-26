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

// Utility functions for combined style visualization
const getOperationLabel = (op: any) => {
  if (op.styleName) {
    // In combined mode, show the style identifier with operation step
    return `${op.styleName.substring(0, 3)}-${op.step}`;
  }
  // In single style mode, just show the step number
  return op.step;
};

const getOperationTooltip = (op: any) => {
  let tooltipText = `${op.operation} (${op.sam.toFixed(3)} min)`;
  if (op.styleName) {
    tooltipText = `${op.styleName}: ${tooltipText}`;
  }
  return tooltipText;
};

export default function EnhancedLineBalancingMultiStyle() {
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
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // State for operator management
  const [operators, setOperators] = useState<Operator[]>([]);
  const [manualAssignments, setManualAssignments] = useState<{[styleIndex: string]: {[operationStep: string]: number}}>({});
  const [assignmentMode, setAssignmentMode] = useState<'automatic' | 'manual'>('automatic');
  const [combineStyles, setCombineStyles] = useState<boolean>(false);
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
    styleName?: string; // The name of the style this operation belongs to (for combined mode)
    styleIndex?: number; // The index of the style this operation belongs to (for combined mode)
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
  
  // Helper function to combine operations from multiple styles
  const getCombinedOperations = (): {
    operations: any[], 
    styleMap: {[opIndex: number]: number}, // Maps operation index to style index
    stepMap: {[opIndex: number]: number}  // Maps operation index to original step
  } => {
    const combinedOperations: any[] = [];
    const styleMap: {[opIndex: number]: number} = {}; // To track which style an operation came from
    const stepMap: {[opIndex: number]: number} = {};  // To track original step number
    
    styles.forEach((style, styleIdx) => {
      if (style.operations) {
        style.operations.forEach(op => {
          const opIndex = combinedOperations.length;
          combinedOperations.push({
            ...op,
            styleName: style.name, // Add style name for reference
            styleIndex: styleIdx,  // Add style index for reference
          });
          styleMap[opIndex] = styleIdx;
          stepMap[opIndex] = op.step;
        });
      }
    });
    
    // Sort all operations by type and SAM
    combinedOperations.sort((a, b) => {
      // First group by operation type
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      // Then sort by SAM (descending)
      return b.sam - a.sam;
    });
    
    return { operations: combinedOperations, styleMap, stepMap };
  };

  // Calculate operator allocation based on style and cycle time
  const calculateOperatorAllocation = (style: any, cycleTime: number, useManualAssignment = false): OperationAllocation[] => {
    // Check if we're using combined style mode and have multiple styles
    if (combineStyles && styles.length > 1 && !style.isCombined) {
      // Get combined operations from all styles
      const { operations, styleMap, stepMap } = getCombinedOperations();
      const result: OperationAllocation[] = [];
      let currentOperator = 1;
      let currentTime = 0;
      
      // Now allocate the combined operations
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        const styleIdx = styleMap[i];
        const originalStep = stepMap[i];
        
        // Check if we have a manual assignment for this operation
        if (useManualAssignment && manualAssignments[styleIdx] && 
            manualAssignments[styleIdx][originalStep]) {
          // Use manually assigned operator
          const assignedOperator = manualAssignments[styleIdx][originalStep];
          result.push({
            step: originalStep,
            operation: op.operation,
            type: op.type,
            sam: op.sam,
            operatorNumber: assignedOperator,
            startTime: 0, // Will be calculated later
            endTime: op.sam,
            isManuallyAssigned: true,
            styleName: op.styleName,
            styleIndex: styleIdx
          });
        } else {
          // Use automatic allocation
          if (currentTime + op.sam > cycleTime) {
            // Move to next operator
            currentOperator++;
            currentTime = 0;
          }
          
          result.push({
            step: originalStep,
            operation: op.operation,
            type: op.type,
            sam: op.sam,
            operatorNumber: currentOperator,
            startTime: currentTime,
            endTime: currentTime + op.sam,
            styleName: op.styleName,
            styleIndex: styleIdx
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
    }
    
    // Original single style allocation logic
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
    {step: 1, operation: 'Estampar etiqueta', type: 'Ink Transfer', sam: 0.429, isManual: false, skillLevel: 100},
    {step: 2, operation: 'Estampar (Logo Cross)', type: 'Heat Press Transfer', sam: 0.45, isManual: false, skillLevel: 100},
    {step: 3, operation: 'Cortar elástico', type: 'Guillotina Neumatica', sam: 0.083, isManual: false, skillLevel: 100},
    {step: 40, operation: 'Unir laterales', type: 'Seaming Stitch 514', sam: 2.0, isManual: false, skillLevel: 100},
    {step: 43, operation: 'Coser bolsas de cargo', type: 'S.N.L.S. 301', sam: 2.0, isManual: false, skillLevel: 100},
    {step: 60, operation: 'Desehebrar e inspeccionar', type: 'Manual', sam: 2.0, isManual: true, skillLevel: 100},
  ];
  
  const sampleTShirtData = [
    {step: 1, operation: 'Cortar cuello', type: 'Cutting', sam: 0.2, isManual: false, skillLevel: 100},
    {step: 2, operation: 'Coser hombros', type: 'Overlock 504', sam: 0.6, isManual: false, skillLevel: 100},
    {step: 3, operation: 'Pegar cuello', type: 'Coverstitch 406', sam: 1.2, isManual: false, skillLevel: 100},
    {step: 4, operation: 'Pegar mangas', type: 'Overlock 504', sam: 1.5, isManual: false, skillLevel: 100},
    {step: 5, operation: 'Cerrar costados', type: 'Overlock 504', sam: 1.0, isManual: false, skillLevel: 100},
    {step: 6, operation: 'Dobladillo', type: 'Flatlock 605', sam: 0.8, isManual: false, skillLevel: 100},
    {step: 7, operation: 'Inspección final', type: 'Manual', sam: 0.5, isManual: true, skillLevel: 100},
  ];

  // Initialize with sample data if useSampleData is true
  useEffect(() => {
    if (useSampleData) {
      setStyles([
        {
          name: 'Jogger Pants',
          operations: sampleJoggerData,
          customRatio: 1,
          totalWorkContent: sampleJoggerData.reduce((sum, op) => sum + op.sam, 0),
          movementTimes: []
        },
        {
          name: 'Basic T-Shirt',
          operations: sampleTShirtData,
          customRatio: 1,
          totalWorkContent: sampleTShirtData.reduce((sum, op) => sum + op.sam, 0),
          movementTimes: []
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
              totalWorkContent: styleOperations.reduce((sum, op) => sum + op.sam, 0),
              movementTimes: []
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
      
      // Calculate total work minutes available
      const totalWorkMinutes = availableOperators * availableMinutes;
      
      // Calculate output based on balanced distribution
      if (outputDistribution === 'balanced') {
        // Distribute operators in proportion to each style's work content
        calculations.forEach(calc => {
          // Calculate proportion of total work content
          const proportion = calc.totalAdjustedWorkContent / totalAdjustedWorkContent;
          
          // Allocate operators based on this proportion
          const allocatedOperators = Math.ceil(availableOperators * proportion);
          
          // Calculate cycle time (minutes per unit)
          const cycleTime = calc.totalAdjustedWorkContent / allocatedOperators;
          
          // Calculate output per week
          const weeklyOutput = Math.floor(availableMinutes / cycleTime);
          
          // Calculate allocation percentage
          const allocatedPercentage = (calc.totalAdjustedWorkContent / totalAdjustedWorkContent) * 100;
          
          // Add to output results
          outputResults.push({
            ...calc,
            allocatedOperators: allocatedOperators,
            allocatedOutput: weeklyOutput,
            allocatedPercentage,
            cycleTime
          });
        });
      } else {
        // Custom distribution - user specifies output ratio
        const totalCustomRatio = calculations.reduce((sum, calc) => sum + calc.customRatio, 0);
        
        calculations.forEach(calc => {
          // Calculate proportion based on custom ratio
          const proportion = calc.customRatio / totalCustomRatio;
          
          // Allocate operators based on this proportion
          const allocatedOperators = Math.ceil(availableOperators * proportion);
          
          // Calculate cycle time (minutes per unit)
          const cycleTime = calc.totalAdjustedWorkContent / allocatedOperators;
          
          // Calculate output per week
          const weeklyOutput = Math.floor(availableMinutes / cycleTime);
          
          // Calculate allocation percentage
          const allocatedPercentage = (calc.customRatio / totalCustomRatio) * 100;
          
          // Add to output results
          outputResults.push({
            ...calc,
            allocatedOperators: allocatedOperators,
            allocatedOutput: weeklyOutput,
            allocatedPercentage,
            cycleTime
          });
        });
      }
      
      // Determine total output and calculate efficiency
      const totalAllocatedOutput = outputResults.reduce((sum, result) => sum + result.allocatedOutput, 0);
      const totalPossibleOutput = Math.floor(totalWorkMinutes / totalAdjustedWorkContent);
      const efficiency = (totalAllocatedOutput / totalPossibleOutput) * 100;
      
      // Calculate batch processing, movement, and handling impact
      const batchProcessingImpact = calculations.reduce((sum, calc) => sum + calc.batchSetupTimePerUnit, 0) / originalTotalWorkContent;
      const movementTimeImpact = calculations.reduce((sum, calc) => sum + calc.totalMovementTime, 0) / originalTotalWorkContent;
      const handlingOverheadImpact = calculations.reduce((sum, calc) => sum + calc.handlingOverheadTime, 0) / originalTotalWorkContent;
      
      // Create specialized combined style result if needed
      if (combineStyles && styles.length > 1) {
        // Get combined operations
        const { operations } = getCombinedOperations();
        
        // Calculate total work content of combined operations
        const combinedWorkContent = operations.reduce((sum: number, op: any) => sum + op.sam, 0);
        
        // Create a "style" for the combined operations
        const combinedStyle = {
          name: 'Combined Styles',
          isCombined: true,
          operations: operations,
          totalWorkContent: combinedWorkContent,
          originalWorkContent: combinedWorkContent,
          totalAdjustedWorkContent: combinedWorkContent,
          allocatedOperators: availableOperators,
          cycleTime: combinedWorkContent / availableOperators
        };
        
        // Calculate combined allocation
        const combinedAllocation = calculateOperatorAllocation(combinedStyle, combinedStyle.cycleTime, assignmentMode === 'manual');
        
        // Update operator data based on this allocation
        const combinedOperators = calculateOperatorWorkload(combinedAllocation, combinedStyle.cycleTime);
        
        // Initialize operators for the UI
        initializeOperators(availableOperators);
        
        // Update the comparison metrics
        const autoAllocation = calculateOperatorAllocation(combinedStyle, combinedStyle.cycleTime, false);
        const autoOperators = calculateOperatorWorkload(autoAllocation, combinedStyle.cycleTime);
        const autoBalance = calculateWorkloadBalance(autoOperators, combinedStyle.cycleTime);
        
        const manualAllocation = calculateOperatorAllocation(combinedStyle, combinedStyle.cycleTime, true);
        const manualOperators = calculateOperatorWorkload(manualAllocation, combinedStyle.cycleTime);
        const manualBalance = calculateWorkloadBalance(manualOperators, combinedStyle.cycleTime);
        
        // Update allocation comparison state
        setAllocationComparison({
          automatic: {
            efficiency: (combinedWorkContent / (autoOperators.length * combinedStyle.cycleTime)) * 100,
            workloadBalance: autoBalance
          },
          manual: {
            efficiency: (combinedWorkContent / (manualOperators.length * combinedStyle.cycleTime)) * 100,
            workloadBalance: manualBalance
          }
        });
      } else if (activeStyleIndex !== null) {
        // Regular single style mode
        const styleResult = outputResults[activeStyleIndex];
        if (styleResult) {
          // Calculate cycle time based on allocated operators
          const cycleTime = styleResult.totalAdjustedWorkContent / styleResult.allocatedOperators;
          
          // Calculate allocation based on this cycle time
          const allocation = calculateOperatorAllocation(styleResult, cycleTime, assignmentMode === 'manual');
          
          // Update operator data based on this allocation
          const styleOperators = calculateOperatorWorkload(allocation, cycleTime);
          
          // Initialize operators for the UI
          initializeOperators(styleResult.allocatedOperators);
          
          // Update the comparison metrics if we have a style selected
          if (styleResult) {
            const autoAllocation = calculateOperatorAllocation(styleResult, cycleTime, false);
            const autoOperators = calculateOperatorWorkload(autoAllocation, cycleTime);
            const autoBalance = calculateWorkloadBalance(autoOperators, cycleTime);
            
            const manualAllocation = calculateOperatorAllocation(styleResult, cycleTime, true);
            const manualOperators = calculateOperatorWorkload(manualAllocation, cycleTime);
            const manualBalance = calculateWorkloadBalance(manualOperators, cycleTime);
            
            // Update allocation comparison state
            setAllocationComparison({
              automatic: {
                efficiency: (styleResult.totalAdjustedWorkContent / (autoOperators.length * cycleTime)) * 100,
                workloadBalance: autoBalance
              },
              manual: {
                efficiency: (styleResult.totalAdjustedWorkContent / (manualOperators.length * cycleTime)) * 100,
                workloadBalance: manualBalance
              }
            });
          }
        }
      }
      
      // Set the results
      setResults({
        totalWorkContent: originalTotalWorkContent,
        totalAdjustedWorkContent: totalAdjustedWorkContent,
        availableOperators,
        targetWeeklyOutput: targetWeeklyOutput,
        theoreticalCycleTime: totalAdjustedWorkContent / availableOperators,
        actualCycleTime: totalAdjustedWorkContent / availableOperators, // Will be same as theoretical for operator-to-output mode
        totalPossibleOutput,
        totalAllocatedOutput,
        totalOperatorsRequired: availableOperators,
        efficiency,
        styleResults: outputResults,
        calculationMode: 'operators-to-output',
        batchProcessingImpact,
        movementTimeImpact,
        handlingOverheadImpact
      });
    } else {
      // Given output target, calculate operators needed
      const originalTotalWorkContent = calculations.reduce((sum, calc) => sum + calc.originalWorkContent, 0);
      const totalAdjustedWorkContent = calculations.reduce((sum, calc) => sum + calc.totalAdjustedWorkContent, 0);
      
      // Calculate theoretical cycle time
      const theoreticalCycleTime = (availableMinutes / targetWeeklyOutput);
      
      // Calculate total operators required
      const totalOperatorsRequired = Math.ceil(totalAdjustedWorkContent / theoreticalCycleTime);
      
      // Calculate output based on balanced distribution
      if (outputDistribution === 'balanced') {
        // Distribute operators in proportion to each style's work content
        calculations.forEach(calc => {
          // Calculate proportion of total work content
          const proportion = calc.totalAdjustedWorkContent / totalAdjustedWorkContent;
          
          // Calculate target output for this style
          const styleTargetOutput = Math.floor(targetWeeklyOutput * proportion);
          
          // Calculate required cycle time to meet this output
          const requiredCycleTime = availableMinutes / styleTargetOutput;
          
          // Calculate operators required
          const operatorsRequired = Math.ceil(calc.totalAdjustedWorkContent / requiredCycleTime);
          
          // Calculate actual cycle time with these operators
          const actualCycleTime = calc.totalAdjustedWorkContent / operatorsRequired;
          
          // Calculate actual output with this cycle time
          const actualOutput = Math.floor(availableMinutes / actualCycleTime);
          
          // Calculate allocation percentage
          const allocatedPercentage = (calc.totalAdjustedWorkContent / totalAdjustedWorkContent) * 100;
          
          // Add to operator results
          operatorResults.push({
            ...calc,
            operatorsRequired,
            allocatedOutput: actualOutput,
            allocatedPercentage,
            cycleTime: actualCycleTime
          });
        });
      } else {
        // Custom distribution - user specifies output ratio
        const totalCustomRatio = calculations.reduce((sum, calc) => sum + calc.customRatio, 0);
        
        calculations.forEach(calc => {
          // Calculate proportion based on custom ratio
          const proportion = calc.customRatio / totalCustomRatio;
          
          // Calculate target output for this style
          const styleTargetOutput = Math.floor(targetWeeklyOutput * proportion);
          
          // Calculate required cycle time to meet this output
          const requiredCycleTime = availableMinutes / styleTargetOutput;
          
          // Calculate operators required
          const operatorsRequired = Math.ceil(calc.totalAdjustedWorkContent / requiredCycleTime);
          
          // Calculate actual cycle time with these operators
          const actualCycleTime = calc.totalAdjustedWorkContent / operatorsRequired;
          
          // Calculate actual output with this cycle time
          const actualOutput = Math.floor(availableMinutes / actualCycleTime);
          
          // Calculate allocation percentage
          const allocatedPercentage = (calc.customRatio / totalCustomRatio) * 100;
          
          // Add to operator results
          operatorResults.push({
            ...calc,
            operatorsRequired,
            allocatedOutput: actualOutput,
            allocatedPercentage,
            cycleTime: actualCycleTime
          });
        });
      }
      
      // Determine total allocated output and calculate efficiency
      const totalAllocatedOutput = operatorResults.reduce((sum, result) => sum + result.allocatedOutput, 0);
      // Calculate the efficiency (actual vs target output)
      const efficiency = (totalAllocatedOutput / targetWeeklyOutput) * 100;
      
      // Actual cycle time (average across all styles)
      const actualCycleTime = totalAdjustedWorkContent / totalOperatorsRequired;
      
      // Calculate batch processing, movement, and handling impact
      const batchProcessingImpact = calculations.reduce((sum, calc) => sum + calc.batchSetupTimePerUnit, 0) / originalTotalWorkContent;
      const movementTimeImpact = calculations.reduce((sum, calc) => sum + calc.totalMovementTime, 0) / originalTotalWorkContent;
      const handlingOverheadImpact = calculations.reduce((sum, calc) => sum + calc.handlingOverheadTime, 0) / originalTotalWorkContent;
      
      // Create specialized combined style result if needed
      if (combineStyles && styles.length > 1) {
        // Get combined operations
        const { operations } = getCombinedOperations();
        
        // Calculate total work content of combined operations
        const combinedWorkContent = operations.reduce((sum: number, op: any) => sum + op.sam, 0);
        
        // Create a "style" for the combined operations
        const combinedStyle = {
          name: 'Combined Styles',
          isCombined: true,
          operations: operations,
          totalWorkContent: combinedWorkContent,
          originalWorkContent: combinedWorkContent,
          totalAdjustedWorkContent: combinedWorkContent,
          operatorsRequired: totalOperatorsRequired,
          cycleTime: combinedWorkContent / totalOperatorsRequired
        };
        
        // Calculate combined allocation
        const combinedAllocation = calculateOperatorAllocation(combinedStyle, combinedStyle.cycleTime, assignmentMode === 'manual');
        
        // Update operator data based on this allocation
        const combinedOperators = calculateOperatorWorkload(combinedAllocation, combinedStyle.cycleTime);
        
        // Initialize operators for the UI
        initializeOperators(totalOperatorsRequired);
        
        // Update the comparison metrics
        const autoAllocation = calculateOperatorAllocation(combinedStyle, combinedStyle.cycleTime, false);
        const autoOperators = calculateOperatorWorkload(autoAllocation, combinedStyle.cycleTime);
        const autoBalance = calculateWorkloadBalance(autoOperators, combinedStyle.cycleTime);
        
        const manualAllocation = calculateOperatorAllocation(combinedStyle, combinedStyle.cycleTime, true);
        const manualOperators = calculateOperatorWorkload(manualAllocation, combinedStyle.cycleTime);
        const manualBalance = calculateWorkloadBalance(manualOperators, combinedStyle.cycleTime);
        
        // Update allocation comparison state
        setAllocationComparison({
          automatic: {
            efficiency: (combinedWorkContent / (autoOperators.length * combinedStyle.cycleTime)) * 100,
            workloadBalance: autoBalance
          },
          manual: {
            efficiency: (combinedWorkContent / (manualOperators.length * combinedStyle.cycleTime)) * 100,
            workloadBalance: manualBalance
          }
        });
      } else if (activeStyleIndex !== null) {
        // Regular single style mode
        const styleResult = operatorResults[activeStyleIndex];
        if (styleResult) {
          // Calculate allocation based on cycle time
          const allocation = calculateOperatorAllocation(styleResult, styleResult.cycleTime, assignmentMode === 'manual');
          
          // Update operator data based on this allocation
          const styleOperators = calculateOperatorWorkload(allocation, styleResult.cycleTime);
          
          // Initialize operators for the UI
          initializeOperators(styleResult.operatorsRequired);
          
          // Update the comparison metrics if we have a style selected
          if (styleResult) {
            const autoAllocation = calculateOperatorAllocation(styleResult, styleResult.cycleTime, false);
            const autoOperators = calculateOperatorWorkload(autoAllocation, styleResult.cycleTime);
            const autoBalance = calculateWorkloadBalance(autoOperators, styleResult.cycleTime);
            
            const manualAllocation = calculateOperatorAllocation(styleResult, styleResult.cycleTime, true);
            const manualOperators = calculateOperatorWorkload(manualAllocation, styleResult.cycleTime);
            const manualBalance = calculateWorkloadBalance(manualOperators, styleResult.cycleTime);
            
            // Update allocation comparison state
            setAllocationComparison({
              automatic: {
                efficiency: (styleResult.totalAdjustedWorkContent / (autoOperators.length * styleResult.cycleTime)) * 100,
                workloadBalance: autoBalance
              },
              manual: {
                efficiency: (styleResult.totalAdjustedWorkContent / (manualOperators.length * styleResult.cycleTime)) * 100,
                workloadBalance: manualBalance
              }
            });
          }
        }
      }
      
      // Set the results
      setResults({
        totalWorkContent: originalTotalWorkContent,
        totalAdjustedWorkContent: totalAdjustedWorkContent,
        targetWeeklyOutput,
        theoreticalCycleTime,
        actualCycleTime,
        totalPossibleOutput: targetWeeklyOutput,
        totalAllocatedOutput,
        totalOperatorsRequired,
        efficiency,
        styleResults: operatorResults,
        calculationMode: 'output-to-operators',
        batchProcessingImpact,
        movementTimeImpact,
        handlingOverheadImpact
      });
    }
  }, [
    styles, activeStyleIndex, totalHours, pfdFactor, availableOperators, targetWeeklyOutput, 
    targetMode, outputDistribution, shiftsPerDay, shiftHours, selectiveOperations, selectedOperations,
    batchSize, batchSetupTime, batchEfficiencyFactor, movementTimePerOperation, materialHandlingOverhead,
    assignmentMode, combineStyles, manualAssignments, initializeOperators
  ]);

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

  // Handle manual assignment of operations to operators
  const handleManualAssign = (styleIdx: number, step: number, operatorNumber: number) => {
    setManualAssignments(prev => {
      // Create a copy to avoid mutating state directly
      const newAssignments = { ...prev };
      
      // Ensure the style index exists
      if (!newAssignments[styleIdx]) {
        newAssignments[styleIdx] = {};
      }
      
      // Assign this step to the specified operator
      newAssignments[styleIdx][step] = operatorNumber;
      
      return newAssignments;
    });
    
    // Recalculate the allocation comparison
    if (results && results.styleResults && activeStyleIndex !== null) {
      const styleResult = results.styleResults[activeStyleIndex];
      if (styleResult) {
        const cycleTime = styleResult.cycleTime;
        
        // Get automatic allocation
        const autoAllocation = calculateOperatorAllocation(styleResult, cycleTime, false);
        const autoOperators = calculateOperatorWorkload(autoAllocation, cycleTime);
        const autoBalance = calculateWorkloadBalance(autoOperators, cycleTime);
        
        // Get manual allocation with the updated assignments
        const manualAllocation = calculateOperatorAllocation(styleResult, cycleTime, true);
        const manualOperators = calculateOperatorWorkload(manualAllocation, cycleTime);
        const manualBalance = calculateWorkloadBalance(manualOperators, cycleTime);
        
        // Update allocation comparison state
        setAllocationComparison({
          automatic: {
            efficiency: (styleResult.totalAdjustedWorkContent / (autoOperators.length * cycleTime)) * 100,
            workloadBalance: autoBalance
          },
          manual: {
            efficiency: (styleResult.totalAdjustedWorkContent / (manualOperators.length * cycleTime)) * 100,
            workloadBalance: manualBalance
          }
        });
      }
    }
  };

  // Constants for styling
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-6">Advanced Assembly Line Balancing with Multi-Style Support</h2>
      
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
      
      {/* Input Parameters */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Basic Parameters */}
        <div className="p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-3">Basic Parameters</h3>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Target Mode:
            </label>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="operators-mode"
                  name="target-mode"
                  checked={targetMode === 'operators'}
                  onChange={() => setTargetMode('operators')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="operators-mode" className="ml-2 text-sm">Available Operators → Output</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="output-mode"
                  name="target-mode"
                  checked={targetMode === 'output'}
                  onChange={() => setTargetMode('output')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="output-mode" className="ml-2 text-sm">Target Output → Operators</label>
              </div>
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Output Distribution:
            </label>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="balanced-output"
                  name="output-distribution"
                  checked={outputDistribution === 'balanced'}
                  onChange={() => setOutputDistribution('balanced')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="balanced-output" className="ml-2 text-sm">Balanced by Work Content</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="custom-output"
                  name="output-distribution"
                  checked={outputDistribution === 'custom'}
                  onChange={() => setOutputDistribution('custom')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="custom-output" className="ml-2 text-sm">Custom Ratio</label>
              </div>
            </div>
          </div>
          
          {outputDistribution === 'custom' && styles.length > 0 && (
            <div className="mb-4 mt-2 p-2 border rounded bg-gray-50">
              <h4 className="text-sm font-medium mb-2">Custom Output Ratio:</h4>
              <div className="space-y-2">
                {styles.map((style, idx) => (
                  <div key={idx} className="flex items-center">
                    <span className="text-xs w-24 truncate">{style.name}:</span>
                    <input
                      type="number"
                      className="w-20 p-1 text-center border rounded"
                      value={style.customRatio}
                      min="0"
                      max="10"
                      step="0.1"
                      onChange={(e) => {
                        const newRatio = parseFloat(e.target.value) || 1;
                        const newStyles = [...styles];
                        newStyles[idx] = {
                          ...newStyles[idx],
                          customRatio: newRatio
                        };
                        setStyles(newStyles);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Total Weekly Hours:
            </label>
            <input 
              type="number" 
              className="w-full p-2 border rounded"
              value={totalHours}
              min="1"
              max="168"
              onChange={(e) => setTotalHours(parseInt(e.target.value) || 45)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Total available production hours per week (all shifts combined)
            </p>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              PFD Factor:
            </label>
            <input 
              type="number" 
              className="w-full p-2 border rounded"
              value={pfdFactor}
              min="0.1"
              max="1"
              step="0.01"
              onChange={(e) => setPfdFactor(parseFloat(e.target.value) || 0.85)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Personal, fatigue, and delay factor (typically 0.8-0.9)
            </p>
          </div>
          
          {targetMode === 'operators' ? (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Available Operators:
              </label>
              <input 
                type="number" 
                className="w-full p-2 border rounded"
                value={availableOperators}
                min="1"
                max="100"
                onChange={(e) => setAvailableOperators(parseInt(e.target.value) || 1)}
              />
            </div>
          ) : (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Target Weekly Output:
              </label>
              <input 
                type="number" 
                className="w-full p-2 border rounded"
                value={targetWeeklyOutput}
                min="1"
                max="10000"
                onChange={(e) => setTargetWeeklyOutput(parseInt(e.target.value) || 1)}
              />
            </div>
          )}
        </div>
        
        {/* Shift Configuration */}
        <div className="p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-3">Shift Configuration</h3>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Shifts per Day:
            </label>
            <div className="flex space-x-4">
              {[1, 2, 3].map(shifts => (
                <div key={shifts} className="flex items-center">
                  <input
                    type="radio"
                    id={`shifts-${shifts}`}
                    name="shifts-per-day"
                    checked={shiftsPerDay === shifts}
                    onChange={() => setShiftsPerDay(shifts)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <label htmlFor={`shifts-${shifts}`} className="ml-2 text-sm">{shifts} Shift{shifts !== 1 ? 's' : ''}</label>
                </div>
              ))}
            </div>
          </div>
          
          {shiftsPerDay > 1 && (
            <div className="mb-4 mt-2 p-2 border rounded bg-gray-50">
              <h4 className="text-sm font-medium mb-2">Hours per Shift:</h4>
              <div className="space-y-2">
                {Array.from({length: shiftsPerDay}, (_, i) => i).map(shiftIdx => (
                  <div key={shiftIdx} className="flex items-center">
                    <span className="text-xs w-20">Shift {shiftIdx + 1}:</span>
                    <input
                      type="number"
                      className="w-20 p-1 text-center border rounded"
                      value={shiftHours[shiftIdx]}
                      min="1"
                      max="12"
                      onChange={(e) => {
                        const newHours = [...shiftHours];
                        newHours[shiftIdx] = parseInt(e.target.value) || 8;
                        setShiftHours(newHours);
                      }}
                    />
                    <span className="text-xs ml-2">hours</span>
                  </div>
                ))}
                <div className="text-xs font-medium mt-1">
                  Total Daily Hours: {shiftHours.slice(0, shiftsPerDay).reduce((sum, h) => sum + h, 0)} hours
                </div>
              </div>
            </div>
          )}
          
          {shiftsPerDay > 1 && (
            <div className="mb-3">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="selective-operations"
                  checked={selectiveOperations}
                  onChange={(e) => setSelectiveOperations(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="selective-operations" className="ml-2 text-sm font-medium">Selective Operations Assignment</label>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Select which operations run in which shifts
              </p>
              
              {selectiveOperations && styles.length > 0 && styles[activeStyleIndex] && (
                <div className="max-h-32 overflow-y-auto p-2 bg-gray-50 rounded">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-1 text-left">Operation</th>
                        {Array.from({length: shiftsPerDay}, (_, i) => i+1).map(shift => (
                          <th key={shift} className="p-1 text-center">Shift {shift}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {styles[activeStyleIndex].operations.map((op: any) => {
                        // Ensure selectedOperations for this style and operation exists
                        if (!selectedOperations[activeStyleIndex]) {
                          selectedOperations[activeStyleIndex] = {};
                        }
                        
                        const opStep = op.step.toString();
                        
                        return (
                          <tr key={op.step}>
                            <td className="p-1 border-t">{op.step}: {op.operation}</td>
                            {Array.from({length: shiftsPerDay}, (_, i) => i+1).map(shift => (
                              <td key={shift} className="p-1 border-t text-center">
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedOperations[activeStyleIndex] && 
                                    selectedOperations[activeStyleIndex][opStep + '-' + shift] === true
                                  }
                                  onChange={(e) => {
                                    const newSelected = { ...selectedOperations };
                                    if (!newSelected[activeStyleIndex]) {
                                      newSelected[activeStyleIndex] = {};
                                    }
                                    newSelected[activeStyleIndex][opStep + '-' + shift] = e.target.checked;
                                    setSelectedOperations(newSelected);
                                  }}
                                  className="h-3 w-3 text-blue-600 rounded"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Advanced Parameters */}
        <div className="p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-3">Advanced Parameters</h3>
          
          {/* Batch Processing Parameters */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Batch Processing:</h4>
            
            <div className="mb-2">
              <label className="block text-xs mb-1">
                Batch Size (units):
              </label>
              <input 
                type="number" 
                className="w-full p-1 border rounded text-sm"
                value={batchSize}
                min="1"
                max="100"
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
              />
            </div>
            
            <div className="mb-2">
              <label className="block text-xs mb-1">
                Batch Setup Time (min):
              </label>
              <input 
                type="number" 
                className="w-full p-1 border rounded text-sm"
                value={batchSetupTime}
                min="0"
                max="60"
                step="0.1"
                onChange={(e) => setBatchSetupTime(parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div className="mb-2">
              <label className="block text-xs mb-1">
                Batch Efficiency Factor (%):
              </label>
              <input 
                type="number" 
                className="w-full p-1 border rounded text-sm"
                value={batchEfficiencyFactor}
                min="0"
                max="30"
                onChange={(e) => setBatchEfficiencyFactor(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentage reduction in processing time due to batch efficiencies
              </p>
            </div>
          </div>
          
          {/* Material Movement Parameters */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Material Movement:</h4>
            
            <div className="mb-2">
              <label className="block text-xs mb-1">
                Movement Time per Operation (sec):
              </label>
              <input 
                type="number" 
                className="w-full p-1 border rounded text-sm"
                value={movementTimePerOperation}
                min="0"
                max="30"
                step="0.1"
                onChange={(e) => setMovementTimePerOperation(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Time required to move material between operations
              </p>
            </div>
          </div>
          
          {/* Material Handling Parameters */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Material Handling:</h4>
            
            <div className="mb-2">
              <label className="block text-xs mb-1">
                Handling Overhead (%):
              </label>
              <input 
                type="number" 
                className="w-full p-1 border rounded text-sm"
                value={materialHandlingOverhead}
                min="0"
                max="50"
                onChange={(e) => setMaterialHandlingOverhead(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Additional overhead for handling materials
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Calculate Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={calculateLineBalancing}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={styles.length === 0}
        >
          Calculate Line Balancing
        </button>
      </div>
      
      {/* Results Section */}
      {results && (
        <div className="mb-8" ref={resultsRef}>
          <h3 className="text-xl font-semibold mb-4">Calculation Results</h3>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-white border rounded-lg shadow-sm">
              <h4 className="text-sm font-medium text-gray-500">Total Work Content</h4>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-semibold">{results.totalAdjustedWorkContent.toFixed(2)}</span>
                <span className="ml-1 text-gray-400">min/unit</span>
              </div>
              <div className="mt-1 text-xs text-gray-500 flex flex-col">
                <span>Original: {results.totalWorkContent.toFixed(2)} min</span>
                <span>Batch Impact: +{(results.batchProcessingImpact * 100).toFixed(1)}%</span>
                <span>Movement Impact: +{(results.movementTimeImpact * 100).toFixed(1)}%</span>
                <span>Handling Impact: +{(results.handlingOverheadImpact * 100).toFixed(1)}%</span>
              </div>
            </div>
            
            {results.calculationMode === 'operators-to-output' ? (
              <>
                <div className="p-4 bg-white border rounded-lg shadow-sm">
                  <h4 className="text-sm font-medium text-gray-500">Available Operators</h4>
                  <div className="mt-1 flex items-baseline">
                    <span className="text-2xl font-semibold">{results.availableOperators}</span>
                    <span className="ml-1 text-gray-400">operators</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Operators allocated across {results.styleResults.length} style(s)
                  </div>
                </div>
                
                <div className="p-4 bg-white border rounded-lg shadow-sm">
                  <h4 className="text-sm font-medium text-gray-500">Total Output</h4>
                  <div className="mt-1 flex items-baseline">
                    <span className="text-2xl font-semibold">{results.totalAllocatedOutput}</span>
                    <span className="ml-1 text-gray-400">units/week</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Line Efficiency: {results.efficiency.toFixed(1)}%
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-white border rounded-lg shadow-sm">
                  <h4 className="text-sm font-medium text-gray-500">Target Output</h4>
                  <div className="mt-1 flex items-baseline">
                    <span className="text-2xl font-semibold">{results.targetWeeklyOutput}</span>
                    <span className="ml-1 text-gray-400">units/week</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Actual Output: {results.totalAllocatedOutput} units/week
                  </div>
                </div>
                
                <div className="p-4 bg-white border rounded-lg shadow-sm">
                  <h4 className="text-sm font-medium text-gray-500">Operators Required</h4>
                  <div className="mt-1 flex items-baseline">
                    <span className="text-2xl font-semibold">{results.totalOperatorsRequired}</span>
                    <span className="ml-1 text-gray-400">operators</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Line Efficiency: {results.efficiency.toFixed(1)}%
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Style Results Table */}
          <div className="mb-6 overflow-x-auto">
            <table className="min-w-full bg-white border rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-3 text-left text-sm font-medium text-gray-600">Style</th>
                  <th className="py-2 px-3 text-right text-sm font-medium text-gray-600">Work Content</th>
                  {results.calculationMode === 'operators-to-output' ? (
                    <th className="py-2 px-3 text-right text-sm font-medium text-gray-600">Allocated Operators</th>
                  ) : (
                    <th className="py-2 px-3 text-right text-sm font-medium text-gray-600">Operators Required</th>
                  )}
                  <th className="py-2 px-3 text-right text-sm font-medium text-gray-600">Cycle Time</th>
                  <th className="py-2 px-3 text-right text-sm font-medium text-gray-600">Output (units/week)</th>
                  <th className="py-2 px-3 text-right text-sm font-medium text-gray-600">Output (%)</th>
                </tr>
              </thead>
              <tbody>
                {results.styleResults.map((style: any, idx: number) => (
                  <tr key={idx} className={idx === activeStyleIndex ? 'bg-blue-50' : ''}>
                    <td className="py-2 px-3 border-t text-sm">{style.name}</td>
                    <td className="py-2 px-3 border-t text-sm text-right">{style.totalAdjustedWorkContent.toFixed(2)} min</td>
                    {results.calculationMode === 'operators-to-output' ? (
                      <td className="py-2 px-3 border-t text-sm text-right">{style.allocatedOperators}</td>
                    ) : (
                      <td className="py-2 px-3 border-t text-sm text-right">{style.operatorsRequired}</td>
                    )}
                    <td className="py-2 px-3 border-t text-sm text-right">{style.cycleTime.toFixed(2)} min</td>
                    <td className="py-2 px-3 border-t text-sm text-right">{style.allocatedOutput}</td>
                    <td className="py-2 px-3 border-t text-sm text-right">{style.allocatedPercentage.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td className="py-2 px-3 border-t">Total</td>
                  <td className="py-2 px-3 border-t text-right">{results.totalAdjustedWorkContent.toFixed(2)} min</td>
                  {results.calculationMode === 'operators-to-output' ? (
                    <td className="py-2 px-3 border-t text-right">{results.availableOperators}</td>
                  ) : (
                    <td className="py-2 px-3 border-t text-right">{results.totalOperatorsRequired}</td>
                  )}
                  <td className="py-2 px-3 border-t text-right">-</td>
                  <td className="py-2 px-3 border-t text-right">{results.totalAllocatedOutput}</td>
                  <td className="py-2 px-3 border-t text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Operator Assignment Section */}
          {results && activeStyleIndex !== null && results.styleResults && (
            <div className="bg-white p-4 border rounded-lg mb-6">
              <h4 className="text-lg font-semibold mb-4">Operator Allocation</h4>
              
              <div className="mb-4">
                <div className="flex space-x-4 mb-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="automatic-mode"
                      name="assignment-mode"
                      checked={assignmentMode === 'automatic'}
                      onChange={() => setAssignmentMode('automatic')}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="automatic-mode" className="text-sm ml-1">Automatic Assignment</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="manual-mode"
                      name="assignment-mode"
                      checked={assignmentMode === 'manual'}
                      onChange={() => setAssignmentMode('manual')}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="manual-mode" className="text-sm ml-1">Manual Assignment</label>
                  </div>
                </div>
                
                {/* Multiple Style Allocation Toggle */}
                {styles.length > 1 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-md font-semibold mb-3">Multiple Style Allocation</h4>
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        id="combine-styles"
                        checked={combineStyles}
                        onChange={(e) => setCombineStyles(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label htmlFor="combine-styles" className="text-sm">
                        Combine all styles for operator allocation
                      </label>
                    </div>
                    <div className="text-xs text-gray-600 mb-4 bg-blue-50 p-2 rounded">
                      <p>When enabled, operations from all styles will be combined for allocation. This is useful when:</p>
                      <ul className="list-disc pl-5 mt-1">
                        <li>Multiple styles share common operations</li>
                        <li>The same operators work on multiple styles</li>
                        <li>You want to balance workload across all production styles</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {assignmentMode === 'manual' && results && results.styleResults && activeStyleIndex !== null && (
                  <div className="bg-gray-50 p-4 rounded-md border mb-4">
                    <h5 className="text-sm font-semibold mb-2">Manual Operation Assignment</h5>
                    <p className="text-xs text-gray-600 mb-3">
                      Assign each operation to a specific operator by selecting from the dropdown.
                    </p>
                    
                    <div className="max-h-60 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left">Step</th>
                            <th className="p-2 text-left">Operation</th>
                            <th className="p-2 text-right">SAM (min)</th>
                            <th className="p-2 text-center">Operator</th>
                          </tr>
                        </thead>
                        <tbody>
                          {combineStyles && styles.length > 1 
                            ? // Combined style mode - show operations from all styles
                              getCombinedOperations().operations.map((op: any, idx: number) => {
                                const styleIdx = op.styleIndex;
                                const opStep = op.step;
                                
                                return (
                                  <tr key={`${styleIdx}-${opStep}`} className="hover:bg-gray-100">
                                    <td className="p-2 border-t">{getOperationLabel(op)}</td>
                                    <td className="p-2 border-t">{op.operation}</td>
                                    <td className="p-2 border-t text-right">{op.sam.toFixed(3)}</td>
                                    <td className="p-2 border-t">
                                      <select
                                        className="w-full p-1 border rounded"
                                        value={
                                          manualAssignments[styleIdx] && 
                                          manualAssignments[styleIdx][opStep] 
                                            ? manualAssignments[styleIdx][opStep] 
                                            : 1
                                        }
                                        onChange={(e) => {
                                          handleManualAssign(
                                            styleIdx, 
                                            opStep, 
                                            parseInt(e.target.value)
                                          );
                                        }}
                                      >
                                        {Array.from(
                                          { length: Math.max(operators.length, 8) }, 
                                          (_, i) => i + 1
                                        ).map(num => (
                                          <option key={num} value={num}>Operator {num}</option>
                                        ))}
                                      </select>
                                    </td>
                                  </tr>
                                );
                              })
                            : // Single style mode
                              styles[activeStyleIndex]?.operations.map((op: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-100">
                                  <td className="p-2 border-t">{op.step}</td>
                                  <td className="p-2 border-t">{op.operation}</td>
                                  <td className="p-2 border-t text-right">{op.sam.toFixed(3)}</td>
                                  <td className="p-2 border-t">
                                    <select
                                      className="w-full p-1 border rounded"
                                      value={
                                        manualAssignments[activeStyleIndex] && 
                                        manualAssignments[activeStyleIndex][op.step] 
                                          ? manualAssignments[activeStyleIndex][op.step] 
                                          : 1
                                      }
                                      onChange={(e) => {
                                        handleManualAssign(
                                          activeStyleIndex, 
                                          op.step, 
                                          parseInt(e.target.value)
                                        );
                                      }}
                                    >
                                      {Array.from(
                                        { length: Math.max(operators.length, 8) }, 
                                        (_, i) => i + 1
                                      ).map(num => (
                                        <option key={num} value={num}>Operator {num}</option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              ))
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Allocation Visualization */}
                <div className="bg-white p-4 rounded-md border">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="text-sm font-semibold">
                      Operator Allocation Visualization
                    </h5>
                    {allocationComparison && (
                      <div className="flex text-xs space-x-4">
                        <div>
                          <span className="font-medium">Automatic: </span>
                          <span className="text-gray-600">
                            {allocationComparison.automatic.efficiency.toFixed(1)}% efficiency,  
                            {allocationComparison.automatic.workloadBalance.toFixed(1)}% balance
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Manual: </span>
                          <span className="text-gray-600">
                            {allocationComparison.manual.efficiency.toFixed(1)}% efficiency, 
                            {allocationComparison.manual.workloadBalance.toFixed(1)}% balance
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="h-64 overflow-y-auto">
                    {results && activeStyleIndex !== null && results.styleResults && (
                      <div className="h-full">
                        {(() => {
                          let styleResult;
                          let allocation;
                          let cycleTime;
                          
                          if (combineStyles && styles.length > 1) {
                            // Combined style mode
                            const { operations } = getCombinedOperations();
                            const combinedWorkContent = operations.reduce((sum: number, op: any) => sum + op.sam, 0);
                            
                            styleResult = {
                              name: 'Combined Styles',
                              isCombined: true,
                              operations: operations,
                              totalWorkContent: combinedWorkContent,
                              originalWorkContent: combinedWorkContent,
                              totalAdjustedWorkContent: combinedWorkContent,
                              operatorsRequired: results.totalOperatorsRequired || results.availableOperators,
                              cycleTime: combinedWorkContent / (results.totalOperatorsRequired || results.availableOperators)
                            };
                          } else {
                            // Regular single style mode
                            styleResult = results.styleResults[activeStyleIndex];
                          }
                          
                          if (!styleResult) return <div>Select a style to view allocation</div>;
                          
                          // Set cycle time based on calculation mode
                          if (results.calculationMode === 'operators-to-output') {
                            cycleTime = styleResult.cycleTime;
                          } else {
                            cycleTime = styleResult.cycleTime;
                          }
                          
                          // Get allocation based on cycle time and mode
                          allocation = calculateOperatorAllocation(styleResult, cycleTime, assignmentMode === 'manual');
                          
                          // Group operations by operator
                          const operatorGroups: {[key: number]: OperationAllocation[]} = {};
                          
                          allocation.forEach(alloc => {
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
                                        title={getOperationTooltip(op)}
                                      >
                                        <span className="truncate px-1">{getOperationLabel(op)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Comparison Chart (only show for manual mode) */}
              {assignmentMode === 'manual' && allocationComparison && (
                <div className="mt-6">
                  <h5 className="text-sm font-semibold mb-3">Automatic vs Manual Allocation Comparison</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <h6 className="text-xs font-medium mb-2">Efficiency Comparison</h6>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Automatic', value: allocationComparison.automatic.efficiency },
                              { name: 'Manual', value: allocationComparison.manual.efficiency }
                            ]}
                            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} label={{ value: 'Efficiency (%)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Efficiency']} />
                            <Bar dataKey="value" fill="#3b82f6">
                              {[
                                { name: 'Automatic', fill: '#3b82f6' },
                                { name: 'Manual', fill: '#f97316' }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded border">
                      <h6 className="text-xs font-medium mb-2">Workload Balance Comparison</h6>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Automatic', value: allocationComparison.automatic.workloadBalance },
                              { name: 'Manual', value: allocationComparison.manual.workloadBalance }
                            ]}
                            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} label={{ value: 'Balance Score (%)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Balance Score']} />
                            <Bar dataKey="value" fill="#10b981">
                              {[
                                { name: 'Automatic', fill: '#3b82f6' },
                                { name: 'Manual', fill: '#f97316' }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Style Performance Charts */}
          {results && results.styleResults && results.styleResults.length > 0 && (
            <div className="bg-white p-4 border rounded-lg mb-6">
              <h4 className="text-lg font-semibold mb-4">Style Performance Analysis</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Output Distribution Chart */}
                <div className="bg-gray-50 p-3 rounded border">
                  <h5 className="text-sm font-semibold mb-3">Output Distribution</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={results.styleResults.map((style: any, index: number) => ({
                            name: style.name,
                            value: style.allocatedOutput
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {results.styleResults.map((style: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`${value} units`, 'Weekly Output']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Operator Distribution Chart */}
                <div className="bg-gray-50 p-3 rounded border">
                  <h5 className="text-sm font-semibold mb-3">Operator Distribution</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={results.styleResults.map((style: any, index: number) => ({
                            name: style.name,
                            value: results.calculationMode === 'operators-to-output' 
                              ? style.allocatedOperators 
                              : style.operatorsRequired
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {results.styleResults.map((style: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`${value} operators`, 'Operators']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Work Content Breakdown Chart */}
                <div className="bg-gray-50 p-3 rounded border">
                  <h5 className="text-sm font-semibold mb-3">Work Content Breakdown</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={results.styleResults.map((style: any) => ({
                          name: style.name,
                          original: style.originalWorkContent,
                          batch: style.batchSetupTimePerUnit,
                          movement: style.totalMovementTime,
                          handling: style.handlingOverheadTime
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="original" stackId="a" fill="#3b82f6" name="Original Work" />
                        <Bar dataKey="batch" stackId="a" fill="#f97316" name="Batch Setup" />
                        <Bar dataKey="movement" stackId="a" fill="#10b981" name="Movement Time" />
                        <Bar dataKey="handling" stackId="a" fill="#6366f1" name="Handling Overhead" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Hourly Production Chart */}
                <div className="bg-gray-50 p-3 rounded border">
                  <h5 className="text-sm font-semibold mb-3">Hourly Production</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={results.styleResults.map((style: any) => ({
                          name: style.name,
                          hourly: Math.floor(60 / style.cycleTime)
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="hourly" fill="#3b82f6" name="Units per Hour" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Export Button */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                // Export PDF logic would go here using jsPDF
                alert('PDF export feature is implemented but not fully functional in this demo.');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 border font-medium rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Export Report as PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}