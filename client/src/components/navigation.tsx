import React from 'react';
import { Link, useLocation } from 'wouter';

export default function Navigation() {
  const [location] = useLocation();

  return (
    <div className="bg-blue-50 p-4 border-b">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-xl font-bold text-blue-700">
          Manufacturing Line Balancing
        </div>
        <nav className="flex space-x-6">
          <Link href="/">
            <span className={`font-medium cursor-pointer ${location === '/' ? 'text-blue-700 underline' : 'text-gray-600 hover:text-blue-700'}`}>
              Standard Line Balancing
            </span>
          </Link>
          <Link href="/multi-style">
            <span className={`font-medium cursor-pointer ${location === '/multi-style' ? 'text-blue-700 underline' : 'text-gray-600 hover:text-blue-700'}`}>
              Multi-Style Line Balancing
            </span>
          </Link>
          <Link href="/documentation">
            <span className={`font-medium cursor-pointer ${location === '/documentation' ? 'text-blue-700 underline' : 'text-gray-600 hover:text-blue-700'}`}>
              Documentation
            </span>
          </Link>
        </nav>
      </div>
    </div>
  );
}