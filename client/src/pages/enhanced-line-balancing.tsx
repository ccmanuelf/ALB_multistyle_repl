import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SetupTab from "@/components/line-balancing/setup-tab";
import CalculationsTab from "@/components/line-balancing/calculations-tab";
import VisualizationTab from "@/components/line-balancing/visualization-tab";
import { OperationData, LineBalancingState, StyleData, Results } from '@/lib/line-balancing';

export default function EnhancedLineBalancing() {
  // State for file upload and data
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [styles, setStyles] = useState<StyleData[]>([]);
  const [activeStyleIndex, setActiveStyleIndex] = useState<number | null>(null);
  const [useSampleData, setUseSampleData] = useState(true);
  
  // State for inputs
  const [totalHours, setTotalHours] = useState(45);
  const [pfdFactor, setPfdFactor] = useState(0.85);
  const [availableOperators, setAvailableOperators] = useState(17);
  const [targetWeeklyOutput, setTargetWeeklyOutput] = useState(1000);
  const [targetMode, setTargetMode] = useState<'operators' | 'output'>('operators');
  const [outputDistribution, setOutputDistribution] = useState<'balanced' | 'custom'>('balanced');

  // State for batch processing
  const [batchSize, setBatchSize] = useState(24);
  const [batchSetupTime, setBatchSetupTime] = useState(15);
  const [batchTransportTime, setBatchTransportTime] = useState(5);
  const [batchProcessingFactor, setBatchProcessingFactor] = useState(0.95);

  // State for material movement
  const [movementTimePerStep, setMovementTimePerStep] = useState(0.5);
  const [movementDistanceFactor, setMovementDistanceFactor] = useState(1.0);
  const [useCustomMovementTimes, setUseCustomMovementTimes] = useState(false);
  const [customMovementTimes, setCustomMovementTimes] = useState<{fromStep: number, toStep: number, time: number}[]>([]);

  // State for material handling
  const [handlingOverheadPercentage, setHandlingOverheadPercentage] = useState(5);
  const [materialComplexity, setMaterialComplexity] = useState<'low' | 'medium' | 'high' | 'very-high'>('medium');
  const [specialHandlingRequirements, setSpecialHandlingRequirements] = useState<string[]>([]);

  // State for results
  const [results, setResults] = useState<Results | null>(null);
  
  // Sample data for initial load
  const sampleJoggerData: OperationData[] = [
    {step: 1, operation: 'Estampar etiqueta', type: 'Ink Transfer', sam: 0.429, isManual: false},
    {step: 2, operation: 'Estampar (Logo Cross)', type: 'Heat Press Transfer', sam: 0.45, isManual: false},
    {step: 3, operation: 'Cortar elástico', type: 'Guillotina Neumatica', sam: 0.083, isManual: false},
    {step: 40, operation: 'Unir laterales', type: 'Seaming Stitch 514', sam: 2.0, isManual: false},
    {step: 43, operation: 'Coser bolsas de cargo', type: 'S.N.L.S. 301', sam: 2.0, isManual: false},
    {step: 60, operation: 'Desehebrar e inspeccionar', type: 'Manual', sam: 2.0, isManual: true},
  ];

  // Initialize with sample data
  React.useEffect(() => {
    if (useSampleData && styles.length === 0) {
      const sampleStyle: StyleData = {
        name: 'Jogger Pants',
        operations: sampleJoggerData,
        customRatio: 1,
        totalWorkContent: sampleJoggerData.reduce((sum, op) => sum + op.sam, 0),
        movementTimes: []
      };
      
      // Add default movement times
      sampleStyle.movementTimes = sampleJoggerData.map((op, index) => {
        if (index === sampleJoggerData.length - 1) return { fromStep: op.step, toStep: -1, time: 0 };
        const nextOp = sampleJoggerData[index + 1];
        return { fromStep: op.step, toStep: nextOp.step, time: 0.5 };
      });
      
      // Special movement times for the sample data
      sampleStyle.movementTimes.find(m => m.fromStep === 40)!.time = 0.8;
      sampleStyle.movementTimes.find(m => m.fromStep === 43)!.time = 0.7;
      
      setStyles([sampleStyle]);
    }
  }, [useSampleData, styles.length]);

  // Combine all state into a single object for passing to child components
  const lineBalancingState: LineBalancingState = {
    uploadedFiles,
    setUploadedFiles,
    styles,
    setStyles,
    activeStyleIndex,
    setActiveStyleIndex,
    useSampleData,
    setUseSampleData,
    totalHours,
    setTotalHours,
    pfdFactor,
    setPfdFactor,
    availableOperators,
    setAvailableOperators,
    targetWeeklyOutput,
    setTargetWeeklyOutput,
    targetMode,
    setTargetMode,
    outputDistribution,
    setOutputDistribution,
    batchSize,
    setBatchSize,
    batchSetupTime,
    setBatchSetupTime,
    batchTransportTime,
    setBatchTransportTime,
    batchProcessingFactor,
    setBatchProcessingFactor,
    movementTimePerStep,
    setMovementTimePerStep,
    movementDistanceFactor,
    setMovementDistanceFactor,
    useCustomMovementTimes,
    setUseCustomMovementTimes,
    customMovementTimes,
    setCustomMovementTimes,
    handlingOverheadPercentage,
    setHandlingOverheadPercentage,
    materialComplexity,
    setMaterialComplexity,
    specialHandlingRequirements,
    setSpecialHandlingRequirements,
    results,
    setResults
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Enhanced Assembly Line Balancing Tool</h1>
        <p className="text-neutral-dark">Optimize your production line with advanced balancing features</p>
      </header>
      
      <Tabs defaultValue="setup">
        <TabsList className="mb-6 w-full border-b border-neutral-medium">
          <TabsTrigger value="setup" className="py-2 px-4 font-medium data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Setup
          </TabsTrigger>
          <TabsTrigger value="calculations" className="py-2 px-4 font-medium data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Calculations & Results
          </TabsTrigger>
          <TabsTrigger value="visualization" className="py-2 px-4 font-medium data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Visualization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <SetupTab state={lineBalancingState} />
        </TabsContent>

        <TabsContent value="calculations">
          <CalculationsTab state={lineBalancingState} />
        </TabsContent>

        <TabsContent value="visualization">
          <VisualizationTab state={lineBalancingState} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
