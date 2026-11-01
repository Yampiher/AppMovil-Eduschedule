import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* 1. Gateway inicial para verificar sesión */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* 2. Pantalla de Autenticación (Login / Registro) */}
        <Stack.Screen name="login" options={{ headerShown: false }} />
        {/* 3. Pestañas / Dashboard */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* 4. Modal */}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
