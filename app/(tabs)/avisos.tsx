import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView } from 'react-native';

const anuncios = [
  { id: '1', fecha: 'Hoy, 09:00', titulo: 'Consejo de Profesores Suspendido', cuerpo: 'Estimados, el consejo de esta tarde se suspende por reparaciones en el gimnasio.', emisor: 'Dirección' },
  { id: '2', fecha: 'Ayer, 15:30', titulo: 'Recordatorio SIGE', cuerpo: 'Recuerden firmar el libro digital de clases antes del viernes para la declaración MINEDUC.', emisor: 'UTP' }
];

export default function AvisosScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Avisos Institucionales</Text>
          <Text style={styles.subtitle}>Canal oficial de comunicación</Text>
        </View>

        {anuncios.map((aviso) => (
          <View key={aviso.id} style={styles.avisoCard}>
            <View style={styles.avisoHeader}>
              <Text style={styles.avisoEmisor}>{aviso.emisor}</Text>
              <Text style={styles.avisoFecha}>{aviso.fecha}</Text>
            </View>
            <Text style={styles.avisoTitulo}>{aviso.titulo}</Text>
            <Text style={styles.avisoCuerpo}>{aviso.cuerpo}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F9' },
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1B2B4B' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  avisoCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#3498DB' },
  avisoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  avisoEmisor: { fontSize: 12, fontWeight: 'bold', color: '#3498DB', backgroundColor: '#EBF5FB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  avisoFecha: { fontSize: 12, color: '#999' },
  avisoTitulo: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  avisoCuerpo: { fontSize: 14, color: '#555', lineHeight: 20 }
});