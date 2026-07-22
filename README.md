# ProjectProductsManager (PCF)

Componente estandar para Microsoft Power Apps (Dataverse) diseñado para gestionar y visualizar productos de proyecto y sus líneas de producto asociadas de manera rápida e inteligente, sin necesidad de salir de la vista principal.

## Funcionalidades Principales

### Panel Izquierdo: Resumen de Productos (40% de ancho)
* **Visualización de tarjetas:** Muestra el listado de productos de proyecto provenientes de la vista configurada en Dataverse.
* **Estructura clara de datos:** Cada tarjeta presenta, en orden descendente:
  1. Nombre del producto (en negrita).
  2. Etiqueta visual del progreso de líneas creadas.
  3. El código alfanumérico del producto (`productnumber`).
* **Indicador inteligente de estado:** El componente agrupa y cuenta en tiempo real cuántas líneas de producto reales existen en la base de datos comparado con la cantidad estimada, alterando el color de la etiqueta:
  * 🔴 **Rojo pálido:** Aún faltan líneas por crear para alcanzar el estimado.
  * 🟢 **Verde pálido:** Se ha alcanzado exactamente la cantidad estimada.
  * 🟡 **Amarillo ocre:** Se ha superado la cantidad estimada.

### Panel Derecho: Gestión de Líneas Asociadas
Al hacer clic en cualquier producto del panel izquierdo, se despliegan sus líneas secundarias mediante llamadas directas a la WebAPI de Dataverse.

* **Listado en tiempo real:** Muestra los nombres y números de serie de las líneas asociadas al producto seleccionado.
* **Autoguardado de Número de Serie:** Las líneas poseen un campo de texto moderno para ingresar el número de serie. Al quitar el foco del campo (`onblur`), este se guarda automáticamente en la base de datos mediante WebAPI, mostrando feedback visual de guardado.
* **Generación inteligente de registros:** Incorpora un motor lógico para la creación masiva o individual de líneas faltantes utilizando un campo de "Nombre Base":
  * **Numeración automática:** Si se introduce "Cámara", el sistema detecta que no tiene número y crea "Cámara 1". 
  * **Continuación de series:** El sistema analiza los nombres existentes en pantalla y continúa la numeración sin duplicados (ej: si existe "Cámara 1" y se pulsa "Crear faltantes (2)", generará "Cámara 2" y "Cámara 3" a la vez).
  * **Control total:** Dispone de un botón secundario para crear líneas individuales de "1 en 1", y un botón primario (si hay déficit) que crea de golpe todas las líneas que falten hasta alcanzar la estimación fijada en el producto padre.