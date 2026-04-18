import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { certAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

interface Certificate {
  id: string;
  name: string | null;
  institution: string | null;
  course: string | null;
  issue_date: string | null;
  status: 'pending' | 'approved' | 'rejected';
  is_suspicious: boolean;
  created_at: string;
}

interface Props {
  navigation: any;
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function DashboardScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCertificates = useCallback(async () => {
    try {
      const { data } = await certAPI.getMine();
      setCertificates(data.data.certificates);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load certificates' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCertificates();
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const stats = [
    { label: 'Total', value: certificates.length, color: '#2563EB' },
    {
      label: 'Approved',
      value: certificates.filter((c) => c.status === 'approved').length,
      color: '#16A34A',
    },
    {
      label: 'Pending',
      value: certificates.filter((c) => c.status === 'pending').length,
      color: '#D97706',
    },
    {
      label: 'Flagged',
      value: certificates.filter((c) => c.is_suspicious).length,
      color: '#EA580C',
    },
  ];

  const renderCertificate = ({ item }: { item: Certificate }) => (
    <View style={styles.certCard}>
      <View style={styles.certRow}>
        <View style={styles.certInfo}>
          <Text style={styles.certName}>{item.name || '—'}</Text>
          <Text style={styles.certDetail} numberOfLines={1}>
            {item.institution || 'Unknown institution'}
          </Text>
          <Text style={styles.certDetail}>{item.course || '—'}</Text>
          <Text style={styles.certDate}>Issued: {formatDate(item.issue_date)}</Text>
        </View>
        <View style={styles.certBadges}>
          <StatusBadge status={item.status} />
          {item.is_suspicious && (
            <View style={styles.suspiciousBadge}>
              <StatusBadge suspicious />
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={certificates}
        keyExtractor={(item) => item.id}
        renderItem={renderCertificate}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
        }
        ListHeaderComponent={
          <>
            {/* Greeting */}
            <View style={styles.greeting}>
              <View>
                <Text style={styles.greetingTitle}>
                  Welcome back, {user?.name?.split(' ')[0]}
                </Text>
                <Text style={styles.greetingSubtitle}>
                  Your academic certificates
                </Text>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sign out</Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsGrid}>
              {stats.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <Text style={[styles.statValue, { color: s.color }]}>
                    {s.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Upload CTA */}
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => navigation.navigate('Upload')}
            >
              <Text style={styles.uploadBtnText}>+ Upload Certificate</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>My Certificates</Text>

            {certificates.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📄</Text>
                <Text style={styles.emptyText}>No certificates uploaded yet.</Text>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => navigation.navigate('Upload')}
                >
                  <Text style={styles.uploadBtnText}>Upload your first certificate</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  list: { padding: 16, paddingBottom: 32 },
  greeting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  greetingSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  logoutText: { fontSize: 13, color: '#6B7280' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  uploadBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  certCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  certRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  certInfo: { flex: 1, marginRight: 12 },
  certName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  certDetail: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  certDate: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  certBadges: { alignItems: 'flex-end', gap: 4 },
  suspiciousBadge: { marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
});
