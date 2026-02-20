/**
 * Sistema de Calificaciones - El Parche del Gato
 * API Google Apps Script
 *
 * Este script maneja las operaciones para el sistema de calificaciones
 * con 4 categorías: Servicio, Comida, Infraestructura, Música
 */

// Nombres de las hojas
const SHEET_CONFIG = 'Configuracion';
const SHEET_RATINGS = 'Calificaciones';

/**
 * Obtiene el spreadsheet activo.
 * Si el script esta vinculado a la hoja (Extensions > Apps Script), usa getActiveSpreadsheet().
 * Si necesitas usarlo como script standalone, descomenta SPREADSHEET_ID y cambiara a openById.
 */
// const SPREADSHEET_ID = 'PEGA_TU_ID_AQUI_SOLO_SI_ES_STANDALONE';
function getSpreadsheet() {
  if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID) {
    return getSpreadsheet();
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Maneja las solicitudes GET
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback;
    let result;

    switch(action) {
      case 'getConfig':
        result = getConfig(e.parameter.codigo_pv);
        break;
      case 'getSedes':
        result = getSedes();
        break;
      case 'getStats':
        result = getStats(e.parameter.codigo_pv);
        break;
      case 'getDashboard':
        result = getDashboard(e.parameter.codigo_pv, e.parameter.fecha_inicio, e.parameter.fecha_fin);
        break;
      case 'checkInvoice':
        result = checkDuplicateInvoice(e.parameter.numero_factura);
        break;
      case 'saveRating':
        result = saveRating({
          codigo_pv: e.parameter.codigo_pv,
          numero_factura: e.parameter.numero_factura || '',
          numero_mesa: e.parameter.numero_mesa || '',
          servicio: e.parameter.servicio,
          comida: e.parameter.comida,
          infraestructura: e.parameter.infraestructura,
          musica: e.parameter.musica,
          comentario: e.parameter.comentario || ''
        });
        break;
      default:
        result = { error: 'Acción no válida' };
    }

    if (callback) {
      return jsonpResponse(result, callback);
    }
    return jsonResponse(result);
  } catch (error) {
    const errorResult = { success: false, error: error.message };
    if (e.parameter.callback) {
      return jsonpResponse(errorResult, e.parameter.callback);
    }
    return jsonResponse(errorResult);
  }
}

/**
 * Maneja las solicitudes POST
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch(action) {
      case 'saveRating':
        return jsonResponse(saveRating(data));
      default:
        return jsonResponse({ error: 'Acción no válida' });
    }
  } catch (error) {
    return jsonResponse({ error: error.message });
  }
}

/**
 * Obtiene la configuración de un punto de venta
 */
function getConfig(codigoPv) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idx = {};
  headers.forEach((h, i) => idx[h] = i);

  for (let i = 1; i < data.length; i++) {
    if (data[i][idx['codigo_pv']] === codigoPv) {
      if (data[i][idx['activo']] === true || data[i][idx['activo']] === 'TRUE') {
        let logoUrl = data[i][idx['logo_url']] || '';
        if (logoUrl.includes('drive.google.com/file/d/')) {
          const fileId = logoUrl.match(/\/d\/([^\/]+)/);
          if (fileId) {
            logoUrl = 'https://drive.google.com/uc?export=view&id=' + fileId[1];
          }
        }

        return {
          success: true,
          config: {
            codigo_pv: data[i][idx['codigo_pv']],
            nombre_pv: data[i][idx['nombre_pv']],
            nombre_marca: data[i][idx['nombre_marca']],
            logo_url: logoUrl,
            color_primario: data[i][idx['color_primario']] || '#ff6600',
            color_secundario: data[i][idx['color_secundario']] || '#ffcc00',
            solicitar_factura: data[i][idx['solicitar_factura']] === true || data[i][idx['solicitar_factura']] === 'TRUE' || data[i][idx['solicitar_factura']] === 'SI',
            prefijo_factura: data[i][idx['prefijo_factura']] || '',
            solicitar_mesa: (data[i][idx['solicitar_mesa']] || 'NO').toString().toUpperCase().trim(),
            activo: true
          }
        };
      } else {
        return { success: false, error: 'Punto de venta inactivo' };
      }
    }
  }

  return { success: false, error: 'Punto de venta no encontrado' };
}

/**
 * Obtiene la lista de sedes activas
 */
function getSedes() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idx = {};
  headers.forEach((h, i) => idx[h] = i);

  const sedes = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx['activo']] === true || data[i][idx['activo']] === 'TRUE') {
      sedes.push({
        codigo_pv: data[i][idx['codigo_pv']],
        nombre_pv: data[i][idx['nombre_pv']],
        nombre_marca: data[i][idx['nombre_marca']]
      });
    }
  }

  return { success: true, sedes: sedes };
}

/**
 * Verifica si una factura ya fue calificada
 */
function checkDuplicateInvoice(numeroFactura) {
  if (!numeroFactura) {
    return { success: false, error: 'Número de factura requerido' };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RATINGS);
  const data = sheet.getDataRange().getValues();
  const facturaUpper = numeroFactura.toUpperCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][3]).toUpperCase().trim() === facturaUpper) {
      return { success: true, exists: true, message: 'Esta factura ya fue calificada' };
    }
  }

  return { success: true, exists: false };
}

/**
 * Guarda una calificación con 4 categorías
 */
function saveRating(data) {
  if (!data.codigo_pv) {
    return { success: false, error: 'Falta código de punto de venta' };
  }

  var servicio = parseInt(data.servicio);
  var comida = parseInt(data.comida);
  var infraestructura = parseInt(data.infraestructura);
  var musica = parseInt(data.musica);

  if (isNaN(servicio) || servicio < 1 || servicio > 5 ||
      isNaN(comida) || comida < 1 || comida > 5 ||
      isNaN(infraestructura) || infraestructura < 1 || infraestructura > 5 ||
      isNaN(musica) || musica < 1 || musica > 5) {
    return { success: false, error: 'Calificaciones no válidas (deben ser entre 1 y 5)' };
  }

  var configResult = getConfig(data.codigo_pv);
  if (!configResult.success) {
    return configResult;
  }

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_RATINGS);

  sheet.appendRow([
    new Date(),
    data.codigo_pv,
    configResult.config.nombre_pv,
    data.numero_factura ? data.numero_factura.toUpperCase().trim() : '',
    data.numero_mesa ? data.numero_mesa.toString().trim() : '',
    servicio,
    comida,
    infraestructura,
    musica,
    data.comentario || ''
  ]);

  // Alerta si alguna categoría recibe calificación de 1 estrella (20%)
  if (servicio === 1 || comida === 1 || infraestructura === 1 || musica === 1) {
    try {
      enviarAlertaCalificacion({
        nombre_pv: configResult.config.nombre_pv,
        mesa: data.numero_mesa ? data.numero_mesa.toString().trim() : '—',
        servicio: servicio,
        comida: comida,
        infraestructura: infraestructura,
        musica: musica,
        comentario: data.comentario || ''
      });
    } catch(emailErr) {
      Logger.log('Error enviando alerta por email: ' + emailErr);
    }
  }

  return { success: true, message: '¡Gracias por tu calificación!' };
}

/**
 * Envía alerta por email cuando una calificación es de 1 estrella (20%)
 * Requiere Script Properties: ALERTA_EMAIL_TO (destinatario)
 * Opcional: ALERTA_EMAIL_FROM (alias "Enviar como" configurado en Gmail)
 */
function enviarAlertaCalificacion(params) {
  var props = PropertiesService.getScriptProperties();
  var emailTo = props.getProperty('ALERTA_EMAIL_TO');
  if (!emailTo) return; // Sin destinatario configurado, no hacer nada

  var emailFrom = props.getProperty('ALERTA_EMAIL_FROM');

  var hora = Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy HH:mm');
  var pct = function(v) { return (v * 20) + '%'; };
  var promedio = ((params.servicio + params.comida + params.infraestructura + params.musica) / 4 * 20).toFixed(1) + '%';

  var asunto = '⚠️ Alerta Calificación BAJA — ' + params.nombre_pv;

  var cuerpo = [
    '⚠️  ALERTA: Calificación muy baja registrada\n',
    'SEDE: ' + params.nombre_pv + '    |    Mesa: ' + params.mesa + '    |    Hora: ' + hora,
    '',
    'Servicio:         ' + pct(params.servicio),
    'Comida:           ' + pct(params.comida),
    'Infraestructura:  ' + pct(params.infraestructura),
    'Música:           ' + pct(params.musica),
    'Promedio:         ' + promedio,
    '',
    'Observaciones del cliente:',
    params.comentario || '(sin comentario)'
  ].join('\n');

  var opciones = { name: 'El Parche del Gato — Alertas' };
  if (emailFrom) opciones.from = emailFrom;

  GmailApp.sendEmail(emailTo, asunto, cuerpo, opciones);
}

/**
 * Obtiene estadísticas por categoría
 */
function getStats(codigoPv) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_RATINGS);
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, stats: { total: 0, servicio: 0, comida: 0, infraestructura: 0, musica: 0 } };
  }

  var stats = { total: 0, servicio: 0, comida: 0, infraestructura: 0, musica: 0 };

  for (var i = 1; i < data.length; i++) {
    if (codigoPv && data[i][1] !== codigoPv) continue;

    stats.total++;
    stats.servicio += Number(data[i][5]) || 0;
    stats.comida += Number(data[i][6]) || 0;
    stats.infraestructura += Number(data[i][7]) || 0;
    stats.musica += Number(data[i][8]) || 0;
  }

  if (stats.total > 0) {
    stats.servicio = Math.round((stats.servicio / stats.total) * 100) / 100;
    stats.comida = Math.round((stats.comida / stats.total) * 100) / 100;
    stats.infraestructura = Math.round((stats.infraestructura / stats.total) * 100) / 100;
    stats.musica = Math.round((stats.musica / stats.total) * 100) / 100;
  }

  return { success: true, stats: stats };
}

/**
 * Obtiene datos completos para el dashboard de métricas
 * Parámetros opcionales: codigoPv (filtro de sede), fechaInicio y fechaFin (YYYY-MM-DD)
 */
function getDashboard(codigoPv, fechaInicio, fechaFin) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_RATINGS);
  var data = sheet.getDataRange().getValues();

  // Parsear fechas de filtro
  var dateInicio = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : null;
  var dateFin = fechaFin ? new Date(fechaFin + 'T23:59:59') : null;

  // Acumuladores
  var resumen = { total: 0, servicio: 0, comida: 0, infraestructura: 0, musica: 0 };
  var porSedeMap = {};
  var tendenciaMap = {};
  var porMesaMap = {};
  var porHoraMap = {};
  var distribucion = {
    servicio: [0, 0, 0, 0, 0],
    comida: [0, 0, 0, 0, 0],
    infraestructura: [0, 0, 0, 0, 0],
    musica: [0, 0, 0, 0, 0]
  };
  var comentarios = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var timestamp = row[0];
    var rowCodigo = row[1];
    var rowNombre = row[2];
    var rowMesa = row[4];
    var servicio = Number(row[5]) || 0;
    var comida = Number(row[6]) || 0;
    var infraestructura = Number(row[7]) || 0;
    var musica = Number(row[8]) || 0;
    var comentario = row[9] ? String(row[9]).trim() : '';

    // Filtro de sede
    if (codigoPv && codigoPv !== 'ALL' && rowCodigo !== codigoPv) continue;

    // Filtro de fechas
    var rowDate = new Date(timestamp);
    if (dateInicio && rowDate < dateInicio) continue;
    if (dateFin && rowDate > dateFin) continue;

    // Resumen general
    resumen.total++;
    resumen.servicio += servicio;
    resumen.comida += comida;
    resumen.infraestructura += infraestructura;
    resumen.musica += musica;

    // Por sede
    if (!porSedeMap[rowCodigo]) {
      porSedeMap[rowCodigo] = { codigo_pv: rowCodigo, nombre_pv: rowNombre, total: 0, servicio: 0, comida: 0, infraestructura: 0, musica: 0 };
    }
    porSedeMap[rowCodigo].total++;
    porSedeMap[rowCodigo].servicio += servicio;
    porSedeMap[rowCodigo].comida += comida;
    porSedeMap[rowCodigo].infraestructura += infraestructura;
    porSedeMap[rowCodigo].musica += musica;

    // Tendencia por día
    var fechaStr = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (!tendenciaMap[fechaStr]) {
      tendenciaMap[fechaStr] = { fecha: fechaStr, total: 0, servicio: 0, comida: 0, infraestructura: 0, musica: 0 };
    }
    tendenciaMap[fechaStr].total++;
    tendenciaMap[fechaStr].servicio += servicio;
    tendenciaMap[fechaStr].comida += comida;
    tendenciaMap[fechaStr].infraestructura += infraestructura;
    tendenciaMap[fechaStr].musica += musica;

    // Distribución (índice 0 = rating 1, índice 4 = rating 5)
    if (servicio >= 1 && servicio <= 5) distribucion.servicio[servicio - 1]++;
    if (comida >= 1 && comida <= 5) distribucion.comida[comida - 1]++;
    if (infraestructura >= 1 && infraestructura <= 5) distribucion.infraestructura[infraestructura - 1]++;
    if (musica >= 1 && musica <= 5) distribucion.musica[musica - 1]++;

    // Por hora
    var hora = rowDate.getHours();
    if (!porHoraMap[hora]) {
      porHoraMap[hora] = { hora: hora, total: 0, servicio: 0, comida: 0, infraestructura: 0, musica: 0 };
    }
    porHoraMap[hora].total++;
    porHoraMap[hora].servicio += servicio;
    porHoraMap[hora].comida += comida;
    porHoraMap[hora].infraestructura += infraestructura;
    porHoraMap[hora].musica += musica;

    // Por mesa (solo si tiene número de mesa)
    var mesaKey = rowMesa ? String(rowMesa).trim() : '';
    if (mesaKey) {
      if (!porMesaMap[mesaKey]) {
        porMesaMap[mesaKey] = {
          mesa: mesaKey,
          total: 0,
          servicio: [0, 0, 0, 0, 0],
          comida: [0, 0, 0, 0, 0],
          infraestructura: [0, 0, 0, 0, 0],
          musica: [0, 0, 0, 0, 0]
        };
      }
      porMesaMap[mesaKey].total++;
      if (servicio >= 1 && servicio <= 5) porMesaMap[mesaKey].servicio[servicio - 1]++;
      if (comida >= 1 && comida <= 5) porMesaMap[mesaKey].comida[comida - 1]++;
      if (infraestructura >= 1 && infraestructura <= 5) porMesaMap[mesaKey].infraestructura[infraestructura - 1]++;
      if (musica >= 1 && musica <= 5) porMesaMap[mesaKey].musica[musica - 1]++;
    }

    // Comentarios no vacíos
    if (comentario) {
      comentarios.push({
        timestamp: Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
        nombre_pv: rowNombre,
        mesa: rowMesa ? String(rowMesa) : '',
        comentario: comentario
      });
    }
  }

  // Calcular promedios en resumen
  if (resumen.total > 0) {
    resumen.servicio = Math.round((resumen.servicio / resumen.total) * 100) / 100;
    resumen.comida = Math.round((resumen.comida / resumen.total) * 100) / 100;
    resumen.infraestructura = Math.round((resumen.infraestructura / resumen.total) * 100) / 100;
    resumen.musica = Math.round((resumen.musica / resumen.total) * 100) / 100;
    resumen.general = Math.round(((resumen.servicio + resumen.comida + resumen.infraestructura + resumen.musica) / 4) * 100) / 100;
  } else {
    resumen.general = 0;
  }

  // Calcular promedios por sede
  var porSede = Object.values(porSedeMap).map(function(s) {
    if (s.total > 0) {
      return {
        codigo_pv: s.codigo_pv,
        nombre_pv: s.nombre_pv,
        total: s.total,
        servicio: Math.round((s.servicio / s.total) * 100) / 100,
        comida: Math.round((s.comida / s.total) * 100) / 100,
        infraestructura: Math.round((s.infraestructura / s.total) * 100) / 100,
        musica: Math.round((s.musica / s.total) * 100) / 100
      };
    }
    return s;
  });

  // Calcular promedios en tendencia y ordenar por fecha
  var tendencia = Object.values(tendenciaMap).map(function(t) {
    if (t.total > 0) {
      return {
        fecha: t.fecha,
        total: t.total,
        servicio: Math.round((t.servicio / t.total) * 100) / 100,
        comida: Math.round((t.comida / t.total) * 100) / 100,
        infraestructura: Math.round((t.infraestructura / t.total) * 100) / 100,
        musica: Math.round((t.musica / t.total) * 100) / 100
      };
    }
    return t;
  }).sort(function(a, b) { return a.fecha.localeCompare(b.fecha); });

  // Últimos 20 comentarios (más recientes primero)
  comentarios = comentarios.reverse().slice(0, 20);

  // Por mesa: ordenar por total descendente
  var porMesa = Object.values(porMesaMap).sort(function(a, b) { return b.total - a.total; });

  // Por hora: calcular promedios y ordenar por hora
  var porHora = Object.values(porHoraMap).map(function(h) {
    if (h.total > 0) {
      return {
        hora: h.hora,
        total: h.total,
        servicio: Math.round((h.servicio / h.total) * 100) / 100,
        comida: Math.round((h.comida / h.total) * 100) / 100,
        infraestructura: Math.round((h.infraestructura / h.total) * 100) / 100,
        musica: Math.round((h.musica / h.total) * 100) / 100
      };
    }
    return h;
  }).sort(function(a, b) { return a.hora - b.hora; });

  return {
    success: true,
    resumen: resumen,
    por_sede: porSede,
    tendencia: tendencia,
    distribucion: distribucion,
    comentarios: comentarios,
    por_mesa: porMesa,
    por_hora: porHora
  };
}

/**
 * Genera respuesta JSON
 */
function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Genera respuesta JSONP para evitar CORS
 */
function jsonpResponse(data, callback) {
  var jsonData = JSON.stringify(data);
  var output = ContentService.createTextOutput(callback + '(' + jsonData + ')');
  output.setMimeType(ContentService.MimeType.JAVASCRIPT);
  return output;
}

/**
 * Inicializa las hojas con la estructura correcta
 * Ejecutar UNA VEZ para configurar el spreadsheet
 */
function initializeSheets() {
  var ss = getSpreadsheet();

  // Hoja de Configuración
  var configSheet = ss.getSheetByName(SHEET_CONFIG);
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEET_CONFIG);
  }

  configSheet.clear();
  configSheet.appendRow([
    'codigo_pv',
    'nombre_pv',
    'nombre_marca',
    'logo_url',
    'color_primario',
    'color_secundario',
    'solicitar_factura',
    'prefijo_factura',
    'solicitar_mesa',
    'activo'
  ]);

  configSheet.appendRow(['PV001', 'Colseguros 360°', 'El Parche del Gato', '', '#ff6600', '#ffcc00', 'NO', '', 'OPCIONAL', true]);
  configSheet.appendRow(['PV002', 'Santa Fe Terraza', 'El Parche del Gato', '', '#ff6600', '#ffcc00', 'NO', '', 'OPCIONAL', true]);
  configSheet.appendRow(['PV003', 'Parque de la Caña Lago', 'El Parche del Gato', '', '#ff6600', '#ffcc00', 'NO', '', 'OPCIONAL', true]);

  // Hoja de Calificaciones
  var ratingsSheet = ss.getSheetByName(SHEET_RATINGS);
  if (!ratingsSheet) {
    ratingsSheet = ss.insertSheet(SHEET_RATINGS);
  }

  ratingsSheet.clear();
  ratingsSheet.appendRow([
    'timestamp',
    'codigo_pv',
    'nombre_pv',
    'numero_factura',
    'numero_mesa',
    'servicio',
    'comida',
    'infraestructura',
    'musica',
    'comentario'
  ]);

  Logger.log('Hojas inicializadas correctamente para El Parche del Gato');
}

/**
 * Función de prueba
 */
function testGetConfig() {
  var result = getConfig('PV001');
  Logger.log(result);
}
