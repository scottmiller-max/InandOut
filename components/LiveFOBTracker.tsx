import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Truck, Battery, Signal, Navigation, Clock } from 'lucide-react-native';
import { enhancedFobService, LiveTruckStatus } from '@/services/enhancedFob';

interface LiveFOBTrackerProps {
  jobId: string;
  style?: any;
}

export const LiveFOBTracker: React.FC<LiveFOBTrackerProps> = ({ jobId, style }) => {
  const [truckStatus, setTruckStatus] = useState<LiveTruckStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadTruckStatus();
    
    // Subscribe to real-time updates
    const subscription = enhancedFobService.subscribeToFOBUpdates(jobId, (update) => {
      // Update truck status when new FOB data comes in
      loadTruckStatus();
      setLastUpdate(new Date());
    });

    // Refresh every 30 seconds
    const interval = setInterval(loadTruckStatus, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [jobId]);

  const loadTruckStatus = async () => {
    try {
      const status = await enhancedFobService.getLiveTruckStatus(jobId);
      setTruckStatus(status);
    } catch (error) {
      console.error('Load truck status error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return '#64748b';
      case 'en_route': return '#2563eb';
      case 'at_pickup': return '#f59e0b';
      case 'loading': return '#f59e0b';
      case 'in_transit': return '#2563eb';
      case 'at_delivery': return '#f59e0b';
      case 'unloading': return '#f59e0b';
      case 'completed': return '#10b981';
      default: return '#64748b';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return '#10b981';
    if (level > 20) return '#f59e0b';
    return '#dc2626';
  };

  const getSignalColor = (strength: number) => {
    if (strength > 70) return '#10b981';
    if (strength > 40) return '#f59e0b';
    return '#dc2626';
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <Truck size={24} color="#64748b" />
          <Text style={styles.loadingText}>Connecting to truck...</Text>
        </View>
      </View>
    );
  }

  if (!truckStatus) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.offlineContainer}>
          <Truck size={24} color="#94a3b8" />
          <Text style={styles.offlineText}>Truck tracking not available</Text>
          <Text style={styles.offlineSubtext}>FOB device not yet activated</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Truck size={20} color="#2563eb" />
          <Text style={styles.headerTitle}>Live Truck Tracking</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadTruckStatus}>
          <Navigation size={16} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Status */}
      <View style={styles.statusSection}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(truckStatus.status) }]} />
          <Text style={styles.statusText}>{getStatusText(truckStatus.status)}</Text>
        </View>
        <Text style={styles.truckInfo}>Truck #{truckStatus.truckId} • FOB #{truckStatus.fobId}</Text>
      </View>

      {/* Location & ETA */}
      <View style={styles.locationSection}>
        <View style={styles.locationItem}>
          <MapPin size={16} color="#64748b" />
          <Text style={styles.locationText}>
            {truckStatus.currentLocation.address || 
             `${truckStatus.currentLocation.latitude.toFixed(4)}, ${truckStatus.currentLocation.longitude.toFixed(4)}`}
          </Text>
        </View>
        {truckStatus.eta && (
          <View style={styles.locationItem}>
            <Clock size={16} color="#2563eb" />
            <Text style={styles.etaText}>ETA: {truckStatus.eta}</Text>
          </View>
        )}
      </View>

      {/* Device Status */}
      <View style={styles.deviceStatus}>
        <View style={styles.deviceItem}>
          <Battery size={16} color={getBatteryColor(truckStatus.batteryLevel)} />
          <Text style={[styles.deviceText, { color: getBatteryColor(truckStatus.batteryLevel) }]}>
            {truckStatus.batteryLevel}%
          </Text>
        </View>
        <View style={styles.deviceItem}>
          <Signal size={16} color="#64748b" />
          <Text style={styles.deviceText}>
            {Math.round(truckStatus.speed)} mph
          </Text>
        </View>
        <View style={styles.deviceItem}>
          <Clock size={16} color="#64748b" />
          <Text style={styles.deviceText}>
            {formatLastUpdate(new Date(truckStatus.lastUpdate))}
          </Text>
        </View>
      </View>
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginTop: 8,
  },
  offlineContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  offlineText: {
    fontSize: 16,
    color: '#94a3b8',
    fontFamily: 'Inter-Medium',
    marginTop: 8,
  },
  offlineSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSection: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  truckInfo: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  locationSection: {
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
    flex: 1,
  },
  etaText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  deviceStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  compactProgressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactProgressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  compactProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  compactProgressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});