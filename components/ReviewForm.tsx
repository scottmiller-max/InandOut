import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, X, Send } from 'lucide-react-native';
import { crmService, CustomerReview } from '@/services/crm';

interface ReviewFormProps {
  visible: boolean;
  onClose: () => void;
  customerId: string;
  jobId: string;
  onSubmitSuccess: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  visible,
  onClose,
  customerId,
  jobId,
  onSubmitSuccess,
}) => {
  const [ratings, setRatings] = useState({
    overall: 0,
    communication: 0,
    professionalism: 0,
    service: 0,
    satisfaction: 0,
  });
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const ratingCategories = [
    { key: 'overall', label: 'Overall Rating' },
    { key: 'communication', label: 'Communication' },
    { key: 'professionalism', label: 'Professionalism' },
    { key: 'service', label: 'Service' },
    { key: 'satisfaction', label: 'Satisfaction' },
  ];

  const setRating = (category: string, rating: number) => {
    setRatings(prev => ({ ...prev, [category]: rating }));
  };

  const renderStarRating = (category: string, currentRating: number) => {
    return (
      <View style={styles.starContainer}>
        {Array.from({ length: 5 }, (_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setRating(category, index + 1)}
            style={styles.starButton}
          >
            <Star
              size={24}
              color={index < currentRating ? '#f59e0b' : '#e5e7eb'}
              fill={index < currentRating ? '#f59e0b' : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleSubmit = async () => {
    // Validate ratings
    const hasAllRatings = Object.values(ratings).every(rating => rating > 0);
    if (!hasAllRatings) {
      Alert.alert('Missing Ratings', 'Please provide ratings for all categories.');
      return;
    }

    setLoading(true);
    try {
      const reviewData: Omit<CustomerReview, 'id' | 'createdAt'> = {
        customerId,
        jobId,
        overallRating: ratings.overall,
        communicationRating: ratings.communication,
        professionalismRating: ratings.professionalism,
        serviceRating: ratings.service,
        satisfactionRating: ratings.satisfaction,
        customerComments: comments.trim() || undefined,
        reviewDate: new Date().toISOString(),
        isFeatured: ratings.overall >= 4, // Feature 4+ star reviews
      };

      await crmService.submitReview(reviewData);
      
      Alert.alert(
        'Review Submitted',
        'Thank you for your feedback! Your review helps us improve our service.',
        [{ text: 'OK', onPress: onSubmitSuccess }]
      );
      
      // Reset form
      setRatings({
        overall: 0,
        communication: 0,
        professionalism: 0,
        service: 0,
        satisfaction: 0,
      });
      setComments('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Rate Your Experience</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Help us improve by rating your moving experience
          </Text>

          {/* Rating Categories */}
          <View style={styles.ratingsContainer}>
            {ratingCategories.map((category) => (
              <View key={category.key} style={styles.ratingCategory}>
                <Text style={styles.categoryLabel}>{category.label}</Text>
                {renderStarRating(category.key, ratings[category.key as keyof typeof ratings])}
              </View>
            ))}
          </View>

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsLabel}>Additional Comments (Optional)</Text>
            <TextInput
              style={styles.commentsInput}
              value={comments}
              onChangeText={setComments}
              placeholder="Tell us about your experience..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Send size={20} color="#ffffff" />
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit Review'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  ratingsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ratingCategory: {
    marginBottom: 24,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  commentsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  commentsLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    fontFamily: 'Inter-Regular',
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
});