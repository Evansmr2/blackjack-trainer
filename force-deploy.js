// Script para forzar deployment en Vercel
// Este archivo cambia automáticamente para forzar nuevos deployments

const deploymentInfo = {
    timestamp: new Date().toISOString(),
    version: '2024.01.20.001',
    changes: [
        'Botones de apuestas corregidos',
        'Event listeners implementados correctamente',
        'Métodos de apuestas movidos a la clase BlackjackTrainer',
        'Caché deshabilitado en Vercel',
        'Indicador visual de versión agregado'
    ],
    status: 'DEPLOYMENT_FORCED',
    buildId: Math.random().toString(36).substring(2, 15)
};

// Log para verificar que el deployment se ejecutó
console.log('🚀 Force Deploy Script Executed:', deploymentInfo);

// Función para verificar si los botones funcionan
function verifyButtonFunctionality() {
    const buttons = {
        dealBtn: document.getElementById('dealBtn'),
        hitBtn: document.getElementById('hitBtn'),
        standBtn: document.getElementById('standBtn'),
        doubleBtn: document.getElementById('doubleBtn'),
        splitBtn: document.getElementById('splitBtn')
    };
    
    let workingButtons = 0;
    let totalButtons = 0;
    
    for (const [name, button] of Object.entries(buttons)) {
        totalButtons++;
        if (button && button.onclick) {
            workingButtons++;
            console.log(`✅ ${name} funcionando`);
        } else {
            console.log(`❌ ${name} no funcionando`);
        }
    }
    
    console.log(`📊 Botones funcionando: ${workingButtons}/${totalButtons}`);
    return workingButtons === totalButtons;
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.deploymentInfo = deploymentInfo;
    window.verifyButtonFunctionality = verifyButtonFunctionality;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { deploymentInfo, verifyButtonFunctionality };
}