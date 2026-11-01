import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1B2B4B',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 80,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#EEE',
        },
        headerShown: false,
      }}>

      {/* Pestaña 1: Mi Día */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mi Día',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color as any} />,
        }}
      />

      {/* Pestaña 2: Horario Completo */}
      <Tabs.Screen
        name="horario-completo"
        options={{
          title: 'Malla',
          tabBarIcon: ({ color }) => <Ionicons name="grid" size={24} color={color as any} />,
        }}
      />

      {/* Pestaña 3: Emergencias */}
      <Tabs.Screen
        name="emergencias"
        options={{
          title: 'Emergencias',
          tabBarIcon: ({ color }) => <Ionicons name="warning" size={24} color={color as any} />,
        }}
      />

      <Tabs.Screen
      name="avisos"
      options={{
        title: 'Avisos',
        tabBarIcon: ({ color }) => <Ionicons name="megaphone" size={24} color={color as any} />,
      }}
      />

      <Tabs.Screen
      name="disponibilidad"
      options={{
        title: 'Disponibilidad',
        tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color as any} />,
      }}
      />
    </Tabs>
  );
}
