/**
 * Documents Tab Screen (iOS)
 * Phase 45-02: View compliance documents grouped by category
 *
 * Fetches documents directly from Supabase (not via Next.js API routes).
 * Supports download via signed URLs and version replacement navigation.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useOrg } from '../../src/contexts/OrgContext';

interface Category {
  id: string;
  name: string;
  slug: string;
  is_required: boolean;
}

interface DocumentVersion {
  id: string;
  storage_path: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  expiry_date: string | null;
  version_number: number;
  created_at: string;
}

interface DocumentRecord {
  id: string;
  category_id: string;
  current_version_id: string | null;
  status: string;
  created_at: string;
  current_version: DocumentVersion | null;
  category_name: string;
  category_slug: string;
}

export default function DocumentsScreen() {
  const router = useRouter();
  const { state: authState } = useAuth();
  const { orgId } = useOrg();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!orgId || !authState.user) return;

    try {
      // Get medic record
      const { data: medicRecord } = await supabase
        .from('medics')
        .select('id')
        .eq('user_id', authState.user.id)
        .eq('org_id', orgId)
        .single();

      if (!medicRecord) return;

      // Fetch categories and documents in parallel
      const [catsResult, docsResult] = await Promise.all([
        supabase
          .from('document_categories')
          .select('id, name, slug, is_required')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('documents')
          .select('*, document_categories!documents_category_id_fkey(name, slug)')
          .eq('medic_id', medicRecord.id)
          .eq('org_id', orgId)
          .neq('status', 'archived')
          .order('created_at', { ascending: false }),
      ]);

      if (catsResult.data) setCategories(catsResult.data);

      if (docsResult.data) {
        // Fetch current versions for each document
        const docsWithVersions = await Promise.all(
          docsResult.data.map(async (doc) => {
            let currentVersion: DocumentVersion | null = null;
            if (doc.current_version_id) {
              const { data: version } = await supabase
                .from('document_versions')
                .select('*')
                .eq('id', doc.current_version_id)
                .single();
              currentVersion = version;
            }

            const category = doc.document_categories as unknown as {
              name: string;
              slug: string;
            } | null;

            return {
              id: doc.id,
              category_id: doc.category_id,
              current_version_id: doc.current_version_id,
              status: doc.status,
              created_at: doc.created_at,
              current_version: currentVersion,
              category_name: category?.name ?? 'Unknown',
              category_slug: category?.slug ?? 'unknown',
            };
          })
        );

        setDocuments(docsWithVersions);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgId, authState.user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh when tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  function onRefresh() {
    setRefreshing(true);
    fetchData();
  }

  async function handleDownload(storagePath: string) {
    try {
      const { data, error } = await supabase.storage
        .from('medic-documents')
        .createSignedUrl(storagePath, 3600);

      if (error || !data?.signedUrl) {
        Alert.alert('Download Failed', 'Could not generate download URL');
        return;
      }

      await Linking.openURL(data.signedUrl);
    } catch (err) {
      Alert.alert('Download Failed', 'An error occurred');
    }
  }

  function handleNewVersion(documentId: string, categoryId: string) {
    router.push({
      pathname: '/documents/upload',
      params: { replaceDocumentId: documentId, presetCategoryId: categoryId },
    } as any);
  }

  function getExpiryBadge(expiryDate: string | null) {
    if (!expiryDate) return { text: 'No Expiry', color: '#6B7280', bg: '#F3F4F6' };
    const daysUntil = Math.ceil(
      (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil < 0) return { text: 'Expired', color: '#DC2626', bg: '#FEE2E2' };
    if (daysUntil <= 30) return { text: 'Expiring Soon', color: '#D97706', bg: '#FEF3C7' };
    return { text: 'Current', color: '#059669', bg: '#D1FAE5' };
  }

  function formatDate(dateString: string) {
    const d = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Group documents by category
  const grouped = categories.map((cat) => ({
    category: cat,
    docs: documents.filter((d) => d.category_slug === cat.slug),
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Documents</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => router.push('/documents/upload' as any)}
        >
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {documents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>No documents uploaded yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap Upload to add your compliance documents.
          </Text>
        </View>
      ) : (
        grouped.map(({ category, docs }) => (
          <View key={category.id} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>({docs.length})</Text>
            </View>

            {docs.length === 0 ? (
              <Text style={styles.noDocs}>No documents</Text>
            ) : (
              docs.map((doc) => {
                const version = doc.current_version;
                const badge = getExpiryBadge(version?.expiry_date ?? null);

                return (
                  <View key={doc.id} style={styles.docCard}>
                    <View style={styles.docInfo}>
                      <Text style={styles.docIcon}>
                        {version?.mime_type?.startsWith('image/') ? '🖼️' : '📄'}
                      </Text>
                      <View style={styles.docDetails}>
                        <Text style={styles.docName} numberOfLines={1}>
                          {version?.file_name ?? 'Unknown file'}
                        </Text>
                        <View style={styles.docMeta}>
                          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.badgeText, { color: badge.color }]}>
                              {badge.text}
                            </Text>
                          </View>
                          <Text style={styles.versionBadge}>
                            v{version?.version_number ?? 1}
                          </Text>
                          {version?.created_at && (
                            <Text style={styles.dateText}>{formatDate(version.created_at)}</Text>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.docActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() =>
                          version?.storage_path && handleDownload(version.storage_path)
                        }
                      >
                        <Text style={styles.actionText}>Download</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleNewVersion(doc.id, doc.category_id)}
                      >
                        <Text style={styles.actionText}>New Version</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  uploadButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryCount: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  noDocs: {
    fontSize: 13,
    color: '#9CA3AF',
    paddingLeft: 4,
  },
  docCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 8,
  },
  docInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docIcon: {
    fontSize: 24,
  },
  docDetails: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  versionBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  docActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563EB',
  },
});
