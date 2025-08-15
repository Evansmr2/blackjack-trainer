# 🃏 Blackjack Trainer - Juego Multijugador

Un juego de Blackjack moderno con soporte para múltiples jugadores y múltiples manos simultáneas.

## ✨ Características

- 🎮 **Modo Multijugador**: Juega con amigos desde cualquier lugar
- 🃏 **Múltiples Manos**: Hasta 5 manos por jugador
- 📊 **Sistema de Entrenamiento**: Mejora tus habilidades
- 🎨 **Diseño Responsive**: Funciona en móviles y escritorio
- ⚡ **Tiempo Real**: Sincronización instantánea

## 🚀 Deployment en Vercel

### Opción 1: Desde GitHub (Recomendado)

1. **Sube el proyecto a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/blackjack-trainer.git
   git push -u origin main
   ```

2. **Conecta con Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Haz clic en "New Project"
   - Importa tu repositorio de GitHub
   - Vercel detectará automáticamente la configuración
   - Haz clic en "Deploy"

### Opción 2: Vercel CLI

1. **Instala Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy desde la carpeta del proyecto:**
   ```bash
   vercel
   ```

3. **Sigue las instrucciones en pantalla**

### Opción 3: Drag & Drop

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Arrastra toda la carpeta del proyecto
3. Vercel lo desplegará automáticamente

## 🎮 Cómo Jugar

### Modo Individual
1. Selecciona "Individual" en el selector de modo
2. Elige el número de manos (1-5)
3. Haz tu apuesta y comienza a jugar

### Modo Multijugador
1. Selecciona "Multijugador"
2. Ingresa tu nombre
3. Comparte la URL con tus amigos
4. ¡Disfruten jugando juntos!

## 📁 Estructura del Proyecto

```
blackjack-trainer/
├── index.html              # Página de inicio
├── blackjack_trainer.html  # Juego principal
├── vercel.json             # Configuración de Vercel
├── README.md               # Este archivo
└── test_simple.html        # Archivo de pruebas
```

## 🔧 Configuración

El archivo `vercel.json` incluye:
- Configuración de rutas
- Headers de cache
- Redirects automáticos

## 🌐 URLs Después del Deploy

- **Página Principal**: `https://tu-proyecto.vercel.app/`
- **Juego Directo**: `https://tu-proyecto.vercel.app/game`
- **Trainer**: `https://tu-proyecto.vercel.app/blackjack_trainer.html`

## 🤝 Invitar Amigos

Una vez desplegado en Vercel:
1. Comparte la URL de tu proyecto
2. Los amigos pueden acceder desde cualquier lugar
3. Seleccionen modo multijugador
4. ¡A jugar!

## 🛠️ Desarrollo Local

```bash
# Servidor simple con Python
python -m http.server 8000

# O con Node.js
npx serve .
```

## 📱 Compatibilidad

- ✅ Chrome/Edge/Safari/Firefox
- ✅ Móviles y tablets
- ✅ Todos los sistemas operativos

## 🎯 Próximas Características

- [ ] Chat en tiempo real
- [ ] Torneos
- [ ] Estadísticas avanzadas
- [ ] Temas personalizables
- [ ] Sonidos y efectos

---

¡Disfruta jugando Blackjack con tus amigos! 🎉