# ProjectProductsManager (PCF)

Componente estándar para Microsoft Power Apps (Dataverse) diseñado para gestionar y visualizar productos de proyecto y sus líneas de producto asociadas de manera rápida e inteligente, sin necesidad de salir de la vista principal.

## Funcionalidades Principales

### Panel Izquierdo: Resumen de Productos (40% del ancho)
* **Visualización de tarjetas compactas:** Muestra el listado de productos de proyecto provenientes de la vista configurada en Dataverse, con un diseño compacto y fondo gris claro para mejorar el contraste.
* **Estructura clara de datos:** Cada tarjeta presenta, de arriba hacia abajo:
  1. Nombre del producto de proyecto (en negrita).
  2. Etiqueta visual del progreso de líneas creadas.
  3. El nombre del producto base asociado y su código alfanumérico (`productnumber`).
* **Indicador inteligente de estado:** El componente agrupa y cuenta en tiempo real cuántas líneas de producto reales existen en la base de datos comparado con la cantidad estimada, alterando el color de la etiqueta:
  * 🔴 **Rojo pálido:** Aún faltan líneas por crear para alcanzar el estimado.
  * 🟢 **Verde pálido:** Se ha alcanzado exactamente la cantidad estimada.
  * 🟡 **Amarillo ocre:** Se ha superado la cantidad estimada.
* **Creación de nuevos registros (Modal):** Incorpora un botón flotante `+` en la cabecera que despliega un popup nativo. Permite crear un nuevo "Producto de proyecto" introduciendo el nombre, la cantidad estimada y seleccionando el producto base mediante el buscador estándar de Dataverse (Lookup). El listado se actualiza de forma automática tras guardar.

### Panel Derecho: Gestión de Líneas Asociadas
Al hacer clic en cualquier producto del panel izquierdo, se despliegan sus líneas secundarias mediante llamadas directas a la WebAPI de Dataverse.

* **Vista en cuadrícula (Grid):** Las líneas se organizan en un formato de tabla limpia que incluye una columna numérica (`#`) para identificar el orden de los registros, el nombre, el estado y el número de serie.
* **Insignias de estado dinámicas:** El campo "Estado" se muestra con etiquetas visuales de colores pastel que se generan algorítmicamente en función del texto, mejorando el reconocimiento visual rápido.
* **Edición en línea y autoguardado:** Los campos "Nombre de la línea" y "Nº Serie" son cuadros de texto editables. Al modificar su contenido y quitar el foco (`onblur`), el componente actualiza el registro en Dataverse automáticamente (WebAPI), mostrando feedback visual mediante colores (naranja al guardar, verde al tener éxito, rojo si hay error).
* **Generación inteligente de registros:** Incorpora un motor lógico para la creación masiva o individual de líneas faltantes utilizando un campo de "Nombre Base":
  * **Numeración automática continua:** Si se introduce "Cámara", el sistema detecta que no tiene número y crea "Cámara 1", sugiriendo "Cámara 2" para la siguiente creación. Analiza los nombres existentes en pantalla y continúa la numeración sin duplicados.
  * **Control total y dinámico:** Dispone de un botón secundario para crear líneas de "1 en 1", y un botón primario para crear de golpe todas las faltantes hasta la estimación.
  * **Bloqueo por límite:** Si la cantidad de líneas iguala o supera la cantidad estimada en el producto padre, los controles de creación se ocultan automáticamente, mostrando un mensaje de confirmación de límite alcanzado.