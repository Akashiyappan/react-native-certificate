import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { certAPI, verifyAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

type TabType = 'certificates' | 'logs';
type StatusFilter = '' | 'pending' | 'approved' | 'rejected';
type SuspiciousFilter = '' | 'true' | 'false';

interface Certificate {
  id: string;
  name: string | null;
  institution: string | null;
  course: string | null;
  certificate_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  is_suspicious: boolean;
  fraud_flags: string[] | null;
  file_url: string;
  created_at: string;
  user?: { name: string; email: string };
}

interface Log {
  id: string;
  certificate_id: string;
  result: 'valid' | 'invalid' | 'suspicious';
  method: string;
  ip_address: string | null;
  checked_at: string;
  certificate?: {
    certificate_id: string | null;
    user?: { name: string; email: string };
  };
}

interface Stats {
  certificates: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    suspicious: number;
  };
}

const formatDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

export default function AdminPanelScreen() {
  const { logout } = useAuth();
  const [tab, setTab] = useState<TabType>('certificates');
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [suspiciousFilter, setSuspiciousFilter] = useState<SuspiciousFilter>('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (suspiciousFilter) params.is_suspicious = suspiciousFilter;

      const [certsRes, logsRes, statsRes] = await Promise.all([
        certAPI.getAll(params),
        verifyAPI.getLogs({ limit: 50 }),
        verifyAPI.getStats(),
      ]);

      setCerts(certsRes.data.data.certificates);
      setLogs(logsRes.data.data.logs);
      setStats(statsRes.data.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load admin data' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, suspiciousFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const updateStatus = async (certId: string, status: string) => {
    setUpdating(certId);
    try {
      await certAPI.updateStatus(certId, status);
      Toast.show({ type: 'success', text1: `Certificate ${status}` });
      setCerts((prev) =>
        prev.map((c) =>
          c.id === certId ? { ...c, status: status as any } : c
        )
      );
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update status' });
    } finally {
      setUpdating(null);
    }
  };

  const confirmStatusUpdate = (certId: string, status: 'approved' | 'rejected') => {
    Alert.alert(
      status === 'approved' ? 'Approve Certificate' : 'Reject Certificate',
      `Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} this certificate?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status === 'approved' ? 'Approve' : 'Reject',
          style: status === 'approved' ? 'default' : 'destructive',
          onPress: () => updateStatus(certId, status),
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const statsConfig = stats
    ? [
        { label: 'Total', value: stats.certificates.total, color: '#2563EB' },
        { label: 'Approved', value: stats.certificates.approved, color: '#16A34A' },
        { label: 'Pending', value: stats.certificates.pending, color: '#D97706' },
        { label: 'Rejected', value: stats.certificates.rejected, color: '#DC2626' },
        { label: 'Suspicious', value: stats.certificates.suspicious, color: '#EA580C' },
      ]
    : [];

  const statusFilters: Array<{ label: string; value: StatusFilter }> = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  const suspiciousFilters: Array<{ label: string; value: SuspiciousFilter }> = [
    { label: 'All flags', value: '' },
    { label: 'Suspicious', value: 'true' },
    { label: 'Clean', value: 'false' },
  ];

  const renderCert = ({ item }: { item: Certificate }) => (
    <View style={styles.certCard}>
      <View style={styles.certTop}>
        <View style={styles.certMeta}>
          <Text style={styles.certName}>{item.name || '—'}</Text>
          <Text style={styles.certSub} numberOfLines={1}>
            {item.institution || 'Unknown institution'}
          </Text>
          <Text style={styles.certSub}>{item.course || '—'}</Text>
          {item.certificate_id && (
            <Text style={styles.certId}>ID: {item.certificate_id}</Text>
          )}
          <Text style={styles.certDate}>Uploaded: {formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.certRight}>
          <StatusBadge status={item.status} suspicious={item.is_suspicious} />
          <TouchableOpacity onPress={() => Linking.openURL(item.file_url)}>
            <Text style={styles.viewFileLink}>View file</Text>
          </TouchableOpacity>
        </View>
      </View>

      {item.user && (
        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>
            👤 {item.user.name} · {item.user.email}
          </Text>
        </View>
      )}

      {item.status === 'pending' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.approveBtn, updating === item.id ? styles.btnDisabled : null]}
            onPress={() => confirmStatusUpdate(item.id, 'approved')}
            disabled={updating === item.id}
          >
            <Text style={styles.approveBtnText}>
              {updating === item.id ? '…' : 'Approve'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectBtn, updating === item.id ? styles.btnDisabled : null]}
            onPress={() => confirmStatusUpdate(item.id, 'rejected')}
            disabled={updating === item.id}
          >
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.is_suspicious && item.fraud_flags && item.fraud_flags.length > 0 && (
        <View style={styles.fraudFlags}>
          {item.fraud_flags.map((flag, i) => (
            <Text key={i} style={styles.fraudFlagText}>• {flag}</Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderLog = ({ item }: { item: Log }) => (
    <View style={styles.logCard}>
      <View style={styles.logRow}>
        <View style={styles.logInfo}>
          <Text style={styles.logCertId}>
            {item.certificate?.certificate_id ||
              item.certificate_id?.slice(0, 8) + '...'}
          </Text>
          {item.certificate?.user && (
            <Text style={styles.logUser}>
              {item.certificate.user.name} · {item.certificate.user.email}
            </Text>
          )}
          <Text style={styles.logMeta}>
            Method: {item.method?.replace('_', ' ')}
          </Text>
          {item.ip_address && (
            <Text style={styles.logMeta}>IP: {item.ip_address}</Text>
          )}
          <Text style={styles.logDate}>{formatDate(item.checked_at)}</Text>
        </View>
        <StatusBadge status={item.result} />
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const headerComponent = (
    <>
      {/* Header row */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Admin Panel</Text>
          <Text style={styles.pageSubtitle}>Review certificates and activity</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats grid */}
      {stats && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsContent}
        >
          {statsConfig.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Tab toggle */}
      <View style={styles.tabToggle}>
        {(['certificates', 'logs'] as TabType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t ? styles.tabBtnActive : null]}
            onPress={() => setTab(t)}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === t ? styles.tabBtnTextActive : null,
              ]}
            >
              {t === 'certificates' ? 'Certificates' : 'Verification Logs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters (certificates tab only) */}
      {tab === 'certificates' && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersRow}>
              {statusFilters.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.filterChip,
                    statusFilter === f.value ? styles.filterChipActive : null,
                  ]}
                  onPress={() => setStatusFilter(f.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === f.value ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={styles.filterDivider} />
              {suspiciousFilters.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.filterChip,
                    suspiciousFilter === f.value ? styles.filterChipActive : null,
                  ]}
                  onPress={() => setSuspiciousFilter(f.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      suspiciousFilter === f.value
                        ? styles.filterChipTextActive
                        : null,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Empty state */}
      {tab === 'certificates' && certs.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No certificates found</Text>
        </View>
      )}
      {tab === 'logs' && logs.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No verification logs yet</Text>
        </View>
      )}
    </>
  );

  const data = tab === 'certificates' ? certs : logs;

  return (
    <FlatList
      data={data as any[]}
      keyExtractor={(item) => item.id}
      renderItem={tab === 'certificates' ? renderCert : (renderLog as any)}
      ListHeaderComponent={headerComponent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  list: { padding: 16, paddingBottom: 40 },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  pageSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  logoutText: { fontSize: 13, color: '#6B7280' },
  statsScroll: { marginHorizontal: -16, marginBottom: 16 },
  statsContent: { paddingHorizontal: 16, gap: 10 },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  statValue: { fontSize: 24, fontWeight: '700' },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#2563EB' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabBtnTextActive: { color: '#FFFFFF' },
  filtersContainer: { marginBottom: 12 },
  filtersRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
  filterChipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#1D4ED8', fontWeight: '700' },
  filterDivider: { width: 1, height: 24, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
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
  certTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  certMeta: { flex: 1, marginRight: 10 },
  certName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  certSub: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  certId: { fontSize: 11, fontFamily: 'monospace', color: '#374151', marginTop: 4, marginBottom: 2 },
  certDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  certRight: { alignItems: 'flex-end', gap: 6 },
  viewFileLink: { fontSize: 12, color: '#2563EB', marginTop: 4 },
  userInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  userInfoText: { fontSize: 12, color: '#6B7280' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  btnDisabled: { opacity: 0.5 },
  fraudFlags: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 10,
  },
  fraudFlagText: { fontSize: 12, color: '#C2410C', marginBottom: 3 },
  logCard: {
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
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logInfo: { flex: 1, marginRight: 12 },
  logCertId: { fontSize: 13, fontFamily: 'monospace', fontWeight: '600', color: '#111827', marginBottom: 4 },
  logUser: { fontSize: 12, color: '#6B7280', marginBottom: 3 },
  logMeta: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  logDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});
