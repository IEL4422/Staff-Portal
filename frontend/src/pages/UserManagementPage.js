import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Users, Plus, Shield, UserCheck, UserX, Key, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserManagementPage = () => {
  const { user, isAdmin, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetToken, setResetToken] = useState('');
  const [copied, setCopied] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'staff'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/auth/admin/users`, getAuthHeader());
      setUsers(response.data.users);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await axios.post(`${API}/auth/admin/users`, newUser, getAuthHeader());
      toast.success('User created successfully');
      setShowCreateDialog(false);
      setNewUser({ email: '', password: '', name: '', role: 'staff' });
      fetchUsers();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create user';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await axios.patch(`${API}/auth/admin/users/${userId}`, updates, getAuthHeader());
      toast.success('User updated successfully');
      fetchUsers();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update user';
      toast.error(message);
    }
  };

  const handleResetPassword = async (targetUser) => {
    try {
      const response = await axios.post(
        `${API}/auth/admin/users/${targetUser.id}/reset-password`,
        {},
        getAuthHeader()
      );
      setResetToken(response.data.reset_token);
      setSelectedUser(targetUser);
      setShowResetDialog(true);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to generate reset token';
      toast.error(message);
    }
  };

  const copyResetLink = () => {
    const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}`;
    navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    toast.success('Reset link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
    }
    return <Badge variant="secondary"><UserCheck className="w-3 h-3 mr-1" />Staff</Badge>;
  };

  const getStatusBadge = (isActive) => {
    if (isActive) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
    }
    return <Badge variant="destructive">Deactivated</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#2E7DA1]/30 border-t-[#2E7DA1] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            User Management
          </h1>
          <p className="text-slate-500 mt-1">Manage staff accounts and permissions</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#2E7DA1] hover:bg-[#246585]">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className={!u.is_active ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{getRoleBadge(u.role)}</TableCell>
                  <TableCell>{getStatusBadge(u.is_active)}</TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={u.role}
                        onValueChange={(value) => handleUpdateUser(u.id, { role: value })}
                        disabled={u.id === user.id}
                      >
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(u)}
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </Button>

                      {u.id !== user.id && (
                        <Button
                          variant={u.is_active ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => handleUpdateUser(u.id, { is_active: !u.is_active })}
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                          className={u.is_active ? '' : 'bg-green-600 hover:bg-green-700'}
                        >
                          {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new staff member to the portal
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="At least 8 characters"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="bg-[#2E7DA1] hover:bg-[#246585]">
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Create User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset Link</DialogTitle>
            <DialogDescription>
              Share this link with {selectedUser?.name} to reset their password
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-slate-100 p-3 rounded-lg break-all text-sm font-mono">
              {`${window.location.origin}/reset-password?token=${resetToken}`}
            </div>
            <p className="text-sm text-slate-500 mt-2">
              This link will expire in 24 hours.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Close
            </Button>
            <Button onClick={copyResetLink} className="bg-[#2E7DA1] hover:bg-[#246585]">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;
