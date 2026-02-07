import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  Search, Loader2, CheckCircle, XCircle, Clock, FileText, Eye,
  User, Download, AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { approvalsApi } from '../../services/documentsApi';

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  DENIED: { label: 'Denied', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

const ReviewPanel = ({ isAdmin }) => {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [denyDialog, setDenyDialog] = useState(null);
  const [denyComments, setDenyComments] = useState('');
  const [processing, setProcessing] = useState(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await approvalsApi.getAllApprovals();
      setApprovals(res.data || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await approvalsApi.approveDocument(id);
      toast.success('Document approved');
      setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'APPROVED' } : a));
    } catch {
      toast.error('Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeny = async () => {
    if (!denyDialog) return;
    setProcessing(denyDialog);
    try {
      await approvalsApi.denyDocument(denyDialog, denyComments);
      toast.success('Document denied');
      setApprovals(prev => prev.map(a => a.id === denyDialog ? { ...a, status: 'DENIED', comments: denyComments } : a));
      setDenyDialog(null);
      setDenyComments('');
    } catch {
      toast.error('Failed to deny');
    } finally {
      setProcessing(null);
    }
  };

  const filtered = approvals.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (a.template_name || '').toLowerCase();
      const matter = (a.matter_name || '').toLowerCase();
      const drafter = (a.drafter_name || '').toLowerCase();
      if (!name.includes(q) && !matter.includes(q) && !drafter.includes(q)) return false;
    }
    return true;
  });

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length;
  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
  const deniedCount = approvals.filter(a => a.status === 'DENIED').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-amber-200 bg-amber-50/50 cursor-pointer hover:shadow-sm" onClick={() => setFilter('PENDING')}>
          <CardContent className="py-3 text-center">
            <p className="text-xl font-bold text-amber-700">{pendingCount}</p>
            <p className="text-xs text-amber-600">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 cursor-pointer hover:shadow-sm" onClick={() => setFilter('APPROVED')}>
          <CardContent className="py-3 text-center">
            <p className="text-xl font-bold text-green-700">{approvedCount}</p>
            <p className="text-xs text-green-600">Approved</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 cursor-pointer hover:shadow-sm" onClick={() => setFilter('DENIED')}>
          <CardContent className="py-3 text-center">
            <p className="text-xl font-bold text-red-700">{deniedCount}</p>
            <p className="text-xs text-red-600">Denied</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-sm" onClick={() => setFilter('all')}>
          <CardContent className="py-3 text-center">
            <p className="text-xl font-bold text-slate-700">{approvals.length}</p>
            <p className="text-xs text-slate-500">Total</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchApprovals}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        {filter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setFilter('all')} className="text-xs">
            Clear filter
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#2E7DA1]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">
              {searchQuery ? 'No documents matching your search' : 'No documents to review'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(approval => {
            const config = STATUS_CONFIG[approval.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = config.icon;
            const isPending = approval.status === 'PENDING';
            const meta = approval.metadata || {};

            return (
              <Card key={approval.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg mt-0.5 ${isPending ? 'bg-amber-50' : approval.status === 'APPROVED' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <StatusIcon className={`w-4 h-4 ${isPending ? 'text-amber-600' : approval.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-slate-800 truncate">
                            {approval.template_name || 'Document'}
                          </h3>
                          <Badge className={`text-xs border ${config.color}`}>
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          {approval.matter_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {approval.matter_name}
                            </span>
                          )}
                          {approval.drafter_name && (
                            <span>Drafted by {approval.drafter_name}</span>
                          )}
                          {approval.created_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {format(new Date(approval.created_at), 'MMM d, yyyy')}
                            </span>
                          )}
                          {approval.status === 'APPROVED' && meta.approved_by && (
                            <span className="text-green-600">Approved by {meta.approved_by}</span>
                          )}
                          {approval.status === 'DENIED' && meta.denied_by && (
                            <span className="text-red-600">Denied by {meta.denied_by}</span>
                          )}
                        </div>
                        {approval.comments && (
                          <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">
                            {approval.comments}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => navigate(`/document-approval/${approval.id}`)}
                        className="text-xs h-8"
                      >
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                      {isAdmin && isPending && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(approval.id)}
                            disabled={processing === approval.id}
                            className="bg-green-600 hover:bg-green-700 text-xs h-8"
                          >
                            {processing === approval.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <><CheckCircle className="w-3 h-3 mr-1" /> Approve</>
                            )}
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => { setDenyDialog(approval.id); setDenyComments(''); }}
                            className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Deny
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!denyDialog} onOpenChange={(open) => { if (!open) setDenyDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deny Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Please provide a reason for denying this document. The drafter will be notified.
            </p>
            <Textarea
              value={denyComments}
              onChange={(e) => setDenyComments(e.target.value)}
              placeholder="Enter reason for denial..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialog(null)}>Cancel</Button>
            <Button
              onClick={handleDeny}
              disabled={processing}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Deny Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewPanel;
