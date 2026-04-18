import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  status?: string;
  suspicious?: boolean;
}

const config: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: '#DCFCE7', text: '#16A34A', label: 'Approved' },
  pending: { bg: '#FEF9C3', text: '#CA8A04', label: 'Pending' },
  rejected: { bg: '#FEE2E2', text: '#DC2626', label: 'Rejected' },
  suspicious: { bg: '#FFEDD5', text: '#EA580C', label: 'Suspicious' },
  valid: { bg: '#DCFCE7', text: '#16A34A', label: 'Valid' },
  invalid: { bg: '#FEE2E2', text: '#DC2626', label: 'Invalid' },
};

export default function StatusBadge({ status, suspicious }: Props) {
  const key = suspicious ? 'suspicious' : status || 'pending';
  const cfg = config[key] || config.pending;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
