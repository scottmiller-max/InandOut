import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calculator, MapPin, Calendar, Chrome as Home, Package, Truck, Bot, Video, ArrowRight, Star, DollarSign } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { AuthModals } from '@/components/AuthModals';
import { ChatbotModal } from '@/components/ChatbotModal';
import { AIBookingModal } from '@/components/AIBookingModal';
import { VideoConsultation } from '@/components/VideoConsultation';
import { GlobalSignOutButton } from '@/components/GlobalSignOutButton';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { movesService } from '@/services/moves';
import { calendlyService } from '@/services/calendly';
import { analyticsService } from '@/utils/analytics';
import { RileyWidget } from '@/components/RileyWidget';
import { consultationService } from '@/services/consultations';

export default function QuoteScreen() {
  const { user, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [showChatbot, setShowChatbot] = useState(false);
  const [showAIBooking, setShowAIBooking] = useState(false);
  const [showVideoConsultation, setShowVideoConsultation] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  
  // Form state
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [moveDate, setMoveDate] = useState('');
  const [homeSize, setHomeSize] = useState('');
  const [loading, setLoading] = useState(false);

  const homeSizes = [
    { value: 'studio', label: 'Studio', description: 'Studio apartment or single room' },
    { value: '1-room', label: '1 Room', description: 'Single bedroom or office' },
    { value: '2-rooms', label: '2 Rooms', description: 'Two bedrooms or small area' },
    { value: '3-rooms', label: '3 Rooms', description: 'Three bedrooms or medium area' },
    { value: '4-rooms', label: '4 Rooms', description: 'Four bedrooms or large area' },
    { value: '5+-rooms', label: '5+ Rooms', description: 'Five or more rooms/entire home' },
  ];

  const calculateQuote = () => {
    if (!fromAddress || !toAddress || !homeSize) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    const quote = movesService.calculateAIQuote(fromAddress, toAddress, homeSize, []);
    
    Alert.alert(
      'Estimated Quote',
      `Your estimated moving cost is $${quote.totalCost}.\n\nWould you like to get a more accurate quote?`,
      [
        { text: 'AI Analysis', onPress: handleAIBooking },
        { text: 'Video Consultation', onPress: handleVideoConsultation },
        { text: 'Maybe Later', style: 'cancel' },
      ]
    );
  };

  const handleAIBooking = () => {
    if (!isAuthenticated) {
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }
    setShowAIBooking(true);
  };

  const handleVideoConsultation = () => {
    if (!isAuthenticated) {
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }
    setShowVideoConsultation(true);
  };

  const handleSubmitQuote = async () => {
    if (!isAuthenticated) {
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }

    if (!user) return;

    try {
      setLoading(true);
      
      const quoteData = {
        userId: user.id,
        fromAddress,
        toAddress,
        moveDate,
        homeSize,
        specialItems: [],
        estimatedCost: movesService.calculateAIQuote(fromAddress, toAddress, homeSize, []).totalCost,
        quoteType: 'ai' as const,
      };

      await movesService.createQuote(quoteData);
      
      // Track analytics
      await analyticsService.trackQuoteRequest(quoteData, user.id);
      
      setShowChatbot(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit quote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const handleChatbotBookConsultation = () => {
    setShowChatbot(false);
    setShowVideoConsultation(true);
  };

  const handleAIBookingComplete = (bookingData: any) => {
    setShowAIBooking(false);
    
    // Store consultation results in Supabase
    if (user) {
      consultationService.createConsultation({
        userId: user.id,
        consultationType: 'ai_photo',
        customerName: `${user.firstName} ${user.lastName}`,
        customerEmail: user.email,
        customerPhone: user.phone,
        moveDetails: {
          fromAddress,
          toAddress,
          moveDate,
          homeSize,
        },
        analysisResults: bookingData.analysis,
        estimatedCost: bookingData.totalCost,
      });
    }
    
    Alert.alert(
      'AI Booking Complete',
      'Your space analysis is complete. A Family Partner will review and contact you within 24 hours.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <DateTimeDisplay />
        {isAuthenticated ? (
          <GlobalSignOutButton compact />
        ) : (
          <TouchableOpacity 
            style={styles.signInButton} 
            onPress={() => {
              setAuthMode('signin');
              setShowAuthModal(true);
            }}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/4246266/pexels-photo-4246266.jpeg' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Get Your Moving Quote</Text>
            <Text style={styles.heroSubtitle}>AI-powered estimates in seconds</Text>
          </View>
        </View>

        {/* Quote Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Moving Details</Text>
          
          <View style={styles.form}>
            {/* From Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>From Address *</Text>
              <View style={styles.inputContainer}>
                <MapPin size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  value={fromAddress}
                  onChangeText={setFromAddress}
                  placeholder="123 Current Street, City, State"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* To Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>To Address *</Text>
              <View style={styles.inputContainer}>
                <MapPin size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  value={toAddress}
                  onChangeText={setToAddress}
                  placeholder="456 New Street, City, State"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Move Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preferred Move Date *</Text>
              <View style={styles.inputContainer}>
                <Calendar size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  value={moveDate}
                  onChangeText={setMoveDate}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Home Size */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Home Size *</Text>
              <View style={styles.homeSizeGrid}>
                {homeSizes.map((size) => (
                  <TouchableOpacity
                    key={size.value}
                    style={[
                      styles.homeSizeButton,
                      homeSize === size.value && styles.homeSizeButtonActive,
                    ]}
                    onPress={() => setHomeSize(size.value)}
                  >
                    <Home size={20} color={homeSize === size.value ? '#ffffff' : '#64748b'} />
                    <Text style={[
                      styles.homeSizeText,
                      homeSize === size.value && styles.homeSizeTextActive,
                    ]}>
                      {size.label}
                    </Text>
                    <Text style={[
                      styles.homeSizeDescription,
                      homeSize === size.value && styles.homeSizeDescriptionActive,
                    ]}>
                      {size.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>
        </View>

        {/* Quote Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Your Quote</Text>
          
          <View style={styles.quoteOptions}>
            <TouchableOpacity style={styles.quoteOptionCard} onPress={calculateQuote}>
              <Calculator size={32} color="#2563eb" />
              <Text style={styles.quoteOptionTitle}>Instant AI Quote</Text>
              <Text style={styles.quoteOptionDescription}>
                Get an immediate estimate using our AI technology
              </Text>
              <View style={styles.quoteOptionFooter}>
                <Text style={styles.quoteOptionTime}>⚡ Instant</Text>
                <ArrowRight size={16} color="#2563eb" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quoteOptionCard} onPress={handleAIBooking}>
              <Bot size={32} color="#059669" />
              <Text style={styles.quoteOptionTitle}>AI Photo Analysis</Text>
              <Text style={styles.quoteOptionDescription}>
                Upload photos for detailed AI analysis of your belongings
              </Text>
              <View style={styles.quoteOptionFooter}>
                <Text style={styles.quoteOptionTime}>📸 5 minutes</Text>
                <ArrowRight size={16} color="#059669" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quoteOptionCard} onPress={handleVideoConsultation}>
              <Video size={32} color="#7c3aed" />
              <Text style={styles.quoteOptionTitle}>Video Consultation</Text>
              <Text style={styles.quoteOptionDescription}>
                Schedule a video call with our moving experts
              </Text>
              <View style={styles.quoteOptionFooter}>
                <Text style={styles.quoteOptionTime}>🎥 25 minutes</Text>
                <ArrowRight size={16} color="#7c3aed" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transparent Pricing</Text>
          
          <View style={styles.pricingCard}>
            <Text style={styles.pricingTitle}>Starting at $165/hour</Text>
            <Text style={styles.pricingSubtitle}>2 professional movers included</Text>
            
            <View style={styles.pricingFeatures}>
              <Text style={styles.pricingFeature}>✓ No hidden fees</Text>
              <Text style={styles.pricingFeature}>✓ Free estimates</Text>
              <Text style={styles.pricingFeature}>✓ Flexible scheduling</Text>
              <Text style={styles.pricingFeature}>✓ Professional equipment included</Text>
            </View>
          </View>
        </View>

        {/* Testimonial */}
        <View style={styles.section}>
          <View style={styles.testimonialCard}>
            <Image
              source={{ uri: 'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg' }}
              style={styles.testimonialImage}
              resizeMode="cover"
            />
            <View style={styles.testimonialOverlay}>
              <Text style={styles.testimonialText}>
                "The AI quote was incredibly accurate and saved us so much time. The team was professional and efficient."
              </Text>
              <Text style={styles.testimonialAuthor}>- Jennifer Martinez</Text>
              <View style={styles.testimonialRating}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={16} color="#f59e0b" fill="#f59e0b" />
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Auth Modals */}
      <AuthModals
        visible={showAuthModal}
        mode={authMode}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        onSwitchMode={setAuthMode}
      />

      {/* Chatbot Modal */}
      <ChatbotModal
        visible={showChatbot}
        onClose={() => setShowChatbot(false)}
        onBookConsultation={handleChatbotBookConsultation}
        userName={user?.firstName || 'there'}
      />

      {/* AI Booking Modal */}
      <AIBookingModal
        visible={showAIBooking}
        onClose={() => setShowAIBooking(false)}
        onBookingComplete={handleAIBookingComplete}
        customerName={user?.firstName + ' ' + user?.lastName || 'Customer'}
        customerEmail={user?.email || ''}
      />

      {/* Video Consultation Modal */}
      {showVideoConsultation && (
        <View style={styles.videoModal}>
          <VideoConsultation
            onStartCall={() => setIsVideoCallActive(true)}
            onEndCall={() => {
              setIsVideoCallActive(false);
              setShowVideoConsultation(false);
            }}
            isCallActive={isVideoCallActive}
          />
        </View>
      )}

      {/* Riley AI Assistant Widget */}
      <View style={styles.rileyContainer}>
        <RileyWidget />
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
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
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
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  inputDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  homeSizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  homeSizeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  homeSizeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  homeSizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginTop: 8,
    marginBottom: 4,
  },
  homeSizeTextActive: {
    color: '#ffffff',
  },
  homeSizeDescription: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  homeSizeDescriptionActive: {
    color: '#dbeafe',
  },
  quoteOptions: {
    gap: 16,
  },
  quoteOptionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quoteOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  quoteOptionDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  quoteOptionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  quoteOptionTime: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  pricingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pricingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  pricingSubtitle: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
  },
  pricingFeatures: {
    gap: 8,
    alignSelf: 'stretch',
  },
  pricingFeature: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
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
  videoModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  rileyContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
});