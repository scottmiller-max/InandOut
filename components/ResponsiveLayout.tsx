import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  style?: any;
  enableSafeArea?: boolean;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  style,
  enableSafeArea = true,
}) => {
  const insets = useSafeAreaInsets();

  const getResponsiveStyles = () => {
    const isTablet = width >= 768;
    const isLandscape = width > height;
    
    return {
      paddingTop: enableSafeArea ? insets.top : 0,
      paddingBottom: enableSafeArea ? insets.bottom : 0,
      paddingLeft: isTablet ? Math.max(insets.left, 40) : insets.left,
      paddingRight: isTablet ? Math.max(insets.right, 40) : insets.right,
      maxWidth: isTablet ? 1200 : '100%',
      alignSelf: isTablet ? 'center' : 'stretch',
    };
  };

  return (
    <View style={[styles.container, getResponsiveStyles(), style]}>
      {children}
    </View>
  );
};

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  style?: any;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = 2,
  gap = 12,
  style,
}) => {
  const getGridStyles = () => {
    const isTablet = width >= 768;
    const actualColumns = isTablet ? Math.min(columns * 2, 4) : columns;
    
    return {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap,
      justifyContent: 'space-between' as const,
    };
  };

  const getItemStyles = () => {
    const isTablet = width >= 768;
    const actualColumns = isTablet ? Math.min(columns * 2, 4) : columns;
    const itemWidth = (width - (gap * (actualColumns + 1))) / actualColumns;
    
    return {
      width: itemWidth,
      minWidth: isTablet ? 250 : 150,
    };
  };

  return (
    <View style={[getGridStyles(), style]}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={getItemStyles()}>
          {child}
        </View>
      ))}
    </View>
  );
};

// Responsive text component
interface ResponsiveTextProps {
  children: React.ReactNode;
  variant?: 'title' | 'subtitle' | 'body' | 'caption';
  style?: any;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant = 'body',
  style,
}) => {
  const getTextStyles = () => {
    const isTablet = width >= 768;
    const scaleFactor = isTablet ? 1.2 : 1;
    
    const variants = {
      title: {
        fontSize: 24 * scaleFactor,
        fontWeight: '700' as const,
        fontFamily: 'Inter-Bold',
      },
      subtitle: {
        fontSize: 18 * scaleFactor,
        fontWeight: '600' as const,
        fontFamily: 'Inter-SemiBold',
      },
      body: {
        fontSize: 16 * scaleFactor,
        fontWeight: '400' as const,
        fontFamily: 'Inter-Regular',
      },
      caption: {
        fontSize: 14 * scaleFactor,
        fontWeight: '400' as const,
        fontFamily: 'Inter-Regular',
      },
    };
    
    return variants[variant];
  };

  const Text = require('react-native').Text;
  
  return (
    <Text style={[getTextStyles(), style]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});