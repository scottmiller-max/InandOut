import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Check,
  Star,
  Crown,
  Shield,
  Truck,
  Users,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import {
  TIERS,
  FLAT_PACKAGES,
  CLUB_PLANS,
  CONTACT_PHONE,
  CONTACT_PHONE_TEL,
  type Tier,
  type ClubPlan,
} from '@/data/pricing';
import { startCheckout } from '@/lib/stripe';

type PriceMode = 'hourly' | 'flat';
type Billing = 'monthly' | 'yearly';

/** Where to send someone who taps "Join" while signed out. Change if your route differs. */
const AUTH_ROUTE = '/(tabs)';

export default function PricingScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<PriceMode>('hourly');
  const [sizeIndex, setSizeIndex] = useState(0); // index into FLAT_PACKAGES
  const [billing, setBilling] = useState<Billing>('yearly');
  const [busyPlan, setBusyPlan] = useState<ClubPlan['key'] | null>(null);

  const flatRow = FLAT_PACKAGES[sizeIndex];

  const openText = (message: string) => {
    const sep = Platform.OS === 'ios' ? '&' : '?';
    Linking.openURL(`sms:${CONTACT_PHONE_TEL}${sep}body=${encodeURIComponent(message)}`).catch(
      () => {}
    );
  };

  const chooseTier = (tier: Tier) => {
    // Phase A: route to the quote form with the tier preselected.
    router.push({ pathname: '/quote', params: { tier: tier.key } });
  };

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  /**
   * Phase B — real billing.
   * Sends the member to Stripe Checkout for the selected plan + billing period.
   * Falls back to the old "text us" flow if they aren't signed in or Stripe is
   * unreachable, so the button never dead-ends.
   */
  const joinClub = async (plan: ClubPlan) => {
    if (busyPlan) return;
    setBusyPlan(plan.key);
    try {
      const priceId = billing === 'monthly' ? plan.stripe.monthly : plan.stripe.yearly;
      const result = await startCheckout(priceId, 'subscription');

      if (result.ok) return; // Stripe Checkout has taken over.

      if (result.needsAuth) {
        notify(
          'Sign in to join',
          'Create a free account or sign in first — that way your membership is tied to your profile and your discount applies automatically.'
        );
        try {
          router.push(AUTH_ROUTE as any);
        } catch {
          /* route not present — the message above already told them what to do */
        }
        return;
      }

      notify('Checkout unavailable', `${result.error}\n\nWe'll text you instead.`);
      openText(
        `Hi In&Out — I'd like to join the Family Partner Club (${plan.name} plan, billed ${billing}). Can you set me up?`
      );
    } finally {
      setBusyPlan(null);
    }
  };

  const tierIcon = (key: Tier['key']) => {
    if (key === 'Standard') return <Truck size={22} color="#00783C" />;
    if (key === 'Deluxe') return <Shield size={22} color="#00783C" />;
    return <Crown size={22} color="#00783C" />;
  };

  const priceFor = (tier: Tier) => {
    if (mode === 'hourly') return `$${tier.hourly}`;
    return `$${(flatRow as any)[tier.key]}`;
  };
  const priceUnit = (tier: Tier) => (mode === 'hourly' ? '/hr' : ` · ${flatRow.size}`);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pricing & Membership</Text>
          <Text style={styles.subtitle}>
            Same trusted crew — you choose how much we handle. One flat, all-inclusive price, no
            hidden fees.
          </Text>
        </View>

        {/* ============ MOVING TIERS ============ */}
        <Text style={styles.sectionTitle}>Choose your moving service</Text>

        {/* Hourly / Flat toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'hourly' && styles.toggleBtnActive]}
            onPress={() => setMode('hourly')}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, mode === 'hourly' && styles.toggleTextActive]}>
              Hourly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'flat' && styles.toggleBtnActive]}
            onPress={() => setMode('flat')}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, mode === 'flat' && styles.toggleTextActive]}>
              By home size
            </Text>
          </TouchableOpacity>
        </View>

        {/* Home-size selector (only for flat) */}
        {mode === 'flat' && (
          <View style={styles.sizeRow}>
            {FLAT_PACKAGES.map((row, i) => (
              <TouchableOpacity
                key={row.size}
                style={[styles.sizePill, sizeIndex === i && styles.sizePillActive]}
                onPress={() => setSizeIndex(i)}
                activeOpacity={0.85}
              >
                <Text style={[styles.sizePillText, sizeIndex === i && styles.sizePillTextActive]}>
                  {row.size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tier cards */}
        {TIERS.map((tier) => (
          <View
            key={tier.key}
            style={[styles.tierCard, tier.popular && styles.tierCardPopular]}
          >
            {tier.popular && (
              <View style={styles.popularBadge}>
                <Star size={12} color="#ffffff" fill="#ffffff" />
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>
            )}

            <View style={styles.tierHead}>
              <View style={styles.tierIconWrap}>{tierIcon(tier.key)}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tierName}>{tier.key}</Text>
                <Text style={styles.tierTagline}>{tier.tagline}</Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.price}>{priceFor(tier)}</Text>
              <Text style={styles.priceUnit}>{priceUnit(tier)}</Text>
            </View>

            <Text style={styles.tierBlurb}>{tier.blurb}</Text>

            {tier.inheritsFrom && (
              <Text style={styles.inherits}>Everything in {tier.inheritsFrom}, plus:</Text>
            )}

            <View style={styles.featureList}>
              {tier.features.map((f) => (
                <View key={f} style={styles.featureItem}>
                  <View style={styles.checkWrap}>
                    <Check size={13} color="#00783C" strokeWidth={3} />
                  </View>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.cta, tier.popular ? styles.ctaSolid : styles.ctaOutline]}
              onPress={() => chooseTier(tier)}
              activeOpacity={0.9}
            >
              <Text style={[styles.ctaText, tier.popular ? styles.ctaTextSolid : styles.ctaTextOutline]}>
                Choose {tier.key}
              </Text>
              <ArrowRight
                size={16}
                color={tier.popular ? '#ffffff' : '#00783C'}
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          </View>
        ))}

        {/* ============ MEMBERSHIP ============ */}
        <View style={styles.clubHeader}>
          <View style={styles.clubBadge}>
            <Sparkles size={14} color="#00783C" />
            <Text style={styles.clubBadgeText}>MEMBERSHIP</Text>
          </View>
          <Text style={styles.sectionTitle}>In&Out Family Partner Club</Text>
          <Text style={styles.subtitle}>
            For the people who need us again and again — real savings, priority service, and one
            named person who knows your history.
          </Text>
        </View>

        {/* Monthly / Yearly toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, billing === 'monthly' && styles.toggleBtnActive]}
            onPress={() => setBilling('monthly')}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, billing === 'monthly' && styles.toggleTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, billing === 'yearly' && styles.toggleBtnActive]}
            onPress={() => setBilling('yearly')}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, billing === 'yearly' && styles.toggleTextActive]}>
              Yearly · save
            </Text>
          </TouchableOpacity>
        </View>

        {CLUB_PLANS.map((plan) => (
          <View
            key={plan.key}
            style={[styles.clubCard, plan.featured && styles.clubCardFeatured]}
          >
            <View style={styles.tierHead}>
              <View style={styles.tierIconWrap}>
                <Users size={22} color="#00783C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tierName}>{plan.name}</Text>
                <Text style={styles.tierTagline}>{plan.audience}</Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.price}>
                ${billing === 'monthly' ? plan.monthly : plan.yearly}
              </Text>
              <Text style={styles.priceUnit}>{billing === 'monthly' ? '/mo' : '/yr'}</Text>
            </View>

            <View style={styles.featureList}>
              {plan.perks.map((p) => (
                <View key={p} style={styles.featureItem}>
                  <View style={styles.checkWrap}>
                    <Check size={13} color="#00783C" strokeWidth={3} />
                  </View>
                  <Text style={styles.featureText}>{p}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.cta,
                plan.featured ? styles.ctaSolid : styles.ctaOutline,
                busyPlan !== null && busyPlan !== plan.key && styles.ctaDisabled,
              ]}
              onPress={() => joinClub(plan)}
              disabled={busyPlan !== null}
              activeOpacity={0.9}
            >
              {busyPlan === plan.key ? (
                <ActivityIndicator size="small" color={plan.featured ? '#ffffff' : '#00783C'} />
              ) : (
                <>
                  <Text
                    style={[
                      styles.ctaText,
                      plan.featured ? styles.ctaTextSolid : styles.ctaTextOutline,
                    ]}
                  >
                    Join — {plan.name}
                  </Text>
                  <ArrowRight
                    size={16}
                    color={plan.featured ? '#ffffff' : '#00783C'}
                    strokeWidth={2.5}
                  />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.taxNote}>
              Billed {billing === 'monthly' ? 'monthly' : 'yearly'} · cancel anytime · Hawaii GET
              added at checkout
            </Text>
          </View>
        ))}

        {/* Footer CTA */}
        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Not sure which fits?</Text>
          <Text style={styles.footerText}>
            Tell us about your move and we'll recommend the right option — free, no obligation.
          </Text>
          <TouchableOpacity
            style={[styles.cta, styles.ctaSolid, { marginTop: 14 }]}
            onPress={() => router.push('/quote')}
            activeOpacity={0.9}
          >
            <Text style={[styles.ctaText, styles.ctaTextSolid]}>Get my free quote</Text>
            <ArrowRight size={16} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.textLink}
            onPress={() =>
              openText(`Hi In&Out — I have a question about your pricing / the Family Partner Club.`)
            }
            activeOpacity={0.7}
          >
            <Text style={styles.textLinkText}>or text us at {CONTACT_PHONE}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f8f6' },
  scroll: { paddingHorizontal: 18, paddingBottom: 12 },

  header: { paddingTop: 12, paddingBottom: 8 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 26, color: '#16241d' },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#5b6b62',
    marginTop: 6,
    lineHeight: 20,
  },

  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 19,
    color: '#16241d',
    marginTop: 18,
    marginBottom: 12,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#e8f3ec',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#16241d',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  toggleText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#5b6b62' },
  toggleTextActive: { color: '#00783C' },

  // Home size pills
  sizeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  sizePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cfe6d8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  sizePillActive: { backgroundColor: '#00783C', borderColor: '#00783C' },
  sizePillText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#5b6b62' },
  sizePillTextActive: { color: '#ffffff' },

  // Tier card
  tierCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8e4',
  },
  tierCardPopular: {
    borderColor: '#00783C',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -11,
    right: 16,
    backgroundColor: '#00783C',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: '#ffffff', letterSpacing: 0.5 },

  tierHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tierIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e8f3ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierName: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: '#16241d' },
  tierTagline: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#8a988f', marginTop: 1 },

  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 },
  price: { fontFamily: 'Inter-SemiBold', fontSize: 32, color: '#00783C' },
  priceUnit: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#5b6b62',
    marginLeft: 4,
    marginBottom: 6,
  },

  tierBlurb: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    color: '#5b6b62',
    lineHeight: 19,
    marginTop: 8,
  },
  inherits: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#16241d',
    marginTop: 14,
    marginBottom: 2,
  },

  featureList: { marginTop: 12, gap: 9 },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  checkWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e8f3ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    color: '#243b30',
    lineHeight: 19,
  },

  // CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 18,
  },
  ctaSolid: { backgroundColor: '#00783C' },
  ctaOutline: { backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#00783C' },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: 15 },
  ctaTextSolid: { color: '#ffffff' },
  ctaTextOutline: { color: '#00783C' },
  ctaDisabled: { opacity: 0.45 },
  taxNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    color: '#8a988f',
    textAlign: 'center',
    marginTop: 8,
  },

  // Club
  clubHeader: { marginTop: 26 },
  clubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#e8f3ec',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  clubBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#00783C', letterSpacing: 0.5 },

  clubCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8e4',
  },
  clubCardFeatured: { borderColor: '#00783C', borderWidth: 2 },

  // Footer
  footerCard: {
    backgroundColor: '#16241d',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  footerTitle: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: '#ffffff' },
  footerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    color: '#cfe6d8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  textLink: { marginTop: 12, paddingVertical: 4 },
  textLinkText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#8a988f' },
});
