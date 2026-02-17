# Skill - Sistema de Calificaciones El Parche del Gato

## Stack Tecnologico

- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript (sin frameworks ni dependencias)
- **Backend:** Google Apps Script (.gs) vinculado a Google Sheets
- **Base de datos:** Google Sheets (hojas: Configuracion, Calificaciones)
- **Hosting frontend:** Servidor estatico (archivos HTML/CSS/JS)
- **API:** REST via Google Apps Script Web App con soporte JSONP

## Arquitectura

### Frontend (SPA)

- Single Page Application con manejo de pantallas via CSS (`display: none/flex`)
- Patron IIFE para encapsulamiento en `app.js`
- State management centralizado en objeto `state`
- Comunicacion API: JSONP primero (evita CORS en tablets), fallback a fetch
- Timeout de 12s con mecanismo de retry
- localStorage con prefijo `parche_` para persistencia de sede seleccionada
- Theming dinamico via CSS custom properties (colores por sede)

### Backend (Google Apps Script)

- Script vinculado a la hoja de calculo (`getActiveSpreadsheet()`)
- Endpoints: `getConfig`, `getSedes`, `saveRating`, `getStats`
- Soporte JSONP (detecta parametro `callback` y responde con `ContentService.MimeType.JAVASCRIPT`)
- Validacion de datos en servidor

### Base de Datos (Google Sheets)

- **Configuracion:** Datos por sede (colores, opciones, estado activo)
- **Calificaciones:** Registros con timestamp, sede, mesa, 4 categorias, comentario

## Funcionalidades

### Sistema de Calificacion

- 4 categorias: Servicio, Comida, Infraestructura, Musica
- Escala 1-5 con imagenes PNG de gatos (intercambiables por temporada)
- Campo de mesa configurable por sede (OBLIGATORIO / OPCIONAL / NO)
- Campo de factura configurable por sede (actualmente deshabilitado)
- Comentario opcional (max 500 caracteres)

### Configuracion Multi-Sede

- Soporte para multiples sedes desde una sola hoja de calculo
- Cada sede tiene: colores, logo, opciones de mesa/factura, estado activo
- Theming dinamico: al seleccionar sede, se aplican colores via CSS variables

### Acceso Admin

- Ctrl+Shift+S (desktop) o 5 toques en footer (tablet)
- PIN de acceso (default: 1234)
- Permite cambiar de sede sin recargar

### UX/UI

- Optimizado para tablets (landscape y portrait)
- Full viewport en tablets (>= 768px): sin bordes, sin margenes, maximo uso de pantalla
- Imagenes de rating: 92px base, 110px tablet portrait, 112px tablet landscape
- rating-main: margin-top 200px para centrado visual en tablet
- Caja comentarios: max-width 400px centrada
- Glassmorphism: fondos translucidos con backdrop-filter
- Fuente Poppins, botones pill con gradiente naranja
- Flujo sin friccion: Setup -> Rating -> Submitting -> Thanks -> Rating (loop)

## Responsive Breakpoints

| Breakpoint | Dispositivo | Imagenes | Container |
|---|---|---|---|
| <= 380px | Movil pequeno | 46px | 100%, padding compacto |
| 381-680px | Movil/default | 92px | max-width 680px |
| 681-767px | Tablet pequena | 92px | max-width 680px, margin 12px |
| >= 768px portrait | Tablet portrait | 110px | 100%, full viewport |
| >= 768px landscape | Tablet landscape | 112px | 100%, full viewport |

## Configuracion Optima CSS (aprobada)

### Base
- `.rating-main`: gap 0, margin-top 200px
- `.category-section`: padding 6px 4px 8px, border-bottom separador
- `.category-section h3`: font-size 0.75rem, margin-bottom 4px
- `.rating-options`: gap 2px
- `.rating-btn`: padding 2px, fondo transparente, sin borde
- `.rating-btn .rating-img`: 92px x 92px
- `.comment-section`: max-width 400px, margin-top 8px, centrada
- `#btn-submit`: padding 10px 20px, max-width 260px, margin 4px auto 0

### Tablet Portrait (>= 768px portrait)
- `#rating-screen`: padding-top 6px, padding-bottom 10px, justify-content center
- `.category-section`: padding 5px 4px 8px
- `.category-section h3`: margin-bottom 3px, font-size 0.75rem
- `.rating-options`: gap 4px
- `.rating-btn`: padding 1px, imagenes 110px
- `.comment-section`: margin 4px, textarea padding 8px 10px
- `#btn-submit`: margin-top 4px

### Tablet Landscape (>= 768px landscape)
- `.screen`: padding 4px 14px, padding-bottom 10px, height 100vh
- `#rating-screen`: padding-top 2px, padding-bottom 8px
- `.category-section`: padding 2px 2px 4px
- `.category-section h3`: margin-bottom 1px, font-size 0.7rem
- `.rating-options`: gap 1px
- `.rating-btn`: padding 0, imagenes 112px
- `.comment-section`: margin 2px, textarea padding 6px 8px
- `#btn-submit`: margin-top 2px

## Flujo de Datos

```
[Tablet] --JSONP/fetch--> [Google Apps Script] --read/write--> [Google Sheets]
```

1. Frontend carga sedes via `getSedes`
2. Admin selecciona sede, se guarda en localStorage
3. Frontend carga config de sede via `getConfig`
4. Cliente califica 4 categorias + mesa + comentario
5. Frontend envia via `saveRating`
6. Backend escribe fila en hoja Calificaciones
7. Pantalla de gracias -> vuelve a rating automaticamente

## Archivos Clave

| Archivo | Funcion |
|---|---|
| `frontend/index.html` | SPA con todas las pantallas |
| `frontend/styles.css` | Estilos, theming, responsive |
| `frontend/app.js` | Logica principal (IIFE) |
| `frontend/config.js` | API_URL, PIN, timeouts |
| `frontend/assets/rating-*.png` | Imagenes de calificacion |
| `apps-script/Code.gs` | Backend completo |
| `INSTRUCCIONES.md` | Guia de despliegue |

## Decisiones Tecnicas Clave

- **JSONP primero:** Las tablets Android bloquean fetch por CORS hacia Google Apps Script. JSONP inyecta un `<script>` que no tiene restriccion CORS.
- **Strict boolean check:** `solicitar_factura === true` en vez de truthy, porque el string "NO" de Sheets es truthy en JS.
- **Sin frameworks:** Vanilla JS reduce peso, complejidad y dependencias. Ideal para tablets con conexion limitada.
- **Script vinculado:** Code.gs usa `getActiveSpreadsheet()` (no standalone) para acceso directo a la hoja.
- **localStorage con prefijo:** `parche_` evita conflictos con otras apps en el mismo dominio.
