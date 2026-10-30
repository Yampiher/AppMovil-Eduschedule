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
  TouchableOpacity,
  View
} from 'react-native';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const BLOQUES = ['08:00 - 09:30', '09:45 - 11:15', '11:30 - 13:00', '14:00 - 15:30', '15:45 - 17:15'];

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

  const mostrarMensaje = (titulo: string, mensaje: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}: ${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  };

  // Cargar restricciones previas
  const cargarRestricciones = async () => {
    try {
      setCargando(true);
      const sesionString = await AsyncStorage.getItem('profesor_sesion');
      const profesor = sesionString ? JSON.parse(sesionString) : null;

      if (profesor?.id) {
        const { data, error } = await supabase
          .from('disponibilidad')
          .select('dia, bloque')
          .eq('profesor_id', profesor.id);

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
    }
  };

  useEffect(() => {
    cargarRestricciones();
  }, []);

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

  // Guardar en Supabase y LocalStorage
  const handleGuardar = async () => {
    try {
      setGuardando(true);
      const sesionString = await AsyncStorage.getItem('profesor_sesion');
      const profesor = sesionString ? JSON.parse(sesionString) : null;

      // Respaldo local
      await AsyncStorage.setItem('restricciones_horario', JSON.stringify(bloquesBloqueados));

      if (profesor?.id) {
        // Eliminar registros anteriores del docente
        await supabase
          .from('disponibilidad')
          .delete()
          .eq('profesor_id', profesor.id);

        // Preparar registros a insertar
        const registros: { profesor_id: string; dia: string; bloque: string }[] = [];
        Object.entries(bloquesBloqueados).forEach(([dia, bloques]) => {
          bloques.forEach((bloque) => {
            registros.push({
              profesor_id: profesor.id,
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
        'Tus restricciones han sido enviadas a UTP para el próximo semestre.'
      );
    } catch (err: any) {
      console.error('Error al guardar restricciones:', err);
      mostrarMensaje('Error', err?.message || 'No se pudieron guardar las restricciones.');
    } finally {
      setGuardando(false);
    }
  };

  const bloquesDelDia = bloquesBloqueados[diaSeleccionado] || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Declarar Disponibilidad</Text>
          <Text style={styles.subtitle}>Selecciona los bloques en los que NO puedes hacer clases (restricciones).</Text>
        </View>

        <View style={styles.diasContainer}>
          {DIAS.map((dia) => (
            <TouchableOpacity
              key={dia}
              style={[styles.diaBtn, diaSeleccionado === dia && styles.diaBtnActivo]}
              onPress={() => setDiaSeleccionado(dia)}
            >
              <Text style={[styles.diaTexto, diaSeleccionado === dia && styles.diaTextoActivo]}>
                {dia}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bloquesCard}>
          <Text style={styles.bloqueTitle}>Bloques del {diaSeleccionado}</Text>

          {cargando ? (
            <ActivityIndicator size="small" color="#1B2B4B" style={{ marginVertical: 20 }} />
          ) : (
            BLOQUES.map((bloque, index) => {
              const estaBloqueado = bloquesDelDia.includes(bloque);

              return (
                <View key={index} style={styles.filaBloque}>
                  <Text style={[styles.textoBloque, estaBloqueado && styles.textoBloqueBloqueado]}>
                    {bloque}
                  </Text>
                  <TouchableOpacity
                    style={[styles.btnRestriccion, estaBloqueado && styles.btnRestriccionActivo]}
                    onPress={() => toggleBloque(bloque)}
                  >
                    <Text style={[styles.textoRestriccion, estaBloqueado && styles.textoRestriccionActivo]}>
                      {estaBloqueado ? 'Bloqueado ✕' : 'Bloquear'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, guardando && styles.submitBtnDeshabilitado]}
          onPress={handleGuardar}
          disabled={guardando}
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
  safeArea: { flex: 1, backgroundColor: '#F4F7F9' },
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1B2B4B' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, lineHeight: 20 },
  diasContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  diaBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#DDD', cursor: 'pointer' as any },
  diaBtnActivo: { backgroundColor: '#1B2B4B', borderColor: '#1B2B4B' },
  diaTexto: { fontSize: 14, color: '#555' },
  diaTextoActivo: { color: 'white', fontWeight: 'bold' },
  bloquesCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, elevation: 2, marginBottom: 20 },
  bloqueTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B2B4B', marginBottom: 15 },
  filaBloque: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  textoBloque: { fontSize: 15, color: '#333' },
  textoBloqueBloqueado: { color: '#C62828', fontWeight: '600' },
  btnRestriccion: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, cursor: 'pointer' as any },
  btnRestriccionActivo: { backgroundColor: '#C62828' },
  textoRestriccion: { color: '#C62828', fontSize: 12, fontWeight: 'bold' },
  textoRestriccionActivo: { color: '#FFFFFF' },
  submitBtn: { backgroundColor: '#2ECC71', padding: 15, borderRadius: 8, alignItems: 'center', cursor: 'pointer' as any },
  submitBtnDeshabilitado: { backgroundColor: '#86EFAC' },
  submitBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' }
});