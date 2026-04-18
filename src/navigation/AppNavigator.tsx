import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import UploadCertificateScreen from '../screens/UploadCertificateScreen';
import VerifyCertificateScreen from '../screens/VerifyCertificateScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';

const AuthStack = createNativeStackNavigator();
const UserTab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();

const TAB_HEADER = {
  headerStyle: { backgroundColor: '#2563EB' },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '700' as const },
};

const tabIcon = (emoji: string) =>
  ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
  );

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      {/* Public verify screen accessible without login */}
      <AuthStack.Screen
        name="PublicVerify"
        component={VerifyCertificateScreen}
        options={{
          headerShown: true,
          title: 'Verify Certificate',
          ...TAB_HEADER,
        }}
      />
    </AuthStack.Navigator>
  );
}

function UserNavigator() {
  return (
    <UserTab.Navigator
      screenOptions={{
        ...TAB_HEADER,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E5E7EB' },
      }}
    >
      <UserTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'My Certificates',
          tabBarLabel: 'Home',
          tabBarIcon: tabIcon('🏠'),
        }}
      />
      <UserTab.Screen
        name="Upload"
        component={UploadCertificateScreen}
        options={{
          title: 'Upload Certificate',
          tabBarLabel: 'Upload',
          tabBarIcon: tabIcon('⬆️'),
        }}
      />
      <UserTab.Screen
        name="Verify"
        component={VerifyCertificateScreen}
        options={{
          title: 'Verify Certificate',
          tabBarLabel: 'Verify',
          tabBarIcon: tabIcon('🔍'),
        }}
      />
    </UserTab.Navigator>
  );
}

function AdminNavigator() {
  return (
    <AdminTab.Navigator
      screenOptions={{
        ...TAB_HEADER,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E5E7EB' },
      }}
    >
      <AdminTab.Screen
        name="AdminPanel"
        component={AdminPanelScreen}
        options={{
          title: 'Admin Panel',
          tabBarLabel: 'Admin',
          tabBarIcon: tabIcon('⚙️'),
        }}
      />
      <AdminTab.Screen
        name="Verify"
        component={VerifyCertificateScreen}
        options={{
          title: 'Verify Certificate',
          tabBarLabel: 'Verify',
          tabBarIcon: tabIcon('🔍'),
        }}
      />
    </AdminTab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) return <AuthNavigator />;
  if (user.role === 'admin') return <AdminNavigator />;
  return <UserNavigator />;
}
