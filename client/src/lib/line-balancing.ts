// Types for operation data
export interface OperationData {
  step: number;
  operation: string;
  type: string;
  sam: number;
  isManual: boolean;
  skillLevel: number; // Skill level as percentage (0-100)
  originalSam?: number; // To store the original SAM before skill level adjustment
}

// Types for movement time data
export interface MovementTimeData {
  fromStep: number;
  toStep: number;
  time: number;
}

// Types for style data
export interface StyleData {
  name: string;
  operations: OperationData[];
  customRatio: number;
  totalWorkContent: number;
  movementTimes: MovementTimeData[];
}

// Types for calculation results
export interface StyleResult extends StyleData {
  allocatedOutput: number;
  allocatedPercentage: number;
  cycleTime: number;
  operatorsRequired: number;
  totalMovementTime: number;
  batchImpact: number;
  handlingOverhead: number;
  totalAdjustedTime: number;
  bottleneckOperation: OperationData;
  bottleneckTime: number;
  uniqueMachines: number;
  manualWorkContent: number;
}

export interface Results {
  totalWorkContent: number;
  availableOperators?: number;
  targetWeeklyOutput?: number;
  theoreticalCycleTime?: number;
  actualCycleTime?: number;
  totalPossibleOutput: number;
  totalAllocatedOutput: number;
  totalOperatorsRequired: number;
  efficiency: number;
  styleResults: StyleResult[];
  calculationMode: 'operators-to-output' | 'output-to-operators';
  batchProcessingImpact: number;
  movementTimeImpact: number;
  handlingOverheadImpact: number;
}

// State type for the entire line balancing tool
export interface LineBalancingState {
  uploadedFiles: File[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  styles: StyleData[];
  setStyles: React.Dispatch<React.SetStateAction<StyleData[]>>;
  activeStyleIndex: number | null;
  setActiveStyleIndex: React.Dispatch<React.SetStateAction<number | null>>;
  useSampleData: boolean;
  setUseSampleData: React.Dispatch<React.SetStateAction<boolean>>;
  totalHours: number;
  setTotalHours: React.Dispatch<React.SetStateAction<number>>;
  pfdFactor: number;
  setPfdFactor: React.Dispatch<React.SetStateAction<number>>;
  availableOperators: number;
  setAvailableOperators: React.Dispatch<React.SetStateAction<number>>;
  targetWeeklyOutput: number;
  setTargetWeeklyOutput: React.Dispatch<React.SetStateAction<number>>;
  targetMode: 'operators' | 'output';
  setTargetMode: React.Dispatch<React.SetStateAction<'operators' | 'output'>>;
  outputDistribution: 'balanced' | 'custom';
  setOutputDistribution: React.Dispatch<React.SetStateAction<'balanced' | 'custom'>>;
  
  // Batch processing parameters
  batchSize: number;
  setBatchSize: React.Dispatch<React.SetStateAction<number>>;
  batchSetupTime: number;
  setBatchSetupTime: React.Dispatch<React.SetStateAction<number>>;
  batchTransportTime: number;
  setBatchTransportTime: React.Dispatch<React.SetStateAction<number>>;
  batchProcessingFactor: number;
  setBatchProcessingFactor: React.Dispatch<React.SetStateAction<number>>;
  
  // Material movement parameters
  movementTimePerStep: number;
  setMovementTimePerStep: React.Dispatch<React.SetStateAction<number>>;
  movementDistanceFactor: number;
  setMovementDistanceFactor: React.Dispatch<React.SetStateAction<number>>;
  useCustomMovementTimes: boolean;
  setUseCustomMovementTimes: React.Dispatch<React.SetStateAction<boolean>>;
  customMovementTimes: MovementTimeData[];
  setCustomMovementTimes: React.Dispatch<React.SetStateAction<MovementTimeData[]>>;
  
  // Material handling parameters
  handlingOverheadPercentage: number;
  setHandlingOverheadPercentage: React.Dispatch<React.SetStateAction<number>>;
  materialComplexity: 'low' | 'medium' | 'high' | 'very-high';
  setMaterialComplexity: React.Dispatch<React.SetStateAction<'low' | 'medium' | 'high' | 'very-high'>>;
  specialHandlingRequirements: string[];
  setSpecialHandlingRequirements: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Results
  results: Results | null;
  setResults: React.Dispatch<React.SetStateAction<Results | null>>;
}

// Calculate total movement time for a style
export function calculateTotalMovementTime(
  style: StyleData,
  useCustomTimes: boolean,
  defaultTime: number,
  distanceFactor: number
): number {
  if (useCustomTimes && style.movementTimes.length > 0) {
    // Use custom movement times
    return style.movementTimes.reduce((sum, move) => sum + move.time, 0) * distanceFactor;
  } else {
    // Use default movement time per step
    // Subtract 1 because we're counting transitions between operations
    return (style.operations.length - 1) * defaultTime * distanceFactor;
  }
}

// Calculate batch impact time
export function calculateBatchImpact(
  style: StyleData,
  batchSize: number,
  batchSetupTime: number,
  batchTransportTime: number,
  batchProcessingFactor: number,
  output: number
): number {
  // Calculate how many batches are needed
  const totalBatches = Math.ceil(output / batchSize);
  
  // Calculate total setup and transport time
  const totalSetupTime = totalBatches * batchSetupTime;
  const totalTransportTime = totalBatches * batchTransportTime;
  
  // Calculate impact of batch processing factor (decreased efficiency)
  const processingTimeWithoutBatch = output * style.totalWorkContent;
  const processingTimeWithBatch = processingTimeWithoutBatch / batchProcessingFactor;
  const processingTimeImpact = processingTimeWithBatch - processingTimeWithoutBatch;
  
  // Calculate per-unit impact
  return (totalSetupTime + totalTransportTime + processingTimeImpact) / output;
}

// Calculate material handling overhead
export function calculateHandlingOverhead(
  style: StyleData,
  handlingOverheadPercentage: number,
  materialComplexity: 'low' | 'medium' | 'high' | 'very-high',
  specialRequirements: string[]
): number {
  // Base overhead is the percentage of the total work content
  let overhead = (style.totalWorkContent * handlingOverheadPercentage) / 100;
  
  // Adjust for material complexity
  const complexityFactors = {
    'low': 0.8,
    'medium': 1.0,
    'high': 1.3,
    'very-high': 1.7
  };
  
  overhead *= complexityFactors[materialComplexity];
  
  // Add impact for each special handling requirement
  const specialHandlingImpact = 0.05; // 5% per special requirement
  overhead *= (1 + (specialRequirements.length * specialHandlingImpact));
  
  return overhead;
}

// Main calculation function
export function calculateLineBalancing(
  state: LineBalancingState
): Results | null {
  const {
    styles,
    totalHours,
    pfdFactor, 
    availableOperators,
    targetWeeklyOutput,
    targetMode,
    outputDistribution,
    batchSize,
    batchSetupTime,
    batchTransportTime,
    batchProcessingFactor,
    movementTimePerStep,
    movementDistanceFactor,
    useCustomMovementTimes,
    handlingOverheadPercentage,
    materialComplexity,
    specialHandlingRequirements
  } = state;

  if (styles.length === 0) {
    return null;
  }

  // Calculate available minutes
  const availableMinutes = totalHours * 60 * pfdFactor;

  // Prepare base calculations for each style
  const baseCalculations = styles.map(style => {
    // Find the bottleneck operation
    const bottleneckOperation = style.operations.reduce(
      (max, op) => op.sam > max.sam ? op : max,
      { sam: 0 } as OperationData
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

  let styleResults: StyleResult[] = [];
  
  if (targetMode === 'operators') {
    // Given operators, calculate output
    const totalWorkContent = baseCalculations.reduce((sum, calc) => sum + calc.totalWorkContent, 0);
    const totalOperators = availableOperators;
    
    // Calculate theoretical cycle time
    const theoreticalCycleTime = totalWorkContent / totalOperators;
    
    // Find the bottleneck across all styles
    const maxBottleneckTime = Math.max(...baseCalculations.map(calc => calc.bottleneckTime));
    
    // Actual cycle time can't be less than the bottleneck
    const actualCycleTime = Math.max(theoreticalCycleTime, maxBottleneckTime);
    
    // Calculate total output before adjustments
    const rawTotalPossibleOutput = Math.floor(availableMinutes / actualCycleTime);
    
    // Distribute output by style
    if (outputDistribution === 'balanced') {
      // Equal units per style
      const unitsPerStyle = Math.floor(rawTotalPossibleOutput / baseCalculations.length);
      styleResults = baseCalculations.map(calc => {
        // Calculate movement time impact
        const totalMovementTime = calculateTotalMovementTime(
          calc,
          useCustomMovementTimes,
          movementTimePerStep,
          movementDistanceFactor
        );
        
        // Calculate batch impact
        const batchImpact = calculateBatchImpact(
          calc,
          batchSize,
          batchSetupTime,
          batchTransportTime,
          batchProcessingFactor,
          unitsPerStyle
        );
        
        // Calculate material handling overhead
        const handlingOverhead = calculateHandlingOverhead(
          calc,
          handlingOverheadPercentage,
          materialComplexity,
          specialHandlingRequirements
        );
        
        // Calculate total adjusted time
        const totalAdjustedTime = calc.totalWorkContent + totalMovementTime + batchImpact + handlingOverhead;
        
        return {
          ...calc,
          allocatedOutput: unitsPerStyle,
          allocatedPercentage: 100 / baseCalculations.length,
          cycleTime: actualCycleTime,
          operatorsRequired: Math.ceil(totalAdjustedTime / actualCycleTime),
          totalMovementTime,
          batchImpact,
          handlingOverhead,
          totalAdjustedTime
        };
      });
    } else {
      // Custom distribution based on ratios
      const totalRatio = baseCalculations.reduce((sum, calc) => sum + calc.customRatio, 0);
      styleResults = baseCalculations.map(calc => {
        const styleOutput = Math.floor(rawTotalPossibleOutput * (calc.customRatio / totalRatio));
        
        // Calculate movement time impact
        const totalMovementTime = calculateTotalMovementTime(
          calc,
          useCustomMovementTimes,
          movementTimePerStep,
          movementDistanceFactor
        );
        
        // Calculate batch impact
        const batchImpact = calculateBatchImpact(
          calc,
          batchSize,
          batchSetupTime,
          batchTransportTime,
          batchProcessingFactor,
          styleOutput
        );
        
        // Calculate material handling overhead
        const handlingOverhead = calculateHandlingOverhead(
          calc,
          handlingOverheadPercentage,
          materialComplexity,
          specialHandlingRequirements
        );
        
        // Calculate total adjusted time
        const totalAdjustedTime = calc.totalWorkContent + totalMovementTime + batchImpact + handlingOverhead;
        
        return {
          ...calc,
          allocatedOutput: styleOutput,
          allocatedPercentage: (calc.customRatio / totalRatio) * 100,
          cycleTime: actualCycleTime,
          operatorsRequired: Math.ceil(totalAdjustedTime / actualCycleTime),
          totalMovementTime,
          batchImpact,
          handlingOverhead,
          totalAdjustedTime
        };
      });
    }
    
    const totalAllocatedOutput = styleResults.reduce((sum, res) => sum + res.allocatedOutput, 0);
    const totalOperatorsRequired = styleResults.reduce((sum, res) => sum + res.operatorsRequired, 0);
    
    // Calculate efficiency considering all factors
    const totalAdjustedWorkContent = styleResults.reduce(
      (sum, res) => sum + res.totalAdjustedTime,
      0
    );
    const efficiencyPercentage = (totalWorkContent / totalAdjustedWorkContent) * 100;
    
    // Calculate impact percentages
    const totalMovementTimeImpact = styleResults.reduce(
      (sum, res) => sum + res.totalMovementTime,
      0
    );
    const movementTimeImpactPercentage = (totalMovementTimeImpact / totalWorkContent) * 100;
    
    const totalBatchImpact = styleResults.reduce(
      (sum, res) => sum + res.batchImpact * res.allocatedOutput,
      0
    ) / totalAllocatedOutput;
    const batchImpactPercentage = (totalBatchImpact / totalWorkContent) * 100;
    
    const totalHandlingOverhead = styleResults.reduce(
      (sum, res) => sum + res.handlingOverhead,
      0
    );
    const handlingOverheadPercentage = (totalHandlingOverhead / totalWorkContent) * 100;
    
    return {
      totalWorkContent,
      availableOperators: totalOperators,
      theoreticalCycleTime,
      actualCycleTime,
      totalPossibleOutput: rawTotalPossibleOutput,
      totalAllocatedOutput,
      totalOperatorsRequired: Math.min(totalOperatorsRequired, totalOperators),
      efficiency: efficiencyPercentage,
      styleResults,
      calculationMode: 'operators-to-output',
      batchProcessingImpact: -batchImpactPercentage, // Negative because it decreases efficiency
      movementTimeImpact: movementTimeImpactPercentage,
      handlingOverheadImpact: handlingOverheadPercentage
    };
  } else {
    // Given output, calculate operators
    const totalTargetOutput = targetWeeklyOutput;
    
    // Distribute output by style
    if (outputDistribution === 'balanced') {
      // Equal units per style
      const unitsPerStyle = Math.floor(totalTargetOutput / baseCalculations.length);
      styleResults = baseCalculations.map(calc => {
        // Calculate movement time impact
        const totalMovementTime = calculateTotalMovementTime(
          calc,
          useCustomMovementTimes,
          movementTimePerStep,
          movementDistanceFactor
        );
        
        // Calculate batch impact
        const batchImpact = calculateBatchImpact(
          calc,
          batchSize,
          batchSetupTime,
          batchTransportTime,
          batchProcessingFactor,
          unitsPerStyle
        );
        
        // Calculate material handling overhead
        const handlingOverhead = calculateHandlingOverhead(
          calc,
          handlingOverheadPercentage,
          materialComplexity,
          specialHandlingRequirements
        );
        
        // Calculate total adjusted time
        const totalAdjustedTime = calc.totalWorkContent + totalMovementTime + batchImpact + handlingOverhead;
        
        // Calculate required cycle time to meet output
        const requiredCycleTime = availableMinutes / unitsPerStyle;
        
        // Actual cycle time can't be less than the bottleneck
        const actualCycleTime = Math.max(requiredCycleTime, calc.bottleneckTime);
        
        // Calculate operators needed
        const operatorsRequired = Math.ceil(totalAdjustedTime / actualCycleTime);
        
        return {
          ...calc,
          allocatedOutput: unitsPerStyle,
          allocatedPercentage: 100 / baseCalculations.length,
          cycleTime: actualCycleTime,
          operatorsRequired,
          totalMovementTime,
          batchImpact,
          handlingOverhead,
          totalAdjustedTime
        };
      });
    } else {
      // Custom distribution based on ratios
      const totalRatio = baseCalculations.reduce((sum, calc) => sum + calc.customRatio, 0);
      styleResults = baseCalculations.map(calc => {
        const styleOutput = Math.floor(totalTargetOutput * (calc.customRatio / totalRatio));
        
        // Calculate movement time impact
        const totalMovementTime = calculateTotalMovementTime(
          calc,
          useCustomMovementTimes,
          movementTimePerStep,
          movementDistanceFactor
        );
        
        // Calculate batch impact
        const batchImpact = calculateBatchImpact(
          calc,
          batchSize,
          batchSetupTime,
          batchTransportTime,
          batchProcessingFactor,
          styleOutput
        );
        
        // Calculate material handling overhead
        const handlingOverhead = calculateHandlingOverhead(
          calc,
          handlingOverheadPercentage,
          materialComplexity,
          specialHandlingRequirements
        );
        
        // Calculate total adjusted time
        const totalAdjustedTime = calc.totalWorkContent + totalMovementTime + batchImpact + handlingOverhead;
        
        // Calculate required cycle time to meet output
        const requiredCycleTime = availableMinutes / styleOutput;
        
        // Actual cycle time can't be less than the bottleneck
        const actualCycleTime = Math.max(requiredCycleTime, calc.bottleneckTime);
        
        // Calculate operators needed
        const operatorsRequired = Math.ceil(totalAdjustedTime / actualCycleTime);
        
        return {
          ...calc,
          allocatedOutput: styleOutput,
          allocatedPercentage: (calc.customRatio / totalRatio) * 100,
          cycleTime: actualCycleTime,
          operatorsRequired,
          totalMovementTime,
          batchImpact,
          handlingOverhead,
          totalAdjustedTime
        };
      });
    }
    
    const totalWorkContent = baseCalculations.reduce((sum, calc) => sum + calc.totalWorkContent, 0);
    const totalOperatorsRequired = styleResults.reduce((sum, res) => sum + res.operatorsRequired, 0);
    const totalAllocatedOutput = styleResults.reduce((sum, res) => sum + res.allocatedOutput, 0);
    const weightedCycleTime = styleResults.reduce((sum, res) => sum + res.cycleTime * res.allocatedOutput, 0) / totalAllocatedOutput;
    
    // Calculate total adjusted work content
    const totalAdjustedWorkContent = styleResults.reduce(
      (sum, res) => sum + res.totalAdjustedTime * res.allocatedOutput,
      0
    ) / totalAllocatedOutput;
    
    // Calculate efficiency
    const efficiencyPercentage = (totalWorkContent / totalAdjustedWorkContent) * 100;
    
    // Calculate impact percentages
    const totalMovementTimeImpact = styleResults.reduce(
      (sum, res) => sum + res.totalMovementTime,
      0
    );
    const movementTimeImpactPercentage = (totalMovementTimeImpact / totalWorkContent) * 100;
    
    const totalBatchImpact = styleResults.reduce(
      (sum, res) => sum + res.batchImpact * res.allocatedOutput,
      0
    ) / totalAllocatedOutput;
    const batchImpactPercentage = (totalBatchImpact / totalWorkContent) * 100;
    
    const totalHandlingOverhead = styleResults.reduce(
      (sum, res) => sum + res.handlingOverhead,
      0
    );
    const handlingOverheadPercentage = (totalHandlingOverhead / totalWorkContent) * 100;
    
    return {
      totalWorkContent,
      targetWeeklyOutput: totalTargetOutput,
      totalAllocatedOutput,
      totalOperatorsRequired,
      efficiency: efficiencyPercentage,
      styleResults,
      calculationMode: 'output-to-operators',
      totalPossibleOutput: totalAllocatedOutput, // Same as allocated in this mode
      batchProcessingImpact: -batchImpactPercentage, // Negative because it decreases efficiency
      movementTimeImpact: movementTimeImpactPercentage,
      handlingOverheadImpact: handlingOverheadPercentage
    };
  }
}
