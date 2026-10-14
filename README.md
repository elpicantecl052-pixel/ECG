# ECG — landing page

Landing estática para presentar el proyecto ECG. HTML + CSS + JavaScript puro,
sin frameworks, sin build step y sin dependencias externas.

## Verla en local

Desde esta carpeta:

```bash
python -m http.server 8000
```

Y abre <http://localhost:8000>.

Alternativas si no tienes Python: `npx serve .` o `php -S localhost:8000`.

## Estructura

```
ecg/
├── index.html        Página completa (versión autónoma, para hosting normal)
├── artifact.html     Misma página sin <head> propio, para publicar como Artifact
├── _body.html        Fragmento compartido por las dos versiones (fuente única)
├── css/
│   ├── reset.css
│   └── styles.css    Tokens, layout, componentes, breakpoints
├── js/
│   └── main.js       Tema, IntersectionObserver, validación del formulario
├── assets/
│   ├── favicon.svg
│   ├── og-image.svg  Fuente editable de la imagen Open Graph
│   └── og-image.png  1200×630, la que leen WhatsApp, X y LinkedIn
└── robots.txt
```

`index.html` y `artifact.html` se generan a partir de `_body.html`. Si editas el
contenido, hazlo en `_body.html` y vuelve a generarlos; si editas directamente
`index.html`, recuerda replicar el cambio.

## El dominio

Antes de publicar, sustituye el marcador `PENDIENTE-DOMINIO.example` (está en el
`canonical`, en `og:url`, en `og:image`, en `twitter:image` y en `robots.txt`):

```bash
sed -i "s|https://PENDIENTE-DOMINIO.example|https://TU-DOMINIO.com|g" index.html robots.txt
```

Sin esto, al compartir el enlace no se ve la previsualización, porque Open Graph
exige URLs absolutas.

## Regenerar la imagen Open Graph

`assets/og-image.png` se genera a partir de `assets/og-image.svg` renderizándolo
en un navegador a 1200×630 y reduciéndolo después a paleta de 256 colores
(319 KB → 78 KB, sin pérdida visible). Si editas el SVG, hay que regenerar el PNG;
cualquier exportador que respete el tamaño sirve.

## Publicar

- **Netlify Drop** — arrastra esta carpeta a <https://app.netlify.com/drop>.
- **GitHub Pages** — sube la carpeta a un repo y activa Pages sobre la rama
  principal. No hace falta `.nojekyll` porque no hay archivos que empiecen por `_`
  que deban servirse (`_body.html` es solo fuente de trabajo).
- **Cloudflare Tunnel** — con el servidor local corriendo:
  `cloudflared tunnel --url http://localhost:8000`.

## Decisiones técnicas

- **Tema**: oscuro por defecto. El claro se aplica con `prefers-color-scheme` y
  el botón de la cabecera lo fuerza en cualquier dirección, guardando la elección
  en `localStorage` dentro de un `try/catch`.
- **Animaciones**: la clase `js-anim` la añade el JS solo si el navegador no pide
  `prefers-reduced-motion: reduce`. Sin JavaScript, todo el contenido es visible.
- **Sin imágenes de mapa de bits**: todos los gráficos son SVG inline, gradientes
  y CSS.
- **Accesibilidad**: enlace de salto, HTML semántico, foco visible, `aria-describedby`
  en el formulario, errores anunciados y el diagrama SVG con `title` y `desc`.

## Pendiente

Ver la lista en la conversación. En resumen: dominio real, imagen Open Graph en
PNG, correo de contacto, redes sociales, aviso legal y backend del formulario.
Todos los puntos marcados en el código con `PENDIENTE` o `[PENDIENTE: ...]`.
