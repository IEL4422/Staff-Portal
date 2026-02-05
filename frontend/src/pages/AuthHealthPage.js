import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { CheckCircle, XCircle, Shield, User, Key, Database, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthHealthPage = () => {
  const { user, token, isAdmin, isAuthenticated } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/auth/health`, { headers });
      setHealthData(response.data);
    } catch (err) {
      setError('Failed to fetch auth health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [token]);

  const StatusIcon = ({ success }) => {
    return success ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Auth Health Check
          </h1>
          <p className="text-slate-500 mt-1">Authentication system status and diagnostics</p>
        </div>
        <Button onClick={fetchHealth} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Auth Provider Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                <span className="text-slate-500">Checking connection...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <StatusIcon success={healthData?.auth_provider_connected} />
                <span className={healthData?.auth_provider_connected ? 'text-green-700' : 'text-red-700'}>
                  {healthData?.auth_provider_connected ? 'Connected to Supabase' : 'Not connected'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Environment Variables
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                <span className="text-slate-500">Checking variables...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {healthData?.env_vars_present?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Present:</p>
                    <div className="flex flex-wrap gap-2">
                      {healthData.env_vars_present.map((varName) => (
                        <Badge key={varName} className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {varName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {healthData?.env_vars_missing?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Missing:</p>
                    <div className="flex flex-wrap gap-2">
                      {healthData.env_vars_missing.map((varName) => (
                        <Badge key={varName} variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          {varName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {healthData?.env_vars_present?.length === 0 && healthData?.env_vars_missing?.length === 0 && (
                  <p className="text-slate-500">No environment variable data available</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                <span className="text-slate-500">Checking session...</span>
              </div>
            ) : isAuthenticated ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <StatusIcon success={true} />
                  <span className="text-green-700">Authenticated</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Name</p>
                      <p className="font-medium">{user?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium">{user?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Role</p>
                      <Badge className={user?.role === 'admin' ? 'bg-amber-100 text-amber-700' : ''}>
                        {user?.role || 'N/A'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Status</p>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        {user?.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <StatusIcon success={false} />
                <span className="text-slate-500">Not authenticated</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <StatusIcon success={healthData?.auth_provider_connected} />
                <p className="text-sm text-slate-600 mt-2">Database</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <StatusIcon success={healthData?.env_vars_missing?.length === 0} />
                <p className="text-sm text-slate-600 mt-2">Environment</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <StatusIcon success={isAuthenticated} />
                <p className="text-sm text-slate-600 mt-2">Session</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <StatusIcon success={isAdmin} />
                <p className="text-sm text-slate-600 mt-2">Admin Role</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthHealthPage;
