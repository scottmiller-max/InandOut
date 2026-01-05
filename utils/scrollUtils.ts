import { Platform } from 'react-native';

export const scrollUtils = {
  // Scroll to top of page for web
  scrollToTop: () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  },

  // Scroll to top immediately (no animation)
  scrollToTopImmediate: () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  },

  // Scroll to element by ID
  scrollToElement: (elementId: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }
  },

  // Scroll with offset for fixed headers
  scrollToElementWithOffset: (elementId: string, offset: number = 80) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const element = document.getElementById(elementId);
      if (element) {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }
  },

  // Ensure page loads at top after navigation
  ensureTopPosition: () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
    }
  },
};