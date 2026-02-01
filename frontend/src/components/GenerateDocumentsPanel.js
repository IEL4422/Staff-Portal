import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { FileText, FilePlus, ChevronRight } from 'lucide-react';

const GenerateDocumentsPanel = ({ clientId, clientName, caseType }) => {
  const navigate = useNavigate();

  const handleGenerate = () => {
    // Navigate to generate documents page with client pre-selected
    navigate(`/generate-documents?clientId=${clientId}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Generate Documents
          {caseType && (
            <Badge variant="outline" className="text-xs ml-2">
              {caseType}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-500">
          Generate documents from templates for this client. Staff inputs will be saved for future use.
        </p>
        <Button 
          onClick={handleGenerate}
          className="w-full bg-[#2E7DA1] hover:bg-[#256a8a]"
          data-testid="generate-documents-btn"
        >
          <FilePlus className="w-4 h-4 mr-2" />
          Generate Document
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default GenerateDocumentsPanel;
