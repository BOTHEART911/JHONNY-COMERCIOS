/* ============================================================
   JHONNY COMERCIOS — app del comerciante
   PWA nativa. Backend: JHONNY CORE (namespace com.*).

   Seguridad: el PIN (últimos 4 del documento/NIT) solo es comodidad.
   Lo que de verdad protege es el CÓDIGO que llega al correo del comercio
   cuando entra un dispositivo nuevo, y el TOKEN que queda guardado en ese
   dispositivo. Sin token, el backend no deja tocar nada.
   ============================================================ */

const API_URL = 'https://script.google.com/macros/s/AKfycbw9CZ9ra6q1KI88M3U9IsYP861JOCFD4-xrV1b0UFYhL1amBjAqTTmtNXi42vwLI_h6Hw/exec';

const APP_ICON   = 'https://res.cloudinary.com/dqqeavica/image/upload/v1753538807/JHONNY_PERDOMO_dn3dah.png';
const APP_BANNER = 'https://res.cloudinary.com/dqqeavica/image/upload/v1753538919/BANNER_JHONNY_e0yw7m.png';
const APP_PUBLICA = 'https://botheart911.github.io/JHONNY-PERDOMO/';

const JSQR_CDN    = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const FLANDES = { lat: 4.289013, lng: -74.814098 };

/* Sonidos: los MISMOS de JHONNY ASISTENCIA (capa-3 los precarga y los
   reproduce sin retardo). */
const SOUNDS = {
  ok:   'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Pay_success_t5aawh.mp3',
  info: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Default_notification_pkp4wr.mp3',
  err:  'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Low_battery_d5qua1.mp3'
};

/* ============================================================
   HELPERS
   ============================================================ */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const app = $('#app');
const layer = $('#layer');
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const onlyDig = s => String(s || '').replace(/\D/g, '');
const val = id => (($('#' + id) || {}).value || '').trim();

function toast(msg, kind = '') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); layer.appendChild(t); setTimeout(() => t.remove(), 3400); }
function hideSplash() { const s = $('#splash'); if (s && !s.classList.contains('hide')) { s.classList.add('hide'); setTimeout(() => s.remove(), 520); } }
function vibrar(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

const _audio = {};
function sonar(kind) {
  try {
    const src = SOUNDS[kind]; if (!src) return;
    if (!_audio[kind]) { _audio[kind] = new Audio(src); _audio[kind].preload = 'auto'; }
    const a = _audio[kind]; a.currentTime = 0; a.play().catch(() => {});
  } catch (e) {}
}

let _apiActivas = 0;
function loaderOn() { _apiActivas++; const b = $('#ios-loader'); if (b) b.classList.add('active'); }
function loaderOff() { _apiActivas = Math.max(0, _apiActivas - 1); if (_apiActivas === 0) { const b = $('#ios-loader'); if (b) b.classList.remove('active'); } }

async function api(action, params = {}, method = 'GET', body = null, opts = {}) {
  const qs = new URLSearchParams(Object.assign({ action }, params)).toString();
  const o = { method };
  if (method === 'POST') { o.headers = { 'Content-Type': 'text/plain;charset=utf-8' }; o.body = JSON.stringify(body || {}); }
  if (!opts.silencio) loaderOn();
  try {
    const res = await fetch(`${API_URL}?${qs}`, o);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error del servidor');
    return json.data;
  } finally { if (!opts.silencio) loaderOff(); }
}

function saving(btn, on) {
  if (!btn) return;
  btn.disabled = on;
  btn.dataset.txt = btn.dataset.txt || btn.innerHTML;
  btn.innerHTML = on ? `<span class="spinner"></span>` : btn.dataset.txt;
}
function loadingBox(t) { return `<div class="loadbox"><span class="spinner spinner-brand"></span><span class="small muted">${esc(t || 'Cargando…')}</span></div>`; }
function footBrand() { return `<img class="brand-banner" src="${APP_BANNER}" alt="" onerror="this.style.display='none'" /><p class="app-version-line">Versión —</p>`; }
function backbar(titulo, ruta) {
  return `<div class="appbar"><button class="iconbtn" id="backbtn" aria-label="Atrás" data-ruta="${esc(ruta || '')}">‹</button><div class="who"><b>${esc(titulo)}</b></div></div>`;
}
function field(label, inner, hint) {
  return `<label class="field"><span>${esc(label)}</span>${inner}${hint ? `<em class="hint">${hint}</em>` : ''}</label>`;
}
function inputEl(id, attrs) { return `<input class="input" id="${id}" ${attrs || ''} />`; }
function areaEl(id, attrs) { return `<textarea class="input area" id="${id}" ${attrs || ''}></textarea>`; }
function crow(k, v) { return `<div class="ev-row"><b>${esc(k)}</b><span>${esc(v || '—')}</span></div>`; }

function openSheet(html) {
  closeLayer();
  const scrim = h(`<div class="scrim"></div>`);
  const sheet = h(`<div class="sheet">${html}</div>`);
  layer.appendChild(scrim); layer.appendChild(sheet);
  document.body.classList.add('sheet-open');
  scrim.onclick = closeLayer;
  layer.querySelectorAll('[data-close]').forEach(b => b.onclick = closeLayer);
  return sheet;
}
function closeLayer() {
  layer.querySelectorAll('.scrim,.sheet').forEach(e => e.remove());
  document.body.classList.remove('sheet-open');
}
function confirmar(titulo, cuerpo, textoOk) {
  return new Promise(res => {
    const s = openSheet(`<div class="grip"></div><h2 class="h2">${esc(titulo)}</h2>
      <div class="ev-card" style="margin-top:12px;">${cuerpo}</div>
      <div class="stack" style="margin-top:14px;">
        <button class="btn btn-primary btn-block" id="cf-ok">${esc(textoOk || 'Confirmar')}</button>
        <button class="btn btn-ghost btn-block" data-close>Volver</button>
      </div>`);
    $('#cf-ok', s).onclick = () => { closeLayer(); res(true); };
    s.parentElement.querySelector('.scrim').onclick = () => { closeLayer(); res(false); };
    s.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { closeLayer(); res(false); });
  });
}

/* ============================================================
   SESIÓN DEL DISPOSITIVO
   ============================================================ */
const SES_KEY  = 'jpComSesion';
const DISP_KEY = 'jpComDisp';
let SES = null;

function dispositivo() {
  let d = '';
  try { d = localStorage.getItem(DISP_KEY) || ''; } catch (e) {}
  if (!d) {
    const ua = navigator.userAgent || '';
    const marca = /iphone|ipad/i.test(ua) ? 'iPhone/iPad' : /android/i.test(ua) ? 'Android' : /mac/i.test(ua) ? 'Mac' : /windows/i.test(ua) ? 'Windows' : 'Navegador';
    d = marca + ' · ' + Math.random().toString(36).slice(2, 8);
    try { localStorage.setItem(DISP_KEY, d); } catch (e) {}
  }
  return d;
}
function sesLeer() { try { SES = JSON.parse(localStorage.getItem(SES_KEY) || 'null'); } catch (e) { SES = null; } return SES; }
function sesGuardar(s) { SES = s; try { localStorage.setItem(SES_KEY, JSON.stringify(s)); } catch (e) {} }
function sesBorrar() { SES = null; try { localStorage.removeItem(SES_KEY); } catch (e) {} }
function auth() { return SES ? { nit: SES.nit, token: SES.token } : {}; }

/* ============================================================
   INSTALACIÓN (PWA)
   ============================================================ */
let deferredPrompt = null;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /(iphone|ipad|ipod)/i.test(navigator.userAgent || '');
const esMovil = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; updateInstallSection(); });

function updateInstallSection() {
  const b = $('#btn-install'); if (!b) return;
  b.disabled = !deferredPrompt;
  b.textContent = deferredPrompt ? 'Instalar la app' : 'Instalación no disponible aquí';
}

/* ============================================================
   VERSIÓN
   ============================================================ */
let APP_VERSION_LOADED = '', __verInFlight = false;
function paintVersion(v) { $$('.app-version-line').forEach(el => el.textContent = 'Versión ' + v); }
async function checkVersion() {
  if (__verInFlight) return; __verInFlight = true;
  try {
    const r = await fetch('version.js?t=' + Date.now(), { cache: 'no-store' });
    const txt = await r.text();
    const m = txt.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    if (!m) return;
    APP_VERSION_LOADED = m[1]; paintVersion(m[1]);
    if (typeof APP_VERSION !== 'undefined' && APP_VERSION !== m[1]) {
      try { const regs = await navigator.serviceWorker.getRegistrations(); regs.forEach(x => x.update()); } catch (e) {}
      setTimeout(() => location.reload(true), 800);
    }
  } catch (e) {} finally { __verInFlight = false; }
}

/* ============================================================
   RUTEO
   ============================================================ */
function go(route) { location.hash = '#/' + route; }
function rutaActual() { return (location.hash || '').replace(/^#\//, ''); }

function render() {
  const r = rutaActual();
  const base = r.split('?')[0];
  if (base !== 'validar') scanStop();
  if (!isStandalone() && !sessionStorage.getItem('continuedWeb') && base !== 'instalar') return viewInstalar();

  sesLeer();
  const privadas = ['home', 'politicas', 'actualizar', 'validar', 'clientes', 'preview', 'avisos'];
  if (privadas.indexOf(base) >= 0 && !SES) return go('login');

  switch (base) {
    case 'instalar':   return viewInstalar();
    case 'login':      return viewLogin();
    case 'registro':   return viewRegistro();
    case 'home':       return viewHome();
    case 'politicas':  return viewPoliticas();
    case 'actualizar': return viewActualizar();
    case 'validar':    return viewValidar();
    case 'clientes':   return viewClientes();
    case 'preview':    return viewPreview();
    case 'avisos':     return viewAvisos();
    default:           return SES ? go('home') : go('login');
  }
}
window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => { sesLeer(); render(); checkVersion(); });
if (document.readyState !== 'loading') { sesLeer(); render(); checkVersion(); }

function montar(html) {
  app.innerHTML = html;
  app.hidden = false;
  hideSplash();
  paintVersion(APP_VERSION_LOADED || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''));
  const b = $('#backbtn');
  if (b) b.onclick = () => go(b.dataset.ruta || 'home');
}

/* ============================================================
   VISTA · INSTALAR
   ============================================================ */
function viewInstalar() {
  montar(`
    <div class="login-wrap"><div class="login-card">
      <img class="login-logo" src="${APP_ICON}" alt="Jhonny Perdomo" />
      <h1 class="login-title">Comercios</h1>
      <p class="login-sub">Soy de Flandes · Jhonny Perdomo</p>
      <p class="muted small" style="margin:10px 0 16px;">Instala la app en tu teléfono para entrar de una sola vez y tenerla siempre a mano.</p>
      ${isIOS() ? `
        <div class="ios-steps-wrap">
          <p class="small" style="font-weight:700;margin-bottom:4px;">Para instalarla en iPhone:</p>
          <ol class="ios-steps"><li>Toca <b>Compartir</b> en la barra de Safari.</li><li>Elige <b>Añadir a pantalla de inicio</b>.</li><li>Abre la app desde el ícono nuevo.</li></ol>
        </div>
        <button class="btn btn-ghost btn-block" id="btn-cont-web" style="margin-top:12px;">Seguir en el navegador</button>`
      : `
        <button class="btn btn-primary btn-block" id="btn-install">Instalar la app</button>
        <button class="btn btn-ghost btn-block" id="btn-cont-web" style="margin-top:10px;">Seguir en el navegador</button>`}
      ${footBrand()}
    </div></div>`);
  updateInstallSection();
  const cont = () => { sessionStorage.setItem('continuedWeb', '1'); go('login'); };
  const bi = $('#btn-install');
  if (bi) bi.onclick = async () => {
    if (!deferredPrompt) return toast('La instalación aún no está disponible. Usa el menú del navegador.');
    const dp = deferredPrompt; dp.prompt(); try { await dp.userChoice; } catch (e) {}
    deferredPrompt = null; updateInstallSection();
  };
  const cw = $('#btn-cont-web'); if (cw) cw.onclick = cont;
}

/* ============================================================
   VISTA · LOGIN
   PIN rápido si el dispositivo ya tiene comercio guardado; si no,
   se entra escribiendo el documento o NIT.
   ============================================================ */
let pinBuffer = '';
let LOGIN_CTX = null;   // { documento, comercio, tieneCorreo, correoMask }

function viewLogin() {
  sesLeer();
  const guardada = !!(SES && SES.nit);
  montar(`
    <div class="login-wrap"><div class="login-card">
      <img class="login-logo" src="${APP_ICON}" alt="Jhonny Perdomo" />
      <h1 class="login-title">Comercios</h1>
      <p class="login-sub">Soy de Flandes · Jhonny Perdomo</p>

      <div class="login-tabs">
        <button class="login-tab ${guardada ? 'active' : ''}" data-tab="pin">PIN rápido</button>
        <button class="login-tab ${guardada ? '' : 'active'}" data-tab="doc">Documento o NIT</button>
      </div>

      <div id="tab-pin" class="${guardada ? '' : 'hidden'}">
        <p class="pin-hint" id="pin-hint">${guardada ? esc(SES.nombre || 'Tu comercio') + ' · ingresa tu PIN' : 'Entra primero con tu documento o NIT'}</p>
        <div class="pin-pad"><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div></div>
        <div class="pin-keypad">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pin-key" data-key="${n}">${n}</button>`).join('')}
          <button class="pin-key action" data-key="clear">Borrar</button>
          <button class="pin-key" data-key="0">0</button>
          <button class="pin-key action" data-key="back">⌫</button>
        </div>
        ${guardada ? `<button class="btn btn-quiet btn-block" id="btn-otra" style="margin-top:12px;">Entrar con otro comercio</button>` : ''}
      </div>

      <div id="tab-doc" class="${guardada ? 'hidden' : ''}">
        ${field('Documento o NIT', inputEl('lg-doc', 'inputmode="numeric" maxlength="10" placeholder="Sin puntos ni espacios" autocomplete="off"'))}
        <button class="btn btn-primary btn-block" id="btn-lg-doc" style="margin-top:10px;">Continuar</button>
        <button class="btn btn-ghost btn-block" id="btn-lg-reg" style="margin-top:10px;">Registrar mi comercio</button>
      </div>

      <p class="pin-hint small" style="margin-top:14px;">El PIN son los <b>últimos 4 dígitos</b> de tu documento o NIT.</p>
      ${footBrand()}
    </div></div>`);

  pinBuffer = ''; paintPin();

  $$('.login-tab').forEach(t => t.onclick = () => {
    $$('.login-tab').forEach(x => x.classList.remove('active')); t.classList.add('active');
    const w = t.dataset.tab;
    $('#tab-doc').classList.toggle('hidden', w !== 'doc');
    $('#tab-pin').classList.toggle('hidden', w !== 'pin');
    pinBuffer = ''; paintPin();
  });

  const d = $('#lg-doc');
  d.addEventListener('input', () => { d.value = onlyDig(d.value).slice(0, 10); });
  d.addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-lg-doc').click(); });

  $('#btn-lg-doc').onclick = () => entrarConDocumento($('#btn-lg-doc'));
  $('#btn-lg-reg').onclick = () => go('registro');
  const otra = $('#btn-otra');
  if (otra) otra.onclick = async () => {
    const ok = await confirmar('Salir del comercio', crow('Comercio', SES.nombre) + crow('Dispositivo', dispositivo()), 'Salir');
    if (!ok) return;
    try { await api('com.salir', {}, 'POST', Object.assign(auth(), {})); } catch (e) {}
    sesBorrar(); go('login');
  };

  $$('.pin-key').forEach(k => k.onclick = () => onPinKey(k.dataset.key));
}

function paintPin() { $$('.pin-dot').forEach((d, i) => d.classList.toggle('filled', i < pinBuffer.length)); }

function onPinKey(k) {
  if (k === 'clear') { pinBuffer = ''; return paintPin(); }
  if (k === 'back') { pinBuffer = pinBuffer.slice(0, -1); return paintPin(); }
  if (pinBuffer.length >= 4) return;
  pinBuffer += k; paintPin();
  if (pinBuffer.length === 4) { const p = pinBuffer; setTimeout(() => resolverPin(p), 120); }
}

async function resolverPin(pin) {
  sesLeer();
  if (!SES || !SES.nit) { toast('Entra primero con tu documento o NIT.', 'err'); pinBuffer = ''; return paintPin(); }
  await intentarEntrar(SES.nit, pin, null);
  pinBuffer = ''; paintPin();
}

async function entrarConDocumento(btn) {
  const doc = onlyDig(val('lg-doc'));
  if (!/^\d{6,10}$/.test(doc)) return toast('El documento o NIT debe tener entre 6 y 10 dígitos', 'err');
  saving(btn, true);
  try {
    const r = await api('com.chequear', { documento: doc, token: (SES && SES.nit === doc) ? SES.token : '' });
    saving(btn, false);
    if (!r.ok) return toast(r.msg, 'err');

    if (r.via === 'registro') {
      REG.documento = doc;
      REG.enPrincipal = !!r.enPrincipal;
      REG.duenoDoc = r.duenoDoc || '';
      REG.dueno = r.dueno || '';
      return sheetSinComercio(doc, r);
    }

    if (r.estado === 'INACTIVO') return toast('Tu comercio está inactivo. Comunícate con el equipo.', 'err');
    if (r.bloqueado) return toast('Acceso bloqueado por intentos fallidos. Espera 15 minutos.', 'err');

    /* Por documento NO se pide PIN: el que manda aquí es el código del correo.
       El PIN es el atajo del otro camino, el de un equipo ya confiado. */
    LOGIN_CTX = { documento: doc, comercio: r.comercio, tieneCorreo: r.tieneCorreo, correoMask: r.correoMask };
    saving($('#btn-lg-doc'), true);
    const env = await api('com.otp', {}, 'POST', { documento: doc, accion: 'login' });
    saving($('#btn-lg-doc'), false);
    if (!env.ok && env.pedirCorreo) return sheetCorreo(doc, env.msg);
    if (!env.ok) return toast(env.msg, 'err');
    sheetCodigo(doc, env);
  } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
}

/* Comercio antiguo que todavía no tiene correo: lo escribe una vez y el código
   le llega ahí mismo. De ahí en adelante ese correo es su llave. */
function sheetCorreo(documento, msg) {
  const s = openSheet(`<div class="grip"></div>
    <h2 class="h2">Escribe tu correo</h2>
    <p class="muted small">${esc(msg || 'Tu comercio aún no tiene correo registrado.')} Te enviaremos ahí el código, y de aquí en adelante será tu llave de acceso.</p>
    <div class="stack" style="margin-top:14px;">
      ${field('Tu correo', inputEl('cr-mail', 'type="email" placeholder="tucorreo@ejemplo.com" autocomplete="email"'))}
      <button class="btn btn-primary btn-block" id="cr-ok">Enviarme el código</button>
    </div>`);
  const i = $('#cr-mail', s); i.focus();
  i.addEventListener('keydown', e => { if (e.key === 'Enter') $('#cr-ok', s).click(); });
  $('#cr-ok', s).onclick = async () => {
    const correo = i.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return toast('Escribe un correo válido', 'err');
    const b = $('#cr-ok', s); saving(b, true);
    try {
      const env = await api('com.otp', {}, 'POST', { documento: documento, accion: 'login', correo: correo });
      saving(b, false);
      if (!env.ok) return toast(env.msg, 'err');
      sheetCodigo(documento, env);
    } catch (e) { saving(b, false); toast('Error de conexión', 'err'); }
  };
}

/**
 * Intenta entrar. Si el backend pide código (dispositivo nuevo), lo solicita
 * y abre la hoja del código.
 */
async function intentarEntrar(documento, pin, codigo) {
  try {
    /* Con PIN va el token del equipo confiado; con código no va PIN. */
    const body = codigo
      ? { documento: documento, codigo: codigo, dispositivo: dispositivo() }
      : { documento: documento, pin: pin, dispositivo: dispositivo(), token: (SES && SES.nit === documento) ? SES.token : '' };
    const r = await api('com.entrar', {}, 'POST', body);
    if (r.ok) {
      closeLayer();
      sesGuardar({ nit: r.comercio.nit, nombre: r.comercio.nombre, token: r.token });
      COM = r.comercio;
      sonar('ok'); vibrar(60);
      return go('home');
    }
    if (r.need === 'otp') {
      const env = await api('com.otp', {}, 'POST', { documento: documento, accion: 'login' });
      if (!env.ok && env.pedirCorreo) return sheetCorreo(documento, env.msg);
      if (!env.ok) return toast(env.msg, 'err');
      return sheetCodigo(documento, env);
    }
    toast(r.msg || 'No se pudo entrar', 'err');
  } catch (e) { toast('Error de conexión', 'err'); }
}

/* Hoja del código de 6 dígitos. Único canal: el correo. */
function sheetCodigo(documento, env) {
  const s = openSheet(`<div class="grip"></div>
    <h2 class="h2">Confirma que eres tú</h2>
    <p class="muted small">Enviamos un código de 6 dígitos a tu correo <b>${esc(env.destino || '')}</b>. Vence en 10 minutos.</p>
    <div class="stack" style="margin-top:14px;">
      ${field('Código', inputEl('ot-cod', 'inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code"'))}
      <button class="btn btn-primary btn-block" id="ot-ok">Confirmar</button>
      <button class="btn btn-ghost btn-block" id="ot-re">Enviar otro código</button>
    </div>`);
  const i = $('#ot-cod', s); i.focus();
  i.addEventListener('input', () => { i.value = onlyDig(i.value).slice(0, 6); });
  i.addEventListener('keydown', e => { if (e.key === 'Enter') $('#ot-ok', s).click(); });
  $('#ot-ok', s).onclick = async () => {
    const cod = onlyDig(i.value);
    if (cod.length !== 6) return toast('El código son 6 dígitos', 'err');
    const b = $('#ot-ok', s); saving(b, true);
    await intentarEntrar(documento, '', cod);
    saving(b, false);
  };
  $('#ot-re', s).onclick = async () => {
    const b = $('#ot-re', s); saving(b, true);
    try { const e2 = await api('com.otp', {}, 'POST', { documento: documento, accion: 'login' }); toast(e2.ok ? 'Código reenviado' : e2.msg, e2.ok ? 'ok' : 'err'); }
    catch (e) { toast('Error de conexión', 'err'); }
    saving(b, false);
  };
}

/* Documento sin comercio: se ofrece registrarlo */
function sheetSinComercio(doc, r) {
  const s = openSheet(`<div class="grip"></div>
    <h2 class="h2">Aún no tienes comercio</h2>
    <p class="muted small">No hay ningún comercio registrado con <b>${esc(doc)}</b>.
    ${r.enPrincipal ? 'Te reconocimos como <b>' + esc(r.dueno) + '</b>.' : 'Si es el NIT de tu empresa, te pediremos la cédula del dueño.'}</p>
    <div class="stack" style="margin-top:14px;">
      <button class="btn btn-primary btn-block" id="sc-reg">Registrar mi comercio</button>
      <button class="btn btn-ghost btn-block" data-close>Volver</button>
    </div>`);
  $('#sc-reg', s).onclick = () => { closeLayer(); go('registro'); };
}

/* ============================================================
   VISTA · REGISTRO (por pasos)
   ============================================================ */
const REG_PASOS = 6;
let REG = {
  paso: 1, documento: '', duenoDoc: '', dueno: '', enPrincipal: false,
  especificacion: '', categoria: '', nombre: '', descripcion: '',
  imagen: '', imagenPrev: '', reel: '', direccion: '', ubicacion: '',
  premium: '', estandar: '', facebook: '', instagram: '', tiktok: '',
  whatsapp: '', telefono: '', correo: ''
};
let CATALOGO = null;

function viewRegistro() {
  montar(`${backbar('Registrar mi comercio', 'login')}
    <div class="pad stack">
      <div class="steps" id="rg-steps">${Array.from({ length: REG_PASOS }, (_, i) => `<div class="step ${i === 0 ? 'on' : ''}"></div>`).join('')}</div>
      <div id="rg-body">${loadingBox('Preparando el formulario…')}</div>
      ${footBrand()}
    </div>`);
  $('#backbtn').onclick = () => (REG.paso > 1 ? pasoIr(REG.paso - 1) : go('login'));
  cargarCatalogo().then(() => pasoIr(REG.documento ? 1 : 0)).catch(() => {
    $('#rg-body').innerHTML = `<div class="ev-card"><p class="muted">No se pudo cargar el catálogo. Revisa la conexión y vuelve a entrar.</p></div>`;
  });
}

async function cargarCatalogo() {
  if (CATALOGO) return CATALOGO;
  CATALOGO = await api('com.catalogo');
  return CATALOGO;
}

function pasoPintarBarra() {
  $$('#rg-steps .step').forEach((d, i) => {
    d.classList.toggle('on', i < REG.paso);
    d.classList.toggle('now', i === REG.paso - 1);
  });
}

function pasoIr(n) {
  if (n <= 0) return pasoDocumento();
  REG.paso = n; pasoPintarBarra();
  const b = $('#rg-body');
  if (n === 1) return pasoEspecificacion(b);
  if (n === 2) return pasoIdentidad(b);
  if (n === 3) return pasoMedios(b);
  if (n === 4) return pasoOfertas(b);
  if (n === 5) return pasoContacto(b);
  if (n === 6) return pasoResumen(b);
}

/* Paso 0 · quién eres (documento o NIT + dueño en PRINCIPAL) */
function pasoDocumento() {
  REG.paso = 1; pasoPintarBarra();
  $('#rg-body').innerHTML = `
    <div class="ev-card stack">
      <h2 class="h2">¿Con qué número registras?</h2>
      <p class="muted small">Puede ser tu cédula o el NIT de tu empresa (6 a 10 dígitos). Con ese número entrarás siempre.</p>
      ${field('Documento o NIT', inputEl('rg-doc', 'inputmode="numeric" maxlength="10" placeholder="Sin puntos ni espacios"'))}
      <div id="rg-dueno"></div>
      <button class="btn btn-primary btn-block" id="rg-doc-ok">Continuar</button>
    </div>`;
  const i = $('#rg-doc');
  i.value = REG.documento || '';
  i.addEventListener('input', () => { i.value = onlyDig(i.value).slice(0, 10); });
  $('#rg-doc-ok').onclick = async () => {
    const doc = onlyDig(i.value);
    if (!/^\d{6,10}$/.test(doc)) return toast('Debe tener entre 6 y 10 dígitos', 'err');
    const btn = $('#rg-doc-ok'); saving(btn, true);
    try {
      const r = await api('com.chequear', { documento: doc });
      saving(btn, false);
      if (!r.ok) return toast(r.msg, 'err');
      if (r.via === 'login') return toast('Ese número ya tiene un comercio. Entra desde el inicio.', 'err');
      REG.documento = doc;
      if (r.enPrincipal) {
        REG.enPrincipal = true; REG.duenoDoc = doc; REG.dueno = r.dueno;
        if (!REG.whatsapp && r.telefono) REG.whatsapp = r.telefono;
        return pasoIr(1);
      }
      pedirDueno();
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}

function pedirDueno() {
  $('#rg-dueno').innerHTML = `
    <div class="aviso aviso-info" style="margin-top:10px;">
      <b>Falta validar al dueño</b>
      <p class="small">Ese número no está en la base de la app. Escribe la <b>cédula del dueño</b>: debe estar registrada en la app de Jhonny Perdomo.</p>
      ${field('Cédula del dueño', inputEl('rg-ced', 'inputmode="numeric" maxlength="10" placeholder="Cédula"'))}
      <button class="btn btn-ghost btn-block" id="rg-ced-ok" style="margin-top:8px;">Validar dueño</button>
    </div>`;
  const c = $('#rg-ced');
  c.addEventListener('input', () => { c.value = onlyDig(c.value).slice(0, 10); });
  $('#rg-ced-ok').onclick = async () => {
    const ced = onlyDig(c.value);
    const btn = $('#rg-ced-ok'); saving(btn, true);
    try {
      const r = await api('com.dueno', { cedula: ced });
      saving(btn, false);
      if (!r.ok) return toast(r.msg, 'err');
      REG.duenoDoc = r.duenoDoc; REG.dueno = r.dueno; REG.enPrincipal = true;
      if (!REG.whatsapp && r.telefono) REG.whatsapp = r.telefono;
      toast('Dueño validado: ' + r.dueno, 'ok');
      pasoIr(1);
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}

/* Paso 1 · especificación → categoría automática */
function pasoEspecificacion(box) {
  box.innerHTML = `
    <div class="ev-card stack">
      <h2 class="h2">¿A qué se dedica tu comercio?</h2>
      <p class="muted small">Busca la actividad que mejor te describe. La categoría se llena sola.</p>
      ${field('Buscar actividad', inputEl('es-fil', 'placeholder="Ej: barbería, panadería, gimnasio…" autocomplete="off"'))}
      <div class="espec-list" id="es-list"></div>
      <div class="cat-auto hidden" id="es-cat">
        <span class="cat-lbl">Categoría</span>
        <b id="es-cat-v"></b>
      </div>
      <button class="btn btn-primary btn-block" id="es-next" disabled>Avanzar</button>
    </div>`;
  const lista = CATALOGO.especificaciones;
  const pintar = (q) => {
    const t = String(q || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const filtradas = t ? lista.filter(x => x.espec.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(t) >= 0) : lista;
    $('#es-list').innerHTML = filtradas.slice(0, 60).map(x =>
      `<button class="espec ${REG.especificacion === x.espec ? 'sel' : ''}" data-e="${esc(x.espec)}" data-c="${esc(x.categoria)}">${esc(x.espec)}<em>${esc(x.categoria)}</em></button>`).join('')
      || `<p class="muted small">Sin resultados. Prueba con otra palabra.</p>`;
    $$('#es-list .espec').forEach(b => b.onclick = () => elegirEspec(b.dataset.e, b.dataset.c));
  };
  const elegirEspec = (e, c) => {
    REG.especificacion = e; REG.categoria = c;
    $$('#es-list .espec').forEach(x => x.classList.toggle('sel', x.dataset.e === e));
    $('#es-cat').classList.remove('hidden');
    $('#es-cat-v').textContent = c;
    $('#es-next').disabled = false;
    vibrar(30);
  };
  $('#es-fil').addEventListener('input', ev => pintar(ev.target.value));
  pintar('');
  if (REG.especificacion) elegirEspec(REG.especificacion, REG.categoria);
  $('#es-next').onclick = () => pasoIr(2);
}

/* Paso 2 · nombre, descripción, imagen */
function pasoIdentidad(box) {
  box.innerHTML = `
    <div class="ev-card stack">
      <h2 class="h2">Tu comercio</h2>
      ${field('Nombre del comercio', inputEl('rg-nom', 'placeholder="Como lo conocen tus clientes" maxlength="70"'))}
      ${field('Descripción', areaEl('rg-desc', 'rows="4" maxlength="600" placeholder="Qué vendes o qué servicio prestas"'))}
      <div class="field"><span>Imagen del comercio</span>
        <div class="img-drop" id="rg-img-drop">
          <img id="rg-img-prev" class="${REG.imagenPrev ? '' : 'hidden'}" src="${REG.imagenPrev || ''}" alt="" />
          <div class="img-hint ${REG.imagenPrev ? 'hidden' : ''}" id="rg-img-hint">
            <div style="font-size:34px;">🖼️</div>
            <p class="small muted">Toca para elegir una foto <b>vertical</b>.<br/>Es la que ven los usuarios.</p>
          </div>
        </div>
        <input type="file" id="rg-img" accept="image/*" class="hidden" />
        <em class="hint">Debe ser <b>vertical</b> (3:4). Si la envías horizontal se recorta al centro.</em>
      </div>
      <button class="btn btn-primary btn-block" id="rg-n2">Avanzar</button>
      <button class="btn btn-ghost btn-block" id="rg-b2">Atrás</button>
    </div>`;
  $('#rg-nom').value = REG.nombre; $('#rg-desc').value = REG.descripcion;
  $('#rg-img-drop').onclick = () => $('#rg-img').click();
  $('#rg-img').onchange = ev => elegirImagen(ev.target.files[0], '#rg-img-prev', '#rg-img-hint');
  $('#rg-b2').onclick = () => pasoIr(1);
  $('#rg-n2').onclick = () => {
    REG.nombre = val('rg-nom'); REG.descripcion = val('rg-desc');
    if (!REG.nombre) return toast('El nombre es obligatorio', 'err');
    if (!REG.descripcion) return toast('La descripción es obligatoria', 'err');
    if (!REG.imagen) return toast('La imagen es obligatoria', 'err');
    pasoIr(3);
  };
}

/**
 * La ficha del comercio es VERTICAL (3:4). Devuelve el recorte CENTRADO a esa
 * proporción y el tamaño final (alto máximo 1400 px) para que todas las
 * tarjetas se vean parejas en la app pública y la foto cargue rápido.
 */
const REL_VERTICAL = 3 / 4;
const ALTO_MAX = 1400;
function recorteVertical(ancho, alto) {
  let sw = ancho, sh = alto, sx = 0, sy = 0, recortada = false;
  if (ancho / alto > REL_VERTICAL) {            // más ancha de la cuenta → se recorta a los lados
    sw = Math.round(alto * REL_VERTICAL); sx = Math.round((ancho - sw) / 2); recortada = true;
  } else if (ancho / alto < REL_VERTICAL) {     // más alargada → se recorta arriba y abajo
    sh = Math.round(ancho / REL_VERTICAL); sy = Math.round((alto - sh) / 2); recortada = true;
  }
  const h = Math.min(ALTO_MAX, sh);
  const w = Math.round(h * REL_VERTICAL);
  return { sx: sx, sy: sy, sw: sw, sh: sh, w: w, h: h, recortada: recortada };
}

/** Reduce la imagen en el navegador antes de mandarla (rápido y liviano). */
function elegirImagen(file, selPrev, selHint, onListo) {
  if (!file) return;
  if (!/^image\//.test(file.type)) return toast('Elige un archivo de imagen', 'err');
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const r = recorteVertical(img.width, img.height);
      const c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
      c.getContext('2d').drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, r.w, r.h);
      const data = c.toDataURL('image/jpeg', 0.82);
      if (r.recortada) toast('La foto se recortó al formato vertical', 'ok');
      if (onListo) onListo(data); else { REG.imagen = data; REG.imagenPrev = data; }
      const p = $(selPrev); if (p) { p.src = data; p.classList.remove('hidden'); p.style.display = ''; }
      const hn = $(selHint); if (hn) hn.classList.add('hidden');
      vibrar(30);
    };
    img.onerror = () => toast('No se pudo leer la imagen', 'err');
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

/* Paso 3 · video, dirección, ubicación */
function pasoMedios(box) {
  box.innerHTML = `
    <div class="ev-card stack">
      <h2 class="h2">Video y ubicación</h2>
      <p class="muted small">Todo lo de este paso es opcional, pero hace que tu comercio se vea mucho mejor.</p>
      ${field('Video (YouTube o Drive)', inputEl('rg-reel', 'placeholder="https://…"'), 'Pega el enlace del reel o video corto.')}
      ${field('Dirección', inputEl('rg-dir', 'placeholder="Calle 10 N° 7-98, barrio…" maxlength="120"'))}
      <div class="field"><span>Ubicación en el mapa</span>
        <div class="map-box">
          <div id="rg-map" class="map"></div>
          <button class="btn btn-quiet map-here" id="rg-here" type="button">📍 Usar mi ubicación</button>
        </div>
        <em class="hint">Arrastra el mapa hasta que el pin quede sobre tu local y toca Confirmar.</em>
        <div class="map-actions">
          <button class="btn btn-primary" id="rg-map-ok" type="button">Confirmar el pin</button>
          <button class="btn btn-ghost" id="rg-map-no" type="button">Quitar ubicación</button>
        </div>
        <p class="small" id="rg-map-txt">${REG.ubicacion ? 'Ubicación confirmada ✅' : 'Sin ubicación'}</p>
      </div>
      <button class="btn btn-primary btn-block" id="rg-n3">Avanzar</button>
      <button class="btn btn-ghost btn-block" id="rg-b3">Atrás</button>
    </div>`;
  $('#rg-reel').value = REG.reel; $('#rg-dir').value = REG.direccion;
  montarMapa('rg-map', 'rg-map-txt', 'rg-here', 'rg-map-ok', 'rg-map-no', v => { REG.ubicacion = v; });
  $('#rg-b3').onclick = () => pasoIr(2);
  $('#rg-n3').onclick = () => {
    REG.reel = val('rg-reel'); REG.direccion = val('rg-dir');
    if (REG.reel && !/^https?:\/\//i.test(REG.reel)) return toast('El enlace del video debe empezar por http', 'err');
    pasoIr(4);
  };
}

/* Mapa con pin (Leaflet + OpenStreetMap, sin llaves ni cuentas) */
let _mapa = null;
async function cargarLeaflet() {
  if (window.L) return;
  if (!$('#leaflet-css')) {
    const l = document.createElement('link'); l.id = 'leaflet-css'; l.rel = 'stylesheet'; l.href = LEAFLET_CSS;
    document.head.appendChild(l);
  }
  await new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = LEAFLET_JS;
    s.onload = res; s.onerror = () => rej(new Error('leaflet'));
    document.head.appendChild(s);
  });
}

function coordsDe(url) {
  const m = String(url || '').match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  return m ? { lat: +m[1], lng: +m[2] } : null;
}

async function montarMapa(idMapa, idTxt, idHere, idOk, idNo, onSet, valorActual) {
  try { await cargarLeaflet(); } catch (e) {
    $('#' + idMapa).innerHTML = `<p class="muted small pad">No se pudo cargar el mapa. Puedes seguir sin ubicación.</p>`;
    return;
  }
  const inicio = coordsDe(valorActual) || FLANDES;
  _mapa = window.L.map(idMapa, { zoomControl: true, attributionControl: false }).setView([inicio.lat, inicio.lng], 16);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_mapa);
  setTimeout(() => _mapa.invalidateSize(), 150);

  $('#' + idHere).onclick = () => {
    if (!navigator.geolocation) return toast('Tu equipo no da la ubicación', 'err');
    toast('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(
      p => _mapa.setView([p.coords.latitude, p.coords.longitude], 18),
      () => toast('No diste permiso de ubicación', 'err'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };
  $('#' + idOk).onclick = () => {
    const c = _mapa.getCenter();
    const url = 'https://www.google.com/maps?q=' + c.lat.toFixed(6) + ',' + c.lng.toFixed(6);
    onSet(url);
    $('#' + idTxt).innerHTML = 'Ubicación confirmada ✅ <a href="' + url + '" target="_blank" rel="noopener">ver en el mapa</a>';
    vibrar(40); toast('Ubicación guardada', 'ok');
  };
  $('#' + idNo).onclick = () => { onSet(''); $('#' + idTxt).textContent = 'Sin ubicación'; };
}

/* Paso 4 · ofertas */
function pasoOfertas(box) {
  box.innerHTML = `
    <div class="ev-card stack">
      <h2 class="h2">Tus ofertas</h2>
      <p class="muted small">Los usuarios de la app se clasifican en <b>Premium</b> y <b>Estándar</b>. Define qué le das a cada uno.</p>
      ${field('Oferta para usuarios Premium', areaEl('rg-prem', 'rows="3" maxlength="220" placeholder="Ej: 20% de descuento en la primera compra"'))}
      ${field('Oferta para usuarios Estándar', areaEl('rg-est', 'rows="3" maxlength="220" placeholder="Ej: 10% de descuento en la primera compra"'))}
      <button class="btn btn-primary btn-block" id="rg-n4">Avanzar</button>
      <button class="btn btn-ghost btn-block" id="rg-b4">Atrás</button>
    </div>`;
  $('#rg-prem').value = REG.premium; $('#rg-est').value = REG.estandar;
  $('#rg-b4').onclick = () => pasoIr(3);
  $('#rg-n4').onclick = () => {
    REG.premium = val('rg-prem'); REG.estandar = val('rg-est');
    if (!REG.premium) return toast('La oferta Premium es obligatoria', 'err');
    if (!REG.estandar) return toast('La oferta Estándar es obligatoria', 'err');
    pasoIr(5);
  };
}

/* Paso 5 · redes y contacto */
const REDES = {
  facebook:  { nombre: 'Facebook',  ico: '📘', app: 'fb://page/', web: 'https://www.facebook.com/', ayuda: 'Abre tu página → Compartir → Copiar enlace.' },
  instagram: { nombre: 'Instagram', ico: '📸', app: 'instagram://user?username=', web: 'https://www.instagram.com/', ayuda: 'Abre tu perfil → menú (⋯) → Copiar enlace del perfil.' },
  tiktok:    { nombre: 'TikTok',    ico: '🎵', app: 'snssdk1233://', web: 'https://www.tiktok.com/', ayuda: 'Abre tu perfil → Compartir → Copiar enlace.' }
};

function redeField(k) {
  const r = REDES[k];
  return `<div class="field">
      <span>${r.ico} ${r.nombre}</span>
      <div class="row-input">
        <input class="input" id="rg-${k}" placeholder="https://…" />
        <button class="btn btn-quiet mini" type="button" data-abrir="${k}" title="Abrir ${r.nombre}">Abrir</button>
        <button class="btn btn-quiet mini" type="button" data-pegar="${k}" title="Pegar">Pegar</button>
      </div>
      <em class="hint">${r.ayuda}</em>
    </div>`;
}

function bindRedes(prefijo) {
  $$('[data-abrir]').forEach(b => b.onclick = () => abrirRed(b.dataset.abrir));
  $$('[data-pegar]').forEach(b => b.onclick = async () => {
    try {
      const txt = (await navigator.clipboard.readText() || '').trim();
      if (!txt) return toast('No hay nada copiado', 'err');
      $('#' + prefijo + '-' + b.dataset.pegar).value = txt;
      toast('Enlace pegado', 'ok');
    } catch (e) { toast('Tu navegador no deja pegar automático. Mantén pulsado el campo y pega.', 'err'); }
  });
}

/** Abre la app de la red en el móvil; en PC abre la web. */
function abrirRed(k) {
  const r = REDES[k];
  if (!esMovil()) { window.open(r.web, '_blank', 'noopener'); return toast('Copia el enlace de tu perfil y pégalo aquí'); }
  const t = Date.now();
  const w = window.location.href;
  const ir = document.createElement('a');
  ir.href = r.app; ir.style.display = 'none';
  document.body.appendChild(ir);
  try { ir.click(); } catch (e) {}
  setTimeout(() => {
    ir.remove();
    // Si la app no abrió (seguimos aquí y pasó muy poco), se va a la web
    if (Date.now() - t < 2000 && document.visibilityState === 'visible' && location.href === w) {
      window.open(r.web, '_blank', 'noopener');
    }
  }, 1200);
  toast('Copia el enlace de tu perfil y vuelve a pegarlo aquí');
}

function pasoContacto(box) {
  box.innerHTML = `
    <div class="ev-card stack">
      <h2 class="h2">Cómo te contactan</h2>
      ${redeField('facebook')}
      ${redeField('instagram')}
      ${redeField('tiktok')}
      ${field('WhatsApp', inputEl('rg-wa', 'inputmode="numeric" maxlength="10" placeholder="3001234567"'), 'Obligatorio. 10 dígitos, sin el 57.')}
      ${field('Llamadas de voz', inputEl('rg-tel', 'inputmode="numeric" maxlength="10" placeholder="6081234567"'), 'Opcional. 10 dígitos exactos. Si es fijo, con indicativo: 608…')}
      ${field('Tu correo', inputEl('rg-mail', 'type="email" placeholder="tucorreo@ejemplo.com"'), 'Aquí llega el código que confirma que el comercio es tuyo.')}
      <button class="btn btn-primary btn-block" id="rg-n5">Ver el resumen</button>
      <button class="btn btn-ghost btn-block" id="rg-b5">Atrás</button>
    </div>`;
  ['facebook', 'instagram', 'tiktok'].forEach(k => $('#rg-' + k).value = REG[k]);
  $('#rg-wa').value = REG.whatsapp; $('#rg-tel').value = REG.telefono; $('#rg-mail').value = REG.correo;
  ['rg-wa', 'rg-tel'].forEach(id => $('#' + id).addEventListener('input', e => { e.target.value = onlyDig(e.target.value).slice(0, 10); }));
  bindRedes('rg');
  $('#rg-b5').onclick = () => pasoIr(4);
  $('#rg-n5').onclick = () => {
    ['facebook', 'instagram', 'tiktok'].forEach(k => REG[k] = val('rg-' + k));
    REG.whatsapp = onlyDig(val('rg-wa')); REG.telefono = onlyDig(val('rg-tel')); REG.correo = val('rg-mail');
    if (!/^\d{10}$/.test(REG.whatsapp)) return toast('El WhatsApp debe tener 10 dígitos', 'err');
    if (REG.telefono && REG.telefono.length !== 10) return toast('El número de llamadas debe tener 10 dígitos exactos', 'err');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(REG.correo)) return toast('Escribe un correo válido', 'err');
    const malo = ['facebook', 'instagram', 'tiktok'].find(k => REG[k] && !/^https?:\/\//i.test(REG[k]));
    if (malo) return toast('El enlace de ' + REDES[malo].nombre + ' debe empezar por http', 'err');
    pasoIr(6);
  };
}

/* Paso 6 · resumen y confirmación */
function pasoResumen(box) {
  box.innerHTML = `
    <div class="ev-card stack">
      <h2 class="h2">Revisa antes de publicar</h2>
      ${REG.imagenPrev ? `<img class="res-img" src="${REG.imagenPrev}" alt="" />` : ''}
      ${crow('Documento o NIT', REG.documento)}
      ${crow('Dueño', REG.dueno)}
      ${crow('Actividad', REG.especificacion)}
      ${crow('Categoría', REG.categoria)}
      ${crow('Nombre', REG.nombre)}
      ${crow('Descripción', REG.descripcion)}
      ${crow('Video', REG.reel)}
      ${crow('Dirección', REG.direccion)}
      ${crow('Ubicación', REG.ubicacion ? 'Confirmada en el mapa' : '')}
      ${crow('Oferta Premium', REG.premium)}
      ${crow('Oferta Estándar', REG.estandar)}
      ${crow('Facebook', REG.facebook)}
      ${crow('Instagram', REG.instagram)}
      ${crow('TikTok', REG.tiktok)}
      ${crow('WhatsApp', REG.whatsapp)}
      ${crow('Llamadas', REG.telefono)}
      ${crow('Correo', REG.correo)}
      <label class="check"><input type="checkbox" id="rg-pol" /> <span>Acepto las <a href="#" id="rg-vpol">Políticas de Uso</a>.</span></label>
      <button class="btn btn-primary btn-block" id="rg-go">Publicar mi comercio</button>
      <button class="btn btn-ghost btn-block" id="rg-b6">Atrás</button>
    </div>`;
  $('#rg-b6').onclick = () => pasoIr(5);
  $('#rg-vpol').onclick = e => { e.preventDefault(); sheetPoliticas(); };
  $('#rg-go').onclick = async () => {
    if (!$('#rg-pol').checked) return toast('Debes aceptar las Políticas de Uso', 'err');
    const btn = $('#rg-go'); saving(btn, true);
    try {
      const env = await api('com.otp', {}, 'POST', { documento: REG.documento, accion: 'registro', correo: REG.correo });
      saving(btn, false);
      if (!env.ok) return toast(env.msg, 'err');
      sheetCodigoRegistro(env);
    } catch (e) { saving(btn, false); toast('Error de conexión', 'err'); }
  };
}

function sheetCodigoRegistro(env) {
  const s = openSheet(`<div class="grip"></div>
    <h2 class="h2">Confirma tu correo</h2>
    <p class="muted small">Enviamos un código de 6 dígitos a <b>${esc(env.destino || '')}</b>. Ese correo queda como la llave de tu comercio.</p>
    <div class="stack" style="margin-top:14px;">
      ${field('Código', inputEl('rr-cod', 'inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code"'))}
      <button class="btn btn-primary btn-block" id="rr-ok">Publicar</button>
      <button class="btn btn-ghost btn-block" id="rr-re">Enviar otro código</button>
    </div>`);
  const i = $('#rr-cod', s); i.focus();
  i.addEventListener('input', () => { i.value = onlyDig(i.value).slice(0, 6); });
  $('#rr-ok', s).onclick = async () => {
    const cod = onlyDig(i.value);
    if (cod.length !== 6) return toast('El código son 6 dígitos', 'err');
    const b = $('#rr-ok', s); saving(b, true);
    try {
      const body = Object.assign({}, REG, { codigo: cod, dispositivo: dispositivo() });
      delete body.imagenPrev; delete body.paso;
      const r = await api('com.registrar', {}, 'POST', body);
      saving(b, false);
      if (!r.ok) return toast(r.msg || 'No se pudo publicar', 'err');
      closeLayer();
      sesGuardar({ nit: r.comercio.nit, nombre: r.comercio.nombre, token: r.token });
      COM = r.comercio;
      sonar('ok'); vibrar([60, 40, 60]);
      go('home');
      setTimeout(() => toast('¡Tu comercio ya está publicado!', 'ok'), 400);
    } catch (e) { saving(b, false); toast('Error de conexión', 'err'); }
  };
  $('#rr-re', s).onclick = async () => {
    const b = $('#rr-re', s); saving(b, true);
    try { const e2 = await api('com.otp', {}, 'POST', { documento: REG.documento, accion: 'registro', correo: REG.correo }); toast(e2.ok ? 'Código reenviado' : e2.msg, e2.ok ? 'ok' : 'err'); }
    catch (e) { toast('Error de conexión', 'err'); }
    saving(b, false);
  };
}

/* ============================================================
   VISTA · INICIO
   ============================================================ */
let COM = null;
let COM_COMPARTIR = '';

async function viewHome() {
  montar(`
    <div class="appbar">
      <img class="mark-img" src="${APP_ICON}" alt="" />
      <div class="who"><b id="hm-nom">${esc((SES && SES.nombre) || 'Mi comercio')}</b><span id="hm-sub">Cargando…</span></div>
      <button class="iconbtn" id="hm-salir" title="Salir">⎋</button>
    </div>
    <div class="pad stack" id="hm-body">${loadingBox('Cargando tu comercio…')}</div>`);
  $('#hm-salir').onclick = salir;
  try {
    const r = await api('com.mio', auth());
    if (!r.ok) throw new Error(r.msg || 'sin datos');
    COM = r.comercio;
    COM_COMPARTIR = r.compartir || '';
    sesGuardar({ nit: COM.nit, nombre: COM.nombre, token: SES.token });
    pintarHome();
  } catch (e) {
    if (/sesión/i.test(String(e.message))) { sesBorrar(); return go('login'); }
    $('#hm-body').innerHTML = `<div class="ev-card"><p class="muted">No se pudo cargar tu comercio. Revisa la conexión.</p><button class="btn btn-ghost btn-block" onclick="location.reload()" style="margin-top:10px;">Reintentar</button></div>`;
  }
}

function pintarHome() {
  const c = COM;
  $('#hm-nom').textContent = c.nombre;
  $('#hm-sub').textContent = c.categoria;
  $('#hm-body').innerHTML = `
    <div class="hero">
      ${c.imagen ? `<img class="hero-img" src="${esc(c.imagen)}" alt="" onerror="this.style.display='none'" />` : ''}
      ${c.reel ? `<button class="hero-play" id="hm-play">▶︎ Ver el video</button>` : ''}
      <div class="hero-badges">
        <span class="badge ${c.estado === 'ACTIVO' ? 'badge-ok' : 'badge-off'}">${esc(c.estado)}</span>
        <span class="badge badge-soft">${esc(c.especificacion || c.categoria)}</span>
      </div>
    </div>

    <div class="ev-card stack">
      <p class="muted small" style="white-space:pre-line;">${esc(c.descripcion)}</p>
      <div class="ofertas">
        <div class="oferta of-prem"><b>⭐ Premium</b><span>${esc(c.premium)}</span></div>
        <div class="oferta of-est"><b>Estándar</b><span>${esc(c.estandar)}</span></div>
      </div>
    </div>

    <button class="btn btn-primary btn-block big" id="hm-val">🎫 Validar usuario</button>
    <button class="btn btn-ghost btn-block big" id="hm-act">✏️ Actualizar datos</button>
    <button class="btn btn-ghost btn-block big" id="hm-pol">📄 Políticas de Uso</button>

    <div class="tools">
      <button class="tool" id="hm-cli"><span>📊</span>Clientes atendidos</button>
      <button class="tool" id="hm-share"><span>📣</span>Compartir mi comercio</button>
      <button class="tool" id="hm-prev"><span>👁️</span>Así te ven</button>
      <button class="tool" id="hm-avi"><span>📰</span>Ponte al día</button>
    </div>

    <p class="small muted center">Documento o NIT ${esc(c.nit)} · registrado el ${esc(c.registro || '—')}</p>
    ${footBrand()}`;

  const play = $('#hm-play'); if (play) play.onclick = () => verVideo(c.reel);
  $('#hm-val').onclick = () => go('validar');
  $('#hm-act').onclick = () => go('actualizar');
  $('#hm-pol').onclick = () => go('politicas');
  $('#hm-cli').onclick = () => go('clientes');
  $('#hm-prev').onclick = () => go('preview');
  $('#hm-avi').onclick = () => go('avisos');
  $('#hm-share').onclick = compartir;
}

/** Convierte un enlace de YouTube o Drive en algo reproducible dentro de la app. */
function embebido(url) {
  const s = String(url || '');
  let m = s.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return 'https://www.youtube.com/embed/' + m[1];
  m = s.match(/drive\.google\.com\/file\/d\/([-\w]{20,})/);
  if (m) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
  return '';
}

function verVideo(url) {
  const emb = embebido(url);
  if (!emb) { window.open(url, '_blank', 'noopener'); return; }
  openSheet(`<div class="grip"></div><h2 class="h2">Tu video</h2>
    <div class="video-wrap"><iframe src="${esc(emb)}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen loading="lazy"></iframe></div>
    <button class="btn btn-ghost btn-block" data-close style="margin-top:12px;">Cerrar</button>`);
}

async function salir() {
  const ok = await confirmar('Salir de la app', crow('Comercio', COM ? COM.nombre : (SES && SES.nombre)) + crow('Dispositivo', dispositivo()) +
    `<p class="small muted" style="margin-top:8px;">Al salir, este dispositivo deja de estar confiado: la próxima vez te pediremos el código del correo.</p>`, 'Salir');
  if (!ok) return;
  try { await api('com.salir', {}, 'POST', auth()); } catch (e) {}
  sesBorrar(); go('login');
}

/* Compartir mi comercio */
function compartir() {
  /* El texto sale de la plantilla PLANTILLA_COMPARTIR_COMERCIO (CONFIG), que se
     edita desde la app privada → Configuración → Plantillas. */
  const texto = COM_COMPARTIR || '';
  const s = openSheet(`<div class="grip"></div><h2 class="h2">Compartir mi comercio</h2>
    <p class="muted small">Este es el mensaje que se envía. Puedes editarlo antes de compartir.</p>
    <textarea class="input area" id="sh-txt" rows="9" style="margin-top:10px;">${esc(texto)}</textarea>
    <div class="stack" style="margin-top:12px;">
      <button class="btn btn-primary btn-block" id="sh-wa">Enviar por WhatsApp</button>
      <button class="btn btn-ghost btn-block" id="sh-cp">Copiar el mensaje</button>
      <button class="btn btn-quiet btn-block" data-close>Cerrar</button>
    </div>`);
  $('#sh-wa', s).onclick = () => {
    const t = encodeURIComponent($('#sh-txt', s).value);
    const url = esMovil() ? ('whatsapp://send?text=' + t) : ('https://api.whatsapp.com/send?text=' + t);
    window.open(url, '_blank', 'noopener');
  };
  $('#sh-cp', s).onclick = async () => {
    try { await navigator.clipboard.writeText($('#sh-txt', s).value); toast('Mensaje copiado', 'ok'); }
    catch (e) { toast('Selecciona el texto y cópialo a mano', 'err'); }
  };
}

/* ============================================================
   VISTA · POLÍTICAS DE USO
   ============================================================ */
async function viewPoliticas() {
  montar(`${backbar('Políticas de Uso', 'home')}<div class="pad stack" id="po-body">${loadingBox('Cargando…')}</div>`);
  try {
    const r = await api('com.politicas');
    $('#po-body').innerHTML = `
      <div class="hoja">
        <div class="hoja-top"><img src="${APP_ICON}" alt="" /><div><b>${esc(r.titulo)}</b><span>Comercios aliados · Soy de Flandes</span></div></div>
        <ol class="hoja-list">${r.items.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
        <p class="hoja-pie">Al registrarte y mantener publicado tu comercio, aceptas estas condiciones.</p>
      </div>
      ${footBrand()}`;
  } catch (e) { $('#po-body').innerHTML = `<div class="ev-card"><p class="muted">No se pudieron cargar las políticas.</p></div>`; }
}

function sheetPoliticas() {
  const s = openSheet(`<div class="grip"></div><h2 class="h2">Políticas de Uso</h2><div id="sp-body">${loadingBox('Cargando…')}</div>
    <button class="btn btn-ghost btn-block" data-close style="margin-top:12px;">Cerrar</button>`);
  api('com.politicas').then(r => {
    $('#sp-body', s).innerHTML = `<ol class="hoja-list">${r.items.map(t => `<li>${esc(t)}</li>`).join('')}</ol>`;
  }).catch(() => { $('#sp-body', s).innerHTML = `<p class="muted small">No se pudieron cargar.</p>`; });
}

/* ============================================================
   VISTA · ACTUALIZAR DATOS
   ============================================================ */
let ACT = { imagen: '', ubicacion: '' };

function viewActualizar() {
  if (!COM) { go('home'); return; }
  ACT = { imagen: '', ubicacion: COM.ubicacion || '' };
  montar(`${backbar('Actualizar datos', 'home')}
    <div class="pad stack">
      <div class="ev-card stack">
        <h2 class="h2">Tu actividad</h2>
        ${field('Buscar actividad', inputEl('ac-fil', 'placeholder="Ej: barbería, panadería…" autocomplete="off"'))}
        <div class="espec-list" id="ac-list">${loadingBox('Cargando actividades…')}</div>
        <div class="cat-auto" id="ac-cat"><span class="cat-lbl">Categoría</span><b id="ac-cat-v">${esc(COM.categoria)}</b></div>
      </div>

      <div class="ev-card stack">
        <h2 class="h2">Tu comercio</h2>
        ${field('Nombre del comercio', inputEl('ac-nom', 'maxlength="70"'))}
        ${field('Descripción', areaEl('ac-desc', 'rows="4" maxlength="600"'))}
        <div class="field"><span>Imagen del comercio</span>
          <div class="img-drop" id="ac-img-drop">
            <img id="ac-img-prev" src="${esc(COM.imagen || '')}" alt="" onerror="this.style.display='none'" />
            <div class="img-hint hidden" id="ac-img-hint"></div>
          </div>
          <input type="file" id="ac-img" accept="image/*" class="hidden" />
          <em class="hint">Si cambias la imagen, la anterior <b>se borra definitivamente</b> de Drive.</em>
        </div>
      </div>

      <div class="ev-card stack">
        <h2 class="h2">Video y ubicación</h2>
        ${field('Video (YouTube o Drive)', inputEl('ac-reel', 'placeholder="https://…"'))}
        ${field('Dirección', inputEl('ac-dir', 'maxlength="120"'))}
        <div class="field"><span>Ubicación en el mapa</span>
          <div class="map-box"><div id="ac-map" class="map"></div>
            <button class="btn btn-quiet map-here" id="ac-here" type="button">📍 Usar mi ubicación</button></div>
          <div class="map-actions">
            <button class="btn btn-primary" id="ac-map-ok" type="button">Confirmar el pin</button>
            <button class="btn btn-ghost" id="ac-map-no" type="button">Quitar ubicación</button>
          </div>
          <p class="small" id="ac-map-txt">${COM.ubicacion ? 'Ubicación confirmada ✅' : 'Sin ubicación'}</p>
        </div>
      </div>

      <div class="ev-card stack">
        <h2 class="h2">Ofertas</h2>
        ${field('Oferta para usuarios Premium', areaEl('ac-prem', 'rows="3" maxlength="220"'))}
        ${field('Oferta para usuarios Estándar', areaEl('ac-est', 'rows="3" maxlength="220"'))}
      </div>

      <div class="ev-card stack">
        <h2 class="h2">Contacto y redes</h2>
        ${redeField('facebook').replace(/id="rg-/g, 'id="ac-')}
        ${redeField('instagram').replace(/id="rg-/g, 'id="ac-')}
        ${redeField('tiktok').replace(/id="rg-/g, 'id="ac-')}
        ${field('WhatsApp', inputEl('ac-wa', 'inputmode="numeric" maxlength="10"'))}
        ${field('Llamadas de voz', inputEl('ac-tel', 'inputmode="numeric" maxlength="10"'), 'Opcional. 10 dígitos exactos. Fijo con indicativo: 608…')}
      </div>

      <button class="btn btn-primary btn-block" id="ac-save">Guardar cambios</button>
      ${footBrand()}
    </div>`);

  $('#ac-nom').value = COM.nombre; $('#ac-desc').value = COM.descripcion;
  $('#ac-reel').value = COM.reel; $('#ac-dir').value = COM.direccion;
  $('#ac-prem').value = COM.premium; $('#ac-est').value = COM.estandar;
  ['facebook', 'instagram', 'tiktok'].forEach(k => $('#ac-' + k).value = COM[k] || '');
  $('#ac-wa').value = COM.whatsapp; $('#ac-tel').value = COM.telefono;
  ['ac-wa', 'ac-tel'].forEach(id => $('#' + id).addEventListener('input', e => { e.target.value = onlyDig(e.target.value).slice(0, 10); }));
  bindRedes('ac');

  $('#ac-img-drop').onclick = () => $('#ac-img').click();
  $('#ac-img').onchange = ev => elegirImagen(ev.target.files[0], '#ac-img-prev', '#ac-img-hint', d => { ACT.imagen = d; });

  montarMapa('ac-map', 'ac-map-txt', 'ac-here', 'ac-map-ok', 'ac-map-no', v => { ACT.ubicacion = v; }, COM.ubicacion);

  cargarCatalogo().then(() => pintarEspecAct()).catch(() => { $('#ac-list').innerHTML = '<p class="muted small">No se pudo cargar el catálogo.</p>'; });

  $('#ac-save').onclick = guardarActualizacion;
}

let ACT_ESPEC = null;
function pintarEspecAct(q) {
  const lista = CATALOGO.especificaciones;
  const t = String(q || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sel = ACT_ESPEC || COM.especificacion;
  const filtradas = t ? lista.filter(x => x.espec.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(t) >= 0) : lista;
  $('#ac-list').innerHTML = filtradas.slice(0, 60).map(x =>
    `<button class="espec ${sel === x.espec ? 'sel' : ''}" data-e="${esc(x.espec)}" data-c="${esc(x.categoria)}">${esc(x.espec)}<em>${esc(x.categoria)}</em></button>`).join('')
    || `<p class="muted small">Sin resultados.</p>`;
  $$('#ac-list .espec').forEach(b => b.onclick = () => {
    ACT_ESPEC = b.dataset.e;
    $('#ac-cat-v').textContent = b.dataset.c;
    $$('#ac-list .espec').forEach(x => x.classList.toggle('sel', x.dataset.e === ACT_ESPEC));
    vibrar(30);
  });
  const f = $('#ac-fil');
  if (f && !f._bind) { f._bind = 1; f.addEventListener('input', e => pintarEspecAct(e.target.value)); }
}

async function guardarActualizacion() {
  const body = Object.assign(auth(), {
    especificacion: ACT_ESPEC || COM.especificacion,
    categoria: $('#ac-cat-v').textContent || COM.categoria,
    nombre: val('ac-nom'), descripcion: val('ac-desc'),
    reel: val('ac-reel'), direccion: val('ac-dir'),
    ubicacion: ACT.ubicacion,
    premium: val('ac-prem'), estandar: val('ac-est'),
    facebook: val('ac-facebook'), instagram: val('ac-instagram'), tiktok: val('ac-tiktok'),
    whatsapp: onlyDig(val('ac-wa')), telefono: onlyDig(val('ac-tel')),
    imagen: ACT.imagen || ''
  });
  if (!body.nombre) return toast('El nombre es obligatorio', 'err');
  if (!body.descripcion) return toast('La descripción es obligatoria', 'err');
  if (!body.premium || !body.estandar) return toast('Las dos ofertas son obligatorias', 'err');
  if (!/^\d{10}$/.test(body.whatsapp)) return toast('El WhatsApp debe tener 10 dígitos', 'err');
  if (body.telefono && body.telefono.length !== 10) return toast('El número de llamadas debe tener 10 dígitos exactos', 'err');

  const ok = await confirmar('Confirma los cambios',
    crow('Nombre', body.nombre) + crow('Actividad', body.especificacion) + crow('WhatsApp', body.whatsapp) +
    (body.imagen ? `<p class="small" style="color:#B0332F;margin-top:8px;"><b>Ojo:</b> la imagen anterior se borrará definitivamente.</p>` : ''), 'Guardar');
  if (!ok) return;

  const btn = $('#ac-save'); saving(btn, true);
  try {
    const r = await api('com.actualizar', {}, 'POST', body);
    saving(btn, false);
    if (!r.ok) return toast(r.msg || 'No se pudo guardar', 'err');
    COM = r.comercio;
    sesGuardar({ nit: COM.nit, nombre: COM.nombre, token: SES.token });
    toast(r.purgada ? 'Datos e imagen actualizados' : 'Datos actualizados', 'ok');
    go('home');
  } catch (e) {
    saving(btn, false);
    if (/sesión/i.test(String(e.message))) { sesBorrar(); return go('login'); }
    toast('Error de conexión', 'err');
  }
}

/* ============================================================
   VISTA · VALIDAR USUARIO (QR + documento)
   ============================================================ */
function viewValidar() {
  montar(`
    <div class="appbar">
      <button class="iconbtn" id="backbtn" data-ruta="home">‹</button>
      <div class="who"><b>Validar usuario</b><span>${esc((COM && COM.nombre) || '')}</span></div>
      <div class="cnt" id="vl-cnt" title="Validados en esta sesión">0</div>
    </div>
    <div class="pad stack">
      <div class="cam" id="sc-cam">
        <video id="sc-video" playsinline muted></video>
        <div class="cam-frame"></div>
        <div class="cam-off" id="sc-off">
          <div class="cam-off-ico">📷</div>
          <p class="muted small">Escáner apagado.<br/>Actívalo y apunta al QR de la tarjeta del usuario.</p>
        </div>
      </div>

      <div id="sc-res" class="res res-idle">
        <div class="res-t" id="sc-res-t">Listo para validar</div>
        <div class="res-s" id="sc-res-s">Cada lectura muestra los datos del usuario al instante.</div>
      </div>

      <div id="vl-ficha"></div>

      <button id="sc-toggle" class="btn btn-primary btn-block">▶️ Activar escaneo</button>
      <button id="vl-doc" class="btn btn-ghost btn-block">⌨️ Validar escribiendo el documento</button>
      ${footBrand()}
    </div>`);
  $('#backbtn').onclick = () => { scanStop(); go('home'); };
  $('#vl-cnt').textContent = String(SCAN.total);
  $('#sc-toggle').onclick = () => (SCAN.on ? scanStop() : scanStart());
  $('#vl-doc').onclick = sheetDocumento;
  pintarToggle();
}

function pintarToggle() {
  const b = $('#sc-toggle'); if (!b) return;
  b.innerHTML = SCAN.on ? '⏹️ Desactivar escaneo' : '▶️ Activar escaneo';
  b.classList.toggle('btn-primary', !SCAN.on);
  b.classList.toggle('btn-danger', SCAN.on);
  const off = $('#sc-off'); if (off) off.classList.toggle('hidden', SCAN.on);
  const cam = $('#sc-cam'); if (cam) cam.classList.toggle('live', SCAN.on);
}

function resultado(kind, titulo, sub) {
  const box = $('#sc-res'); if (!box) return;
  box.className = 'res res-' + kind;
  $('#sc-res-t').textContent = titulo;
  $('#sc-res-s').textContent = sub || '';
  box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
}

/* --- Motor de escaneo (el mismo de JHONNY ASISTENCIA) --- */
const SCAN = { on: false, stream: null, det: null, raf: null, busy: false, total: 0, vistos: new Map() };
const COOLDOWN_MS = 5000;
const NO_HAY = 'NO_HAY';

async function scanStart() {
  if (SCAN.on) return;
  const video = $('#sc-video'); if (!video) return;
  try {
    SCAN.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
    });
  } catch (e) { resultado('err', 'Sin cámara', 'El navegador no dio permiso o el equipo no tiene cámara.'); return; }
  video.srcObject = SCAN.stream;
  try { await video.play(); } catch (e) {}
  try { await prepararDetector(); } catch (e) {
    scanStop(); resultado('err', 'No se pudo iniciar el lector', 'Revisa la conexión y vuelve a intentarlo.'); return;
  }
  SCAN.on = true;
  try { if ('wakeLock' in navigator) SCAN._wake = await navigator.wakeLock.request('screen'); } catch (e) {}
  pintarToggle();
  resultado('idle', 'Escaneando…', 'Apunta al QR. No hay que oprimir nada entre cliente y cliente.');
  loopScan();
}

function scanStop() {
  if (!SCAN.on && !SCAN.stream) return;
  SCAN.on = false;
  if (SCAN.raf) { cancelAnimationFrame(SCAN.raf); SCAN.raf = null; }
  if (SCAN.stream) { SCAN.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); SCAN.stream = null; }
  const v = $('#sc-video'); if (v) v.srcObject = null;
  try { if (SCAN._wake) { SCAN._wake.release(); SCAN._wake = null; } } catch (e) {}
  pintarToggle();
}

async function prepararDetector() {
  if (SCAN.det) return;
  if ('BarcodeDetector' in window) {
    try {
      const fmts = await window.BarcodeDetector.getSupportedFormats();
      if (fmts.indexOf('qr_code') >= 0) { SCAN.det = { tipo: 'nativo', d: new window.BarcodeDetector({ formats: ['qr_code'] }) }; return; }
    } catch (e) {}
  }
  await cargarJsQR();
  SCAN.det = { tipo: 'jsqr', canvas: document.createElement('canvas') };
}

function cargarJsQR() {
  if (window.jsQR) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = JSQR_CDN; s.onload = () => res(); s.onerror = () => rej(new Error('jsQR'));
    document.head.appendChild(s);
  });
}

async function leerFrame(video) {
  if (!SCAN.det) return '';
  if (SCAN.det.tipo === 'nativo') {
    const codes = await SCAN.det.d.detect(video);
    return (codes && codes[0] && codes[0].rawValue) ? String(codes[0].rawValue) : '';
  }
  const c = SCAN.det.canvas;
  const w = video.videoWidth, hh = video.videoHeight;
  if (!w || !hh) return '';
  const k = Math.min(1, 640 / Math.max(w, hh));
  c.width = Math.round(w * k); c.height = Math.round(hh * k);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const r = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
  return r && r.data ? String(r.data) : '';
}

async function loopScan() {
  if (!SCAN.on) return;
  const video = $('#sc-video');
  if (video && video.readyState >= 2 && !SCAN.busy) {
    try { const raw = await leerFrame(video); if (raw) await procesarLectura(raw); }
    catch (e) { /* un frame malo no tumba el escáner */ }
  }
  SCAN.raf = requestAnimationFrame(loopScan);
}

function interpretar(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/JP[A-Z0-9]{8}/i);
  if (m) return { id: m[0].toUpperCase() };
  const d = onlyDig(s);
  if (/^\d{6,10}$/.test(d)) return { doc: d };
  return null;
}

async function procesarLectura(raw) {
  const p = interpretar(raw);
  const clave = p ? (p.id || p.doc) : NO_HAY + raw;
  const ahora = Date.now();
  if (ahora - (SCAN.vistos.get(clave) || 0) < COOLDOWN_MS) return;
  SCAN.vistos.set(clave, ahora);
  if (SCAN.vistos.size > 400) SCAN.vistos.clear();
  if (!p) { sonar('err'); vibrar(200); resultado('err', 'QR no reconocido', 'Ese código no es de la app de Jhonny Perdomo.'); return; }
  await validar(p);
}

async function validar(p) {
  if (SCAN.busy) return null;
  SCAN.busy = true;
  try {
    const r = await api('com.validar', {}, 'POST', Object.assign(auth(), p), { silencio: true });
    if (!r.ok) {
      sonar('err'); vibrar([120, 60, 120]);
      resultado('err', 'No válido', r.msg || '');
      pintarFicha(null);
      return r;
    }
    SCAN.total++;
    const c = $('#vl-cnt'); if (c) c.textContent = String(SCAN.total);
    sonar('ok'); vibrar(60);
    resultado(r.usuario.clase === 'Premium' ? 'ok' : 'warn',
      r.usuario.clase === 'Premium' ? '⭐ USUARIO PREMIUM' : 'USUARIO ESTÁNDAR',
      r.usuario.nombre);
    pintarFicha(r.usuario);
    return r;
  } catch (e) {
    sonar('err'); vibrar(200);
    if (/sesión/i.test(String(e.message))) { sesBorrar(); scanStop(); go('login'); return null; }
    resultado('err', 'No se pudo validar', String(e.message || e));
    return null;
  } finally { SCAN.busy = false; }
}

function pintarFicha(u) {
  const box = $('#vl-ficha'); if (!box) return;
  if (!u) { box.innerHTML = ''; return; }
  box.innerHTML = `
    <div class="ficha ${u.clase === 'Premium' ? 'ficha-prem' : ''}">
      <div class="ficha-top">
        <div class="ficha-av">${esc((u.nombre || '?').trim().charAt(0))}</div>
        <div><b>${esc(u.nombre)}</b><span>${esc(u.clase)}</span></div>
      </div>
      ${crow('Documento', u.documento)}
      ${crow('Teléfono', u.contacto)}
      ${crow('Residencia', u.residencia)}
      <div class="ficha-oferta">
        <b>Le corresponde</b>
        <span>${esc(u.clase === 'Premium' ? (COM && COM.premium) : (COM && COM.estandar))}</span>
      </div>
      ${u.contacto ? `<button class="btn btn-quiet btn-block" id="fc-wa" style="margin-top:10px;">Escribirle por WhatsApp</button>` : ''}
    </div>`;
  const w = $('#fc-wa');
  if (w) w.onclick = () => {
    const url = (esMovil() ? 'whatsapp://send?phone=57' : 'https://api.whatsapp.com/send?phone=57') + u.contacto;
    window.open(url, '_blank', 'noopener');
  };
}

function sheetDocumento() {
  const s = openSheet(`<div class="grip"></div><h2 class="h2">Validar por documento</h2>
    <p class="muted small">Úsalo cuando el cliente no tenga el QR a mano.</p>
    <div class="stack" style="margin-top:14px;">
      ${field('Documento', inputEl('vd-doc', 'inputmode="numeric" maxlength="10" placeholder="Sin puntos ni espacios"'))}
      <button class="btn btn-primary btn-block" id="vd-ok">Validar</button>
    </div>`);
  const i = $('#vd-doc', s); i.focus();
  i.addEventListener('input', () => { i.value = onlyDig(i.value).slice(0, 10); });
  i.addEventListener('keydown', e => { if (e.key === 'Enter') $('#vd-ok', s).click(); });
  $('#vd-ok', s).onclick = async () => {
    const d = onlyDig(i.value);
    if (!/^\d{6,10}$/.test(d)) return toast('Documento inválido (6 a 10 dígitos)', 'err');
    const b = $('#vd-ok', s); saving(b, true);
    const r = await validar({ doc: d });
    saving(b, false);
    if (r && r.ok) closeLayer();
  };
}

/* ============================================================
   VISTA · CLIENTES ATENDIDOS
   ============================================================ */
async function viewClientes() {
  montar(`${backbar('Clientes atendidos', 'home')}<div class="pad stack" id="cl-body">${loadingBox('Contando…')}</div>`);
  try {
    const r = await api('com.clientes', auth());
    if (!r.ok) throw new Error(r.msg);
    const s = r.resumen;
    const max = Math.max(1, ...s.porDia.map(d => d.n));
    $('#cl-body').innerHTML = `
      <div class="kpis">
        <div class="kpi"><b>${s.hoy}</b><span>Hoy</span></div>
        <div class="kpi"><b>${s.mes}</b><span>Este mes</span></div>
        <div class="kpi"><b>${s.total}</b><span>Total</span></div>
        <div class="kpi"><b>${s.unicos}</b><span>Personas</span></div>
      </div>

      <div class="ev-card stack">
        <h2 class="h2">Premium vs Estándar</h2>
        <div class="split">
          <div class="split-bar"><i style="width:${s.total ? Math.round(s.premium * 100 / s.total) : 0}%"></i></div>
          <div class="split-leg"><span class="dot dot-prem"></span>Premium ${s.premium} · <span class="dot dot-est"></span>Estándar ${s.estandar}</div>
        </div>
      </div>

      ${s.porDia.length ? `<div class="ev-card stack">
        <h2 class="h2">Últimos días</h2>
        <div class="bars">${s.porDia.map(d => `<div class="bar"><i style="height:${Math.round(d.n * 100 / max)}%" title="${d.n}"></i><em>${esc(d.dia.slice(0, 5))}</em></div>`).join('')}</div>
      </div>` : ''}

      <div class="ev-card stack">
        <h2 class="h2">Últimas validaciones</h2>
        ${s.ultimos.length ? s.ultimos.map(u => `
          <div class="linea">
            <div><b>${esc(u.nombre)}</b><span>${esc(u.fecha)} · ${esc(u.residencia || '—')}</span></div>
            <span class="tag ${u.clase === 'Premium' ? 'tag-prem' : ''}">${esc(u.clase)}</span>
          </div>`).join('') : `<p class="muted small">Todavía no has validado clientes.</p>`}
      </div>

      <button class="btn btn-ghost btn-block" id="cl-xls">⬇️ Descargar en Excel</button>
      ${footBrand()}`;
    $('#cl-xls').onclick = descargarClientes;
  } catch (e) {
    if (/sesión/i.test(String(e.message))) { sesBorrar(); return go('login'); }
    $('#cl-body').innerHTML = `<div class="ev-card"><p class="muted">No se pudo cargar. Revisa la conexión.</p></div>`;
  }
}

async function descargarClientes() {
  const btn = $('#cl-xls'); saving(btn, true);
  try {
    const r = await api('com.clientesExcel', auth());
    saving(btn, false);
    if (!r.ok) return toast(r.msg, 'err');
    descargarB64(r.archivo.base64, r.archivo.filename, r.archivo.mime);
  } catch (e) { saving(btn, false); toast('No se pudo generar el archivo', 'err'); }
}

function descargarB64(b64, nombre, mime) {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nombre || 'archivo';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  } catch (e) { toast('No se pudo descargar', 'err'); }
}

/* ============================================================
   VISTA · ASÍ TE VEN (vista previa igual a la app pública)
   ============================================================ */
function viewPreview() {
  if (!COM) { go('home'); return; }
  const c = COM;
  const red = (u, ico, nom) => u ? `<a class="pv-red" href="${esc(u)}" target="_blank" rel="noopener">${ico} ${nom}</a>` : '';
  montar(`${backbar('Así te ven', 'home')}
    <div class="pad stack">
      <p class="muted small center">Esto es exactamente lo que aparece en la app de los usuarios.</p>
      <div class="pv-card">
        ${c.imagen ? `<img class="pv-img" src="${esc(c.imagen)}" alt="" onerror="this.style.display='none'" />` : ''}
        <div class="pv-body">
          <span class="pv-cat">${esc(c.categoria)}</span>
          <h3 class="pv-tit">${esc(c.nombre)}</h3>
          <p class="pv-desc">${esc(c.descripcion)}</p>
          <div class="pv-of pv-prem"><b>⭐ Premium</b><span>${esc(c.premium)}</span></div>
          <div class="pv-of pv-est"><b>Estándar</b><span>${esc(c.estandar)}</span></div>
          ${c.direccion ? `<p class="pv-dir">📍 ${esc(c.direccion)}</p>` : ''}
          <div class="pv-redes">
            ${red(c.ubicacion, '🗺️', 'Ubicación')}
            ${red(c.facebook, '📘', 'Facebook')}
            ${red(c.instagram, '📸', 'Instagram')}
            ${red(c.tiktok, '🎵', 'TikTok')}
            ${c.reel ? `<a class="pv-red" href="${esc(c.reel)}" target="_blank" rel="noopener">🎬 Video</a>` : ''}
          </div>
          <div class="pv-btns">
            <span class="pv-btn">💬 WhatsApp ${esc(c.whatsapp)}</span>
            ${c.telefono ? `<span class="pv-btn">📞 ${esc(c.telefono)}</span>` : ''}
          </div>
        </div>
      </div>
      <button class="btn btn-ghost btn-block" id="pv-edit">Cambiar algo</button>
      ${footBrand()}
    </div>`);
  $('#pv-edit').onclick = () => go('actualizar');
}

/* ============================================================
   VISTA · PONTE AL DÍA (noticias de la campaña)
   ============================================================ */
async function viewAvisos() {
  montar(`${backbar('Ponte al día', 'home')}<div class="pad stack" id="av-body">${loadingBox('Buscando novedades…')}</div>`);
  try {
    const r = await api('pub.noticias', { limite: 20 });
    const lista = Array.isArray(r) ? r : (r.noticias || r.items || []);
    $('#av-body').innerHTML = lista.length ? lista.map(n => `
      <div class="ev-card stack">
        <b class="h2">${esc(n.titulo || n.TITULO || '')}</b>
        <p class="muted small" style="white-space:pre-line;">${esc(n.descripcion || n.DESCRIPCION || n.cuerpo || '')}</p>
        <span class="small muted">${esc(n.fecha || n.FECHA || '')}</span>
        ${(n.enlace || n.ENLACE) ? `<a class="btn btn-quiet btn-block" href="${esc(n.enlace || n.ENLACE)}" target="_blank" rel="noopener">Ver más</a>` : ''}
      </div>`).join('') + footBrand()
      : `<div class="ev-card"><p class="muted">Todavía no hay novedades publicadas.</p></div>`;
  } catch (e) {
    $('#av-body').innerHTML = `<div class="ev-card"><p class="muted">No se pudieron cargar las novedades.</p></div>`;
  }
}

/* ============================================================
   SERVICE WORKER
   ============================================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
