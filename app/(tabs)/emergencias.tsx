import { supabase } from '@/constants/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
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

  const motivos = ['Salud', 'Imprevisto Personal', 'Atraso (>15 min)'];
  const bloques = ['Todo el día', 'Solo mañana', 'Solo tarde'];

  // Notificación universal para Web y Móvil
  const mostrarMensaje = (titulo: string, mensaje: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}: ${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  };

  // Cargar avisos del profesor desde Supabase
  const cargarHistorial = async () => {
    try {
      setCargandoHistorial(true);
      const sesionString = await AsyncStorage.getItem('profesor_sesion');
      const profesor = sesionString ? JSON.parse(sesionString) : null;

      let query = supabase
        .from('incidencias')
        .select('*')
        .order('created_at', { ascending: false });

      if (profesor?.id) {
        query = query.eq('profesor_id', profesor.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error al cargar historial:', error.message);
      } else {
        setHistorial(data || []);
      }
    } catch (err) {
      console.error('Error en cargarHistorial:', err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  // Enviar aviso a Supabase
  const handleEnviar = async () => {
    try {
      setEnviando(true);

      const sesionString = await AsyncStorage.getItem('profesor_sesion');
      const profesor = sesionString ? JSON.parse(sesionString) : null;
      const ahora = new Date().toISOString();

      const { error } = await supabase.from('incidencias').insert([
        {
          profesor_id: profesor?.id || null,
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
        }
      ]);

      if (error) {
        throw error;
      }

      mostrarMensaje(
        'Alerta Enviada',
        'Tu aviso de emergencia ha sido notificado a UTP. Buscaremos un reemplazo a la brevedad.'
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
        const { error } = await supabase
          .from('incidencias')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setHistorial((prev) => prev.filter((item) => item.id !== id));
      } catch (err: any) {
        console.error('Error al eliminar aviso:', err);
        mostrarMensaje('Error', 'No se pudo eliminar el aviso: ' + (err.message || ''));
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Deseas anular y eliminar este aviso de emergencia?')) {
        confirmarYBorrar();
      }
    } else {
      Alert.alert(
        'Eliminar Aviso',
        '¿Deseas anular y eliminar este reporte de emergencia?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: confirmarYBorrar }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Reportar Emergencia</Text>
          <Text style={styles.subtitle}>Notifica a UTP para gestionar tu reemplazo</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>1. Selecciona el motivo</Text>
          <View style={styles.opcionesContainer}>
            {motivos.map((motivo) => (
              <TouchableOpacity 
                key={motivo} 
                style={[styles.opcionBtn, motivoSeleccionado === motivo && styles.opcionBtnActiva]}
                onPress={() => setMotivoSeleccionado(motivo)}
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
              >
                <Text style={[styles.opcionTexto, bloquesAfectados === bloque && styles.opcionTextoActivo]}>
                  {bloque}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>3. Detalles adicionales (Opcional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ej: Dejé material de trabajo en la sala de profesores..."
            placeholderTextColor="#999"
            multiline={true}
            numberOfLines={3}
            value={detalles}
            onChangeText={setDetalles}
          />

          <TouchableOpacity 
            style={[styles.submitBtn, enviando && styles.submitBtnDeshabilitado]} 
            onPress={handleEnviar}
            disabled={enviando}
          >
            {enviando ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>🚨 Enviar Alerta de Emergencia</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Tus avisos recientes</Text>
        
        {cargandoHistorial ? (
          <ActivityIndicator size="small" color="#1B2B4B" style={{ marginVertical: 15 }} />
        ) : historial.length === 0 ? (
          <Text style={styles.textoVacio}>No tienes avisos registrados aún.</Text>
        ) : (
          historial.map((item) => (
            <View key={item.id} style={styles.historialCard}>
              <View style={styles.historialHeader}>
                <Text style={styles.historialFecha}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Hoy'} - {item.motivo}
                </Text>
                
                <View style={styles.accionesHeader}>
                  <Text style={[
                    styles.badge, 
                    item.estado?.toLowerCase() === 'cubierto' ? styles.badgeSuccess : styles.badgePendiente
                  ]}>
                    {item.estado ? item.estado.charAt(0).toUpperCase() + item.estado.slice(1) : 'Pendiente'}
                  </Text>

                  <TouchableOpacity 
                    onPress={() => handleEliminar(item.id)}
                    style={styles.btnEliminar}
                    accessibilityLabel="Eliminar aviso"
                  >
                    <Text style={styles.btnEliminarTexto}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.historialReemplazo}>
                Reemplazo asignado: {item.reemplazo || 'Por asignar'}
              </Text>
              {item.detalles ? (
                <Text style={styles.historialDetalles}>Nota: {item.detalles}</Text>
              ) : null}
            </View>
          ))
        )}

        <View style={styles.espacioFinal} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F9' },
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E74C3C' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  formCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: 'bold', color: '#1B2B4B', marginBottom: 10, marginTop: 10 },
  opcionesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  opcionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F0F4F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    cursor: 'pointer' as any,
  },
  opcionBtnActiva: {
    backgroundColor: '#1B2B4B',
    borderColor: '#1B2B4B',
  },
  opcionTexto: { fontSize: 13, color: '#555' },
  opcionTextoActivo: { color: 'white', fontWeight: 'bold' },
  textArea: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    height: 80,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#E74C3C',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
    cursor: 'pointer' as any,
  },
  submitBtnDeshabilitado: {
    backgroundColor: '#F29F96',
  },
  submitBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B2B4B', marginBottom: 15 },
  historialCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
    marginBottom: 15,
  },
  historialHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  historialFecha: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  accionesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, overflow: 'hidden', fontWeight: 'bold' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  badgePendiente: { backgroundColor: '#FFF3E0', color: '#E65100' },
  btnEliminar: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    cursor: 'pointer' as any,
  },
  btnEliminarTexto: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 12,
  },
  historialReemplazo: { fontSize: 13, color: '#666', marginTop: 2 },
  historialDetalles: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 4 },
  textoVacio: { color: '#999', fontSize: 14, textAlign: 'center', marginVertical: 15 },
  espacioFinal: { height: 40 }
});