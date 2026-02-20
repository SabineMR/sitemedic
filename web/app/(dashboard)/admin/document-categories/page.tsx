/**
 * Document Categories Management Page
 * Phase 45-03: Manage compliance document categories for the org
 *
 * Shows default and custom categories. Admins can create new custom
 * categories and toggle active/inactive status.
 */

'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type { DocumentCategory } from '@/types/comms.types';

const DEFAULT_SLUGS = ['insurance', 'dbs', 'qualification', 'id', 'other'];

export default function DocumentCategoriesPage() {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      // Fetch all categories (including inactive) for management
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const orgId = user.app_metadata?.org_id;
      if (!orgId) return;

      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .eq('org_id', orgId)
        .order('sort_order');

      if (!error && data) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/documents/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (res.status === 409) {
        toast.error('A category with this name already exists');
        return;
      }

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create category');
      }

      toast.success('Category created');
      setNewName('');
      setShowForm(false);
      fetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(categoryId: string, currentActive: boolean) {
    setTogglingId(categoryId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('document_categories')
        .update({ is_active: !currentActive })
        .eq('id', categoryId);

      if (error) throw error;

      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId ? { ...c, is_active: !currentActive } : c
        )
      );
      toast.success(`Category ${!currentActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error('Failed to update category');
    } finally {
      setTogglingId(null);
    }
  }

  function isDefault(slug: string) {
    return DEFAULT_SLUGS.includes(slug);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage compliance document categories for your organisation
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      </div>

      {/* Add Category Form */}
      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
                placeholder="Category name (e.g. Motorsport Medical Licence)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create'
                )}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setNewName(''); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{cat.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {cat.slug}
                  </span>
                  {isDefault(cat.slug) ? (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Custom</Badge>
                  )}
                  {cat.is_required && (
                    <Badge className="bg-amber-100 text-amber-800 text-xs">Required</Badge>
                  )}
                  {!cat.is_active && (
                    <Badge variant="destructive" className="text-xs">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    #{cat.sort_order}
                  </span>
                  {!isDefault(cat.slug) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(cat.id, cat.is_active)}
                      disabled={togglingId === cat.id}
                    >
                      {togglingId === cat.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : cat.is_active ? (
                        'Deactivate'
                      ) : (
                        'Activate'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
