# Tour virtual 360° · Sala SEM2

Sitio estático (HTML + CSS + JavaScript, sin compilar) para recorrer la Sala SEM2 desde el celular o el computador.
Feria de las Ciencias · Liceo Bicentenario de Excelencia Polivalente San Nicolás.

- Visor: [Marzipano 0.10.2](https://www.marzipano.net) (Apache-2.0), incluido en `vendor/marzipano/` junto con su licencia.
- Escenas: 4 paradas (Entrada ↔ Mesas ↔ Pantalla ↔ Estaciones VR), imágenes en teselas multirresolución (cubo, 3 niveles + vista previa).
- Sin dependencias externas en tiempo de ejecución (ni CDN, ni fuentes web).

## Estructura

```
index.html            página única (portada, visor, paneles)
.nojekyll             evita que GitHub Pages procese el sitio con Jekyll
css/styles.css        estilos (variables de color al inicio)
js/config.js          TEXTOS, ESCENAS, FLECHAS y FICHAS  ← lo que normalmente se edita
js/app.js             lógica del visor
vendor/marzipano/     visor + licencia
assets/               emblema, portada, icono (y el QR cuando se genere)
tiles/<escena>/       teselas del panorama + tiles/miniaturas/
scripts/              preparar_imagenes.py, generar_qr.py, regiones_anonimizado.json
```

Todas las rutas son relativas: el sitio funciona igual en la raíz (`/`) o bajo `/tour-sem2/`.

## Vista previa local

```powershell
cd D:\SEM2\tour-sem2
python -m http.server 8085 --bind 127.0.0.1
# abrir http://127.0.0.1:8085/
```

Para probar bajo una subruta idéntica a GitHub Pages, sirva la carpeta **padre** (donde el proyecto se llame `tour-sem2`):

```powershell
cd D:\SEM2
python -m http.server 8086 --bind 127.0.0.1
# abrir http://127.0.0.1:8086/tour-sem2/
```

Atajos útiles en la URL: `#mesas` abre directo una escena (ids: `entrada`, `mesas`, `pantalla`, `vr`);
`#entrada&depurar` muestra el yaw/pitch del punto donde se hace clic (para ubicar flechas y fichas).

## Cómo cambiar cosas

**Textos** (bienvenida, subtítulo, descripciones, fichas): `js/config.js`.

**Posición de flechas y puntos de información**: en `js/config.js`, dentro de cada escena:

- `enlaces: [{ destino, yaw, pitch, etiqueta }]` → flechas violetas hacia otra escena (`llegada: {yaw, pitch}` opcional fija hacia dónde mira al llegar).
- `puntos: [{ ficha, yaw, pitch }]` → puntos cian «i»; `ficha` es una clave de `fichas`.
- `vistaInicial: { yaw, pitch, fov }` → encuadre al entrar y al pulsar «Centrar vista».

Ángulos en grados: `yaw` 0 = centro de la imagen, positivo a la derecha; `pitch` 0 = horizonte, positivo arriba.
Desde un píxel (x, y) de la panorámica equirectangular de ancho W y alto H: `yaw = (x/W − 0.5)·360`, `pitch = (0.5 − y/H)·180`.
Lo más cómodo es abrir `#escena&depurar`, hacer clic en el lugar deseado y copiar los números que aparecen abajo.

**Fotos / escenas**:

1. Copie las panorámicas equirectangulares 2:1 (JPG) a una carpeta **fuera del repositorio**.
2. Ajuste el diccionario `ESCENAS` de `scripts/preparar_imagenes.py` (id → archivo).
3. Genere las teselas:

   ```powershell
   pip install pillow numpy
   python scripts/preparar_imagenes.py --origen "D:\SEM2\IMAGENES_360\IMAGEN_INSTA_360" --sin-anonimizar
   ```

   (`--solo vr` procesa una sola escena. Sin `--sin-anonimizar` el script desenfoca a las personas según `scripts/regiones_anonimizado.json`.)
4. Agregue o edite la escena en `js/config.js` (id, `tiles: "tiles/<id>"`, `miniatura`, enlaces, puntos).

Las teselas no llevan metadatos (EXIF/GPS): se generan desde los píxeles.

### Imágenes usadas

| Escena | Original | Nota |
|---|---|---|
| Entrada y vista general | `IMG_20261120_120706_00_210.jpg` | `…_211.jpg` es una toma casi idéntica y quedó como alternativa. |
| Mesas de trabajo | `IMG_20261120_120823_00_212.jpg` | |
| Pantalla y biología | `IMG_20261120_120909_00_213.jpg` | |
| Estaciones VR | `IMG_20261120_121052_00_214.jpg` | |

Los originales miden 11968 × 5984 px (2:1 exacto), así que no hubo que remuestrear a 2048×1024; se usan reducidos a 8192×4096 como fuente de las teselas. Los originales (`.jpg` y `.insp`) **no** están en el repositorio ni en el ZIP.

## Privacidad de las imágenes

En las panorámicas se ven estudiantes y docentes. La versión incluida **muestra a las personas** porque el liceo informó que cuenta con la autorización de las familias para publicarlas. Se recomienda guardar ese respaldo por escrito según el procedimiento del liceo. Si en algún momento se debe retirar o limitar la exposición, regenere las teselas sin `--sin-anonimizar` (desenfoca a las personas) y vuelva a publicar; recuerde que los navegadores y GitHub Pages guardan caché unos minutos.

Las pantallas visibles muestran material escolar (lámina de fotosíntesis, visualizaciones 3D) y el logo de la sala; no se identificaron datos personales en ellas.

## Publicar en GitHub Pages (cuenta de Belén)

1. Crear en la cuenta de Belén un repositorio **público** llamado `tour-sem2` (o el nombre acordado).
2. Subir el contenido de esta carpeta (o descomprimir `tour-sem2.zip`) a la raíz de `main`, con `index.html` y `.nojekyll` en la raíz:

   ```powershell
   cd D:\SEM2\tour-sem2
   git init -b main
   git add .
   git commit -m "Tour virtual 360° Sala SEM2"
   git remote add origin https://github.com/USUARIO_GITHUB_BELEN/tour-sem2.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
4. Confirmar la URL definitiva en esa misma pantalla (normalmente `https://USUARIO_GITHUB_BELEN.github.io/tour-sem2/`) y abrirla **sin iniciar sesión** (ventana privada).

Peso total: ~11 MB (≈ 500 archivos), muy por debajo de los límites de GitHub Pages.

## Código QR

Con la URL definitiva ya activa:

```powershell
pip install "qrcode[pil]"
python scripts/generar_qr.py --url "https://USUARIO_GITHUB_BELEN.github.io/tour-sem2/"
```

Crea `assets/qr-tour-sem2.png` (alta resolución, 300 dpi) y `assets/qr-tour-sem2.svg` (vectorial) con el texto «Escanea para recorrer la Sala SEM2» y la URL legible. QR estático, módulos oscuros sobre fondo blanco, margen de 4 módulos, sin logo encima. Luego, en `js/config.js`, complete `urlPublica` y `qr: "assets/qr-tour-sem2.png"` para que «Compartir» muestre el QR, y vuelva a subir los cambios. Verifique siempre con un celular real que el QR abre exactamente esa URL.

## Accesibilidad

Teclado: flechas giran, `+`/`−` zoom, `Inicio` centra, `Re Pág`/`Av Pág` cambian de escena, `Tab` recorre botones y puntos, `Esc` cierra paneles y devuelve el foco. La cámara arranca quieta, se respeta `prefers-reduced-motion` y, si WebGL o las imágenes fallan, se muestra una lista estática de escenas con sus descripciones (también disponible desde la portada).

## Pendientes de validar por el equipo docente

- Descripciones de las fichas (en especial «Plataformas KAT VR» y «Modelos impresos en 3D»): el borrador solo menciona estaciones de realidad virtual, computadores e impresiones 3D. No se nombra ninguna pieza concreta de los modelos porque su identidad no es clara en las fotos.
- URL pública definitiva y escaneo del QR con un celular.
- Logo: se usó la imagen de portada entregada (recortada en forma de escudo); el PNG original `image(20261120-163507).png` no estaba en disco.
