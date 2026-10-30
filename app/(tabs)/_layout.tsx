import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Íconos que ya vienen incluidos en Expo

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1B2B4B', // Azul oscuro (seleccionado)
        tabBarInactiveTintColor: '#999',  // Gris (no seleccionado)
        tabBarStyle: {
          height: 80,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#EEE',
        },
        headerShown: false, // Ocultamos el título superior por defecto
      }}>
      
      {/* Pestaña 1: Mi Día (Tu index.tsx actual) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mi Día',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />
      
      {/* Pestaña 2: Horario Completo */}
      <Tabs.Screen
        name="horario-completo"
        options={{
          title: 'Malla',
          tabBarIcon: ({ color }) => <Ionicons name="grid" size={24} color={color} />,
        }}
      />

      {/* Pestaña 3: Emergencias */}
      <Tabs.Screen
        name="emergencias"
        options={{
          title: 'Emergencias',
          tabBarIcon: ({ color }) => <Ionicons name="warning" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
       name="avisos"
       options={{
        title: 'Avisos',
        tabBarIcon: ({ color }) => <Ionicons name="megaphone" size={24} color={color} />
        }} />

      <Tabs.Screen
       name="disponibilidad" 
       options={{
        title: 'Disponibilidad', 
        tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color} /> 
        }} />
    </Tabs>
  );
}