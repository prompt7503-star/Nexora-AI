
import React from 'react';
import { SparkleIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-medium text-slate-600">Gemini</h1>
      </div>
      <div className="flex items-center space-x-4">
        <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
          <SparkleIcon className="w-4 h-4 text-blue-500" />
          <span>Upgrade</span>
        </button>
        <div className="relative">
          <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            M
          </div>
          <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-yellow-400 ring-2 ring-white"></span>
        </div>
      </div>
    </header>
  );
};

export default Header;
