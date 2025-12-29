import React, { useState, useEffect } from 'react';
import { paymentsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { DollarSign, Loader2, TrendingUp, CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const PaymentsPage = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    count: 0
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await paymentsApi.getAll();
      const paymentRecords = response.data.records || [];
      setPayments(paymentRecords);

      // Calculate stats
      let total = 0;
      let paid = 0;
      let pending = 0;

      paymentRecords.forEach((p) => {
        const amount = p.fields?.Amount || 0;
        const status = (p.fields?.Status || '').toLowerCase();
        total += amount;
        if (status === 'paid' || status === 'completed') {
          paid += amount;
        } else {
          pending += amount;
        }
      });

      setStats({ total, paid, pending, count: paymentRecords.length });
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid' || s === 'completed') {
      return <Badge className="bg-green-100 text-green-700">Paid</Badge>;
    }
    if (s === 'pending') {
      return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
    }
    if (s === 'overdue' || s === 'failed') {
      return <Badge className="bg-red-100 text-red-700">{status}</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700">{status || 'Unknown'}</Badge>;
  };

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
        <p className="text-slate-500 mt-1">View all payment records</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Payments</p>
                <p className="text-2xl font-bold text-slate-900">{stats.count}</p>
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
                <p className="text-2xl font-bold text-slate-900">${stats.total.toLocaleString()}</p>
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
                <p className="text-sm text-slate-500">Paid</p>
                <p className="text-2xl font-bold text-green-600">${stats.paid.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-amber-600">${stats.pending.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-slate-500 text-center py-12">No payment records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} data-testid={`payment-${payment.id}`}>
                    <TableCell className="font-medium">
                      {payment.fields?.['Client Name'] || payment.fields?.Client || '—'}
                    </TableCell>
                    <TableCell>{payment.fields?.Description || payment.fields?.Notes || '—'}</TableCell>
                    <TableCell className="font-medium">
                      ${(payment.fields?.Amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>{payment.fields?.Date || payment.fields?.['Payment Date'] || '—'}</TableCell>
                    <TableCell>{getStatusBadge(payment.fields?.Status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsPage;
