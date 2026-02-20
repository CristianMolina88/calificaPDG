# Skill - Sistema de Calificaciones El Parche del Gato

## Stack Tecnologico

- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript (sin frameworks ni dependencias)
- **Backend:** Google Apps Script (.gs) vinculado a Google Sheets
- **Base de datos:** Google Sheets (hojas: Configuracion, Calificaciones)
- **Hosting frontend:** GitHub Pages (rama main, carpeta /frontend)
- **API:** REST via Google Apps Script Web App con soporte JSONP
- **Graficos:** Chart.js (CDN) solo en dashboard.html

## Arquitectura

### Frontend

Dos paginas independientes:

**index.html** - App de calificacion (SPA)
- Single Page Application con manejo de pantallas via CSS (`display: none/flex`)
- Patron IIFE para encapsulamiento en `app.js`
- State management centralizado en objeto `state`
- Comunicacion API: JSONP primero (evita CORS en tablets), fallback a fetch
- Timeout de 12s con mecanismo de retry
- localStorage con prefijo `parche_` para persistencia de sede seleccionada
- Theming dinamico via CSS custom properties (colores por sede)

**dashboard.html** - Dashboard de metricas (admin)
- Pagina independiente protegida con PIN (sessionStorage)
- Patron IIFE, mismo estilo de `fetchWithCallback` que app.js
- Auto-refresh cada 5 minutos con countdown visible
- Tema claro/oscuro toggle, persistido en localStorage (`pdg_dash_tema`)
- Chart.js para grafico de tendencia en el tiempo
- Umbral de alertas de mesas seleccionable, persistido en sessionStorage

### Backend (Google Apps Script)

- Script vinculado a la hoja de calculo (`getActiveSpreadsheet()`)
- Soporte JSONP (detecta parametro `callback` y responde con `ContentService.MimeType.JAVASCRIPT`)
- Validacion de datos en servidor
- Envio de alertas via `GmailApp.sendEmail()`
- Configuracion sensible en Script Properties (no en codigo)

### Base de Datos (Google Sheets)

- **Configuracion:** codigo_pv | nombre_pv | nombre_marca | logo_url | color_primario | color_secundario | solicitar_factura | prefijo_factura | solicitar_mesa | activo
- **Calificaciones:** timestamp | codigo_pv | nombre_pv | numero_factura | numero_mesa | servicio | comida | infraestructura | musica | comentario

## Endpoints del Backend

| Endpoint | Parametros | Descripcion |
|---|---|---|
| `getConfig` | `codigo_pv` | Config completa de una sede |
| `getSedes` | — | Lista sedes activas |
| `saveRating` | `codigo_pv, servicio, comida, infraestructura, musica, numero_mesa, comentario` | Guarda calificacion + dispara alerta si rating=1 |
| `getStats` | `codigo_pv` | Promedios generales |
| `getDashboard` | `codigo_pv, fecha_inicio, fecha_fin` | Datos completos para dashboard |
| `checkInvoice` | `numero_factura` | Verifica si factura ya fue calificada |

### Respuesta getDashboard

```json
{
  "success": true,
  "resumen": { "total": 150, "servicio": 4.2, "comida": 4.5, "infraestructura": 3.8, "musica": 4.1, "general": 4.15 },
  "por_sede": [{ "codigo_pv": "PV001", "nombre_pv": "...", "total": 50, "servicio": 4.1, ... }],
  "tendencia": [{ "fecha": "2024-01-15", "total": 8, "servicio": 4.0, ... }],
  "distribucion": { "servicio": [2, 5, 10, 20, 13], "comida": [...], ... },
  "comentarios": [{ "timestamp": "...", "nombre_pv": "...", "mesa": "5", "comentario": "..." }],
  "por_mesa": [{ "mesa": "5", "total": 12, "servicio": [3,2,4,2,1], "comida": [...], ... }]
}
```

`por_mesa`: arrays de 5 posiciones = conteo de ratings 1,2,3,4,5 por categoria.

## Funcionalidades

### Sistema de Calificacion (index.html)

- 4 categorias: Servicio, Comida, Infraestructura, Musica
- Escala 1-5 con imagenes PNG de gatos (intercambiables por temporada)
- Campo de mesa configurable por sede (OBLIGATORIO / OPCIONAL / NO)
- Campo de factura configurable por sede (actualmente deshabilitado)
- Comentario opcional
- Flujo: Setup(PIN+sede) -> Rating -> Submitting -> Thanks -> Rating (loop)

### Dashboard de Metricas (dashboard.html)

- Acceso: protegido con PIN (mismo ADMIN_PIN de config.js)
- **Metricas en porcentaje:** cada estrella = 20% (1★=20%, 3★=60%, 5★=100%)
- **Filtros:** sede + periodo (Hoy / Ayer / 7d / 30d / Este mes / Personalizado)
- **Cards resumen:** Total respuestas, Promedio general %, Mejor categoria, A mejorar
- **Tabla por sede:** comparativo con % por categoria
- **Mesas con alertas:** mesas con acumulacion de calificaciones bajo umbral seleccionable
  - Umbral: 20% (solo 1★) / 40% (≤2★) / 60% (≤3★)
  - Calculo cliente-side sobre datos de `por_mesa` del API
  - Celdas con alertas resaltadas en rojo
- **Tendencia:** grafico de lineas Chart.js, eje Y 0-100%, marcas cada 20%
- **Distribucion:** barras por nivel de rating por categoria
- **Comentarios:** ultimos 20 no vacios
- **Auto-refresh:** cada 5 minutos con countdown visible en header
- **Tema:** claro/oscuro con toggle, persiste en localStorage

### Alertas por Email

- **Trigger:** cualquier categoria con rating = 1★ (20%) al guardar
- **Implementacion:** `saveRating()` llama `enviarAlertaCalificacion()` con try/catch
- **Envio:** `GmailApp.sendEmail()` desde la cuenta propietaria del script
- **Alias:** puede configurarse `ALERTA_EMAIL_FROM` para que aparezca otro remitente
- **Script Properties requeridas:**
  - `ALERTA_EMAIL_TO`: destinatario(s), separados por coma
  - `ALERTA_EMAIL_FROM`: alias "Enviar como" (opcional, debe estar verificado en Gmail)
- **Formato del correo:** sede, mesa, hora, 4 categorias en %, promedio %, comentario

### Configuracion Multi-Sede

- Soporte para multiples sedes desde una sola hoja de calculo
- Cada sede tiene: colores, logo, opciones de mesa/factura, estado activo
- Theming dinamico: al seleccionar sede, se aplican colores via CSS variables

### Acceso Admin

- Ctrl+Shift+S (desktop) o 5 toques en footer (tablet)
- PIN de acceso (default: 1234, configurado en config.js)
- Permite cambiar de sede sin recargar

## UX/UI (index.html - CONFIGURACION OPTIMA, NO MODIFICAR)

- Optimizado para tablets (landscape y portrait)
- Full viewport en tablets (>= 768px): sin bordes, sin margenes, maximo uso de pantalla
- Imagenes de rating: 92px base, 110px tablet portrait, 112px tablet landscape
- rating-main: margin-top 200px para centrado visual en tablet
- Caja comentarios: max-width 400px centrada
- Glassmorphism: fondos translucidos con backdrop-filter
- Fuente Poppins, botones pill con gradiente naranja
- Body: gradiente 135deg amarillo (#ffcc00) a naranja (#ff9800)

## Responsive Breakpoints (index.html)

| Breakpoint | Dispositivo | Imagenes | Container |
|---|---|---|---|
| <= 380px | Movil pequeno | 46px | 100%, padding compacto |
| 381-680px | Movil/default | 92px | max-width 680px |
| >= 768px portrait | Tablet portrait | 110px | 100%, full viewport |
| >= 768px landscape | Tablet landscape | 112px | 100%, full viewport |

## Flujo de Datos

```
[Tablet/Browser] --JSONP/fetch--> [Google Apps Script] --read/write--> [Google Sheets]
                                          |
                                    (si rating=1★)
                                          |
                                   [GmailApp] --> correo de alerta
```

## Archivos Clave

| Archivo | Funcion |
|---|---|
| `frontend/index.html` | SPA con todas las pantallas de calificacion |
| `frontend/dashboard.html` | Dashboard de metricas para admin |
| `frontend/styles.css` | Estilos, theming, responsive de index.html |
| `frontend/app.js` | Logica principal de calificacion (IIFE) |
| `frontend/config.js` | API_URL, ADMIN_PIN, RESET_TIMEOUT, DEBUG |
| `frontend/assets/rating-*.png` | Imagenes de calificacion (reemplazables) |
| `apps-script/Code.gs` | Backend completo |
| `.github/workflows/deploy.yml` | CI/CD: despliega /frontend a GitHub Pages |
| `INSTRUCCIONES.md` | Guia de despliegue paso a paso |

## Decisiones Tecnicas Clave

- **JSONP primero:** Las tablets Android bloquean fetch por CORS hacia Google Apps Script. JSONP inyecta un `<script>` que no tiene restriccion CORS.
- **Strict boolean check:** `solicitar_factura === true` en vez de truthy, porque el string "NO" de Sheets es truthy en JS.
- **Sin frameworks:** Vanilla JS reduce peso, complejidad y dependencias. Ideal para tablets con conexion limitada.
- **Script vinculado:** Code.gs usa `getActiveSpreadsheet()` (no standalone) para acceso directo a la hoja.
- **localStorage con prefijo:** `parche_` evita conflictos con otras apps en el mismo dominio.
- **Metricas en %:** La escala 1-5 se convierte a porcentaje en el frontend (x20). El API sigue devolviendo valores 1-5 para no romper compatibilidad.
- **por_mesa como distribucion:** El API devuelve arrays de conteos [rating1, rating2, ..., rating5] por categoria por mesa, permitiendo calcular "bajos" para cualquier umbral en el cliente sin nueva llamada al API.
- **Email con try/catch:** La alerta no bloquea ni afecta el guardado de la calificacion si falla.
- **Script Properties para email:** Las credenciales de correo no van en el codigo, van en propiedades del script (encriptadas por Google).

## URLs Produccion

- App calificacion: `https://cristianmolina88.github.io/calificaPDG/`
- Dashboard: `https://cristianmolina88.github.io/calificaPDG/dashboard.html`
- Repo GitHub: `https://github.com/CristianMolina88/calificaPDG`
