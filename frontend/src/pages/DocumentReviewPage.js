import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  FileText, CheckCircle, Clock, Search, Loader2, 
  ExternalLink, User, Calendar, Filter, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { approvalsApi } from '../services/documentsApi';

const DocumentReviewPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const result = await approvalsApi.getAllApprovals();
      setApprovals(result.data.approvals || []);
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      toast.error('Failed to load document approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId) => {
    try {
      await approvalsApi.approveDocument(approvalId);
      toast.success('Document approved successfully');
      fetchApprovals();
    } catch (error) {
      console.error('Failed to approve:', error);
      toast.error('Failed to approve document');
    }
  };

  // Filter approvals
  const filteredApprovals = approvals.filter(a => {
    const matchesSearch = !searchQuery || 
      a.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.matter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.drafter_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'pending' && a.status === 'PENDING') ||
      (activeTab === 'approved' && a.status === 'APPROVED');
    
    return matchesSearch && matchesTab;
  });

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length;
  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Document Review
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve generated documents
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchApprovals}
          data-testid="refresh-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700">{pendingCount}</p>
                <p className="text-xs text-orange-600">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
                <p className="text-xs text-green-600">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-700">{approvals.length}</p>
                <p className="text-xs text-slate-500">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by document, matter, or drafter..."
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="w-3 h-3" />
                  Pending
                  {pendingCount > 0 && (
                    <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0">{pendingCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Approved
                </TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredApprovals.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No documents found</p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'pending' ? 'No documents pending approval' : 'Try a different search or filter'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApprovals.map((approval) => (
                <div 
                  key={approval.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    approval.status === 'PENDING' 
                      ? 'border-orange-200 bg-orange-50/30 hover:bg-orange-50' 
                      : 'border-green-200 bg-green-50/30 hover:bg-green-50'
                  }`}
                  data-testid={`approval-${approval.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        approval.status === 'PENDING' ? 'bg-orange-100' : 'bg-green-100'
                      }`}>
                        {approval.status === 'PENDING' ? (
                          <Clock className="w-4 h-4 text-orange-600" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-800 truncate">
                            {approval.template_name}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              approval.status === 'PENDING' 
                                ? 'border-orange-300 text-orange-600' 
                                : 'border-green-300 text-green-600'
                            }`}
                          >
                            {approval.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">{approval.matter_name}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {approval.drafter_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {approval.created_at ? format(new Date(approval.created_at), 'MMM d, yyyy') : 'Unknown'}
                          </span>
                          {approval.status === 'APPROVED' && approval.approved_by && (
                            <span className="text-green-600">
                              Approved by {approval.approved_by}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/document-approval/${approval.id}`)}
                        data-testid={`view-btn-${approval.id}`}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      {approval.status === 'PENDING' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(approval.id)}
                          data-testid={`approve-btn-${approval.id}`}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentReviewPage;
