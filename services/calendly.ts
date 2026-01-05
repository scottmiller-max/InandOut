interface CalendlyEvent {
  uri: string;
  name: string;
  start_time: string;
  end_time: string;
  event_type: string;
  location?: {
    type: string;
    location?: string;
  };
  invitees_counter: {
    total: number;
    active: number;
    limit: number;
  };
}

interface CalendlyEventType {
  uri: string;
  name: string;
  active: boolean;
  slug: string;
  scheduling_url: string;
  duration: number;
  kind: string;
}

interface CalendlyAvailability {
  range: {
    start_time: string;
    end_time: string;
  };
  intervals: Array<{
    start_time: string;
    end_time: string;
  }>;
}

class CalendlyService {
  private apiKey: string;
  private baseUrl = 'https://api.calendly.com';

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_CALENDLY_API_KEY || '';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Calendly API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Calendly API request failed:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      return await this.makeRequest('/users/me');
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  async getEventTypes(userUri: string) {
    try {
      const response = await this.makeRequest(`/event_types?user=${encodeURIComponent(userUri)}`);
      return response.collection || [];
    } catch (error) {
      console.error('Failed to get event types:', error);
      return [];
    }
  }

  async getScheduledEvents(userUri: string, options: {
    minStartTime?: string;
    maxStartTime?: string;
    status?: string;
  } = {}) {
    try {
      const params = new URLSearchParams({
        user: userUri,
        ...options,
      });
      
      const response = await this.makeRequest(`/scheduled_events?${params}`);
      return response.collection || [];
    } catch (error) {
      console.error('Failed to get scheduled events:', error);
      return [];
    }
  }

  async getAvailability(eventTypeUri: string, startTime: string, endTime: string) {
    try {
      const params = new URLSearchParams({
        event_type: eventTypeUri,
        start_time: startTime,
        end_time: endTime,
      });

      const response = await this.makeRequest(`/user_availability_schedules?${params}`);
      return response.collection || [];
    } catch (error) {
      console.error('Failed to get availability:', error);
      return [];
    }
  }

  generateSchedulingUrl(eventTypeSlug: string, prefillData?: {
    name?: string;
    email?: string;
    customAnswers?: Record<string, string>;
  }) {
    const baseUrl = `https://calendly.com/your-username/${eventTypeSlug}`;
    
    if (!prefillData) {
      return baseUrl;
    }

    const params = new URLSearchParams();
    
    if (prefillData.name) {
      params.append('name', prefillData.name);
    }
    
    if (prefillData.email) {
      params.append('email', prefillData.email);
    }

    if (prefillData.customAnswers) {
      Object.entries(prefillData.customAnswers).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    return `${baseUrl}?${params.toString()}`;
  }

  // Mock data for development/fallback
  getMockEventTypes(): CalendlyEventType[] {
    return [
      {
        uri: 'https://api.calendly.com/event_types/mock-consultation',
        name: 'Moving Consultation',
        active: true,
        slug: 'moving-consultation',
        scheduling_url: 'https://calendly.com/inandout/moving-consultation',
        duration: 30,
        kind: 'solo',
      },
      {
        uri: 'https://api.calendly.com/event_types/mock-estimate',
        name: 'In-Home Estimate',
        active: true,
        slug: 'in-home-estimate',
        scheduling_url: 'https://calendly.com/inandout/in-home-estimate',
        duration: 60,
        kind: 'solo',
      },
    ];
  }

  getMockAvailableSlots(date: string): string[] {
    // Generate mock time slots for the given date
    const slots = [
      '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
      '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM',
      '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
      '4:00 PM', '4:30 PM'
    ];

    // Randomly remove some slots to simulate real availability
    return slots.filter(() => Math.random() > 0.3);
  }
}

export const calendlyService = new CalendlyService();
export type { CalendlyEvent, CalendlyEventType, CalendlyAvailability };