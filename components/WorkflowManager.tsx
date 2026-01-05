import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, FileText, CreditCard, CircleCheck as CheckCircle, Clock, ArrowRight, X } from 'lucide-react-native';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  required: boolean;
  order: number;
}

interface WorkflowManagerProps {
  visible: boolean;
  onClose: () => void;
  workflowType: 'consultation_to_move' | 'ai_booking_to_move';
  onStepComplete: (stepId: string) => void;
  onWorkflowComplete: () => void;
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({
  visible,
  onClose,
  workflowType,
  onStepComplete,
  onWorkflowComplete,
}) => {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      initializeWorkflow();
    }
  }, [visible, workflowType]);

  const initializeWorkflow = () => {
    const workflowSteps: Record<string, WorkflowStep[]> = {
      consultation_to_move: [
        {
          id: 'consultation_confirmed',
          title: 'Consultation Confirmed',
          description: 'Your video consultation has been scheduled',
          status: 'completed',
          required: true,
          order: 1,
        },
        {
          id: 'move_date_selection',
          title: 'Select Move Date',
          description: 'Choose your preferred moving date (minimum 1 day notice)',
          status: 'pending',
          required: true,
          order: 2,
        },
        {
          id: 'document_review',
          title: 'Review Documents',
          description: 'Review and sign moving contract and insurance documents',
          status: 'pending',
          required: true,
          order: 3,
        },
        {
          id: 'deposit_payment',
          title: 'Deposit Payment',
          description: 'Secure your move with a deposit payment',
          status: 'pending',
          required: true,
          order: 4,
        },
      ],
      ai_booking_to_move: [
        {
          id: 'ai_analysis_complete',
          title: 'AI Analysis Complete',
          description: 'Your space has been analyzed and estimate generated',
          status: 'completed',
          required: true,
          order: 1,
        },
        {
          id: 'family_partner_approval',
          title: 'Family Partner Review',
          description: 'Awaiting approval from Family Partner for AI booking',
          status: 'in_progress',
          required: true,
          order: 2,
        },
        {
          id: 'account_creation',
          title: 'Create Account',
          description: 'Set up your IN&OUT Moving account',
          status: 'pending',
          required: true,
          order: 3,
        },
        {
          id: 'move_date_selection',
          title: 'Select Move Date',
          description: 'Choose your preferred moving date (minimum 1 day notice)',
          status: 'pending',
          required: true,
          order: 4,
        },
        {
          id: 'document_review',
          title: 'Review Documents',
          description: 'Review and sign moving contract and insurance documents',
          status: 'pending',
          required: true,
          order: 5,
        },
        {
          id: 'deposit_payment',
          title: 'Deposit Payment',
          description: 'Secure your move with a deposit payment',
          status: 'pending',
          required: true,
          order: 6,
        },
      ],
    };

    const workflowStepsArray = workflowSteps[workflowType] || [];
    setSteps(workflowStepsArray);
    
    // Set current step to first pending step
    const firstPending = workflowStepsArray.find(step => step.status === 'pending');
    setCurrentStep(firstPending?.id || null);
  };

  const completeStep = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status: 'completed' }
        : step
    ));

    // Move to next step
    const currentStepIndex = steps.findIndex(step => step.id === stepId);
    const nextStep = steps[currentStepIndex + 1];
    
    if (nextStep) {
      setCurrentStep(nextStep.id);
      // Update next step to in_progress if it was pending
      setSteps(prev => prev.map(step => 
        step.id === nextStep.id && step.status === 'pending'
          ? { ...step, status: 'in_progress' }
          : step
      ));
    } else {
      // Workflow complete
      setCurrentStep(null);
      onWorkflowComplete();
    }

    onStepComplete(stepId);
  };

  const getStepIcon = (step: WorkflowStep) => {
    const iconProps = { size: 20, color: getStepColor(step.status) };
    
    switch (step.id) {
      case 'consultation_confirmed':
      case 'ai_analysis_complete':
        return <CheckCircle {...iconProps} />;
      case 'move_date_selection':
        return <Calendar {...iconProps} />;
      case 'document_review':
        return <FileText {...iconProps} />;
      case 'deposit_payment':
        return <CreditCard {...iconProps} />;
      case 'account_creation':
        return <CheckCircle {...iconProps} />;
      case 'family_partner_approval':
        return <Clock {...iconProps} />;
      default:
        return <Clock {...iconProps} />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#f59e0b';
      case 'pending': return '#64748b';
      case 'skipped': return '#94a3b8';
      default: return '#64748b';
    }
  };

  const getStepAction = (step: WorkflowStep) => {
    if (step.status === 'completed') return null;
    if (step.id !== currentStep) return null;

    switch (step.id) {
      case 'move_date_selection':
        return (
          <TouchableOpacity 
            style={styles.stepActionButton}
            onPress={() => {
              Alert.alert(
                'Select Move Date',
                'This would open a date picker with 1-day minimum notice rule.',
                [
                  { text: 'Cancel' },
                  { text: 'Select Date', onPress: () => completeStep(step.id) }
                ]
              );
            }}
          >
            <Calendar size={16} color="#ffffff" />
            <Text style={styles.stepActionText}>Select Date</Text>
          </TouchableOpacity>
        );
      case 'document_review':
        return (
          <TouchableOpacity 
            style={styles.stepActionButton}
            onPress={() => {
              Alert.alert(
                'Review Documents',
                'This would open the document review and signing interface.',
                [
                  { text: 'Cancel' },
                  { text: 'Review', onPress: () => completeStep(step.id) }
                ]
              );
            }}
          >
            <FileText size={16} color="#ffffff" />
            <Text style={styles.stepActionText}>Review & Sign</Text>
          </TouchableOpacity>
        );
      case 'deposit_payment':
        return (
          <TouchableOpacity 
            style={styles.stepActionButton}
            onPress={() => {
              Alert.alert(
                'Deposit Payment',
                'This would open the secure payment interface.',
                [
                  { text: 'Cancel' },
                  { text: 'Pay Deposit', onPress: () => completeStep(step.id) }
                ]
              );
            }}
          >
            <CreditCard size={16} color="#ffffff" />
            <Text style={styles.stepActionText}>Pay Deposit</Text>
          </TouchableOpacity>
        );
      case 'account_creation':
        return (
          <TouchableOpacity 
            style={styles.stepActionButton}
            onPress={() => {
              Alert.alert(
                'Create Account',
                'This would open the account creation form.',
                [
                  { text: 'Cancel' },
                  { text: 'Create Account', onPress: () => completeStep(step.id) }
                ]
              );
            }}
          >
            <CheckCircle size={16} color="#ffffff" />
            <Text style={styles.stepActionText}>Create Account</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    return Math.round((completedSteps / steps.length) * 100);
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
          <Text style={styles.title}>Move Setup Workflow</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Setup Progress</Text>
            <Text style={styles.progressPercentage}>{getProgressPercentage()}%</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${getProgressPercentage()}%` }
              ]} 
            />
          </View>
        </View>

        {/* Steps */}
        <ScrollView style={styles.stepsContainer} showsVerticalScrollIndicator={false}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepContainer}>
              <View style={styles.stepLeft}>
                <View style={[styles.stepIcon, { backgroundColor: getStepColor(step.status) + '20' }]}>
                  {getStepIcon(step)}
                </View>
                {index < steps.length - 1 && (
                  <View style={[styles.stepConnector, { backgroundColor: getStepColor(step.status) }]} />
                )}
              </View>
              
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepTitle, { color: getStepColor(step.status) }]}>
                    {step.title}
                  </Text>
                  <View style={[styles.stepStatus, { backgroundColor: getStepColor(step.status) + '20' }]}>
                    <Text style={[styles.stepStatusText, { color: getStepColor(step.status) }]}>
                      {step.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.stepDescription}>{step.description}</Text>
                
                {getStepAction(step)}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Complete all steps to finalize your move booking
          </Text>
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
  progressSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Inter-Bold',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  stepsContainer: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepConnector: {
    width: 2,
    flex: 1,
    marginTop: 8,
    opacity: 0.3,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },
  stepStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepStatusText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textTransform: 'capitalize',
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  stepActionButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  stepActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  slotsLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  slotsLoadingText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  noSlotsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  noSlotsSubtext: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
});