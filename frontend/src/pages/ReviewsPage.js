import React, { useState, useEffect } from 'react';
import { masterListApi, webhooksApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Star, 
  Search, 
  Loader2, 
  Phone, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Clock,
  RefreshCw,
  Send,
  MessageSquare,
  Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Review Status options
const REVIEW_STATUS_OPTIONS = [
  'Not Requested',
  'Requested',
  'Review Received',
  'Pending',
  'Follow Up Sent'
];

const ReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingRecord, setUpdatingRecord] = useState(null);
  const [sendingWebhook, setSendingWebhook] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Fetch all matters where Active/Inactive = "Completed" AND Type of Case is NOT "Lead"
      const response = await masterListApi.getAll({ 
        filter_by: "AND({Active/Inactive}='Completed', {Type of Case}!='Lead')"
      });
      setReviews(response.data.records || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // Handle Review Status change
  const handleReviewStatusChange = async (recordId, newStatus) => {
    setUpdatingRecord(recordId);
    try {
      await masterListApi.update(recordId, { 'Review Status': newStatus });
      setReviews(prev => prev.map(r => 
        r.id === recordId 
          ? { ...r, fields: { ...r.fields, 'Review Status': newStatus } }
          : r
      ));
      toast.success('Review status updated');
    } catch (error) {
      console.error('Failed to update review status:', error);
      toast.error('Failed to update review status');
    } finally {
      setUpdatingRecord(null);
    }
  };

  // Handle Review Received click - sets Review Status to "Review Received" and Active/Inactive to "Archived"
  const handleReviewReceivedClick = async (e, record) => {
    e.stopPropagation();
    const recordId = record.id;
    const fields = record.fields || {};
    const currentReceived = fields['Review Received?'] === true || fields['Review Received?'] === 'Yes';
    
    // Toggle the received status
    const newReceived = !currentReceived;
    
    setUpdatingRecord(recordId);
    try {
      const updateData = {
        'Review Received?': newReceived
      };
      
      // If marking as received, also update Review Status and Active/Inactive
      if (newReceived) {
        updateData['Review Status'] = 'Review Received';
        updateData['Active/Inactive'] = 'Archived';
      }
      
      await masterListApi.update(recordId, updateData);
      
      // If archived, remove from the list (since we only show Completed)
      if (newReceived) {
        setReviews(prev => prev.filter(r => r.id !== recordId));
        toast.success('Review marked as received and matter archived');
      } else {
        setReviews(prev => prev.map(r => 
          r.id === recordId 
            ? { ...r, fields: { ...r.fields, 'Review Received?': newReceived } }
            : r
        ));
        toast.success('Review received status updated');
      }
    } catch (error) {
      console.error('Failed to update:', error);
      toast.error('Failed to update record');
    } finally {
      setUpdatingRecord(null);
    }
  };

  // Handle Auto Follow Up click - sets Auto Review Follow Up to Yes
  const handleAutoFollowUpClick = async (e, record) => {
    e.stopPropagation();
    const recordId = record.id;
    const fields = record.fields || {};
    const currentAutoFollowUp = fields['Auto Review Follow Up'] === true || fields['Auto Review Follow Up'] === 'Yes';
    
    // Toggle the auto follow up status
    const newAutoFollowUp = !currentAutoFollowUp;
    
    setUpdatingRecord(recordId);
    try {
      await masterListApi.update(recordId, { 
        'Auto Review Follow Up': newAutoFollowUp ? 'Yes' : 'No' 
      });
      setReviews(prev => prev.map(r => 
        r.id === recordId 
          ? { ...r, fields: { ...r.fields, 'Auto Review Follow Up': newAutoFollowUp ? 'Yes' : 'No' } }
          : r
      ));
      toast.success(`Auto follow up ${newAutoFollowUp ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to update:', error);
      toast.error('Failed to update auto follow up');
    } finally {
      setUpdatingRecord(null);
    }
  };

  // Send Review Request webhook
  const handleSendReviewRequest = async (e, record) => {
    e.stopPropagation();
    const fields = record.fields || {};
    
    setSendingWebhook(`request-${record.id}`);
    try {
      // Use backend API endpoint for proper error handling
      const response = await webhooksApi.sendReviewRequest({
        record_id: record.id,
        first_name: fields['First Name'] || '',
        last_name: fields['Last Name'] || '',
        email_address: fields['Email Address'] || '',
        phone_number: fields['Phone Number'] || ''
      });
      
      const today = response.data?.date_sent || new Date().toISOString().split('T')[0];
      
      setReviews(prev => prev.map(r => 
        r.id === record.id 
          ? { ...r, fields: { ...r.fields, 'Review Request Sent': today, 'Review Status': 'Requested' } }
          : r
      ));
      
      toast.success('Review request sent successfully');
    } catch (error) {
      console.error('Failed to send review request:', error);
      const errorMsg = error?.response?.data?.detail || error?.message || 'Unknown error';
      toast.error(`Failed to send review request: ${errorMsg}`);
    } finally {
      setSendingWebhook(null);
    }
  };

  // Send Review Follow Up webhook
  const handleSendReviewFollowUp = async (e, record) => {
    e.stopPropagation();
    const fields = record.fields || {};
    
    setSendingWebhook(`followup-${record.id}`);
    try {
      const webhookData = {
        'First Name': fields['First Name'] || '',
        'Last Name': fields['Last Name'] || '',
        'Email Address': fields['Email Address'] || '',
        'Phone Number': fields['Phone Number'] || '',
        'Record ID': record.id
      };
      
      // Send webhook (no-cors mode doesn't give us error feedback)
      fetch('https://hooks.zapier.com/hooks/catch/19553629/urxmmzj/', {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      }).catch(err => console.log('Webhook fetch error (expected with no-cors):', err));
      
      // Update the F/U Review Request Sent date
      const today = new Date().toISOString().split('T')[0];
      await masterListApi.update(record.id, { 
        'F/U Review Request Sent': today,
        'Review Status': 'Follow Up Sent'
      });
      
      setReviews(prev => prev.map(r => 
        r.id === record.id 
          ? { ...r, fields: { ...r.fields, 'F/U Review Request Sent': today, 'Review Status': 'Follow Up Sent' } }
          : r
      ));
      
      toast.success('Review follow-up sent successfully');
    } catch (error) {
      console.error('Failed to send review follow-up:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Unknown error';
      toast.error(`Failed to send review follow-up: ${errorMsg}`);
    } finally {
      setSendingWebhook(null);
    }
  };

  // Handle Archive - sets Active/Inactive to "Archived"
  const handleArchive = async (e, record) => {
    e.stopPropagation();
    const recordId = record.id;
    
    setUpdatingRecord(recordId);
    try {
      await masterListApi.update(recordId, { 
        'Active/Inactive': 'Archived'
      });
      
      // Remove from the list since we only show Completed records
      setReviews(prev => prev.filter(r => r.id !== recordId));
      toast.success('Matter archived successfully');
    } catch (error) {
      console.error('Failed to archive:', error);
      toast.error('Failed to archive matter');
    } finally {
      setUpdatingRecord(null);
    }
  };

  // Filter reviews based on search and status filter
  const filteredReviews = reviews.filter((review) => {
    const fields = review.fields || {};
    const matterName = fields['Matter Name'] || fields['Client'] || '';
    const email = fields['Email Address'] || '';
    const phone = fields['Phone Number'] || '';
    
    // Search filter
    const matchesSearch = searchQuery === '' || 
      matterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery);
    
    // Status filter
    let matchesStatus = true;
    if (filterStatus === 'received') {
      matchesStatus = fields['Review Received?'] === true || fields['Review Received?'] === 'Yes';
    } else if (filterStatus === 'pending') {
      matchesStatus = !fields['Review Received?'] || fields['Review Received?'] === 'No';
    } else if (filterStatus === 'sent') {
      matchesStatus = !!fields['Review Request Sent'];
    }
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleMatterNameClick = (e, review) => {
    e.stopPropagation();
    const fields = review.fields || {};
    const typeOfCase = fields['Type of Case'] || '';
    
    let route = '/case/probate/';
    if (typeOfCase === 'Estate Planning') {
      route = '/case/estate-planning/';
    } else if (typeOfCase === 'Deed/LLC') {
      route = '/case/deed/';
    } else if (typeOfCase === 'Lead') {
      route = '/case/lead/';
    }
    
    navigate(route + review.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-[#2E7DA1]" />
            Reviews
          </h1>
          <p className="text-slate-500 mt-1">
            Completed matters and their review status
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchReviews}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Star className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{reviews.length}</p>
                <p className="text-xs text-slate-500">Total Completed</p>
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
                <p className="text-2xl font-bold text-green-600">
                  {reviews.filter(r => r.fields?.['Review Received?'] === true || r.fields?.['Review Received?'] === 'Yes').length}
                </p>
                <p className="text-xs text-slate-500">Reviews Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {reviews.filter(r => r.fields?.['Review Request Sent']).length}
                </p>
                <p className="text-xs text-slate-500">Requests Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {reviews.filter(r => !r.fields?.['Review Received?'] && r.fields?.['Review Request Sent']).length}
                </p>
                <p className="text-xs text-slate-500">Awaiting Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
                className={filterStatus === 'all' ? 'bg-[#2E7DA1]' : ''}
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'received' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('received')}
                className={filterStatus === 'received' ? 'bg-green-600' : ''}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Received
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pending')}
                className={filterStatus === 'pending' ? 'bg-yellow-600' : ''}
              >
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Button>
              <Button
                variant={filterStatus === 'sent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('sent')}
                className={filterStatus === 'sent' ? 'bg-blue-600' : ''}
              >
                <Mail className="w-3 h-3 mr-1" />
                Request Sent
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Completed Matters ({filteredReviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Star className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No completed matters found</p>
              {searchQuery && <p className="text-sm mt-1">Try adjusting your search</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Matter Name</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Review Status</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Received?</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Auto F/U</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Request Sent</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">F/U Sent</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((review) => {
                    const fields = review.fields || {};
                    const reviewReceived = fields['Review Received?'] === true || fields['Review Received?'] === 'Yes';
                    const autoFollowUp = fields['Auto Review Follow Up'] === true || fields['Auto Review Follow Up'] === 'Yes';
                    const isUpdating = updatingRecord === review.id;
                    const isSendingRequest = sendingWebhook === `request-${review.id}`;
                    const isSendingFollowUp = sendingWebhook === `followup-${review.id}`;
                    
                    return (
                      <tr 
                        key={review.id} 
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div 
                            className="font-medium text-[#2E7DA1] hover:underline cursor-pointer"
                            onClick={(e) => handleMatterNameClick(e, review)}
                          >
                            {fields['Matter Name'] || fields['Client'] || 'Unnamed'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {fields['Type of Case'] || ''}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            {fields['Email Address'] && (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[180px]">{fields['Email Address']}</span>
                              </div>
                            )}
                            {fields['Phone Number'] && (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{fields['Phone Number']}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Select
                            value={fields['Review Status'] || ''}
                            onValueChange={(value) => handleReviewStatusChange(review.id, value)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              {isUpdating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <SelectValue placeholder="Select status" />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {REVIEW_STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={(e) => handleReviewReceivedClick(e, review)}
                            disabled={isUpdating}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                            title={reviewReceived ? "Mark as not received (will archive)" : "Mark as received (will archive)"}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                            ) : reviewReceived ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-slate-300 hover:text-green-400" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={(e) => handleAutoFollowUpClick(e, review)}
                            disabled={isUpdating}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                            title={autoFollowUp ? "Disable auto follow up" : "Enable auto follow up"}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                            ) : autoFollowUp ? (
                              <CheckCircle2 className="w-5 h-5 text-blue-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-slate-300 hover:text-blue-400" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-600">
                          {formatDate(fields['Review Request Sent'])}
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-600">
                          {formatDate(fields['F/U Review Request Sent'])}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => handleSendReviewRequest(e, review)}
                              disabled={isSendingRequest}
                              title="Send Review Request"
                            >
                              {isSendingRequest ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-3 h-3 mr-1" />
                                  Request
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => handleSendReviewFollowUp(e, review)}
                              disabled={isSendingFollowUp}
                              title="Send Review Follow Up"
                            >
                              {isSendingFollowUp ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  Follow Up
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                              onClick={(e) => handleArchive(e, review)}
                              disabled={isUpdating}
                              title="Archive this matter"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Archive className="w-3 h-3 mr-1" />
                                  Archive
                                </>
                              )}
                            </Button>
                          </div>
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

export default ReviewsPage;
