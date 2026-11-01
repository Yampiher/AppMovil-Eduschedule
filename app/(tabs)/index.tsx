import { supabase } from '@/constants/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface Comunicado {
  id: number | string;
  titulo: string;
  mensaje?: string;
  contenido?: string;
  tipo: string;
  fecha_publicacion: string;
}

interface ProfesorSesion {
  nombre: string;
  apellido: string;
  email: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [docente, setDocente] = useState<ProfesorSesion | null>(null);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);
  const [mostrarModalCerrar, setMostrarModalCerrar] = useState<boolean>(false);

  // 1. Cargar la sesión guardada en AsyncStorage
  const cargarSesion = async () => {
    try {
      const sesionData = await AsyncStorage.getItem('profesor_sesion');
      if (sesionData) {
        setDocente(JSON.parse(sesionData));
      }
    } catch (error) {
      console.error('Error al recuperar sesión:', error);
    }
  };

  // 2. Traer comunicados activos desde Supabase
  const obtenerComunicados = async () => {
    try {
      const { data, error } = await supabase
        .from('comunicados')
        .select('*')
        .eq('activo', true)
        .order('fecha_publicacion', { ascending: false });

      if (error) {
        console.error('Error al traer comunicados:', error.message);
      } else {
        setComunicados(data || []);
      }
    } catch (err) {
      console.error('Error de red al consultar comunicados:', err);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarSesion();
    obtenerComunicados();
  }, []);

  const onRefresh = () => {
    setRefrescando(true);
    obtenerComunicados();
  };

  // 3. Ejecución inmediata al confirmar el cierre de sesión
  const ejecutarCierreSesion = async () => {
    try {
      setMostrarModalCerrar(false);

      // Borrar datos de sesión del almacenamiento local
      await AsyncStorage.removeItem('profesor_sesion');

      // Cerrar sesión en Supabase en segundo plano
      supabase.auth.signOut().catch(() => {});

      // Salir limpiamente hacia la pantalla de Login
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      router.replace('/login');
    }
  };

  return (
    <View style={styles.container}>
      {/* Encabezado Principal */}
      <View style={styles.header}>
        {/* Barra superior con distintivo y botón estilizado de Cerrar Sesión */}
        <View style={styles.topBar}>
          <View style={styles.badgeDocente}>
            <Ionicons name="school-outline" size={14} color="#93C5FD" />
            <Text style={styles.badgeDocenteTexto}>Docente</Text>
          </View>

          <TouchableOpacity
            style={styles.btnLogout}
            onPress={() => setMostrarModalCerrar(true)}
            activeOpacity={0.7}
            accessibilityLabel="Cerrar sesión"
          >
            <Ionicons name="log-out-outline" size={16} color="#FCA5A5" />
            <Text style={styles.btnLogoutTexto}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Saludo y subtítulo */}
        <View style={styles.saludoContainer}>
          <Text style={styles.saludo}>
            ¡Hola, {docente?.nombre ? `${docente.nombre} ${docente.apellido || ''}`.trim() : 'Docente'}!
          </Text>
          <Text style={styles.subtitulo}>Panel de Comunicados y Novedades</Text>
        </View>
      </View>

      {/* Modal de Confirmación Elegante (Universal Web y Móvil) */}
      <Modal
        visible={mostrarModalCerrar}
        transparent
        animationType="fade"
        onRequestClose={() => setMostrarModalCerrar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Ionicons name="log-out-outline" size={32} color="#DC2626" />
            </View>

            <Text style={styles.modalTitle}>¿Cerrar Sesión?</Text>
            <Text style={styles.modalMessage}>
              ¿Estás seguro de que deseas salir? Tendrás que volver a ingresar tus credenciales para acceder.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setMostrarModalCerrar(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnConfirmar}
                onPress={ejecutarCierreSesion}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnConfirmarTexto}>Sí, Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#1B2B4B" />
          <Text style={styles.cargandoTexto}>Cargando comunicados...</Text>
        </View>
      ) : (
        <FlatList
          data={comunicados}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.vacioTexto}>No hay comunicados vigentes en este momento.</Text>
          }
          renderItem={({ item }) => {
            const esUrgente = item.tipo?.toLowerCase() === 'urgente';
            const textoMensaje = item.mensaje || item.contenido;

            return (
              <View style={[styles.card, esUrgente ? styles.cardUrgente : styles.cardNormal]}>
                <View style={styles.badgeFila}>
                  <Text style={[styles.badge, esUrgente ? styles.badgeUrgente : styles.badgeNormal]}>
                    {(item.tipo || 'General').toUpperCase()}
                  </Text>
                  <Text style={styles.fecha}>
                    {item.fecha_publicacion
                      ? new Date(item.fecha_publicacion).toLocaleDateString()
                      : ''}
                  </Text>
                </View>

                <Text style={styles.cardTitulo}>{item.titulo}</Text>

                {textoMensaje ? (
                  <Text style={styles.cardContenido}>{textoMensaje}</Text>
                ) : null}
              </View>
            );
          }}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#1B2B4B',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeDocente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.3)',
  },
  badgeDocenteTexto: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '600',
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    cursor: 'pointer' as any,
  },
  btnLogoutTexto: {
    color: '#FECACA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  saludoContainer: {
    marginTop: 2,
  },
  saludo: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitulo: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    maxWidth: 380,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtnCancelar: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  modalBtnCancelarTexto: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBtnConfirmar: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  modalBtnConfirmarTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cargandoTexto: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 4,
  },
  cardNormal: {
    borderLeftColor: '#3B82F6',
  },
  cardUrgente: {
    borderLeftColor: '#EF4444',
  },
  badgeFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  badgeNormal: {
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
  },
  badgeUrgente: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
  },
  fecha: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cardTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    lineHeight: 22,
  },
  cardContenido: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  vacioTexto: {
    textAlign: 'center',
    marginTop: 40,
    color: '#94A3B8',
    fontSize: 14,
  },
});
