import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Navigation, Clock, Truck, Phone, MessageCircle } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { GlobalSignOutButton } from '@/components/GlobalSignOutButton';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { fobService } from '@/services/fob';
import { useState, useEffect } from 'react';
import { LiveFOBTracker } from '@/components/LiveFOBTracker';
import { JobChecklistWidget } from '@/components/JobChecklistWidget';
import { RileyWidget } from '@/components/RileyWidget';

const { width } = Dimensions.get('window');

export default function TrackScreen() {
  const { goBack, canGoBack } = useNavigationHistory();
  const [jobTracking, setJobTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrackingData();
  }, []);

  const loadTrackingData = async () => {
    try {
      // Mock job ID - in production, get from route params or user context
      const mockJobId = 'job-123';
      const trackingData = await fobService.getJobTracking(mockJobId);
      setJobTracking(trackingData);
    } catch (error) {
      console.error('Load tracking data error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {canGoBack && <BackButton onPress={goBack} />}
            <DateTimeDisplay />
            <GlobalSignOutButton compact />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Live Tracking</Text>
            <TouchableOpacity style={styles.refreshButton}>
              <Navigation size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Map Placeholder */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <LiveFOBTracker jobId="mock-job-id" />
          </View>
        </View>

        {/* Live Updates - Moved directly beneath map */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Updates</Text>
          <LiveFOBTracker 
            jobId="mock-job-id"
            style={styles.liveTracker}
          />
        </View>

        {/* Truck Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Move Progress</Text>
          <JobChecklistWidget 
            jobId="mock-job-id" 
            style={styles.checklistWidget}
          />
        </View>

        {/* Route & Truck Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Details</Text>
          <View style={styles.statusCard}>
            {/* Route Information */}
            <View style={styles.routeItem}>
              <View style={styles.routeIcon}>
                <View style={[styles.routeDot, styles.originDot]} />
              </View>
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>Origin</Text>
                <Text style={styles.routeAddress}>123 Oak Street, New York, NY 10001</Text>
                <Text style={styles.routeTime}>Departure: 10:00 AM</Text>
              </View>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.routeItem}>
              <View style={styles.routeIcon}>
                <View style={[styles.routeDot, styles.destinationDot]} />
              </View>
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>Destination</Text>
                <Text style={styles.routeAddress}>456 Pine Avenue, Brooklyn, NY 11201</Text>
                <Text style={styles.routeTime}>
                  {jobTracking ? `ETA: ${new Date(jobTracking.estimatedArrival).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : 'ETA: 2:45 PM'}
                </Text>
              </View>
            </View>

            {/* Driver Info */}
            <View style={styles.driverSection}>
              <Text style={styles.driverTitle}>Your Moving Team</Text>
              <View style={styles.driverInfo}>
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>
                    {jobTracking ? `Driver: ${jobTracking.driverName}` : 'Driver: Mike Rodriguez'}
                  </Text>
                  <Text style={styles.truckNumber}>
                    {jobTracking ? `Truck #${jobTracking.truckId}` : 'Truck #247'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.messageButton}>
                  <MessageCircle size={18} color="#2563eb" />
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Trip Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>15.2</Text>
              <Text style={styles.statLabel}>Miles Traveled</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>3.8</Text>
              <Text style={styles.statLabel}>Miles Remaining</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>35</Text>
              <Text style={styles.statLabel}>Avg Speed (mph)</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>2</Text>
              <Text style={styles.statLabel}>Stops Made</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Riley AI Assistant Widget */}
      <View style={styles.rileyContainer}>
        <RileyWidget 
          contextData={{
            jobTracking,
            fobData: jobTracking,
            checklistData: jobTracking,
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  mapPlaceholder: {
    minHeight: 200,
  },
  liveTracker: {
    marginBottom: 0,
  },
  mapText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  checklistWidget: {
    marginBottom: 0,
  },
  messageButton: {
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'center',
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeIcon: {
    marginRight: 16,
    marginTop: 4,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  originDot: {
    backgroundColor: '#10b981',
  },
  destinationDot: {
    backgroundColor: '#2563eb',
  },
  routeLine: {
    width: 2,
    height: 32,
    backgroundColor: '#e2e8f0',
    marginLeft: 6,
    marginVertical: 8,
  },
  routeDetails: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  routeAddress: {
    fontSize: 16,
    color: '#1e293b',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  routeTime: {
    fontSize: 14,
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
  },
  driverSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  driverTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  truckNumber: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  updatesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  updateItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  updateTime: {
    marginRight: 16,
    minWidth: 60,
  },
  updateTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  updateContent: {
    flex: 1,
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  updateDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  rileyContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
});