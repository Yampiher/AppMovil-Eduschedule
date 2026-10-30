import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';

export default function DisponibilidadScreen() {
  const [diaSeleccionado, setDiaSeleccionado] = useState('Lunes');
  
  const handleGuardar = () => {
    Alert.alert("Disponibilidad Guardada", "Tus restricciones han sido enviadas a UTP para el próximo semestre.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Declarar Disponibilidad</Text>
          <Text style={styles.subtitle}>Selecciona los bloques en los que NO puedes hacer clases (restricciones).</Text>
        </View>

        <View style={styles.diasContainer}>
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((dia) => (
             <TouchableOpacity key={dia} style={[styles.diaBtn, diaSeleccionado === dia && styles.diaBtnActivo]} onPress={() => setDiaSeleccionado(dia)}>
               <Text style={[styles.diaTexto, diaSeleccionado === dia && styles.diaTextoActivo]}>{dia}</Text>
             </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bloquesCard}>
          <Text style={styles.bloqueTitle}>Bloques del {diaSeleccionado}</Text>
          
          {['08:00 - 09:30', '09:45 - 11:15', '11:30 - 13:00', '14:00 - 15:30', '15:45 - 17:15'].map((bloque, index) => (
            <View key={index} style={styles.filaBloque}>
              <Text style={styles.textoBloque}>{bloque}</Text>
              <TouchableOpacity style={styles.btnRestriccion}>
                <Text style={styles.textoRestriccion}>Bloquear</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleGuardar}>
          <Text style={styles.submitBtnText}>Guardar Restricciones de Horario</Text>
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
  diaBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#DDD' },
  diaBtnActivo: { backgroundColor: '#1B2B4B', borderColor: '#1B2B4B' },
  diaTexto: { fontSize: 14, color: '#555' },
  diaTextoActivo: { color: 'white', fontWeight: 'bold' },
  bloquesCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, elevation: 2, marginBottom: 20 },
  bloqueTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B2B4B', marginBottom: 15 },
  filaBloque: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  textoBloque: { fontSize: 15, color: '#333' },
  btnRestriccion: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  textoRestriccion: { color: '#C62828', fontSize: 12, fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#2ECC71', padding: 15, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' }
});