import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CircleCheck as CheckCircle, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';

export default function EmailVerifiedScreen() {
  const router = useRouter();

  useEffect(() => {
    // Handle email verification
    handleEmailVerification();
  }, []);

  const handleEmailVerification = async () => {
    try {
      // Get the current session to check if user is verified
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        return;
      }

      if (session?.user) {
        // User is verified and signed in
        console.log('Email verified successfully for user:', session.user.email);
      }
    } catch (error) {
      console.error('Email verification error:', error);
    }
  };

  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successIcon}>
          <CheckCircle size={64} color="#10b981" />
        </View>
        
        <Text style={styles.title}>Email Verified!</Text>
        <Text style={styles.description}>
          Your email has been successfully verified. You can now access all features of the IN&OUT Moving app.
        </Text>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue to App</Text>
          <ArrowRight size={16} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Welcome to IN&OUT Moving! 🚚
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 300,
  },
  continueButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 24,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});