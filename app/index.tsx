import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function IndexGateway() {
  const router = useRouter();

  useEffect(() => {
    let activo = true;

    const verificarSesion = async () => {
      try {
        const sesion = await AsyncStorage.getItem('profesor_sesion');
        if (!activo) return;

        if (sesion) {
          router.replace('/(tabs)');
        } else {
          router.replace('/login');
        }
      } catch (err) {
        if (!activo) return;
        router.replace('/login');
      }
    };

    verificarSesion();

    return () => {
      activo = false;
    };
  }, []);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1B2B4B" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
