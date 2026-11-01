import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { 
  UserCheck, Plus, Search, Shield, Phone, Mail, 
  KeyRound, Power, CheckCircle, AlertCircle, Edit, Trash2 
} from 'lucide-react';
import { usersApi } from '../../api/client';
import { User, UserRole } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

export const StaffPage: React.FC = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Add User Form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('receptionist');

  // Edit User Form
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('receptionist');
  const [editIsActive, setEditIsActive] = useState(true);
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load staff users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersApi.createUser({
        username,
        email,
        password,
        full_name: fullName,
        phone: phone || undefined,
        role
      });
      setIsAddOpen(false);
      setUsername('');
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create staff account.');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await usersApi.updateUser(selectedUser.id, {
        full_name: editFullName,
        phone: editPhone || undefined,
        role: editRole,
        is_active: editIsActive,
        password: newPassword || undefined
      });
      setIsEditOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update staff member.');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this staff member?')) return;
    try {
      await usersApi.deleteUser(id);
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete staff member.');
    }
  };

  const openEditModal = (u: User) => {
    setSelectedUser(u);
    setEditFullName(u.full_name);
    setEditPhone(u.phone || '');
    setEditRole(u.role);
    setEditIsActive(u.is_active);
    setNewPassword('');
    setIsEditOpen(true);
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return <Badge variant="purple">Admin / GM</Badge>;
      case 'receptionist':
        return <Badge variant="info">Front Desk Receptionist</Badge>;
      case 'restaurant_staff':
        return <Badge variant="warning">Kitchen & Dining Staff</Badge>;
      case 'bar_staff':
        return <Badge variant="indigo">Bar & Lounge Staff</Badge>;
      case 'maintenance_staff':
        return <Badge variant="neutral">Maintenance & Tech</Badge>;
      case 'inventory_manager':
        return <Badge variant="info">Inventory Controller</Badge>;
      case 'accountant':
        return <Badge variant="success">Finance & Accounting</Badge>;
      default:
        return <Badge variant="neutral">{r}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <UserCheck className="w-7 h-7 mr-2.5 text-blue-600" />
            Staff & Role Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage employee access credentials, departmental privileges, and account status
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Staff Member
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Staff Registered</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{users.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Employees</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{users.filter(u => u.is_active).length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Maintenance Crew</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{users.filter(u => u.role === 'maintenance_staff').length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">F&B Operators</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {users.filter(u => u.role === 'restaurant_staff' || u.role === 'bar_staff').length}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="receptionist">Receptionist</option>
            <option value="restaurant_staff">Restaurant Staff</option>
            <option value="bar_staff">Bar Staff</option>
            <option value="maintenance_staff">Maintenance Staff</option>
            <option value="inventory_manager">Inventory Manager</option>
            <option value="accountant">Accountant</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading staff records...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No staff members found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role & Privileges</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.full_name}</p>
                          <p className="text-xs text-slate-400 font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                    <td className="py-3.5 px-4 text-xs space-y-0.5">
                      <div className="flex items-center text-slate-600">
                        <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {u.email}
                      </div>
                      {u.phone && (
                        <div className="flex items-center text-slate-500">
                          <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {u.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {currentUser?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Staff Member"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {u.id !== currentUser.id && u.is_active && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Deactivate Staff Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Staff Member */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Staff User Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kadam"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Username</label>
              <input
                type="text"
                required
                placeholder="e.g. ramesh_rec"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="ramesh@staysync.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98000 12345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Department Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="receptionist">Front Desk Receptionist</option>
                <option value="restaurant_staff">Restaurant / Kitchen Staff</option>
                <option value="bar_staff">Bar & Lounge Staff</option>
                <option value="maintenance_staff">Housekeeping & Maintenance</option>
                <option value="inventory_manager">Inventory Manager</option>
                <option value="accountant">Finance & Accountant</option>
                <option value="admin">System Administrator / GM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Temporary Password</label>
              <input
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Staff Member */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Staff: ${selectedUser?.full_name}`}>
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="receptionist">Front Desk Receptionist</option>
                <option value="restaurant_staff">Restaurant / Kitchen Staff</option>
                <option value="bar_staff">Bar & Lounge Staff</option>
                <option value="maintenance_staff">Housekeeping & Maintenance</option>
                <option value="inventory_manager">Inventory Manager</option>
                <option value="accountant">Finance & Accountant</option>
                <option value="admin">System Administrator / GM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Account Status</label>
              <select
                value={editIsActive ? 'active' : 'inactive'}
                onChange={(e) => setEditIsActive(e.target.value === 'active')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reset Password (Optional)</label>
            <input
              type="password"
              placeholder="Leave blank to keep existing password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
