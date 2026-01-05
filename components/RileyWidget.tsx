import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Bot } from 'lucide-react-native';
import { RileyChatModal } from './RileyChatModal';
import { useAuth } from '@/hooks/useAuth';

interface RileyWidgetProps {
  style?: any;
  contextData?: {
    moveId?: string;
    jobId?: string;
    fobData?: any;
    checklistData?: any;
  };
  size?: 'small' | 'medium' | 'large';
}

export const RileyWidget: React.FC<RileyWidgetProps> = ({ 
  style, 
  contextData,
  size = 'medium' 
}) => {
  const { user } = useAuth();
  const [showRiley, setShowRiley] = useState(false);

  const getUserRole = () => {
    if (!user || !user.email) return 'customer';

    // Role-based permissions
    const email = user.email.toLowerCase();
    if (email.includes('@inoutmoving.com') || email.includes('@admin.com')) {
      return 'admin';
    }
    if (email.includes('@partner.com') || email.includes('@family.com')) {
      return 'family_partner';
    }
    return 'customer';
  };

  const getWidgetSize = () => {
    switch (size) {
      case 'small': return { width: 40, height: 40, borderRadius: 20 };
      case 'large': return { width: 60, height: 60, borderRadius: 30 };
      default: return { width: 50, height: 50, borderRadius: 25 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 30;
      default: return 24;
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.rileyButton, getWidgetSize(), style]}
        onPress={() => setShowRiley(true)}
      >
        <Bot size={getIconSize()} color="#ffffff" />
      </TouchableOpacity>

      <RileyChatModal
        visible={showRiley}
        onClose={() => setShowRiley(false)}
        userRole={getUserRole()}
        contextData={{
          userId: user?.id,
          ...contextData,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  rileyButton: {
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});