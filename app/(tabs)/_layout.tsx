import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1B2B4B',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      {/* Pestaña 1: Inicio / Comunicados */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'newspaper' : 'newspaper-outline'}
              size={22}
              color={color as any}
            />
          ),
        }}
      />

      {/* Pestaña 2: Mi Horario y Carga Académica */}
      <Tabs.Screen
        name="horario-completo"
        options={{
          title: 'Mi Horario',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={22}
              color={color as any}
            />
          ),
        }}
      />

      {/* Pestaña 3: Disponibilidad Horaria */}
      <Tabs.Screen
        name="disponibilidad"
        options={{
          title: 'Disponibilidad',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={22}
              color={color as any}
            />
          ),
        }}
      />

      {/* Pestaña 4: Emergencias e Incidencias */}
      <Tabs.Screen
        name="emergencias"
        options={{
          title: 'Emergencias',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'alert-circle' : 'alert-circle-outline'}
              size={22}
              color={color as any}
            />
          ),
        }}
      />
    </Tabs>
  );
}
