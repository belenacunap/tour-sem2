/*
 * CONFIGURACIÓN DEL TOUR — edite este archivo para cambiar textos, escenas, flechas y fichas.
 *
 * Ángulos en GRADOS:
 *   yaw   = giro horizontal. 0 = centro de la imagen equirectangular; positivo = hacia la derecha (-180 a 180).
 *   pitch = giro vertical. 0 = horizonte; positivo = arriba, negativo = abajo (-90 a 90).
 *   fov   = campo visual horizontal inicial (en pantallas angostas el visor lo ajusta solo).
 * Conversión desde un píxel (x, y) de la imagen equirectangular de ancho W y alto H:
 *   yaw = (x / W - 0.5) * 360        pitch = (0.5 - y / H) * 180
 * Para ubicar un punto con el visor abierto, agregue  #depurar  a la URL y haga clic en el panorama:
 * la esquina inferior mostrará el yaw y pitch del punto.
 */
window.TOUR_CONFIG = {
  titulo: "Tour virtual 360° | Sala SEM2",
  nombreSala: "Sala SEM2",
  subtitulo: "Tecnología inmersiva · Laboratorio PIE",
  institucion: "Feria de las Ciencias · Liceo Bicentenario de Excelencia Polivalente San Nicolás",
  bienvenida:
    "¡Bienvenido a la Sala SEM2! Aquí exploramos la biología de forma práctica con visores Meta Quest, " +
    "computadores y modelos impresos en 3D. Estas herramientas nos permiten observar fenómenos desde " +
    "distintas perspectivas y dar forma a proyectos de los estudiantes.",

  // URL pública definitiva (GitHub Pages). Si queda vacía, «Compartir» usa la dirección actual del navegador.
  urlPublica: "",
  // Ruta de la imagen del QR (se genera con scripts/generar_qr.py). Si queda vacía, no se muestra el QR.
  qr: "",

  // Primera escena del recorrido
  escenaInicial: "entrada",

  escenas: [
    {
      id: "entrada",
      nombre: "Entrada y vista general",
      descripcion: "Mirando desde la entrada hacia el interior: mesas de trabajo, pantalla interactiva y, al fondo, las estaciones de realidad virtual.",
      tiles: "tiles/entrada",
      miniatura: "tiles/miniaturas/entrada.jpg",
      vistaInicial: { yaw: -4, pitch: -12, fov: 95 },
      enlaces: [
        { destino: "mesas", yaw: -6, pitch: -37, etiqueta: "Mesas de trabajo" }
      ],
      puntos: [
        { ficha: "visores",      yaw: -17.4, pitch: -11 },
        { ficha: "pantalla",     yaw: 38.8,  pitch: -1.4 },
        { ficha: "impresos",     yaw: -15.6, pitch: -25 },
        { ficha: "computadores", yaw: -32.3, pitch: -22.5 }
      ]
    },
    {
      id: "mesas",
      nombre: "Mesas de trabajo",
      descripcion: "El corazón de la sala: mesas con visores Meta Quest, notebooks y modelos impresos en 3D para observar de cerca.",
      tiles: "tiles/mesas",
      miniatura: "tiles/miniaturas/mesas.jpg",
      vistaInicial: { yaw: 5, pitch: -15, fov: 95 },
      enlaces: [
        { destino: "pantalla", yaw: 40, pitch: -48, etiqueta: "Pantalla" },
        { destino: "entrada",  yaw: 112, pitch: -49, etiqueta: "Entrada" }
      ],
      puntos: [
        { ficha: "visores",      yaw: -78,   pitch: -31.3 },
        { ficha: "kat",          yaw: -49.9, pitch: -15.5 },
        { ficha: "pantalla",     yaw: 60.8,  pitch: -5.8 },
        { ficha: "impresos",     yaw: 61.7,  pitch: -33 },
        { ficha: "computadores", yaw: -169.5, pitch: -45.4 }
      ]
    },
    {
      id: "pantalla",
      nombre: "Pantalla y biología",
      descripcion: "La pantalla interactiva muestra material de clase sobre fotosíntesis. A los lados, más mesas con visores, notebooks y modelos impresos.",
      tiles: "tiles/pantalla",
      miniatura: "tiles/miniaturas/pantalla.jpg",
      vistaInicial: { yaw: 20.4, pitch: -10, fov: 95 },
      enlaces: [
        { destino: "vr",     yaw: -127, pitch: -49, etiqueta: "Estaciones de realidad virtual" },
        { destino: "mesas",  yaw: 75,   pitch: -49, etiqueta: "Mesas de trabajo" }
      ],
      puntos: [
        { ficha: "pantalla",     yaw: 19.5,  pitch: -17.2 },
        { ficha: "visores",      yaw: 91.6,  pitch: -27.8 },
        { ficha: "computadores", yaw: 158.4, pitch: -14.1 },
        { ficha: "impresos",     yaw: 134.6, pitch: -43.6 },
        { ficha: "kat",          yaw: -142.2, pitch: -8.4 }
      ]
    },
    {
      id: "vr",
      nombre: "Estaciones de realidad virtual",
      descripcion: "Plataformas KAT VR con monitores para seguir la experiencia, y más puestos con visores Meta Quest.",
      tiles: "tiles/vr",
      miniatura: "tiles/miniaturas/vr.jpg",
      vistaInicial: { yaw: -85, pitch: -12, fov: 95 },
      enlaces: [
        { destino: "pantalla", yaw: 75, pitch: -49, etiqueta: "Pantalla" }
      ],
      puntos: [
        { ficha: "kat",          yaw: -14.8,  pitch: -15.5 },
        { ficha: "kat",          yaw: -151.9, pitch: -48.9 },
        { ficha: "visores",      yaw: 8.1,    pitch: -15.5 },
        { ficha: "computadores", yaw: 114.4,  pitch: -10.5 }
      ]
    }
  ],

  // Fichas informativas (se reutilizan en cualquier escena mediante su id).
  fichas: {
    visores: {
      titulo: "Visores Meta Quest",
      texto: "Visores de realidad virtual con controles de mano. Los estudiantes los usan para explorar contenidos de biología dentro de entornos inmersivos y observar fenómenos desde distintas perspectivas."
    },
    kat: {
      titulo: "Plataformas KAT VR",
      texto: "Plataformas de realidad virtual en las que el estudiante se mantiene de pie con su visor y se desplaza caminando por el entorno virtual. Los monitores vecinos permiten que el resto del curso siga la experiencia."
    },
    pantalla: {
      titulo: "Pantalla y fotosíntesis",
      texto: "Pantalla interactiva de la sala para presentar y comentar los contenidos con todo el curso. En esta toma muestra una lámina sobre la fotosíntesis."
    },
    impresos: {
      titulo: "Modelos impresos en 3D",
      texto: "Piezas fabricadas con impresión 3D que apoyan las clases de biología. Se observan de cerca sobre las mesas y complementan lo que los estudiantes exploran en realidad virtual."
    },
    computadores: {
      titulo: "Trabajo con computadores",
      texto: "Los estudiantes usan notebooks para desarrollar ideas y proyectos, y trabajan en conjunto con los demás recursos de la sala."
    }
  }
};
