import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { FileText, Map, Zap, ClipboardCheck } from 'lucide-react';
import TemplatesPanel from '../components/documents/TemplatesPanel';
import FieldMappingPanel from '../components/documents/FieldMappingPanel';
import GeneratePanel from '../components/documents/GeneratePanel';
import ReviewPanel from '../components/documents/ReviewPanel';

const tabs = [
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'mapping', label: 'Map Fields', icon: Map },
  { id: 'generate', label: 'Generate', icon: Zap },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
];

const DocumentModulePage = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'contact@illinoisestatelaw.com';

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          Document Generation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload templates, map fields, generate documents, and manage approvals
        </p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-[#2E7DA1] text-[#2E7DA1]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                )}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {activeTab === 'templates' && <TemplatesPanel />}
        {activeTab === 'mapping' && <FieldMappingPanel />}
        {activeTab === 'generate' && <GeneratePanel />}
        {activeTab === 'review' && <ReviewPanel isAdmin={isAdmin} />}
      </div>
    </div>
  );
};

export default DocumentModulePage;
