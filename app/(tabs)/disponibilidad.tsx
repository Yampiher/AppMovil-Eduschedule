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
  TouchableOpacity,
  View
} from 'react-native';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const BLOQUES_ESTANDAR = [
  '08:00 - 09:30',
  '09:45 - 11:15',
  '11:30 - 13:00',
  '14:00 - 15:30',
  '15:45 - 17:15',
];

export default function DisponibilidadScreen() {
  const [diaSeleccionado, setDiaSeleccionado] = useState('Lunes');
  const [bloquesBloqueados, setBloquesBloqueados] = useState<{ [dia: string]: string[] }>({
    Lunes: [],
    Martes: [],
    Miércoles: [],
    Jueves: [],
    Viernes: [],
  });
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

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

  // Cargar restricciones previas desde Supabase
  const cargarRestricciones = async () => {
    try {
      setCargando(true);
      const profId = await obtenerProfesorId();

      if (profId) {
        const { data, error } = await supabase
          .from('disponibilidad')
          .select('dia, bloque')
          .eq('profesor_id', profId);

        if (!error && data && data.length > 0) {
          const agrupados: { [dia: string]: string[] } = {
            Lunes: [],
            Martes: [],
            Miércoles: [],
            Jueves: [],
            Viernes: [],
          };
          data.forEach((item: { dia: string; bloque: string }) => {
            if (agrupados[item.dia]) {
              agrupados[item.dia].push(item.bloque);
            }
          });
          setBloquesBloqueados(agrupados);
          return;
        }
      }

      // Si no hay datos en Supabase, cargar de AsyncStorage
      const cache = await AsyncStorage.getItem('restricciones_horario');
      if (cache) {
        setBloquesBloqueados(JSON.parse(cache));
      }
    } catch (err) {
      console.error('Error al cargar restricciones:', err);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarRestricciones();
  }, []);

  const onRefresh = () => {
    setRefrescando(true);
    cargarRestricciones();
  };

  // Alternar bloqueo/desbloqueo
  const toggleBloque = (bloque: string) => {
    setBloquesBloqueados((prev) => {
      const listaDia = prev[diaSeleccionado] || [];
      const yaBloqueado = listaDia.includes(bloque);

      const nuevaLista = yaBloqueado
        ? listaDia.filter((b) => b !== bloque)
        : [...listaDia, bloque];

      return {
        ...prev,
        [diaSeleccionado]: nuevaLista,
      };
    });
  };

  // Guardar restricciones en Supabase
  const handleGuardar = async () => {
    try {
      setGuardando(true);
      const profId = await obtenerProfesorId();

      // Guardar respaldo local
      await AsyncStorage.setItem('restricciones_horario', JSON.stringify(bloquesBloqueados));

      if (profId) {
        // 1. Eliminar restricciones previas del docente
        await supabase.from('disponibilidad').delete().eq('profesor_id', profId);

        // 2. Preparar registros a insertar
        const registros: { profesor_id: string; dia: string; bloque: string }[] = [];
        Object.entries(bloquesBloqueados).forEach(([dia, bloques]) => {
          bloques.forEach((bloque) => {
            registros.push({
              profesor_id: profId,
              dia,
              bloque,
            });
          });
        });

        if (registros.length > 0) {
          const { error } = await supabase.from('disponibilidad').insert(registros);
          if (error) throw error;
        }
      }

      mostrarMensaje(
        'Disponibilidad Guardada',
        'Tus preferencias de disponibilidad han sido registradas para la planificación de UTP.'
      );
    } catch (err: any) {
      console.error('Error al guardar restricciones:', err);
      mostrarMensaje('Error', err?.message || 'No fue posible guardar las restricciones.');
    } finally {
      setGuardando(false);
    }
  };

  const bloquesDelDia = bloquesBloqueados[diaSeleccionado] || [];
  const totalBloqueados = Object.values(bloquesBloqueados).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Declarar Disponibilidad</Text>
          <Text style={styles.subtitle}>
            Bloquea los módulos en los que NO tienes disponibilidad para hacer clases este semestre.
          </Text>

          {/* Resumen de bloqueos */}
          <View style={styles.resumenBadge}>
            <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
            <Text style={styles.resumenTexto}>
              Tienes <Text style={{ fontWeight: '700' }}>{totalBloqueados}</Text> bloques restringidos en total
            </Text>
          </View>
        </View>

        {/* Selector de Días */}
        <View style={styles.diasContainer}>
          {DIAS.map((dia) => {
            const cantDia = bloquesBloqueados[dia]?.length || 0;
            const activo = diaSeleccionado === dia;

            return (
              <TouchableOpacity
                key={dia}
                style={[styles.diaBtn, activo && styles.diaBtnActivo]}
                onPress={() => setDiaSeleccionado(dia)}
                activeOpacity={0.7}
              >
                <Text style={[styles.diaTexto, activo && styles.diaTextoActivo]}>{dia}</Text>
                {cantDia > 0 && (
                  <View style={[styles.contadorDia, activo && styles.contadorDiaActivo]}>
                    <Text style={[styles.contadorDiaTexto, activo && styles.contadorDiaTextoActivo]}>
                      {cantDia}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tarjeta de Bloques */}
        <View style={styles.bloquesCard}>
          <View style={styles.bloquesHeader}>
            <Text style={styles.bloqueTitle}>Módulos del {diaSeleccionado}</Text>
            <Text style={styles.bloqueHint}>Toca para bloquear/liberar</Text>
          </View>

          {cargando ? (
            <ActivityIndicator size="small" color="#1B2B4B" style={{ marginVertical: 25 }} />
          ) : (
            BLOQUES_ESTANDAR.map((bloque, index) => {
              const estaBloqueado = bloquesDelDia.includes(bloque);

              return (
                <View key={index} style={styles.filaBloque}>
                  <View style={styles.bloqueInfo}>
                    <Text style={styles.bloqueNumero}>Módulo {index + 1}</Text>
                    <Text style={[styles.textoBloque, estaBloqueado && styles.textoBloqueBloqueado]}>
                      {bloque}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.btnRestriccion, estaBloqueado && styles.btnRestriccionActivo]}
                    onPress={() => toggleBloque(bloque)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={estaBloqueado ? 'close-circle' : 'add-circle-outline'}
                      size={15}
                      color={estaBloqueado ? '#FFFFFF' : '#DC2626'}
                    />
                    <Text style={[styles.textoRestriccion, estaBloqueado && styles.textoRestriccionActivo]}>
                      {estaBloqueado ? 'Restringido' : 'Bloquear'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Botón de Guardar */}
        <TouchableOpacity
          style={[styles.submitBtn, guardando && styles.submitBtnDeshabilitado]}
          onPress={handleGuardar}
          disabled={guardando}
          activeOpacity={0.7}
        >
          {guardando ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>Guardar Restricciones de Horario</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 18, marginTop: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#1B2B4B', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },
  resumenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  resumenTexto: { fontSize: 12, color: '#1E40AF' },
  diasContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  diaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    cursor: 'pointer' as any,
  },
  diaBtnActivo: { backgroundColor: '#1B2B4B', borderColor: '#1B2B4B' },
  diaTexto: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  diaTextoActivo: { color: '#FFFFFF' },
  contadorDia: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  contadorDiaActivo: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  contadorDiaTexto: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  contadorDiaTextoActivo: { color: '#FFFFFF' },
  bloquesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  bloquesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  bloqueTitle: { fontSize: 15, fontWeight: '700', color: '#1B2B4B' },
  bloqueHint: { fontSize: 11, color: '#94A3B8' },
  filaBloque: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  bloqueInfo: { justifyContent: 'center' },
  bloqueNumero: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  textoBloque: { fontSize: 14, color: '#334155', fontWeight: '500', marginTop: 2 },
  textoBloqueBloqueado: { color: '#DC2626', fontWeight: '700' },
  btnRestriccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    cursor: 'pointer' as any,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  btnRestriccionActivo: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  textoRestriccion: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  textoRestriccionActivo: { color: '#FFFFFF' },
  submitBtn: {
    backgroundColor: '#16A34A',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    cursor: 'pointer' as any,
    shadowColor: '#16A34A',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  submitBtnDeshabilitado: { backgroundColor: '#86EFAC' },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
});
