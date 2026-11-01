import { supabase } from '@/constants/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

// Helper compatible para alertas en Web y Movil
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

  // Estado para Recuperacion
  const [recupEmail, setRecupEmail] = useState('');

  // ----------------------------------------------------
  // 1. INICIAR SESION CON CREDENCIALES (CORREO O RUT)
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
      let docenteEncontrado: any = null;

      // Si el identificador no tiene formato de email, buscamos por RUT
      if (!idLimpio.includes('@')) {
        const { data: docDirecto } = await supabase
          .from('docentes')
          .select('*')
          .or(`rut.eq.${idLimpio},rut.ilike.%${idLimpio}%`)
          .maybeSingle();

        if (docDirecto) {
          docenteEncontrado = docDirecto;
        } else {
          // Busqueda flexible limpiando puntos y guiones
          const { data: todosDocentes } = await supabase
            .from('docentes')
            .select('*');

          const rutEntradaLimpio = idLimpio.replace(/[^0-9kK]/g, '');
          const coincidencia = (todosDocentes || []).find((d: any) =>
            (d.rut || '').replace(/[^0-9kK]/g, '').toLowerCase() === rutEntradaLimpio
          );

          if (!coincidencia) {
            notificar(
              'RUT No Encontrado',
              'No encontramos ningún docente registrado con ese RUT en el sistema.'
            );
            setCargando(false);
            return;
          }
          docenteEncontrado = coincidencia;
        }

        if (docenteEncontrado.activo === false) {
          notificar('Acceso Deshabilitado', 'Tu cuenta se encuentra inactiva. Contacta a UTP.');
          setCargando(false);
          return;
        }

        emailParaAuth = docenteEncontrado.email.trim().toLowerCase();
      }

      // Autenticacion contra el servicio central
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailParaAuth,
        password: passLimpia,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          notificar(
            'Credenciales Incorrectas',
            'El correo/RUT o la contraseña no coinciden. Si aún no activas tu clave en la app móvil, pulsa en "Registrarse".'
          );
        } else if (authError.message.includes('Email not confirmed')) {
          notificar(
            'Confirmación Pendiente',
            'Tu cuenta requiere confirmación de correo. Revisa tu bandeja de entrada o contacta al administrador del sistema.'
          );
        } else {
          notificar('Error al Iniciar Sesión', authError.message);
        }
        return;
      }

      // Obtener el perfil del docente desde la tabla central 'docentes'
      let perfilDocente = docenteEncontrado;
      if (!perfilDocente) {
        const { data: docData } = await supabase
          .from('docentes')
          .select('*')
          .eq('email', emailParaAuth)
          .maybeSingle();
        perfilDocente = docData;
      }

      // Si el usuario existe en autenticacion pero aun no tenia fila en docentes, crearla automaticamente
      if (!perfilDocente) {
        const { data: inst } = await supabase
          .from('instituciones')
          .select('id')
          .limit(1)
          .maybeSingle();

        const instId = inst?.id || 'cmvwy34xs0001h7t8zqgr778p';
        const docId = authData.user?.id || `doc_${Date.now()}`;
        const meta = authData.user?.user_metadata || {};

        const { data: creado } = await supabase
          .from('docentes')
          .insert([
            {
              id: docId,
              institucionId: instId,
              nombre: meta.nombre || 'Docente',
              apellido: meta.apellido || '',
              email: emailParaAuth,
              rut: meta.rut || '',
              departamento: 'Docencia General',
              tipoJornada: 'COMPLETA',
              horasContrato: 44,
              horasLectivasMax: 28,
              horasNoLectivas: 16,
              activo: true,
              updatedAt: new Date().toISOString(),
            },
          ])
          .select()
          .maybeSingle();

        perfilDocente = creado;
      }

      const datosSesion = {
        id: perfilDocente?.id || authData.user?.id,
        docenteId: perfilDocente?.id || authData.user?.id,
        email: perfilDocente?.email || authData.user?.email || emailParaAuth,
        nombre: perfilDocente?.nombre || authData.user?.user_metadata?.nombre || 'Docente',
        apellido: perfilDocente?.apellido || authData.user?.user_metadata?.apellido || '',
        rut: perfilDocente?.rut || authData.user?.user_metadata?.rut || '',
        departamento: perfilDocente?.departamento || '',
        horas_contratadas: perfilDocente?.horasContrato || 44,
        horasContrato: perfilDocente?.horasContrato || 44,
        institucionId: perfilDocente?.institucionId || null,
      };

      // Guardar en almacenamiento local
      await AsyncStorage.setItem('profesor_sesion', JSON.stringify(datosSesion));

      // Entrar directamente a las pestañas de la aplicacion
      router.replace('/(tabs)');
    } catch (err: any) {
      notificar('Error Inesperado', err?.message || 'No fue posible iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  // ----------------------------------------------------
  // 2. REGISTRO DE DOCENTE Y VINCULACION CENTRAL
  // ----------------------------------------------------
  const handleRegistro = async () => {
    const nombre = regNombre.trim();
    const apellido = regApellido.trim();
    const rut = regRut.trim();
    const email = regEmail.trim().toLowerCase();
    const pass = regPassword.trim();
    const confirmPass = regConfirmPassword.trim();

    if (!nombre || !apellido || !rut || !email || !pass || !confirmPass) {
      notificar('Formulario Incompleto', 'Por favor llena todos los campos.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      notificar('Correo Inválido', 'Ingresa un correo electrónico válido.');
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

      // 1. Crear el usuario en el servicio de autenticacion
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
        if (authError.message.includes('already registered')) {
          notificar(
            'Cuenta Ya Registrada',
            'Este correo ya se encuentra registrado. Por favor inicia sesión o recupera tu contraseña.'
          );
        } else {
          notificar('Error en Registro', authError.message);
        }
        return;
      }

      // 2. Vincular o crear el registro en la tabla 'docentes'
      const { data: docenteExistente } = await supabase
        .from('docentes')
        .select('id, institucionId')
        .or(`email.eq.${email},rut.eq.${rut}`)
        .maybeSingle();

      if (docenteExistente) {
        await supabase
          .from('docentes')
          .update({
            nombre,
            apellido,
            email,
            rut,
            activo: true,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', docenteExistente.id);
      } else {
        const { data: inst } = await supabase
          .from('instituciones')
          .select('id')
          .limit(1)
          .maybeSingle();

        const instId = inst?.id || 'cmvwy34xs0001h7t8zqgr778p';
        const docId = authData.user?.id || `doc_${Date.now()}`;

        const { error: insertError } = await supabase.from('docentes').insert([
          {
            id: docId,
            institucionId: instId,
            nombre,
            apellido,
            email,
            rut,
            departamento: 'Docencia General',
            tipoJornada: 'COMPLETA',
            horasContrato: 44,
            horasLectivasMax: 28,
            horasNoLectivas: 16,
            activo: true,
            updatedAt: new Date().toISOString(),
          },
        ]);

        if (insertError) {
          console.error('Error al insertar perfil en docentes:', insertError);
        }
      }

      if (!authData.session) {
        notificar(
          'Registro Recibido',
          'Tu cuenta fue creada exitosamente. Si el sistema requiere confirmación por correo, revisa tu bandeja de entrada antes de iniciar sesión.'
        );
      } else {
        notificar(
          'Registro Exitoso',
          'Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión con tu correo o RUT y contraseña.'
        );
      }

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
  // 3. RECUPERAR CONTRASEÑA
  // ----------------------------------------------------
  const handleRecuperarPassword = async () => {
    const emailLimpio = recupEmail.trim().toLowerCase();

    if (!emailLimpio || !emailLimpio.includes('@')) {
      notificar('Correo Requerido', 'Por favor ingresa tu correo electrónico registrado.');
      return;
    }

    try {
      setCargando(true);
      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpio);

      if (error) {
        notificar('Aviso', error.message);
        return;
      }

      notificar(
        'Instrucciones Enviadas',
        'Si el correo se encuentra registrado, recibirás un mensaje para restablecer tu contraseña.'
      );
      setModo('login');
      setRecupEmail('');
    } catch (err: any) {
      notificar('Error Inesperado', err?.message || 'Error al procesar la solicitud.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tarjeta Central */}
          <View style={styles.cardContainer}>
            {/* Logo y Encabezado */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="school" size={42} color="#FFFFFF" />
              </View>
              <Text style={styles.appTitle}>EduSchedule</Text>
              <Text style={styles.appSubtitle}>Portal Móvil Docente</Text>
            </View>

            {/* Selector de Pestañas Superiores (Login / Registro) */}
            {modo !== 'forgot' && (
              <View style={styles.tabSelector}>
                <TouchableOpacity
                  style={[styles.tabBtn, modo === 'login' && styles.tabBtnActivo]}
                  onPress={() => setModo('login')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabBtnTexto, modo === 'login' && styles.tabBtnTextoActivo]}>
                    Iniciar Sesión
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, modo === 'register' && styles.tabBtnActivo]}
                  onPress={() => setModo('register')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabBtnTexto, modo === 'register' && styles.tabBtnTextoActivo]}>
                    Registrarse
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ========================================================= */}
            {/* VISTA 1: FORMULARIO DE INICIO DE SESIÓN */}
            {/* ========================================================= */}
            {modo === 'login' && (
              <View style={styles.form}>
                <Text style={styles.sectionTitle}>Acceso Docente</Text>
                <Text style={styles.sectionDesc}>
                  Ingresa con tu correo institucional o RUT y tu contraseña.
                </Text>

                {/* Campo Identificador */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Correo Institucional o RUT</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="ejemplo@liceo.cl o 12.345.678-9"
                      placeholderTextColor="#94A3B8"
                      value={identificador}
                      onChangeText={setIdentificador}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Campo Contraseña */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contraseña</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ingresa tu contraseña"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!verPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setVerPassword(!verPassword)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={verPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Enlace Olvidé mi Contraseña */}
                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={() => setModo('forgot')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                {/* Botón Principal Iniciar Sesión */}
                <TouchableOpacity
                  style={[styles.primaryBtn, cargando && styles.btnDisabled]}
                  onPress={handleLogin}
                  disabled={cargando}
                  activeOpacity={0.8}
                >
                  {cargando ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Ingresar al Portal</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ========================================================= */}
            {/* VISTA 2: FORMULARIO DE REGISTRO DE DOCENTE */}
            {/* ========================================================= */}
            {modo === 'register' && (
              <View style={styles.form}>
                <Text style={styles.sectionTitle}>Registro de Docente</Text>
                <Text style={styles.sectionDesc}>
                  Crea tu clave de acceso vinculada a tu establecimiento.
                </Text>

                {/* Nombres y Apellidos en dos columnas */}
                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                    <Text style={styles.inputLabel}>Nombre</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Nombre"
                        placeholderTextColor="#94A3B8"
                        value={regNombre}
                        onChangeText={setRegNombre}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                    <Text style={styles.inputLabel}>Apellido</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Apellido"
                        placeholderTextColor="#94A3B8"
                        value={regApellido}
                        onChangeText={setRegApellido}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                </View>

                {/* Campo RUT */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>RUT</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="card-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="12.345.678-9"
                      placeholderTextColor="#94A3B8"
                      value={regRut}
                      onChangeText={setRegRut}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Campo Correo Institucional */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Correo Institucional</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="profesor@institucion.cl"
                      placeholderTextColor="#94A3B8"
                      value={regEmail}
                      onChangeText={setRegEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Campo Nueva Contraseña */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Crear Contraseña (mínimo 6 caracteres)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor="#94A3B8"
                      value={regPassword}
                      onChangeText={setRegPassword}
                      secureTextEntry={!verRegPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setVerRegPassword(!verRegPassword)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={verRegPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirmar Contraseña */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Repite tu contraseña"
                      placeholderTextColor="#94A3B8"
                      value={regConfirmPassword}
                      onChangeText={setRegConfirmPassword}
                      secureTextEntry={!verRegPassword}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Botón Registrarse */}
                <TouchableOpacity
                  style={[styles.primaryBtn, cargando && styles.btnDisabled]}
                  onPress={handleRegistro}
                  disabled={cargando}
                  activeOpacity={0.8}
                >
                  {cargando ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Completar Registro</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ========================================================= */}
            {/* VISTA 3: RECUPERACIÓN DE CONTRASEÑA */}
            {/* ========================================================= */}
            {modo === 'forgot' && (
              <View style={styles.form}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setModo('login')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={20} color="#1E293B" />
                  <Text style={styles.backBtnText}>Volver a Iniciar Sesión</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>Recuperar Contraseña</Text>
                <Text style={styles.sectionDesc}>
                  Ingresa tu correo institucional registrado y te enviaremos las instrucciones de restablecimiento.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Correo Institucional</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="profesor@institucion.cl"
                      placeholderTextColor="#94A3B8"
                      value={recupEmail}
                      onChangeText={setRecupEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, cargando && styles.btnDisabled]}
                  onPress={handleRecuperarPassword}
                  disabled={cargando}
                  activeOpacity={0.8}
                >
                  {cargando ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Enviar Enlace de Recuperación</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1B2B4B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActivo: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextoActivo: {
    color: '#1B2B4B',
    fontWeight: '700',
  },
  form: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 4,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  primaryBtn: {
    backgroundColor: '#1B2B4B',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1B2B4B',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
