import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Calendar, Clock, ChevronDown, ChevronUp, Plus } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { PendingJobsList } from './PendingJobsList';

interface ScheduleDropdownProps {
  style?: any;
}

export const ScheduleDropdown: React.FC<ScheduleDropdownProps> = ({ style }) => {
  const { user, isAuthenticated } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showJobsList, setShowJobsList] = useState(false);
  const [upcomingMoves, setUpcomingMoves] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUpcomingMoves();
    }
  }, [isAuthenticated]);

  const loadUpcomingMoves = () => {
    // Mock upcoming moves - replace with actual service call
    const mockMoves = [
      {
        id: '1',
        moveNumber: 'MV-2024-001',
        fromAddress: '123 Oak Street',
        toAddress: '456 Pine Avenue',
        moveDate: '2024-03-25',
        timeSlot: '8:00 AM - 10:00 AM',
        status: 'scheduled',
        estimatedCost: 899,
      },
      {
        id: '2',
        moveNumber: 'MV-2024-002',
        fromAddress: '789 Maple Drive',
        toAddress: '321 Cedar Lane',
        moveDate: '2024-03-28',
        timeSlot: '10:00 AM - 12:00 PM',
        status: 'in_progress',
        estimatedCost: 650,
      },
    ];
    setUpcomingMoves(mockMoves);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getNextMove = () => {
    const now = new Date();
    return upcomingMoves
      .filter(move => new Date(move.moveDate) >= now)
      .sort((a, b) => new Date(a.moveDate).getTime() - new Date(b.moveDate).getTime())[0];
  };

  const nextMove = getNextMove();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.scheduleButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.scheduleButtonLeft}>
          <Calendar size={20} color="#2563eb" />
          <View style={styles.scheduleInfo}>
            <Text style={styles.scheduleTitle}>Schedule</Text>
            {nextMove ? (
              <Text style={styles.nextMoveText}>
                Next: {formatDate(nextMove.moveDate)}
              </Text>
            ) : (
              <Text style={styles.noMovesText}>No upcoming moves</Text>
            )}
          </View>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color="#64748b" />
        ) : (
          <ChevronDown size={20} color="#64748b" />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.dropdownContent}>
          {upcomingMoves.length === 0 ? (
            <View style={styles.emptySchedule}>
              <Calendar size={32} color="#94a3b8" />
              <Text style={styles.emptyText}>No scheduled moves</Text>
              <TouchableOpacity style={styles.addMoveButton}>
                <Plus size={16} color="#2563eb" />
                <Text style={styles.addMoveText}>Schedule New Move</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.movesList} showsVerticalScrollIndicator={false}>
              {upcomingMoves.map((move) => (
                <View key={move.id} style={styles.moveItem}>
                  <View style={styles.moveHeader}>
                    <Text style={styles.moveNumber}>{move.moveNumber}</Text>
                    <View style={[styles.moveStatus, 
                      move.status === 'scheduled' ? styles.scheduledStatus :
                      move.status === 'in_progress' ? styles.inProgressStatus :
                      styles.completedStatus
                    ]}>
                      <Text style={styles.moveStatusText}>{move.status}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.moveDate}>
                    {formatDate(move.moveDate)} • {move.timeSlot}
                  </Text>
                  
                  <View style={styles.moveRoute}>
                    <Text style={styles.routeText} numberOfLines={1}>
                      {move.fromAddress} → {move.toAddress}
                    </Text>
                  </View>
                  
                  <Text style={styles.moveCost}>
                    ${move.estimatedCost.toLocaleString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
          
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => setShowJobsList(true)}
          >
            <Text style={styles.viewAllText}>View All Jobs</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Jobs List Modal */}
      <Modal
        visible={showJobsList}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Jobs</Text>
            <TouchableOpacity onPress={() => setShowJobsList(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <PendingJobsList onJobSelect={() => setShowJobsList(false)} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  scheduleButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduleButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scheduleInfo: {
    marginLeft: 12,
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  nextMoveText: {
    fontSize: 12,
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
  },
  noMovesText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  dropdownContent: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
    maxHeight: 300,
  },
  emptySchedule: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
    marginBottom: 16,
  },
  addMoveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addMoveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
  movesList: {
    maxHeight: 200,
    padding: 16,
  },
  moveItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  moveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  moveNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  moveStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduledStatus: {
    backgroundColor: '#dbeafe',
  },
  inProgressStatus: {
    backgroundColor: '#fef3c7',
  },
  completedStatus: {
    backgroundColor: '#d1fae5',
  },
  moveStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter-SemiBold',
    textTransform: 'capitalize',
  },
  moveDate: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  moveRoute: {
    marginBottom: 6,
  },
  routeText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'Inter-Regular',
  },
  moveCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'Inter-SemiBold',
  },
  viewAllButton: {
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
  },
});