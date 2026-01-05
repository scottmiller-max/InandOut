import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Camera, RotateCcw, X, CircleCheck as CheckCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LoadingSpinner } from './LoadingSpinner';

interface CameraCaptureProps {
  onCapture: (uri: string) => void;
  onCancel: () => void;
  maxPhotos?: number;
  capturedCount?: number;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  maxPhotos = 10,
  capturedCount = 0,
}) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showLoading, setShowLoading] = useState(false);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#64748b" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionMessage}>
            We need access to your camera to take photos for the AI analysis.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    setShowLoading(true);
    try {
      setIsCapturing(true);
      
      if (Platform.OS === 'web') {
        // Web fallback - use ImagePicker
        await handleGalleryFallback();
      } else {
        // Native camera capture
        await takePictureWithRetry();
      }
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Camera capture error:', error);
      handleCaptureError();
    } finally {
      setIsCapturing(false);
      setShowLoading(false);
    }
  };

  const takePictureWithRetry = async () => {
    const maxRetries = 3;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false,
        });

        if (photo?.uri) {
          onCapture(photo.uri);
          return;
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('Failed to capture photo after retries');
  };

  const handleCaptureError = () => {
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
      Alert.alert(
        'Capture Failed',
        `Unable to take photo (attempt ${retryCount + 1}/3). Try again or use gallery upload.`,
        [
          { text: 'Try Again', onPress: handleTakePhoto },
          { text: 'Use Gallery', onPress: handleGalleryFallback },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      Alert.alert(
        'Camera Error',
        'Camera capture failed multiple times. Please use gallery upload instead.',
        [
          { text: 'Use Gallery', onPress: handleGalleryFallback },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleGalleryFallback = async () => {
    setShowLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onCapture(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Upload Error', 'Failed to upload from gallery. Please try again.');
    } finally {
      setShowLoading(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const canTakeMore = capturedCount < maxPhotos;

  return (
    <View style={styles.container}>
      {showLoading && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner message="Processing photo..." />
        </View>
      )}
      <CameraView 
        style={styles.camera} 
        facing={facing}
        ref={cameraRef}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {capturedCount}/{maxPhotos} Photos
            </Text>
            <TouchableOpacity style={styles.headerButton} onPress={toggleCameraFacing}>
              <RotateCcw size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Capture clear photos of your rooms and belongings
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.galleryButton} onPress={handleGalleryFallback}>
              <Text style={styles.galleryButtonText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.captureButton,
                (!canTakeMore || isCapturing) && styles.captureButtonDisabled
              ]}
              onPress={handleTakePhoto}
              disabled={!canTakeMore || isCapturing}
            >
              {isCapturing ? (
                <View style={styles.capturingIndicator} />
              ) : (
                <Camera size={32} color="#ffffff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneButton} onPress={onCancel}>
              <CheckCircle size={24} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  instructions: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  galleryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  galleryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  captureButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  capturingIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dc2626',
  },
  doneButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Inter-SemiBold',
  },
  permissionText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});