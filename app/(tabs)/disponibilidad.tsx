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

const DIAS_MAP_REV: Record<string, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
};

const DIAS_MAP_FWD: Record<string, string> = {
  Lunes: 'LUNES',
  Martes: 'MARTES',
  Miércoles: 'MIERCOLES',
  Jueves: 'JUEVES',
  Viernes: 'VIERNES',
};

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

  // Helper para asegurar el ID del profesor y su institución
  const obtenerProfesorYInstitucion = async (): Promise<{
    profId: string;
    institucionId: string | null;
  } | null> => {
    try {
      const sesionString = await AsyncStorage.getItem('profesor_sesion');
      const profesor = sesionString ? JSON.parse(sesionString) : null;

      let profId =
        profesor?.docenteId || (profesor?.id && !profesor.id.includes('-') ? profesor.id : null);
      let institucionId = profesor?.institucionId || null;

      if (profesor?.email && (!profId || !institucionId)) {
        const { data } = await supabase
          .from('docentes')
          .select('id, institucionId')
          .eq('email', profesor.email)
          .maybeSingle();

        if (data?.id) {
          profId = data.id;
          institucionId = data.institucionId;
        }
      }

      if (!profId && profesor?.id) profId = profesor.id;
      return profId ? { profId, institucionId } : null;
    } catch {
      return null;
    }
  };

  // Cargar restricciones desde disponibilidades_docentes y tabla disponibilidad
  const cargarRestricciones = async () => {
    try {
      setCargando(true);
      const profInfo = await obtenerProfesorYInstitucion();

      if (profInfo?.profId) {
        // 1. Intentar cargar desde disponibilidades_docentes (tabla del motor web)
        const { data: dispDocs, error: errDisp } = await supabase
          .from('disponibilidades_docentes')
          .select(`
            id,
            disponible,
            bloqueHorarioId,
            bloques_horarios (diaSemana, numeroBloque, horaInicio, horaFin)
          `)
          .eq('docenteId', profInfo.profId);

        if (!errDisp && dispDocs && dispDocs.length > 0) {
          // Obtener todos los bloques de la institución para saber cuáles quedaron no disponibles
          let todosLosBloques: any[] = [];
          if (profInfo.institucionId) {
            const { data: bData } = await supabase
              .from('bloques_horarios')
              .select('id, diaSemana, numeroBloque, horaInicio, horaFin')
              .eq('institucionId', profInfo.institucionId)
              .eq('esRecreo', false);
            todosLosBloques = bData || [];
          }

          const agrupados: { [dia: string]: string[] } = {
            Lunes: [],
            Martes: [],
            Miércoles: [],
            Jueves: [],
            Viernes: [],
          };

          const disponiblesIds = new Set(
            dispDocs
              .filter((d: any) => d.disponible)
              .map((d: any) => d.bloqueHorarioId)
          );

          if (todosLosBloques.length > 0) {
            // Si hay bloques de institución, los que NO están disponibles son bloqueados
            todosLosBloques.forEach((b: any) => {
              const dia = DIAS_MAP_REV[b.diaSemana];
              if (dia && !disponiblesIds.has(b.id)) {
                const bloqueLabel = BLOQUES_ESTANDAR[b.numeroBloque - 1] || `${b.horaInicio} - ${b.horaFin}`;
                if (!agrupados[dia].includes(bloqueLabel)) {
                  agrupados[dia].push(bloqueLabel);
                }
              }
            });
          } else {
            // Si no tenemos la lista institucional completa, considerar bloqueados los marcados con disponible = false
            dispDocs.forEach((d: any) => {
              if (d.disponible === false && d.bloques_horarios) {
                const dia = DIAS_MAP_REV[d.bloques_horarios.diaSemana];
                const bNum = d.bloques_horarios.numeroBloque;
                if (dia && bNum && BLOQUES_ESTANDAR[bNum - 1]) {
                  agrupados[dia].push(BLOQUES_ESTANDAR[bNum - 1]);
                }
              }
            });
          }

          setBloquesBloqueados(agrupados);
          return;
        }

        // 2. Fallback: consultar tabla disponibilidad simple
        const { data: dataSimple, error: errorSimple } = await supabase
          .from('disponibilidad')
          .select('dia, bloque')
          .eq('profesor_id', profInfo.profId);

        if (!errorSimple && dataSimple && dataSimple.length > 0) {
          const agrupados: { [dia: string]: string[] } = {
            Lunes: [],
            Martes: [],
            Miércoles: [],
            Jueves: [],
            Viernes: [],
          };
          dataSimple.forEach((item: { dia: string; bloque: string }) => {
            if (agrupados[item.dia]) {
              agrupados[item.dia].push(item.bloque);
            }
          });
          setBloquesBloqueados(agrupados);
          return;
        }
      }

      // 3. Respaldo local desde AsyncStorage
      const cache = await AsyncStorage.getItem('restricciones_horario');
      if (cache) {
        setBloquesBloqueados(JSON.parse(cache));
      }
    } catch (err) {
      console.error('Error al cargar disponibilidad:', err);
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

  // Guardar disponibilidad en disponibilidades_docentes y tabla disponibilidad
  const handleGuardar = async () => {
    try {
      setGuardando(true);
      const profInfo = await obtenerProfesorYInstitucion();

      // Guardar respaldo local
      await AsyncStorage.setItem('restricciones_horario', JSON.stringify(bloquesBloqueados));

      if (profInfo?.profId) {
        const profId = profInfo.profId;

        // 1. Guardar en tabla disponibilidad (historial rápido)
        await supabase.from('disponibilidad').delete().eq('profesor_id', profId);

        const registrosSimples: { profesor_id: string; dia: string; bloque: string }[] = [];
        Object.entries(bloquesBloqueados).forEach(([dia, bloques]) => {
          bloques.forEach((bloque) => {
            registrosSimples.push({
              profesor_id: profId,
              dia,
              bloque,
            });
          });
        });

        if (registrosSimples.length > 0) {
          await supabase.from('disponibilidad').insert(registrosSimples);
        }

        // 2. Guardar en disponibilidades_docentes (tabla oficial consumida por el motor web de horarios)
        let institucionId = profInfo.institucionId;
        if (!institucionId) {
          const { data: dRow } = await supabase
            .from('docentes')
            .select('institucionId')
            .eq('id', profId)
            .maybeSingle();
          institucionId = dRow?.institucionId || null;
        }

        if (institucionId) {
          // Traer los bloques horarios de la institución
          const { data: bloquesInst } = await supabase
            .from('bloques_horarios')
            .select('id, diaSemana, numeroBloque')
            .eq('institucionId', institucionId)
            .eq('esRecreo', false);

          if (bloquesInst && bloquesInst.length > 0) {
            // Eliminar registros previos en disponibilidades_docentes
            await supabase.from('disponibilidades_docentes').delete().eq('docenteId', profId);

            // Preparar las filas con disponible = true para los bloques NO bloqueados
            const filasDisponibilidad: {
              id: string;
              docenteId: string;
              bloqueHorarioId: string;
              disponible: boolean;
            }[] = [];

            bloquesInst.forEach((b: any, idx: number) => {
              const diaNombre = DIAS_MAP_REV[b.diaSemana];
              const bloqueLabel = BLOQUES_ESTANDAR[b.numeroBloque - 1];

              // Si el bloque NO está en la lista de bloqueados, el docente está DISPONIBLE
              const estaBloqueado =
                diaNombre && bloqueLabel && bloquesBloqueados[diaNombre]?.includes(bloqueLabel);

              filasDisponibilidad.push({
                id: `disp_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
                docenteId: profId,
                bloqueHorarioId: b.id,
                disponible: !estaBloqueado,
              });
            });

            if (filasDisponibilidad.length > 0) {
              const { error: errDispInsert } = await supabase
                .from('disponibilidades_docentes')
                .insert(filasDisponibilidad);

              if (errDispInsert) {
                console.error('Error al sincronizar con disponibilidades_docentes:', errDispInsert.message);
              }
            }
          }
        }
      }

      mostrarMensaje(
        'Disponibilidad Sincronizada',
        'Tus preferencias de disponibilidad han sido registradas y enviadas directamente a la plataforma web de UTP.'
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
              Tienes <Text style={{ fontWeight: '700' }}>{totalBloqueados}</Text> módulos bloqueados para UTP
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
            <Text style={styles.bloqueHint}>Toca para bloquear o liberar</Text>
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
                      name={estaBloqueado ? 'close-circle' : 'checkmark-circle-outline'}
                      size={15}
                      color={estaBloqueado ? '#FFFFFF' : '#10B981'}
                    />
                    <Text style={[styles.textoRestriccion, estaBloqueado && styles.textoRestriccionActivo]}>
                      {estaBloqueado ? 'Bloqueado' : 'Disponible'}
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
            <Text style={styles.submitBtnText}>Guardar Disponibilidad para Planificación UTP</Text>
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
  },
  resumenTexto: { fontSize: 12, color: '#1E40AF', fontWeight: '500' },
  diasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#E2E8F0',
    padding: 4,
    borderRadius: 12,
  },
  diaBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  diaBtnActivo: { backgroundColor: '#FFFFFF', elevation: 2 },
  diaTexto: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  diaTextoActivo: { color: '#1B2B4B', fontWeight: '700' },
  contadorDia: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  contadorDiaActivo: { backgroundColor: '#EF4444' },
  contadorDiaTexto: { fontSize: 9, fontWeight: '700', color: '#DC2626' },
  contadorDiaTextoActivo: { color: '#FFFFFF' },
  bloquesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  bloquesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 6,
  },
  bloqueTitle: { fontSize: 14, fontWeight: '700', color: '#1B2B4B' },
  bloqueHint: { fontSize: 11, color: '#94A3B8' },
  filaBloque: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  bloqueInfo: { flex: 1 },
  bloqueNumero: { fontSize: 13, fontWeight: '700', color: '#334155' },
  textoBloque: { fontSize: 11, color: '#64748B', marginTop: 1 },
  textoBloqueBloqueado: { color: '#DC2626', textDecorationLine: 'line-through' },
  btnRestriccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  btnRestriccionActivo: { backgroundColor: '#EF4444', borderColor: '#DC2626' },
  textoRestriccion: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  textoRestriccionActivo: { color: '#FFFFFF' },
  submitBtn: {
    backgroundColor: '#1B2B4B',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1B2B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnDeshabilitado: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
