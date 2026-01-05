import { useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

export const useNavigationHistory = () => {
  const [history, setHistory] = useState<string[]>([]);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const currentPath = '/' + segments.join('/');
    
    setHistory(prev => {
      // Don't add the same path twice in a row
      if (prev[prev.length - 1] === currentPath) {
        return prev;
      }
      
      // Keep only last 10 pages in history
      const newHistory = [...prev, currentPath];
      return newHistory.slice(-10);
    });
  }, [segments]);

  const goBack = () => {
    if (history.length > 1) {
      // Go to previous page (second to last in history)
      const previousPage = history[history.length - 2];
      router.push(previousPage as any);
    } else {
      // Default fallback to home
      router.push('/(tabs)');
    }
  };

  const canGoBack = history.length > 1;

  return {
    history,
    goBack,
    canGoBack,
  };
};