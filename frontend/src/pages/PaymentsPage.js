import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { DollarSign, Loader2, TrendingUp, Calendar, CreditCard, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PaymentsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
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
      const [paymentsRes, statsRes] = await Promise.all([
        paymentsApi.getAll(),
        paymentsApi.getStats()
      ]);
      
      setPayments(paymentsRes.data.payments || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
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

  // Get yearly breakdown
  const yearlyBreakdown = Object.entries(stats.yearly_totals || {});

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
                      {payment.package && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {payment.package}
                        </Badge>
                      )}
                      {!payment.package && '—'}
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
                      {payment.package && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {payment.package}
                        </Badge>
                      )}
                      {!payment.package && '—'}
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
