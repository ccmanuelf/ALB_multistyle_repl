import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, FileDown, HelpCircle, BookOpen, Calculator } from "lucide-react";

export default function Documentation() {
  const [activeTab, setActiveTab] = useState("getting-started");
  
  // Function to generate and download the CSV template
  const handleDownloadTemplate = () => {
    // Create CSV content
    const headers = "Step,Operation,Type,SAM,IsManual";
    const sampleRows = [
      "1,Estampar etiqueta,Ink Transfer,0.429,false",
      "2,Coser hombros,Overlock 504,0.6,false",
      "3,Pegar cuello,Coverstitch 406,1.2,false",
      "4,Inspección final,Manual,0.5,true"
    ];
    
    const csvContent = [headers, ...sampleRows].join('\n');
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'line_balancing_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Line Balancing Tool Documentation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left sidebar for navigation */}
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Documentation</CardTitle>
              <CardDescription>
                Learn how to use the line balancing tool effectively
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="flex flex-col gap-1">
                <Button 
                  variant={activeTab === "getting-started" ? "default" : "ghost"} 
                  className="justify-start" 
                  onClick={() => setActiveTab("getting-started")}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Getting Started
                </Button>
                <Button 
                  variant={activeTab === "instructions" ? "default" : "ghost"} 
                  className="justify-start" 
                  onClick={() => setActiveTab("instructions")}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  User Instructions
                </Button>
                <Button 
                  variant={activeTab === "formulas" ? "default" : "ghost"} 
                  className="justify-start" 
                  onClick={() => setActiveTab("formulas")}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculation Formulas
                </Button>
                <Button 
                  variant={activeTab === "data-format" ? "default" : "ghost"} 
                  className="justify-start" 
                  onClick={() => setActiveTab("data-format")}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Data Format Guide
                </Button>
              </nav>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="flex flex-col gap-1">
                <Button 
                  variant="ghost" 
                  className="justify-start text-blue-600"
                  onClick={handleDownloadTemplate}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content area */}
        <div className="col-span-1 md:col-span-3">
          {/* Getting Started */}
          {activeTab === "getting-started" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Getting Started with Line Balancing</CardTitle>
                <CardDescription>
                  Introduction to the line balancing tool and its features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">What is Line Balancing?</h3>
                  <p>
                    Line balancing is the process of distributing workload evenly across workstations or operators to minimize bottlenecks,
                    reduce idle time, and maximize productivity in a manufacturing assembly line.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Tool Features</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Standard line balancing calculations for single-style production</li>
                    <li>Advanced multi-style line balancing for mixed production scenarios</li>
                    <li>Batch processing considerations with setup time distribution</li>
                    <li>Material movement time tracking between operation steps</li>
                    <li>Material handling overhead calculations</li>
                    <li>Operator skill level adjustments</li>
                    <li>Manual operator allocation with automatic efficiency comparison</li>
                    <li>Visual representation of workload distribution</li>
                    <li>Output and efficiency metrics</li>
                    <li>Multiple shift considerations</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-md">
                  <h3 className="text-md font-medium flex items-center">
                    <InfoIcon className="h-4 w-4 mr-2 text-blue-600" />
                    Quick Navigation
                  </h3>
                  <p className="text-sm mt-1">
                    Use the navigation bar at the top of the page to switch between Standard line balancing and 
                    Multi-style line balancing modes.
                  </p>
                </div>
                
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>Start with sample data</AlertTitle>
                  <AlertDescription>
                    The tool loads with sample data by default. You can explore the features using this data or upload your own CSV files.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
          
          {/* User Instructions */}
          {activeTab === "instructions" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Step-by-Step User Instructions</CardTitle>
                <CardDescription>
                  Follow these instructions to use the line balancing tool effectively
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">1. Data Input</h3>
                  <div className="pl-5 space-y-2">
                    <p><strong>a. Using Sample Data:</strong> The tool loads with sample data by default.</p>
                    <p><strong>b. Uploading Your Data:</strong></p>
                    <ul className="list-disc pl-5">
                      <li>Prepare a CSV file with columns: Step, Operation, Type, SAM (Standard Allowed Minutes)</li>
                      <li>Click on the "Choose File" button in the "Style Data Import" section</li>
                      <li>Select your CSV file(s) - each file will be imported as a separate style</li>
                      <li>The tool will automatically parse the data and display the operations</li>
                    </ul>
                    <p><strong>c. Adjusting Skill Levels:</strong></p>
                    <ul className="list-disc pl-5">
                      <li>For each operation, you can adjust the skill level percentage (default: 100%)</li>
                      <li>Lower skill levels will increase the SAM time for that operation</li>
                      <li>Formula: Adjusted SAM = Original SAM / (Skill Level / 100)</li>
                    </ul>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">2. Basic Parameters</h3>
                  <div className="pl-5 space-y-2">
                    <p><strong>a. Target Mode:</strong></p>
                    <ul className="list-disc pl-5">
                      <li>"Available Operators → Output": Calculate maximum output based on operator headcount</li>
                      <li>"Target Output → Operators": Calculate required operators to achieve a target output</li>
                    </ul>
                    
                    <p><strong>b. Output Distribution:</strong></p>
                    <ul className="list-disc pl-5">
                      <li>"Balanced by Work Content": Distribute operators proportionally to work content</li>
                      <li>"Custom Ratio": Manually set the production ratio between styles</li>
                    </ul>
                    
                    <p><strong>c. Total Weekly Hours:</strong> Total available production hours per week</p>
                    
                    <p><strong>d. PFD Factor:</strong> Personal, fatigue, and delay factor (typically 0.8-0.9)</p>
                    
                    <p><strong>e. Available Operators or Target Weekly Output:</strong> Depending on target mode</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">3. Shift Configuration</h3>
                  <div className="pl-5 space-y-2">
                    <p><strong>a. Shifts per Day:</strong> Select 1, 2, or 3 shifts</p>
                    <p><strong>b. Hours per Shift:</strong> Set the duration of each shift</p>
                    <p><strong>c. Selective Operations Assignment (optional):</strong></p>
                    <ul className="list-disc pl-5">
                      <li>Enable to assign specific operations to specific shifts</li>
                      <li>Use the checkboxes to select which operations run in which shifts</li>
                    </ul>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">4. Advanced Parameters</h3>
                  <div className="pl-5 space-y-2">
                    <p><strong>a. Batch Processing:</strong></p>
                    <ul className="list-disc pl-5">
                      <li>Batch Size: Number of units processed in one batch</li>
                      <li>Batch Setup Time: Time required to set up each batch (minutes)</li>
                      <li>Batch Efficiency Factor: Percentage reduction in processing time due to batch efficiencies</li>
                    </ul>
                    
                    <p><strong>b. Material Movement:</strong></p>
                    <ul className="list-disc pl-5">
                      <li>Movement Time per Operation: Time required to move materials between operations (seconds)</li>
                    </ul>
                    
                    <p><strong>c. Material Handling:</strong></p>
                    <ul className="list-disc pl-5">
                      <li>Handling Overhead: Additional overhead percentage for handling materials</li>
                    </ul>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">5. Calculation and Results</h3>
                  <div className="pl-5 space-y-2">
                    <p><strong>a. Calculate Line Balancing:</strong></p>
                    <ul className="list-disc pl-5">
                      <li>Click the "Calculate Line Balancing" button to perform calculations</li>
                      <li>Review the summary cards showing total work content, operators, and output</li>
                      <li>Check the Style Results Table for detailed breakdown by style</li>
                    </ul>
                    
                    <p><strong>b. Operator Allocation:</strong></p>
                    <ul className="list-disc pl-5">
                      <li>Switch between "Automatic Assignment" and "Manual Assignment" modes</li>
                      <li>For multi-style planning, toggle "Combine all styles for operator allocation"</li>
                      <li>In manual mode, assign each operation to a specific operator using the dropdown menus</li>
                      <li>View the allocation visualization to see how operations are distributed</li>
                      <li>Compare automatic vs. manual allocation metrics for efficiency and workload balance</li>
                    </ul>
                    
                    <p><strong>c. Style Performance Charts:</strong></p>
                    <ul className="list-disc pl-5">
                      <li>Output Distribution: Pie chart showing output distribution across styles</li>
                      <li>Operator Distribution: Pie chart showing operator allocation across styles</li>
                      <li>Work Content Breakdown: Bar chart showing original work content and added factors</li>
                      <li>Hourly Production: Bar chart showing units produced per hour for each style</li>
                    </ul>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">6. Multi-Style Mode</h3>
                  <div className="pl-5 space-y-2">
                    <p>For mixed production planning:</p>
                    <ul className="list-disc pl-5">
                      <li>Navigate to the "Multi-Style Line Balancing" page using the top navigation</li>
                      <li>Upload multiple style files or use the provided sample data</li>
                      <li>In the Operator Allocation section, enable "Combine all styles for operator allocation"</li>
                      <li>This mode combines operations from all styles, showing style identifiers in visualizations</li>
                      <li>Operators can be assigned operations from different styles based on optimal workflow</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Calculation Formulas */}
          {activeTab === "formulas" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Calculation Formulas</CardTitle>
                <CardDescription>
                  Mathematical formulas used in the line balancing calculations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Basic Calculations</h3>
                  
                  <div className="pl-5 space-y-3">
                    <div>
                      <p className="font-medium">Total Work Content (TWC)</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        TWC = ∑ SAM<sub>i</sub> for all operations i
                      </div>
                      <p className="text-sm mt-1">Sum of Standard Allowed Minutes for all operations</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Available Minutes</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Available Minutes = Total Hours × 60 × PFD Factor
                      </div>
                      <p className="text-sm mt-1">For multiple shifts: Sum of (Hours per Shift × 5 days) × 60 × PFD Factor</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Theoretical Cycle Time</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Theoretical Cycle Time = TWC / Number of Operators
                      </div>
                      <p className="text-sm mt-1">The time interval at which completed units come off the line</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Output Calculation</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Weekly Output = Available Minutes / Cycle Time
                      </div>
                      <p className="text-sm mt-1">Number of units that can be produced in a week</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Operator Requirement</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Operators Required = TWC / Required Cycle Time
                      </div>
                      <p className="text-sm mt-1">Where Required Cycle Time = Available Minutes / Target Output</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Adjusted Calculations</h3>
                  
                  <div className="pl-5 space-y-3">
                    <div>
                      <p className="font-medium">Skill Level Adjustment</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Adjusted SAM = Original SAM / (Skill Level / 100)
                      </div>
                      <p className="text-sm mt-1">Example: 0.429 min at 90% skill level = 0.429/0.9 = 0.477 min</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Batch Processing Impact</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Setup Time Per Unit = Batch Setup Time / Batch Size<br />
                        Efficiency Gain = TWC × (Batch Efficiency Factor / 100)<br />
                        Batch Adjusted TWC = (TWC - Efficiency Gain) + Setup Time Per Unit
                      </div>
                      <p className="text-sm mt-1">Distributes setup time across batch and applies efficiency factor</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Material Movement Time</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Movement Time = (Number of Operations - 1) × (Movement Time per Operation / 60)
                      </div>
                      <p className="text-sm mt-1">Converts movement time from seconds to minutes and multiplies by transitions</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Material Handling Overhead</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Handling Overhead Time = Batch Adjusted TWC × (Handling Overhead Percentage / 100)
                      </div>
                      <p className="text-sm mt-1">Adds overhead time for material handling</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Total Adjusted Work Content</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Total Adjusted TWC = Batch Adjusted TWC + Movement Time + Handling Overhead Time
                      </div>
                      <p className="text-sm mt-1">Final work content used for calculations</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Performance Metrics</h3>
                  
                  <div className="pl-5 space-y-3">
                    <div>
                      <p className="font-medium">Line Efficiency</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Efficiency = (Total Allocated Output / Total Possible Output) × 100
                      </div>
                      <p className="text-sm mt-1">Measures how close the line is to theoretical maximum output</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Operator Utilization</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Utilization = (Operator Workload / Cycle Time) × 100
                      </div>
                      <p className="text-sm mt-1">Percentage of cycle time an operator is working</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Workload Balance</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Balance Score = 100 - Standard Deviation of Utilization Percentages
                      </div>
                      <p className="text-sm mt-1">Higher score indicates more balanced workload distribution</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Multi-Style Considerations</h3>
                  
                  <div className="pl-5 space-y-3">
                    <div>
                      <p className="font-medium">Output Distribution (Balanced)</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Style Proportion = Style TWC / Total TWC<br />
                        Style Operators = Total Operators × Style Proportion<br />
                        Style Output = Available Minutes / (Style TWC / Style Operators)
                      </div>
                      <p className="text-sm mt-1">Distributes operators and output based on work content proportions</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Output Distribution (Custom)</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                        Style Proportion = Style Custom Ratio / Sum of All Custom Ratios<br />
                        Style Output and Operators calculated as in balanced distribution
                      </div>
                      <p className="text-sm mt-1">Allows manual specification of production proportions</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Data Format Guide */}
          {activeTab === "data-format" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Data Format Guide</CardTitle>
                <CardDescription>
                  How to prepare your data for the line balancing tool
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">CSV File Format</h3>
                  <p>
                    The tool accepts CSV (Comma-Separated Values) files with the following columns:
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-md mt-2 overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-2 border">Column</th>
                          <th className="px-4 py-2 border">Required</th>
                          <th className="px-4 py-2 border">Data Type</th>
                          <th className="px-4 py-2 border">Description</th>
                          <th className="px-4 py-2 border">Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-2 border font-medium">Step</td>
                          <td className="px-4 py-2 border">Yes</td>
                          <td className="px-4 py-2 border">Number</td>
                          <td className="px-4 py-2 border">Operation step number (used for ordering and reference)</td>
                          <td className="px-4 py-2 border">1, 2, 3, etc.</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 border font-medium">Operation</td>
                          <td className="px-4 py-2 border">Yes</td>
                          <td className="px-4 py-2 border">Text</td>
                          <td className="px-4 py-2 border">Name or description of the operation</td>
                          <td className="px-4 py-2 border">"Estampar etiqueta"</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 border font-medium">Type</td>
                          <td className="px-4 py-2 border">Yes</td>
                          <td className="px-4 py-2 border">Text</td>
                          <td className="px-4 py-2 border">Machine or operation type</td>
                          <td className="px-4 py-2 border">"Overlock 504", "Manual"</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 border font-medium">SAM</td>
                          <td className="px-4 py-2 border">Yes</td>
                          <td className="px-4 py-2 border">Number</td>
                          <td className="px-4 py-2 border">Standard Allowed Minutes for the operation</td>
                          <td className="px-4 py-2 border">0.429, 1.2, etc.</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 border font-medium">IsManual</td>
                          <td className="px-4 py-2 border">No</td>
                          <td className="px-4 py-2 border">Boolean</td>
                          <td className="px-4 py-2 border">Whether the operation is manual (true) or machine-based (false)</td>
                          <td className="px-4 py-2 border">true, false</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <p className="mt-3">
                    <strong>Note:</strong> If the IsManual column is not provided, the tool will automatically set it to true if the Type column contains the word "Manual".
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Example CSV Content</h3>
                  
                  <div className="bg-gray-50 p-4 rounded-md mt-2 font-mono text-sm whitespace-pre overflow-x-auto">
Step,Operation,Type,SAM,IsManual
1,Estampar etiqueta,Ink Transfer,0.429,false
2,Estampar (Logo Cross),Heat Press Transfer,0.45,false
3,Cortar elástico,Guillotina Neumatica,0.083,false
40,Unir laterales,Seaming Stitch 514,2.0,false
43,Coser bolsas de cargo,S.N.L.S. 301,2.0,false
60,Desehebrar e inspeccionar,Manual,2.0,true
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Creating a CSV File</h3>
                  
                  <p>You can create a CSV file using:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Spreadsheet software (Microsoft Excel, Google Sheets, etc.)</li>
                    <li>Text editors (save with .csv extension)</li>
                  </ul>
                  
                  <p className="mt-2">Steps to create a CSV file with Excel:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Open Microsoft Excel</li>
                    <li>Enter the column headers in row 1: Step, Operation, Type, SAM, IsManual</li>
                    <li>Enter your data in the rows below</li>
                    <li>Save the file: File → Save As → Select "CSV (Comma delimited) (*.csv)" format</li>
                  </ol>
                </div>
                
                <div className="mt-6">
                  <Button 
                    onClick={handleDownloadTemplate}
                    size="lg"
                    className="flex items-center"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Download CSV Template
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    Click to download a template CSV file that you can fill with your own data.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}