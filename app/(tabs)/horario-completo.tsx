import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';

const mallaSemanal = [
  { id: '1', dia: 'Lunes', horario: '08:00 - 09:30', asignatura: 'Matemática', curso: '1ro Medio B', sala: 'Sala 12' },
  { id: '2', dia: 'Lunes', horario: '09:45 - 11:15', asignatura: 'Matemática', curso: '1ro Medio B', sala: 'Lab Ciencias' },
  { id: '3', dia: 'Lunes', horario: '11:30 - 13:00', asignatura: 'Atención Apoderados', curso: '-', sala: 'Oficina Depto.' },
  { id: '4', dia: 'Martes', horario: '08:00 - 09:30', asignatura: 'Inglés', curso: '2do Medio A', sala: 'Sala 15' },
];

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export default function HorarioCompletoScreen() {
  const [diaSeleccionado, setDiaSeleccionado] = useState('Lunes');
  const clasesDelDia = mallaSemanal.filter(clase => clase.dia === diaSeleccionado);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Malla y Carga Académica</Text>
        
        {/* GRÁFICO DE CARGA AÑADIDO AQUÍ */}
        <View style={styles.graficoContainer}>
          <Text style={styles.graficoTitle}>Distribución Mensual (44 hrs totales)</Text>
          <View style={styles.barraFondo}>
            <View style={[styles.barraRelleno, { width: '64%', backgroundColor: '#3498DB' }]} />
            <View style={[styles.barraRelleno, { width: '36%', backgroundColor: '#9B59B6' }]} />
          </View>
          <View style={styles.leyenda}>
            <Text style={styles.leyendaTexto}>🔵 28h Lectivas</Text>
            <Text style={styles.leyendaTexto}>🟣 16h No Lectivas</Text>
          </View>
        </View>
      </View>

      <View style={styles.diasContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollDias}>
          {diasSemana.map((dia) => (
            <TouchableOpacity key={dia} style={[styles.diaBtn, diaSeleccionado === dia && styles.diaBtnActivo]} onPress={() => setDiaSeleccionado(dia)}>
              <Text style={[styles.diaTexto, diaSeleccionado === dia && styles.diaTextoActivo]}>{dia}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.container}>
        {clasesDelDia.length > 0 ? (
          clasesDelDia.map((clase) => (
            <View key={clase.id} style={styles.claseCard}>
              <View style={styles.horaColumna}>
                <Text style={styles.horaTexto}>{clase.horario.split(' - ')[0]}</Text>
                <Text style={styles.horaTextoChico}>{clase.horario.split(' - ')[1]}</Text>
              </View>
              <View style={styles.infoColumna}>
                <Text style={styles.asignaturaTexto}>{clase.asignatura}</Text>
                <Text style={styles.cursoTexto}>{clase.curso}</Text>
                <View style={styles.detallesFila}>
                  <Text style={styles.detalleBadge}>📍 {clase.sala}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.sinClasesContainer}><Text style={styles.sinClasesTexto}>No tienes carga académica asignada hoy.</Text></View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F9' },
  header: { padding: 20, paddingBottom: 15, backgroundColor: 'white' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1B2B4B', marginBottom: 15 },
  graficoContainer: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
  graficoTitle: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  barraFondo: { height: 12, backgroundColor: '#E0E0E0', borderRadius: 6, flexDirection: 'row', overflow: 'hidden', marginBottom: 8 },
  barraRelleno: { height: '100%' },
  leyenda: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  leyendaTexto: { fontSize: 12, color: '#666', fontWeight: '500' },
  diasContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 15 },
  scrollDias: { paddingHorizontal: 15, gap: 10 },
  diaBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F0F4F8' },
  diaBtnActivo: { backgroundColor: '#1B2B4B' },
  diaTexto: { fontSize: 14, color: '#666', fontWeight: '600' },
  diaTextoActivo: { color: 'white' },
  container: { flex: 1, padding: 20 },
  claseCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, marginBottom: 15, padding: 15, elevation: 2 },
  horaColumna: { width: 80, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#EEE', paddingRight: 15, marginRight: 15 },
  horaTexto: { fontSize: 16, fontWeight: 'bold', color: '#1B2B4B' },
  horaTextoChico: { fontSize: 12, color: '#999', marginTop: 2 },
  infoColumna: { flex: 1, justifyContent: 'center' },
  asignaturaTexto: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cursoTexto: { fontSize: 14, color: '#666', marginTop: 2 },
  detallesFila: { flexDirection: 'row', marginTop: 10 },
  detalleBadge: { backgroundColor: '#F0F4F8', color: '#555', fontSize: 12, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, overflow: 'hidden' },
  sinClasesContainer: { alignItems: 'center', marginTop: 40 },
  sinClasesTexto: { color: '#999', fontSize: 15, fontStyle: 'italic' },
});