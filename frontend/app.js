/**
 * Sistema de Calificaciones - El Parche del Gato
 * Aplicación Frontend
 */

(function() {
    'use strict';

    // ========================================
    // Estado de la aplicación
    // ========================================
    const state = {
        config: null,
        codigoPv: null,
        invoiceNumber: '',
        mesaNumber: '',
        ratings: {
            servicio: null,
            comida: null,
            infraestructura: null,
            musica: null
        },
        comment: '',
        logoTapCount: 0,
        logoTapTimer: null
    };

    const CATEGORIES = ['servicio', 'comida', 'infraestructura', 'musica'];

    // ========================================
    // Elementos del DOM
    // ========================================
    const elements = {
        // Pantallas
        loadingScreen: document.getElementById('loading-screen'),
        errorScreen: document.getElementById('error-screen'),
        setupScreen: document.getElementById('setup-screen'),
        welcomeScreen: document.getElementById('welcome-screen'),
        invoiceScreen: document.getElementById('invoice-screen'),
        ratingScreen: document.getElementById('rating-screen'),
        thanksScreen: document.getElementById('thanks-screen'),
        submittingScreen: document.getElementById('submitting-screen'),

        // Mensajes
        errorMessage: document.getElementById('error-message'),

        // Elementos de marca (welcome)
        brandName: document.getElementById('brand-name'),
        storeName: document.getElementById('store-name'),
        logo: document.getElementById('logo'),
        welcomeTitle: document.getElementById('welcome-title'),

        // Elementos de marca (invoice)
        brandNameInvoice: document.getElementById('brand-name-invoice'),
        storeNameInvoice: document.getElementById('store-name-invoice'),
        logoInvoice: document.getElementById('logo-invoice'),

        // Elementos de marca (rating) - removidos del HTML para ganar espacio

        // Invoice
        invoiceInput: document.getElementById('invoice-number'),
        invoicePrefix: document.getElementById('invoice-prefix'),

        // Mesa
        mesaSection: document.getElementById('mesa-section'),
        mesaInput: document.getElementById('mesa-number'),
        mesaLabel: document.getElementById('mesa-label'),
        mesaHint: document.getElementById('mesa-hint'),

        // Rating
        categorySections: document.querySelectorAll('.category-section'),
        commentInput: document.getElementById('comment'),
        charCount: document.getElementById('char-current'),
        btnSubmit: document.getElementById('btn-submit'),

        // Botones
        btnStart: document.getElementById('btn-start'),
        btnSkipInvoice: document.getElementById('btn-skip-invoice'),
        btnContinueInvoice: document.getElementById('btn-continue-invoice'),

        // Countdown
        countdown: document.getElementById('countdown'),

        // Setup
        pinSection: document.getElementById('pin-section'),
        sedeSection: document.getElementById('sede-section'),
        adminPin: document.getElementById('admin-pin'),
        pinError: document.getElementById('pin-error'),
        btnVerifyPin: document.getElementById('btn-verify-pin'),
        sedeSelect: document.getElementById('sede-select'),
        btnSaveSede: document.getElementById('btn-save-sede'),
        btnFullscreen: document.getElementById('btn-fullscreen'),
        appFooter: document.getElementById('app-footer')
    };

    // ========================================
    // Utilidades
    // ========================================
    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log('[ParcheDelGato]', ...args);
        }
    }

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
        log('Screen:', screenId);
    }

    function setColorTheme(primaryColor, secondaryColor) {
        if (primaryColor) {
            document.documentElement.style.setProperty('--color-primary', primaryColor);
            document.documentElement.style.setProperty('--color-primary-dark', adjustColor(primaryColor, -20));
        }
        if (secondaryColor) {
            document.documentElement.style.setProperty('--color-background', secondaryColor);
        }
    }

    function adjustColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }

    // ========================================
    // Storage
    // ========================================
    function getSavedSede() {
        return localStorage.getItem('parche_codigo_pv');
    }

    function saveSede(codigoPv) {
        localStorage.setItem('parche_codigo_pv', codigoPv);
    }

    function clearSede() {
        localStorage.removeItem('parche_codigo_pv');
    }

    // ========================================
    // API con soporte CORS / JSONP
    // ========================================
    function fetchWithCallback(url, timeoutMs) {
        return new Promise((resolve, reject) => {
            var callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            var timer = setTimeout(function() {
                cleanup();
                reject(new Error('JSONP timeout'));
            }, timeoutMs || 15000);

            function cleanup() {
                clearTimeout(timer);
                delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);
            }

            window[callbackName] = function(data) {
                cleanup();
                resolve(data);
            };

            var script = document.createElement('script');
            script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
            script.onerror = function() {
                cleanup();
                reject(new Error('Error de conexión JSONP'));
            };
            document.head.appendChild(script);
        });
    }

    async function apiCall(url) {
        // Intentar JSONP primero (evita CORS)
        try {
            log('Trying JSONP...');
            return await fetchWithCallback(url, 12000);
        } catch (jsonpError) {
            log('JSONP failed:', jsonpError);
        }

        // Fallback a fetch
        try {
            log('Trying fetch...');
            var response = await fetch(url, { method: 'GET', redirect: 'follow' });
            return await response.json();
        } catch (fetchError) {
            log('Fetch also failed:', fetchError);
            throw new Error('No se pudo conectar con el servidor');
        }
    }

    async function fetchConfig(codigoPv) {
        const url = CONFIG.API_URL + '?action=getConfig&codigo_pv=' + encodeURIComponent(codigoPv);
        log('Fetching config:', url);
        const data = await apiCall(url);
        if (!data.success) throw new Error(data.error || 'Error desconocido');
        return data.config;
    }

    async function fetchSedes() {
        const url = CONFIG.API_URL + '?action=getSedes';
        log('Fetching sedes:', url);
        const data = await apiCall(url);
        if (!data.success) throw new Error(data.error || 'Error desconocido');
        return data.sedes;
    }

    async function submitRating(ratingData) {
        log('Submitting:', ratingData);
        const params = new URLSearchParams({
            action: 'saveRating',
            codigo_pv: ratingData.codigo_pv,
            numero_factura: ratingData.numero_factura || '',
            numero_mesa: ratingData.numero_mesa || '',
            servicio: ratingData.servicio,
            comida: ratingData.comida,
            infraestructura: ratingData.infraestructura,
            musica: ratingData.musica,
            comentario: ratingData.comentario || ''
        });
        const url = CONFIG.API_URL + '?' + params.toString();
        const data = await apiCall(url);
        if (!data.success) throw new Error(data.error || 'Error al guardar');
        return data;
    }

    // ========================================
    // UI Updates
    // ========================================
    function updateBranding(config) {
        const title = config.nombre_marca || 'El Parche del Gato';
        const store = config.nombre_pv || '';

        // Welcome screen
        elements.brandName.textContent = title;
        elements.storeName.textContent = store;
        elements.welcomeTitle.textContent = '\u00BFC\u00F3mo estuvo tu experiencia en ' + title + ' ' + store + '?';

        // Invoice screen
        elements.brandNameInvoice.textContent = title;
        elements.storeNameInvoice.textContent = store;

        // Logo
        if (config.logo_url) {
            elements.logo.src = config.logo_url;
            elements.logo.classList.remove('hidden');
            elements.logoInvoice.src = config.logo_url;
            elements.logoInvoice.classList.remove('hidden');
        }

        // Colores
        setColorTheme(config.color_primario, config.color_secundario);

        // Prefijo factura
        if (config.prefijo_factura) {
            elements.invoicePrefix.textContent = config.prefijo_factura;
            elements.invoicePrefix.style.display = 'flex';
        }

        // Mesa
        var mesaMode = (config.solicitar_mesa || 'NO').toUpperCase();
        if (mesaMode === 'OBLIGATORIO' || mesaMode === 'OPCIONAL' || mesaMode === 'SI') {
            elements.mesaSection.classList.remove('hidden');
            if (mesaMode === 'OBLIGATORIO') {
                elements.mesaLabel.textContent = 'Número de Mesa *';
                elements.mesaHint.textContent = 'Este campo es obligatorio';
                elements.mesaInput.required = true;
            } else {
                elements.mesaLabel.textContent = 'Número de Mesa';
                elements.mesaHint.textContent = 'Opcional';
                elements.mesaInput.required = false;
            }
        } else {
            elements.mesaSection.classList.add('hidden');
            elements.mesaInput.required = false;
        }
    }

    function resetForm() {
        CATEGORIES.forEach(cat => state.ratings[cat] = null);
        state.invoiceNumber = '';
        state.mesaNumber = '';
        state.comment = '';

        elements.invoiceInput.value = '';
        elements.mesaInput.value = '';
        elements.commentInput.value = '';
        elements.charCount.textContent = '0';
        elements.btnSubmit.disabled = true;
        elements.mesaInput.classList.remove('error');
        elements.mesaHint.classList.remove('error');
        if (state.config) {
            var mesaMode = (state.config.solicitar_mesa || 'NO').toUpperCase();
            elements.mesaHint.textContent = mesaMode === 'OBLIGATORIO' ? 'Este campo es obligatorio' : 'Opcional';
        }

        document.querySelectorAll('.rating-btn').forEach(btn => btn.classList.remove('selected'));
    }

    function checkAllRated() {
        const allRated = CATEGORIES.every(cat => state.ratings[cat] !== null);
        var mesaMode = state.config ? (state.config.solicitar_mesa || 'NO').toUpperCase() : 'NO';
        var mesaOk = true;
        if (mesaMode === 'OBLIGATORIO') {
            mesaOk = elements.mesaInput.value.trim().length > 0;
        }
        elements.btnSubmit.disabled = !(allRated && mesaOk);
        return allRated && mesaOk;
    }

    // ========================================
    // Navigation
    // ========================================
    function goToRating() {
        resetForm();
        if (state.config && state.config.solicitar_factura === true) {
            showScreen('invoice-screen');
            elements.invoiceInput.focus();
        } else {
            showScreen('rating-screen');
        }
    }

    function handleSkipInvoice() {
        state.invoiceNumber = '';
        showScreen('rating-screen');
    }

    function handleContinueInvoice() {
        const prefix = state.config.prefijo_factura || '';
        state.invoiceNumber = prefix + elements.invoiceInput.value.toUpperCase().trim();
        showScreen('rating-screen');
    }

    // ========================================
    // Rating Handlers
    // ========================================
    function handleRatingClick(e) {
        const btn = e.currentTarget;
        const section = btn.closest('.category-section');
        const category = section.dataset.category;
        const rating = parseInt(btn.dataset.rating);

        // Deseleccionar todos en esta categoría
        section.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        state.ratings[category] = rating;
        log('Rating:', category, '=', rating);

        checkAllRated();
    }

    function handleCommentInput(e) {
        state.comment = e.target.value;
        elements.charCount.textContent = state.comment.length;
    }

    // ========================================
    // Submit
    // ========================================
    async function handleSubmit() {
        if (!checkAllRated()) return;

        // Validar mesa obligatoria
        var mesaMode = state.config ? (state.config.solicitar_mesa || 'NO').toUpperCase() : 'NO';
        state.mesaNumber = elements.mesaInput.value.trim();
        if (mesaMode === 'OBLIGATORIO' && !state.mesaNumber) {
            elements.mesaInput.classList.add('error');
            elements.mesaHint.textContent = 'Debes ingresar el número de mesa';
            elements.mesaHint.classList.add('error');
            elements.mesaInput.focus();
            return;
        }

        showScreen('submitting-screen');

        try {
            await submitRating({
                codigo_pv: state.codigoPv,
                numero_factura: state.invoiceNumber,
                numero_mesa: state.mesaNumber,
                servicio: state.ratings.servicio,
                comida: state.ratings.comida,
                infraestructura: state.ratings.infraestructura,
                musica: state.ratings.musica,
                comentario: state.comment
            });

            showScreen('thanks-screen');
            startCountdown();
        } catch (error) {
            log('Submit error:', error);
            alert('Error al enviar. Intenta de nuevo.');
            showScreen('rating-screen');
        }
    }

    function startCountdown() {
        let seconds = CONFIG.RESET_TIMEOUT;
        elements.countdown.textContent = seconds;

        const interval = setInterval(() => {
            seconds--;
            elements.countdown.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(interval);
                goToRating();
            }
        }, 1000);
    }

    // ========================================
    // Setup / Admin
    // ========================================
    function handleVerifyPin() {
        if (elements.adminPin.value === CONFIG.ADMIN_PIN) {
            elements.pinError.classList.add('hidden');
            elements.pinSection.classList.add('hidden');
            elements.sedeSection.classList.remove('hidden');
            loadSedes();
        } else {
            elements.pinError.classList.remove('hidden');
            elements.adminPin.value = '';
            elements.adminPin.focus();
        }
    }

    async function loadSedes() {
        try {
            const sedes = await fetchSedes();
            elements.sedeSelect.innerHTML = '<option value="">Seleccione una sede...</option>';
            sedes.forEach(sede => {
                const option = document.createElement('option');
                option.value = sede.codigo_pv;
                option.textContent = sede.nombre_pv + ' - ' + sede.nombre_marca;
                elements.sedeSelect.appendChild(option);
            });

            const saved = getSavedSede();
            if (saved) {
                elements.sedeSelect.value = saved;
                elements.btnSaveSede.disabled = false;
            }
        } catch (error) {
            log('Error loading sedes:', error);
            elements.sedeSelect.innerHTML = '<option value="">Error: ' + error.message + ' - toca para reintentar</option>';
            elements.sedeSelect.onclick = function() {
                elements.sedeSelect.onclick = null;
                elements.sedeSelect.innerHTML = '<option value="">Reintentando...</option>';
                loadSedes();
            };
        }
    }

    function handleSedeChange() {
        elements.btnSaveSede.disabled = !elements.sedeSelect.value;
    }

    async function handleSaveSede() {
        const codigoPv = elements.sedeSelect.value;
        if (!codigoPv) return;

        showScreen('loading-screen');
        saveSede(codigoPv);
        state.codigoPv = codigoPv;

        try {
            state.config = await fetchConfig(codigoPv);
            updateBranding(state.config);
            goToRating();
        } catch (error) {
            log('Config error:', error);
            elements.errorMessage.textContent = error.message;
            showScreen('error-screen');
        }
    }

    function showSetupScreen() {
        elements.pinSection.classList.remove('hidden');
        elements.sedeSection.classList.add('hidden');
        elements.adminPin.value = '';
        elements.pinError.classList.add('hidden');
        showScreen('setup-screen');
        elements.adminPin.focus();
    }

    // ========================================
    // Accesos secretos
    // ========================================
    function handleKeyboardShortcut(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            showSetupScreen();
        }
    }

    function handleLogoTap() {
        state.logoTapCount++;
        if (state.logoTapTimer) clearTimeout(state.logoTapTimer);

        if (state.logoTapCount >= 5) {
            state.logoTapCount = 0;
            showSetupScreen();
            return;
        }

        state.logoTapTimer = setTimeout(() => {
            state.logoTapCount = 0;
        }, 2000);
    }

    function enterFullscreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            enterFullscreen();
            elements.btnFullscreen.textContent = 'Salir Pantalla Completa';
            localStorage.setItem('parche_fullscreen', 'true');
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            elements.btnFullscreen.textContent = 'Pantalla Completa';
            localStorage.setItem('parche_fullscreen', 'false');
        }
    }

    function handleUserInteraction() {
        if (localStorage.getItem('parche_fullscreen') === 'true' &&
            !document.fullscreenElement && !document.webkitFullscreenElement) {
            enterFullscreen();
        }
    }

    // ========================================
    // Event Binding
    // ========================================
    function bindEvents() {
        // Welcome
        elements.btnStart.addEventListener('click', goToRating);

        // Invoice
        elements.btnSkipInvoice.addEventListener('click', handleSkipInvoice);
        elements.btnContinueInvoice.addEventListener('click', handleContinueInvoice);
        elements.invoiceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleContinueInvoice();
        });

        // Rating buttons (todas las categorías)
        document.querySelectorAll('.category-section .rating-btn').forEach(btn => {
            btn.addEventListener('click', handleRatingClick);
        });

        // Mesa
        elements.mesaInput.addEventListener('input', function() {
            state.mesaNumber = elements.mesaInput.value.trim();
            elements.mesaInput.classList.remove('error');
            elements.mesaHint.classList.remove('error');
            var mesaMode = state.config ? (state.config.solicitar_mesa || 'NO').toUpperCase() : 'NO';
            if (mesaMode === 'OBLIGATORIO') {
                elements.mesaHint.textContent = state.mesaNumber ? 'Este campo es obligatorio' : 'Debes ingresar el número de mesa';
            }
            checkAllRated();
        });

        // Comment
        elements.commentInput.addEventListener('input', handleCommentInput);

        // Submit
        elements.btnSubmit.addEventListener('click', handleSubmit);

        // Setup
        elements.btnVerifyPin.addEventListener('click', handleVerifyPin);
        elements.adminPin.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleVerifyPin();
        });
        elements.sedeSelect.addEventListener('change', handleSedeChange);
        elements.btnSaveSede.addEventListener('click', handleSaveSede);

        // Shortcuts
        document.addEventListener('keydown', handleKeyboardShortcut);
        elements.logo.addEventListener('click', handleLogoTap);
        elements.appFooter.addEventListener('click', handleLogoTap);

        // Fullscreen
        elements.btnFullscreen.addEventListener('click', toggleFullscreen);
        document.addEventListener('click', handleUserInteraction);
        document.addEventListener('touchstart', handleUserInteraction);
    }

    // ========================================
    // Inicialización
    // ========================================
    async function init() {
        log('Initializing...');
        bindEvents();

        const savedSede = getSavedSede();

        if (savedSede) {
            state.codigoPv = savedSede;
            log('Sede guardada:', savedSede);

            try {
                state.config = await fetchConfig(savedSede);
                updateBranding(state.config);
                goToRating();
            } catch (error) {
                log('Init error:', error);
                clearSede();
                showSetupScreen();
            }
        } else {
            log('Sin sede guardada');
            showSetupScreen();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
