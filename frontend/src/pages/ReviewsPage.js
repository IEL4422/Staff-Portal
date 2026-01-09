import React, { useState, useEffect } from 'react';
import { masterListApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
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
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Fetch all matters where Active/Inactive = "Completed"
      const response = await masterListApi.getAll({ 
        filterByFormula: "{Active/Inactive}='Completed'"
      });
      setReviews(response.data.records || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // Filter reviews based on search and status filter
  const filteredReviews = reviews.filter((review) => {
    const fields = review.fields || {};
    const matterName = fields['Matter Name'] || fields['Client'] || '';
    const email = fields['Email Address'] || '';
    const phone = fields['Phone Number'] || '';
    const reviewStatus = fields['Review Status'] || '';
    
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

  const getReviewStatusBadge = (status) => {
    if (!status) return <Badge variant="outline" className="text-slate-500">Not Set</Badge>;
    
    const statusColors = {
      'Received': 'bg-green-100 text-green-700 border-green-200',
      'Pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Requested': 'bg-blue-100 text-blue-700 border-blue-200',
      'Not Requested': 'bg-slate-100 text-slate-600 border-slate-200',
    };
    
    return (
      <Badge className={statusColors[status] || 'bg-slate-100 text-slate-600'}>
        {status}
      </Badge>
    );
  };

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

  const handleRowClick = (review) => {
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
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Matter Name</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Review Status</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Received?</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Auto Follow Up</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Request Sent</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">F/U Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((review) => {
                    const fields = review.fields || {};
                    const reviewReceived = fields['Review Received?'] === true || fields['Review Received?'] === 'Yes';
                    const autoFollowUp = fields['Auto Review Follow Up'] === true || fields['Auto Review Follow Up'] === 'Yes';
                    
                    return (
                      <tr 
                        key={review.id} 
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(review)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">
                            {fields['Matter Name'] || fields['Client'] || 'Unnamed'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {fields['Type of Case'] || ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {fields['Email Address'] && (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[200px]">{fields['Email Address']}</span>
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
                        <td className="py-3 px-4">
                          {getReviewStatusBadge(fields['Review Status'])}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {reviewReceived ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {autoFollowUp ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {formatDate(fields['Review Request Sent'])}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {formatDate(fields['F/U Review Request Sent'])}
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
