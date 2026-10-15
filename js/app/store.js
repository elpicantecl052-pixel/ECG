/* ECG — capa de datos del Ágora.
 *
 * Expone una sola interfaz (window.ECG.api) con dos motores detrás:
 *
 *   local     todo vive en este navegador. Sirve para probar la interfaz
 *             sin cuenta ni servidor. Nada se comparte entre personas.
 *   supabase  base de datos real, cuentas reales, contenido compartido.
 *
 * El motor se elige solo: si CONFIG tiene claves válidas, usa Supabase.
 * La interfaz es idéntica en ambos, así que la aplicación no sabe ni le
 * importa cuál está activo.
 */
(function () {
  'use strict';

  var CONFIG = {
    url: 'https://ggficdasuhtnzagvtknk.supabase.co',
    anonKey: 'sb_publishable_oRtwBE-Abqhtm5X5xP1OAQ_77hmpDWl'
  };

  var usandoSupabase =
    CONFIG.url.indexOf('http') === 0 &&
    CONFIG.anonKey !== 'PENDIENTE' &&
    typeof window.supabase !== 'undefined';

  /* ==========================================================
     Utilidades
     ========================================================== */

  function uid() {
    return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function ahora() {
    return new Date().toISOString();
  }

  var HANDLE = /^[a-z0-9_.]{3,20}$/;

  function validarHandle(handle) {
    if (!HANDLE.test(handle)) {
      throw new Error('El nombre de usuario debe tener entre 3 y 20 caracteres, en minúsculas, y solo letras, números, punto o guion bajo.');
    }
  }

  function validarTema(title) {
    var t = (title || '').trim();
    if (t.length < 10) throw new Error('El tema necesita al menos 10 caracteres.');
    if (t.length > 160) throw new Error('El tema no puede pasar de 160 caracteres.');
    return t;
  }

  function validarCuerpo(body) {
    var b = (body || '').trim();
    if (b.length < 10) throw new Error('La intervención necesita al menos 10 caracteres.');
    if (b.length > 1200) throw new Error('La intervención no puede pasar de 1200 caracteres.');
    return b;
  }

  function validarEvidencia(url) {
    var u = (url || '').trim();
    if (!u) return null;
    if (!/^https?:\/\//.test(u)) throw new Error('La evidencia debe ser un enlace que empiece por http:// o https://');
    return u;
  }

  /* ==========================================================
     Motor local
     ========================================================== */

  function MotorLocal() {
    var KEY = 'ecg-agora';
    var SESION = 'ecg-agora-sesion';

    function leer() {
      try {
        var raw = window.localStorage.getItem(KEY);
        var d = raw ? JSON.parse(raw) : null;
        if (!d || typeof d !== 'object') throw new Error('vacio');
        return d;
      } catch (e) {
        return { profiles: [], topics: [], posts: [], votes: [] };
      }
    }

    function guardar(d) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(d));
      } catch (e) {
        /* Sin almacenamiento, los datos duran lo que dure la pestaña. */
      }
    }

    function sesion(id) {
      try {
        if (id === undefined) return window.localStorage.getItem(SESION);
        if (id === null) window.localStorage.removeItem(SESION);
        else window.localStorage.setItem(SESION, id);
      } catch (e) { /* ignorado a propósito */ }
      return id;
    }

    function perfilPorId(d, id) {
      var i;
      for (i = 0; i < d.profiles.length; i++) if (d.profiles[i].id === id) return d.profiles[i];
      return null;
    }

    return {
      motor: 'local',

      async usuarioActual() {
        var id = sesion();
        if (!id) return null;
        var p = perfilPorId(leer(), id);
        return p ? { id: p.id, handle: p.handle } : null;
      },

      async registrar(handle) {
        validarHandle(handle);
        var d = leer();
        var existe = d.profiles.some(function (p) { return p.handle === handle; });
        if (existe) throw new Error('Ese nombre de usuario ya está ocupado.');

        var perfil = { id: uid(), handle: handle, created_at: ahora() };
        d.profiles.push(perfil);
        guardar(d);
        sesion(perfil.id);
        return { id: perfil.id, handle: perfil.handle };
      },

      async entrar(handle) {
        validarHandle(handle);
        var d = leer();
        var p = null;
        d.profiles.forEach(function (x) { if (x.handle === handle) p = x; });
        if (!p) throw new Error('No existe ese usuario en este navegador.');
        sesion(p.id);
        return { id: p.id, handle: p.handle };
      },

      async salir() {
        sesion(null);
      },

      async listarTemas() {
        var d = leer();
        return d.topics
          .slice()
          .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; })
          .map(function (t) {
            var autor = perfilPorId(d, t.author_id);
            var n = d.posts.filter(function (p) { return p.topic_id === t.id; }).length;
            return {
              id: t.id,
              title: t.title,
              created_at: t.created_at,
              autor: autor ? autor.handle : 'desconocido',
              intervenciones: n
            };
          });
      },

      async crearTema(title) {
        var u = await this.usuarioActual();
        if (!u) throw new Error('Necesitas iniciar sesión.');
        var t = validarTema(title);
        var d = leer();
        var tema = { id: uid(), author_id: u.id, title: t, created_at: ahora() };
        d.topics.push(tema);
        guardar(d);
        return tema.id;
      },

      async verTema(id) {
        var d = leer();
        var t = null;
        d.topics.forEach(function (x) { if (x.id === id) t = x; });
        if (!t) return null;
        var autor = perfilPorId(d, t.author_id);
        return { id: t.id, title: t.title, created_at: t.created_at, autor: autor ? autor.handle : 'desconocido' };
      },

      async listarIntervenciones(topicId) {
        var d = leer();
        var yo = sesion();
        return d.posts
          .filter(function (p) { return p.topic_id === topicId; })
          .sort(function (a, b) { return a.created_at > b.created_at ? 1 : -1; })
          .map(function (p) {
            var autor = perfilPorId(d, p.author_id);
            var votos = d.votes.filter(function (v) { return v.post_id === p.id; });
            return {
              id: p.id,
              parent_id: p.parent_id,
              kind: p.kind,
              body: p.body,
              evidence: p.evidence,
              created_at: p.created_at,
              autor: autor ? autor.handle : 'desconocido',
              autor_id: p.author_id,
              votos: votos.length,
              votado: votos.some(function (v) { return v.voter_id === yo; })
            };
          });
      },

      async crearIntervencion(datos) {
        var u = await this.usuarioActual();
        if (!u) throw new Error('Necesitas iniciar sesión.');
        var body = validarCuerpo(datos.body);
        var evidence = validarEvidencia(datos.evidence);
        var d = leer();
        var post = {
          id: uid(),
          topic_id: datos.topicId,
          author_id: u.id,
          parent_id: datos.parentId || null,
          kind: datos.kind,
          body: body,
          evidence: evidence,
          created_at: ahora()
        };
        d.posts.push(post);
        guardar(d);
        return post.id;
      },

      async votar(postId, activar) {
        var u = await this.usuarioActual();
        if (!u) throw new Error('Necesitas iniciar sesión.');
        var d = leer();
        d.votes = d.votes.filter(function (v) {
          return !(v.post_id === postId && v.voter_id === u.id);
        });
        if (activar) d.votes.push({ post_id: postId, voter_id: u.id, created_at: ahora() });
        guardar(d);
      },

      async reputacion(handle) {
        var d = leer();
        var p = null;
        d.profiles.forEach(function (x) { if (x.handle === handle) p = x; });
        if (!p) return null;
        var aportes = d.posts.filter(function (x) { return x.author_id === p.id; }).length;
        var mios = d.posts.filter(function (x) { return x.author_id === p.id; }).map(function (x) { return x.id; });
        var recibidos = d.votes.filter(function (v) { return mios.indexOf(v.post_id) >= 0; }).length;
        return { handle: p.handle, reputation: aportes + recibidos, contributions: aportes };
      },

      async borrarTodo() {
        try {
          window.localStorage.removeItem(KEY);
          window.localStorage.removeItem(SESION);
        } catch (e) { /* ignorado */ }
      }
    };
  }

  /* ==========================================================
     Motor Supabase
     ========================================================== */

  function MotorSupabase() {
    var sb = window.supabase.createClient(CONFIG.url, CONFIG.anonKey);

    function validarCorreo(email) {
      var e = (email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(e)) {
        throw new Error('Escribe un correo válido.');
      }
      return e;
    }

    async function perfil() {
      var ses = await sb.auth.getUser();
      var user = ses && ses.data ? ses.data.user : null;
      if (!user) return null;
      var r = await sb.from('profiles').select('id, handle').eq('id', user.id).single();
      if (r.error) return { id: user.id, handle: 'usuario' };
      return r.data;
    }

    function fallar(error) {
      if (!error) return;
      if (/duplicate key|already registered|User already/i.test(error.message)) {
        throw new Error('Ese nombre de usuario ya está ocupado.');
      }
      if (/Invalid login/i.test(error.message)) {
        throw new Error('Correo o contraseña incorrectos.');
      }
      if (/Email not confirmed/i.test(error.message)) {
        throw new Error('Tienes que confirmar tu correo antes de entrar.');
      }
      throw new Error(error.message);
    }

    return {
      motor: 'supabase',

      usuarioActual: perfil,

      async registrar(handle, password, email) {
        validarHandle(handle);
        var correo = validarCorreo(email);
        if (!password || password.length < 8) {
          throw new Error('La contraseña necesita al menos 8 caracteres.');
        }

        var libre = await sb.from('profiles').select('handle').eq('handle', handle);
        if (libre.data && libre.data.length) {
          throw new Error('Ese nombre de usuario ya está ocupado.');
        }

        var r = await sb.auth.signUp({
          email: correo,
          password: password,
          options: { data: { handle: handle } }
        });
        fallar(r.error);

        if (!r.data || !r.data.session) {
          throw new Error('Cuenta creada. Revisa tu correo y confirma la dirección para poder entrar.');
        }

        /* El disparador de la base de datos crea el perfil al registrarse,
           pero es opcional: si no está instalado, lo creamos aquí. La
           política de RLS solo permite insertar el perfil propio, así que
           esto es seguro. */
        var yo = r.data.user;
        if (yo) {
          var existe = await sb.from('profiles').select('id').eq('id', yo.id);
          if (!existe.data || !existe.data.length) {
            var ins = await sb.from('profiles').insert({ id: yo.id, handle: handle });
            if (ins.error && !/duplicate key/i.test(ins.error.message)) fallar(ins.error);
          }
        }

        return perfil();
      },

      async entrar(email, password) {
        var r = await sb.auth.signInWithPassword({
          email: validarCorreo(email),
          password: password || ''
        });
        fallar(r.error);
        return perfil();
      },

      async salir() {
        await sb.auth.signOut();
      },

      async listarTemas() {
        var r = await sb
          .from('topics')
          .select('id, title, created_at, profiles(handle), posts(count)')
          .order('created_at', { ascending: false })
          .limit(50);
        fallar(r.error);
        return (r.data || []).map(function (t) {
          return {
            id: t.id,
            title: t.title,
            created_at: t.created_at,
            autor: t.profiles ? t.profiles.handle : 'desconocido',
            intervenciones: t.posts && t.posts[0] ? t.posts[0].count : 0
          };
        });
      },

      async crearTema(title) {
        var u = await perfil();
        if (!u) throw new Error('Necesitas iniciar sesión.');
        var t = validarTema(title);
        var r = await sb.from('topics').insert({ author_id: u.id, title: t }).select('id').single();
        fallar(r.error);
        return r.data.id;
      },

      async verTema(id) {
        var r = await sb.from('topics').select('id, title, created_at, profiles(handle)').eq('id', id).single();
        if (r.error) return null;
        return {
          id: r.data.id,
          title: r.data.title,
          created_at: r.data.created_at,
          autor: r.data.profiles ? r.data.profiles.handle : 'desconocido'
        };
      },

      async listarIntervenciones(topicId) {
        var u = await perfil();
        var r = await sb
          .from('posts')
          .select('id, parent_id, kind, body, evidence, created_at, author_id, profiles(handle), votes(voter_id)')
          .eq('topic_id', topicId)
          .order('created_at', { ascending: true });
        fallar(r.error);
        return (r.data || []).map(function (p) {
          var votos = p.votes || [];
          return {
            id: p.id,
            parent_id: p.parent_id,
            kind: p.kind,
            body: p.body,
            evidence: p.evidence,
            created_at: p.created_at,
            autor: p.profiles ? p.profiles.handle : 'desconocido',
            autor_id: p.author_id,
            votos: votos.length,
            votado: !!(u && votos.some(function (v) { return v.voter_id === u.id; }))
          };
        });
      },

      async crearIntervencion(datos) {
        var u = await perfil();
        if (!u) throw new Error('Necesitas iniciar sesión.');
        var r = await sb.from('posts').insert({
          topic_id: datos.topicId,
          author_id: u.id,
          parent_id: datos.parentId || null,
          kind: datos.kind,
          body: validarCuerpo(datos.body),
          evidence: validarEvidencia(datos.evidence)
        }).select('id').single();
        fallar(r.error);
        return r.data.id;
      },

      async votar(postId, activar) {
        var u = await perfil();
        if (!u) throw new Error('Necesitas iniciar sesión.');
        if (activar) {
          var i = await sb.from('votes').insert({ post_id: postId, voter_id: u.id });
          if (i.error && !/duplicate key/i.test(i.error.message)) fallar(i.error);
        } else {
          var d = await sb.from('votes').delete().eq('post_id', postId).eq('voter_id', u.id);
          fallar(d.error);
        }
      },

      async reputacion(handle) {
        var r = await sb.from('reputations').select('handle, reputation, contributions').eq('handle', handle).single();
        if (r.error) return null;
        return r.data;
      },

      async borrarTodo() {
        throw new Error('Con base de datos real, el borrado se hace desde el panel de Supabase.');
      }
    };
  }

  window.ECG = window.ECG || {};
  window.ECG.config = CONFIG;
  window.ECG.api = usandoSupabase ? MotorSupabase() : MotorLocal();

  /* Comprueba que la base de datos responde antes de confiar en ella.
     Si las tablas no existen todavia, o si el proyecto gratuito esta
     pausado por inactividad, la aplicacion cae al motor local en vez de
     quedarse rota. Devuelve el motivo para poder avisar al visitante. */
  window.ECG.comprobar = async function () {
    if (!usandoSupabase) return { motor: 'local', motivo: 'sin-claves' };

    try {
      await window.ECG.api.listarTemas();
      return { motor: 'supabase' };
    } catch (e) {
      var msg = String((e && e.message) || e);
      var motivo = /schema cache|does not exist/i.test(msg)
        ? 'sin-tablas'
        : 'sin-conexion';
      window.ECG.api = MotorLocal();
      return { motor: 'local', motivo: motivo, detalle: msg };
    }
  };
})();
