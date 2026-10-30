import { supabase } from '@/constants/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
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
  const [docente, setDocente] = useState<ProfesorSesion | null>(null);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);

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

  return (
    <View style={styles.container}>
      {/* Encabezado con datos del profesor logueado */}
      <View style={styles.header}>
        <Text style={styles.saludo}>
          ¡Hola, {docente?.nombre ? `${docente.nombre} ${docente.apellido || ''}`.trim() : 'Docente'}!
        </Text>
        <Text style={styles.subtitulo}>Panel de Comunicados y Novedades</Text>
      </View>

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
  container: { flex: 1, backgroundColor: '#F4F7F9' },
  header: {
    backgroundColor: '#1B2B4B',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  saludo: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  subtitulo: { fontSize: 13, color: '#CBD5E1', marginTop: 4 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cargandoTexto: { marginTop: 10, color: '#666', fontSize: 14 },
  listContainer: { padding: 16, paddingBottom: 30 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderLeftWidth: 4,
  },
  cardNormal: { borderLeftColor: '#3B82F6' },
  cardUrgente: { borderLeftColor: '#EF4444' },
  badgeFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  badge: { fontSize: 10, fontWeight: 'bold', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, overflow: 'hidden' },
  badgeNormal: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  badgeUrgente: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  fecha: { fontSize: 11, color: '#9CA3AF' },
  cardTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 6 },
  cardContenido: { fontSize: 13, color: '#475569', lineHeight: 20 },
  vacioTexto: { textAlign: 'center', marginTop: 40, color: '#94A3B8', fontSize: 14 }
});