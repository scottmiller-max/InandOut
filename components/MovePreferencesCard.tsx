import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, TextInput } from 'react-native';
import { Settings, Clock, Package, Warehouse, MessageSquare, Save } from 'lucide-react-native';
import { profileService, UserPreferences } from '@/services/profileService';
import { useAuth } from '@/hooks/useAuth';

interface MovePreferencesCardProps {
  style?: any;
}

export const MovePreferencesCard: React.FC<MovePreferencesCardProps> = ({ style }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const prefs = await profileService.getUserPreferences(user.id);
      setPreferences(prefs);
      setSpecialInstructions(prefs.movePreferences.specialInstructions || '');
    } catch (error) {
      console.error('Load preferences error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: string, value: any) => {
    if (!user || !preferences) return;

    const updatedPrefs = {
      ...preferences,
      movePreferences: {
        ...preferences.movePreferences,
        [key]: value,
      },
    };

    setPreferences(updatedPrefs);

    try {
      await profileService.updatePreferences(user.id, updatedPrefs);
    } catch (error) {
      console.error('Update preference error:', error);
      // Revert on error
      setPreferences(preferences);
    }
  };

  const saveSpecialInstructions = async () => {
    if (!user || !preferences) return;

    setSaving(true);
    try {
      await updatePreference('specialInstructions', specialInstructions);
    } catch (error) {
      console.error('Save instructions error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !preferences) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Settings size={20} color="#2563eb" />
        <Text style={styles.title}>Move Preferences</Text>
      </View>

      {/* Time Slot Preference */}
      <View style={styles.preferenceSection}>
        <Text style={styles.sectionTitle}>Preferred Time Slot</Text>
        <View style={styles.timeSlotOptions}>
          {['morning', 'afternoon', 'evening'].map((slot) => (
            <TouchableOpacity
              key={slot}
              style={[
                styles.timeSlotButton,
                preferences.movePreferences.preferredTimeSlot === slot && styles.timeSlotButtonActive,
              ]}
              onPress={() => updatePreference('preferredTimeSlot', slot)}
            >
              <Clock size={16} color={
                preferences.movePreferences.preferredTimeSlot === slot ? '#ffffff' : '#64748b'
              } />
              <Text style={[
                styles.timeSlotText,
                preferences.movePreferences.preferredTimeSlot === slot && styles.timeSlotTextActive,
              ]}>
                {slot.charAt(0).toUpperCase() + slot.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Service Preferences */}
      <View style={styles.preferenceSection}>
        <Text style={styles.sectionTitle}>Service Options</Text>
        
        <View style={styles.serviceOption}>
          <View style={styles.serviceOptionLeft}>
            <Package size={20} color="#2563eb" />
            <View style={styles.serviceOptionInfo}>
              <Text style={styles.serviceOptionTitle}>Professional Packing</Text>
              <Text style={styles.serviceOptionDescription}>
                Let our team pack your belongings safely
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.movePreferences.packingService}
            onValueChange={(value) => updatePreference('packingService', value)}
            trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
            thumbColor={preferences.movePreferences.packingService ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.serviceOption}>
          <View style={styles.serviceOptionLeft}>
            <Warehouse size={20} color="#2563eb" />
            <View style={styles.serviceOptionInfo}>
              <Text style={styles.serviceOptionTitle}>Storage Service</Text>
              <Text style={styles.serviceOptionDescription}>
                Temporary storage if needed during move
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.movePreferences.storageNeeded}
            onValueChange={(value) => updatePreference('storageNeeded', value)}
            trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
            thumbColor={preferences.movePreferences.storageNeeded ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Contact Method */}
      <View style={styles.preferenceSection}>
        <Text style={styles.sectionTitle}>Preferred Contact Method</Text>
        <View style={styles.contactOptions}>
          {[
            { key: 'email', label: 'Email', icon: '📧' },
            { key: 'phone', label: 'Phone', icon: '📞' },
            { key: 'text', label: 'Text', icon: '💬' },
          ].map((method) => (
            <TouchableOpacity
              key={method.key}
              style={[
                styles.contactButton,
                preferences.movePreferences.contactMethod === method.key && styles.contactButtonActive,
              ]}
              onPress={() => updatePreference('contactMethod', method.key)}
            >
              <Text style={styles.contactIcon}>{method.icon}</Text>
              <Text style={[
                styles.contactText,
                preferences.movePreferences.contactMethod === method.key && styles.contactTextActive,
              ]}>
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Special Instructions */}
      <View style={styles.preferenceSection}>
        <Text style={styles.sectionTitle}>Special Instructions</Text>
        <TextInput
          style={styles.instructionsInput}
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          placeholder="Any special requirements or instructions for your move..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSpecialInstructions}
          disabled={saving}
        >
          <Save size={16} color="#ffffff" />
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Instructions'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  preferenceSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  timeSlotOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  timeSlotButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  timeSlotButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  timeSlotTextActive: {
    color: '#ffffff',
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  serviceOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceOptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  serviceOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  serviceOptionDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  contactOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  contactButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  contactIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  contactTextActive: {
    color: '#ffffff',
  },
  instructionsInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    fontFamily: 'Inter-Regular',
    minHeight: 80,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
});