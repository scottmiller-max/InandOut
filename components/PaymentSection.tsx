import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CreditCard, DollarSign, TriangleAlert as AlertTriangle, Plus, CircleCheck as CheckCircle } from 'lucide-react-native';
import { profileService } from '@/services/profileService';
import { useAuth } from '@/hooks/useAuth';

interface PaymentSectionProps {
  outstandingBalance: number;
  style?: any;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({ outstandingBalance, style }) => {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddPaymentMethod = () => {
    Alert.alert(
      'Add Payment Method',
      'This will integrate with Stripe for secure payment processing.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => console.log('Stripe integration needed') },
      ]
    );
  };

  const handlePayBalance = () => {
    Alert.alert(
      'Pay Outstanding Balance',
      `Pay $${outstandingBalance.toFixed(2)} now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay Now', onPress: () => console.log('Process payment') },
      ]
    );
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Payments & Billing</Text>

      {/* Outstanding Balance */}
      {outstandingBalance > 0 && (
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <AlertTriangle size={20} color="#f59e0b" />
            <Text style={styles.balanceTitle}>Outstanding Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>
            ${outstandingBalance.toFixed(2)}
          </Text>
          <Text style={styles.balanceDescription}>
            Deposit required to confirm your move
          </Text>
          <TouchableOpacity style={styles.payButton} onPress={handlePayBalance}>
            <DollarSign size={16} color="#ffffff" />
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment Methods */}
      <View style={styles.paymentMethodsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPaymentMethod}>
            <Plus size={16} color="#2563eb" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Mock Payment Methods */}
        <View style={styles.paymentMethodsList}>
          <View style={styles.paymentMethodItem}>
            <View style={styles.paymentMethodLeft}>
              <View style={styles.cardIcon}>
                <CreditCard size={20} color="#2563eb" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardNumber}>•••• •••• •••• 4242</Text>
                <Text style={styles.cardDetails}>Visa • Expires 12/26</Text>
              </View>
            </View>
            <View style={styles.defaultBadge}>
              <CheckCircle size={14} color="#10b981" />
              <Text style={styles.defaultText}>Default</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.addPaymentMethod} onPress={handleAddPaymentMethod}>
            <Plus size={20} color="#64748b" />
            <Text style={styles.addPaymentText}>Add Payment Method</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment History */}
      <View style={styles.paymentHistorySection}>
        <Text style={styles.sectionTitle}>Recent Payments</Text>
        
        <View style={styles.paymentHistoryList}>
          <View style={styles.paymentHistoryItem}>
            <View style={styles.paymentHistoryLeft}>
              <Text style={styles.paymentDescription}>Move #2024-001 Deposit</Text>
              <Text style={styles.paymentDate}>March 20, 2024</Text>
            </View>
            <Text style={styles.paymentAmount}>$299.00</Text>
          </View>

          <View style={styles.paymentHistoryItem}>
            <View style={styles.paymentHistoryLeft}>
              <Text style={styles.paymentDescription}>Move #2023-012 Final Payment</Text>
              <Text style={styles.paymentDate}>November 15, 2023</Text>
            </View>
            <Text style={styles.paymentAmount}>$1,200.00</Text>
          </View>
        </View>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#92400e',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  balanceDescription: {
    fontSize: 14,
    color: '#92400e',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  payButton: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  paymentMethodsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  paymentMethodsList: {
    gap: 12,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  cardDetails: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  addPaymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  addPaymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  paymentHistorySection: {
    marginBottom: 0,
  },
  paymentHistoryList: {
    gap: 12,
  },
  paymentHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  paymentHistoryLeft: {
    flex: 1,
  },
  paymentDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'Inter-SemiBold',
  },
});