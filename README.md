# EduSchedule Movil - Portal Docente

Aplicacion movil institucional y de gestion academica para el cuerpo docente del ecosistema EduSchedule. Desarrollada con React Native y Expo SDK 58, esta aplicacion permite a los profesores revisar su horario semanal en tiempo real, monitorear su carga horaria contractual segun la Ley 20.903, gestionar su disponibilidad para la planificacion escolar, mantenerse informados mediante el canal oficial de comunicados y notificar emergencias o inasistencias a la Unidad Tecnica Pedagogica (UTP) para la designacion oportuna de reemplazos.

---

## Caracteristicas Principales

### 1. Autenticacion Institucional Segura
* **Inicio de Sesion Dual:** Acceso seguro mediante correo electronico institucional o mediante RUT chileno validado contra la base de datos de la institucion.
* **Registro Docente:** Incorporacion de nuevos profesores vinculados al establecimiento educacional.
* **Recuperacion de Contraseña:** Generacion y envio de enlaces seguros de restablecimiento de credenciales por correo.
* **Persistencia de Sesion:** Almacenamiento local seguro para ingreso automatico y desconexion limpia con modal de confirmacion.

### 2. Panel de Inicio y Comunicados Oficiales
* Visualizacion de avisos institucionales publicados directamente por el equipo directivo y UTP desde la plataforma web.
* Clasificacion visual por prioridad: Informativo, Importante y Urgente.
* Actualizacion mediante gesto de deslizamiento (Pull-to-Refresh).

### 3. Mi Horario y Carga Academica
* Grilla interactiva semanal (Lunes a Viernes) con navegacion rapida por dia.
* Filtro estricto por clases en estado asignado, garantizando que el docente solo visualice horarios confirmados y libres de conflictos de sala o curso.
* Detalle de cada bloque: hora de inicio y termino, nombre de la asignatura con identificador de color, curso y sala asignada.
* Tarjeta de balance horario: computo en tiempo real de horas pedagogicas en aula versus horas contratadas, asistiendo en el cumplimiento de la proporcion 65/35 exigida por la Ley 20.903.

### 4. Declaracion de Disponibilidad Horaria
* Matriz semanal interactiva para marcar o liberar bloques horarios segun las preferencias o restricciones del docente.
* Sincronizacion directa y bidireccional con la tabla de disponibilidad leida por el motor de resolucion de horarios de la plataforma web de UTP.
* Respaldo local en cache para funcionamiento optimo ante desconexiones temporales.

### 5. Reporte de Emergencias e Incidencias
* Formulario rapido para notificar inasistencias imprevistas, licencias medicas o atrasos por motivos de fuerza mayor.
* Seleccion de bloques especificos afectados y notas explicativas.
* Recepcion instantanea en el Dashboard web de UTP para la asignacion de un profesor suplente.
* Historial de solicitudes con estado de seguimiento (Pendiente, Reemplazo Asignado, Resuelta) y nombre del colega asignado a la suplencia.

---

## Stack Tecnologico

* **Framework:** React Native 0.88.0.
* **Plataforma y Herramientas:** Expo SDK 58.
* **Sistema de Enrutamiento:** Expo Router 58 (arquitectura basada en carpetas con Stacks y Bottom Tabs).
* **Lenguaje:** TypeScript (modo estricto).
* **Persistencia Local:** `@react-native-async-storage/async-storage` 2.2.0.
* **Base de Datos y Autenticacion:** Base de datos PostgreSQL central unificada con validacion de credenciales criptograficas y canal REST en tiempo real.
* **Iconos e Interfaz:** Ionicons (`@expo/vector-icons`), StyleSheet nativo adaptable a iOS, Android y navegadores web.

---

## Estructura del Proyecto

```text
eduschedule/
├── app/                        # Rutas y vistas gestionadas por Expo Router
│   ├── (tabs)/                 # Navegacion por pestañas inferiores
│   │   ├── _layout.tsx         # Configuracion visual del TabBar
│   │   ├── index.tsx           # Pestaña 1: Inicio y Comunicados
│   │   ├── horario-completo.tsx# Pestaña 2: Mi Horario y Carga Horaria
│   │   ├── disponibilidad.tsx  # Pestaña 3: Disponibilidad Horaria
│   │   └── emergencias.tsx     # Pestaña 4: Emergencias e Incidencias
│   ├── _layout.tsx             # Layout raiz de navegacion Stack
│   ├── index.tsx               # Compuerta de sesion (Gateway de verificacion)
│   └── login.tsx               # Pantalla de autenticacion y recuperacion
├── components/                 # Componentes reutilizables de interfaz
│   ├── ui/                     # Iconos y elementos graficos base
│   └── themed-text.tsx         # Tipografias institucionales
├── constants/                  # Constantes globales y cliente de conexion
│   ├── colors.ts               # Paleta de colores institucional
│   └── supabase.ts             # Cliente de conexion al servidor central
├── hooks/                      # Custom hooks para temas y estados
├── assets/                     # Imagenes, fuentes y recursos estaticos
└── package.json                # Definicion de dependencias y scripts
```

---

## Requisitos Previos

* Node.js version 18.0.0 o superior instalada.
* Gestor de paquetes npm o yarn.
* Dispositivo fisico con la aplicacion **Expo Go** instalada (disponible en Google Play Store y App Store) o un emulador de Android / iOS configurado.

---

## Instalacion y Puesta en Marcha

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Yampiher/AppMovil-Eduschedule.git
   cd AppMovil-Eduschedule/eduschedule
   ```

2. **Instalar dependencias del proyecto:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo de Expo:**
   ```bash
   npx expo start
   ```

4. **Ejecutar la aplicacion:**
   * **En dispositivo fisico:** Escanee el codigo QR generado en la terminal utilizando la camara (iOS) o la aplicacion Expo Go (Android).
   * **En emulador Android:** Presione la tecla `a` en la terminal.
   * **En simulador iOS:** Presione la tecla `i` en la terminal.
   * **En navegador web:** Presione la tecla `w` en la terminal.

---

## Sincronizacion con la Plataforma Web

Esta aplicacion movil forma parte integral de la suite **EduSchedule** y opera sincronizada en tiempo real con la plataforma web institucional:

* Las clases visualizadas en **Mi Horario** provienen directamente de las mallas generadas por el motor de optimizacion en la plataforma web.
* Los avisos del modulo **Inicio** son redactados por el equipo directivo desde el modulo de Comunicados de la web.
* Las emergencias enviadas desde el modulo **Emergencias** ingresan directamente a la bandeja de entrada del Dashboard de UTP para su resolucion.
* Las restricciones marcadas en **Disponibilidad** alimentan el motor de algoritmos para evitar la asignacion de clases en bloques no habiles.

---

## Licencia

Proyecto desarrollado con fines educativos e institucionales bajo el marco del sistema de planificacion academica EduSchedule.
