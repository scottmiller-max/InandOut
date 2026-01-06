import React, { useEffect, useRef, useCallback } from 'react';
import { Text, View, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Truck } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const truckPosition = useRef(new Animated.Value(width + 100)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const onLayoutRootView = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      startTruckAnimation();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const startTruckAnimation = () => {
    Animated.sequence([
      Animated.timing(truckPosition, {
        toValue: -200,
        duration: 1800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.replace('/(tabs)');
    });
  };

  const handleTapToStart = () => {
    startTruckAnimation();
  };

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim }]}
      onLayout={onLayoutRootView}
    >
      <TouchableOpacity style={styles.touchArea} onPress={handleTapToStart} activeOpacity={1}>
        <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoIcon}>
            <Truck size={48} color="#ffffff" strokeWidth={2} />
          </View>
          <Text style={styles.companyName}>IN&OUT</Text>
          <Text style={styles.companyTagline}>MOVING</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.truckContainer,
            { transform: [{ translateX: truckPosition }] }
          ]}
        >
          <View style={styles.animatedTruck}>
            <Truck size={64} color="#059669" strokeWidth={2} />
          </View>
        </Animated.View>

        <View style={styles.bottomContent}>
          <Text style={styles.tagline}>Family Owned Since 2012</Text>
          <Text style={styles.tapText}>Tap anywhere to start your move</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#f8fafc',
  },
  touchArea: {
    flex: 1,
    width: '100%',
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoIcon: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  companyName: {
    fontSize: 42,
    fontWeight: "800",
    color: '#1e293b',
    letterSpacing: 2,
  },
  companyTagline: {
    fontSize: 18,
    fontWeight: "600",
    color: '#059669',
    letterSpacing: 8,
    marginTop: 4,
  },
  truckContainer: {
    position: 'absolute',
    top: height / 2 + 40,
    right: -100,
  },
  animatedTruck: {
    padding: 8,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 16,
    letterSpacing: 1,
  },
  tapText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});