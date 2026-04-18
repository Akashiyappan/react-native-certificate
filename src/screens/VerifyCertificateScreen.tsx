import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
  type DocumentPickerResponse,
} from '@react-native-documents/picker';
import Toast from 'react-native-toast-message';
import { certAPI } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface VerifyResult {
  result: 'valid' | 'invalid' | 'suspicious';
  reason?: string;
  certificate?: {
    name: string | null;
    institution: string | null;
    course: string | null;
    issue_date: string | null;
    certificate_id: string | null;
    status: string;
  };
  match_details?: Record<string, { match: boolean; uploaded?: string; stored?: string }>;
}

const resultConfig = {
  valid: {
    icon: '✅',
    title: 'Certificate is VALID',
    bg: '#F0FDF4',
    border: '#86EFAC',
    titleColor: '#16A34A',
    textColor: '#15803D',
  },
  invalid: {
    icon: '❌',
    title: 'Certificate is INVALID',
    bg: '#FEF2F2',
    border: '#FECACA',
    titleColor: '#DC2626',
    textColor: '#B91C1C',
  },
  suspicious: {
    icon: '⚠️',
    title: 'Certificate is SUSPICIOUS',
    bg: '#FFF7ED',
    border: '#FED7AA',
    titleColor: '#EA580C',
    textColor: '#C2410C',
  },
};

export default function VerifyCertificateScreen() {
  const [mode, setMode] = useState<'id' | 'file'>('id');
  const [certificateId, setCertificateId] = useState('');
  const [idError, setIdError] = useState('');
  const [file, setFile] = useState<DocumentPickerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const switchMode = (m: 'id' | 'file') => {
    setMode(m);
    setResult(null);
    setFile(null);
    setCertificateId('');
    setIdError('');
  };

  const handleVerifyById = async () => {
    if (!certificateId.trim()) {
      setIdError('Certificate ID is required');
      return;
    }
    setIdError('');
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('certificate_id', certificateId.trim());
      const { data } = await certAPI.verify(fd);
      setResult(data.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: err.response?.data?.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async () => {
    try {
      const [picked] = await pick({
        type: [types.images, types.pdf],
        allowMultiSelection: false,
      });
      setFile(picked);
      setResult(null);
    } catch (err) {
      if (isErrorWithCode(err) && err.code !== errorCodes.OPERATION_CANCELED) {
        Toast.show({ type: 'error', text1: 'Failed to pick file' });
      }
    }
  };

  const handleVerifyByFile = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('certificate', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || 'certificate',
      } as any);
      const { data } = await certAPI.verify(fd);
      setResult(data.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: err.response?.data?.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? resultConfig[result.result] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Verify a Certificate</Text>
      <Text style={styles.subtitle}>
        Check if an academic certificate is authentic. No account required.
      </Text>

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'id' ? styles.modeBtnActive : null]}
          onPress={() => switchMode('id')}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === 'id' ? styles.modeBtnTextActive : null,
            ]}
          >
            By Certificate ID
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'file' ? styles.modeBtnActive : null]}
          onPress={() => switchMode('file')}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === 'file' ? styles.modeBtnTextActive : null,
            ]}
          >
            By File Upload
          </Text>
        </TouchableOpacity>
      </View>

      {/* ID mode */}
      {mode === 'id' && (
        <View style={styles.card}>
          <Text style={styles.label}>Certificate ID</Text>
          <TextInput
            style={[styles.input, idError ? styles.inputError : null]}
            placeholder="e.g. CERT-2024-0012"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            value={certificateId}
            onChangeText={(t) => {
              setCertificateId(t);
              if (idError) setIdError('');
            }}
            onSubmitEditing={handleVerifyById}
          />
          {idError ? (
            <Text style={styles.errorText}>{idError}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.verifyBtn, loading ? styles.verifyBtnDisabled : null]}
            onPress={handleVerifyById}
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" color="#FFFFFF" />
                <Text style={styles.verifyBtnText}>Verifying…</Text>
              </>
            ) : (
              <Text style={styles.verifyBtnText}>Verify Certificate</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* File mode */}
      {mode === 'file' && (
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.filePicker, file ? styles.filePickerSelected : null]}
            onPress={pickFile}
          >
            {file ? (
              <Text style={styles.filePickedName} numberOfLines={1}>
                📎 {file.name}
              </Text>
            ) : (
              <>
                <Text style={styles.filePickerIcon}>📂</Text>
                <Text style={styles.filePickerText}>Tap to select a certificate file</Text>
                <Text style={styles.filePickerHint}>JPEG, PNG, WebP, PDF — max 10MB</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.verifyBtn,
              (!file || loading) ? styles.verifyBtnDisabled : null,
            ]}
            onPress={handleVerifyByFile}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" color="#FFFFFF" />
                <Text style={styles.verifyBtnText}>Analyzing…</Text>
              </>
            ) : (
              <Text style={styles.verifyBtnText}>Verify Certificate</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Result card */}
      {result && cfg && (
        <View
          style={[
            styles.resultCard,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
        >
          <View style={styles.resultHeaderRow}>
            <Text style={styles.resultIcon}>{cfg.icon}</Text>
            <View style={styles.resultHeaderText}>
              <Text style={[styles.resultTitle, { color: cfg.titleColor }]}>
                {cfg.title}
              </Text>
              {result.reason ? (
                <Text style={styles.resultReason}>{result.reason}</Text>
              ) : null}
            </View>
          </View>

          {result.certificate && (
            <View style={styles.certDetails}>
              <Text style={[styles.detailSectionTitle, { color: cfg.titleColor }]}>
                Certificate Details
              </Text>
              {[
                ['Name', result.certificate.name],
                ['Institution', result.certificate.institution],
                ['Course', result.certificate.course],
                ['Issue Date', result.certificate.issue_date],
                ['Certificate ID', result.certificate.certificate_id],
                ['Status', result.certificate.status],
              ].map(([label, value]) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value || '—'}</Text>
                </View>
              ))}
            </View>
          )}

          {result.match_details &&
            Object.keys(result.match_details).length > 0 && (
              <View style={styles.matchSection}>
                <Text
                  style={[styles.detailSectionTitle, { color: cfg.titleColor }]}
                >
                  Field Comparison
                </Text>
                {Object.entries(result.match_details).map(([field, info]) => (
                  <View key={field} style={styles.matchRow}>
                    <Text style={styles.matchField}>
                      {field.replace(/_/g, ' ')}
                    </Text>
                    <Text
                      style={[
                        styles.matchResult,
                        info.match
                          ? styles.matchGreen
                          : styles.matchRed,
                      ]}
                    >
                      {info.match ? '✓ Match' : '✗ Mismatch'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 18 },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: '#2563EB' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modeBtnTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FAFAFA',
    marginBottom: 4,
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 8 },
  filePicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    marginBottom: 14,
  },
  filePickerSelected: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  filePickerIcon: { fontSize: 32, marginBottom: 8 },
  filePickerText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  filePickerHint: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  filePickedName: { fontSize: 14, color: '#2563EB', fontWeight: '600', paddingHorizontal: 12 },
  verifyBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  verifyBtnDisabled: { backgroundColor: '#93C5FD' },
  verifyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  resultCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 18,
  },
  resultHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  resultIcon: { fontSize: 28 },
  resultHeaderText: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  resultReason: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  certDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  detailSectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  detailValue: { fontSize: 13, color: '#111827', fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 16 },
  matchSection: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  matchField: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  matchResult: { fontSize: 12, fontWeight: '700' },
  matchGreen: { color: '#16A34A' },
  matchRed: { color: '#DC2626' },
});
