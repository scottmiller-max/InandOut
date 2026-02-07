import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { User, Settings, LogOut, Mail, Phone, MapPin, Calendar, Shield, Bell } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { GlobalSignOutButton } from '@/components/GlobalSignOutButton';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { MovePreferencesCard } from '@/components/MovePreferencesCard';
import { DocumentsSection } from '@/components/DocumentsSection';
import { PaymentSection } from '@/components/PaymentSection';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { RileyWidget } from '@/components/RileyWidget';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { profileService } from '@/services/profileService';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEmailBanner, setShowEmailBanner] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfileData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const profile = await profileService.getProfileData(user.id);
      setProfileData(profile);
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <PageContainer scroll={false}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner message="Loading profile..." />
        </View>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer scroll={false}>
        <View style={styles.emptyContainer}>
          <User size={64} color="#cbd5e1" />
          <Text style={styles.emptyText}>Please sign in to view your profile</Text>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={styles.header}>
        <DateTimeDisplay />
        <GlobalSignOutButton compact />
      </View>

      {/* Email Verification Banner */}
      {showEmailBanner && (
        <View style={styles.emailBanner}>
          <Bell size={20} color="#f59e0b" />
          <Text style={styles.emailBannerText}>
            Please verify your email address to access all features
          </Text>
        </View>
      )}
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profileData?.avatarUrl ? (
              <Image source={{ uri: profileData.avatarUrl }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={48} color="#ffffff" />
              </View>
            )}
          </View>
          <Text style={styles.userName}>
            {profileData?.firstName || user.email?.split('@')[0] || 'User'}
            {profileData?.lastName ? ` ${profileData.lastName}` : ''}
          </Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {profileData?.phone && (
            <Text style={styles.userPhone}>{profileData.phone}</Text>
          )}
        </View>

        {/* Quick Info Cards */}
        <View style={styles.section}>
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Calendar size={24} color="#2563eb" />
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <MapPin size={24} color="#059669" />
              <Text style={styles.infoLabel}>Moves Completed</Text>
              <Text style={styles.infoValue}>{profileData?.totalMoves || 0}</Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Mail size={20} color="#2563eb" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{user.email}</Text>
              </View>
            </View>
            {profileData?.phone && (
              <View style={styles.contactItem}>
                <Phone size={20} color="#2563eb" />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Phone</Text>
                  <Text style={styles.contactValue}>{profileData.phone}</Text>
                </View>
              </View>
            )}
            {profileData?.address && (
              <View style={styles.contactItem}>
                <MapPin size={20} color="#2563eb" />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Address</Text>
                  <Text style={styles.contactValue}>{profileData.address}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Move Preferences */}
        <View style={styles.section}>
          <MovePreferencesCard />
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <DocumentsSection />
        </View>

        {/* Payment Information */}
        <View style={styles.section}>
          <PaymentSection outstandingBalance={profileData?.outstandingBalance || 0} />
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          <NotificationPreferences />
        </View>

        {/* Settings Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings & Security</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingsItem}>
              <Settings size={20} color="#64748b" />
              <Text style={styles.settingsText}>Account Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsItem}>
              <Shield size={20} color="#64748b" />
              <Text style={styles.settingsText}>Privacy & Security</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsItem}>
              <Bell size={20} color="#64748b" />
              <Text style={styles.settingsText}>Notification Preferences</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsItem} onPress={handleSignOut}>
              <LogOut size={20} color="#dc2626" />
              <Text style={[styles.settingsText, styles.signOutText]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.appVersion}>IN&OUT Moving v1.0.0</Text>
        </View>
      {/* Riley AI Assistant Widget */}
      <View style={styles.rileyContainer}>
        <RileyWidget size="medium" />
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginTop: 16,
    textAlign: 'center',
  },
  emailBanner: {
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  emailBannerText: {
    fontSize: 14,
    color: '#92400e',
    fontFamily: 'Inter-Medium',
    marginLeft: 12,
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactInfo: {
    marginLeft: 12,
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingsText: {
    fontSize: 16,
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
    marginLeft: 12,
  },
  signOutText: {
    color: '#dc2626',
  },
  appVersion: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  rileyContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
});
