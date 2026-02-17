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

  return { success: true, message: '¡Gracias por tu calificación!' };
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
