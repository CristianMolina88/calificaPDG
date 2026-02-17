# Instrucciones de Despliegue - Sistema de Calificaciones El Parche del Gato

## 1. Crear Google Sheet

1. Ir a [Google Sheets](https://sheets.google.com) y crear una hoja nueva
2. Copiar el ID del spreadsheet desde la URL:
   `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`

## 2. Configurar Google Apps Script

1. En la hoja de Google Sheets, ir a **Extensiones > Apps Script**
2. Borrar el contenido por defecto del archivo `Code.gs`
3. Copiar y pegar el contenido de `apps-script/Code.gs`
4. Reemplazar `TU_SPREADSHEET_ID_AQUI` con el ID copiado en el paso anterior
5. Guardar (Ctrl+S)

## 3. Inicializar las hojas

1. En el editor de Apps Script, seleccionar la funcion `initializeSheets` en el dropdown
2. Click en **Ejecutar**
3. La primera vez pedira permisos - aceptar todos
4. Verificar que se crearon las hojas "Configuracion" y "Calificaciones" con los datos de ejemplo

## 4. Publicar como Web App

1. En Apps Script, click en **Implementar > Nueva implementacion**
2. Tipo: **Aplicacion web**
3. Ejecutar como: **Yo** (tu cuenta)
4. Quien tiene acceso: **Cualquier persona**
5. Click en **Implementar**
6. Copiar la URL que aparece (empieza con `https://script.google.com/macros/s/...`)

## 5. Configurar el Frontend

1. Abrir `frontend/config.js`
2. Reemplazar `TU_URL_AQUI` con la URL copiada en el paso anterior
3. Cambiar `ADMIN_PIN` si deseas un PIN diferente (por defecto: 1234)
4. Guardar

## 6. Probar

1. Abrir `frontend/index.html` en un navegador
2. Ingresa el PIN (1234) para configurar la sede
3. Selecciona una sede y guarda
4. Prueba el flujo completo: Calificar > seleccionar emojis > Enviar

## Configuracion de Sedes

En la hoja "Configuracion" puedes modificar:

| Columna | Descripcion |
|---------|-------------|
| codigo_pv | Codigo unico de la sede (PV001, PV002, etc.) |
| nombre_pv | Nombre visible de la sede |
| nombre_marca | Nombre de la marca |
| logo_url | URL de imagen del logo (Google Drive o URL directa) |
| color_primario | Color principal en hex (#ff6600) |
| color_secundario | Color de fondo en hex (#ffcc00) |
| solicitar_factura | SI/NO - si pide numero de factura |
| prefijo_factura | Prefijo para facturas (ej: FENO) |
| activo | TRUE/FALSE - si la sede esta activa |

## Cambiar imagenes de calificacion (por temporada)

Las imagenes estan en `frontend/assets/`:
- `rating-1.svg` - Muy malo
- `rating-2.svg` - Malo
- `rating-3.svg` - Regular
- `rating-4.svg` - Bueno
- `rating-5.svg` - Excelente

Para cambiar por temporada (ej: Halloween), simplemente reemplaza estos archivos manteniendo los mismos nombres.
Si usas PNG en vez de SVG, actualiza las referencias en `index.html`.

## Accesos de administrador

- **PIN:** Ctrl+Shift+S en cualquier pantalla, o tocar el logo 5 veces rapido
- **Pantalla completa:** Disponible en la pantalla de configuracion

## Actualizar el script (si haces cambios al Code.gs)

1. En Apps Script, hacer los cambios
2. Ir a **Implementar > Administrar implementaciones**
3. Editar la implementacion existente
4. Cambiar la version a **Nueva version**
5. Click en **Implementar**
