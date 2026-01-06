import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Wallet, 
  Search, 
  Loader2, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Building,
  CreditCard,
  Car,
  Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AssetsDebtsListPage = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, asset, debt

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/airtable/assets-debts');
      setRecords(response.data.records || []);
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

  // Filter and search records
  const filteredRecords = records.filter(record => {
    const name = record.fields?.['Name of Asset'] || '';
    const type = record.fields?.['Asset or Debt'] || '';
    const assetType = record.fields?.['Type of Asset'] || '';
    const debtType = record.fields?.['Type of Debt'] || '';
    
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assetType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         debtType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'asset' && type === 'Asset') ||
                         (filter === 'debt' && type === 'Debt');
    
    return matchesSearch && matchesFilter;
  });

  // Calculate totals
  const totals = records.reduce((acc, record) => {
    const value = record.fields?.Value || 0;
    const type = record.fields?.['Asset or Debt'];
    if (type === 'Asset') acc.assets += value;
    if (type === 'Debt') acc.debts += value;
    return acc;
  }, { assets: 0, debts: 0 });

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Assets</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totals.assets)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Debts</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totals.debts)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2E7DA1]/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#2E7DA1]" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Net Worth</p>
                <p className={`text-xl font-bold ${totals.assets - totals.debts >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.assets - totals.debts)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search assets and debts..."
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
                All
              </Button>
              <Button
                variant={filter === 'asset' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('asset')}
                className={filter === 'asset' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Assets
              </Button>
              <Button
                variant={filter === 'debt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('debt')}
                className={filter === 'debt' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Debts
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
                
                return (
                  <div 
                    key={record.id}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAsset ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Icon className={`w-5 h-5 ${isAsset ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
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
                      <div className="text-sm text-slate-500">{type}</div>
                      {record.fields?.Notes && (
                        <div className="text-sm text-slate-400 truncate mt-1">
                          {record.fields.Notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${isAsset ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(record.fields?.Value)}
                      </div>
                      {record.fields?.Status && (
                        <div className="text-xs text-slate-500">{record.fields.Status}</div>
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
