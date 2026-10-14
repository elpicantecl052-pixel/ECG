/* ECG — tema, animaciones de entrada y lista de espera. Sin dependencias. */
(function () {
  'use strict';

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

  if (form && input) {
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') clearError();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

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

      if (successBody) {
        successBody.textContent =
          'Guardamos ' + value + ' en esta demostración. Cuando el formulario esté conectado, te avisaremos ahí del lanzamiento.';
      }

      form.hidden = true;
      if (success) {
        success.hidden = false;
        success.setAttribute('tabindex', '-1');
        success.focus();
      }
    });
  }
})();
