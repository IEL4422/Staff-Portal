import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterListApi, documentGenerationApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeft, Loader2, Search, FileText, Check, Calendar, Mail } from 'lucide-react';
import { toast } from 'sonner';

const LegalLetterPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    draftingDate: '',
    recipientName: '',
    recipientStreetAddress: '',
    recipientCityStateZip: '',
    recipientEmail: '',
    summaryOfLetter: '',
    bodyOfLetter: '',
  });

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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
        document_type: 'Legal Letter',
        matter_id: selectedMatter.id,
        drafting_date: formData.draftingDate,
        recipient_name: formData.recipientName,
        recipient_street_address: formData.recipientStreetAddress,
        recipient_city_state_zip: formData.recipientCityStateZip,
        recipient_email: formData.recipientEmail,
        summary_of_letter: formData.summaryOfLetter,
        body_of_letter: formData.bodyOfLetter,
      });

      toast.success('Legal Letter record created successfully!');
      navigate('/actions/generate-documents');
    } catch (error) {
      console.error('Failed to create document:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Unknown error';
      toast.error(`Failed to create document: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in" data-testid="legal-letter-page">
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
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Legal Letter
            </h1>
            <p className="text-slate-500 text-sm">Generate a formal legal letter</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Matter Search */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Link to Matter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        {/* Document Details */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Document Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Drafting Date</Label>
              <div className="relative max-w-xs">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  value={formData.draftingDate}
                  onChange={(e) => handleChange('draftingDate', e.target.value)}
                  className="pl-10"
                  data-testid="drafting-date-input"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipient Information */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Recipient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Name</Label>
              <Input
                value={formData.recipientName}
                onChange={(e) => handleChange('recipientName', e.target.value)}
                placeholder="Enter recipient name"
                data-testid="recipient-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Recipient Street Address</Label>
              <Input
                value={formData.recipientStreetAddress}
                onChange={(e) => handleChange('recipientStreetAddress', e.target.value)}
                placeholder="Enter street address"
                data-testid="recipient-street-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Recipient City, State, Zip</Label>
              <Input
                value={formData.recipientCityStateZip}
                onChange={(e) => handleChange('recipientCityStateZip', e.target.value)}
                placeholder="e.g., Chicago, IL 60601"
                data-testid="recipient-city-state-zip-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => handleChange('recipientEmail', e.target.value)}
                  placeholder="Enter recipient email"
                  className="pl-10"
                  data-testid="recipient-email-input"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Letter Content */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Letter Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Summary of Letter</Label>
              <Textarea
                value={formData.summaryOfLetter}
                onChange={(e) => handleChange('summaryOfLetter', e.target.value)}
                placeholder="Enter a brief summary of the legal letter..."
                rows={3}
                data-testid="summary-of-letter-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Body of Letter</Label>
              <Textarea
                value={formData.bodyOfLetter}
                onChange={(e) => handleChange('bodyOfLetter', e.target.value)}
                placeholder="Enter the full body of the legal letter..."
                rows={8}
                data-testid="body-of-letter-input"
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
                Generate Document
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LegalLetterPage;
