import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { FileText, Download, Eye, Upload, CircleCheck as CheckCircle, Clock } from 'lucide-react-native';
import { profileService, UserDocument } from '@/services/profileService';
import { useAuth } from '@/hooks/useAuth';

interface DocumentsSectionProps {
  style?: any;
}

export const DocumentsSection: React.FC<DocumentsSectionProps> = ({ style }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const docs = await profileService.getUserDocuments(user.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Load documents error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (document: UserDocument) => {
    try {
      const supported = await Linking.canOpenURL(document.documentUrl);
      if (supported) {
        await Linking.openURL(document.documentUrl);
      } else {
        Alert.alert('Error', 'Unable to open document. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download document.');
    }
  };

  const getDocumentIcon = (type: string) => {
    const iconProps = { size: 20, color: '#2563eb' };
    switch (type) {
      case 'contract': return <FileText {...iconProps} />;
      case 'receipt': return <FileText {...iconProps} />;
      case 'insurance': return <FileText {...iconProps} />;
      case 'inventory': return <FileText {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Documents & Contracts</Text>
        <TouchableOpacity style={styles.uploadButton}>
          <Upload size={16} color="#2563eb" />
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {documents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FileText size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No documents yet</Text>
          <Text style={styles.emptySubtext}>
            Your contracts and receipts will appear here once uploaded
          </Text>
        </View>
      ) : (
        <View style={styles.documentsList}>
          {documents.map((document) => (
            <View key={document.id} style={styles.documentItem}>
              <View style={styles.documentLeft}>
                <View style={styles.documentIcon}>
                  {getDocumentIcon(document.documentType)}
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName}>{document.documentName}</Text>
                  <View style={styles.documentMeta}>
                    <Text style={styles.documentType}>
                      {document.documentType.charAt(0).toUpperCase() + document.documentType.slice(1)}
                    </Text>
                    <Text style={styles.documentSeparator}>•</Text>
                    <Text style={styles.documentDate}>
                      {formatDate(document.uploadedAt)}
                    </Text>
                    {document.fileSize && (
                      <>
                        <Text style={styles.documentSeparator}>•</Text>
                        <Text style={styles.documentSize}>
                          {formatFileSize(document.fileSize)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.documentActions}>
                {document.isSigned && (
                  <View style={styles.signedBadge}>
                    <CheckCircle size={14} color="#10b981" />
                    <Text style={styles.signedText}>Signed</Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDownloadDocument(document)}
                >
                  <Eye size={16} color="#2563eb" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDownloadDocument(document)}
                >
                  <Download size={16} color="#2563eb" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Mock Documents for Demo */}
      {documents.length === 0 && (
        <View style={styles.mockDocuments}>
          <Text style={styles.mockTitle}>Sample Documents (Demo)</Text>
          
          <View style={styles.documentItem}>
            <View style={styles.documentLeft}>
              <View style={styles.documentIcon}>
                <FileText size={20} color="#2563eb" />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>Moving Contract #2024-001</Text>
                <View style={styles.documentMeta}>
                  <Text style={styles.documentType}>Contract</Text>
                  <Text style={styles.documentSeparator}>•</Text>
                  <Text style={styles.documentDate}>Mar 20, 2024</Text>
                  <Text style={styles.documentSeparator}>•</Text>
                  <Text style={styles.documentSize}>2.1 MB</Text>
                </View>
              </View>
            </View>

            <View style={styles.documentActions}>
              <View style={styles.signedBadge}>
                <CheckCircle size={14} color="#10b981" />
                <Text style={styles.signedText}>Signed</Text>
              </View>
              <TouchableOpacity style={styles.actionButton}>
                <Eye size={16} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Download size={16} color="#2563eb" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.documentItem}>
            <View style={styles.documentLeft}>
              <View style={styles.documentIcon}>
                <FileText size={20} color="#2563eb" />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>Insurance Certificate</Text>
                <View style={styles.documentMeta}>
                  <Text style={styles.documentType}>Insurance</Text>
                  <Text style={styles.documentSeparator}>•</Text>
                  <Text style={styles.documentDate}>Mar 18, 2024</Text>
                  <Text style={styles.documentSeparator}>•</Text>
                  <Text style={styles.documentSize}>1.8 MB</Text>
                </View>
              </View>
            </View>

            <View style={styles.documentActions}>
              <View style={styles.pendingBadge}>
                <Clock size={14} color="#f59e0b" />
                <Text style={styles.pendingText}>Pending</Text>
              </View>
              <TouchableOpacity style={styles.actionButton}>
                <Eye size={16} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Download size={16} color="#2563eb" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

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
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  documentsList: {
    gap: 12,
  },
  mockDocuments: {
    gap: 12,
  },
  mockTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
    textAlign: 'center',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  documentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentType: {
    fontSize: 12,
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
  documentSeparator: {
    fontSize: 12,
    color: '#94a3b8',
    marginHorizontal: 6,
  },
  documentDate: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  documentSize: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  signedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});