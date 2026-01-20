import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { 
  FileText, 
  Loader2, 
  Search, 
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { invoicesApi } from '../services/api';
import { toast } from 'sonner';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await invoicesApi.getAll();
      setInvoices(response.data.records || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filter invoices based on search query
  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fields = inv.fields || {};
    const matterName = fields['Matter Name'] || fields['Master List Name'] || '';
    const service = fields['Service'] || '';
    return matterName.toLowerCase().includes(query) || service.toLowerCase().includes(query);
  });

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <FileText className="w-7 h-7 inline-block mr-2 text-[#2E7DA1]" />
            Invoices
          </h1>
          <p className="text-slate-500 mt-1">Manage and track all invoices</p>
        </div>
        <Button 
          onClick={fetchInvoices} 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by matter or service..."
          className="pl-9"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Invoices</p>
                <p className="text-xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Paid</p>
                <p className="text-xl font-bold">
                  {invoices.filter(inv => inv.fields?.['Paid?'] === true || inv.fields?.['Paid?'] === 'Yes').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <XCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Unpaid</p>
                <p className="text-xl font-bold">
                  {invoices.filter(inv => !inv.fields?.['Paid?'] || inv.fields?.['Paid?'] === 'No' || inv.fields?.['Paid?'] === false).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>{searchQuery ? 'No invoices match your search' : 'No invoices found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Matter</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Service</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Due Date</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Paid?</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const fields = invoice.fields || {};
                    const isPaid = fields['Paid?'] === true || fields['Paid?'] === 'Yes';
                    const matterName = fields['Matter Name'] || fields['Master List Name'] || 
                      (Array.isArray(fields['Master List']) ? `${fields['Master List'].length} matter(s)` : '-');
                    
                    return (
                      <tr key={invoice.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-slate-900">{matterName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-700">{fields['Service'] || '-'}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-medium text-slate-900 flex items-center justify-end gap-1">
                            <DollarSign className="w-3 h-3 text-slate-400" />
                            {formatCurrency(fields['Amount']).replace('$', '')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDate(fields['Due Date'])}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isPaid ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              <XCircle className="w-3 h-3 mr-1" />
                              Unpaid
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesPage;
