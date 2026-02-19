'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ContractTemplate, ContractClause } from '@/lib/contracts/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Edit,
  Save,
  X,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Archive,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

interface TemplateManagerProps {
  templates: ContractTemplate[];
}

/**
 * Template management component
 *
 * Displays all contract templates with inline editing.
 * Supports CRUD operations: create, edit, archive, set default.
 */
export function TemplateManager({ templates }: TemplateManagerProps) {
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<ContractTemplate>>({});
  const [confirmArchiveId, setConfirmArchiveId] = React.useState<string | null>(null);

  // Start editing a template
  const handleEdit = (template: ContractTemplate) => {
    setEditingId(template.id);
    setFormData(template);
    setCreating(false);
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null);
    setCreating(false);
    setFormData({});
  };

  // Start creating new template
  const handleCreate = () => {
    setCreating(true);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      clauses: [],
      terms_and_conditions: '',
      cancellation_policy: '',
      is_default: false,
    });
  };

  // Save template (create or update)
  const handleSave = async () => {
    try {
      const url = creating
        ? '/api/contracts/templates'
        : `/api/contracts/templates`;

      const method = creating ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      toast.success(creating ? 'Template created!' : 'Template saved!');
      handleCancel();
      router.refresh();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template. Please try again.');
    }
  };

  // Archive template
  const handleArchive = async (templateId: string) => {
    if (confirmArchiveId !== templateId) {
      setConfirmArchiveId(templateId);
      return;
    }
    setConfirmArchiveId(null);

    try {
      const response = await fetch('/api/contracts/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive template');
      }

      toast.success('Template archived');
      router.refresh();
    } catch (error) {
      console.error('Error archiving template:', error);
      toast.error('Failed to archive template. Please try again.');
    }
  };

  // Set as default template
  const handleSetDefault = async (templateId: string) => {
    try {
      const response = await fetch('/api/contracts/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, is_default: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to set default template');
      }

      toast.success('Default template updated');
      router.refresh();
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Failed to set default template. Please try again.');
    }
  };

  // Add clause
  const handleAddClause = () => {
    const clauses = formData.clauses || [];
    setFormData({
      ...formData,
      clauses: [
        ...clauses,
        { title: '', body: '', required: true, order: clauses.length + 1 },
      ],
    });
  };

  // Remove clause
  const handleRemoveClause = (index: number) => {
    const clauses = [...(formData.clauses || [])];
    clauses.splice(index, 1);
    // Renumber orders
    clauses.forEach((clause, i) => {
      clause.order = i + 1;
    });
    setFormData({ ...formData, clauses });
  };

  // Move clause up
  const handleMoveClauseUp = (index: number) => {
    if (index === 0) return;
    const clauses = [...(formData.clauses || [])];
    [clauses[index - 1], clauses[index]] = [clauses[index], clauses[index - 1]];
    // Renumber orders
    clauses.forEach((clause, i) => {
      clause.order = i + 1;
    });
    setFormData({ ...formData, clauses });
  };

  // Move clause down
  const handleMoveClauseDown = (index: number) => {
    const clauses = formData.clauses || [];
    if (index === clauses.length - 1) return;
    const newClauses = [...clauses];
    [newClauses[index], newClauses[index + 1]] = [
      newClauses[index + 1],
      newClauses[index],
    ];
    // Renumber orders
    newClauses.forEach((clause, i) => {
      clause.order = i + 1;
    });
    setFormData({ ...formData, clauses: newClauses });
  };

  // Update clause
  const handleUpdateClause = (index: number, field: keyof ContractClause, value: any) => {
    const clauses = [...(formData.clauses || [])];
    clauses[index] = { ...clauses[index], [field]: value };
    setFormData({ ...formData, clauses });
  };

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Templates</h2>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Template
        </Button>
      </div>

      {/* Creating new template */}
      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Template name..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Clauses</label>
                <Button variant="outline" size="sm" onClick={handleAddClause}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Clause
                </Button>
              </div>

              {(formData.clauses || []).map((clause, index) => (
                <div key={index} className="border rounded p-3 mb-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Input
                      value={clause.title}
                      onChange={(e) =>
                        handleUpdateClause(index, 'title', e.target.value)
                      }
                      placeholder="Clause title..."
                      className="flex-1 mr-2"
                    />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveClauseUp(index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveClauseDown(index)}
                        disabled={index === (formData.clauses || []).length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveClause(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={clause.body}
                    onChange={(e) =>
                      handleUpdateClause(index, 'body', e.target.value)
                    }
                    placeholder="Clause text..."
                    rows={3}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium">Terms and Conditions</label>
              <Textarea
                value={formData.terms_and_conditions || ''}
                onChange={(e) =>
                  setFormData({ ...formData, terms_and_conditions: e.target.value })
                }
                placeholder="General terms and conditions..."
                rows={5}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Cancellation Policy</label>
              <Textarea
                value={formData.cancellation_policy || ''}
                onChange={(e) =>
                  setFormData({ ...formData, cancellation_policy: e.target.value })
                }
                placeholder="Cancellation and refund policy..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template list */}
      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>{template.name}</CardTitle>
                  {template.is_default && (
                    <Badge variant="default">
                      <Star className="mr-1 h-3 w-3" />
                      Default
                    </Badge>
                  )}
                  <Badge variant="outline">v{template.version}</Badge>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.description}
                  </p>
                )}
              </div>

              {editingId !== template.id && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  {!template.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(template.id)}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant={confirmArchiveId === template.id ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => handleArchive(template.id)}
                    onBlur={() => setConfirmArchiveId(null)}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {confirmArchiveId === template.id ? 'Confirm Archive?' : 'Archive'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          {editingId === template.id && (
            <CardContent className="space-y-4">
              {/* Same editing UI as create */}
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Clauses</label>
                  <Button variant="outline" size="sm" onClick={handleAddClause}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Clause
                  </Button>
                </div>

                {(formData.clauses || []).map((clause, index) => (
                  <div key={index} className="border rounded p-3 mb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <Input
                        value={clause.title}
                        onChange={(e) =>
                          handleUpdateClause(index, 'title', e.target.value)
                        }
                        className="flex-1 mr-2"
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveClauseUp(index)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveClauseDown(index)}
                          disabled={index === (formData.clauses || []).length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveClause(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={clause.body}
                      onChange={(e) =>
                        handleUpdateClause(index, 'body', e.target.value)
                      }
                      rows={3}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium">Terms and Conditions</label>
                <Textarea
                  value={formData.terms_and_conditions || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, terms_and_conditions: e.target.value })
                  }
                  rows={5}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Cancellation Policy</label>
                <Textarea
                  value={formData.cancellation_policy || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, cancellation_policy: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {templates.length === 0 && !creating && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No templates yet</p>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
