#!/usr/bin/env python3
"""Genera el QR estático del tour (PNG de alta resolución + SVG vectorial para impresión).

Uso:
  pip install "qrcode[pil]"
  python scripts/generar_qr.py --url "https://USUARIO.github.io/tour-sem2/"

El QR codifica la URL HTTPS directamente (sin acortadores ni redirecciones), con módulos
oscuros sobre fondo blanco y margen (zona silenciosa) de 4 módulos. El logo queda fuera del código.
Salida: qr-tour-sem2.png y qr-tour-sem2.svg en la carpeta --salida (por defecto, assets/).
"""
import argparse, os, sys
from xml.sax.saxutils import escape

try:
    import qrcode
    from qrcode.constants import ERROR_CORRECT_M
except ImportError:
    sys.exit('Falta la librería: pip install "qrcode[pil]"')
from PIL import Image, ImageDraw, ImageFont

TEXTO = "Escanea para recorrer la Sala SEM2"
OSCURO = "#0a0e2a"
BORDE = 4            # módulos de zona silenciosa
PX_MODULO = 40       # tamaño de cada módulo en el PNG


def matriz(url):
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, border=0, box_size=1)
    qr.add_data(url)
    qr.make(fit=True)
    return qr.get_matrix()


def fuente(tam, negrita=False):
    candidatas = ["arialbd.ttf" if negrita else "arial.ttf", "segoeuib.ttf" if negrita else "segoeui.ttf",
                  "DejaVuSans-Bold.ttf" if negrita else "DejaVuSans.ttf"]
    for c in candidatas:
        try:
            return ImageFont.truetype(c, tam)
        except OSError:
            continue
    return ImageFont.load_default()


def ajustar(draw, texto, ancho_max, tam, negrita=False):
    f = fuente(tam, negrita)
    while draw.textlength(texto, font=f) > ancho_max and tam > 12:
        tam -= 2
        f = fuente(tam, negrita)
    return f


def hacer_png(url, ruta):
    m = matriz(url)
    n = len(m)
    lado = (n + 2 * BORDE) * PX_MODULO
    margen = 140
    ancho = lado + 2 * margen
    alto_titulo, alto_url = 260, 220
    alto = margen + alto_titulo + lado + alto_url + margen // 2
    img = Image.new("RGB", (ancho, alto), "white")
    d = ImageDraw.Draw(img)
    f_t = ajustar(d, TEXTO, ancho - 2 * margen, 120, True)
    d.text((ancho / 2, margen + alto_titulo / 2), TEXTO, font=f_t, fill=OSCURO, anchor="mm")
    x0, y0 = margen + BORDE * PX_MODULO, margen + alto_titulo + BORDE * PX_MODULO
    for j, fila in enumerate(m):
        for i, v in enumerate(fila):
            if v:
                d.rectangle((x0 + i * PX_MODULO, y0 + j * PX_MODULO,
                             x0 + (i + 1) * PX_MODULO - 1, y0 + (j + 1) * PX_MODULO - 1), fill="black")
    f_u = ajustar(d, url, ancho - 2 * margen, 80)
    d.text((ancho / 2, margen + alto_titulo + lado + alto_url / 2), url, font=f_u, fill=OSCURO, anchor="mm")
    img.save(ruta, optimize=True, dpi=(300, 300))
    return n


def hacer_svg(url, ruta):
    m = matriz(url)
    n = len(m)
    mod = 10
    lado = (n + 2 * BORDE) * mod
    margen = 40
    ancho = lado + 2 * margen
    t_h, u_h = 70, 60
    alto = margen + t_h + lado + u_h + margen // 2
    rects = []
    for j, fila in enumerate(m):
        i = 0
        while i < n:                                   # une módulos contiguos de la misma fila
            if fila[i]:
                k = i
                while k < n and fila[k]:
                    k += 1
                rects.append(f"M{(BORDE + i) * mod + margen},{(BORDE + j) * mod + margen + t_h}h{(k - i) * mod}v{mod}h-{(k - i) * mod}z")
                i = k
            else:
                i += 1
    tam_url = max(12, min(26, int((ancho - 2 * margen) / max(len(url), 1) * 1.7)))
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" width="{ancho}" height="{alto}" role="img" '
        f'aria-label="Código QR: {escape(TEXTO)}">\n'
        f'<rect width="100%" height="100%" fill="#ffffff"/>\n'
        f'<text x="{ancho / 2}" y="{margen + t_h / 2 + 12}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" '
        f'font-weight="700" font-size="34" fill="{OSCURO}">{escape(TEXTO)}</text>\n'
        f'<path d="{"".join(rects)}" fill="#000000" shape-rendering="crispEdges"/>\n'
        f'<text x="{ancho / 2}" y="{margen + t_h + lado + u_h / 2 + 8}" text-anchor="middle" '
        f'font-family="Arial, Helvetica, sans-serif" font-size="{tam_url}" fill="{OSCURO}">{escape(url)}</text>\n'
        f'</svg>\n'
    )
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(svg)


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--url", required=True, help="URL pública definitiva, por ejemplo https://USUARIO.github.io/tour-sem2/")
    ap.add_argument("--salida", default=os.path.join(base, "assets"))
    ap.add_argument("--permitir-local", action="store_true", help="Solo para pruebas: acepta URLs que no sean HTTPS")
    a = ap.parse_args()
    if not a.url.startswith("https://") and not a.permitir_local:
        sys.exit("La URL debe ser HTTPS (la de GitHub Pages). Para pruebas use --permitir-local.")
    os.makedirs(a.salida, exist_ok=True)
    n = hacer_png(a.url, os.path.join(a.salida, "qr-tour-sem2.png"))
    hacer_svg(a.url, os.path.join(a.salida, "qr-tour-sem2.svg"))
    print(f"QR de {n}x{n} módulos para {a.url}\n -> {a.salida}\\qr-tour-sem2.png / .svg")
    print('Después, en js/config.js: qr: "assets/qr-tour-sem2.png" y urlPublica con la misma URL.')


if __name__ == "__main__":
    main()
