import { supabase } from '@/constants/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Incidencia {
  id: string;
  motivo: string;
  bloques?: string;
  detalles?: string;
  estado: string;
  reemplazo?: string;
  created_at: string;
}

export default function EmergenciasScreen() {
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('Salud');
  const [bloquesAfectados, setBloquesAfectados] = useState('Todo el día');
  const [detalles, setDetalles] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [historial, setHistorial] = useState<Incidencia[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const motivos = ['Salud', 'Imprevisto Personal', 'Atraso (>15 min)'];
  const bloques = ['Todo el día', 'Solo mañana', 'Solo tarde'];

  const mostrarMensaje = (titulo: string, mensaje: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}: ${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje, [{ text: 'Entendido' }]);
    }
  };

  // Helper para asegurar el ID del profesor
  const obtenerProfesorId = async (): Promise<string | null> => {
    try {
      const sesionString = await AsyncStorage.getItem('profesor_sesion');
      const profesor = sesionString ? JSON.parse(sesionString) : null;

      if (profesor?.docenteId) return profesor.docenteId;
      if (profesor?.id && !profesor.id.includes('-')) return profesor.id;

      if (profesor?.email) {
        const { data } = await supabase
          .from('docentes')
          .select('id')
          .eq('email', profesor.email)
          .maybeSingle();

        if (data?.id) return data.id;
      }
      return profesor?.id || null;
    } catch {
      return null;
    }
  };

  // Cargar avisos del profesor desde Supabase
  const cargarHistorial = async () => {
    try {
      setCargandoHistorial(true);
      const profId = await obtenerProfesorId();

      let query = supabase
        .from('incidencias')
        .select('*')
        .order('created_at', { ascending: false });

      if (profId) {
        query = query.eq('profesor_id', profId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error al cargar incidencias:', error.message);
      } else {
        setHistorial(data || []);
      }
    } catch (err) {
      console.error('Error de red al consultar incidencias:', err);
    } finally {
      setCargandoHistorial(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const onRefresh = () => {
    setRefrescando(true);
    cargarHistorial();
  };

  // Enviar aviso a Supabase
  const handleEnviar = async () => {
    try {
      setEnviando(true);
      const profId = await obtenerProfesorId();
      const ahora = new Date().toISOString();

      const { error } = await supabase.from('incidencias').insert([
        {
          profesor_id: profId,
          tipo: motivoSeleccionado,
          motivo: motivoSeleccionado,
          bloques: bloquesAfectados,
          detalles: detalles.trim() || null,
          descripcion: `Bloques: ${bloquesAfectados}${detalles.trim() ? ` - ${detalles.trim()}` : ''}`,
          estado: 'pendiente',
          reemplazo: 'Por asignar',
          fecha_inicio: ahora,
          fecha_fin: ahora,
          fecha_reporte: ahora,
          created_at: ahora,
        },
      ]);

      if (error) throw error;

      mostrarMensaje(
        'Alerta Enviada',
        'Tu aviso de emergencia ha sido notificado a UTP para gestionar tu reemplazo a la brevedad.'
      );

      setDetalles('');
      cargarHistorial();
    } catch (err: any) {
      console.error('Error al registrar incidencia:', err);
      mostrarMensaje('Error', err?.message || 'No fue posible registrar la emergencia.');
    } finally {
      setEnviando(false);
    }
  };

  // Eliminar un aviso de Supabase y del estado local
  const handleEliminar = async (id: string) => {
    const confirmarYBorrar = async () => {
      try {
        const { error } = await supabase.from('incidencias').delete().eq('id', id);
        if (error) throw error;

        setHistorial((prev) => prev.filter((item) => item.id !== id));
      } catch (err: any) {
        console.error('Error al eliminar aviso:', err);
        mostrarMensaje('Error', 'No se pudo eliminar el aviso.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Deseas anular y eliminar este reporte de emergencia?')) {
        confirmarYBorrar();
      }
    } else {
      Alert.alert(
        'Eliminar Aviso',
        '¿Deseas anular y eliminar este reporte de emergencia?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: confirmarYBorrar },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Reportar Emergencia</Text>
          <Text style={styles.subtitle}>Notifica a UTP para gestionar oportunamente tu reemplazo</Text>
        </View>

        {/* Tarjeta de Formulario */}
        <View style={styles.formCard}>
          <Text style={styles.label}>1. Selecciona el motivo</Text>
          <View style={styles.opcionesContainer}>
            {motivos.map((motivo) => (
              <TouchableOpacity
                key={motivo}
                style={[styles.opcionBtn, motivoSeleccionado === motivo && styles.opcionBtnActiva]}
                onPress={() => setMotivoSeleccionado(motivo)}
                activeOpacity={0.7}
              >
                <Text style={[styles.opcionTexto, motivoSeleccionado === motivo && styles.opcionTextoActivo]}>
                  {motivo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>2. Bloques afectados (Hoy)</Text>
          <View style={styles.opcionesContainer}>
            {bloques.map((bloque) => (
              <TouchableOpacity
                key={bloque}
                style={[styles.opcionBtn, bloquesAfectados === bloque && styles.opcionBtnActiva]}
                onPress={() => setBloquesAfectados(bloque)}
                activeOpacity={0.7}
              >
                <Text style={[styles.opcionTexto, bloquesAfectados === bloque && styles.opcionTextoActivo]}>
                  {bloque}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>3. Detalles adicionales (Opcional)</Text>
          <TextInput
            style={styles.inputArea}
            placeholder="Ej: Licencia médica en trámite, esperando confirmación de horas médicas..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={detalles}
            onChangeText={setDetalles}
          />

          <TouchableOpacity
            style={[styles.submitBtn, enviando && styles.submitBtnDeshabilitado]}
            onPress={handleEnviar}
            disabled={enviando}
            activeOpacity={0.7}
          >
            {enviando ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>Notificar Emergencia a UTP</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Historial de Avisos */}
        <View style={styles.historialContainer}>
          <Text style={styles.sectionTitle}>Tus avisos recientes</Text>

          {cargandoHistorial ? (
            <ActivityIndicator size="small" color="#1B2B4B" style={{ marginVertical: 20 }} />
          ) : historial.length === 0 ? (
            <View style={styles.vacioContainer}>
              <Ionicons name="shield-checkmark-outline" size={32} color="#94A3B8" />
              <Text style={styles.textoVacio}>No tienes incidencias registradas.</Text>
            </View>
          ) : (
            historial.map((item) => (
              <View key={item.id} style={styles.historialCard}>
                <View style={styles.historialHeader}>
                  <Text style={styles.historialFecha}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Hoy'} • {item.motivo}
                  </Text>

                  <View style={styles.accionesHeader}>
                    <Text
                      style={[
                        styles.badge,
                        item.estado?.toLowerCase() === 'cubierto'
                          ? styles.badgeSuccess
                          : styles.badgePendiente,
                      ]}
                    >
                      {item.estado ? item.estado.toUpperCase() : 'PENDIENTE'}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleEliminar(item.id)}
                      style={styles.btnEliminar}
                      accessibilityLabel="Eliminar aviso"
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.historialReemplazo}>
                  Reemplazo: <Text style={{ fontWeight: '600', color: '#334155' }}>{item.reemplazo || 'Por asignar'}</Text>
                </Text>

                {item.detalles ? (
                  <Text style={styles.historialDetalles}>Nota: {item.detalles}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#1B2B4B', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500' },
  formCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8, marginTop: 6 },
  opcionesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  opcionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    cursor: 'pointer' as any,
  },
  opcionBtnActiva: {
    backgroundColor: '#1B2B4B',
    borderColor: '#1B2B4B',
  },
  opcionTexto: { fontSize: 13, color: '#475569', fontWeight: '500' },
  opcionTextoActivo: { color: '#FFFFFF', fontWeight: '700' },
  inputArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    textAlignVertical: 'top',
    minHeight: 75,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    cursor: 'pointer' as any,
    shadowColor: '#DC2626',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  submitBtnDeshabilitado: { backgroundColor: '#FCA5A5' },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  historialContainer: { marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1B2B4B', marginBottom: 12 },
  historialCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historialFecha: { fontWeight: '700', color: '#1E293B', fontSize: 13 },
  accionesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    fontWeight: '800',
  },
  badgeSuccess: { backgroundColor: '#DCFCE7', color: '#15803D' },
  badgePendiente: { backgroundColor: '#FEF3C7', color: '#B45309' },
  btnEliminar: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    cursor: 'pointer' as any,
  },
  historialReemplazo: { fontSize: 13, color: '#64748B', marginTop: 2 },
  historialDetalles: { fontSize: 12, color: '#475569', fontStyle: 'italic', marginTop: 4 },
  vacioContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textoVacio: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 8 },
});
