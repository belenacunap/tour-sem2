/* Tour virtual 360° · Sala SEM2
 * Visor basado en Marzipano (vendor/marzipano). Los textos, escenas y ángulos viven en js/config.js.
 */
(function () {
  'use strict';

  var CFG = window.TOUR_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var rad = function (d) { return d * Math.PI / 180; };
  var deg = function (r) { return r * 180 / Math.PI; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  // En Marzipano un pitch positivo mira hacia ABAJO. En config.js usamos la convención natural
  // (positivo = arriba), así que se invierte el signo al pasar al visor.
  var mzPitch = function (d) { return -rad(d); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var HFOV_MIN = 35, HFOV_MAX = 120, VFOV_MAX = 110;
  var PASO_GIRO = 8;           // grados por pulsación de flecha
  var ZOOM_FACTOR = 0.8;

  var el = {
    portada: $('portada'), visor: $('visor'), mundo: $('mundo'), nombreEscena: $('nombre-escena'),
    aviso: $('aviso'), coord: $('coord'), dock: document.querySelector('.dock'), mas: $('btn-mas'),
    anterior: $('btn-anterior'), siguiente: $('btn-siguiente'), pantalla: $('btn-pantalla'),
    estatica: $('vista-estatica')
  };

  var viewer = null;
  var escenas = {};            // id -> { cfg, scene, view, hotspots }
  var orden = CFG.escenas.map(function (e) { return e.id; });
  var actual = null;           // id de la escena visible
  var hfovActual = 95;
  var modoDepurar = /(^|[#&])depurar(&|$)/.test(location.hash);

  /* ---------------- utilidades ---------------- */
  function cfgEscena(id) {
    for (var i = 0; i < CFG.escenas.length; i++) if (CFG.escenas[i].id === id) return CFG.escenas[i];
    return null;
  }

  function avisar(texto, ms) {
    el.aviso.textContent = texto;
    el.aviso.hidden = false;
    clearTimeout(avisar._t);
    if (ms) avisar._t = setTimeout(function () { el.aviso.hidden = true; }, ms);
  }

  function vfovDesdeH(hDeg) {
    var w = el.mundo.clientWidth || 800, h = el.mundo.clientHeight || 600;
    var v = Marzipano.util.convertFov.htov(rad(hDeg), w, h);
    return clamp(v, rad(30), rad(VFOV_MAX));
  }

  function esVisible(node) { return node && !node.hidden && node.offsetParent !== null; }

  /* ---------------- diálogos accesibles ---------------- */
  var abiertoPor = new WeakMap();

  function abrir(dlg, disparador) {
    abiertoPor.set(dlg, disparador || document.activeElement);
    if (typeof dlg.showModal === 'function') {
      if (!dlg.open) dlg.showModal();
    } else {                                   // navegadores sin <dialog>
      dlg.setAttribute('open', '');
      dlg.classList.add('dlg-polyfill');
    }
    var foco = dlg.querySelector('[autofocus], [data-cerrar]');
    if (foco) foco.focus();
  }

  function alCerrar(dlg) {
    var vuelta = abiertoPor.get(dlg);
    if (vuelta && document.contains(vuelta) && typeof vuelta.focus === 'function' && vuelta.offsetParent !== null) vuelta.focus();
    else el.mundo.focus({ preventScroll: true });
  }

  function cerrar(dlg) {
    if (typeof dlg.close === 'function') dlg.close();
    else { dlg.removeAttribute('open'); alCerrar(dlg); }
  }

  Array.prototype.forEach.call(document.querySelectorAll('dialog'), function (dlg) {
    dlg.addEventListener('close', function () { alCerrar(dlg); });
    dlg.addEventListener('click', function (ev) {
      if (ev.target === dlg) cerrar(dlg);                         // clic sobre el fondo
      var b = ev.target.closest && ev.target.closest('[data-cerrar]');
      if (b && dlg.contains(b)) cerrar(dlg);
    });
  });
  document.addEventListener('keydown', function (ev) {              // Escape en navegadores sin <dialog>
    if (ev.key !== 'Escape') return;
    var d = document.querySelector('dialog.dlg-polyfill[open]');
    if (d) cerrar(d);
  });

  /* ---------------- portada ---------------- */
  function pintarPortada() {
    document.title = CFG.titulo;
    $('texto-bienvenida').textContent = CFG.bienvenida;
    $('sub-portada').textContent = CFG.subtitulo;
    $('inst-portada').textContent = CFG.institucion;
  }

  /* ---------------- visor ---------------- */
  function crearVisor() {
    var limiter = Marzipano.RectilinearView.limit.traditional(4096, rad(VFOV_MAX));
    viewer = new Marzipano.Viewer(el.mundo, { controls: { mouseViewMode: 'drag' } });
    viewer._limiter = limiter;
  }

  function hotspotNavegacion(s, e) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'hs hs--nav';
    var destino = cfgEscena(e.destino);
    var nombre = e.etiqueta || (destino && destino.nombre) || e.destino;
    b.setAttribute('aria-label', 'Ir a: ' + nombre);
    b.innerHTML = '<span class="hs__icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6.5 14.5 12 9l5.5 5.5"/></svg></span>' +
                  '<span class="hs__texto"></span>';
    b.querySelector('.hs__texto').textContent = nombre;
    b.addEventListener('click', function () {
      irA(e.destino, { llegada: e.llegada, enfocarMundo: true });
    });
    return b;
  }

  function hotspotInfo(p) {
    var f = CFG.fichas[p.ficha];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'hs hs--info';
    b.setAttribute('aria-haspopup', 'dialog');
    b.setAttribute('aria-label', 'Información: ' + f.titulo);
    b.innerHTML = '<span class="hs__icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 11v6M12 7.3v.1"/></svg></span>' +
                  '<span class="hs__texto"></span>';
    b.querySelector('.hs__texto').textContent = f.titulo;
    b.addEventListener('click', function () { abrirFicha(p.ficha, b); });
    return b;
  }

  function obtenerEscena(id) {
    if (escenas[id]) return escenas[id];
    var c = cfgEscena(id);
    var fuente = Marzipano.ImageUrlSource.fromString(c.tiles + '/{z}/{f}/{y}/{x}.jpg', { cubeMapPreviewUrl: c.tiles + '/preview.jpg' });
    var geom = new Marzipano.CubeGeometry([
      { tileSize: 256, size: 256, fallbackOnly: true },
      { tileSize: 512, size: 512 },
      { tileSize: 512, size: 1024 },
      { tileSize: 512, size: 2048 }
    ]);
    var vista = new Marzipano.RectilinearView(null, viewer._limiter);
    var scene = viewer.createScene({ source: fuente, geometry: geom, view: vista, pinFirstLevel: true });
    fuente.addEventListener && fuente.addEventListener('networkError', function () {
      avisar('Conexión lenta: algunas partes de la imagen tardan en cargar…', 4000);
    });
    var cont = scene.hotspotContainer();
    (c.enlaces || []).forEach(function (e) {
      cont.createHotspot(hotspotNavegacion(c, e), { yaw: rad(e.yaw), pitch: mzPitch(e.pitch) });
    });
    (c.puntos || []).forEach(function (p) {
      cont.createHotspot(hotspotInfo(p), { yaw: rad(p.yaw), pitch: mzPitch(p.pitch) });
    });
    escenas[id] = { cfg: c, scene: scene, view: vista };
    return escenas[id];
  }

  function parametrosIniciales(c, llegada) {
    var v = llegada || c.vistaInicial;
    var h = v.fov || c.vistaInicial.fov || 95;
    return { yaw: rad(v.yaw), pitch: mzPitch(v.pitch), fov: vfovDesdeH(h), _h: h };
  }

  function precargarVecinas(id) {
    var i = orden.indexOf(id);
    [orden[i - 1], orden[i + 1]].forEach(function (n) {
      if (!n) return;
      var img = new Image();
      img.src = cfgEscena(n).tiles + '/preview.jpg';
    });
  }

  function irA(id, opts) {
    opts = opts || {};
    var c = cfgEscena(id);
    if (!c) return;
    var e = obtenerEscena(id);
    var p = parametrosIniciales(c, opts.llegada);
    hfovActual = p._h;
    e.view.setParameters({ yaw: p.yaw, pitch: p.pitch, fov: p.fov });
    e.scene.switchTo({ transitionDuration: (reduceMotion || !actual) ? 0 : 500 });
    actual = id;
    el.nombreEscena.textContent = c.nombre;
    var i = orden.indexOf(id);
    el.anterior.disabled = i <= 0;
    el.siguiente.disabled = i >= orden.length - 1;
    try { history.replaceState(null, '', '#' + id + (modoDepurar ? '&depurar' : '')); } catch (_) { /* file:// */ }
    precargarVecinas(id);
    if (opts.enfocarMundo) el.mundo.focus({ preventScroll: true });
  }

  function vistaActual() { return escenas[actual] && escenas[actual].view; }

  function girarA(yawDeg, pitchDeg) {
    var v = vistaActual();
    if (!v) return;
    v.setParameters({ yaw: rad(yawDeg), pitch: mzPitch(pitchDeg) });   // sin animaciones automáticas
  }

  function centrar() {
    var c = cfgEscena(actual), v = vistaActual();
    if (!c || !v) return;
    var p = parametrosIniciales(c);
    hfovActual = p._h;
    v.setParameters({ yaw: p.yaw, pitch: p.pitch, fov: p.fov });
  }

  function zoom(factor) {
    var v = vistaActual();
    if (!v) return;
    var nuevo = clamp(v.fov() * factor, vfovDesdeH(HFOV_MIN), rad(VFOV_MAX));
    v.setFov(nuevo);
    hfovActual = deg(Marzipano.util.convertFov.vtoh(nuevo, el.mundo.clientWidth || 800, el.mundo.clientHeight || 600));
  }

  function girar(dy, dp) {
    var v = vistaActual();
    if (!v) return;
    v.setYaw(v.yaw() + rad(dy));
    v.setPitch(clamp(v.pitch() + mzPitch(dp), rad(-85), rad(85)));
  }

  /* ---------------- fichas ---------------- */
  function abrirFicha(id, disparador) {
    var f = CFG.fichas[id];
    $('ficha-titulo').textContent = f.titulo;
    $('ficha-texto').textContent = f.texto;
    abrir($('dlg-ficha'), disparador);
  }

  /* ---------------- panel de escenas ---------------- */
  function pintarPanelEscenas() {
    var ul = $('lista-escenas');
    ul.innerHTML = '';
    CFG.escenas.forEach(function (c, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'esc-item';
      if (c.id === actual) b.setAttribute('aria-current', 'true');
      b.innerHTML = '<img alt="" width="160" height="90" loading="lazy"><span class="esc-item__txt"><span class="esc-item__num"></span><strong></strong><small></small></span>';
      b.querySelector('img').src = c.miniatura;
      b.querySelector('.esc-item__num').textContent = 'Parada ' + (i + 1) + (c.id === actual ? ' · estás aquí' : '');
      b.querySelector('strong').textContent = c.nombre;
      b.querySelector('small').textContent = c.descripcion;
      b.addEventListener('click', function () {
        cerrar($('dlg-escenas'));
        irA(c.id, { enfocarMundo: true });
      });
      li.appendChild(b);
      ul.appendChild(li);
    });

    var cont = $('fichas-escena');
    cont.innerHTML = '';
    var c = cfgEscena(actual);
    var vistas = {};
    (c.puntos || []).forEach(function (p) {
      if (vistas[p.ficha]) return;
      vistas[p.ficha] = true;
      var f = CFG.fichas[p.ficha];
      var art = document.createElement('article');
      art.className = 'ficha-card';
      art.innerHTML = '<h4></h4><p></p><button type="button" class="btn btn--sec btn--mini">Ver en el panorama</button>';
      art.querySelector('h4').textContent = f.titulo;
      art.querySelector('p').textContent = f.texto;
      art.querySelector('button').addEventListener('click', function () {
        cerrar($('dlg-escenas'));
        girarA(p.yaw, p.pitch);
      });
      cont.appendChild(art);
    });
  }

  /* ---------------- compartir ---------------- */
  function urlCompartir() {
    return CFG.urlPublica || (location.href.split('#')[0]);
  }

  function abrirCompartir(disparador) {
    $('url-compartir').value = urlCompartir();
    $('msg-copia').textContent = '';
    var fig = $('qr-fig');
    if (CFG.qr) { $('qr-img').src = CFG.qr; fig.hidden = false; } else { fig.hidden = true; }
    $('btn-share').hidden = !navigator.share;
    abrir($('dlg-compartir'), disparador);
  }

  function copiar() {
    var url = urlCompartir(), msg = $('msg-copia');
    var ok = function () { msg.textContent = 'Enlace copiado.'; };
    var fallo = function () {
      var inp = $('url-compartir');
      inp.focus(); inp.select();
      try { document.execCommand('copy') ? ok() : (msg.textContent = 'Selecciona el enlace y cópialo manualmente.'); }
      catch (_) { msg.textContent = 'Selecciona el enlace y cópialo manualmente.'; }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, fallo);
    else fallo();
  }

  /* ---------------- pantalla completa ---------------- */
  var fsSoportado = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  function alternarPantalla() {
    var raiz = document.documentElement;
    var activa = document.fullscreenElement || document.webkitFullscreenElement;
    if (activa) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (raiz.requestFullscreen || raiz.webkitRequestFullscreen).call(raiz);
  }
  function syncPantalla() {
    var activa = !!(document.fullscreenElement || document.webkitFullscreenElement);
    el.pantalla.setAttribute('aria-pressed', String(activa));
  }
  document.addEventListener('fullscreenchange', syncPantalla);
  document.addEventListener('webkitfullscreenchange', syncPantalla);

  /* ---------------- vista estática (si falla el visor) ---------------- */
  function mostrarEstatica(motivo) {
    el.portada.hidden = true;
    el.visor.hidden = true;
    el.estatica.hidden = false;
    $('estatica-motivo').textContent = motivo;
    var ol = $('estatica-lista');
    ol.innerHTML = '';
    CFG.escenas.forEach(function (c) {
      var li = document.createElement('li');
      var fichas = (c.puntos || []).reduce(function (acc, p) {
        if (acc.indexOf(p.ficha) < 0) acc.push(p.ficha); return acc;
      }, []).map(function (k) { return '<li><b></b> <span></span></li>'; }).join('');
      li.innerHTML = '<img alt="" width="240" height="135"><div><h3></h3><p class="estatica__desc"></p><ul class="estatica__fichas">' + fichas + '</ul></div>';
      li.querySelector('img').src = c.miniatura;
      li.querySelector('h3').textContent = c.nombre;
      li.querySelector('.estatica__desc').textContent = c.descripcion;
      var vistos = [];
      (c.puntos || []).forEach(function (p) { if (vistos.indexOf(p.ficha) < 0) vistos.push(p.ficha); });
      Array.prototype.forEach.call(li.querySelectorAll('.estatica__fichas li'), function (n, i) {
        n.querySelector('b').textContent = CFG.fichas[vistos[i]].titulo + '.';
        n.querySelector('span').textContent = CFG.fichas[vistos[i]].texto;
      });
      ol.appendChild(li);
    });
  }

  /* ---------------- arranque ---------------- */
  function webglDisponible() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (_) { return false; }
  }

  function iniciar(idInicial) {
    if (typeof Marzipano === 'undefined') { mostrarEstatica('No se pudo cargar el visor 360°. Estas son las paradas del tour:'); return; }
    if (!webglDisponible()) { mostrarEstatica('Tu navegador no admite gráficos WebGL, necesarios para el visor 360°. Estas son las paradas del tour:'); return; }
    var c = cfgEscena(idInicial) || cfgEscena(CFG.escenaInicial);
    var sonda = new Image();                                  // la escena de entrada se carga primero
    sonda.onerror = function () { mostrarEstatica('No se pudieron cargar las imágenes del panorama. Estas son las paradas del tour:'); };
    sonda.src = c.tiles + '/preview.jpg';
    el.portada.hidden = true;
    el.visor.hidden = false;                                   // el contenedor debe tener tamaño antes de crear el visor
    try { crearVisor(); } catch (err) { mostrarEstatica('El visor 360° no pudo iniciarse en este dispositivo. Estas son las paradas del tour:'); return; }
    el.mundo.focus({ preventScroll: true });
    irA(c.id);
  }

  function volverInicio() {
    el.visor.hidden = true;
    el.portada.hidden = false;
    actual = null;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) { /* file:// */ }
    $('btn-iniciar').focus();
  }

  function enlazarControles() {
    $('btn-iniciar').addEventListener('click', function () {
      if (viewer) {
        el.portada.hidden = true; el.visor.hidden = false;
        viewer.updateSize();
        irA(CFG.escenaInicial, { enfocarMundo: true });
      }
      else iniciar(CFG.escenaInicial);
    });
    $('btn-lista').addEventListener('click', function () {
      mostrarEstatica('Vista en lista, sin visor 360°.');
    });
    $('btn-reintentar').addEventListener('click', function () { location.href = location.pathname; });
    $('btn-inicio').addEventListener('click', volverInicio);
    el.anterior.addEventListener('click', function () { var i = orden.indexOf(actual); if (i > 0) irA(orden[i - 1], { enfocarMundo: true }); });
    el.siguiente.addEventListener('click', function () { var i = orden.indexOf(actual); if (i < orden.length - 1) irA(orden[i + 1], { enfocarMundo: true }); });
    $('btn-escenas').addEventListener('click', function (ev) { pintarPanelEscenas(); abrir($('dlg-escenas'), ev.currentTarget); });
    $('btn-ayuda').addEventListener('click', function (ev) { abrir($('dlg-ayuda'), ev.currentTarget); });
    $('btn-acercar').addEventListener('click', function () { zoom(ZOOM_FACTOR); });
    $('btn-alejar').addEventListener('click', function () { zoom(1 / ZOOM_FACTOR); });
    $('btn-centrar').addEventListener('click', centrar);
    $('btn-compartir').addEventListener('click', function (ev) { abrirCompartir(ev.currentTarget); });
    $('btn-copiar').addEventListener('click', copiar);
    $('btn-share').addEventListener('click', function () {
      navigator.share({ title: CFG.titulo, text: CFG.subtitulo, url: urlCompartir() }).catch(function () { /* cancelado */ });
    });
    if (fsSoportado) el.pantalla.addEventListener('click', alternarPantalla); else el.pantalla.hidden = true;
    el.mas.addEventListener('click', function () {
      var abierto = el.dock.classList.toggle('dock--abierto');
      el.mas.setAttribute('aria-expanded', String(abierto));
    });

    // Teclado: sólo cuando no hay un diálogo abierto
    document.addEventListener('keydown', function (ev) {
      if (el.visor.hidden || document.querySelector('dialog[open]')) return;
      if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
      var t = ev.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      var k = ev.key, usado = true;
      if (k === 'ArrowLeft') girar(-PASO_GIRO, 0);
      else if (k === 'ArrowRight') girar(PASO_GIRO, 0);
      else if (k === 'ArrowUp') girar(0, PASO_GIRO);
      else if (k === 'ArrowDown') girar(0, -PASO_GIRO);
      else if (k === '+' || k === '=') zoom(ZOOM_FACTOR);
      else if (k === '-' || k === '_') zoom(1 / ZOOM_FACTOR);
      else if (k === 'Home') centrar();
      else if (k === 'PageUp' && !el.anterior.disabled) el.anterior.click();
      else if (k === 'PageDown' && !el.siguiente.disabled) el.siguiente.click();
      else usado = false;
      if (usado) ev.preventDefault();
    });

    // Al cambiar el tamaño (por ejemplo, al girar el teléfono) se recalcula el campo visual
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var v = vistaActual(); if (v) v.setFov(vfovDesdeH(hfovActual)); }, 150);
    });

    if (modoDepurar) {                                         // clic = mostrar yaw / pitch
      var down = null;
      el.mundo.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; });
      el.mundo.addEventListener('pointerup', function (e) {
        if (!down || Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) > 6) return;
        var v = vistaActual(), r = el.mundo.getBoundingClientRect();
        if (!v) return;
        var c = v.screenToCoordinates({ x: e.clientX - r.left, y: e.clientY - r.top });
        el.coord.hidden = false;
        el.coord.textContent = 'yaw: ' + deg(c.yaw).toFixed(1) + '   pitch: ' + (-deg(c.pitch)).toFixed(1);
      });
    }
  }

  function leerHash() {
    var h = location.hash.replace(/^#/, '').split('&')[0];
    return cfgEscena(h) ? h : null;
  }

  if (modoDepurar) window.TOUR_DEBUG = { get viewer() { return viewer; }, escenas: escenas, vista: vistaActual, ir: irA, mirar: girarA };
  pintarPortada();
  enlazarControles();
  var desdeHash = leerHash();
  if (desdeHash) iniciar(desdeHash);
})();
