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
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { assetsDebtsApi, masterListApi } from '../services/api';
import { toast } from 'sonner';
import AssetDebtModal from '../components/probate/AssetDebtModal';

const AssetsDebtsListPage = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, asset, debt
  const [matterNames, setMatterNames] = useState({});
  const [matterData, setMatterData] = useState({});
  const [allMatters, setAllMatters] = useState([]);

  // Edit state
  const [selectedAssetDebt, setSelectedAssetDebt] = useState(null);
  const [editingAssetDebt, setEditingAssetDebt] = useState(false);
  const [assetDebtForm, setAssetDebtForm] = useState({});
  const [savingAssetDebt, setSavingAssetDebt] = useState(false);

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
        // Check both possible field names: "Matters" and "Master List"
        const matters = record.fields?.Matters || record.fields?.['Master List'] || [];
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

      // Fetch all matters for the dropdown
      try {
        const mattersResponse = await masterListApi.getAll();
        setAllMatters(mattersResponse.data.records || []);
      } catch {
        console.error('Failed to fetch matters for dropdown');
      }
    } catch (error) {
      console.error('Failed to fetch assets/debts:', error);
      toast.error('Failed to load assets and debts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Format currency
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '—';
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

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
    if (!matter.data) return;
    
    const caseType = matter.data.type?.toLowerCase();
    if (caseType?.includes('probate')) {
      navigate(`/cases/probate/${matter.id}`);
    } else if (caseType?.includes('estate planning')) {
      navigate(`/cases/estate-planning/${matter.id}`);
    } else if (caseType?.includes('deed')) {
      navigate(`/cases/deed/${matter.id}`);
    } else if (caseType?.includes('lead')) {
      navigate(`/leads/${matter.id}`);
    } else {
      navigate(`/cases/${matter.id}`);
    }
  };

  // Edit handlers
  const handleStartEditAssetDebt = () => {
    if (!selectedAssetDebt) return;
    const fields = selectedAssetDebt.fields || {};
    setAssetDebtForm({
      name: fields['Name of Asset/Debt'] || fields['Name of Asset'] || '',
      assetOrDebt: fields['Asset or Debt?'] || fields['Asset or Debt'] || 'Asset',
      status: fields.Status || '',
      value: fields.Value || '',
      typeOfAsset: fields['Type of Asset'] || '',
      typeOfDebt: fields['Type of Debt'] || '',
      notes: fields.Notes || '',
      matterId: (fields.Matters || [])[0] || ''
    });
    setEditingAssetDebt(true);
  };

  const handleCancelEditAssetDebt = () => {
    setEditingAssetDebt(false);
    setAssetDebtForm({});
  };

  const handleSaveAssetDebt = async () => {
    if (!selectedAssetDebt) return;
    setSavingAssetDebt(true);
    try {
      const updateData = {
        'Name of Asset': assetDebtForm.name,
        'Asset or Debt': assetDebtForm.assetOrDebt,
        Status: assetDebtForm.status,
        Value: assetDebtForm.value ? parseFloat(assetDebtForm.value) : null,
        Notes: assetDebtForm.notes
      };

      if (assetDebtForm.assetOrDebt === 'Asset') {
        updateData['Type of Asset'] = assetDebtForm.typeOfAsset;
      } else {
        updateData['Type of Debt'] = assetDebtForm.typeOfDebt;
      }

      if (assetDebtForm.matterId) {
        updateData['Matters'] = [assetDebtForm.matterId];
      }

      await assetsDebtsApi.update(selectedAssetDebt.id, updateData);
      toast.success('Asset/Debt updated successfully');

      // Update local state
      setRecords(prev => prev.map(item => 
        item.id === selectedAssetDebt.id 
          ? { ...item, fields: { ...item.fields, ...updateData } }
          : item
      ));

      // Update matter names if changed
      if (assetDebtForm.matterId && !matterNames[assetDebtForm.matterId]) {
        try {
          const matterResponse = await masterListApi.getOne(assetDebtForm.matterId);
          const fields = matterResponse.data.fields || {};
          setMatterNames(prev => ({
            ...prev,
            [assetDebtForm.matterId]: fields['Matter Name'] || fields['Client'] || 'Unknown'
          }));
          setMatterData(prev => ({
            ...prev,
            [assetDebtForm.matterId]: {
              id: assetDebtForm.matterId,
              name: fields['Matter Name'] || fields['Client'] || 'Unknown',
              type: fields['Type of Case'] || 'Unknown'
            }
          }));
        } catch {
          // Ignore errors when fetching matter name
        }
      }

      setEditingAssetDebt(false);
      setSelectedAssetDebt(null);
    } catch (error) {
      console.error('Failed to update asset/debt:', error);
      toast.error('Failed to update asset/debt');
    } finally {
      setSavingAssetDebt(false);
    }
  };

  const handleDeleteAssetDebt = async (assetId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await assetsDebtsApi.delete(assetId);
      toast.success('Asset/Debt deleted successfully');
      setRecords(prev => prev.filter(a => a.id !== assetId));
      setSelectedAssetDebt(null);
    } catch (error) {
      console.error('Failed to delete asset/debt:', error);
      toast.error('Failed to delete asset/debt');
    }
  };

  const handleNavigateToMatter = (matterId) => {
    const matter = matterData[matterId];
    if (!matter) return;
    
    const caseType = matter.type?.toLowerCase();
    if (caseType?.includes('probate')) {
      navigate(`/cases/probate/${matterId}`);
    } else if (caseType?.includes('estate planning')) {
      navigate(`/cases/estate-planning/${matterId}`);
    } else if (caseType?.includes('deed')) {
      navigate(`/cases/deed/${matterId}`);
    } else if (caseType?.includes('lead')) {
      navigate(`/leads/${matterId}`);
    } else {
      navigate(`/cases/${matterId}`);
    }
  };

  // Filter records
  const filteredRecords = records.filter(record => {
    const name = (record.fields?.['Name of Asset'] || record.fields?.['Name of Asset/Debt'] || '').toLowerCase();
    const type = (record.fields?.['Type of Asset'] || record.fields?.['Type of Debt'] || '').toLowerCase();
    const notes = (record.fields?.Notes || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.includes(query) || type.includes(query) || notes.includes(query);

    if (filter === 'all') return matchesSearch;
    if (filter === 'asset') return matchesSearch && record.fields?.['Asset or Debt'] === 'Asset';
    if (filter === 'debt') return matchesSearch && record.fields?.['Asset or Debt'] === 'Debt';
    return matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" data-testid="assets-debts-list-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="w-7 h-7 text-[#2E7DA1]" />
          Assets & Debts
        </h1>
        <p className="text-slate-500 mt-1">Manage all assets and debts across cases</p>
      </div>

      {/* Search and Filters */}
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
                data-testid="search-input"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-[#2E7DA1] hover:bg-[#256a8a]' : ''}
                data-testid="filter-all-btn"
              >
                All ({records.length})
              </Button>
              <Button
                variant={filter === 'asset' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('asset')}
                className={filter === 'asset' ? 'bg-green-600 hover:bg-green-700' : ''}
                data-testid="filter-assets-btn"
              >
                Assets ({records.filter(r => r.fields?.['Asset or Debt'] === 'Asset').length})
              </Button>
              <Button
                variant={filter === 'debt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('debt')}
                className={filter === 'debt' ? 'bg-red-600 hover:bg-red-700' : ''}
                data-testid="filter-debts-btn"
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
                    onClick={() => setSelectedAssetDebt(record)}
                    className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    data-testid={`asset-debt-row-${record.id}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isAsset ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Icon className={`w-5 h-5 ${isAsset ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">
                          {record.fields?.['Name of Asset'] || record.fields?.['Name of Asset/Debt'] || 'Unnamed'}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={isAsset ? 'border-green-200 text-green-700 bg-green-50' : 'border-red-200 text-red-700 bg-red-50'}
                        >
                          {isAsset ? 'Asset' : 'Debt'}
                        </Badge>
                        {record.fields?.Status === 'Found' && (
                          <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                            Found
                          </Badge>
                        )}
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

      {/* Asset/Debt Edit Modal */}
      <AssetDebtModal
        selectedItem={selectedAssetDebt}
        isEditing={editingAssetDebt}
        formData={assetDebtForm}
        saving={savingAssetDebt}
        onClose={() => {
          setSelectedAssetDebt(null);
          setEditingAssetDebt(false);
          setAssetDebtForm({});
        }}
        onStartEdit={handleStartEditAssetDebt}
        onCancelEdit={handleCancelEditAssetDebt}
        onSave={handleSaveAssetDebt}
        onDelete={handleDeleteAssetDebt}
        onFormChange={setAssetDebtForm}
        matters={allMatters}
        matterNames={matterNames}
        showMatterField={true}
        onNavigateToMatter={handleNavigateToMatter}
        onAttachmentUploaded={async (recordId) => {
          // Refresh the record to get updated attachments
          try {
            const response = await api.get('/airtable/assets-debts');
            const updatedRecord = (response.data.records || []).find(r => r.id === recordId);
            if (updatedRecord) {
              setRecords(prev => prev.map(r => r.id === recordId ? updatedRecord : r));
              setSelectedAssetDebt(updatedRecord);
            }
          } catch (error) {
            console.error('Failed to refresh record:', error);
          }
        }}
      />
    </div>
  );
};

export default AssetsDebtsListPage;
