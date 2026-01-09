import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterListApi, documentGenerationApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeft, Loader2, Search, Scale, Check } from 'lucide-react';
import { toast } from 'sonner';

const CourtOrderPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Search for matters with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await masterListApi.search(searchQuery);
        setSearchResults(response.data.records || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectMatter = (record) => {
    setSelectedMatter(record);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMatter) {
      toast.error('Please select a matter');
      return;
    }

    setSubmitting(true);
    try {
      await documentGenerationApi.create({
        document_type: 'Court Order',
        matter_id: selectedMatter.id,
        additional_notes: additionalNotes,
      });

      toast.success('Court Order record created successfully!');
      navigate('/actions/generate-documents');
    } catch (error) {
      console.error('Failed to create document:', error);
      toast.error('Failed to create document. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in" data-testid="court-order-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/actions/generate-documents')}
          className="p-2"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Court Order
            </h1>
            <p className="text-slate-500 text-sm">Generate a court order document</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Link to Matter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Matter Search */}
            {!selectedMatter ? (
              <div className="space-y-2">
                <Label>Search Matter *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by matter name or client name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="matter-search-input"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#2E7DA1]" />
                  )}
                </div>
                
                {searchResults.length > 0 && (
                  <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {searchResults.map((record) => (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => handleSelectMatter(record)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 border-b last:border-0 transition-colors"
                        data-testid={`matter-option-${record.id}`}
                      >
                        <p className="font-medium text-slate-900">{record.fields?.['Matter Name'] || 'Unnamed'}</p>
                        <p className="text-sm text-slate-500">{record.fields?.['Client'] || ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{selectedMatter.fields?.['Matter Name'] || 'Unnamed'}</p>
                  <p className="text-sm text-slate-500">{selectedMatter.fields?.['Client'] || ''}</p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedMatter(null)}
                >
                  Change
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Document Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Enter any additional notes or instructions for this court order..."
                rows={4}
                data-testid="additional-notes-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/actions/generate-documents')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={submitting || !selectedMatter}
            className="bg-[#2E7DA1] hover:bg-[#256a8a]"
            data-testid="submit-button"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create Document Record
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CourtOrderPage;
