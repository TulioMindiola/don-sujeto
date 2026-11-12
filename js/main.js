/* =====================================================================
   Don Sujeto — interacción
   JavaScript sin dependencias. Todo es mejora progresiva: sin JS la
   página se lee completa y los enlaces de WhatsApp abren el chat.
   ===================================================================== */
(() => {
  'use strict';

  const d = document;
  const root = d.documentElement;
  const $ = (sel, ctx = d) => ctx.querySelector(sel);
  const $$ = (sel, ctx = d) => Array.from(ctx.querySelectorAll(sel));
  const movReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const escritorio = window.matchMedia('(min-width: 1024px)');

  /* -------------------------------------------------------------------
     1. WhatsApp: mensajes por tipo de botón
     ------------------------------------------------------------------- */
  const WA_NUMERO = '573187573822';
  const SALUDO = 'Hola Don Sujeto 🤠 ';
  const MENSAJES = {
    general: () => `${SALUDO}Vengo de la página web y quiero un sombrero.`,
    sombrero: (nombre) => `${SALUDO}Me interesa el ${nombre}. ¿Me cuentan opciones de fieltro, color y cinta?`,
    encargo: () => `${SALUDO}Quiero una pieza personalizada. Mi idea es: `,
    restauracion: () => `${SALUDO}Tengo un sombrero para restaurar o rediseñar.`,
  };
  const urlWhatsApp = (texto) => `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(texto)}`;

  $$('[data-wa]').forEach((enlace) => {
    const crear = MENSAJES[enlace.dataset.wa] || MENSAJES.general;
    enlace.href = urlWhatsApp(crear(enlace.dataset.waNombre));
    enlace.target = '_blank';
    enlace.rel = 'noopener';
  });

  /* -------------------------------------------------------------------
     2. Costura en chips (SVG con trazo 8/6)
     ------------------------------------------------------------------- */
  $$('[data-costura]').forEach((el) => {
    el.insertAdjacentHTML('beforeend', '<svg class="costura-borde" aria-hidden="true" focusable="false"><rect/></svg>');
  });

  /* -------------------------------------------------------------------
     3. Fotos faltantes: bloque índigo con el nombre del archivo
     ------------------------------------------------------------------- */
  const marcarFaltante = (img) => {
    if (img.classList.contains('falta-foto')) return;
    const w = parseInt(img.getAttribute('width'), 10) || 800;
    const h = parseInt(img.getAttribute('height'), 10) || 600;
    const nombre = (img.dataset.archivo || '').replace(/[<&>]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
      + `<rect width="100%" height="100%" fill="#383150"/>`
      + `<text x="50%" y="50%" fill="#B9B2C6" font-family="DM Mono, ui-monospace, monospace" font-size="${Math.max(14, Math.round(w / 24))}" letter-spacing="1" text-anchor="middle" dominant-baseline="middle">${nombre}</text></svg>`;
    img.classList.add('falta-foto');
    img.removeAttribute('srcset');
    img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };
  const imagenes = $$('img[data-archivo]');
  imagenes.forEach((img) => img.addEventListener('error', () => marcarFaltante(img), { once: true }));
  window.addEventListener('load', () => {
    imagenes.forEach((img) => {
      if (img.getAttribute('loading') !== 'lazy' && img.complete && img.naturalWidth === 0) marcarFaltante(img);
    });
  });

  /* -------------------------------------------------------------------
     4. Header: sólido tras 80 px, se oculta al bajar y vuelve al subir
     ------------------------------------------------------------------- */
  const cabecera = $('[data-cabecera]');
  let ultimoY = window.scrollY;

  const actualizarCabecera = (y) => {
    cabecera.classList.toggle('is-solida', y > 80);
    const delta = y - ultimoY;
    if (Math.abs(delta) > 6) {
      const ocultar = delta > 0 && y > 320 && !root.classList.contains('menu-abierto');
      cabecera.classList.toggle('is-oculta', ocultar);
      ultimoY = y;
    }
  };
  cabecera.addEventListener('focusin', () => cabecera.classList.remove('is-oculta'));

  /* -------------------------------------------------------------------
     5. Parallax suave (≤ 8 %) en hero y fotos del taller
     ------------------------------------------------------------------- */
  const hero = $('.hero');
  const heroImg = $('.hero-foto img');
  const capasParallax = $$('[data-parallax]');

  const aplicarParallax = (y) => {
    if (movReducido.matches) return;
    if (heroImg && hero) {
      const alto = hero.offsetHeight;
      if (y <= alto) heroImg.style.transform = `translate3d(0, ${((y / alto) * 8).toFixed(2)}%, 0)`;
    }
    const vh = window.innerHeight;
    capasParallax.forEach((capa) => {
      const r = capa.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const desplazamiento = (r.top + r.height / 2 - vh / 2) * parseFloat(capa.dataset.parallax);
      capa.style.transform = `translate3d(0, ${desplazamiento.toFixed(1)}px, 0)`;
    });
  };

  let pendiente = false;
  const alHacerScroll = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      actualizarCabecera(y);
      aplicarParallax(y);
      pendiente = false;
    });
  };
  window.addEventListener('scroll', alHacerScroll, { passive: true });
  window.addEventListener('resize', alHacerScroll, { passive: true });
  alHacerScroll();

  movReducido.addEventListener('change', () => {
    if (!movReducido.matches) return;
    if (heroImg) heroImg.style.transform = '';
    capasParallax.forEach((capa) => { capa.style.transform = ''; });
  });

  /* -------------------------------------------------------------------
     6. Menú móvil (dialog modal: foco atrapado, Escape cierra)
     ------------------------------------------------------------------- */
  const menu = $('#menu-movil');
  const botonAbrir = $('[data-menu-abrir]');
  const botonCerrar = $('[data-menu-cerrar]');

  if (menu && botonAbrir && typeof menu.showModal === 'function') {
    botonAbrir.addEventListener('click', () => {
      menu.showModal();
      root.classList.add('menu-abierto');
      botonAbrir.setAttribute('aria-expanded', 'true');
    });
    botonCerrar.addEventListener('click', () => menu.close());
    menu.addEventListener('close', () => {
      root.classList.remove('menu-abierto');
      botonAbrir.setAttribute('aria-expanded', 'false');
    });
    $$('a[href^="#"]', menu).forEach((a) => a.addEventListener('click', () => menu.close()));
    escritorio.addEventListener('change', (e) => { if (e.matches && menu.open) menu.close(); });
  }

  /* -------------------------------------------------------------------
     7. Revelado al entrar en pantalla
     ------------------------------------------------------------------- */
  const revelables = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revelar = (entradas, observador) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        observador.unobserve(e.target);
      });
    };
    const ioRevelar = new IntersectionObserver(revelar, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    // Las fotos con recorte tienen área visible 0 (clip-path): basta con que toquen la pantalla
    const ioFotos = new IntersectionObserver(revelar, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    revelables.forEach((el) => (el.dataset.reveal === 'foto' ? ioFotos : ioRevelar).observe(el));
  } else {
    revelables.forEach((el) => el.classList.add('is-visible'));
  }

  /* -------------------------------------------------------------------
     8. Conteo de cifras (100 % y 62,5 mil)
     ------------------------------------------------------------------- */
  const contar = (el) => {
    const fin = parseFloat(el.dataset.contar);
    const decimales = parseInt(el.dataset.decimales || '0', 10);
    const sufijo = (el.dataset.sufijo || '').replace(' ', ' ');
    const formato = new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    const pintar = (v) => { el.textContent = formato.format(v) + sufijo; };
    if (movReducido.matches) { pintar(fin); return; }
    const inicio = performance.now();
    const duracion = 1600;
    const paso = (t) => {
      const p = Math.min(1, (t - inicio) / duracion);
      pintar(fin * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(paso);
    };
    pintar(0);
    requestAnimationFrame(paso);
  };
  const contadores = $$('[data-contar]');
  if ('IntersectionObserver' in window) {
    const ioContar = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        contar(e.target);
        ioContar.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    contadores.forEach((el) => ioContar.observe(el));
  }

  /* -------------------------------------------------------------------
     9. Carrusel de sombreros (móvil): barra de progreso en costura
     ------------------------------------------------------------------- */
  $$('[data-carrusel]').forEach((lista) => {
    const barra = $(`[data-progreso="${lista.id}"] span`);
    if (!barra) return;
    const actualizar = () => {
      const total = lista.scrollWidth;
      const visible = lista.clientWidth;
      const max = total - visible;
      const fraccion = total > 0 ? Math.min(1, visible / total) : 1;
      const progreso = max > 0 ? lista.scrollLeft / max : 0;
      barra.style.width = `${(fraccion * 100).toFixed(2)}%`;
      barra.style.transform = `translateX(${(progreso * (1 / fraccion - 1) * 100).toFixed(2)}%)`;
    };
    lista.addEventListener('scroll', () => requestAnimationFrame(actualizar), { passive: true });
    window.addEventListener('resize', actualizar, { passive: true });
    actualizar();
  });

  /* -------------------------------------------------------------------
     10. «A tu medida»: paso activo resaltado
     ------------------------------------------------------------------- */
  const pasos = $$('.paso');
  if (pasos.length && 'IntersectionObserver' in window) {
    pasos[0].classList.add('is-activo');
    const ioPasos = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) pasos.forEach((p) => p.classList.toggle('is-activo', p === e.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    pasos.forEach((p) => ioPasos.observe(p));
  }

  /* -------------------------------------------------------------------
     11. Riel de sujetos: flechas y arrastre con ratón
     ------------------------------------------------------------------- */
  const riel = $('[data-riel]');
  if (riel) {
    const anterior = $('[data-riel-prev]');
    const siguiente = $('[data-riel-next]');
    const avance = () => {
      const tarjeta = $('li', riel);
      const gap = parseFloat(getComputedStyle(riel).columnGap) || 16;
      return tarjeta ? tarjeta.getBoundingClientRect().width + gap : 320;
    };
    const estado = () => {
      const max = riel.scrollWidth - riel.clientWidth - 4;
      if (anterior) anterior.disabled = riel.scrollLeft <= 4;
      if (siguiente) siguiente.disabled = riel.scrollLeft >= max;
    };
    const mover = (dir) => riel.scrollBy({ left: dir * avance(), behavior: movReducido.matches ? 'auto' : 'smooth' });
    anterior?.addEventListener('click', () => mover(-1));
    siguiente?.addEventListener('click', () => mover(1));
    riel.addEventListener('scroll', () => requestAnimationFrame(estado), { passive: true });
    window.addEventListener('resize', estado, { passive: true });
    estado();

    riel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
    });

    let arrastre = null;
    riel.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      arrastre = { x: e.clientX, inicio: riel.scrollLeft };
      riel.classList.add('is-arrastrando');
    });
    window.addEventListener('pointermove', (e) => {
      if (!arrastre) return;
      riel.scrollLeft = arrastre.inicio - (e.clientX - arrastre.x);
    });
    const soltar = () => {
      if (!arrastre) return;
      arrastre = null;
      const x = riel.scrollLeft;
      riel.classList.remove('is-arrastrando');
      // Al reactivar el ajuste magnético, lleva la tarjeta más cercana a su sitio
      riel.scrollLeft = x;
      const paso = avance();
      riel.scrollTo({ left: Math.round(x / paso) * paso, behavior: movReducido.matches ? 'auto' : 'smooth' });
    };
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  }

  /* -------------------------------------------------------------------
     12. Visor de galería (dialog, flechas, teclado y gesto)
     ------------------------------------------------------------------- */
  const visor = $('#visor');
  const disparadores = $$('[data-visor]');
  if (visor && disparadores.length && typeof visor.showModal === 'function') {
    const media = $('.visor-media', visor);
    const pie = $('.visor-pie', visor);
    const contador = $('.visor-contador', visor);
    let lista = [];
    let indice = 0;
    let origen = null;

    const mostrar = (i) => {
      indice = (i + lista.length) % lista.length;
      const item = lista[indice];
      media.replaceChildren();
      if (item.dataset.tipo === 'video') {
        const v = d.createElement('video');
        v.src = item.dataset.src;
        v.poster = item.dataset.poster || '';
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.controls = true;
        v.setAttribute('aria-label', item.dataset.alt || '');
        media.append(v);
        if (!movReducido.matches) v.play().catch(() => {});
      } else {
        const img = new Image();
        img.src = item.dataset.src;
        img.alt = item.dataset.alt || '';
        img.decoding = 'async';
        media.append(img);
      }
      pie.textContent = item.dataset.pie || '';
      contador.textContent = `${String(indice + 1).padStart(2, '0')} / ${String(lista.length).padStart(2, '0')}`;
    };

    disparadores.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        lista = disparadores.filter((el) => el.offsetParent !== null);
        origen = item;
        mostrar(lista.indexOf(item));
        visor.showModal();
        root.classList.add('visor-abierto');
      });
    });

    $('[data-visor-prev]', visor).addEventListener('click', () => mostrar(indice - 1));
    $('[data-visor-next]', visor).addEventListener('click', () => mostrar(indice + 1));
    $('[data-visor-cerrar]', visor).addEventListener('click', () => visor.close());
    visor.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(indice + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(indice - 1); }
    });
    visor.addEventListener('click', (e) => {
      if (e.target === visor || e.target.classList.contains('visor-escenario') || e.target.classList.contains('visor-media')) visor.close();
    });
    visor.addEventListener('close', () => {
      media.replaceChildren();
      root.classList.remove('visor-abierto');
      origen?.focus({ preventScroll: true });
    });

    let toqueX = null;
    visor.addEventListener('touchstart', (e) => { toqueX = e.touches[0].clientX; }, { passive: true });
    visor.addEventListener('touchend', (e) => {
      if (toqueX === null) return;
      const dx = e.changedTouches[0].clientX - toqueX;
      if (Math.abs(dx) > 50) mostrar(indice + (dx < 0 ? 1 : -1));
      toqueX = null;
    });
  }

  /* -------------------------------------------------------------------
     13. Videos en bucle: solo se reproducen en pantalla y sin movimiento reducido
     ------------------------------------------------------------------- */
  const videos = $$('video[data-auto]');
  if (videos.length && 'IntersectionObserver' in window) {
    const ioVideo = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        const v = e.target;
        if (e.isIntersecting && !movReducido.matches) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    videos.forEach((v) => { v.muted = true; ioVideo.observe(v); });
    movReducido.addEventListener('change', () => { if (movReducido.matches) videos.forEach((v) => v.pause()); });
  }

  /* -------------------------------------------------------------------
     14. Elementos flotantes: aparecen al salir del hero;
         la barra móvil se oculta en la sección de contacto
     ------------------------------------------------------------------- */
  const flotantes = $$('[data-flotante]');
  const contacto = $('#tienda');
  if (flotantes.length && hero && contacto && 'IntersectionObserver' in window) {
    let fueraDelHero = false;
    let enContacto = false;
    const pintar = () => {
      flotantes.forEach((el) => {
        const ocultarAqui = el.hasAttribute('data-ocultar-contacto') && enContacto;
        el.classList.toggle('is-visible', fueraDelHero && !ocultarAqui);
      });
    };
    new IntersectionObserver(([e]) => { fueraDelHero = !e.isIntersecting; pintar(); }, { rootMargin: '0px 0px -35% 0px' }).observe(hero);
    new IntersectionObserver(([e]) => { enContacto = e.isIntersecting; pintar(); }).observe(contacto);
  }

  /* -------------------------------------------------------------------
     15. Navegación: sección actual
     ------------------------------------------------------------------- */
  const enlacesNav = $$('.nav-principal a');
  if (enlacesNav.length && 'IntersectionObserver' in window) {
    const porId = new Map(enlacesNav.map((a) => [a.getAttribute('href').slice(1), a]));
    const ioNav = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        const enlace = porId.get(e.target.id);
        if (!enlace) return;
        if (e.isIntersecting) {
          enlacesNav.forEach((a) => a.removeAttribute('aria-current'));
          enlace.setAttribute('aria-current', 'true');
        } else if (enlace.getAttribute('aria-current')) {
          enlace.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    porId.forEach((_, id) => { const s = d.getElementById(id); if (s) ioNav.observe(s); });
  }

  /* -------------------------------------------------------------------
     16. Formulario: arma el mensaje y abre WhatsApp (no usa servidor)
     ------------------------------------------------------------------- */
  const form = $('#form-contacto');
  if (form) {
    const nombre = form.elements.nombre;
    const error = $('#error-nombre');
    const limpiarError = () => { nombre.removeAttribute('aria-invalid'); error.textContent = ''; };

    nombre.addEventListener('input', () => { if (nombre.value.trim()) limpiarError(); });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const valorNombre = nombre.value.trim();
      if (!valorNombre) {
        nombre.setAttribute('aria-invalid', 'true');
        error.textContent = 'Escribe tu nombre para poder saludarte.';
        nombre.focus();
        return;
      }
      limpiarError();
      const tipo = form.elements.tipo.value;
      const idea = form.elements.idea.value.trim();
      let texto = `${SALUDO}Soy ${valorNombre}.`;
      if (tipo) texto += ` Busco: ${tipo}.`;
      if (idea) texto += ` Mi idea: ${idea}`;
      window.open(urlWhatsApp(texto), '_blank', 'noopener');
    });
  }
})();
