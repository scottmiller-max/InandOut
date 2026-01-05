import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react-native';
import { PinchGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface PhotoLightboxProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
}

export default function PhotoLightbox({
  visible,
  imageUri,
  onClose,
}: PhotoLightboxProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pinchHandler = useAnimatedGestureHandler({
    onStart: () => {
      // Store initial values
    },
    onActive: (event) => {
      scale.value = Math.max(0.5, Math.min(event.scale, 3));
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
      } else if (scale.value > 2.5) {
        scale.value = withSpring(2.5);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const resetZoom = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const zoomIn = () => {
    scale.value = withSpring(Math.min(scale.value + 0.5, 3));
  };

  const zoomOut = () => {
    scale.value = withSpring(Math.max(scale.value - 0.5, 0.5));
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header Controls */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.controlButton} onPress={zoomOut}>
              <ZoomOut size={20} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={zoomIn}>
              <ZoomIn size={20} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={resetZoom}>
              <RotateCw size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Image Container */}
        <View style={styles.imageContainer}>
          <PinchGestureHandler onGestureEvent={pinchHandler}>
            <Animated.View style={[styles.imageWrapper, animatedStyle]}>
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="contain"
              />
            </Animated.View>
          </PinchGestureHandler>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <View style={styles.imageInfo}>
            <View style={styles.infoItem}>
              <View style={styles.infoDot} />
              <Text style={styles.infoText}>Pinch to zoom • Tap controls to adjust</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  imageInfo: {
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
  },
});