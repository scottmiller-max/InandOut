import React, { useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const truckPosition = useRef(new Animated.Value(width + 100)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Auto-start animation after 2 seconds
    const timer = setTimeout(() => {
      startTruckAnimation();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const startTruckAnimation = () => {
    // Animate truck moving across screen from right to left
    Animated.sequence([
      Animated.timing(truckPosition, {
        toValue: -200,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate to auth flow after animation completes
      router.replace('/(tabs)');
    });
  };

  const handleTapToStart = () => {
    startTruckAnimation();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity style={styles.touchArea} onPress={handleTapToStart} activeOpacity={1}>
        <Text style={styles.title}>IN&OUT Moving — it works! 🚚</Text>
        
        <Animated.View 
          style={[
            styles.truckContainer,
            {
              transform: [{ translateX: truckPosition }]
            }
          ]}
        >
          <Text style={styles.truck}>🚚</Text>
        </Animated.View>
        
        <Text style={styles.tapText}>Tap anywhere to start your move</Text>
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
  title: { 
    fontSize: 28, 
    fontWeight: "700", 
    marginBottom: 40,
    color: '#1e293b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  truckContainer: {
    position: 'absolute',
    top: height / 2 - 20,
    right: -100,
  },
  truck: {
    fontSize: 60,
  },
  tapText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 60,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});