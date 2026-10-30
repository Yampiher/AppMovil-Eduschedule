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

// Helper compatible con Web y Móvil para emitir alertas
const mostrarMensaje = (titulo: string, mensaje: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}: ${mensaje}`);
  } else {
    Alert.alert(titulo, mensaje, [{ text: 'Entendido' }]);
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleIngresar = async () => {
    const valorLimpio = identificador.trim().toLowerCase();

    // 1. Validación de campos vacíos
    if (!valorLimpio || !password.trim()) {
      mostrarMensaje(
        'Campos Incompletos',
        'Por favor ingresa tu correo institucional o RUT y tu contraseña.'
      );
      return;
    }

    try {
      setCargando(true);

      // 2. Consulta a la tabla profesores en Supabase
      const { data: profesores, error } = await supabase
        .from('profesores')
        .select('*')
        .eq('activo', true);

      if (error) {
        mostrarMensaje('Error de Conexión', error.message);
        return;
      }

      // 3. Buscar si coincide el email o el RUT
      const profesor = profesores?.find((p) => {
        const emailMatch = p.email && p.email.trim().toLowerCase() === valorLimpio;
        const rutMatch = p.rut && p.rut.trim().toLowerCase() === valorLimpio;
        return emailMatch || rutMatch;
      });

      // 4. Si no existe coincidencia, emitir mensaje de error
      if (!profesor) {
        mostrarMensaje(
          'Acceso Denegado',
          'El correo o RUT ingresado no corresponde a ningún docente registrado o activo.'
        );
        return;
      }

      // 5. Sesión exitosa
      await AsyncStorage.setItem('profesor_sesion', JSON.stringify(profesor));
      router.replace('/(tabs)');

    } catch (err: any) {
      mostrarMensaje(
        'Error Inesperado',
        err?.message || 'Ocurrió un error al intentar autenticar.'
      );
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
            * El acceso es exclusivo para personal docente. Para dudas o credenciales, contacte a UTP o Dirección.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F9', justifyContent: 'center' },
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  loginBox: { backgroundColor: 'white', padding: 30, borderRadius: 12, elevation: 3, maxWidth: 450, width: '100%', alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1B2B4B', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, marginTop: 5 },
  divider: { height: 1, backgroundColor: '#EEE', marginBottom: 25 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#1B2B4B', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, cursor: 'pointer' as any },
  buttonDisabled: { backgroundColor: '#7A889B' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  footerText: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 25 }
});