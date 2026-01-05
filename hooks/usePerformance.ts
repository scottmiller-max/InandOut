import { useEffect, useCallback, useRef } from 'react';
import { Platform, InteractionManager } from 'react-native';

export const usePerformance = () => {
  const interactionHandle = useRef<any>(null);

  // Defer expensive operations until after interactions
  const runAfterInteractions = useCallback((callback: () => void) => {
    if (Platform.OS === 'web') {
      // Use requestIdleCallback on web if available
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(callback);
      } else {
        setTimeout(callback, 0);
      }
    } else {
      // Use InteractionManager on native
      InteractionManager.runAfterInteractions(callback);
    }
  }, []);

  // Optimize component mounting
  const optimizeMount = useCallback(() => {
    if (Platform.OS !== 'web') {
      interactionHandle.current = InteractionManager.createInteractionHandle();
    }
  }, []);

  // Clean up optimization handle
  const cleanupMount = useCallback(() => {
    if (interactionHandle.current) {
      InteractionManager.clearInteractionHandle(interactionHandle.current);
      interactionHandle.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanupMount;
  }, [cleanupMount]);

  return {
    runAfterInteractions,
    optimizeMount,
    cleanupMount,
  };
};

// Hook for debouncing expensive operations
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for optimizing list rendering
export const useListOptimization = (data: any[], pageSize: number = 20) => {
  const [visibleData, setVisibleData] = useState(data.slice(0, pageSize));
  const [currentPage, setCurrentPage] = useState(1);

  const loadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    const startIndex = (nextPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    setVisibleData(prev => [...prev, ...data.slice(startIndex, endIndex)]);
    setCurrentPage(nextPage);
  }, [data, currentPage, pageSize]);

  const hasMore = visibleData.length < data.length;

  useEffect(() => {
    setVisibleData(data.slice(0, pageSize));
    setCurrentPage(1);
  }, [data, pageSize]);

  return {
    visibleData,
    loadMore,
    hasMore,
  };
};