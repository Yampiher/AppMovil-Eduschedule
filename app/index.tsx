import { supabase } from '@/constants/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleIngresar = async () => {
    const valorLimpio = identificador.trim().toLowerCase();

    if (!valorLimpio || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo/RUT y contraseña.');
      return;
    }

    try {
      setCargando(true);

      // 1. Consultar los docentes activos registrados
      const { data: profesores, error } = await supabase
        .from('profesores')
        .select('*')
        .eq('activo', true);

      if (error) {
        Alert.alert('Error de Supabase', error.message);
        return;
      }

      // 2. Buscar localmente la coincidencia exacta por email o RUT
      const profesor = profesores?.find((p) => {
        const emailMatch = p.email && p.email.trim().toLowerCase() === valorLimpio;
        const rutMatch = p.rut && p.rut.trim().toLowerCase() === valorLimpio;
        return emailMatch || rutMatch;
      });

      if (!profesor) {
        Alert.alert('Acceso denegado', 'No se encontró un docente activo con los datos ingresados.');
        return;
      }

      // 3. Guardar la sesión y pasar al dashboard
      await AsyncStorage.setItem('profesor_sesion', JSON.stringify(profesor));
      router.replace('/(tabs)');

    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      Alert.alert('Diagnóstico de Error', err?.message || JSON.stringify(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.loginBox}>
          <Text style={styles.title}>EduSchedule</Text>
          <Text style={styles.subtitle}>Portal de Gestión Académica</Text>
          <View style={styles.divider} />

          <Text style={styles.label}>Correo Institucional o RUT</Text>
          <TextInput 
            style={styles.input}
            placeholder="Ej: juan.perez@colegio.cl o 12345678-9"
            placeholderTextColor="#999"
            value={identificador}
            onChangeText={setIdentificador}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput 
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={[styles.button, cargando && styles.buttonDisabled]} 
            onPress={handleIngresar}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footerText}>
            * El acceso es exclusivo para personal docente. Para recuperación de credenciales, contacte a UTP o Dirección.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F9', justifyContent: 'center' },
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  loginBox: { backgroundColor: 'white', padding: 30, borderRadius: 12, elevation: 3 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1B2B4B', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, marginTop: 5 },
  divider: { height: 1, backgroundColor: '#EEE', marginBottom: 25 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#1B2B4B', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: '#7A889B' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  footerText: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 25 }
});