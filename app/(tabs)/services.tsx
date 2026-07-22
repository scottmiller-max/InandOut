import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { PageContainer } from '@/components/PageContainer';
import { Chrome as Home, Package, Truck, MapPin, Shield, Clock, Star, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ServicesScreen() {
  const router = useRouter();

  const handleGetQuote = () => {
    router.push('/(tabs)/quote');
  };

  const handleGoHome = () => {
    router.push('/(tabs)');
  };

  return (
    <PageContainer>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Home size={20} color="#2563eb" />
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Our Services</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={require('@/assets/images/crew-carry.jpg')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Professional Moving Services</Text>
            <Text style={styles.heroSubtitle}>
              Comprehensive moving solutions tailored to your needs
            </Text>
          </View>
        </View>

        {/* Services Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Moving Services</Text>
          
          <View style={styles.servicesGrid}>
            <View style={styles.serviceCard}>
              <View style={styles.serviceIcon}>
                <Home size={32} color="#2563eb" />
              </View>
              <Text style={styles.serviceTitle}>Residential Moving</Text>
              <Text style={styles.serviceDescription}>
                Complete home relocation services with professional packing, loading, and setup at your new home.
              </Text>
              <View style={styles.serviceFeatures}>
                <Text style={styles.featureItem}>• Professional packing</Text>
                <Text style={styles.featureItem}>• Furniture disassembly/assembly</Text>
                <Text style={styles.featureItem}>• Fragile item protection</Text>
                <Text style={styles.featureItem}>• Same-day service available</Text>
              </View>
            </View>
            
            <View style={styles.serviceCard}>
              <View style={styles.serviceIcon}>
                <Truck size={32} color="#2563eb" />
              </View>
              <Text style={styles.serviceTitle}>Commercial Moving</Text>
              <Text style={styles.serviceDescription}>
                Office and business relocations with minimal downtime and specialized equipment handling.
              </Text>
              <View style={styles.serviceFeatures}>
                <Text style={styles.featureItem}>• Weekend/after-hours service</Text>
                <Text style={styles.featureItem}>• IT equipment handling</Text>
                <Text style={styles.featureItem}>• Minimal business disruption</Text>
                <Text style={styles.featureItem}>• Project management</Text>
              </View>
            </View>
            
            <View style={styles.serviceCard}>
              <View style={styles.serviceIcon}>
                <MapPin size={32} color="#2563eb" />
              </View>
              <Text style={styles.serviceTitle}>Long Distance Moving</Text>
              <Text style={styles.serviceDescription}>
                Cross-country and interstate moves with tracking, insurance, and dedicated support teams.
              </Text>
              <View style={styles.serviceFeatures}>
                <Text style={styles.featureItem}>• GPS tracking</Text>
                <Text style={styles.featureItem}>• Climate-controlled trucks</Text>
                <Text style={styles.featureItem}>• Dedicated move coordinator</Text>
                <Text style={styles.featureItem}>• Storage options available</Text>
              </View>
            </View>
            
            <View style={styles.serviceCard}>
              <View style={styles.serviceIcon}>
                <Package size={32} color="#2563eb" />
              </View>
              <Text style={styles.serviceTitle}>Loading & Unloading</Text>
              <Text style={styles.serviceDescription}>
                Expert loading and unloading services for both residential and commercial moves with trained professionals.
              </Text>
              <View style={styles.serviceFeatures}>
                <Text style={styles.featureItem}>• Hourly rate options</Text>
                <Text style={styles.featureItem}>• Professional equipment</Text>
                <Text style={styles.featureItem}>• Flexible scheduling</Text>
                <Text style={styles.featureItem}>• No minimum hours</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Why Choose Us */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose IN&OUT Moving?</Text>
          
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitCard}>
              <Shield size={24} color="#10b981" />
              <Text style={styles.benefitTitle}>Fully Insured</Text>
              <Text style={styles.benefitDescription}>
                Complete protection for your belongings with comprehensive insurance coverage.
              </Text>
            </View>
            
            <View style={styles.benefitCard}>
              <Clock size={24} color="#10b981" />
              <Text style={styles.benefitTitle}>On-Time Guarantee</Text>
              <Text style={styles.benefitDescription}>
                We guarantee punctual service with transparent scheduling and reliable execution.
              </Text>
            </View>
            
            <View style={styles.benefitCard}>
              <Star size={24} color="#10b981" />
              <Text style={styles.benefitTitle}>5-Star Service</Text>
              <Text style={styles.benefitDescription}>
                Consistently rated 5 stars by our customers for professionalism and care.
              </Text>
            </View>
            
            <View style={styles.benefitCard}>
              <MapPin size={24} color="#10b981" />
              <Text style={styles.benefitTitle}>Real-Time Tracking</Text>
              <Text style={styles.benefitDescription}>
                Track your move in real-time with GPS updates and live communication.
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing Section */}
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
            
            <TouchableOpacity style={styles.pricingButton} onPress={handleGetQuote}>
              <Text style={styles.pricingButtonText}>Get Your Quote</Text>
              <ArrowRight size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Testimonial */}
        <View style={styles.section}>
          <View style={styles.testimonialCard}>
            <Image
              source={require('@/assets/images/family-settled.jpg')}
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
              <Text style={styles.ctaButtonText}>Get Free Quote</Text>
              <ArrowRight size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
  },
  placeholder: {
    width: 80,
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
  servicesGrid: {
    gap: 16,
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  serviceFeatures: {
    gap: 6,
  },
  featureItem: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitCard: {
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
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  benefitDescription: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 16,
  },
  pricingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  pricingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  pricingSubtitle: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 24,
  },
  pricingFeatures: {
    gap: 12,
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  pricingFeature: {
    fontSize: 16,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  pricingButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  pricingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
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
});