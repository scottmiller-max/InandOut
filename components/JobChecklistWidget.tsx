import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CircleCheck as CheckCircle, Circle, Clock, Package, Truck, MapPin } from 'lucide-react-native';
import { jobChecklistService, JobChecklist, ChecklistItem } from '@/services/jobChecklist';

interface JobChecklistWidgetProps {
  jobId: string;
  style?: any;
  compact?: boolean;
}

export const JobChecklistWidget: React.FC<JobChecklistWidgetProps> = ({ 
  jobId, 
  style, 
  compact = false 
}) => {
  const [checklist, setChecklist] = useState<JobChecklist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChecklist();
  }, [jobId]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      const data = await jobChecklistService.getJobChecklist(jobId);
      setChecklist(data);
    } catch (error) {
      console.error('Load checklist error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getItemIcon = (itemId: string, completed: boolean) => {
    const iconProps = { 
      size: compact ? 16 : 20, 
      color: completed ? '#10b981' : '#94a3b8' 
    };

    switch (itemId) {
      case 'paperwork':
      case 'packing_prep':
        return <Package {...iconProps} />;
      case 'loading_start':
      case 'loading_complete':
      case 'unloading_start':
      case 'unloading_complete':
        return <Truck {...iconProps} />;
      case 'departure':
      case 'arrival':
        return <MapPin {...iconProps} />;
      default:
        return completed ? <CheckCircle {...iconProps} /> : <Circle {...iconProps} />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#2563eb';
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading checklist...</Text>
      </View>
    );
  }

  if (!checklist) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>No checklist available</Text>
      </View>
    );
  }

  const completedCount = checklist.completedItems.length;
  const totalCount = checklist.checklistItems.length;
  const progressPercentage = checklist.progressPercentage;

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactTitle}>Move Progress</Text>
          <Text style={styles.compactProgress}>
            {completedCount}/{totalCount} completed
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${progressPercentage}%`,
                  backgroundColor: getProgressColor(progressPercentage)
                }
              ]} 
            />
          </View>
          <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Move Checklist</Text>
        <View style={styles.progressSummary}>
          <Text style={styles.progressText}>
            {completedCount} of {totalCount} completed
          </Text>
          <Text style={[styles.progressPercentage, { color: getProgressColor(progressPercentage) }]}>
            {progressPercentage}%
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${progressPercentage}%`,
                backgroundColor: getProgressColor(progressPercentage)
              }
            ]} 
          />
        </View>
      </View>

      {/* Checklist Items */}
      <ScrollView style={styles.checklistContainer} showsVerticalScrollIndicator={false}>
        {checklist.checklistItems
          .sort((a, b) => a.order - b.order)
          .map((item) => {
            const isCompleted = checklist.completedItems.includes(item.id);
            return (
              <View key={item.id} style={[styles.checklistItem, isCompleted && styles.completedItem]}>
                <View style={styles.itemLeft}>
                  <View style={styles.itemIcon}>
                    {getItemIcon(item.id, isCompleted)}
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemTitle, isCompleted && styles.completedText]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.itemDescription, isCompleted && styles.completedDescription]}>
                      {item.description}
                    </Text>
                    {isCompleted && item.completedAt && (
                      <Text style={styles.completedTime}>
                        Completed {new Date(item.completedAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Text>
                    )}
                  </View>
                </View>
                {isCompleted && (
                  <View style={styles.checkmark}>
                    <CheckCircle size={24} color="#10b981" />
                  </View>
                )}
              </View>
            );
          })}
      </ScrollView>

      {/* Footer */}
      {checklist.lastUpdatedBy && (
        <View style={styles.footer}>
          <Clock size={14} color="#64748b" />
          <Text style={styles.footerText}>
            Last updated by {checklist.lastUpdatedBy} • {new Date(checklist.updatedAt).toLocaleString()}
          </Text>
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
  compactContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  progressSummary: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  compactProgress: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  checklistContainer: {
    maxHeight: 400,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  completedItem: {
    opacity: 0.7,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  itemDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  completedDescription: {
    color: '#94a3b8',
  },
  completedTime: {
    fontSize: 12,
    color: '#10b981',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  checkmark: {
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginLeft: 6,
  },
});