import React from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PageContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  maxWidth?: number;
  noPadding?: boolean;
  style?: any;
  contentStyle?: any;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  scroll = true,
  maxWidth = 600,
  noPadding = false,
  style,
  contentStyle,
}) => {
  const content = (
    <View style={[styles.inner, { maxWidth }, !noPadding && styles.padded, contentStyle]}>
      {children}
    </View>
  );

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, style]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, style]}>
      <View style={styles.noScrollContent}>
        {content}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  noScrollContent: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
  },
  padded: {
    paddingHorizontal: 20,
  },
});
