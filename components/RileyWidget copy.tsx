import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Bot } from 'lucide-react-native';
import { RileyChatModal } from './RileyChatModal';
import { useAuth } from '@/hooks/useAuth';

interface RileyWidgetProps {
  style?: any;
  contextData?: {
    customerId?: string;
    moveId?: string;
    jobId?: string;
    jobNumber?: string;
    jobStatus?: string;
    moveDate?: string;
    fromAddress?: string;
    toAddress?: string;
    fobData?: any;
    checklistData?: any;
  };
  size?: 'small' | 'medium' | 'large';
}

export const RileyWidget: React.FC<RileyWidgetProps> = ({
  style,
  contextData,
  size = 'medium',
}) => {
  const { user } = useAuth();
  const [showRiley, setShowRiley] = useState(false);

  const getUserRole = (): 'customer' | 'admin' | 'family_partner' => {
    if (!user || !user.email) return 'customer';

    // Role-based hint only — the server decides real permissions from the auth token.
    const email = user.email.toLowerCase();
    if (email.endsWith('@inandoutmovin.com') || email.includes('@admin.com')) {
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
        accessibilityLabel="Talk with Riley"
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
    backgroundColor: '#00783C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
