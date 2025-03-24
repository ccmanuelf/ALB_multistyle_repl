import React, { useState } from 'react';
import Papa from 'papaparse';
import { LineBalancingState, calculateLineBalancing } from '@/lib/line-balancing';
import StyleManagement from './style-management';
import StyleDetailView from './style-detail-view';
import BatchParameters from './batch-parameters';
import MovementParameters from './movement-parameters';
import HandlingParameters from './handling-parameters';

interface SetupTabProps {
  state: LineBalancingState;
}

export default function SetupTab({ state }: SetupTabProps) {
  const {
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
    setResults
  } = state;

  // Handle removing sample data
  const handleClearSampleData = () => {
    setUseSampleData(false);
    setStyles([]);
    setActiveStyleIndex(null);
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
          })).filter(op => !isNaN(op.sam) && op.sam > 0);
          
          // Add new style
          const styleName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
          
          const newStyle = {
            name: styleName,
            operations: styleOperations,
            customRatio: 1,
            totalWorkContent: styleOperations.reduce((sum, op) => sum + op.sam, 0),
            movementTimes: styleOperations.map((op, index) => {
              if (index === styleOperations.length - 1) return { fromStep: op.step, toStep: -1, time: 0 };
              const nextOp = styleOperations[index + 1];
              return { fromStep: op.step, toStep: nextOp.step, time: state.movementTimePerStep };
            })
          };
          
          setStyles(prev => [...prev, newStyle]);
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          alert(`Error parsing file ${file.name}: ${error.message}`);
        }
      });
    });
  };

  // Handle removing a file
  const handleRemoveFile = (index: number) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
  };

  // Recalculate results when inputs change
  React.useEffect(() => {
    const results = calculateLineBalancing(state);
    setResults(results);
  }, [
    styles, 
    totalHours, 
    pfdFactor, 
    availableOperators, 
    targetWeeklyOutput, 
    targetMode, 
    state.outputDistribution,
    state.batchSize,
    state.batchSetupTime,
    state.batchTransportTime,
    state.batchProcessingFactor,
    state.movementTimePerStep,
    state.movementDistanceFactor,
    state.useCustomMovementTimes,
    state.customMovementTimes,
    state.handlingOverheadPercentage,
    state.materialComplexity,
    state.specialHandlingRequirements
  ]);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M12 12v6"/>
              <path d="m15 15-3-3-3 3"/>
            </svg>
            Style Data Import
          </h2>
          
          {/* File Upload Area */}
          <div className="mb-6">
            <p className="mb-3 text-sm text-neutral-dark">
              Upload CSV files with operation data. Each file should contain columns for Step, Operation, Type, and SAM.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-neutral-medium hover:border-primary rounded-lg p-4 text-center transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="mt-2 text-sm">Upload CSV Files</p>
                  <input type="file" accept=".csv" multiple className="hidden" onChange={handleFileUpload}/>
                </div>
              </label>
              
              <button 
                className="py-2 px-4 bg-white border border-neutral-medium text-neutral-dark rounded hover:bg-neutral-light transition-colors"
                onClick={handleClearSampleData}
              >
                Clear Sample Data
              </button>
            </div>
          </div>
          
          {/* Uploaded Files List */}
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Uploaded Style Files</h3>
            
            {uploadedFiles.length > 0 ? (
              uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-neutral-light rounded mb-2">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <path d="M8 13h8"/>
                      <path d="M8 17h8"/>
                      <path d="M8 9h2"/>
                    </svg>
                    <span>{file.name}</span>
                  </div>
                  <button 
                    className="text-neutral-dark hover:text-error" 
                    title="Remove file"
                    onClick={() => handleRemoveFile(index)}
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
              ))
            ) : (
              uploadedFiles.length === 0 && !useSampleData && (
                <div className="text-center py-4 text-neutral-dark italic text-sm">
                  No files uploaded yet
                </div>
              )
            )}
          </div>
          
          {/* Sample Data Notice */}
          {useSampleData && (
            <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <div>
                  <p className="font-medium">Using Sample Data</p>
                  <p className="mt-1">You're currently using sample Jogger Pants data. Upload your own CSV files or clear sample data to start fresh.</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Line Configuration Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Line Configuration
          </h2>
          
          {/* Calculation Mode */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Calculation Mode</h3>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="targetMode" 
                  value="operators" 
                  checked={targetMode === 'operators'} 
                  className="h-4 w-4 text-primary" 
                  onChange={() => setTargetMode('operators')}
                />
                <span className="ml-2">Calculate Output from Operators</span>
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="targetMode" 
                  value="output" 
                  checked={targetMode === 'output'} 
                  className="h-4 w-4 text-primary" 
                  onChange={() => setTargetMode('output')}
                />
                <span className="ml-2">Calculate Operators from Target Output</span>
              </label>
            </div>
          </div>
          
          {/* Basic Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-1">Working Hours per Week</label>
              <input 
                type="number" 
                value={totalHours} 
                min="1" 
                step="0.5" 
                className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary" 
                onChange={(e) => setTotalHours(parseFloat(e.target.value))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-1">PFD Factor</label>
              <input 
                type="number" 
                value={pfdFactor} 
                min="0.1" 
                max="1" 
                step="0.01" 
                className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary" 
                onChange={(e) => setPfdFactor(parseFloat(e.target.value))}
              />
            </div>
            
            {targetMode === 'operators' && (
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Available Operators</label>
                <input 
                  type="number" 
                  value={availableOperators} 
                  min="1" 
                  step="1" 
                  className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary" 
                  onChange={(e) => setAvailableOperators(parseInt(e.target.value))}
                />
              </div>
            )}
            
            {targetMode === 'output' && (
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Target Weekly Output</label>
                <input 
                  type="number" 
                  value={targetWeeklyOutput} 
                  min="1" 
                  step="10" 
                  className="w-full p-2 border border-neutral-medium rounded focus:ring-1 focus:ring-primary focus:border-primary" 
                  onChange={(e) => setTargetWeeklyOutput(parseInt(e.target.value))}
                />
              </div>
            )}
          </div>
          
          {/* Batch Processing Parameters */}
          <BatchParameters state={state} />
          
          {/* Material Movement Parameters */}
          <MovementParameters state={state} />
          
          {/* Material Handling Overhead */}
          <HandlingParameters state={state} />
        </div>
      </div>
      
      {/* Style Management Section */}
      <StyleManagement state={state} />
      
      {/* Style Detail View */}
      {activeStyleIndex !== null && styles.length > activeStyleIndex && (
        <StyleDetailView state={state} />
      )}
    </div>
  );
}
