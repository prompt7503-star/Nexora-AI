
import React from 'react';
import { MenuIcon, PencilIcon, SparkleIcon, ChartBarIcon, DotsHorizontalIcon, CogIcon } from './icons';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const navItems = [
    { icon: PencilIcon, label: 'New Chat' },
    { icon: SparkleIcon, label: 'Discover' },
    { icon: ChartBarIcon, label: 'Activity' },
    { icon: DotsHorizontalIcon, label: 'More', active: true },
  ];

  return (
    <div className={`relative flex flex-col bg-slate-100/70 h-full transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="flex-shrink-0 p-4">
        <button onClick={toggleSidebar} className="p-2 rounded-full hover:bg-slate-200">
          <MenuIcon className="w-6 h-6 text-slate-700" />
        </button>
      </div>
      <nav className="flex-grow px-4">
        <ul>
          {navItems.map((item, index) => (
            <li key={index}>
              <a
                href="#"
                title={item.label}
                className={`flex items-center p-3 my-2 rounded-full text-slate-800 transition-colors ${item.active ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200'}`}
              >
                <item.icon className="w-6 h-6 flex-shrink-0" />
                {isOpen && <span className="ml-4 font-medium">{item.label}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-shrink-0 p-4">
        <a href="#" title="Settings" className="flex items-center p-3 rounded-full text-slate-800 hover:bg-slate-200">
          <CogIcon className="w-6 h-6 flex-shrink-0" />
          {isOpen && <span className="ml-4 font-medium">Settings</span>}
        </a>
      </div>
    </div>
  );
};

export default Sidebar;
