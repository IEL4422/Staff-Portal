import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { FileText, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const SendInvoicePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    amount: '',
    description: '',
    case_id: '',
    status: 'Pending',
    due_date: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await invoicesApi.create({
        ...formData,
        amount: parseFloat(formData.amount) || 0
      });
      toast.success('Invoice created successfully');
      setFormData({ client_name: '', amount: '', description: '', case_id: '', status: 'Pending', due_date: '' });
    } catch (error) {
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="send-invoice-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <FileText className="w-8 h-8 inline-block mr-3 text-[#2E7DA1]" />
            Send Invoice
          </h1>
          <p className="text-slate-500 mt-1">Create an invoice record in Airtable</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Enter client name"
                  required
                  data-testid="client-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  data-testid="amount-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caseId">Case ID (Optional)</Label>
                <Input
                  id="caseId"
                  value={formData.case_id}
                  onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
                  placeholder="Airtable record ID"
                  data-testid="case-id-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  data-testid="due-date-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger data-testid="status-select">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Invoice description..."
                rows={4}
                required
                data-testid="description-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FileText className="w-5 h-5 mr-2" />}
              Create Invoice
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SendInvoicePage;
