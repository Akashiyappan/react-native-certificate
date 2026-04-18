import { Platform } from 'react-native';

// Android emulator: 10.0.2.2 maps to your machine's localhost
// iOS simulator: localhost works directly
// Physical device: replace with your machine's local IP (e.g. 192.168.1.x)
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5001/api'
    : 'http://localhost:5001/api';
