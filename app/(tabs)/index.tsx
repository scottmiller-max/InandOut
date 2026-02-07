import React, { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet, Animated, Dimensions, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageContainer } from '@/components/PageContainer';
import { useRouter } from 'expo-router';
import { Calculator, Video, Bot, Calendar, ArrowRight, Star, Truck, MapPin, Clock, Phone } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { AuthModals } from '@/components/AuthModals';
import { CountdownWidget } from '@/components/CountdownWidget';
import { MessagesPreview } from '@/components/MessagesPreview';
import { ScheduleDropdown } from '@/components/ScheduleDropdown';
import { ActiveJobTracker } from '@/components/ActiveJobTracker';
import { GlobalSignOutButton } from '@/components/GlobalSignOutButton';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { databaseService } from '@/services/database';
import { RileyWidget } from '@/components/RileyWidget';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [activeMove, setActiveMove] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const truckPosition = useRef(new Animated.Value(width + 100)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
    }
  }, [isAuthenticated, user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const moves = await databaseService.getUserMoves(user.id);
      const active = moves.find(move => 
        move.status === 'scheduled' || move.status === 'in_progress'
      );
      setActiveMove(active);
    } catch (error) {
      console.error('Load user data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetQuote = () => {
    if (isAuthenticated) {
      router.push('/(tabs)/quote');
    } else {
      setAuthMode('signup');
      setShowAuthModal(true);
    }
  };

  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const handleSwitchAuthMode = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
  };

  if (authLoading) {
    return (
      <PageContainer scroll={false}>
        <View style={styles.loadingContainer}>
          <Truck size={48} color="#2563eb" />
          <Text style={styles.loadingText}>Loading IN&OUT Moving...</Text>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <View style={styles.header}>
        <DateTimeDisplay />
        {isAuthenticated ? (
          <GlobalSignOutButton compact />
        ) : (
          <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            {isAuthenticated ? `Welcome back, ${user?.firstName}!` : 'Welcome to IN&OUT Moving'}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {isAuthenticated 
              ? 'Manage your moves and track progress'
              : 'Professional moving services with AI-powered quotes'
            }
          </Text>
        </View>

        {/* Hero Image */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/4246209/pexels-photo-4246209.jpeg' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Professional Moving Services</Text>
            <Text style={styles.heroSubtitle}>AI-powered quotes • Real-time tracking • 24/7 support</Text>
          </View>
        </View>

        {/* Authenticated User Dashboard */}
        {isAuthenticated && (
          <>
            {/* Schedule Widget */}
            <View style={styles.section}>
              <ScheduleDropdown />
            </View>

            {/* Active Move Tracker */}
            {activeMove && (
              <View style={styles.section}>
                <ActiveJobTracker move={activeMove} />
              </View>
            )}

            {/* Next Move Countdown */}
            {activeMove && (
              <View style={styles.section}>
                <CountdownWidget moveDate={activeMove.moveDate} />
              </View>
            )}

            {/* Messages Preview */}
            <View style={styles.section}>
              <MessagesPreview />
            </View>
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isAuthenticated ? 'Quick Actions' : 'Get Started'}
          </Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={handleGetQuote}>
              <Calculator size={32} color="#2563eb" />
              <Text style={styles.actionTitle}>Get Quote</Text>
              <Text style={styles.actionDescription}>
                AI-powered instant estimates
              </Text>
              <ArrowRight size={16} color="#2563eb" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/services')}>
              <Truck size={32} color="#059669" />
              <Text style={styles.actionTitle}>Our Services</Text>
              <Text style={styles.actionDescription}>
                Residential & commercial moving
              </Text>
              <ArrowRight size={16} color="#059669" />
            </TouchableOpacity>

            {isAuthenticated && (
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/track')}>
                <MapPin size={32} color="#f59e0b" />
                <Text style={styles.actionTitle}>Track Move</Text>
                <Text style={styles.actionDescription}>
                  Real-time GPS tracking
                </Text>
                <ArrowRight size={16} color="#f59e0b" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Features Showcase */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose IN&OUT Moving?</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <Bot size={24} color="#2563eb" />
              <Text style={styles.featureTitle}>AI-Powered Quotes</Text>
              <Text style={styles.featureDescription}>
                Get instant, accurate estimates using advanced AI technology
              </Text>
            </View>

            <View style={styles.featureCard}>
              <MapPin size={24} color="#2563eb" />
              <Text style={styles.featureTitle}>Real-Time Tracking</Text>
              <Text style={styles.featureDescription}>
                Track your moving truck with live GPS updates and ETA
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Video size={24} color="#2563eb" />
              <Text style={styles.featureTitle}>Video Consultations</Text>
              <Text style={styles.featureDescription}>
                Get personalized quotes through video calls with experts
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Star size={24} color="#2563eb" />
              <Text style={styles.featureTitle}>5-Star Service</Text>
              <Text style={styles.featureDescription}>
                Professional, insured team with excellent customer reviews
              </Text>
            </View>
          </View>
        </View>

        {/* Testimonial */}
        <View style={styles.section}>
          <View style={styles.testimonialCard}>
            <Image
              source={{ uri: 'https://images.pexels.com/photos/6195122/pexels-photo-6195122.jpeg' }}
              style={styles.testimonialImage}
              resizeMode="cover"
            />
            <View style={styles.testimonialOverlay}>
              <Text style={styles.testimonialText}>
                "IN&OUT Moving made our family's relocation completely stress-free. Professional, reliable, and caring service every step of the way."
              </Text>
              <Text style={styles.testimonialAuthor}>- Sarah & Mike Johnson</Text>
              <View style={styles.testimonialRating}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={16} color="#f59e0b" fill="#f59e0b" />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Call to Action */}
        <View style={styles.section}>
          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Ready to Move?</Text>
            <Text style={styles.ctaDescription}>
              Get started with your free quote today. Our team is ready to make your move seamless and stress-free.
            </Text>
            <TouchableOpacity style={styles.ctaButton} onPress={handleGetQuote}>
              <Text style={styles.ctaButtonText}>
                {isAuthenticated ? 'Get New Quote' : 'Get Free Quote'}
              </Text>
              <ArrowRight size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      {/* Riley AI Assistant Widget */}
      <View style={styles.rileyContainer}>
        <RileyWidget
          size="large"
          contextData={{
            moveId: activeMove?.id,
          }}
        />
      </View>

      {/* Auth Modals */}
      <AuthModals
        visible={showAuthModal}
        mode={authMode}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        onSwitchMode={handleSwitchAuthMode}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  signInButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signInText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  heroSection: {
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    height: 200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#e2e8f0',
    fontFamily: 'Inter-Regular',
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
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 16,
    marginBottom: 4,
    flex: 1,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginLeft: 16,
    flex: 1,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 16,
  },
  testimonialCard: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    height: 200,
  },
  testimonialImage: {
    width: '100%',
    height: '100%',
  },
  testimonialOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  testimonialText: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 12,
  },
  testimonialAuthor: {
    fontSize: 14,
    color: '#e2e8f0',
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  testimonialRating: {
    flexDirection: 'row',
    gap: 2,
  },
  ctaCard: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 16,
    color: '#dbeafe',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
  },
  rileyContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
});