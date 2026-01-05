import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
  enableOptimizations?: boolean;
}

// Memoized wrapper for expensive components
export const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = memo(({
  children,
  enableOptimizations = true,
}) => {
  const optimizedStyles = useMemo(() => {
    if (!enableOptimizations) return {};
    
    return Platform.select({
      web: {
        // Web-specific optimizations
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        perspective: 1000,
      },
      default: {
        // Native optimizations
        shouldRasterizeIOS: true,
        renderToHardwareTextureAndroid: true,
      },
    });
  }, [enableOptimizations]);

  return (
    <View style={[styles.container, optimizedStyles]}>
      {children}
    </View>
  );
});

// Optimized image component with lazy loading
export const OptimizedImage = memo(({ source, style, ...props }: any) => {
  const Image = require('react-native').Image;
  
  return (
    <Image
      source={source}
      style={[style, styles.optimizedImage]}
      {...props}
      // Add performance props
      resizeMethod={Platform.OS === 'android' ? 'resize' : undefined}
      progressiveRenderingEnabled={true}
      fadeDuration={200}
    />
  );
});

// Optimized list item for large datasets
export const OptimizedListItem = memo(({ children, ...props }: any) => {
  return (
    <View style={styles.listItem} {...props}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  optimizedImage: {
    // Ensure images don't cause layout shifts
    backgroundColor: '#f3f4f6',
  },
  listItem: {
    // Optimize list rendering
    overflow: 'hidden',
  },
});

PerformanceOptimizer.displayName = 'PerformanceOptimizer';
OptimizedImage.displayName = 'OptimizedImage';
OptimizedListItem.displayName = 'OptimizedListItem';