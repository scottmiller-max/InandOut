import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Upload, File, Image as ImageIcon, Trash2, Download, X } from 'lucide-react-native';

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

const fileStorageService = {
  uploadFile: async (file: any, category: string): Promise<FileMetadata | null> => {
    return null;
  },
  listFiles: async (category: string): Promise<FileMetadata[]> => {
    return [];
  },
  deleteFile: async (fileId: string): Promise<boolean> => {
    return false;
  },
  downloadFile: async (fileId: string): Promise<void> => {
    return;
  },
};

interface FileUploadManagerProps {
  category?: string;
  title?: string;
  allowedTypes?: 'all' | 'images' | 'documents';
  maxFiles?: number;
  onFilesChange?: (files: FileMetadata[]) => void;
}

export function FileUploadManager({
  category = 'general',
  title = 'Files',
  allowedTypes = 'all',
  maxFiles,
  onFilesChange,
}: FileUploadManagerProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [category]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const userFiles = await fileStorageService.getUserFiles(category);
      setFiles(userFiles);
      onFilesChange?.(userFiles);
    } catch (err) {
      console.error('Load files error:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async () => {
    try {
      setUploading(true);
      setError(null);

      if (maxFiles && files.length >= maxFiles) {
        Alert.alert('Limit Reached', `You can only upload up to ${maxFiles} files`);
        return;
      }

      const image = await fileStorageService.pickImage();
      if (!image) return;

      const fileName = image.uri.split('/').pop() || 'image.jpg';
      const mimeType = `image/${image.uri.split('.').pop()}`;

      const uploadedFile = await fileStorageService.uploadFile(
        image.uri,
        fileName,
        mimeType,
        category,
        {
          width: image.width,
          height: image.height,
        }
      );

      const updatedFiles = [...files, uploadedFile];
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);
      Alert.alert('Success', 'Image uploaded successfully');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload image');
      Alert.alert('Upload Failed', err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadDocument = async () => {
    try {
      setUploading(true);
      setError(null);

      if (maxFiles && files.length >= maxFiles) {
        Alert.alert('Limit Reached', `You can only upload up to ${maxFiles} files`);
        return;
      }

      const document = await fileStorageService.pickDocument();
      if (!document) return;

      const uploadedFile = await fileStorageService.uploadFile(
        document.uri,
        document.name,
        document.mimeType || 'application/octet-stream',
        category,
        {
          size: document.size,
        }
      );

      const updatedFiles = [...files, uploadedFile];
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);
      Alert.alert('Success', 'Document uploaded successfully');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document');
      Alert.alert('Upload Failed', err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setError(null);
              await fileStorageService.deleteFile(fileId);
              const updatedFiles = files.filter(f => f.id !== fileId);
              setFiles(updatedFiles);
              onFilesChange?.(updatedFiles);
              Alert.alert('Success', 'File deleted successfully');
            } catch (err: any) {
              console.error('Delete error:', err);
              setError(err.message || 'Failed to delete file');
              Alert.alert('Delete Failed', err.message || 'Failed to delete file');
            }
          },
        },
      ]
    );
  };

  const handleDownloadFile = async (file: FileMetadata) => {
    try {
      setError(null);
      const url = await fileStorageService.getFileUrl(file.storage_path, 300);
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    } catch (err: any) {
      console.error('Download error:', err);
      setError(err.message || 'Failed to download file');
      Alert.alert('Download Failed', err.message || 'Failed to download file');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading files...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {maxFiles && (
          <Text style={styles.fileCount}>
            {files.length}/{maxFiles}
          </Text>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <X size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.uploadButtons}>
        {(allowedTypes === 'all' || allowedTypes === 'images') && (
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleUploadImage}
            disabled={uploading || (maxFiles ? files.length >= maxFiles : false)}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <ImageIcon size={20} color="#ffffff" />
                <Text style={styles.uploadButtonText}>Upload Image</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {(allowedTypes === 'all' || allowedTypes === 'documents') && (
          <TouchableOpacity
            style={[styles.uploadButton, styles.uploadButtonSecondary, uploading && styles.uploadButtonDisabled]}
            onPress={handleUploadDocument}
            disabled={uploading || (maxFiles ? files.length >= maxFiles : false)}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <>
                <File size={20} color="#2563eb" />
                <Text style={styles.uploadButtonTextSecondary}>Upload Document</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {files.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Upload size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No files uploaded yet</Text>
          <Text style={styles.emptySubtext}>Upload images or documents to get started</Text>
        </View>
      ) : (
        <ScrollView style={styles.filesList} showsVerticalScrollIndicator={false}>
          {files.map((file) => (
            <View key={file.id} style={styles.fileItem}>
              <View style={styles.fileIcon}>
                {file.file_type.startsWith('image/') ? (
                  <ImageIcon size={24} color="#2563eb" />
                ) : (
                  <File size={24} color="#2563eb" />
                )}
              </View>

              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.file_name}
                </Text>
                <Text style={styles.fileDetails}>
                  {fileStorageService.formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.fileActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDownloadFile(file)}
                >
                  <Download size={20} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteFile(file.id, file.file_name)}
                >
                  <Trash2 size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  fileCount: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginTop: 12,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonSecondary: {
    backgroundColor: '#eff6ff',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  uploadButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  filesList: {
    maxHeight: 400,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  fileDetails: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  fileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});
