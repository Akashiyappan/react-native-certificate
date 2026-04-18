import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
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
import StatusBadge from '../components/StatusBadge';

const MAX_SIZE_MB = 10;

interface UploadResult {
  certificate: {
    id: string;
    name: string | null;
    institution: string | null;
    course: string | null;
    issue_date: string | null;
    certificate_id: string | null;
    status: string;
  };
  ocr: { confidence: number };
  fraud: { is_suspicious: boolean; flags: string[] };
}

const FieldRow = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={value ? styles.fieldValue : styles.fieldValueEmpty}>
      {value || 'not detected'}
    </Text>
  </View>
);

export default function UploadCertificateScreen() {
  const [file, setFile] = useState<DocumentPickerResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const pickFile = async () => {
    try {
      const [picked] = await pick({
        type: [types.images, types.pdf],
        allowMultiSelection: false,
      });
      if (picked.size && picked.size > MAX_SIZE_MB * 1024 * 1024) {
        Alert.alert('File too large', `File must be under ${MAX_SIZE_MB}MB`);
        return;
      }
      setFile(picked);
      setResult(null);
    } catch (err) {
      if (isErrorWithCode(err) && err.code !== errorCodes.OPERATION_CANCELED) {
        Toast.show({ type: 'error', text1: 'Failed to pick file' });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('certificate', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || 'certificate',
      } as any);
      const { data } = await certAPI.upload(fd);
      setResult(data.data);
      Toast.show({ type: 'success', text1: 'Certificate uploaded and processed!' });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: err.response?.data?.message || 'Please try again',
      });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  const isImage =
    file?.type?.startsWith('image/') || false;
  const isPdf = file?.type === 'application/pdf';

  const ocrColor =
    result && result.ocr.confidence >= 80
      ? '#16A34A'
      : result && result.ocr.confidence >= 50
      ? '#D97706'
      : '#DC2626';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Upload Certificate</Text>
      <Text style={styles.subtitle}>
        Select a certificate image or PDF — fields will be extracted automatically using OCR.
      </Text>

      {/* File Picker Area */}
      {!file ? (
        <TouchableOpacity style={styles.dropZone} onPress={pickFile}>
          <Text style={styles.dropIcon}>📤</Text>
          <Text style={styles.dropTitle}>Tap to select a certificate</Text>
          <Text style={styles.dropHint}>JPEG, PNG, WebP, or PDF — max 10MB</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.filePreview}>
          {isImage ? (
            <Image
              source={{ uri: file.uri }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.pdfInfo}>
              <Text style={styles.pdfIcon}>📄</Text>
              <View>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <Text style={styles.fileSize}>
                  {file.size
                    ? `${(file.size / 1024 / 1024).toFixed(2)} MB · PDF`
                    : 'PDF'}
                </Text>
              </View>
            </View>
          )}
          <TouchableOpacity style={styles.removeBtn} onPress={reset}>
            <Text style={styles.removeBtnText}>Remove file</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Upload Button */}
      {file && !result && (
        <TouchableOpacity
          style={[styles.uploadBtn, uploading ? styles.uploadBtnDisabled : null]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <LoadingSpinner size="small" color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>Processing with OCR…</Text>
            </>
          ) : (
            <Text style={styles.uploadBtnText}>Upload & Extract Fields</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Extracted Fields */}
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Extracted Fields</Text>
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>OCR Confidence:</Text>
                <Text style={[styles.confidenceValue, { color: ocrColor }]}>
                  {result.ocr.confidence}%
                </Text>
              </View>
            </View>
            <FieldRow label="Name" value={result.certificate.name} />
            <View style={styles.divider} />
            <FieldRow label="Institution" value={result.certificate.institution} />
            <View style={styles.divider} />
            <FieldRow label="Course" value={result.certificate.course} />
            <View style={styles.divider} />
            <FieldRow label="Issue Date" value={result.certificate.issue_date} />
            <View style={styles.divider} />
            <FieldRow label="Certificate ID" value={result.certificate.certificate_id} />
            <View style={styles.divider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Status</Text>
              <StatusBadge status={result.certificate.status} />
            </View>
          </View>

          {/* Fraud flags */}
          {result.fraud.is_suspicious && (
            <View style={styles.fraudAlert}>
              <Text style={styles.fraudTitle}>⚠️ Fraud Flags Detected</Text>
              {result.fraud.flags.map((flag, i) => (
                <Text key={i} style={styles.fraudFlag}>
                  • {flag}
                </Text>
              ))}
            </View>
          )}

          {/* Upload another */}
          <TouchableOpacity style={styles.secondaryBtn} onPress={reset}>
            <Text style={styles.secondaryBtnText}>Upload Another</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 18 },
  dropZone: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingVertical: 48,
    alignItems: 'center',
    marginBottom: 16,
  },
  dropIcon: { fontSize: 40, marginBottom: 12 },
  dropTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 6 },
  dropHint: { fontSize: 12, color: '#9CA3AF' },
  filePreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  pdfInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  pdfIcon: { fontSize: 36 },
  fileName: { fontSize: 14, fontWeight: '600', color: '#111827', maxWidth: 240 },
  fileSize: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  removeBtn: { alignItems: 'center', paddingVertical: 6 },
  removeBtnText: { fontSize: 13, color: '#6B7280', textDecorationLine: 'underline' },
  uploadBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  uploadBtnDisabled: { backgroundColor: '#93C5FD' },
  uploadBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  resultCard: {
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
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confidenceLabel: { fontSize: 12, color: '#6B7280' },
  confidenceValue: { fontSize: 13, fontWeight: '700' },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  fieldValue: { fontSize: 13, color: '#111827', textAlign: 'right', flex: 1, marginLeft: 16 },
  fieldValueEmpty: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  fraudAlert: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fraudTitle: { fontSize: 14, fontWeight: '700', color: '#9A3412', marginBottom: 8 },
  fraudFlag: { fontSize: 13, color: '#C2410C', marginBottom: 4 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
});
