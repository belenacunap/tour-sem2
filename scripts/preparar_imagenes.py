#!/usr/bin/env python3
"""Convierte panoramicas equirectangulares en teselas multirresolucion para Marzipano.

Por cada escena:
  1. reduce el original a 8192 x 4096 (no se copia el EXIF: sin metadatos);
  2. anonimiza a las personas (desenfoque + pixelado) segun regiones_anonimizado.json;
  3. genera un cubo (caras de 2048 px), teselas de 512 px en 3 niveles y una tira de vista previa;
  4. guarda una miniatura.

Uso (desde la raiz del proyecto):
  python scripts/preparar_imagenes.py --origen "D:/SEM2/IMAGENES_360/IMAGEN_INSTA_360"

Los originales NO se copian al repositorio. Use --sin-anonimizar solo con imagenes
autorizadas para publicacion abierta.
"""
import argparse, json, math, os, shutil, sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

Image.MAX_IMAGE_PIXELS = None

# id de escena -> archivo de origen (ver README)
ESCENAS = {
    "entrada":  "IMG_20261120_120706_00_210.jpg",
    "mesas":    "IMG_20261120_120823_00_212.jpg",
    "pantalla": "IMG_20261120_120909_00_213.jpg",
    "vr":       "IMG_20261120_121052_00_214.jpg",
}
# Convencion de Marzipano: -z al frente, +x a la derecha, +y arriba. (centro, derecha, arriba)
FACES = {
    "f": ((0, 0, -1), (1, 0, 0), (0, 1, 0)),
    "b": ((0, 0, 1), (-1, 0, 0), (0, 1, 0)),
    "l": ((-1, 0, 0), (0, 0, -1), (0, 1, 0)),
    "r": ((1, 0, 0), (0, 0, 1), (0, 1, 0)),
    "u": ((0, 1, 0), (1, 0, 0), (0, 0, 1)),
    "d": ((0, -1, 0), (1, 0, 0), (0, 0, -1)),
}
ORDEN_PREVIEW = "bdflru"
CARA = 2048
TESELA = 512
NIVELES = [512, 1024, 2048]   # z = 1, 2, 3 (z = 0 es la vista previa de 256 px)
CALIDAD = 82


def anonimizar(img, cajas, ref_ancho):
    """Desenfoca y pixela cada caja con mascara suave."""
    esc = img.width / ref_ancho
    salida = img.copy()
    for (x0, y0, x1, y1) in cajas:
        x0, y0, x1, y1 = [int(v * esc) for v in (x0, y0, x1, y1)]
        if x1 <= x0 or y1 <= y0:
            continue
        m = int(max(x1 - x0, y1 - y0) * 0.08) + 4
        bx0, by0 = max(0, x0 - m), max(0, y0 - m)
        bx1, by1 = min(img.width, x1 + m), min(img.height, y1 + m)
        trozo = img.crop((bx0, by0, bx1, by1))
        bw, bh = trozo.size
        p = max(8, int(max(bw, bh) / 7))                  # ~7 bloques: no reconocible
        chico = trozo.resize((max(1, bw // p), max(1, bh // p)), Image.BILINEAR)
        borroso = chico.resize((bw, bh), Image.NEAREST).filter(ImageFilter.GaussianBlur(p * 0.6))
        mask = Image.new("L", (bw, bh), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            (m // 2, m // 2, bw - m // 2, bh - m // 2), radius=m * 2, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(m / 2.5))
        salida.paste(borroso, (bx0, by0), mask)
    return salida


def cara_cubo(eq, nombre, tam):
    """Muestrea una cara del cubo desde la imagen equirectangular (bilineal)."""
    c, r, u = (np.array(v, dtype=np.float64) for v in FACES[nombre])
    t = (np.arange(tam) + 0.5) / tam * 2 - 1
    uu, vv = np.meshgrid(t, -t)
    d = c[None, None, :] + uu[..., None] * r[None, None, :] + vv[..., None] * u[None, None, :]
    x, y, z = d[..., 0], d[..., 1], d[..., 2]
    yaw = np.arctan2(x, -z)
    pitch = np.arcsin(y / np.sqrt(x * x + y * y + z * z))
    H, W = eq.shape[:2]
    fx = (yaw / (2 * math.pi) + 0.5) * W - 0.5
    fy = (0.5 - pitch / math.pi) * H - 0.5
    x0 = np.floor(fx).astype(int)
    y0 = np.floor(fy).astype(int)
    ax = (fx - x0)[..., None]
    ay = (fy - y0)[..., None]
    x0w, x1w = x0 % W, (x0 + 1) % W
    y0c, y1c = np.clip(y0, 0, H - 1), np.clip(y0 + 1, 0, H - 1)
    p = (eq[y0c, x0w] * (1 - ax) * (1 - ay) + eq[y0c, x1w] * ax * (1 - ay)
         + eq[y1c, x0w] * (1 - ax) * ay + eq[y1c, x1w] * ax * ay)
    return Image.fromarray(np.clip(p + 0.5, 0, 255).astype(np.uint8))


def procesar(id_, archivo, args, regiones):
    ruta = os.path.join(args.origen, archivo)
    print(f"[{id_}] {archivo}", flush=True)
    img = Image.open(ruta).convert("RGB")
    if img.width != 2 * img.height:
        sys.exit(f"{archivo}: se esperaba proporcion 2:1 y mide {img.size}")
    img = img.resize((8192, 4096), Image.LANCZOS)
    if not args.sin_anonimizar:
        img = anonimizar(img, regiones[id_], regiones["ref_ancho"])
    salida = os.path.join(args.destino, id_)
    if os.path.isdir(salida):
        shutil.rmtree(salida)
    os.makedirs(salida)
    eq = np.asarray(img, dtype=np.float32)
    caras = {n: cara_cubo(eq, n, CARA) for n in FACES}
    for z, tam in enumerate(NIVELES, start=1):
        for n, cara in caras.items():
            c = cara if tam == CARA else cara.resize((tam, tam), Image.LANCZOS)
            filas = tam // TESELA
            for y in range(filas):
                os.makedirs(os.path.join(salida, str(z), n, str(y)), exist_ok=True)
                for x in range(filas):
                    c.crop((x * TESELA, y * TESELA, (x + 1) * TESELA, (y + 1) * TESELA)).save(
                        os.path.join(salida, str(z), n, str(y), f"{x}.jpg"),
                        quality=CALIDAD, optimize=True, progressive=True)
    tira = Image.new("RGB", (256, 256 * 6))
    for i, n in enumerate(ORDEN_PREVIEW):
        tira.paste(caras[n].resize((256, 256), Image.LANCZOS), (0, 256 * i))
    tira.save(os.path.join(salida, "preview.jpg"), quality=80, optimize=True)
    # Miniatura: recorte 16:9 del panorama, centrado en la vista inicial
    yaw = args.miniaturas.get(id_, 0.0)
    cx = int((yaw / 360 + 0.5) * img.width)
    w, h = 2800, 1575
    cy = int(img.height * 0.58)
    mini = img.crop((max(0, cx - w // 2), cy - h // 2, min(img.width, cx + w // 2), cy + h // 2))
    os.makedirs(os.path.join(args.destino, "miniaturas"), exist_ok=True)
    mini.resize((480, 270), Image.LANCZOS).save(
        os.path.join(args.destino, "miniaturas", f"{id_}.jpg"), quality=82, optimize=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument("--origen", required=True, help="Carpeta con las panoramicas originales (fuera del repositorio)")
    ap.add_argument("--destino", default=os.path.join(base, "tiles"))
    ap.add_argument("--regiones", default=os.path.join(base, "scripts", "regiones_anonimizado.json"))
    ap.add_argument("--sin-anonimizar", action="store_true", help="Solo con imagenes autorizadas para publicacion abierta")
    ap.add_argument("--solo", nargs="*", help="Procesar solo estas escenas")
    ap.add_argument("--miniatura-yaw", nargs="*", default=[], metavar="ID=GRADOS")
    args = ap.parse_args()
    args.miniaturas = {k: float(v) for k, v in (s.split("=") for s in args.miniatura_yaw)}
    with open(args.regiones, encoding="utf-8") as f:
        regiones = json.load(f)
    for id_, archivo in ESCENAS.items():
        if args.solo and id_ not in args.solo:
            continue
        procesar(id_, archivo, args, regiones)
    print("Listo. Revise visualmente las zonas anonimizadas antes de publicar.")


if __name__ == "__main__":
    main()
