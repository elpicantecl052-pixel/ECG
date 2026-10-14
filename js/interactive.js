/* ECG — maqueta del producto, minijuegos y creador de encuestas.
   Todo se ejecuta en el navegador; nada se envía a ningún servidor. */
(function () {
  'use strict';

  /* ==========================================================
     Pestañas de la maqueta del producto
     ========================================================== */

  (function tabs() {
    var list = document.querySelector('.demo__tabs');
    if (!list) return;

    var buttons = Array.prototype.slice.call(list.querySelectorAll('.demo__tab'));
    var label = document.getElementById('screen-label');

    function select(btn, focus) {
      buttons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(b.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (label) label.textContent = btn.textContent.trim();
      if (focus) btn.focus();
    }

    buttons.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        select(btn, false);
      });

      btn.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = buttons[(i + 1) % buttons.length];
        else if (e.key === 'ArrowLeft') next = buttons[(i - 1 + buttons.length) % buttons.length];
        else if (e.key === 'Home') next = buttons[0];
        else if (e.key === 'End') next = buttons[buttons.length - 1];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });
  })();

  /* ==========================================================
     Juego 1 — ¿Argumento o ataque?
     ========================================================== */

  (function agora() {
    var phraseEl = document.getElementById('ag-phrase');
    if (!phraseEl) return;

    var FRASES = [
      {
        texto: 'Tu propuesta no se sostiene: los dos estudios que citas miden poblaciones distintas.',
        arg: true,
        nota: 'Ataca el razonamiento y dice exactamente dónde falla.'
      },
      {
        texto: 'Cualquiera con dos dedos de frente vería que esto es absurdo.',
        arg: false,
        nota: 'No rebate nada; solo sugiere que quien discrepa es tonto.'
      },
      {
        texto: 'Estoy en contra, y creo que el coste recaería sobre quien menos puede pagarlo.',
        arg: true,
        nota: 'Postura clara con una consecuencia concreta que se puede discutir.'
      },
      {
        texto: 'Vuelve cuando tengas edad para opinar de esto.',
        arg: false,
        nota: 'Descalifica a la persona por quién es, no por lo que dice.'
      },
      {
        texto: 'Eso ya se intentó en 2019 y se revirtió a los ocho meses. ¿Qué cambia ahora?',
        arg: true,
        nota: 'Aporta un precedente y devuelve una pregunta abierta.'
      },
      {
        texto: 'Das vergüenza ajena, deberías borrar tu cuenta.',
        arg: false,
        nota: 'Humillación directa y petición de que la otra persona se calle.'
      },
      {
        texto: 'Creo que confundes dos cosas distintas: una es el precio y otra el valor.',
        arg: true,
        nota: 'Señala un error concreto sin juzgar a quien lo comete.'
      },
      {
        texto: 'Siempre igual con los de tu tipo.',
        arg: false,
        nota: 'Mete a la persona en un grupo para no tener que responderle.'
      }
    ];

    var nEl = document.getElementById('ag-n');
    var totalEl = document.getElementById('ag-total');
    var fbEl = document.getElementById('ag-fb');
    var endEl = document.getElementById('ag-end');
    var scoreEl = document.getElementById('ag-score');
    var verdictEl = document.getElementById('ag-verdict');
    var play = document.querySelector('#game-agora .game__play');
    var btnArg = document.getElementById('ag-arg');
    var btnAtk = document.getElementById('ag-atk');
    var btnAgain = document.getElementById('ag-again');

    var orden = [];
    var i = 0;
    var aciertos = 0;
    var bloqueado = false;

    function barajar(n) {
      var a = [];
      var k;
      for (k = 0; k < n; k++) a.push(k);
      for (k = a.length - 1; k > 0; k--) {
        var j = Math.floor(Math.random() * (k + 1));
        var t = a[k]; a[k] = a[j]; a[j] = t;
      }
      return a;
    }

    function pintar() {
      var f = FRASES[orden[i]];
      phraseEl.textContent = f.texto;
      nEl.textContent = String(i + 1);
      fbEl.textContent = '';
      fbEl.className = 'game__fb';
      bloqueado = false;
    }

    function responder(dijoArgumento) {
      if (bloqueado) return;
      bloqueado = true;

      var f = FRASES[orden[i]];
      var bien = dijoArgumento === f.arg;
      if (bien) aciertos++;

      fbEl.className = 'game__fb ' + (bien ? 'game__fb--ok' : 'game__fb--no');
      fbEl.innerHTML =
        '<strong>' + (bien ? 'Correcto.' : 'En ECG no.') + '</strong> ' + f.nota;

      window.setTimeout(function () {
        i++;
        if (i < orden.length) pintar();
        else terminar();
      }, 1500);
    }

    function terminar() {
      play.hidden = true;
      endEl.hidden = false;
      scoreEl.textContent = String(aciertos);
      verdictEl.textContent =
        aciertos === 8
          ? 'Pleno. Distingues criticar una idea de atacar a quien la sostiene, que es justo la línea sobre la que se construye el Ágora.'
          : aciertos >= 6
            ? 'Buen criterio. Esa frontera es la que ECG convierte en norma, no en una recomendación.'
            : 'La frontera es más estrecha de lo que parece. Por eso en ECG es una regla explícita y no queda al criterio de cada día.';
    }

    function empezar() {
      orden = barajar(FRASES.length);
      i = 0;
      aciertos = 0;
      endEl.hidden = true;
      play.hidden = false;
      pintar();
    }

    totalEl.textContent = String(FRASES.length);
    btnArg.addEventListener('click', function () { responder(true); });
    btnAtk.addEventListener('click', function () { responder(false); });
    btnAgain.addEventListener('click', empezar);
    empezar();
  })();

  /* ==========================================================
     Juego 2 — Reto de precisión de la Arena
     ========================================================== */

  (function arena() {
    var field = document.getElementById('arena-field');
    if (!field) return;

    var target = document.getElementById('arena-target');
    var idle = document.getElementById('arena-idle');
    var nEl = document.getElementById('ar-n');
    var avgEl = document.getElementById('ar-avg');
    var endEl = document.getElementById('ar-end');
    var finalEl = document.getElementById('ar-final');
    var verdictEl = document.getElementById('ar-verdict');
    var play = document.querySelector('#game-arena .game__play');
    var btnStart = document.getElementById('ar-start');
    var btnAgain = document.getElementById('ar-again');

    var TOTAL = 10;
    var hechos = 0;
    var tiempos = [];
    var t0 = 0;
    var timer = null;

    function media() {
      if (!tiempos.length) return 0;
      var s = 0;
      tiempos.forEach(function (t) { s += t; });
      return Math.round(s / tiempos.length);
    }

    function colocar() {
      var w = field.clientWidth;
      var h = field.clientHeight;
      target.hidden = false;
      /* Se mide después de mostrarlo, para que el tamaño sea el real. */
      var tw = target.offsetWidth;
      var th = target.offsetHeight;
      target.style.left = Math.round(Math.random() * Math.max(0, w - tw)) + 'px';
      target.style.top = Math.round(Math.random() * Math.max(0, h - th)) + 'px';
      t0 = Date.now();
    }

    function siguiente() {
      target.hidden = true;
      timer = window.setTimeout(colocar, 350 + Math.random() * 900);
    }

    function tocar() {
      if (target.hidden) return;
      tiempos.push(Date.now() - t0);
      hechos++;
      nEl.textContent = String(hechos);
      avgEl.textContent = media() + ' ms';

      if (hechos >= TOTAL) terminar();
      else siguiente();
    }

    function terminar() {
      target.hidden = true;
      play.hidden = true;
      endEl.hidden = false;
      var m = media();
      finalEl.textContent = String(m);
      verdictEl.textContent =
        m < 400
          ? 'Reflejos de primera fila. En la Arena, un resultado así te pone arriba sin que nadie mire cuántos te siguen.'
          : m < 650
            ? 'Buen tiempo. Lo que cuenta en la Arena es exactamente esto: lo que entregas, medido igual para todos.'
            : 'Ritmo tranquilo. Da igual: en la Arena siempre hay otro desafío, y empezar de nuevo no te penaliza.';
    }

    function empezar() {
      window.clearTimeout(timer);
      hechos = 0;
      tiempos = [];
      nEl.textContent = '0';
      avgEl.textContent = '—';
      endEl.hidden = true;
      play.hidden = false;
      idle.hidden = true;
      siguiente();
    }

    target.addEventListener('click', tocar);
    btnStart.addEventListener('click', empezar);
    btnAgain.addEventListener('click', empezar);
  })();

  /* ==========================================================
     Creador de encuestas y retos (solo en este navegador)
     ========================================================== */

  (function lab() {
    var form = document.getElementById('lab-form');
    if (!form) return;

    var KEY = 'ecg-lab';
    var MAX_OPTS = 4;

    var qEl = document.getElementById('lab-q');
    var optsEl = document.getElementById('lab-opts');
    var addBtn = document.getElementById('lab-add');
    var errEl = document.getElementById('lab-err');
    var listEl = document.getElementById('lab-list');
    var emptyEl = document.getElementById('lab-empty');
    var hintEl = document.getElementById('lab-hint');

    function tipo() {
      var sel = form.querySelector('input[name="tipo"]:checked');
      return sel ? sel.value : 'encuesta';
    }

    function leer() {
      try {
        var raw = window.localStorage.getItem(KEY);
        var data = raw ? JSON.parse(raw) : [];
        return Object.prototype.toString.call(data) === '[object Array]' ? data : [];
      } catch (e) {
        return [];
      }
    }

    function guardar(data) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(data));
      } catch (e) {
        /* Sin almacenamiento, lo creado dura lo que dure la página. */
      }
    }

    var items = leer();

    /* --- Formulario --- */

    function filas() {
      return Array.prototype.slice.call(optsEl.querySelectorAll('.lab__row'));
    }

    function sincronizarTipo() {
      var esReto = tipo() === 'reto';
      filas().forEach(function (row) {
        row.querySelector('.lab__correct').hidden = !esReto;
      });
      hintEl.textContent = esReto
        ? 'Marca con ✓ la respuesta correcta. Puedes añadir hasta 4 opciones.'
        : 'Puedes añadir hasta 4 opciones.';
    }

    function marcarCorrecta(btn) {
      filas().forEach(function (row) {
        var b = row.querySelector('.lab__correct');
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
    }

    function conectarFila(row) {
      var btn = row.querySelector('.lab__correct');
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () { marcarCorrecta(btn); });
    }

    filas().forEach(conectarFila);

    addBtn.addEventListener('click', function () {
      var n = filas().length;
      if (n >= MAX_OPTS) return;

      var row = document.createElement('div');
      row.className = 'lab__row';
      row.innerHTML =
        '<input class="wait__in" type="text" maxlength="60" placeholder="Opción ' + (n + 1) + '">' +
        '<button class="lab__correct" type="button" aria-label="Marcar como respuesta correcta">✓</button>';
      optsEl.appendChild(row);
      conectarFila(row);
      sincronizarTipo();
      row.querySelector('input').focus();

      if (filas().length >= MAX_OPTS) addBtn.disabled = true;
    });

    Array.prototype.forEach.call(form.querySelectorAll('input[name="tipo"]'), function (r) {
      r.addEventListener('change', sincronizarTipo);
    });

    sincronizarTipo();

    /* --- Pintar lo creado --- */

    function pct(item, idx) {
      var total = 0;
      item.votos.forEach(function (v) { total += v; });
      if (!total) return 0;
      return Math.round((item.votos[idx] / total) * 100);
    }

    function totalVotos(item) {
      var t = 0;
      item.votos.forEach(function (v) { t += v; });
      return t;
    }

    function pintar() {
      listEl.innerHTML = '';
      emptyEl.hidden = items.length > 0;

      items.forEach(function (item) {
        var card = document.createElement('article');
        card.className = 'card';

        var kind = document.createElement('p');
        kind.className = 'card__kind';
        kind.textContent = item.tipo === 'reto' ? 'Reto' : 'Encuesta';
        card.appendChild(kind);

        var q = document.createElement('p');
        q.className = 'card__q';
        q.textContent = item.pregunta;
        card.appendChild(q);

        var opts = document.createElement('div');
        opts.className = 'card__opts';

        item.opciones.forEach(function (texto, idx) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'card__vote';

          var respondido = item.votado !== null && item.votado !== undefined;
          if (respondido && item.tipo === 'reto' && item.correcta === idx) {
            b.className += ' card__vote--right';
          }

          var fill = document.createElement('span');
          fill.className = 'card__fill';
          fill.style.width = respondido ? pct(item, idx) + '%' : '0%';
          b.appendChild(fill);

          var label = document.createElement('span');
          label.textContent = texto;
          b.appendChild(label);

          if (respondido) {
            var p = document.createElement('span');
            p.className = 'card__pct';
            p.textContent = pct(item, idx) + '%';
            b.appendChild(p);
          }

          b.addEventListener('click', function () {
            if (item.votado !== null && item.votado !== undefined) return;
            item.votos[idx]++;
            item.votado = idx;
            guardar(items);
            pintar();
          });

          opts.appendChild(b);
        });

        card.appendChild(opts);

        var foot = document.createElement('div');
        foot.className = 'card__foot';

        var info = document.createElement('span');
        var n = totalVotos(item);
        if (item.tipo === 'reto' && (item.votado !== null && item.votado !== undefined)) {
          info.textContent = item.votado === item.correcta ? 'Acertaste' : 'Fallaste';
        } else {
          info.textContent = n === 1 ? '1 voto' : n + ' votos';
        }
        foot.appendChild(info);

        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'card__del';
        del.textContent = 'Borrar';
        del.addEventListener('click', function () {
          items = items.filter(function (x) { return x.id !== item.id; });
          guardar(items);
          pintar();
        });
        foot.appendChild(del);

        card.appendChild(foot);
        listEl.appendChild(card);
      });
    }

    /* --- Publicar --- */

    function error(msg) {
      errEl.textContent = msg;
      errEl.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errEl.hidden = true;

      var pregunta = qEl.value.trim();
      if (!pregunta) {
        error('Escribe la pregunta.');
        qEl.focus();
        return;
      }

      var opciones = [];
      var correcta = -1;

      filas().forEach(function (row, idx) {
        var v = row.querySelector('input').value.trim();
        if (!v) return;
        if (row.querySelector('.lab__correct').getAttribute('aria-pressed') === 'true') {
          correcta = opciones.length;
        }
        opciones.push(v);
        void idx;
      });

      if (opciones.length < 2) {
        error('Hacen falta al menos dos opciones con texto.');
        return;
      }

      if (tipo() === 'reto' && correcta < 0) {
        error('Marca con ✓ cuál es la respuesta correcta.');
        return;
      }

      items.unshift({
        id: String(Date.now()),
        tipo: tipo(),
        pregunta: pregunta,
        opciones: opciones,
        correcta: correcta,
        votos: opciones.map(function () { return 0; }),
        votado: null
      });

      guardar(items);
      pintar();

      form.reset();
      filas().forEach(function (row, idx) {
        if (idx > 1) row.parentNode.removeChild(row);
        else {
          row.querySelector('input').value = '';
          row.querySelector('.lab__correct').setAttribute('aria-pressed', 'false');
        }
      });
      addBtn.disabled = false;
      sincronizarTipo();
      qEl.focus();
    });

    pintar();
  })();
})();
