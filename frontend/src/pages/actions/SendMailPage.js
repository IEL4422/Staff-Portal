import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mailApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const SendMailPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipient: '',
    subject: '',
    body: '',
    case_id: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await mailApi.create(formData);
      toast.success('Mail record created successfully');
      setFormData({ recipient: '', subject: '', body: '', case_id: '' });
    } catch (error) {
      toast.error('Failed to create mail record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="send-mail-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Mail className="w-8 h-8 inline-block mr-3 text-[#2E7DA1]" />
            Send Mail
          </h1>
          <p className="text-slate-500 mt-1">Create a mail record in Airtable</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Mail Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Input
                id="recipient"
                value={formData.recipient}
                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                placeholder="Enter recipient name or address"
                required
                data-testid="recipient-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caseId">Case ID (Optional)</Label>
              <Input
                id="caseId"
                value={formData.case_id}
                onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
                placeholder="Enter Airtable record ID to link"
                data-testid="case-id-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter mail subject"
                required
                data-testid="subject-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Enter mail body..."
                rows={6}
                required
                data-testid="body-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Mail className="w-5 h-5 mr-2" />}
              Create Mail Record
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SendMailPage;
