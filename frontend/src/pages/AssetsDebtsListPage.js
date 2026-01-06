import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Wallet, 
  Search, 
  Loader2, 
  FileText,
  Building,
  CreditCard,
  Car,
  Briefcase,
  TrendingUp,
  TrendingDown,
  User,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { masterListApi } from '../services/api';

const AssetsDebtsListPage = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, asset, debt
  const [matterNames, setMatterNames] = useState({});
  const [matterData, setMatterData] = useState({});

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/airtable/assets-debts');
      let fetchedRecords = response.data.records || [];
      
      // Sort by most recently added (by createdTime if available, otherwise by order)
      fetchedRecords.sort((a, b) => {
        const dateA = new Date(a.createdTime || 0);
        const dateB = new Date(b.createdTime || 0);
        return dateB - dateA;
      });
      
      setRecords(fetchedRecords);

      // Fetch linked matter names
      const matterIds = new Set();
      fetchedRecords.forEach(record => {
        const matters = record.fields?.Matters || [];
        matters.forEach(id => matterIds.add(id));
      });

      // Fetch matter details
      const names = {};
      const data = {};
      for (const matterId of matterIds) {
        try {
          const matterResponse = await masterListApi.getOne(matterId);
          const fields = matterResponse.data.fields || {};
          names[matterId] = fields['Matter Name'] || fields['Client'] || 'Unknown';
          data[matterId] = {
            id: matterId,
            name: fields['Matter Name'] || fields['Client'] || 'Unknown',
            type: fields['Type of Case'] || 'Unknown'
          };
        } catch {
          names[matterId] = 'Unknown';
          data[matterId] = { id: matterId, name: 'Unknown', type: 'Unknown' };
        }
      }
      setMatterNames(names);
      setMatterData(data);
    } catch (error) {
      console.error('Failed to fetch assets/debts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Get icon based on type
  const getTypeIcon = (record) => {
    const type = record.fields?.['Type of Asset'] || record.fields?.['Type of Debt'] || '';
    const isAsset = record.fields?.['Asset or Debt'] === 'Asset';
    
    if (type.includes('Real Estate') || type.includes('Property')) return Building;
    if (type.includes('Vehicle') || type.includes('Car')) return Car;
    if (type.includes('Credit') || type.includes('Loan')) return CreditCard;
    if (type.includes('Business')) return Briefcase;
    return isAsset ? TrendingUp : TrendingDown;
  };

  // Get linked matter names for a record
  const getLinkedMatters = (record) => {
    const matters = record.fields?.Matters || [];
    return matters.map(id => ({
      id,
      name: matterNames[id] || 'Unknown',
      data: matterData[id]
    }));
  };

  // Navigate to matter
  const navigateToMatter = (matter, e) => {
    e.stopPropagation();
    if (!matter?.data?.id) return;
    const type = (matter.data.type || '').toLowerCase();
    if (type.includes('probate')) {
      navigate(`/case/probate/${matter.data.id}`);
    } else if (type.includes('estate planning')) {
      navigate(`/case/estate-planning/${matter.data.id}`);
    } else if (type.includes('deed')) {
      navigate(`/case/deed/${matter.data.id}`);
    } else {
      navigate(`/case/probate/${matter.data.id}`);
    }
  };

  // Filter and search records (now also searches matters)
  const filteredRecords = records.filter(record => {
    const name = record.fields?.['Name of Asset'] || '';
    const type = record.fields?.['Asset or Debt'] || '';
    const assetType = record.fields?.['Type of Asset'] || '';
    const debtType = record.fields?.['Type of Debt'] || '';
    const notes = record.fields?.Notes || '';
    
    // Get linked matter names for search
    const linkedMatters = getLinkedMatters(record);
    const matterNamesStr = linkedMatters.map(m => m.name).join(' ');
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = name.toLowerCase().includes(searchLower) ||
                         assetType.toLowerCase().includes(searchLower) ||
                         debtType.toLowerCase().includes(searchLower) ||
                         notes.toLowerCase().includes(searchLower) ||
                         matterNamesStr.toLowerCase().includes(searchLower);
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'asset' && type === 'Asset') ||
                         (filter === 'debt' && type === 'Debt');
    
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Wallet className="w-7 h-7 inline-block mr-2 text-[#2E7DA1]" />
            Assets & Debts
          </h1>
          <p className="text-slate-500 mt-1">View and manage all assets and debts</p>
        </div>
        <Button 
          onClick={() => navigate('/actions/add-asset-debt')}
          className="bg-[#2E7DA1] hover:bg-[#246585] rounded-full"
        >
          Add Asset/Debt
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search assets, debts, or matters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-[#2E7DA1]' : ''}
              >
                All ({records.length})
              </Button>
              <Button
                variant={filter === 'asset' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('asset')}
                className={filter === 'asset' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Assets ({records.filter(r => r.fields?.['Asset or Debt'] === 'Asset').length})
              </Button>
              <Button
                variant={filter === 'debt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('debt')}
                className={filter === 'debt' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Debts ({records.filter(r => r.fields?.['Asset or Debt'] === 'Debt').length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <FileText className="w-12 h-12 mb-2 text-slate-300" />
              <p>No records found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRecords.map((record) => {
                const Icon = getTypeIcon(record);
                const isAsset = record.fields?.['Asset or Debt'] === 'Asset';
                const type = record.fields?.['Type of Asset'] || record.fields?.['Type of Debt'] || 'Other';
                const linkedMatters = getLinkedMatters(record);
                
                return (
                  <div 
                    key={record.id}
                    className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isAsset ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Icon className={`w-5 h-5 ${isAsset ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">
                          {record.fields?.['Name of Asset'] || 'Unnamed'}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={isAsset ? 'border-green-200 text-green-700 bg-green-50' : 'border-red-200 text-red-700 bg-red-50'}
                        >
                          {isAsset ? 'Asset' : 'Debt'}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5">{type}</div>
                      
                      {/* Linked Matters */}
                      {linkedMatters.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {linkedMatters.map((matter, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => navigateToMatter(matter, e)}
                              className="text-sm text-[#2E7DA1] hover:underline flex items-center gap-1"
                            >
                              {matter.name}
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {record.fields?.Notes && (
                        <div className="text-sm text-slate-400 truncate mt-1">
                          {record.fields.Notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`font-semibold ${isAsset ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(record.fields?.Value)}
                      </div>
                      {record.fields?.Status && (
                        <div className="text-xs text-slate-500 mt-0.5">{record.fields.Status}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetsDebtsListPage;
