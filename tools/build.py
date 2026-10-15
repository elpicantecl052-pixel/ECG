# -*- coding: utf-8 -*-
"""Genera las paginas del sitio a partir de _body.html.

No es un build step para el visitante: la salida son archivos estaticos
corrientes. Es una herramienta para no mantener a mano varias copias del
mismo contenido.

    python tools/build.py          genera con la version actual
    python tools/build.py --bump   sube la version de cache y genera
"""

import io
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITIO = "https://elpicantecl052-pixel.github.io/ECG"

# Codigo de GoatCounter. Mientras valga PENDIENTE, no se inserta nada.
GOATCOUNTER = "PENDIENTE"

VERSION_FILE = os.path.join(RAIZ, "tools", "version.txt")


def leer(nombre):
    with io.open(os.path.join(RAIZ, nombre), encoding="utf-8") as f:
        return f.read()


def escribir(nombre, texto):
    with io.open(os.path.join(RAIZ, nombre), "w", encoding="utf-8") as f:
        f.write(texto)
    print("  escrito  %s" % nombre)


def version(bump=False):
    v = 1
    if os.path.exists(VERSION_FILE):
        with io.open(VERSION_FILE, encoding="utf-8") as f:
            try:
                v = int(f.read().strip())
            except ValueError:
                v = 1
    if bump:
        v += 1
        with io.open(VERSION_FILE, "w", encoding="utf-8") as f:
            f.write(str(v))
    return str(v)


def analitica():
    """Fragmento de GoatCounter: sin cookies y sin banner de consentimiento."""
    if GOATCOUNTER == "PENDIENTE":
        return (
            "<!-- Analiticas pendientes: crea un sitio gratuito en goatcounter.com\n"
            "     y pon tu codigo en GOATCOUNTER, dentro de tools/build.py. -->\n"
        )
    return (
        '<script data-goatcounter="https://%s.goatcounter.com/count"\n'
        '        async src="//gc.zgo.at/count.js"></script>\n' % GOATCOUNTER
    )


def cabeza(v):
    return u"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ECG</title>
<meta name="description" content="ECG, Enriquez Chat Group: una plataforma social global donde cualquiera puede expresarse, crear, competir, debatir, emprender y generar ingresos. Debate, competencia y economia en un solo ecosistema.">
<meta name="theme-color" content="#0A0A0B" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#FBFBF9" media="(prefers-color-scheme: light)">
<link rel="canonical" href="{sitio}/">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ECG">
<meta property="og:locale" content="es_ES">
<meta property="og:url" content="{sitio}/">
<meta property="og:title" content="ECG — Enriquez Chat Group">
<meta property="og:description" content="Una plataforma social global construida sobre la libertad de expresion, la competencia justa, el conocimiento y las oportunidades economicas.">
<meta property="og:image" content="{sitio}/assets/og-image.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="ECG — Compite con tus ideas. Destaca con tu talento. Crece con tus resultados.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="ECG — Enriquez Chat Group">
<meta name="twitter:description" content="Debate, competencia y economia en un solo ecosistema. Lista de espera abierta.">
<meta name="twitter:image" content="{sitio}/assets/og-image.png">
<meta name="twitter:image:alt" content="ECG — Compite con tus ideas. Destaca con tu talento. Crece con tus resultados.">
<link rel="stylesheet" href="css/reset.css?v={v}">
<link rel="stylesheet" href="css/styles.css?v={v}">
{analitica}</head>
<body>
""".format(sitio=SITIO, v=v, analitica=analitica())


def main():
    bump = "--bump" in sys.argv
    v = version(bump)
    print("Generando con v=%s" % v)

    cuerpo = leer("_body.html")
    scripts = (
        u'\n<script src="js/main.js?v=%s"></script>'
        u'\n<script src="js/interactive.js?v=%s"></script>\n' % (v, v)
    )

    # Sitio publico
    escribir("index.html", cabeza(v) + cuerpo + scripts + u"</body>\n</html>\n")

    # Version para publicar como Artifact: sin <head> propio y sin analiticas,
    # que el entorno del Artifact bloquea de todos modos.
    artifact = (
        u'<title>ECG</title>\n'
        u'<link rel="stylesheet" href="css/reset.css?v=%s">\n'
        u'<link rel="stylesheet" href="css/styles.css?v=%s">\n\n' % (v, v)
        + cuerpo
        + scripts
    )
    escribir("artifact.html", artifact)

    # La pagina legal comparte los mismos recursos
    legal = leer("legal.html")
    legal = re.sub(r"\?v=\d+", "?v=%s" % v, legal)
    escribir("legal.html", legal)

    print("Listo.")


if __name__ == "__main__":
    main()
