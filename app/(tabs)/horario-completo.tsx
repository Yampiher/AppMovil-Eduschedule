import { supabase } from '@/constants/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

interface ClaseAsignada {
  id: string | number;
  dia: string;
  horario: string;
  asignatura: string;
  curso: string;
  sala: string;
  colorHex?: string;
  horasPedagogicas?: number;
}

interface ProfesorSesion {
  id?: string;
  docenteId?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  horas_contratadas?: number;
  horasContrato?: number;
}

export default function HorarioCompletoScreen() {
  const [diaSeleccionado, setDiaSeleccionado] = useState('Lunes');
  const [profesor, setProfesor] = useState<ProfesorSesion | null>(null);
  const [clases, setClases] = useState<ClaseAsignada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Cargar perfil del docente y sus clases asignadas desde la base de datos central
  const cargarDocenteYHorario = async () => {
    try {
      setCargando(true);
      const sesionString = await AsyncStorage.getItem('profesor_sesion');
      const prof: ProfesorSesion | null = sesionString ? JSON.parse(sesionString) : null;
      setProfesor(prof);

      let targetDocenteId = prof?.id;

      // Si el id guardado no coincide o proviene de Auth (UUID), resolver el CUID de la tabla docentes
      if (prof?.email && (!targetDocenteId || (targetDocenteId.includes('-') && targetDocenteId.length === 36))) {
        const { data: docData } = await supabase
          .from('docentes')
          .select('id, horasContrato')
          .eq('email', prof.email)
          .maybeSingle();

        if (docData?.id) {
          targetDocenteId = docData.id;
          if (docData.horasContrato) {
            setProfesor((prev) =>
              prev
                ? { ...prev, id: docData.id, horasContrato: docData.horasContrato, horas_contratadas: docData.horasContrato }
                : null
            );
          }
        }
      }

      if (targetDocenteId) {
        // Consulta relacional sobre las asignaciones horarias del docente
        const { data: asignaciones, error: errorAsig } = await supabase
          .from('asignaciones_horarios')
          .select(`
            id,
            periodoAcademico,
            estado,
            docenteId,
            cursos (nombreCompleto, nivel, seccion),
            asignaturas (nombre, codigo, colorHex),
            espacios_fisicos (nombre, codigo),
            bloques_horarios (diaSemana, horaInicio, horaFin, numeroBloque)
          `)
          .eq('docenteId', targetDocenteId);

        if (errorAsig) {
          console.error('Error al consultar asignaciones:', errorAsig.message);
        }

        if (asignaciones && asignaciones.length > 0) {
          const diasMap: Record<string, string> = {
            LUNES: 'Lunes',
            MARTES: 'Martes',
            MIERCOLES: 'Miércoles',
            JUEVES: 'Jueves',
            VIERNES: 'Viernes',
            SABADO: 'Sábado',
            DOMINGO: 'Domingo',
          };

          const listaFormateada: ClaseAsignada[] = asignaciones.map((asig: any) => {
            const diaRaw = (asig.bloques_horarios?.diaSemana || '').toUpperCase();
            const dia = diasMap[diaRaw] || 'Lunes';
            const horaIni = asig.bloques_horarios?.horaInicio || '08:00';
            const horaFin = asig.bloques_horarios?.horaFin || '09:30';
            const asignatura = asig.asignaturas?.nombre || 'Asignatura';
            const curso =
              asig.cursos?.nombreCompleto ||
              `${asig.cursos?.nivel || ''} ${asig.cursos?.seccion || ''}`.trim() ||
              'Curso General';
            const sala = asig.espacios_fisicos?.nombre || asig.espacios_fisicos?.codigo || 'Aula';
            const colorHex = asig.asignaturas?.colorHex || '#2563EB';

            return {
              id: asig.id,
              dia,
              horario: `${horaIni} - ${horaFin}`,
              asignatura,
              curso,
              sala,
              colorHex,
              horasPedagogicas: 2,
            };
          });

          // Ordenar cronológicamente según la hora de inicio
          listaFormateada.sort((a, b) => a.horario.localeCompare(b.horario));
          setClases(listaFormateada);
        } else {
          setClases([]);
        }
      } else {
        setClases([]);
      }
    } catch (err) {
      console.error('Error al cargar horario del docente:', err);
      setClases([]);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarDocenteYHorario();
  }, []);

  const onRefresh = () => {
    setRefrescando(true);
    cargarDocenteYHorario();
  };

  // Cálculo de carga horaria semanal real
  const horasContrato = profesor?.horasContrato || profesor?.horas_contratadas || 44;

  // Cada bloque asignado de 90 minutos equivale a 1.5 horas cronológicas (2 horas pedagógicas de 45 min)
  const horasAsignadasAula = clases.length * 1.5;
  const horasDisponibles = Math.max(0, horasContrato - horasAsignadasAula);
  const pctAsignado = horasContrato > 0 ? Math.min(100, Math.round((horasAsignadasAula / horasContrato) * 100)) : 0;
  const pctDisponible = Math.max(0, 100 - pctAsignado);

  const clasesDelDia = clases.filter(
    (c) => c.dia?.toLowerCase() === diaSeleccionado.toLowerCase()
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.title}>Malla y Carga Académica</Text>
          <Text style={styles.subtitle}>
            Docente: {profesor?.nombre ? `${profesor.nombre} ${profesor.apellido || ''}`.trim() : 'Profesor'}
          </Text>

          {/* Resumen real de Carga Horaria */}
          <View style={styles.graficoContainer}>
            <View style={styles.graficoHeader}>
              <Text style={styles.graficoTitle}>Carga Horaria Semanal</Text>
              <Text style={styles.graficoTotalBadge}>{horasContrato} hrs contratadas</Text>
            </View>

            <View style={styles.barraFondo}>
              <View style={[styles.barraRelleno, { width: `${pctAsignado}%`, backgroundColor: '#2563EB' }]} />
              <View style={[styles.barraRelleno, { width: `${pctDisponible}%`, backgroundColor: '#CBD5E1' }]} />
            </View>

            <View style={styles.leyenda}>
              <View style={styles.leyendaItem}>
                <View style={[styles.puntoColor, { backgroundColor: '#2563EB' }]} />
                <Text style={styles.leyendaTexto}>
                  {horasAsignadasAula}h en Aula ({pctAsignado}%)
                </Text>
              </View>

              <View style={styles.leyendaItem}>
                <View style={[styles.puntoColor, { backgroundColor: '#94A3B8' }]} />
                <Text style={styles.leyendaTexto}>
                  {horasDisponibles}h Disponibles ({pctDisponible}%)
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Selector Horizontal de Días */}
        <View style={styles.diasContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollDias}
          >
            {DIAS_SEMANA.map((dia) => (
              <TouchableOpacity
                key={dia}
                style={[styles.diaBtn, diaSeleccionado === dia && styles.diaBtnActivo]}
                onPress={() => setDiaSeleccionado(dia)}
                activeOpacity={0.7}
              >
                <Text style={[styles.diaTexto, diaSeleccionado === dia && styles.diaTextoActivo]}>
                  {dia}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Listado de Clases o Estado Informativo */}
        <View style={styles.cuerpoContainer}>
          {cargando ? (
            <View style={styles.centrado}>
              <ActivityIndicator size="small" color="#1B2B4B" />
              <Text style={styles.cargandoTexto}>Consultando asignaciones...</Text>
            </View>
          ) : clasesDelDia.length > 0 ? (
            clasesDelDia.map((clase) => (
              <View key={clase.id} style={styles.claseCard}>
                <View style={styles.horaColumna}>
                  <Text style={styles.horaTexto}>{clase.horario.split(' - ')[0]}</Text>
                  <Text style={styles.horaTextoChico}>{clase.horario.split(' - ')[1]}</Text>
                </View>

                <View style={styles.infoColumna}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: clase.colorHex || '#2563EB' }} />
                    <Text style={styles.asignaturaTexto}>{clase.asignatura}</Text>
                  </View>
                  <Text style={styles.cursoTexto}>{clase.curso}</Text>
                  <View style={styles.detallesFila}>
                    <Text style={styles.detalleBadge}>Sala: {clase.sala}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.sinClasesContainer}>
              <View style={styles.sinClasesIcono}>
                <Ionicons name="calendar-clear-outline" size={38} color="#94A3B8" />
              </View>
              <Text style={styles.sinClasesTitulo}>Sin clases para el {diaSeleccionado}</Text>
              <Text style={styles.sinClasesTexto}>
                No tienes bloques lectivos registrados para este día. Una vez que UTP publique la malla definitiva del periodo, tus asignaciones aparecerán aquí en tiempo real.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1B2B4B', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500' },
  graficoContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  graficoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  graficoTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },
  graficoTotalBadge: {
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#EEF2FF',
    color: '#3730A3',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barraFondo: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  barraRelleno: { height: '100%' },
  leyenda: { flexDirection: 'row', justifyContent: 'space-between' },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  puntoColor: { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { fontSize: 12, color: '#475569', fontWeight: '500' },
  diasContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
  },
  scrollDias: { paddingHorizontal: 16, gap: 8 },
  diaBtn: {
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    cursor: 'pointer' as any,
  },
  diaBtnActivo: { backgroundColor: '#1B2B4B' },
  diaTexto: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  diaTextoActivo: { color: '#FFFFFF' },
  cuerpoContainer: { padding: 16 },
  claseCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  horaColumna: {
    width: 75,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    paddingRight: 10,
    marginRight: 12,
  },
  horaTexto: { fontSize: 15, fontWeight: '700', color: '#1B2B4B' },
  horaTextoChico: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  infoColumna: { flex: 1, justifyContent: 'center' },
  asignaturaTexto: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cursoTexto: { fontSize: 13, color: '#64748B', marginTop: 2 },
  detallesFila: { flexDirection: 'row', marginTop: 8 },
  detalleBadge: {
    backgroundColor: '#F1F5F9',
    color: '#475569',
    fontSize: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  centrado: { alignItems: 'center', marginVertical: 30 },
  cargandoTexto: { marginTop: 8, color: '#64748B', fontSize: 13 },
  sinClasesContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 26,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sinClasesIcono: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sinClasesTitulo: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 6 },
  sinClasesTexto: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },
});
