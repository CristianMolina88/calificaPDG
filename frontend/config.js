/**
 * Configuración del Sistema de Calificaciones
 * El Parche del Gato
 *
 * INSTRUCCIONES:
 * 1. Reemplaza API_URL con la URL de tu Web App de Google Apps Script
 * 2. Cambia ADMIN_PIN por un PIN seguro de 4 dígitos
 */

const CONFIG = {
    // URL de la API (Google Apps Script Web App)
    // Reemplazar con tu URL después de publicar el script
    API_URL: 'https://script.google.com/macros/s/AKfycbyhQbXca5BPg1BQJwQ9lN52EqDVz38sbGUO5khCvmYHe7PRFSCyN_1TXEoyKj8_CStg/exec',

    // PIN de administrador para configurar la sede (4 dígitos)
    ADMIN_PIN: '1234',

    // Tiempo en segundos antes de reiniciar después de calificar
    RESET_TIMEOUT: 15,

    // Modo debug (mostrar logs en consola)
    DEBUG: true
};
