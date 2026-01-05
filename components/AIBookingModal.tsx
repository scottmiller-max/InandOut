import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Camera, Upload, Bot, CircleCheck as CheckCircle, CreditCard as Edit3, Plus, Minus, Star } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { adminNotificationService } from '@/services/adminNotifications';
import { WorkflowManager } from './WorkflowManager';
import { LoadingSpinner } from './LoadingSpinner';
import { consultationService } from '@/services/consultations';

interface AIBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onBookingComplete: (bookingData: any) => void;
  customerName: string;
  customerEmail: string;
}

interface DetectedItem {
  id: string;
  name: string;
  category: 'furniture' | 'boxes' | 'special';
  count: number;
  confidence: number;
  estimatedCost: number;
  editable: boolean;
}

interface AIAnalysis {
  detectedItems: DetectedItem[];
  totalBoxes: number;
  estimatedHours: number;
  baseCost: number;
  totalCost: number;
  confidence: number;
  reasoning: string[];
}

export const AIBookingModal: React.FC<AIBookingModalProps> = ({
  visible,
  onClose,
  onBookingComplete,
  customerName,
  customerEmail,
}) => {
  const [step, setStep] = useState<'capture' | 'analyzing' | 'results' | 'editing' | 'confirmation'>('capture');
  const [capturedMedia, setCapturedMedia] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [editedItems, setEditedItems] = useState<DetectedItem[]>([]);
  const [reasoning, setReasoning] = useState<string[]>([]);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      resetModal();
    }
  }, [visible]);

  const resetModal = () => {
    setStep('capture');
    setCapturedMedia([]);
    setShowCamera(false);
    setAnalysis(null);
    setEditedItems([]);
    setReasoning([]);
    setShowWorkflow(false);
    setAnalysisLoading(false);
  };

  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        return;
      }
    }
    setShowCamera(true);
  };

  const handleGalleryUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setCapturedMedia(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      Alert.alert('Upload Error', 'Failed to upload images. Please try again.');
    }
  };

  const startAIAnalysis = async () => {
    if (capturedMedia.length === 0) {
      Alert.alert('No Media', 'Please capture or upload at least one photo.');
      return;
    }

    setStep('analyzing');
    setAnalysisLoading(true);

    // Simulate AI analysis with enhanced reasoning
    const mockReasoning = [
      "Analyzing room layout and furniture placement...",
      "Detecting furniture items: sofa, dining table, chairs, dresser...",
      "Estimating box requirements based on visible belongings...",
      "Calculating special handling needs for fragile items...",
      "Factoring in room size and accessibility...",
      "Generating cost estimate based on detected items..."
    ];

    // Show reasoning steps progressively
    for (let i = 0; i < mockReasoning.length; i++) {
      setTimeout(() => {
        setReasoning(prev => [...prev, mockReasoning[i]]);
      }, i * 1500);
    }

    // Complete analysis after reasoning
    setTimeout(() => {
      const mockAnalysis: AIAnalysis = {
        detectedItems: [
          {
            id: '1',
            name: 'Living Room Sofa',
            category: 'furniture',
            count: 1,
            confidence: 92,
            estimatedCost: 150,
            editable: true,
          },
          {
            id: '2',
            name: 'Dining Table & Chairs',
            category: 'furniture',
            count: 1,
            confidence: 88,
            estimatedCost: 120,
            editable: true,
          },
          {
            id: '3',
            name: 'Medium Moving Boxes',
            category: 'boxes',
            count: 15,
            confidence: 85,
            estimatedCost: 75,
            editable: true,
          },
          {
            id: '4',
            name: 'Large Moving Boxes',
            category: 'boxes',
            count: 8,
            confidence: 80,
            estimatedCost: 60,
            editable: true,
          },
          {
            id: '5',
            name: 'Piano (Upright)',
            category: 'special',
            count: 1,
            confidence: 95,
            estimatedCost: 200,
            editable: true,
          },
        ],
        totalBoxes: 23,
        estimatedHours: 6,
        baseCost: 605,
        totalCost: 899,
        confidence: 87,
        reasoning: mockReasoning,
      };

      setAnalysis(mockAnalysis);
      setEditedItems(mockAnalysis.detectedItems);
      setStep('results');
      setAnalysisLoading(false);
    }, mockReasoning.length * 1500 + 1000);
  };

  const updateItemCount = (itemId: string, newCount: number) => {
    setEditedItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, count: Math.max(0, newCount) }
        : item
    ));
  };

  const removeItem = (itemId: string) => {
    setEditedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const addCustomItem = () => {
    const newItem: DetectedItem = {
      id: `custom-${Date.now()}`,
      name: 'Custom Item',
      category: 'furniture',
      count: 1,
      confidence: 100,
      estimatedCost: 50,
      editable: true,
    };
    setEditedItems(prev => [...prev, newItem]);
  };

  const calculateUpdatedCost = () => {
    return editedItems.reduce((total, item) => total + (item.estimatedCost * item.count), 0);
  };

  const handleCompleteBooking = async () => {
    const finalCost = calculateUpdatedCost();
    
    try {
      // Store consultation in Supabase with pending status
      const consultationData = {
        userId: 'temp-user-id', // Will be replaced with actual user ID
        consultationType: 'ai_photo' as const,
        customerName,
        customerEmail,
        customerPhone: '', // Add phone if available
        moveDetails: {
          fromAddress: '',
          toAddress: '',
          moveDate: '',
          homeSize: '',
        },
        analysisResults: {
          detectedItems: editedItems,
          totalCost: finalCost,
          confidence: analysis?.confidence || 87,
          reasoning: analysis?.reasoning || [],
        },
        estimatedCost: finalCost,
      };

      await consultationService.createConsultation(consultationData);

      const bookingData = {
        customerName,
        customerEmail,
        analysis: {
          ...analysis,
          detectedItems: editedItems,
          totalCost: finalCost,
        },
        detectedItems: editedItems,
        estimatedCost: finalCost,
      };

      // Send admin notification for Family Partner approval
      await adminNotificationService.sendAIBookingAlert(bookingData);
    } catch (error) {
      console.error('Store consultation error:', error);
    }

    setStep('confirmation');
    
    // Show workflow after brief delay
    setTimeout(() => {
      setShowWorkflow(true);
    }, 2000);
  };

  const renderConfidenceStars = (confidence: number) => {
    const stars = Math.round(confidence / 20); // Convert to 1-5 scale
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={12}
        color={index < stars ? '#f59e0b' : '#e5e7eb'}
        fill={index < stars ? '#f59e0b' : 'transparent'}
      />
    ));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Booking Assistant</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        {showCamera && permission?.granted && (
          <Modal visible={showCamera} animationType="slide">
            <CameraView style={styles.camera}>
              <View style={styles.cameraOverlay}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={async () => {
                    try {
                      // Camera capture implementation would go here
                      setShowCamera(false);
                      Alert.alert('Photo Captured', 'Photo added to analysis queue.');
                    } catch (error) {
                      Alert.alert('Capture Failed', 'Unable to take photo. Please try again.');
                    }
                  }}
                >
                  <Camera size={32} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelCameraButton}
                  onPress={() => setShowCamera(false)}
                >
                  <Text style={styles.cancelCameraText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          </Modal>
        )}

        {/* Content based on step */}
        {step === 'capture' && (
          <ScrollView style={styles.content}>
            <View style={styles.captureSection}>
              <Text style={styles.sectionTitle}>Capture Your Space</Text>
              <Text style={styles.sectionDescription}>
                Take photos or upload images of the rooms you're moving. Our AI will analyze your belongings and provide an accurate estimate.
              </Text>

              <View style={styles.captureOptions}>
                <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
                  <Camera size={24} color="#ffffff" />
                  <Text style={styles.captureButtonText}>Take Photos</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.uploadButton} onPress={handleGalleryUpload}>
                  <Upload size={24} color="#2563eb" />
                  <Text style={styles.uploadButtonText}>Upload from Gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Captured Media Preview */}
              {capturedMedia.length > 0 && (
                <View style={styles.mediaPreview}>
                  <Text style={styles.mediaTitle}>Captured Images ({capturedMedia.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.mediaGrid}>
                      {capturedMedia.map((uri, index) => (
                        <Image
                          key={index}
                          source={{ uri }}
                          style={styles.mediaThumbnail}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {capturedMedia.length > 0 && (
                <TouchableOpacity style={styles.analyzeButton} onPress={startAIAnalysis}>
                  <Bot size={20} color="#ffffff" />
                  <Text style={styles.analyzeButtonText}>Start AI Analysis</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}

        {step === 'analyzing' && (
          <View style={styles.analyzingContainer}>
            <LoadingSpinner message="AI is analyzing your space..." />
            <View style={styles.reasoningContainer}>
              <Text style={styles.reasoningTitle}>Analysis Progress</Text>
              {reasoning.map((step, index) => (
                <View key={index} style={styles.reasoningStep}>
                  <CheckCircle size={16} color="#10b981" />
                  <Text style={styles.reasoningText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 'results' && analysis && (
          <ScrollView style={styles.content}>
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>AI Analysis Results</Text>
              <View style={styles.confidenceCard}>
                <Text style={styles.confidenceTitle}>Analysis Confidence: {analysis.confidence}%</Text>
                <View style={styles.confidenceStars}>
                  {renderConfidenceStars(analysis.confidence)}
                </View>
              </View>

              <View style={styles.itemsList}>
                <Text style={styles.itemsTitle}>Detected Items</Text>
                {editedItems.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <View style={styles.itemConfidence}>
                        {renderConfidenceStars(item.confidence)}
                        <Text style={styles.confidenceText}>{item.confidence}%</Text>
                      </View>
                    </View>
                    
                    <View style={styles.itemControls}>
                      <View style={styles.countControls}>
                        <TouchableOpacity
                          style={styles.countButton}
                          onPress={() => updateItemCount(item.id, item.count - 1)}
                        >
                          <Minus size={16} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.countText}>{item.count}</Text>
                        <TouchableOpacity
                          style={styles.countButton}
                          onPress={() => updateItemCount(item.id, item.count + 1)}
                        >
                          <Plus size={16} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.itemCost}>
                        ${(item.estimatedCost * item.count).toLocaleString()}
                      </Text>
                      
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeItem(item.id)}
                      >
                        <X size={16} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.addItemButton} onPress={addCustomItem}>
                  <Plus size={16} color="#2563eb" />
                  <Text style={styles.addItemText}>Add Custom Item</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.costSummary}>
                <Text style={styles.costTitle}>Updated Estimate</Text>
                <Text style={styles.totalCost}>${calculateUpdatedCost().toLocaleString()}</Text>
                <Text style={styles.costNote}>
                  Final pricing may vary based on actual conditions
                </Text>
              </View>

              <TouchableOpacity style={styles.completeButton} onPress={handleCompleteBooking}>
                <CheckCircle size={20} color="#ffffff" />
                <Text style={styles.completeButtonText}>Complete AI Booking</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {step === 'confirmation' && (
          <View style={styles.confirmationContainer}>
            <CheckCircle size={64} color="#10b981" />
            <Text style={styles.confirmationTitle}>AI Booking Complete!</Text>
            <Text style={styles.confirmationMessage}>
              Your space analysis is complete. A Family Partner will review your booking and contact you within 24 hours.
            </Text>
            <View style={styles.confirmationDetails}>
              <Text style={styles.confirmationLabel}>Estimated Cost:</Text>
              <Text style={styles.confirmationValue}>${calculateUpdatedCost().toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Workflow Manager */}
        <WorkflowManager
          visible={showWorkflow}
          workflowType="ai_booking_to_move"
          onClose={() => setShowWorkflow(false)}
          onStepComplete={(stepId) => console.log('Step completed:', stepId)}
          onWorkflowComplete={() => {
            setShowWorkflow(false);
            onBookingComplete({
              analysis,
              editedItems,
              totalCost: calculateUpdatedCost(),
            });
          }}
        />
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
  captureSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  captureOptions: {
    gap: 16,
    marginBottom: 32,
  },
  captureButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  uploadButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  mediaPreview: {
    marginBottom: 24,
  },
  mediaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  analyzeButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100,
  },
  cancelCameraButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  cancelCameraText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reasoningContainer: {
    marginTop: 40,
    width: '100%',
    maxWidth: 400,
  },
  reasoningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
    textAlign: 'center',
  },
  reasoningStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
  },
  reasoningText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    marginLeft: 12,
    flex: 1,
  },
  resultsSection: {
    flex: 1,
  },
  confidenceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  confidenceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  confidenceStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemsList: {
    marginBottom: 24,
  },
  itemsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  itemConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginLeft: 6,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 4,
  },
  countButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  itemCost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'Inter-SemiBold',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addItemButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  costSummary: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  costTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  totalCost: {
    fontSize: 32,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  costNote: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  completeButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmationDetails: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  confirmationLabel: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  confirmationValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Inter-Bold',
  },
});