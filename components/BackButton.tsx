import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

interface BackButtonProps {
  onPress: () => void;
  color?: string;
  size?: number;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  onPress, 
  color = '#1e293b',
  size = 24 
}) => {
  return (
    <TouchableOpacity 
      style={[
        styles.backButton,
        Platform.OS === 'ios' ? styles.iosStyle : styles.androidStyle
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <ArrowLeft size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iosStyle: {
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  androidStyle: {
    elevation: 3,
  },
});