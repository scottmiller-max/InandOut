import { View, Text, StyleSheet } from 'react-native';
import { PageContainer } from '@/components/PageContainer';

export default function AdminProfile() {
  return (
    <PageContainer>
      <View style={styles.content}>
        <Text style={styles.title}>Admin Profile</Text>
        <Text style={styles.description}>
          Account settings and administrative preferences.
        </Text>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
});
