import React, { useState } from 'react';
import { User, Template, Form, FormSubmission } from '../../types';
import {
  getAllUsers,
  updateUserStatus,
  deleteUserAccount,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  getForms,
  getSubmissions
} from '../../services/storage';
import { useToast } from '../common/Toast';
import {
  ShieldAlert,
  Users,
  FileText,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  UserX,
  UserCheck,
  Plus,
  Trash2,
  Tag,
  Search
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>(() => getAllUsers());
  const [templates, setTemplates] = useState<Template[]>(() => getTemplates());
  const [activeTab, setActiveTab] = useState<'users' | 'templates' | 'stats' | 'reports'>('users');
  const [searchUser, setSearchUser] = useState('');

  // System stats across all users
  const allForms = getForms(currentUser.id, true);
  const allSubs = getSubmissions(currentUser.id, true);
  const completedSubs = allSubs.filter((s) => s.status === 'completed');
  const completionRate = allSubs.length > 0 ? Math.round((completedSubs.length / allSubs.length) * 100) : 100;

  const handleToggleUserStatus = (u: User) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    updateUserStatus(u.id, nextStatus);
    setUsers(getAllUsers());
    showToast(
      nextStatus === 'suspended' ? 'Account Suspended' : 'Account Re-activated',
      `${u.name} is now ${nextStatus}.`
    );
  };

  const handleToggleRole = (u: User) => {
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    updateUserStatus(u.id, u.status, nextRole);
    setUsers(getAllUsers());
    showToast('Role Updated', `${u.name} is now a ${nextRole}.`);
  };

  const handleDeleteUser = (u: User) => {
    if (u.id === currentUser.id) {
      showToast('Action Forbidden', 'You cannot delete your own active administrator account.', 'error');
      return;
    }
    if (confirm(`Permanently delete user ${u.name} and all their forms?`)) {
      deleteUserAccount(u.id);
      setUsers(getAllUsers());
      showToast('User Removed', `Account ${u.email} deleted.`);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
    setTemplates(getTemplates());
    showToast('Template Deleted', 'Removed from global library.');
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">Administrator Console</h1>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              System Admin
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor tenant accounts, manage system-wide templates, and oversee data governance.
          </p>
        </div>

        {/* Admin Tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'users' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'templates' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Templates ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'stats' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            System Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'reports' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Content Reports
          </button>
        </div>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              Total accounts: {users.length}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{u.name}</div>
                        <div className="text-[11px] text-neutral-400 font-mono">{u.email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleRole(u)}
                          className={`text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded cursor-pointer ${
                            u.role === 'admin'
                              ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                          title="Click to toggle role"
                        >
                          {u.role}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {u.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              u.status === 'active'
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 text-neutral-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Templates Manager Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              System Form Templates ({templates.length})
            </span>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Template Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Fields Count</th>
                    <th className="py-3 px-4">Fill Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {templates.map((tpl) => (
                    <tr key={tpl.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{tpl.title}</div>
                        <div className="text-[11px] text-neutral-400 truncate max-w-sm">
                          {tpl.description}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {tpl.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{tpl.fields.length} fields</td>
                      <td className="py-3 px-4 text-neutral-500 font-mono">{tpl.estimatedFillTime}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* System Metrics Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block mb-1">
                Total Users
              </span>
              <div className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
                {users.length}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">Multi-tenant accounts</div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block mb-1">
                Total Form Definitions
              </span>
              <div className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
                {allForms.length}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">Across all users</div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block mb-1">
                Total Submissions
              </span>
              <div className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
                {allSubs.length}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">Verified records</div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block mb-1">
                Completion Rate
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                {completionRate}%
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">Draft to submit ratio</div>
            </div>
          </div>
        </div>
      )}

      {/* Content Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-900">Zero Reported Content</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            All user-generated form definitions and shared documents comply with security rules and abuse guidelines.
          </p>
        </div>
      )}
    </div>
  );
};
