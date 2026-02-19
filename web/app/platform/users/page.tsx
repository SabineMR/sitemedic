/**
 * Platform Users Page
 *
 * Allows platform admins to view and manage all users across all organizations.
 * Shows users with their org membership, roles, and last login time.
 */

'use client';

import { useEffect, useState } from 'react';
import { Users, Search, Shield, Building2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface PlatformUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  org_name: string | null;
  last_sign_in_at: string | null;
  created_at: string;
}

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/platform/users');
        if (!res.ok) {
          console.error('Error fetching users:', res.status);
          setLoading(false);
          return;
        }
        const { users: data } = await res.json();
        setUsers(data || []);
      } catch (e) {
        console.error('Error fetching users:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    const matchesSearch =
      search === '' ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.org_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const roleColors: Record<string, string> = {
    platform_admin: 'bg-purple-100 text-purple-800',
    org_admin: 'bg-blue-100 text-blue-800',
    site_manager: 'bg-green-100 text-green-800',
    medic: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-purple-200 mt-1">All users across all organisations</p>
        </div>
        <div className="flex items-center gap-2 bg-purple-800/50 px-4 py-2 rounded-xl border border-purple-700/50">
          <Users className="w-5 h-5 text-purple-300" />
          <span className="text-white font-semibold">{users.length} total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
          <input
            type="text"
            placeholder="Search by name, email or org..."
            aria-label="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-purple-800/40 border border-purple-700/50 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 bg-purple-800/40 border border-purple-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        >
          <option value="all">All Roles</option>
          <option value="platform_admin">Platform Admin</option>
          <option value="org_admin">Org Admin</option>
          <option value="site_manager">Site Manager</option>
          <option value="medic">Medic</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-purple-800/40 border border-purple-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-purple-800/30 border border-purple-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <p className="text-purple-200 font-medium">No users found</p>
            <p className="text-purple-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-purple-700/50">
                <th className="text-left px-6 py-4 text-purple-300 text-sm font-medium">User</th>
                <th className="text-left px-6 py-4 text-purple-300 text-sm font-medium">Role</th>
                <th className="text-left px-6 py-4 text-purple-300 text-sm font-medium">Status</th>
                <th className="text-left px-6 py-4 text-purple-300 text-sm font-medium">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    Organisation
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-purple-300 text-sm font-medium">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Last Login
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-700/30">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-purple-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {(user.full_name ?? user.email).slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {user.full_name ?? user.email.split('@')[0]}
                        </p>
                        <p className="text-purple-300 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        roleColors[user.role] ?? 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.role === 'platform_admin' && <Shield className="w-3 h-3" />}
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          user.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-purple-100 text-sm">
                      {user.org_name ?? <span className="text-purple-400 italic">No org</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-purple-200 text-sm">
                      {user.last_sign_in_at
                        ? format(new Date(user.last_sign_in_at), 'dd MMM yyyy HH:mm')
                        : <span className="text-purple-400 italic">Never</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
