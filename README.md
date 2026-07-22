# Gestor de Productos de Proyecto y sus Líneas (ProjectProductsManager)

Un componente de código nativo (PCF) estándar para Microsoft Power Apps (Dataverse) diseñado para optimizar radicalmente la gestión de "Productos de proyecto" y la creación de sus correspondientes "Líneas de producto". 

Este control transforma una vista tradicional de cuadrícula en un espacio de trabajo interactivo de pantalla dividida, permitiendo a los usuarios operar, consultar, crear de forma masiva y editar registros directamente, reduciendo drásticamente los clics y el tiempo de navegación.

---

## 📐 Estructura de la Interfaz

El componente utiliza un diseño responsivo y compacto dividido en dos áreas principales de trabajo, asegurando que el usuario nunca pierda el contexto de los datos que está manipulando.

### 1. Panel Izquierdo: Resumen y Gestión de Productos (40% de la pantalla)
Este panel actúa como el menú maestro, mostrando todos los "Productos de Proyecto" cargados desde la vista configurada en Dataverse. Cada registro se representa mediante una **Tarjeta de Información Compacta**.

**Características de las tarjetas:**
* **Datos Claros:** Presenta el nombre personalizado del producto de proyecto, acompañado del nombre del producto original y su código alfanumérico (`productnumber`).
* **Insignias de Inteligencia de Datos (Conteo en tiempo real):** El componente consulta automáticamente a la WebAPI para contar cuántas líneas hijas (activas) existen realmente y las compara con la "Cantidad Estimada". Dependiendo del progreso, la tarjeta se ilumina con una insignia de color:
  * 🔴 **Rojo pálido:** Faltan líneas por crear (Déficit).
  * 🟢 **Verde pálido:** Cantidad de líneas creadas igual a la estimada (Completado).
  * 🟡 **Amarillo ocre:** Se han creado más líneas de las estimadas (Excedido).
* **Edición Directa (Configurable):** Cada tarjeta incluye un pequeño botón de edición (lápiz). Al pulsarlo, se abre el formulario nativo de edición de Dataverse en un modal centrado, permitiendo modificar el registro sin salir de la pantalla. (Esta función puede ser activada/desactivada por los administradores).

**Integración con Formularios de Creación Rápida:**
* En la cabecera del panel izquierdo existe un botón **"+ Nuevo"**.
* Este botón invoca de manera nativa el panel lateral de **Creación Rápida (Quick Create)** de Dataverse.
* **Herencia inteligente:** Al abrirse, el formulario capta automáticamente el contexto del Proyecto actual donde está insertado el PCF y auto-completa el campo de búsqueda (`Lookup`) del proyecto, ahorrando al usuario tener que buscarlo manualmente.

---

### 2. Panel Derecho: Administración de Líneas de Producto (60% de la pantalla)
Al seleccionar una tarjeta en el panel izquierdo, el panel derecho consulta (vía OData) y despliega dinámicamente todos los registros "hijos" (Líneas de Producto) vinculados a ese producto en concreto.

**Características del panel de gestión:**

**A. Motor de Creación Inteligente y Masiva**
Si el producto seleccionado aún no ha alcanzado su límite estimado de líneas, se muestra una barra de herramientas de creación:
* **Campo "Nombre base":** Permite al usuario introducir un prefijo (Ej: *Sensor de temperatura*).
* **Autonumeración Secuencial:** El componente lee el nombre base y detecta si ya existen líneas con ese nombre en pantalla. Si escribes *Cámara*, el componente creará *Cámara 1*. Para la siguiente creación, te sugerirá automáticamente *Cámara 2*. 
* **Botón "Crear línea (1)":** Genera un único registro hijo utilizando el motor de autonumeración.
* **Botón "Crear faltantes (X)":** Un botón de acción masiva que calcula cuántas líneas faltan para llegar a la estimación y ejecuta *N* llamadas simultáneas a la base de datos para crearlas todas de un solo clic, continuando la serie numérica de manera perfecta.
* **Bloqueo Automático:** Una vez alcanzada la estimación, las herramientas de creación desaparecen y se muestra un mensaje de validación verde ("✓ Cantidad estimada alcanzada") para prevenir la sobre-creación por error humano.

**B. Cuadrícula de Datos Editable (Data Grid)**
Las líneas creadas se listan en un formato de tabla estrictamente alineada, optimizada para ingreso rápido de información:
* **Orden (Columna #):** Enumera las líneas mostradas de forma visual.
* **Insignias de Estado (Colores Pastel):** El campo "Estado del producto" se convierte en una etiqueta visual cuyo color se genera mediante un algoritmo matemático (Hash) basado en el texto del estado. Esto garantiza que estados iguales tengan siempre el mismo color pastel, facilitando la lectura rápida.
* **Edición en Línea (Inline Editing):** Los campos **Nombre** y **Nº de Serie** son cuadros de texto interactivos. El usuario puede escribir directamente sobre ellos.
* **Autoguardado y Feedback Visual:** Al terminar de escribir y cambiar de campo (evento `onblur`), el componente envía la actualización a Dataverse automáticamente y en segundo plano. Los campos cambian de color para informar al usuario del proceso:
  * 🟡 *Fondo amarillo:* Guardando en progreso...
  * 🟢 *Fondo verde:* Guardado exitoso.
  * 🔴 *Fondo rojo:* Error de conexión o validación al intentar guardar.

---

## ⚙️ Parámetros de Configuración del Componente

Al insertar el control en el formulario principal de Dataverse, los administradores de la Power Platform disponen de la siguiente configuración:

| Parámetro | Tipo | Descripción | Valor por Defecto |
| :--- | :--- | :--- | :--- |
| **Permitir Edición** (`allowEdit`) | `TwoOptions` (Sí/No) | Habilita o deshabilita la aparición del icono del lápiz en las tarjetas del panel izquierdo, otorgando o quitando a los usuarios el poder de editar el registro padre desde el componente. | No |

## 🛠 Arquitectura Técnica Subyacente
* **Framework:** DOM estándar nativo de TypeScript / Microsoft PCF SDK. No requiere bibliotecas externas pesadas como React o Fluent UI.
* **Interacciones de Datos:** Toda la manipulación de registros secundarios, conteos matemáticos (FetchXML con `aggregate=true`) y actualizaciones silenciosas operan directamente contra la `context.webAPI` de Power Apps.
* **Navegación Nativa:** Utiliza `context.navigation.openForm` con la propiedad `useQuickCreateForm: true` para invocar diálogos estandarizados del ecosistema Dynamics/Power Apps, respetando reglas de negocio, scripts y plugins existentes.