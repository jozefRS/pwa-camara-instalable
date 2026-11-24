// ---------- Referencias al DOM (todas arriba, una sola vez) ----------
const visorVideo    = document.getElementById('visor-camara');
const mensajeEstado = document.getElementById('mensaje-estado');
const avisoPermiso  = document.getElementById('aviso-permiso');
const btnPreparar   = document.getElementById('btn-preparar-camara');
const btnConfirmar  = document.getElementById('btn-confirmar-permiso');
const btnAlternar   = document.getElementById('btn-alternar-camara');
const btnApagar     = document.getElementById('btn-apagar-camara');
const btnInstalar   = document.getElementById('btn-instalar');
const ayudaIOS      = document.getElementById('ayuda-ios');

// ---------- Estado ----------
let eventoInstalacionDiferido = null;
let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal

function actualizarMensajeEstado(texto) {
  mensajeEstado.textContent = texto;
}

// ---------- Instalación (Android/Chrome) ----------
window.addEventListener('beforeinstallprompt', (evento) => {
  evento.preventDefault();
  eventoInstalacionDiferido = evento;
  btnInstalar.hidden = false;
});

btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) return;

  eventoInstalacionDiferido.prompt();

  eventoInstalacionDiferido.userChoice.then((resultado) => {
    if (resultado.outcome === 'accepted') {
      btnInstalar.hidden = true;
    }
    eventoInstalacionDiferido = null;
  });
});

// ---------- Service worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('SW registrado:', reg.scope))
      .catch((err) => console.error('Error al registrar SW:', err));
  });
}

// ---------- Cámara ----------
function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach((track) => track.stop());
    streamActual = null;
  }
}

function iniciarCamara(modo) {
  detenerCamaraActiva();
  actualizarMensajeEstado('Iniciando cámara…');

  const restricciones = {
    video: { facingMode: { ideal: modo } },
    audio: false
  };

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      visorVideo.srcObject = stream;
      return visorVideo.play().catch(() => {});
    })
    .then(() => {
      actualizarMensajeEstado(
        `Cámara activa (${modo === 'environment' ? 'Trasera' : 'Frontal'})`
      );
    })
    .catch((error) => {
      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.');
      } else if (error.name === 'NotFoundError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.');
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`);
      }
    });
}

// Paso 1: mostrar el aviso explicativo
btnPreparar.addEventListener('click', () => {
  avisoPermiso.hidden = false;
});

// Paso 2: el usuario acepta y se enciende la cámara
btnConfirmar.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});

// Alternar cámara
btnAlternar.addEventListener('click', () => {
  modoCamaraActual = (modoCamaraActual === 'environment') ? 'user' : 'environment';
  iniciarCamara(modoCamaraActual);
});

// Apagar cámara
btnApagar.addEventListener('click', () => {
  detenerCamaraActiva();
  visorVideo.srcObject = null;
  actualizarMensajeEstado('Cámara apagada.');
});

// Reanudar el video al volver a la app (iOS lo congela)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && streamActual) {
    visorVideo.play().catch(() => {});
  }
});

// ---------- Ayuda de instalación en iOS ----------
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const yaInstalada = window.navigator.standalone === true
  || window.matchMedia('(display-mode: standalone)').matches;

if (esIOS && !yaInstalada) {
  ayudaIOS.hidden = false;
}