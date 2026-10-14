/* ECG — tema, animaciones de entrada y lista de espera. Sin dependencias. */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     Configuración de la lista de espera

     Servicio actual: FormSubmit (formsubmit.co). No necesita cuenta.
     La primera vez que alguien envía el formulario, FormSubmit manda un
     correo de activación a la dirección de abajo; hasta que se pulse ese
     enlace, los envíos no se entregan.

     Para ocultar el correo del código fuente: una vez activado, FormSubmit
     da un identificador aleatorio en su panel. Sustituye la dirección por
     ese identificador y los rastreadores de spam dejan de verlo.

     Para cambiar de servicio, basta con cambiar esta constante:
       Formspree   https://formspree.io/f/TU_ID       (50 envíos/mes)
       Web3Forms   https://api.web3forms.com/submit   (250 envíos/mes, con access_key)
     Los tres aceptan JSON por POST y responden JSON.
     ---------------------------------------------------------- */

  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/elpicantecl052@gmail.com';
  var FORM_TIMEOUT = 12000;

  var root = document.documentElement;

  /* ----------------------------------------------------------
     Tema: preferencia del sistema + preferencia guardada
     ---------------------------------------------------------- */

  var STORE_KEY = 'ecg-theme';

  function readStored() {
    try {
      var v = window.localStorage.getItem(STORE_KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function writeStored(value) {
    try {
      window.localStorage.setItem(STORE_KEY, value);
    } catch (e) {
      /* modo privado o almacenamiento bloqueado: el tema solo dura la sesión */
    }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }

  function activeTheme() {
    var attr = root.getAttribute('data-theme');
    return attr === 'light' || attr === 'dark' ? attr : systemTheme();
  }

  var toggle = document.getElementById('theme-toggle');
  var toggleLabel = document.getElementById('theme-label');

  function syncToggle() {
    if (!toggle) return;
    var next = activeTheme() === 'dark' ? 'claro' : 'oscuro';
    var text = 'Tema ' + next;
    if (toggleLabel) toggleLabel.textContent = text;
    toggle.setAttribute('aria-label', 'Cambiar al tema ' + next);
    toggle.removeAttribute('aria-pressed');
  }

  var stored = readStored();
  if (stored) root.setAttribute('data-theme', stored);
  syncToggle();

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = activeTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      writeStored(next);
      syncToggle();
    });
  }

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onSystemChange = function () {
      if (!root.hasAttribute('data-theme')) syncToggle();
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  /* ----------------------------------------------------------
     Entrada al hacer scroll
     ---------------------------------------------------------- */

  var wantsMotion = !(
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  var targets = document.querySelectorAll('.reveal');

  if (wantsMotion && 'IntersectionObserver' in window && targets.length) {
    root.classList.add('js-anim');

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );

    Array.prototype.forEach.call(targets, function (el, i) {
      el.style.transitionDelay = Math.min(i % 6, 5) * 55 + 'ms';
      observer.observe(el);
    });

    /* El hero no espera: se muestra en el primer fotograma. */
    requestAnimationFrame(function () {
      var hero = document.querySelectorAll('.hero .reveal');
      Array.prototype.forEach.call(hero, function (el) {
        el.classList.add('is-in');
        observer.unobserve(el);
      });
    });
  }

  /* ----------------------------------------------------------
     Lista de espera (validación en el cliente, sin backend)
     ---------------------------------------------------------- */

  var form = document.getElementById('waitlist');
  var input = document.getElementById('email');
  var error = document.getElementById('email-err');
  var success = document.getElementById('wait-ok');
  var successBody = document.getElementById('wait-ok-body');

  /* Comprobación deliberadamente simple: nombre@dominio.tld, sin espacios. */
  var EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

  function showError(message) {
    if (!error || !input) return;
    error.textContent = message;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }

  function clearError() {
    if (!error || !input) return;
    error.hidden = true;
    error.textContent = '';
    input.removeAttribute('aria-invalid');
  }

  var submit = document.getElementById('wait-submit');
  var sending = false;

  function setSending(on) {
    sending = on;
    if (!submit) return;
    submit.disabled = on;
    submit.textContent = on ? 'Enviando…' : 'Reservar mi lugar';
    form.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function showSuccess(value) {
    if (successBody) {
      successBody.textContent =
        'Apuntamos ' + value + '. Te escribiremos a esa dirección cuando ECG abra el acceso.';
    }
    form.hidden = true;
    if (success) {
      success.hidden = false;
      success.setAttribute('tabindex', '-1');
      success.focus();
    }
  }

  /* Envía el correo al servicio configurado. Devuelve una promesa que
     rechaza si la red falla, si tarda demasiado o si el servicio responde
     con un error. */
  function send(value) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = window.setTimeout(function () {
      if (controller) controller.abort();
    }, FORM_TIMEOUT);

    var payload = {
      email: value,
      _subject: 'ECG — nueva alta en la lista de espera',
      _template: 'table',
      _captcha: 'false'
    };

    var trap = document.getElementById('empresa');
    if (trap) payload._honey = trap.value;

    var options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    };
    if (controller) options.signal = controller.signal;

    return fetch(FORM_ENDPOINT, options)
      .then(function (response) {
        window.clearTimeout(timer);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json().catch(function () {
          return {};
        });
      })
      .then(function (data) {
        /* FormSubmit responde {success:"true"}; Formspree y Web3Forms
           usan otras formas, así que solo tratamos como fallo lo que
           venga marcado explícitamente como error. */
        if (data && (data.success === false || data.success === 'false')) {
          throw new Error(data.message || 'Respuesta de error del servicio');
        }
        return data;
      })
      .catch(function (err) {
        window.clearTimeout(timer);
        throw err;
      });
  }

  if (form && input) {
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') clearError();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (sending) return;

      var value = input.value.trim();

      if (!value) {
        showError('Escribe tu correo para reservar el lugar.');
        return;
      }

      if (value.length > 254 || !EMAIL.test(value)) {
        showError('Ese correo no parece válido. Revisa que tenga el formato nombre@dominio.com.');
        return;
      }

      clearError();

      /* Si el navegador no tiene fetch, no perdemos el correo en silencio. */
      if (typeof window.fetch !== 'function') {
        showError('Tu navegador no permite enviar el formulario. Escríbenos por correo y te apuntamos a mano.');
        return;
      }

      setSending(true);

      send(value)
        .then(function () {
          setSending(false);
          showSuccess(value);
        })
        .catch(function (err) {
          setSending(false);
          var aborted = err && (err.name === 'AbortError' || /abort/i.test(String(err.message)));
          showError(
            aborted
              ? 'El envío tardó demasiado. Revisa tu conexión y vuelve a intentarlo.'
              : 'No pudimos guardar tu correo ahora mismo. Inténtalo de nuevo en un momento.'
          );
        });
    });
  }
})();
