import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  Search, 
  Loader2, 
  User,
  MapPin,
  Phone,
  Mail,
  Building,
  UserCheck,
  FileText,
  Link2,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'sonner';

const CaseContactsListPage = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [deleting, setDeleting] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/airtable/case-contacts');
      setRecords(response.data.records || []);
    } catch (error) {
      console.error('Failed to fetch case contacts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Delete case contact
  const handleDeleteContact = async (e, recordId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    
    setDeleting(recordId);
    try {
      await api.delete(`/airtable/case-contacts/${recordId}`);
      toast.success('Contact deleted successfully');
      setRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast.error('Failed to delete contact');
    } finally {
      setDeleting(null);
    }
  };

  // Get linked matter name from record
  const getLinkedMatter = (record) => {
    // Check for 'Master List 2' linked field - Airtable returns lookup values
    const masterList = record.fields?.['Master List 2'] || [];
    const matterName = record.fields?.['Matter Name (from Master List 2)'] || [];
    
    if (matterName.length > 0) {
      return matterName[0];
    }
    if (masterList.length > 0) {
      return `Record: ${masterList[0].substring(0, 8)}...`;
    }
    return null;
  };

  // Get unique contact types - handle both string and array types
  const contactTypes = [...new Set(
    records.map(r => {
      const type = r.fields?.Type;
      if (Array.isArray(type)) return type[0];
      return type;
    }).filter(Boolean)
  )];

  // Filter and search records
  const filteredRecords = records.filter(record => {
    const name = record.fields?.Name || '';
    const type = Array.isArray(record.fields?.Type) ? record.fields?.Type[0] : (record.fields?.Type || '');
    const address = `${record.fields?.['Street Address'] || ''} ${record.fields?.City || ''}`;
    
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Get icon based on contact type
  const getContactIcon = (type) => {
    // Handle case where type might be an array or non-string
    let t = '';
    if (Array.isArray(type)) {
      t = (type[0] || '').toString().toLowerCase();
    } else if (typeof type === 'string') {
      t = type.toLowerCase();
    }
    if (t.includes('attorney') || t.includes('lawyer')) return UserCheck;
    if (t.includes('company') || t.includes('business') || t.includes('bank')) return Building;
    return User;
  };

  // Format address
  const formatAddress = (record) => {
    const parts = [
      record.fields?.['Street Address'],
      record.fields?.City,
      record.fields?.State,
      record.fields?.['Zip Code']
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Users className="w-7 h-7 inline-block mr-2 text-[#2E7DA1]" />
            Case Contacts
          </h1>
          <p className="text-slate-500 mt-1">View and manage all case contacts</p>
        </div>
        <Button 
          onClick={() => navigate('/actions/add-contact')}
          className="bg-[#2E7DA1] hover:bg-[#246585] rounded-full"
        >
          Add Case Contact
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2E7DA1]/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-[#2E7DA1]" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Contacts</p>
                <p className="text-xl font-bold text-slate-900">{records.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {contactTypes.slice(0, 3).map(type => (
          <Card key={type} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  {React.createElement(getContactIcon(type), { className: 'w-5 h-5 text-slate-600' })}
                </div>
                <div>
                  <p className="text-sm text-slate-500">{type}</p>
                  <p className="text-xl font-bold text-slate-900">
                    {records.filter(r => r.fields?.Type === type).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
                className={filterType === 'all' ? 'bg-[#2E7DA1]' : ''}
              >
                All
              </Button>
              {contactTypes.slice(0, 4).map(type => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(type)}
                  className={filterType === type ? 'bg-[#2E7DA1]' : ''}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <FileText className="w-12 h-12 mb-2 text-slate-300" />
              <p>No contacts found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRecords.map((record) => {
                const Icon = getContactIcon(record.fields?.Type);
                const address = formatAddress(record);
                const linkedMatter = getLinkedMatter(record);
                const isDeleting = deleting === record.id;
                
                return (
                  <div 
                    key={record.id}
                    className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#2E7DA1]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#2E7DA1]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">
                          {record.fields?.Name || 'Unnamed Contact'}
                        </span>
                        {record.fields?.Type && (
                          <Badge variant="secondary" className="bg-slate-100">
                            {Array.isArray(record.fields.Type) ? record.fields.Type[0] : record.fields.Type}
                          </Badge>
                        )}
                        {record.fields?.['Disabled/Minor'] && (
                          <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                            Disabled/Minor
                          </Badge>
                        )}
                      </div>
                      
                      {/* Linked Matter */}
                      {linkedMatter && (
                        <div className="text-sm text-[#2E7DA1] mt-1 flex items-center gap-1">
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Linked to: {linkedMatter}</span>
                        </div>
                      )}
                      
                      {record.fields?.['Relationship to Decedent'] && (
                        <div className="text-sm text-slate-600 mt-1">
                          Relationship: {record.fields['Relationship to Decedent']}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                        {address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {address}
                          </span>
                        )}
                        {record.fields?.Phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {record.fields.Phone}
                          </span>
                        )}
                        {record.fields?.Email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {record.fields.Email}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                      onClick={(e) => handleDeleteContact(e, record.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
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

export default CaseContactsListPage;
