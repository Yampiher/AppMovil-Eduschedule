import { supabase } from '@/constants/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Helper compatible para alertas en Web y Móvil
const notificar = (titulo: string, mensaje: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}: ${mensaje}`);
  } else {
    Alert.alert(titulo, mensaje, [{ text: 'Entendido' }]);
  }
};

export default function LoginScreen() {
  const router = useRouter();

  // Modo de pantalla: 'login' | 'register' | 'forgot'
  const [modo, setModo] = useState<'login' | 'register' | 'forgot'>('login');
  const [cargando, setCargando] = useState(false);

  // Estados para Login
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);

  // Estados para Registro
  const [regNombre, setRegNombre] = useState('');
  const [regApellido, setRegApellido] = useState('');
  const [regRut, setRegRut] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [verRegPassword, setVerRegPassword] = useState(false);

  // Estado para Recuperación
  const [recupEmail, setRecupEmail] = useState('');

  // ----------------------------------------------------
  // 1. INICIAR SESIÓN CON SUPABASE AUTH (CORREO O RUT)
  // ----------------------------------------------------
  const handleLogin = async () => {
    const idLimpio = identificador.trim().toLowerCase();
    const passLimpia = password.trim();

    if (!idLimpio || !passLimpia) {
      notificar('Campos Incompletos', 'Por favor ingresa tu Correo o RUT y tu contraseña.');
      return;
    }

    try {
      setCargando(true);
      let emailParaAuth = idLimpio;

      // Si el identificador no tiene formato de email, asumimos que ingresó un RUT
      if (!idLimpio.includes('@')) {
        const { data: docente, error: docError } = await supabase
          .from('profesores')
          .select('email, activo')
          .eq('rut', idLimpio)
          .maybeSingle();

        if (docError || !docente) {
          notificar(
            'RUT No Encontrado',
            'No encontramos ningún docente registrado con ese RUT en el sistema.'
          );
          setCargando(false);
          return;
        }

        if (docente.activo === false) {
          notificar('Acceso Deshabilitado', 'Tu cuenta se encuentra inactiva. Contacta a UTP.');
          setCargando(false);
          return;
        }

        emailParaAuth = docente.email.trim().toLowerCase();
      }

      // Autenticación real contra Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailParaAuth,
        password: passLimpia,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          notificar(
            'Credenciales Incorrectas',
            'El correo/RUT o la contraseña son incorrectos. Si aún no creas tu clave en la app, pulsa en "Registrarse".'
          );
        } else {
          notificar('Error al Iniciar Sesión', authError.message);
        }
        return;
      }

      // Si las credenciales fueron válidas, obtenemos el perfil del profesor
      const { data: perfilProfesor } = await supabase
        .from('profesores')
        .select('*')
        .eq('email', emailParaAuth)
        .maybeSingle();

      const datosSesion = perfilProfesor || {
        id: authData.user?.id,
        email: authData.user?.email,
        nombre: authData.user?.user_metadata?.nombre || 'Docente',
        apellido: authData.user?.user_metadata?.apellido || '',
        rut: authData.user?.user_metadata?.rut || '',
      };

      // Guardar en almacenamiento local
      await AsyncStorage.setItem('profesor_sesion', JSON.stringify(datosSesion));

      // Entrar directamente a las pestañas de la aplicación
      router.replace('/(tabs)');
    } catch (err: any) {
      notificar('Error Inesperado', err?.message || 'No fue posible iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  // ----------------------------------------------------
  // 2. REGISTRO DE DOCENTE EN SUPABASE AUTH + TABLA PROFESORES
  // ----------------------------------------------------
  const handleRegistro = async () => {
    const nombre = regNombre.trim();
    const apellido = regApellido.trim();
    const rut = regRut.trim().toLowerCase();
    const email = regEmail.trim().toLowerCase();
    const pass = regPassword.trim();
    const confirmPass = regConfirmPassword.trim();

    if (!nombre || !apellido || !rut || !email || !pass || !confirmPass) {
      notificar('Formulario Incompleto', 'Por favor llena todos los campos.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      notificar('Correo Inválido', 'Ingresa un correo electrónico institucional válido.');
      return;
    }

    if (pass.length < 6) {
      notificar('Contraseña Débil', 'La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    if (pass !== confirmPass) {
      notificar('Discrepancia', 'Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    try {
      setCargando(true);

      // 1. Crear el usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            nombre,
            apellido,
            rut,
          },
        },
      });

      if (authError) {
        notificar('Error en Registro', authError.message);
        return;
      }

      // 2. Vincular o registrar en la tabla 'profesores'
      const { data: profesorExistente } = await supabase
        .from('profesores')
        .select('id')
        .or(`email.eq.${email},rut.eq.${rut}`)
        .maybeSingle();

      if (profesorExistente) {
        await supabase
          .from('profesores')
          .update({
            nombre,
            apellido,
            email,
            rut,
            activo: true,
          })
          .eq('id', profesorExistente.id);
      } else {
        await supabase.from('profesores').insert([
          {
            nombre,
            apellido,
            email,
            rut,
            activo: true,
            horas_contratadas: 44,
          },
        ]);
      }

      notificar(
        '¡Registro Exitoso!',
        'Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión con tu correo o RUT y contraseña.'
      );

      // Limpiar formulario y pasar al modo login
      setIdentificador(email);
      setPassword('');
      setModo('login');
    } catch (err: any) {
      notificar('Error en el Registro', err?.message || 'No fue posible registrar la cuenta.');
    } finally {
      setCargando(false);
    }
  };

  // ----------------------------------------------------
  // 3. RECUPERAR CONTRASEÑA (RESET POR EMAIL)
  // ----------------------------------------------------
  const handleRecuperarPassword = async () => {
    const email = recupEmail.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      notificar('Correo Requerido', 'Ingresa tu correo institucional registrado.');
      return;
    }

    try {
      setCargando(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        notificar('Error al Enviar', error.message);
        return;
      }

      notificar(
        'Correo Enviado',
        `Hemos enviado un enlace para restablecer tu contraseña a ${email}. Revisa tu bandeja de entrada o spam.`
      );
      setModo('login');
      setRecupEmail('');
    } catch (err: any) {
      notificar('Error', err?.message || 'No se pudo procesar la solicitud.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo y Encabezado */}
          <View style={styles.brandHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="school" size={42} color="#1B2B4B" />
            </View>
            <Text style={styles.brandTitle}>EduSchedule</Text>
            <Text style={styles.brandTagline}>Portal Docente y Gestión de Horarios</Text>
          </View>

          {/* Tarjeta Principal */}
          <View style={styles.card}>
            {/* Selector de Modo (Login / Registro) */}
            {modo !== 'forgot' && (
              <View style={styles.segmentContainer}>
                <TouchableOpacity
                  style={[styles.segmentBtn, modo === 'login' && styles.segmentBtnActivo]}
                  onPress={() => setModo('login')}
                  disabled={cargando}
                >
                  <Text style={[styles.segmentTexto, modo === 'login' && styles.segmentTextoActivo]}>
                    Iniciar Sesión
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, modo === 'register' && styles.segmentBtnActivo]}
                  onPress={() => setModo('register')}
                  disabled={cargando}
                >
                  <Text style={[styles.segmentTexto, modo === 'register' && styles.segmentTextoActivo]}>
                    Registrarse
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* VISTA 1: INICIAR SESIÓN */}
            {modo === 'login' && (
              <View style={styles.form}>
                <Text style={styles.inputLabel}>Correo Institucional o RUT</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej: juan.perez@colegio.cl o 12345678-9"
                    placeholderTextColor="#A0AEC0"
                    value={identificador}
                    onChangeText={setIdentificador}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Text style={styles.inputLabel}>Contraseña</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ingresa tu contraseña"
                    placeholderTextColor="#A0AEC0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!verPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setVerPassword(!verPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={verPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#718096"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={() => setModo('forgot')}
                  disabled={cargando}
                >
                  <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mainBtn, cargando && styles.btnDisabled]}
                  onPress={handleLogin}
                  disabled={cargando}
                >
                  {cargando ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.mainBtnText}>Ingresar</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* VISTA 2: REGISTRO */}
            {modo === 'register' && (
              <View style={styles.form}>
                <View style={styles.row}>
                  <View style={[styles.flexCol, { marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Nombre</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Juan"
                        placeholderTextColor="#A0AEC0"
                        value={regNombre}
                        onChangeText={setRegNombre}
                      />
                    </View>
                  </View>

                  <View style={[styles.flexCol, { marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>Apellido</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Pérez"
                        placeholderTextColor="#A0AEC0"
                        value={regApellido}
                        onChangeText={setRegApellido}
                      />
                    </View>
                  </View>
                </View>

                <Text style={styles.inputLabel}>RUT (con guion y dígito verificador)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="card-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej: 12345678-9"
                    placeholderTextColor="#A0AEC0"
                    value={regRut}
                    onChangeText={setRegRut}
                    autoCapitalize="none"
                  />
                </View>

                <Text style={styles.inputLabel}>Correo Institucional</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="nombre@colegio.cl"
                    placeholderTextColor="#A0AEC0"
                    value={regEmail}
                    onChangeText={setRegEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <Text style={styles.inputLabel}>Contraseña (mínimo 6 caracteres)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="••••••••"
                    placeholderTextColor="#A0AEC0"
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry={!verRegPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setVerRegPassword(!verRegPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={verRegPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#718096"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="••••••••"
                    placeholderTextColor="#A0AEC0"
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    secureTextEntry={!verRegPassword}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.mainBtn, styles.registerBtn, cargando && styles.btnDisabled]}
                  onPress={handleRegistro}
                  disabled={cargando}
                >
                  {cargando ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.mainBtnText}>Crear Cuenta Docente</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* VISTA 3: ¿OLVIDASTE TU CONTRASEÑA? */}
            {modo === 'forgot' && (
              <View style={styles.form}>
                <View style={styles.forgotHeader}>
                  <Ionicons name="key-outline" size={36} color="#1B2B4B" />
                  <Text style={styles.forgotTitle}>Recuperar Contraseña</Text>
                  <Text style={styles.forgotSubtitle}>
                    Ingresa tu correo institucional y te enviaremos las instrucciones oficiales para restablecer tu clave.
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Correo Institucional</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="nombre@colegio.cl"
                    placeholderTextColor="#A0AEC0"
                    value={recupEmail}
                    onChangeText={setRecupEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.mainBtn, cargando && styles.btnDisabled]}
                  onPress={handleRecuperarPassword}
                  disabled={cargando}
                >
                  {cargando ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.mainBtnText}>Enviar Enlace</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setModo('login')}
                  disabled={cargando}
                >
                  <Text style={styles.backBtnText}>← Volver a Iniciar Sesión</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Pie informativo */}
          <Text style={styles.disclaimerText}>
            Uso exclusivo para el personal educativo y directivo de la institución.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 35,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 26,
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1B2B4B',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActivo: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextoActivo: {
    color: '#1B2B4B',
    fontWeight: '700',
  },
  form: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
  },
  flexCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  mainBtn: {
    backgroundColor: '#1B2B4B',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#1B2B4B',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  registerBtn: {
    backgroundColor: '#2563EB',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  mainBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  forgotHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B2B4B',
    marginTop: 8,
  },
  forgotSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 22,
    lineHeight: 16,
  },
});

