// Analytics and SEO utilities for In&OutMovin app

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl?: string;
}

export const analyticsService = {
  // Track user events
  trackEvent: async (event: AnalyticsEvent) => {
    try {
      // In production, integrate with Google Analytics, Mixpanel, or similar
      console.log('Analytics Event:', {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      });

      // Store in local analytics table for admin dashboard
      // await supabase.from('analytics_events').insert(event);
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  },

  // Track page views
  trackPageView: async (pageName: string, userId?: string) => {
    await analyticsService.trackEvent({
      name: 'page_view',
      properties: { page: pageName },
      userId,
    });
  },

  // Track quote requests
  trackQuoteRequest: async (quoteData: any, userId?: string) => {
    await analyticsService.trackEvent({
      name: 'quote_requested',
      properties: {
        fromZip: quoteData.fromZip,
        toZip: quoteData.toZip,
        bedrooms: quoteData.bedrooms,
        estimatedCost: quoteData.estimatedCost,
      },
      userId,
    });
  },

  // Track AI booking usage
  trackAIBooking: async (analysisData: any, userId?: string) => {
    await analyticsService.trackEvent({
      name: 'ai_booking_completed',
      properties: {
        furnitureCount: analysisData.furnitureCount,
        boxesNeeded: analysisData.boxesNeeded,
        estimatedCost: analysisData.estimatedCost,
        mediaType: analysisData.mediaType,
      },
      userId,
    });
  },

  // Track Calendly bookings
  trackCalendlyBooking: async (consultationType: string, userId?: string) => {
    await analyticsService.trackEvent({
      name: 'consultation_booked',
      properties: { type: consultationType },
      userId,
    });
  },
};

export const seoService = {
  // Generate SEO metadata for different pages
  getPageMetadata: (pageName: string): SEOMetadata => {
    const baseMetadata = {
      title: 'IN&OUT Moving - Professional Moving Services',
      description: 'Professional moving services with AI-powered quotes, real-time tracking, and 24/7 support. Get your free estimate today!',
      keywords: ['moving services', 'professional movers', 'AI quotes', 'real-time tracking', 'moving company'],
      ogImage: 'https://images.pexels.com/photos/4246209/pexels-photo-4246209.jpeg',
    };

    switch (pageName) {
      case 'quote':
        return {
          ...baseMetadata,
          title: 'Get Your Moving Quote - IN&OUT Moving',
          description: 'Get instant AI-powered moving quotes with transparent pricing. No hidden fees, professional service guaranteed.',
          keywords: [...baseMetadata.keywords, 'moving quote', 'moving estimate', 'AI quote'],
        };
      
      case 'services':
        return {
          ...baseMetadata,
          title: 'Moving Services - IN&OUT Moving',
          description: 'Comprehensive moving services including residential, commercial, and long-distance moves. Fully insured and professional.',
          keywords: [...baseMetadata.keywords, 'residential moving', 'commercial moving', 'long distance moving'],
        };
      
      case 'tracking':
        return {
          ...baseMetadata,
          title: 'Track Your Move - IN&OUT Moving',
          description: 'Real-time GPS tracking for your move with live updates, ETA notifications, and team communication.',
          keywords: [...baseMetadata.keywords, 'move tracking', 'GPS tracking', 'real-time updates'],
        };
      
      default:
        return baseMetadata;
    }
  },

  // Generate structured data for search engines
  generateStructuredData: () => {
    return {
      '@context': 'https://schema.org',
      '@type': 'MovingCompany',
      name: 'IN&OUT Moving',
      description: 'Professional moving services with AI-powered quotes and real-time tracking',
      url: 'https://inoutmoving.com',
      telephone: '+1-555-123-MOVE',
      email: 'info@inoutmoving.com',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'US',
      },
      serviceArea: {
        '@type': 'GeoCircle',
        geoMidpoint: {
          '@type': 'GeoCoordinates',
          latitude: 40.7128,
          longitude: -74.0060,
        },
        geoRadius: '50 miles',
      },
      priceRange: '$165-$2000',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '150',
      },
    };
  },
};