import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Video, VideoOff, Phone, PhoneOff } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';

interface VideoConsultationProps {
  onStartCall: () => void;
  onEndCall: () => void;
  isCallActive: boolean;
}

export const VideoConsultation: React.FC<VideoConsultationProps> = ({
  onStartCall,
  onEndCall,
  isCallActive,
}) => {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleStartCall = () => {
    startVideoConsultation();
  };

  const startVideoConsultation = async () => {
    try {
      // Create Google Meet link or use existing meeting room
      const meetUrl = "https://meet.google.com/new"; // Replace with API-created Meet link
      await WebBrowser.openBrowserAsync(meetUrl);
      onStartCall();
    } catch (error) {
      Alert.alert('Error', 'Unable to start video consultation. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {isCallActive && isVideoEnabled ? (
        <CameraView style={styles.camera} facing={facing}>
          <View style={styles.overlay}>
            <Text style={styles.callStatus}>Video Consultation Active</Text>
            <View style={styles.controls}>
              <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
                {isVideoEnabled ? (
                  <Video size={24} color="#ffffff" />
                ) : (
                  <VideoOff size={24} color="#ffffff" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
                <Text style={styles.controlText}>Flip</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={onEndCall}>
                <PhoneOff size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      ) : (
        <View style={styles.preCallContainer}>
          <Text style={styles.title}>Video Consultation</Text>
          <Text style={styles.description}>
            Connect with our moving experts for a virtual walkthrough of your home. 
            Get the most accurate quote by showing us your items and space.
          </Text>
          
          <View style={styles.features}>
            <Text style={styles.featureItem}>• Real-time consultation with experts</Text>
            <Text style={styles.featureItem}>• More accurate than AI estimates</Text>
            <Text style={styles.featureItem}>• Personalized moving advice</Text>
            <Text style={styles.featureItem}>• Instant quote adjustments</Text>
          </View>

          {!isCallActive ? (
            <TouchableOpacity style={styles.startCallButton} onPress={handleStartCall}>
              <Phone size={20} color="#ffffff" />
              <Text style={styles.startCallText}>Start Video Consultation</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.startCallButton, styles.endCallButton]} onPress={onEndCall}>
              <PhoneOff size={20} color="#ffffff" />
              <Text style={styles.startCallText}>End Call</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
    padding: 20,
  },
  callStatus: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 40,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  endCallButton: {
    backgroundColor: '#dc2626',
  },
  preCallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  features: {
    marginBottom: 32,
  },
  featureItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  startCallButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  startCallText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#ffffff',
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});