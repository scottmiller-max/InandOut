import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Calendar, Clock, Package, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Move } from '@/services/database';
import { JobChecklistWidget } from './JobChecklistWidget';
import { LiveFOBTracker } from './LiveFOBTracker';

interface ActiveJobTrackerProps {
  move: Move;
  style?: any;
}

export const ActiveJobTracker: React.FC<ActiveJobTrackerProps> = ({ move, style }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#2563eb';
      case 'in_progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#dc2626';
      default: return '#64748b';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.moveIcon}>
            <Package size={20} color="#2563eb" />
          </View>
          <View style={styles.moveInfo}>
            <Text style={styles.moveTitle}>Active Move</Text>
            <Text style={styles.moveNumber}>{move.moveNumber}</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(move.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(move.status) }]}>
              {getStatusText(move.status)}
            </Text>
          </View>
          {expanded ? (
            <ChevronUp size={20} color="#64748b" />
          ) : (
            <ChevronDown size={20} color="#64748b" />
          )}
        </View>
      </TouchableOpacity>

      {/* Move Details */}
      <View style={styles.moveDetails}>
        <View style={styles.routeContainer}>
          <View style={styles.routeItem}>
            <View style={[styles.routeDot, styles.originDot]} />
            <Text style={styles.routeText} numberOfLines={1}>{move.fromAddress}</Text>
          </View>
          <View style={styles.routeArrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>
          <View style={styles.routeItem}>
            <View style={[styles.routeDot, styles.destinationDot]} />
            <Text style={styles.routeText} numberOfLines={1}>{move.toAddress}</Text>
          </View>
        </View>

        <View style={styles.scheduleInfo}>
          <View style={styles.scheduleItem}>
            <Calendar size={16} color="#64748b" />
            <Text style={styles.scheduleText}>{formatDate(move.moveDate)}</Text>
          </View>
          {move.estimatedCost && (
            <View style={styles.scheduleItem}>
              <Text style={styles.costText}>
                ${move.estimatedCost.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Progress Overview */}
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>Move Progress</Text>
            <View style={styles.progressBar}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${move.progressPercentage}%`,
                      backgroundColor: getStatusColor(move.status)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressPercentage}>{move.progressPercentage}%</Text>
            </View>
          </View>

          {/* Job Checklist */}
          <JobChecklistWidget 
            jobId={move.id} 
            style={styles.checklistWidget}
            compact={true}
          />

          {/* FOB Tracker */}
          {move.status === 'in_progress' && (
            <LiveFOBTracker 
              jobId={move.id}
              style={styles.fobTracker}
            />
          )}

          {/* Team Info */}
          {(move.driverName || move.truckNumber) && (
            <View style={styles.teamSection}>
              <Text style={styles.teamTitle}>Your Moving Team</Text>
              <View style={styles.teamInfo}>
                {move.driverName && (
                  <Text style={styles.teamText}>Driver: {move.driverName}</Text>
                )}
                {move.truckNumber && (
                  <Text style={styles.teamText}>Truck: #{move.truckNumber}</Text>
                )}
                {move.teamId && (
                  <Text style={styles.teamText}>Team ID: {move.teamId}</Text>
                )}
              </View>
            </View>
          )}

          {/* Notes */}
          {move.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>Special Instructions</Text>
              <Text style={styles.notesText}>{move.notes}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moveIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moveInfo: {
    flex: 1,
  },
  moveTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  moveNumber: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textTransform: 'capitalize',
  },
  moveDetails: {
    padding: 20,
    paddingTop: 0,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  originDot: {
    backgroundColor: '#10b981',
  },
  destinationDot: {
    backgroundColor: '#2563eb',
  },
  routeText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  routeArrow: {
    marginHorizontal: 12,
  },
  arrowText: {
    fontSize: 16,
    color: '#64748b',
  },
  scheduleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginLeft: 6,
  },
  costText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'Inter-SemiBold',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 20,
    paddingTop: 16,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    minWidth: 40,
  },
  checklistWidget: {
    marginBottom: 20,
  },
  fobTracker: {
    marginBottom: 20,
  },
  teamSection: {
    marginBottom: 20,
  },
  teamTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  teamInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  teamText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  notesSection: {
    marginBottom: 0,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
});