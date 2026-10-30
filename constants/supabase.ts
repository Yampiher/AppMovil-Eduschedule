import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://wwietmxsdwwgagkzkpcf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3aWV0bXhzZHd3Z2Fna3prcGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNDcyMDAsImV4cCI6MjEwODcyMzIwMH0.HjEDeaAwLXAXcdyO516uKGZLMGOMJb8hhs9AoPjX1-8'; // mantén tu clave aquí

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});