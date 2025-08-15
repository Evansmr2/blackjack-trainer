// Script específico para solucionar problemas en navegadores de escritorio
// Detecta si es un navegador de escritorio y aplica fixes específicos

(function() {
    'use strict';
    
    // Detectar si es dispositivo móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) {
        console.log('🖥️ Navegador de escritorio detectado - Aplicando fixes específicos');
        
        // Fix 1: Forzar recarga de event listeners
        function forceReloadEventListeners() {
            const buttons = document.querySelectorAll('button');
            buttons.forEach(button => {
                // Clonar el botón para eliminar todos los event listeners
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
            });
            console.log('🔄 Event listeners recargados para', buttons.length, 'botones');
        }
        
        // Fix 2: Verificar y reparar funciones globales
        function repairGlobalFunctions() {
            const functionsToCheck = ['dealCards', 'hit', 'stand', 'doubleDown', 'split'];
            
            functionsToCheck.forEach(funcName => {
                if (typeof window[funcName] !== 'function') {
                    console.warn('⚠️ Función', funcName, 'no encontrada en window');
                    
                    // Intentar encontrar la función en el objeto BlackjackTrainer
                    if (window.BlackjackTrainer && typeof window.BlackjackTrainer[funcName] === 'function') {
                        window[funcName] = window.BlackjackTrainer[funcName].bind(window.BlackjackTrainer);
                        console.log('✅ Función', funcName, 'reparada desde BlackjackTrainer');
                    }
                }
            });
        }
        
        // Fix 3: Limpiar caché del navegador programáticamente
        function clearBrowserCache() {
            // Agregar timestamp a todos los recursos
            const timestamp = Date.now();
            const scripts = document.querySelectorAll('script[src]');
            const links = document.querySelectorAll('link[href]');
            
            scripts.forEach(script => {
                if (script.src && !script.src.includes('?')) {
                    script.src += '?v=' + timestamp;
                }
            });
            
            links.forEach(link => {
                if (link.href && !link.href.includes('?')) {
                    link.href += '?v=' + timestamp;
                }
            });
            
            console.log('🧹 Caché del navegador limpiado');
        }
        
        // Fix 4: Verificar estado del DOM
        function verifyDOMState() {
            const dealButton = document.getElementById('deal-btn');
            const hitButton = document.getElementById('hit-btn');
            const standButton = document.getElementById('stand-btn');
            
            console.log('🔍 Estado de botones:');
            console.log('- Deal button:', dealButton ? 'Encontrado' : 'NO ENCONTRADO');
            console.log('- Hit button:', hitButton ? 'Encontrado' : 'NO ENCONTRADO');
            console.log('- Stand button:', standButton ? 'Encontrado' : 'NO ENCONTRADO');
            
            if (dealButton) {
                console.log('- Deal button onclick:', dealButton.onclick ? 'Asignado' : 'NO ASIGNADO');
                console.log('- Deal button disabled:', dealButton.disabled);
            }
        }
        
        // Fix 5: Aplicar todos los fixes después de que el DOM esté listo
        function applyDesktopFixes() {
            console.log('🚀 Iniciando fixes para navegador de escritorio...');
            
            setTimeout(() => {
                verifyDOMState();
                repairGlobalFunctions();
                forceReloadEventListeners();
                
                // Verificar nuevamente después de los fixes
                setTimeout(() => {
                    verifyDOMState();
                    console.log('✅ Fixes para escritorio completados');
                }, 1000);
            }, 2000);
        }
        
        // Ejecutar fixes cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyDesktopFixes);
        } else {
            applyDesktopFixes();
        }
        
        // También ejecutar fixes cuando la ventana se enfoque (por si viene de otra pestaña)
        window.addEventListener('focus', () => {
            console.log('🔄 Ventana enfocada - Verificando estado...');
            setTimeout(verifyDOMState, 500);
        });
        
    } else {
        console.log('📱 Dispositivo móvil detectado - No se necesitan fixes adicionales');
    }
})();