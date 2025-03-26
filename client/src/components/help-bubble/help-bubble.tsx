import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { HelpCircle, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

// SVG for friendly mascot
const MascotSVG = () => (
  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="28" fill="#FFD0D0" stroke="#FF6B6B" strokeWidth="2" />
    <circle cx="20" cy="25" r="3" fill="#333333" />
    <circle cx="40" cy="25" r="3" fill="#333333" />
    <path d="M22 38C25.3333 41.3333 34.6667 41.3333 38 38" stroke="#333333" strokeWidth="2" strokeLinecap="round" />
    <path d="M15 20C15 20 18 16 22 18" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" />
    <path d="M45 20C45 20 42 16 38 18" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

interface HelpContent {
  title: string;
  content: React.ReactNode;
}

// Help content for different pages/sections
const helpContentMap: Record<string, HelpContent> = {
  '/': {
    title: 'Standard Line Balancing',
    content: (
      <div className="space-y-2 text-sm">
        <p>Welcome to the Standard Line Balancing tool! Here you can:</p>
        <ul className="list-disc pl-5">
          <li>Upload operation data via CSV files</li>
          <li>Configure line parameters like operators and batch size</li>
          <li>Calculate optimal line balancing for single-style production</li>
          <li>Visualize workload distribution across operators</li>
        </ul>
        <p className="mt-2 italic">Tip: Start with the provided sample data to explore the features!</p>
      </div>
    ),
  },
  '/multi-style': {
    title: 'Multi-Style Line Balancing',
    content: (
      <div className="space-y-2 text-sm">
        <p>The Multi-Style tool allows you to:</p>
        <ul className="list-disc pl-5">
          <li>Work with multiple styles simultaneously</li>
          <li>Combine operations from different styles for efficient planning</li>
          <li>Balance workload across operators handling diverse products</li>
          <li>Optimize production for mixed-model assembly lines</li>
        </ul>
        <p className="mt-2 italic">Tip: Enable "Combine all styles for operator allocation" in the Operator Allocation section!</p>
      </div>
    ),
  },
  '/documentation': {
    title: 'Documentation',
    content: (
      <div className="space-y-2 text-sm">
        <p>This documentation includes:</p>
        <ul className="list-disc pl-5">
          <li>Step-by-step instructions for all features</li>
          <li>Mathematical formulas explaining calculations</li>
          <li>Data format guidelines and CSV templates</li>
          <li>Visual examples and best practices</li>
        </ul>
        <p className="mt-2 italic">Tip: Download the CSV template to prepare your own operation data!</p>
      </div>
    ),
  },
  'default': {
    title: 'Need Help?',
    content: (
      <div className="space-y-2 text-sm">
        <p>Hi there! I'm Balancy, your friendly line balancing assistant.</p>
        <p>I can help you navigate this tool and provide tips for efficient production planning.</p>
        <p className="mt-2 italic">Use the navigation menu above to explore different features!</p>
      </div>
    ),
  },
};

// Component for context-sensitive help bubbles
export function HelpBubble() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentHelp, setCurrentHelp] = useState<HelpContent>(helpContentMap.default);
  const [showInitialHelp, setShowInitialHelp] = useState(true);

  // Update help content when location changes
  useEffect(() => {
    const helpContent = helpContentMap[location] || helpContentMap.default;
    setCurrentHelp(helpContent);
    
    // Show help bubble automatically on first visit to each section
    const visitedPages = JSON.parse(localStorage.getItem('visitedPages') || '[]');
    if (!visitedPages.includes(location)) {
      // Add a slight delay before showing
      const timer = setTimeout(() => {
        setIsOpen(true);
        // Add to visited pages
        localStorage.setItem('visitedPages', JSON.stringify([...visitedPages, location]));
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Close initial welcome message after 5 seconds
  useEffect(() => {
    if (showInitialHelp) {
      const timer = setTimeout(() => {
        setShowInitialHelp(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showInitialHelp]);

  return (
    <>
      {/* Initial welcome message */}
      <AnimatePresence>
        {showInitialHelp && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 right-24 z-50"
          >
            <Card className="w-64 shadow-lg border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex gap-2 items-start mb-2">
                  <MascotSVG />
                  <div>
                    <h3 className="font-medium text-blue-800">Hi there! 👋</h3>
                    <p className="text-sm text-blue-600">
                      I'm Balancy, your friendly line balancing assistant! Click me if you need help.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => setShowInitialHelp(false)}
                >
                  Got it!
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help bubble toggle button */}
      <div className="fixed bottom-8 right-8 z-50">
        <AnimatePresence>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mb-4"
            >
              <Card className="w-72 shadow-lg border-blue-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg flex items-center">
                      <MascotSVG />
                      <span className="ml-2">{currentHelp.title}</span>
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-gray-700">
                    {currentHelp.content}
                  </div>
                  <div className="mt-4 text-right">
                    <Button 
                      variant="link" 
                      size="sm" 
                      asChild
                      className="text-blue-600 p-0"
                    >
                      <a href="/documentation" target="_self">View full documentation</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button 
            onClick={() => setIsOpen(!isOpen)} 
            className="h-14 w-14 rounded-full shadow-md bg-blue-600 hover:bg-blue-700"
            aria-label="Help"
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <div className="relative">
                <MascotSVG />
                <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-white text-xs">?</div>
              </div>
            )}
          </Button>
        </motion.div>
      </div>
    </>
  );
}