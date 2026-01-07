import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ActionButtonProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconColor?: string;
  iconSize?: number;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon: Icon,
  title,
  onPress,
  style,
  textStyle,
  iconColor = '#2563eb',
  iconSize = 20,
}) => {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Icon size={iconSize} color={iconColor} />
      <Text style={[styles.buttonText, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
});