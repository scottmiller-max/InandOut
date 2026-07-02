import React, { useEffect, useRef, useCallback } from 'react';
import { Text, View, StyleSheet, Animated, Dimensions, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Truck } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const truckPosition = useRef(new Animated.Value(-200)).current;
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
        toValue: width + 200,
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
          <Image
            source={require('@/assets/images/inout-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.companyTagline}>FAMILY OWNED SINCE 2012</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.truckContainer,
            { transform: [{ translateX: truckPosition }, { scaleX: -1 }] }
          ]}
        >
          <View style={styles.animatedTruck}>
            <Truck size={64} color="#059669" strokeWidth={2} />
          </View>
        </Animated.View>

        <View style={styles.bottomContent}>
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
  logoImage: {
    width: 280,
    height: 200,
    marginBottom: 20,
  },
  companyTagline: {
    fontSize: 16,
    fontWeight: "600",
    color: '#059669',
    letterSpacing: 4,
    marginTop: 4,
  },
  truckContainer: {
    position: 'absolute',
    top: height / 2 + 40,
    left: -200,
  },
  animatedTruck: {
    padding: 8,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 270,
    alignItems: 'center',
  },
  tapText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});