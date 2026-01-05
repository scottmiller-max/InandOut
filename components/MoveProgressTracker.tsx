import { View, Text, StyleSheet } from 'react-native';
import { Truck, CheckCircle, Clock } from 'lucide-react-native';

export type MoveStage =
  | 'quote_approved'
  | 'scheduled'
  | 'en_route'
  | 'loading'
  | 'in_transit'
  | 'delivered'
  | 'completed';

const stages: Array<{ key: MoveStage; label: string; index: number }> = [
  { key: 'quote_approved', label: 'Quote Approved', index: 0 },
  { key: 'scheduled', label: 'Scheduled', index: 1 },
  { key: 'en_route', label: 'En Route', index: 2 },
  { key: 'loading', label: 'Loading', index: 3 },
  { key: 'in_transit', label: 'In Transit', index: 4 },
  { key: 'delivered', label: 'Delivered', index: 5 },
  { key: 'completed', label: 'Completed', index: 6 },
];

interface MoveProgressTrackerProps {
  currentStage: MoveStage;
  compact?: boolean;
}

export function MoveProgressTracker({ currentStage, compact = false }: MoveProgressTrackerProps) {
  const currentStageIndex = stages.find(s => s.key === currentStage)?.index ?? 0;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactProgress}>
          <View style={[styles.compactBar, { width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }]} />
        </View>
        <View style={styles.compactStatus}>
          <Truck size={20} color="#2563eb" />
          <Text style={styles.compactText}>
            {stages[currentStageIndex].label}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Move Progress</Text>
        <View style={styles.truckAnimation}>
          <Truck size={32} color="#2563eb" />
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }
          ]}
        />
      </View>

      <View style={styles.stagesList}>
        {stages.map((stage, index) => {
          const isActive = index === currentStageIndex;
          const isCompleted = index < currentStageIndex;
          const isPending = index > currentStageIndex;

          return (
            <View key={stage.key} style={styles.stageItem}>
              <View style={styles.stageIcon}>
                {isCompleted && <CheckCircle size={24} color="#10b981" />}
                {isActive && <Clock size={24} color="#2563eb" />}
                {isPending && (
                  <View style={styles.pendingCircle}>
                    <View style={styles.pendingDot} />
                  </View>
                )}
              </View>
              <View style={styles.stageContent}>
                <Text
                  style={[
                    styles.stageLabel,
                    isActive && styles.stageLabelActive,
                    isCompleted && styles.stageLabelCompleted,
                    isPending && styles.stageLabelPending,
                  ]}
                >
                  {stage.label}
                </Text>
                {isActive && (
                  <Text style={styles.stageSubtext}>In Progress</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  truckAnimation: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  stagesList: {
    gap: 16,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  stageContent: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  stageLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  stageLabelCompleted: {
    color: '#10b981',
  },
  stageLabelPending: {
    color: '#94a3b8',
  },
  stageSubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  compactContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
  },
  compactProgress: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  compactBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  compactStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
});
