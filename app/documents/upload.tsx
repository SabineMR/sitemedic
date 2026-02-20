/**
 * Document Upload Screen (iOS)
 * Phase 45-02: Upload compliance documents via file picker or camera
 *
 * Supports PDF/JPEG/PNG via expo-document-picker and camera capture via expo-image-picker.
 * Uploads directly to Supabase Storage with same path convention as web.
 * Versioning: if replaceDocumentId provided, creates new version of existing document.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useOrg } from '../../src/contexts/OrgContext';

interface Category {
  id: string;
  name: string;
  slug: string;
  is_required: boolean;
}

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

export default function DocumentUploadScreen() {
  const router = useRouter();
  const { replaceDocumentId, presetCategoryId } = useLocalSearchParams<{
    replaceDocumentId?: string;
    presetCategoryId?: string;
  }>();
  const { state: authState } = useAuth();
  const { orgId } = useOrg();

  const [file, setFile] = useState<SelectedFile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(presetCategoryId || '');
  const [expiryDate, setExpiryDate] = useState('');
  const [doesNotExpire, setDoesNotExpire] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, [orgId]);

  async function fetchCategories() {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('id, name, slug, is_required')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('sort_order');

      if (!error && data) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Maximum file size is 10MB');
        return;
      }

      setFile({
        uri: asset.uri,
        name: asset.name,
        size: asset.size || 0,
        mimeType: asset.mimeType || 'application/octet-stream',
      });
    } catch (err) {
      console.error('Document picker error:', err);
    }
  }

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const fileName = `photo-${Date.now()}.jpg`;

      setFile({
        uri: asset.uri,
        name: fileName,
        size: asset.fileSize || 0,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } catch (err) {
      console.error('Camera error:', err);
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleUpload() {
    if (!file || !selectedCategoryId || !orgId || !authState.user) return;

    setUploading(true);
    try {
      // Get medic record
      const { data: medicRecord, error: medicError } = await supabase
        .from('medics')
        .select('id')
        .eq('user_id', authState.user.id)
        .eq('org_id', orgId)
        .single();

      if (medicError || !medicRecord) {
        throw new Error('Medic record not found');
      }

      const medicId = medicRecord.id;
      const category = categories.find((c) => c.id === selectedCategoryId);
      if (!category) throw new Error('Category not found');

      // Sanitize filename
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${orgId}/${medicId}/${category.slug}/${Date.now()}-${sanitizedName}`;

      // Read file as blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('medic-documents')
        .upload(storagePath, blob, {
          contentType: file.mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const parsedExpiry = !doesNotExpire && expiryDate ? expiryDate : null;
      const userId = authState.user.id;

      if (replaceDocumentId) {
        // NEW VERSION of existing document
        const { data: maxVersion } = await supabase
          .from('document_versions')
          .select('version_number')
          .eq('document_id', replaceDocumentId)
          .order('version_number', { ascending: false })
          .limit(1)
          .single();

        const nextVersion = (maxVersion?.version_number ?? 0) + 1;

        const { data: newVersion, error: versionError } = await supabase
          .from('document_versions')
          .insert({
            document_id: replaceDocumentId,
            org_id: orgId,
            storage_path: storagePath,
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: file.mimeType,
            expiry_date: parsedExpiry,
            certificate_number: certificateNumber || null,
            notes: notes || null,
            version_number: nextVersion,
            uploaded_by: userId,
          })
          .select()
          .single();

        if (versionError || !newVersion) throw versionError || new Error('Failed to create version');

        await supabase
          .from('documents')
          .update({ current_version_id: newVersion.id, status: 'pending' })
          .eq('id', replaceDocumentId);
      } else {
        // NEW DOCUMENT
        const { data: newDoc, error: docError } = await supabase
          .from('documents')
          .insert({
            org_id: orgId,
            medic_id: medicId,
            category_id: selectedCategoryId,
            status: 'pending',
          })
          .select()
          .single();

        if (docError || !newDoc) throw docError || new Error('Failed to create document');

        const { data: newVersion, error: versionError } = await supabase
          .from('document_versions')
          .insert({
            document_id: newDoc.id,
            org_id: orgId,
            storage_path: storagePath,
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: file.mimeType,
            expiry_date: parsedExpiry,
            certificate_number: certificateNumber || null,
            notes: notes || null,
            version_number: 1,
            uploaded_by: userId,
          })
          .select()
          .single();

        if (versionError || !newVersion) throw versionError || new Error('Failed to create version');

        await supabase
          .from('documents')
          .update({ current_version_id: newVersion.id })
          .eq('id', newDoc.id);
      }

      Alert.alert('Document Uploaded', 'Your document has been uploaded successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  }

  const isFormValid = file && selectedCategoryId && !uploading;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {replaceDocumentId ? 'Upload New Version' : 'Upload Document'}
      </Text>

      {/* Source buttons */}
      <View style={styles.sourceButtons}>
        <TouchableOpacity style={styles.sourceButton} onPress={pickDocument}>
          <Text style={styles.sourceButtonIcon}>📄</Text>
          <Text style={styles.sourceButtonText}>Choose File</Text>
          <Text style={styles.sourceButtonHint}>PDF, JPEG, PNG</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sourceButton} onPress={takePhoto}>
          <Text style={styles.sourceButtonIcon}>📷</Text>
          <Text style={styles.sourceButtonText}>Take Photo</Text>
          <Text style={styles.sourceButtonHint}>Camera capture</Text>
        </TouchableOpacity>
      </View>

      {/* File preview */}
      {file && (
        <View style={styles.previewCard}>
          {file.mimeType.startsWith('image/') ? (
            <Image source={{ uri: file.uri }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.pdfPreview}>
              <Text style={styles.pdfIcon}>📄</Text>
            </View>
          )}
          <View style={styles.previewInfo}>
            <Text style={styles.previewName} numberOfLines={1}>{file.name}</Text>
            <Text style={styles.previewSize}>{formatFileSize(file.size)}</Text>
          </View>
          <TouchableOpacity onPress={() => setFile(null)}>
            <Text style={styles.changeButton}>Change</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category picker */}
      <Text style={styles.label}>Category</Text>
      {loadingCategories ? (
        <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 12 }} />
      ) : (
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategoryId === cat.id && styles.categoryChipActive,
                !!presetCategoryId && presetCategoryId !== cat.id && styles.categoryChipDisabled,
              ]}
              onPress={() => {
                if (!presetCategoryId) setSelectedCategoryId(cat.id);
              }}
              disabled={!!presetCategoryId && presetCategoryId !== cat.id}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategoryId === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Expiry date */}
      <View style={styles.expiryRow}>
        <Text style={styles.label}>Expiry Date</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Does not expire</Text>
          <Switch
            value={doesNotExpire}
            onValueChange={setDoesNotExpire}
            trackColor={{ true: '#2563EB', false: '#D1D5DB' }}
          />
        </View>
      </View>
      {!doesNotExpire && (
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9CA3AF"
          value={expiryDate}
          onChangeText={setExpiryDate}
          keyboardType="numbers-and-punctuation"
        />
      )}

      {/* Certificate number */}
      <Text style={styles.label}>Certificate Number (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. INS-2024-001"
        placeholderTextColor="#9CA3AF"
        value={certificateNumber}
        onChangeText={setCertificateNumber}
      />

      {/* Notes */}
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Any additional notes..."
        placeholderTextColor="#9CA3AF"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      {/* Upload button */}
      <TouchableOpacity
        style={[styles.uploadButton, !isFormValid && styles.uploadButtonDisabled]}
        onPress={handleUpload}
        disabled={!isFormValid}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.uploadButtonText}>
            {replaceDocumentId ? 'Upload New Version' : 'Upload Document'}
          </Text>
        )}
      </TouchableOpacity>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  sourceButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sourceButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sourceButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  sourceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sourceButtonHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  pdfPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfIcon: {
    fontSize: 28,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  previewSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  changeButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipDisabled: {
    opacity: 0.4,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  expiryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
