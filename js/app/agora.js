/* ECG — interfaz del Ágora. Habla solo con window.ECG.api, así que
   funciona igual con el motor local que con la base de datos real. */
(function () {
  'use strict';

  var api = window.ECG.api;
  var estado = { motor: api.motor };

  var el = {
    aviso: document.getElementById('aviso'),
    motor: document.getElementById('motor'),
    sesion: document.getElementById('sesion'),
    auth: document.getElementById('auth'),
    authForm: document.getElementById('auth-form'),
    authHandle: document.getElementById('auth-handle'),
    authPass: document.getElementById('auth-pass'),
    authPassWrap: document.getElementById('auth-pass-wrap'),
    authEmail: document.getElementById('auth-email'),
    authEmailWrap: document.getElementById('auth-email-wrap'),
    authHandleWrap: document.getElementById('auth-handle-wrap'),
    authErr: document.getElementById('auth-err'),
    authTitulo: document.getElementById('auth-titulo'),
    authSubmit: document.getElementById('auth-submit'),
    authToggle: document.getElementById('auth-toggle'),
    app: document.getElementById('app'),
    quien: document.getElementById('quien'),
    rep: document.getElementById('rep'),
    salir: document.getElementById('salir'),
    vistaLista: document.getElementById('vista-lista'),
    vistaTema: document.getElementById('vista-tema'),
    temas: document.getElementById('temas'),
    temasVacio: document.getElementById('temas-vacio'),
    nuevoTema: document.getElementById('nuevo-tema'),
    nuevoTemaInput: document.getElementById('nuevo-tema-input'),
    nuevoTemaErr: document.getElementById('nuevo-tema-err'),
    volver: document.getElementById('volver'),
    temaTitulo: document.getElementById('tema-titulo'),
    temaMeta: document.getElementById('tema-meta'),
    hilo: document.getElementById('hilo'),
    responder: document.getElementById('responder'),
    respKind: document.getElementById('resp-kind'),
    respBody: document.getElementById('resp-body'),
    respEvidence: document.getElementById('resp-evidence'),
    respErr: document.getElementById('resp-err'),
    respA: document.getElementById('resp-a'),
    respCancel: document.getElementById('resp-cancel')
  };

  var usuario = null;
  var temaActual = null;
  var respondiendoA = null;
  var modo = 'entrar';

  /* ==========================================================
     Utilidades de interfaz
     ========================================================== */

  function texto(nodo, valor) {
    nodo.textContent = valor;
  }

  function mostrarError(nodo, mensaje) {
    nodo.textContent = mensaje;
    nodo.hidden = false;
  }

  function limpiarError(nodo) {
    nodo.textContent = '';
    nodo.hidden = true;
  }

  function cuando(iso) {
    var d = new Date(iso);
    var min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'ahora mismo';
    if (min < 60) return 'hace ' + min + ' min';
    if (min < 1440) return 'hace ' + Math.round(min / 60) + ' h';
    return 'hace ' + Math.round(min / 1440) + ' d';
  }

  var ETIQUETA = { tesis: 'Tesis', refutacion: 'Refutación', matiz: 'Matiz' };

  /* ==========================================================
     Sesión
     ========================================================== */

  function esSupabase() {
    return api.motor === 'supabase';
  }

  function pintarModoAuth() {
    var registrando = modo === 'registrar';
    var conBase = esSupabase();

    texto(el.authTitulo, registrando ? 'Crear cuenta' : 'Entrar');
    texto(el.authSubmit, registrando ? 'Crear cuenta' : 'Entrar');
    texto(el.authToggle, registrando ? 'Ya tengo cuenta' : 'Crear una cuenta');

    /* Con base de datos real las cuentas van por correo: al registrarse
       hacen falta usuario, correo y contraseña; al entrar basta el correo. */
    el.authPassWrap.hidden = !conBase;
    el.authEmailWrap.hidden = !conBase;
    el.authHandleWrap.hidden = conBase && !registrando;

    el.authPass.autocomplete = registrando ? 'new-password' : 'current-password';
    limpiarError(el.authErr);
  }

  async function pintarSesion() {
    usuario = await api.usuarioActual();

    el.auth.hidden = !!usuario;
    el.app.hidden = !usuario;
    el.sesion.hidden = !usuario;

    if (usuario) {
      texto(el.quien, '@' + usuario.handle);
      var r = await api.reputacion(usuario.handle);
      texto(el.rep, r ? 'Reputación ' + r.reputation : 'Reputación 0');
    }
  }

  el.authToggle.addEventListener('click', function () {
    modo = modo === 'entrar' ? 'registrar' : 'entrar';
    pintarModoAuth();
  });

  el.authForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    limpiarError(el.authErr);
    var handle = el.authHandle.value.trim().toLowerCase();
    var pass = el.authPass.value;
    var correo = el.authEmail.value.trim().toLowerCase();
    var conBase = esSupabase();

    el.authSubmit.disabled = true;
    try {
      if (modo === 'registrar') await api.registrar(handle, pass, correo);
      else await api.entrar(conBase ? correo : handle, pass);
      el.authForm.reset();
      await pintarSesion();
      await pintarTemas();
    } catch (err) {
      mostrarError(el.authErr, err.message);
    } finally {
      el.authSubmit.disabled = false;
    }
  });

  el.salir.addEventListener('click', async function () {
    await api.salir();
    await pintarSesion();
  });

  /* ==========================================================
     Lista de temas
     ========================================================== */

  async function pintarTemas() {
    var temas = await api.listarTemas();
    el.temas.innerHTML = '';
    el.temasVacio.hidden = temas.length > 0;

    temas.forEach(function (t) {
      var fila = document.createElement('button');
      fila.type = 'button';
      fila.className = 'tema';

      var titulo = document.createElement('p');
      titulo.className = 'tema__t';
      titulo.textContent = t.title;
      fila.appendChild(titulo);

      var meta = document.createElement('p');
      meta.className = 'tema__m';
      meta.textContent =
        '@' + t.autor + ' · ' + cuando(t.created_at) + ' · ' +
        (t.intervenciones === 1 ? '1 intervención' : t.intervenciones + ' intervenciones');
      fila.appendChild(meta);

      fila.addEventListener('click', function () { abrirTema(t.id); });
      el.temas.appendChild(fila);
    });
  }

  el.nuevoTema.addEventListener('submit', async function (e) {
    e.preventDefault();
    limpiarError(el.nuevoTemaErr);
    try {
      var id = await api.crearTema(el.nuevoTemaInput.value);
      el.nuevoTema.reset();
      await abrirTema(id);
    } catch (err) {
      mostrarError(el.nuevoTemaErr, err.message);
    }
  });

  /* ==========================================================
     Hilo de debate
     ========================================================== */

  async function abrirTema(id) {
    temaActual = await api.verTema(id);
    if (!temaActual) return;

    el.vistaLista.hidden = true;
    el.vistaTema.hidden = false;
    texto(el.temaTitulo, temaActual.title);
    texto(el.temaMeta, 'Abierto por @' + temaActual.autor + ' · ' + cuando(temaActual.created_at));
    cancelarRespuesta();
    await pintarHilo();
    el.vistaTema.focus();
  }

  el.volver.addEventListener('click', async function () {
    el.vistaTema.hidden = true;
    el.vistaLista.hidden = false;
    temaActual = null;
    await pintarTemas();
  });

  function tarjeta(post, profundidad) {
    var art = document.createElement('article');
    art.className = 'int';
    if (profundidad > 0) art.className += ' int--hijo';
    if (profundidad > 1) art.className += ' int--nieto';

    var cab = document.createElement('div');
    cab.className = 'int__cab';

    var tag = document.createElement('span');
    tag.className = 'int__tag int__tag--' + post.kind;
    tag.textContent = ETIQUETA[post.kind] || post.kind;
    cab.appendChild(tag);

    var autor = document.createElement('span');
    autor.className = 'int__autor';
    autor.textContent = '@' + post.autor;
    cab.appendChild(autor);

    var fecha = document.createElement('span');
    fecha.className = 'int__fecha';
    fecha.textContent = cuando(post.created_at);
    cab.appendChild(fecha);

    art.appendChild(cab);

    var cuerpo = document.createElement('p');
    cuerpo.className = 'int__cuerpo';
    cuerpo.textContent = post.body;
    art.appendChild(cuerpo);

    if (post.evidence) {
      var ev = document.createElement('a');
      ev.className = 'int__ev';
      ev.href = post.evidence;
      ev.rel = 'noopener noreferrer nofollow';
      ev.target = '_blank';
      ev.textContent = 'Evidencia citada';
      art.appendChild(ev);
    }

    var acts = document.createElement('div');
    acts.className = 'int__acts';

    var voto = document.createElement('button');
    voto.type = 'button';
    voto.className = 'voto' + (post.votado ? ' voto--on' : '');
    voto.setAttribute('aria-pressed', post.votado ? 'true' : 'false');
    voto.textContent = '▲ ' + post.votos;
    voto.addEventListener('click', async function () {
      try {
        await api.votar(post.id, !post.votado);
        await pintarHilo();
        if (usuario) {
          var r = await api.reputacion(usuario.handle);
          texto(el.rep, r ? 'Reputación ' + r.reputation : 'Reputación 0');
        }
      } catch (err) {
        window.console && console.warn(err);
      }
    });
    acts.appendChild(voto);

    if (profundidad < 2) {
      var ref = document.createElement('button');
      ref.type = 'button';
      ref.className = 'int__ref';
      ref.textContent = 'Refutar';
      ref.addEventListener('click', function () { responderA(post); });
      acts.appendChild(ref);
    }

    art.appendChild(acts);
    return art;
  }

  async function pintarHilo() {
    var posts = await api.listarIntervenciones(temaActual.id);
    el.hilo.innerHTML = '';

    var porPadre = {};
    posts.forEach(function (p) {
      var k = p.parent_id || 'raiz';
      (porPadre[k] = porPadre[k] || []).push(p);
    });

    function rama(clave, profundidad) {
      (porPadre[clave] || []).forEach(function (p) {
        el.hilo.appendChild(tarjeta(p, profundidad));
        rama(p.id, profundidad + 1);
      });
    }

    rama('raiz', 0);

    if (!posts.length) {
      var vacio = document.createElement('p');
      vacio.className = 'hilo__vacio';
      vacio.textContent = 'Todavía no hay intervenciones. Abre tú la tesis.';
      el.hilo.appendChild(vacio);
    }
  }

  /* ==========================================================
     Responder
     ========================================================== */

  function responderA(post) {
    respondiendoA = post;
    el.respA.hidden = false;
    texto(el.respA, 'Respondiendo a @' + post.autor);
    el.respCancel.hidden = false;
    el.respKind.value = 'refutacion';
    el.respBody.focus();
  }

  function cancelarRespuesta() {
    respondiendoA = null;
    el.respA.hidden = true;
    el.respCancel.hidden = true;
    el.respKind.value = 'tesis';
  }

  el.respCancel.addEventListener('click', cancelarRespuesta);

  el.responder.addEventListener('submit', async function (e) {
    e.preventDefault();
    limpiarError(el.respErr);
    try {
      await api.crearIntervencion({
        topicId: temaActual.id,
        parentId: respondiendoA ? respondiendoA.id : null,
        kind: el.respKind.value,
        body: el.respBody.value,
        evidence: el.respEvidence.value
      });
      el.responder.reset();
      cancelarRespuesta();
      await pintarHilo();
      if (usuario) {
        var r = await api.reputacion(usuario.handle);
        texto(el.rep, r ? 'Reputación ' + r.reputation : 'Reputación 0');
      }
    } catch (err) {
      mostrarError(el.respErr, err.message);
    }
  });

  /* ==========================================================
     Arranque
     ========================================================== */

  (async function iniciar() {
    estado = await window.ECG.comprobar();
    api = window.ECG.api;

    if (estado.motor === 'supabase') {
      texto(el.motor, 'Base de datos conectada');
      el.aviso.hidden = true;
    } else {
      texto(el.motor, 'Modo local');
      el.aviso.hidden = false;

      if (estado.motivo === 'sin-tablas') {
        el.aviso.innerHTML =
          '<p><strong>Base de datos sin preparar.</strong> Las claves funcionan, pero las ' +
          'tablas todavia no existen: falta ejecutar docs/schema.sql en el SQL Editor de ' +
          'Supabase. Mientras tanto, el Agora funciona en este navegador y lo que escribas ' +
          'no lo ve nadie mas.</p>';
      } else if (estado.motivo === 'sin-conexion') {
        el.aviso.innerHTML =
          '<p><strong>Base de datos no disponible.</strong> El proyecto gratuito se pausa ' +
          'tras una semana sin uso; se despierta desde el panel de Supabase. Mientras ' +
          'tanto, el Agora funciona en este navegador.</p>';
      }
    }

    pintarModoAuth();
    await pintarSesion();
    await pintarTemas();
  })();
})();
