import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsApi, masterListApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { DollarSign, Loader2, TrendingUp, Calendar, CreditCard, BarChart3, AlertCircle, Check, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PaymentsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [paymentsWithMissingInfo, setPaymentsWithMissingInfo] = useState([]);
  const [selectedDates, setSelectedDates] = useState({});
  const [editingAmount, setEditingAmount] = useState({});
  const [amountValues, setAmountValues] = useState({});
  const [savingRecord, setSavingRecord] = useState({});
  const [stats, setStats] = useState({
    total_amount: 0,
    total_count: 0,
    current_month_total: 0,
    current_year_total: 0,
    monthly_totals: {},
    yearly_totals: {}
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, statsRes, withoutDateRes] = await Promise.all([
        paymentsApi.getAll(),
        paymentsApi.getStats(),
        paymentsApi.getWithoutDate()
      ]);
      
      setPayments(paymentsRes.data.payments || []);
      setStats(statsRes.data);
      setPaymentsWithMissingInfo(withoutDateRes.data.payments || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (recordId, date) => {
    setSelectedDates(prev => ({ ...prev, [recordId]: date }));
  };

  const handleStartEditAmount = (recordId, currentAmount) => {
    setEditingAmount(prev => ({ ...prev, [recordId]: true }));
    setAmountValues(prev => ({ ...prev, [recordId]: currentAmount || '' }));
  };

  const handleCancelEditAmount = (recordId) => {
    setEditingAmount(prev => ({ ...prev, [recordId]: false }));
    setAmountValues(prev => {
      const newValues = { ...prev };
      delete newValues[recordId];
      return newValues;
    });
  };

  const handleAmountChange = (recordId, value) => {
    // Allow only numbers and decimal point
    const numValue = value.replace(/[^0-9.]/g, '');
    setAmountValues(prev => ({ ...prev, [recordId]: numValue }));
  };

  const handleSavePaymentInfo = async (recordId) => {
    const date = selectedDates[recordId];
    const amount = amountValues[recordId];
    const payment = paymentsWithMissingInfo.find(p => p.id === recordId);
    
    if (!date && !amount) {
      toast.error('Please enter a date or amount to save');
      return;
    }

    setSavingRecord(prev => ({ ...prev, [recordId]: true }));
    try {
      const updateData = {};
      
      if (date) {
        updateData['Date Paid'] = date;
      }
      
      if (amount !== undefined && amount !== '' && amount !== payment?.amount_paid) {
        updateData['Amount Paid'] = parseFloat(amount);
      }
      
      if (Object.keys(updateData).length === 0) {
        toast.info('No changes to save');
        setSavingRecord(prev => ({ ...prev, [recordId]: false }));
        return;
      }
      
      await masterListApi.update(recordId, updateData);
      toast.success('Payment information saved successfully');
      
      // Check if both fields are now filled
      const hasAmount = amount || payment?.amount_paid;
      const hasDate = date || payment?.date_paid;
      
      if (hasAmount && hasDate) {
        // Remove from missing info list
        setPaymentsWithMissingInfo(prev => prev.filter(p => p.id !== recordId));
      } else {
        // Update the record in the list
        setPaymentsWithMissingInfo(prev => prev.map(p => {
          if (p.id === recordId) {
            return {
              ...p,
              amount_paid: amount ? parseFloat(amount) : p.amount_paid,
              date_paid: date || p.date_paid
            };
          }
          return p;
        }));
      }
      
      // Clear edit states
      setSelectedDates(prev => {
        const newDates = { ...prev };
        delete newDates[recordId];
        return newDates;
      });
      setEditingAmount(prev => ({ ...prev, [recordId]: false }));
      setAmountValues(prev => {
        const newValues = { ...prev };
        delete newValues[recordId];
        return newValues;
      });
      
      // Refresh stats
      const statsRes = await paymentsApi.getStats();
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to save payment info:', error);
      toast.error('Failed to save payment information');
    } finally {
      setSavingRecord(prev => ({ ...prev, [recordId]: false }));
    }
  };

  const handleSaveDate = async (recordId) => {
    const date = selectedDates[recordId];
    if (!date) {
      toast.error('Please select a date');
      return;
    }

    setSavingDate(prev => ({ ...prev, [recordId]: true }));
    try {
      await paymentsApi.updateDatePaid(recordId, date);
      toast.success('Date saved successfully');
      
      // Remove from payments without date list
      setPaymentsWithoutDate(prev => prev.filter(p => p.id !== recordId));
      setSelectedDates(prev => {
        const newDates = { ...prev };
        delete newDates[recordId];
        return newDates;
      });
      
      // Refresh stats
      const statsRes = await paymentsApi.getStats();
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to save date:', error);
      toast.error('Failed to save date');
    } finally {
      setSavingDate(prev => ({ ...prev, [recordId]: false }));
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0.00';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return format(date, 'MMMM yyyy');
    } catch {
      return monthStr;
    }
  };

  const getPackageColor = (packageName) => {
    if (!packageName) return 'bg-slate-100 text-slate-600';
    
    const pkg = packageName.toLowerCase();
    
    // Probate packages - Purple
    if (pkg.includes('probate')) {
      return 'bg-purple-100 text-purple-700';
    }
    // Trust packages - Blue
    if (pkg.includes('trust')) {
      return 'bg-blue-100 text-blue-700';
    }
    // Will packages - Green
    if (pkg.includes('will')) {
      return 'bg-green-100 text-green-700';
    }
    // Deed packages - Orange
    if (pkg.includes('deed')) {
      return 'bg-orange-100 text-orange-700';
    }
    // Guardianship - Teal
    if (pkg.includes('guardianship')) {
      return 'bg-teal-100 text-teal-700';
    }
    // Asset Search - Amber
    if (pkg.includes('asset')) {
      return 'bg-amber-100 text-amber-700';
    }
    // Family Law - Pink
    if (pkg.includes('family')) {
      return 'bg-pink-100 text-pink-700';
    }
    // Consult - Cyan
    if (pkg.includes('consult')) {
      return 'bg-cyan-100 text-cyan-700';
    }
    // Legal Letter/Insurance - Indigo
    if (pkg.includes('legal')) {
      return 'bg-indigo-100 text-indigo-700';
    }
    // Small Estate - Rose
    if (pkg.includes('small estate')) {
      return 'bg-rose-100 text-rose-700';
    }
    // ALC packages - Violet
    if (pkg.includes('alc')) {
      return 'bg-violet-100 text-violet-700';
    }
    // Default
    return 'bg-slate-100 text-slate-600';
  };

  const handleMatterClick = (payment) => {
    if (!payment.id) return;
    const caseType = (payment.case_type || '').toLowerCase();
    if (caseType === 'probate') {
      navigate(`/case/probate/${payment.id}`);
    } else if (caseType === 'estate planning') {
      navigate(`/case/estate-planning/${payment.id}`);
    } else if (caseType === 'deed') {
      navigate(`/case/deed/${payment.id}`);
    } else if (caseType === 'lead') {
      navigate(`/case/lead/${payment.id}`);
    } else {
      // Default to probate for unknown types
      navigate(`/case/probate/${payment.id}`);
    }
  };

  // Get recent 5 payments
  const recentPayments = payments.slice(0, 5);

  // Get monthly breakdown (last 6 months)
  const monthlyBreakdown = Object.entries(stats.monthly_totals || {}).slice(0, 6);

  // Get yearly breakdown - ensure 2024, 2025, 2026 are always shown
  const yearlyTotals = stats.yearly_totals || {};
  const yearsToShow = ['2026', '2025', '2024'];
  const yearlyBreakdown = yearsToShow.map(year => [year, yearlyTotals[year] || 0]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="payments-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          Payments
        </h1>
        <p className="text-slate-500 mt-1">Track payments from Master List</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Payments</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total_count}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Amount</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.total_amount)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">This Month</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.current_month_total)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">This Year</p>
                <p className="text-2xl font-bold text-[#2E7DA1]">{formatCurrency(stats.current_year_total)}</p>
              </div>
              <div className="w-12 h-12 bg-[#2E7DA1]/10 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#2E7DA1]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly & Yearly Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Amounts */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
              <BarChart3 className="w-5 h-5 text-[#2E7DA1]" />
              Monthly Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyBreakdown.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No monthly data available</p>
            ) : (
              <div className="space-y-3">
                {monthlyBreakdown.map(([month, amount]) => (
                  <div key={month} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">{formatMonth(month)}</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Yearly Amounts */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
              <TrendingUp className="w-5 h-5 text-[#2E7DA1]" />
              Yearly Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {yearlyBreakdown.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No yearly data available</p>
            ) : (
              <div className="space-y-3">
                {yearlyBreakdown.map(([year, amount]) => (
                  <div key={year} className="flex items-center justify-between p-4 bg-gradient-to-r from-[#2E7DA1]/5 to-[#2E7DA1]/10 rounded-xl">
                    <div>
                      <span className="text-lg font-bold text-slate-900">{year}</span>
                    </div>
                    <span className="text-xl font-bold text-[#2E7DA1]">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payments with Missing Information Section */}
      {paymentsWithMissingInfo.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Payments with Missing Information ({paymentsWithMissingInfo.length})
            </CardTitle>
            <p className="text-sm text-slate-500">Active cases (non-leads) missing Amount Paid and/or Date Paid. Update the missing information below.</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter Name</TableHead>
                  <TableHead>Case Type</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead>Date Paid</TableHead>
                  <TableHead>Missing</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsWithMissingInfo.map((payment) => {
                  const missingAmount = !payment.amount_paid && payment.amount_paid !== 0;
                  const missingDate = !payment.date_paid;
                  const isEditingAmt = editingAmount[payment.id];
                  const isSaving = savingRecord[payment.id];
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <span className="font-medium text-slate-900">{payment.matter_name}</span>
                      </TableCell>
                      <TableCell>
                        {payment.case_type ? (
                          <Badge variant="outline" className="bg-slate-50">
                            {payment.case_type}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.package_purchased ? (
                          <Badge className={getPackageColor(payment.package_purchased)}>
                            {payment.package_purchased}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditingAmt ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-500">$</span>
                            <Input
                              type="text"
                              value={amountValues[payment.id] || ''}
                              onChange={(e) => handleAmountChange(payment.id, e.target.value)}
                              placeholder="0.00"
                              className="w-24 h-8 text-right"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelEditAmount(payment.id)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : missingAmount ? (
                          <button
                            onClick={() => handleStartEditAmount(payment.id, '')}
                            className="text-amber-500 font-medium hover:text-amber-600 hover:underline"
                          >
                            Not set
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartEditAmount(payment.id, payment.amount_paid)}
                            className="font-semibold text-green-600 hover:text-green-700 hover:underline"
                          >
                            {formatCurrency(payment.amount_paid)}
                          </button>
                        )}
                        ) : (
                          <span className="font-semibold text-green-600">
                            {formatCurrency(payment.amount_paid)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {missingDate ? (
                          <Input
                            type="date"
                            value={selectedDates[payment.id] || ''}
                            onChange={(e) => handleDateChange(payment.id, e.target.value)}
                            className="w-40"
                          />
                        ) : (
                          <span className="text-slate-700">{formatDate(payment.date_paid)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {missingAmount && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                              Amount
                            </Badge>
                          )}
                          {missingDate && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                              Date
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {missingDate && (
                          <Button
                            size="sm"
                            onClick={() => handleSaveDate(payment.id)}
                            disabled={!selectedDates[payment.id] || savingDate[payment.id]}
                            className="bg-[#2E7DA1] hover:bg-[#246585]"
                          >
                            {savingDate[payment.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Save
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Recent Payments (Last 5)</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-slate-500 text-center py-12">No payment records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter Name</TableHead>
                  <TableHead>Package Purchased</TableHead>
                  <TableHead>Case Type</TableHead>
                  <TableHead>Date Paid</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id} data-testid={`payment-${payment.id}`}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => handleMatterClick(payment)}
                        className="text-[#2E7DA1] hover:underline text-left"
                      >
                        {payment.matter_name || '—'}
                      </button>
                    </TableCell>
                    <TableCell>
                      {payment.package ? (
                        <Badge variant="outline" className={getPackageColor(payment.package)}>
                          {payment.package}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {payment.case_type && (
                        <Badge variant="outline" className="bg-slate-50">
                          {payment.case_type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(payment.date_paid)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* All Payments Table */}
      {payments.length > 5 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Manrope' }}>All Payments ({payments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter Name</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Case Type</TableHead>
                  <TableHead>Date Paid</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => handleMatterClick(payment)}
                        className="text-[#2E7DA1] hover:underline text-left"
                      >
                        {payment.matter_name || '—'}
                      </button>
                    </TableCell>
                    <TableCell>
                      {payment.package ? (
                        <Badge variant="outline" className={getPackageColor(payment.package)}>
                          {payment.package}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {payment.case_type && (
                        <Badge variant="outline" className="bg-slate-50">
                          {payment.case_type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(payment.date_paid)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentsPage;
