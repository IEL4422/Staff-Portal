import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { webhooksApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const CaseUpdatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    caseId: '',
    clientName: '',
    updateType: '',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await webhooksApi.sendCaseUpdate(formData);
      toast.success('Case update sent successfully (placeholder)');
      setFormData({ caseId: '', clientName: '', updateType: '', message: '' });
    } catch (error) {
      toast.error('Failed to send case update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="case-update-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Send className="w-8 h-8 inline-block mr-3 text-[#2E7DA1]" />
            Send Case Update
          </h1>
          <p className="text-slate-500 mt-1">Send update notification to client (webhook placeholder)</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Case Update Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caseId">Case ID / Number</Label>
                <Input
                  id="caseId"
                  value={formData.caseId}
                  onChange={(e) => setFormData({ ...formData, caseId: e.target.value })}
                  placeholder="Enter case ID"
                  required
                  data-testid="case-id-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Enter client name"
                  required
                  data-testid="client-name-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="updateType">Update Type</Label>
              <Select
                value={formData.updateType}
                onValueChange={(value) => setFormData({ ...formData, updateType: value })}
              >
                <SelectTrigger data-testid="update-type-select">
                  <SelectValue placeholder="Select update type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status-change">Status Change</SelectItem>
                  <SelectItem value="document-ready">Document Ready</SelectItem>
                  <SelectItem value="deadline-reminder">Deadline Reminder</SelectItem>
                  <SelectItem value="payment-received">Payment Received</SelectItem>
                  <SelectItem value="court-date">Court Date Update</SelectItem>
                  <SelectItem value="general">General Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter update message..."
                rows={5}
                required
                data-testid="message-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
              Send Update
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CaseUpdatePage;
