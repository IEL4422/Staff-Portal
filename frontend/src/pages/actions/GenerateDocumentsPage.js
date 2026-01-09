import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { FileText, Scale, FileSignature, ArrowLeft, ArrowRight } from 'lucide-react';

const GenerateDocumentsPage = () => {
  const navigate = useNavigate();

  const documentTypes = [
    {
      title: 'Court Order',
      description: 'Generate a court order document for probate cases',
      icon: Scale,
      path: '/actions/generate-documents/court-order',
      color: 'bg-purple-100 text-purple-700',
    },
    {
      title: 'Quit Claim Deed',
      description: 'Generate a quit claim deed for property transfer',
      icon: FileSignature,
      path: '/actions/generate-documents/quit-claim-deed',
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Legal Letter',
      description: 'Generate a formal legal letter',
      icon: FileText,
      path: '/actions/generate-documents/legal-letter',
      color: 'bg-green-100 text-green-700',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in" data-testid="generate-documents-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="p-2"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Generate Documents
          </h1>
          <p className="text-slate-500 mt-1">
            Select the type of document you want to generate
          </p>
        </div>
      </div>

      {/* Document Type Cards */}
      <div className="grid gap-4">
        {documentTypes.map((docType) => (
          <Card 
            key={docType.title}
            className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            onClick={() => navigate(docType.path)}
            data-testid={`doc-type-${docType.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${docType.color}`}>
                    <docType.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">{docType.title}</h3>
                    <p className="text-sm text-slate-500">{docType.description}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#2E7DA1] transition-colors" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GenerateDocumentsPage;
