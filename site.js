/**
 * ARCHIVO ARTÍSTICO JOSÉ LUIS GUTIÉRREZ
 * Catálogo Razonado de 57 Obras Escultóricas y Archivo de 38 Láminas Históricas
 * Inspirado en gregorcollienne.com
 */

(function () {
  'use strict';

  // Estado global de la aplicación
  const state = {
    obras: [],
    paginas: [],
    totales: {},
    activeView: 'obras', // 'obras' | 'artist' | 'archive' | 'contact'
    activeCategory: 'todas', // 'todas' | 'esculturas' | 'mascaras' | 'volumetricas'
    activeModalObra: null,
    activeModalPagina: null,
    activePhotoIndex: 0,
    isDeblurSelected: false,
    showingFicha: false,
    isImageZoomed: false,
    lastScrollY: 0,
    viewMode: '2d',
    is3DAutoRotating: true
  };

  // Elementos del DOM
  const dom = {
    body: document.body,
    navLinks: document.querySelectorAll('[data-nav-target]'),
    sections: {
      obras: document.getElementById('view-obras') || document.getElementById('view-overview'),
      artist: document.getElementById('view-artist'),
      archive: document.getElementById('view-archive'),
      contact: document.getElementById('view-contact')
    },
    overviewGrid: document.getElementById('overviewGrid'),
    archiveFichasGrid: document.getElementById('archiveFichasGrid'),
    // Modal
    obraModal: document.getElementById('obraModal'),
    modalBackBtn: document.getElementById('modalBackBtn'),
    modalHomeBtn: document.getElementById('modalHomeBtn'),
    modalHeaderObraTitle: document.getElementById('modalHeaderObraTitle'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalNumber: document.getElementById('modalNumber'),
    modalSubtitle: document.getElementById('modalSubtitle'),
    modalFigure: document.getElementById('modalFigure'),
    modalZoomHint: document.getElementById('modalZoomHint'),
    modalMainImg: document.getElementById('modalMainImg'),
    modalThumbnails: document.getElementById('modalThumbnails'),
    modalDeblurCompare: document.getElementById('modalDeblurCompare'),
    btnDeblurOrig: document.getElementById('btnDeblurOrig'),
    btnDeblurAI: document.getElementById('btnDeblurAI'),
    // 3D y Realidad Aumentada (AR)
    modalViewModeToggle: document.getElementById('modalViewModeToggle'),
    btnViewMode2D: document.getElementById('btnViewMode2D'),
    btnViewMode3D: document.getElementById('btnViewMode3D'),
    modal3DFigure: document.getElementById('modal3DFigure'),
    sculptureModelViewer: document.getElementById('sculptureModelViewer'),
    btnTriggerAR: document.getElementById('btnTriggerAR'),
    btn3DRotateToggle: document.getElementById('btn3DRotateToggle'),
    btn3DResetCamera: document.getElementById('btn3DResetCamera'),
    badge3DScale: document.getElementById('badge3DScale'),
    badge3DScaleText: document.getElementById('badge3DScaleText'),
    arQrModal: document.getElementById('arQrModal'),
    arQrModalOverlay: document.getElementById('arQrModalOverlay'),
    arQrModalClose: document.getElementById('arQrModalClose'),
    arQrTitle: document.getElementById('arQrTitle'),
    arQrImg: document.getElementById('arQrImg'),
    nativeAppleArImg: document.getElementById('nativeAppleArImg'),
    modalMetaObra: document.getElementById('modalMetaObra'),
    modalMetaTitulo: document.getElementById('modalMetaTitulo'),
    modalMetaDims: document.getElementById('modalMetaDims'),
    modalMetaFotosCount: document.getElementById('modalMetaFotosCount'),
    modalMetaLamina: document.getElementById('modalMetaLamina'),
    modalMetaMateriales: document.getElementById('modalMetaMateriales'),
    btnDownloadPng: document.getElementById('btnDownloadPng'),
    btnToggleFicha: document.getElementById('btnToggleFicha'),
    btnModalPrev: document.getElementById('btnModalPrev'),
    btnModalNext: document.getElementById('btnModalNext')
  };

  // 1. Inicialización
  async function init() {
    setupNavEvents();
    setupCategoryFilters();
    setupModalEvents();
    setupImageZoom();
    await loadCatalogData();
    updateCategorySelectCounts();
    renderOverview();
    renderArchiveFichas();
    checkInitialHash();
  }

  // 2. Carga de datos del catálogo
  async function loadCatalogData() {
    try {
      let resp = await fetch('data/catalogo_web.json?v=20260906_v20');
      if (!resp.ok) {
        resp = await fetch('./data/catalogo_web.json?v=20260906_v20');
      }
      if (!resp.ok) {
        resp = await fetch('/web/data/catalogo_web.json?v=20260906_v20');
      }
      const data = await resp.json();
      if (Array.isArray(data)) {
        state.obras = data;
        state.paginas = [];
      } else {
        state.obras = data.obras || [];
        state.paginas = data.paginas || [];
        state.totales = data.totales || {};
      }
      console.log(`Cargadas ${state.obras.length} obras y ${state.paginas.length} láminas de archivo.`);
    } catch (e) {
      console.warn('Error cargando catálogo dinámico.', e);
    }
  }

  // 3. Control de Navegación
  function setupNavEvents() {
    dom.navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const target = link.getAttribute('data-nav-target');
        if (target) {
          e.preventDefault();
          switchView(target);
        }
      });
    });

    // Tecla Escape para cerrar menú o modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.activeModalObra || state.activeModalPagina) {
          closeModal();
        }
      } else if (state.activeModalObra) {
        if (e.key === 'ArrowLeft') {
          navigateModal(-1);
        } else if (e.key === 'ArrowRight') {
          navigateModal(1);
        }
      }
    });
  }

  // 4. Conmutación de vistas principales
  function switchView(viewName) {
    if (viewName === 'overview') viewName = 'obras';
    state.activeView = viewName;

    Object.entries(dom.sections).forEach(([key, el]) => {
      if (el) {
        if (key === viewName) {
          el.classList.add('is-active');
        } else {
          el.classList.remove('is-active');
        }
      }
    });

    dom.navLinks.forEach((link) => {
      const target = link.getAttribute('data-nav-target');
      if (target === viewName || (viewName === 'obras' && target === 'overview')) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 5. Filtros por Categoría Curatorial (Dropdown Personalizado Editorial)
  function setupCategoryFilters() {
    const dropdown = document.getElementById('collectionDropdown');
    const trigger = document.getElementById('dropdownTrigger');
    const menu = document.getElementById('dropdownMenu');
    const selectedText = document.getElementById('dropdownSelectedText');
    const options = document.querySelectorAll('.c-custom-dropdown__option');

    if (trigger && dropdown) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', isOpen);
      });

      // Cerrar al hacer clic fuera
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });

      // Cerrar con Escape
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdown.classList.contains('is-open')) {
          dropdown.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });

      options.forEach((opt) => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const cat = opt.getAttribute('data-value');
          state.activeCategory = cat;

          options.forEach((o) => {
            const isMatch = o.getAttribute('data-value') === cat;
            o.classList.toggle('is-selected', isMatch);
            o.setAttribute('aria-selected', isMatch);
          });

          const optText = opt.querySelector('.c-custom-dropdown__option-text')?.textContent || '';
          const optCount = opt.querySelector('.c-custom-dropdown__option-count')?.textContent || '';
          if (selectedText) {
            selectedText.textContent = `${optText} (${optCount})`;
          }

          dropdown.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
          renderOverview();
        });
      });
    }

    // Compatibilidad auxiliar con pills
    const pills = document.querySelectorAll('.cat-pill');
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const cat = pill.getAttribute('data-cat');
        state.activeCategory = cat;
        pills.forEach((p) => p.classList.toggle('is-active', p.getAttribute('data-cat') === cat));
        renderOverview();
      });
    });
  }

  function updateCategorySelectCounts() {
    if (!state.obras.length) return;
    const total = state.obras.length;
    const esculturas = state.obras.filter((o) => o.categoria === 'esculturas').length;
    const mascaras = state.obras.filter((o) => o.categoria === 'mascaras').length;
    const volumetricas = state.obras.filter((o) => o.categoria === 'volumetricas').length;

    const countTodas = document.getElementById('count-todas');
    const countEsc = document.getElementById('count-esculturas');
    const countMasc = document.getElementById('count-mascaras');
    const countVol = document.getElementById('count-volumetricas');

    if (countTodas) countTodas.textContent = total;
    if (countEsc) countEsc.textContent = esculturas;
    if (countMasc) countMasc.textContent = mascaras;
    if (countVol) countVol.textContent = volumetricas;

    const selectedText = document.getElementById('dropdownSelectedText');
    if (selectedText && state.activeCategory === 'todas') {
      selectedText.textContent = `Todas las obras (${total})`;
    }
  }

  // 6. Obtener obras filtradas por la categoría activa
  function getFilteredObras() {
    if (state.activeCategory === 'todas') {
      return state.obras;
    }
    return state.obras.filter((obra) => obra.categoria === state.activeCategory);
  }

  // 7. Renderizado del Muro Escalonado de Obras (Gregor Collienne Style)
  function renderOverview() {
    if (!dom.overviewGrid) return;
    const obras = getFilteredObras();
    dom.overviewGrid.innerHTML = '';

    obras.forEach((obra) => {
      const item = document.createElement('div');
      item.className = 'overview-item is--visible';

      const foto1 = obra.fotos[0] || {};
      const imgPath = foto1.web_image ? foto1.web_image : '';

      item.innerHTML = `
        <div class="overview-item__figure">
          <img class="overview-item__img" src="${imgPath}" alt="${obra.nombre_completo}" loading="lazy" />
        </div>
        <div class="overview-item__caption">
          <span class="overview-item__title">${obra.titulo}${obra.modelo_3d ? ' <span class="overview-item__3d-tag">3D · AR</span>' : ''}</span>
          <span class="overview-item__number">${obra.numero_str}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        openModal(obra);
      });

      dom.overviewGrid.appendChild(item);
    });
  }

  // 8. Renderizado del Archivo de Cartulinas (38 Láminas Históricas de Archivo)
  function renderArchiveFichas() {
    if (!dom.archiveFichasGrid) return;
    dom.archiveFichasGrid.innerHTML = '';

    state.paginas.forEach((pagina) => {
      const card = document.createElement('div');
      card.className = 'archive-ficha-card';

      const multiBadge = pagina.es_multiobra
        ? `<span class="archive-ficha-badge-multiobra">${pagina.num_obras} Obras</span>`
        : '';

      const titulosResumen = pagina.subtitulo_archivo || (pagina.obras_titulos && pagina.obras_titulos.length > 0 ? pagina.obras_titulos.join(', ') : `Obra ${pagina.numero_str}`);

      card.innerHTML = `
        <div class="archive-ficha-card__figure">
          <img class="archive-ficha-card__img" src="${pagina.ficha_preview}" alt="Lámina de Archivo ${pagina.numero_str}" loading="lazy" />
        </div>
        <div class="archive-ficha-card__caption" style="flex-direction: column; align-items: flex-start; gap: 4px;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <span style="font-weight: 700;">Lámina ${pagina.numero_str}</span>
            ${multiBadge}
          </div>
          <span style="font-size: 11px; color: var(--color-muted); line-height: 1.3;">${titulosResumen}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        openFichaModal(pagina);
      });
      dom.archiveFichasGrid.appendChild(card);
    });
  }

  // 9. Configuración de Eventos del Modal y Navegación Histórica
  function setupModalEvents() {
    if (dom.modalCloseBtn) {
      dom.modalCloseBtn.addEventListener('click', () => closeModal());
    }

    if (dom.modalBackBtn) {
      dom.modalBackBtn.addEventListener('click', () => {
        if (window.history.state && window.history.state.modalOpen) {
          window.history.back();
        } else {
          closeModal();
        }
      });
    }

    if (dom.modalHomeBtn) {
      dom.modalHomeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
        switchView('obras');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if (dom.obraModal) {
      dom.obraModal.addEventListener('click', (e) => {
        if (e.target === dom.obraModal) {
          closeModal();
        }
      });
    }

    if (dom.btnModalPrev) {
      dom.btnModalPrev.addEventListener('click', () => navigateModal(-1));
    }

    if (dom.btnModalNext) {
      dom.btnModalNext.addEventListener('click', () => navigateModal(1));
    }

    // Toggle Deblur IA
    if (dom.btnDeblurOrig && dom.btnDeblurAI) {
      dom.btnDeblurOrig.addEventListener('click', () => {
        state.isDeblurSelected = false;
        dom.btnDeblurOrig.classList.add('is-active');
        dom.btnDeblurAI.classList.remove('is-active');
        updateModalDisplay();
      });

      dom.btnDeblurAI.addEventListener('click', () => {
        state.isDeblurSelected = true;
        dom.btnDeblurAI.classList.add('is-active');
        dom.btnDeblurOrig.classList.remove('is-active');
        updateModalDisplay();
      });
    }

    // Toggle Lámina Original / Fotografía
    if (dom.btnToggleFicha) {
      dom.btnToggleFicha.addEventListener('click', () => {
        state.showingFicha = !state.showingFicha;
        updateModalDisplay();
      });
    }

    // Toggle 2D / 3D y Realidad Aumentada
    if (dom.btnViewMode2D) {
      dom.btnViewMode2D.addEventListener('click', () => setViewMode('2d'));
    }
    if (dom.btnViewMode3D) {
      dom.btnViewMode3D.addEventListener('click', () => setViewMode('3d'));
    }

    // Controles del visor 3D
    if (dom.btn3DRotateToggle) {
      dom.btn3DRotateToggle.addEventListener('click', () => {
        if (!dom.sculptureModelViewer) return;
        state.is3DAutoRotating = !state.is3DAutoRotating;
        dom.sculptureModelViewer.autoRotate = state.is3DAutoRotating;
        dom.btn3DRotateToggle.classList.toggle('is-active', state.is3DAutoRotating);
      });
    }

    if (dom.btn3DResetCamera) {
      dom.btn3DResetCamera.addEventListener('click', () => {
        if (!dom.sculptureModelViewer) return;
        dom.sculptureModelViewer.cameraOrbit = '0deg 75deg 105%';
        if (typeof dom.sculptureModelViewer.resetTurntableRotation === 'function') {
          dom.sculptureModelViewer.resetTurntableRotation();
        }
      });
    }

    // Disparador de Realidad Aumentada (AR)
    if (dom.btnTriggerAR) {
      dom.btnTriggerAR.addEventListener('click', (e) => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAndroid = /Android/i.test(navigator.userAgent);
        const obra = state.activeModalObra;

        if (!obra) return;

        // En iOS: El enlace <a rel="ar" href="..."> es manejado nativamente por Safari Quick Look.
        // Si el href aún no estuviese disponible, recurrimos a activateAR() de model-viewer.
        if (isIOS) {
          const href = dom.btnTriggerAR.getAttribute('href');
          if (!href || href === '#') {
            e.preventDefault();
            if (dom.sculptureModelViewer && typeof dom.sculptureModelViewer.activateAR === 'function') {
              dom.sculptureModelViewer.activateAR();
            }
          }
          // Si el href está asignado al archivo .usdz#allowsContentScaling=0,
          // permitimos que el navegador ejecute la navegación nativa de Apple Quick Look.
          return;
        }

        // En Android: Activar Scene Viewer / WebXR a través de model-viewer
        if (isAndroid) {
          e.preventDefault();
          if (dom.sculptureModelViewer && typeof dom.sculptureModelViewer.activateAR === 'function') {
            dom.sculptureModelViewer.activateAR();
          }
          return;
        }

        // Si es escritorio / ordenador: Abrir modal con código QR para escanear con móvil
        e.preventDefault();
        e.stopPropagation();
        openArQrModal();
      });
    }

    // Modal QR para Realidad Aumentada
    if (dom.arQrModalClose) {
      dom.arQrModalClose.addEventListener('click', closeArQrModal);
    }
    if (dom.arQrModalOverlay) {
      dom.arQrModalOverlay.addEventListener('click', closeArQrModal);
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (dom.arQrModal && dom.arQrModal.classList.contains('is-active')) {
          closeArQrModal();
        }
      }
    });

    // Navegación con Historial (Atrás del navegador y gesto móvil)
    window.addEventListener('popstate', () => {
      if (state.activeModalObra || state.activeModalPagina) {
        closeModal(false);
      }
    });
  }

  // Alternar entre Vista 2D (Foto de época) y Vista 3D / Realidad Aumentada
  function setViewMode(mode) {
    state.viewMode = mode;
    if (mode === '3d') {
      if (dom.modalFigure) dom.modalFigure.style.display = 'none';
      if (dom.modal3DFigure) dom.modal3DFigure.style.display = 'block';
      if (dom.btnViewMode3D) dom.btnViewMode3D.classList.add('is-active');
      if (dom.btnViewMode2D) dom.btnViewMode2D.classList.remove('is-active');
      if (dom.modalThumbnails) dom.modalThumbnails.style.display = 'none';
      if (dom.modalDeblurCompare) dom.modalDeblurCompare.style.display = 'none';
      if (dom.btnToggleFicha) dom.btnToggleFicha.style.display = 'none';
    } else {
      if (dom.modal3DFigure) dom.modal3DFigure.style.display = 'none';
      if (dom.modalFigure) dom.modalFigure.style.display = 'flex';
      if (dom.btnViewMode2D) dom.btnViewMode2D.classList.add('is-active');
      if (dom.btnViewMode3D) dom.btnViewMode3D.classList.remove('is-active');
      if (dom.btnToggleFicha) dom.btnToggleFicha.style.display = 'block';
      if (state.activeModalObra) {
        if (state.activeModalObra.fotos.length > 1 && dom.modalThumbnails) {
          dom.modalThumbnails.style.display = 'flex';
        }
        checkDeblurAvailability(state.activeModalObra);
      }
    }
  }

  // Modal con Código QR para experimentar AR en iPhone / Android desde el ordenador
  function openArQrModal() {
    if (!state.activeModalObra || !dom.arQrModal) return;
    const obra = state.activeModalObra;
    if (dom.arQrTitle) {
      dom.arQrTitle.textContent = `${obra.titulo} · AR 1:1`;
    }
    const baseUrl = 'https://olmo-gutierrez.github.io/archivo-jose-luis/';
    const targetUrl = `${baseUrl}#obra-${obra.numero_str}-3d`;
    if (dom.arQrImg) {
      dom.arQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=${encodeURIComponent(targetUrl)}`;
    }
    dom.arQrModal.classList.add('is-active');
  }

  function closeArQrModal() {
    if (dom.arQrModal) {
      dom.arQrModal.classList.remove('is-active');
    }
  }

  // Helpers para obtener la lámina de origen de la foto activa
  function getActivePhotoPagina(obra, photoIndex) {
    if (!obra || !obra.fotos || obra.fotos.length === 0) return 1;
    const foto = obra.fotos[photoIndex] || obra.fotos[0];
    return foto.de_pagina || (obra.paginas_referencia && obra.paginas_referencia[0]) || 1;
  }

  function getActivePhotoFichaPreview(obra, photoIndex) {
    const pagNum = getActivePhotoPagina(obra, photoIndex);
    return `assets/fichas/ficha_obra_${String(pagNum).padStart(3, '0')}.jpg`;
  }

  // 10. Actualización Dinámica del Visor Modal (Foto activa o Lámina de esa foto)
  function updateModalDisplay() {
    if (window._resetModalZoom) window._resetModalZoom();
    if (!state.activeModalObra) return;
    const obra = state.activeModalObra;
    const currentFoto = obra.fotos[state.activePhotoIndex];
    if (!currentFoto) return;

    const pagNum = getActivePhotoPagina(obra, state.activePhotoIndex);
    const pagStr = String(pagNum).padStart(3, '0');
    const fichaPreview = getActivePhotoFichaPreview(obra, state.activePhotoIndex);

    if (state.showingFicha) {
      dom.modalMainImg.src = fichaPreview;
      dom.btnToggleFicha.textContent = 'Ver fotografía de la obra';
    } else {
      if (state.isDeblurSelected && currentFoto.deblur_image) {
        dom.modalMainImg.src = currentFoto.deblur_image;
      } else {
        dom.modalMainImg.src = currentFoto.web_image;
      }
      dom.btnToggleFicha.textContent = `Ver lámina original (Lámina ${pagStr})`;
    }

    // Actualizar metadato de lámina en la tabla
    if (dom.modalMetaLamina) {
      dom.modalMetaLamina.textContent = `Lámina de Archivo ${pagStr}`;
    }

    setupDownloadButton(obra);
  }

  // Bloqueo estricto de scroll en iOS Safari para evitar que se mueva la galería de fondo
  function lockBodyScroll() {
    state.lastScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${state.lastScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    const scrollY = state.lastScrollY || 0;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo({
      top: scrollY,
      behavior: 'instant'
    });
  }

  // 11. Apertura del Modal de Obra
  function openModal(obra, pushHistory = true) {
    if (!state.activeModalObra && !state.activeModalPagina) {
      state.lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
    }
    if (dom.obraModal) {
      dom.obraModal.scrollTop = 0;
      if (typeof dom.obraModal.scrollTo === 'function') {
        dom.obraModal.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    }

    state.activeModalObra = obra;
    state.activeModalPagina = null;
    state.activePhotoIndex = 0;
    state.isDeblurSelected = false;
    state.showingFicha = false;

    if (pushHistory) {
      history.pushState({ modalOpen: true, obraId: obra.id }, '', '#obra-' + obra.numero_str);
    }



    if (dom.btnToggleFicha) {
      dom.btnToggleFicha.style.display = 'block';
    }

    // Encabezado del modal
    if (dom.modalHeaderObraTitle) {
      dom.modalHeaderObraTitle.textContent = obra.titulo;
    }
    dom.modalNumber.textContent = `Obra ${obra.numero_str}`;
    if (dom.modalSubtitle) {
      dom.modalSubtitle.textContent = `Obra ${obra.numero_str} · ${obra.categoria_nombre}`;
    }

    // Ficha técnica
    dom.modalMetaObra.textContent = obra.titulo;
    if (obra.es_titulo_original) {
      dom.modalMetaTitulo.innerHTML = `Obra ${obra.numero_str} · ${obra.categoria_nombre} <br><span class="curatorial-badge-orig">Título original de autor</span>`;
    } else {
      dom.modalMetaTitulo.innerHTML = `Obra ${obra.numero_str} · ${obra.categoria_nombre}`;
    }

    dom.modalMetaDims.textContent = obra.dimensiones || 'Consultar lámina';
    dom.modalMetaFotosCount.textContent = `${obra.fotos.length} ${obra.fotos.length === 1 ? 'fotografía' : 'fotografías'}`;
    dom.modalMetaMateriales.textContent = obra.materiales;

    // Miniaturas de fotos si hay más de 1
    renderModalThumbnails(obra);

    // Comparador Deblur IA
    checkDeblurAvailability(obra);

    // Actualizar imagen principal, botón de lámina y metadato de lámina
    updateModalDisplay();

    // Configuración de visualización 3D y Realidad Aumentada si la obra dispone de modelo
    if (obra.modelo_3d) {
      if (dom.modalViewModeToggle) dom.modalViewModeToggle.style.display = 'inline-flex';

      const glbUrl = obra.modelo_3d + '?v=20260906_v20';
      // URL absoluta y limpia a USDZ para Apple Quick Look (sin parámetros de consulta antes de .usdz)
      const usdzUrl = obra.modelo_usdz
        ? new URL(obra.modelo_usdz, window.location.href).href + '#allowsContentScaling=0'
        : '';

      if (dom.sculptureModelViewer) {
        dom.sculptureModelViewer.setAttribute('src', glbUrl);
        if (usdzUrl) {
          dom.sculptureModelViewer.setAttribute('ios-src', usdzUrl);
        } else {
          dom.sculptureModelViewer.removeAttribute('ios-src');
        }
        dom.sculptureModelViewer.setAttribute('alt', `Modelo 3D y Realidad Aumentada de ${obra.titulo}`);
        dom.sculptureModelViewer.autoRotate = state.is3DAutoRotating;
      }

      if (dom.btnTriggerAR) {
        if (usdzUrl) {
          dom.btnTriggerAR.setAttribute('href', usdzUrl);
        } else {
          dom.btnTriggerAR.setAttribute('href', '#');
        }
      }

      if (dom.nativeAppleArImg && obra.fotos && obra.fotos[0]) {
        dom.nativeAppleArImg.setAttribute('src', obra.fotos[0].web_image);
      }

      if (dom.badge3DScaleText) {
        dom.badge3DScaleText.textContent = obra.dimensiones_3d ? `Escala 1:1 · ${obra.dimensiones_3d}` : (obra.dimensiones ? `Escala 1:1 · ${obra.dimensiones}` : 'Escala 1:1 real');
      }
      if (window.location.hash && window.location.hash.endsWith('-3d')) {
        setViewMode('3d');
      } else {
        setViewMode('2d');
      }
    } else {
      if (dom.modalViewModeToggle) dom.modalViewModeToggle.style.display = 'none';
      setViewMode('2d');
    }

    // Mostrar modal y bloquear scroll de fondo
    dom.obraModal.classList.add('is-active');
    lockBodyScroll();
  }

  // 12. Modal de Lámina de Archivo Histórico (Al pulsar en sección Archivo)
  function openFichaModal(pagina, pushHistory = true) {
    if (dom.modalViewModeToggle) dom.modalViewModeToggle.style.display = 'none';
    setViewMode('2d');
    if (!state.activeModalObra && !state.activeModalPagina) {
      state.lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
    }
    if (dom.obraModal) {
      dom.obraModal.scrollTop = 0;
      if (typeof dom.obraModal.scrollTo === 'function') {
        dom.obraModal.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    }

    state.activeModalPagina = pagina;
    state.activeModalObra = null;
    state.showingFicha = true;

    if (pushHistory) {
      history.pushState({ modalOpen: true, laminaId: pagina.numero }, '', '#lamina-' + pagina.numero_str);
    }

    if (dom.btnToggleFicha) {
      dom.btnToggleFicha.style.display = 'none';
    }
    if (dom.modalThumbnails) {
      dom.modalThumbnails.style.display = 'none';
    }
    if (dom.modalDeblurCompare) {
      dom.modalDeblurCompare.style.display = 'none';
    }

    dom.modalMainImg.src = pagina.ficha_preview;

    if (dom.modalHeaderObraTitle) {
      dom.modalHeaderObraTitle.textContent = `Lámina de Archivo ${pagina.numero_str}`;
    }
    dom.modalNumber.textContent = `Lámina ${pagina.numero_str}`;
    if (dom.modalSubtitle) {
      dom.modalSubtitle.textContent = `Fondo Histórico de Archivo · ${pagina.num_obras} ${pagina.num_obras === 1 ? 'escultura' : 'esculturas'}`;
    }

    dom.modalMetaObra.textContent = `Lámina de Archivo ${pagina.numero_str}`;
    dom.modalMetaTitulo.innerHTML = `Soporte histórico de cartulina con fotografías de época <br><span class="curatorial-badge-orig">Documento de Archivo</span>`;

    dom.modalMetaDims.textContent = '38 x 28 cm aprox. (Soporte Cartulina)';
    const numFotos = pagina.num_fotos || (pagina.obras_ids ? pagina.obras_ids.length : 1);
    dom.modalMetaFotosCount.textContent = `${numFotos} ${numFotos === 1 ? 'fotografía de época' : 'fotografías de época'}`;
    dom.modalMetaMateriales.textContent = 'Cartulina histórica de archivo, fotografías montadas por el artista y anotaciones autógrafas.';

    if (dom.modalMetaLamina) {
      dom.modalMetaLamina.textContent = `Lámina ${pagina.numero_str}`;
    }

    if (dom.btnDownloadPng) {
      dom.btnDownloadPng.href = pagina.ficha_preview;
      dom.btnDownloadPng.setAttribute('download', `lamina_archivo_${pagina.numero_str}.jpg`);
      dom.btnDownloadPng.textContent = 'Descargar lámina completa';
    }

    dom.obraModal.classList.add('is-active');
    lockBodyScroll();
  }

  function closeModal(updateHistory = true) {
    if (window._resetModalZoom) window._resetModalZoom();
    closeArQrModal();
    setViewMode('2d');
    state.activeModalObra = null;
    state.activeModalPagina = null;
    dom.obraModal.classList.remove('is-active');
    if (dom.obraModal) {
      dom.obraModal.scrollTop = 0;
    }
    unlockBodyScroll();

    if (updateHistory && window.location.hash) {
      try {
        history.pushState(null, '', window.location.pathname + window.location.search);
      } catch (e) {}
    }
  }

  function navigateModal(direction) {
    if (window._resetModalZoom) window._resetModalZoom();
    if (dom.obraModal) {
      dom.obraModal.scrollTop = 0;
    }
    if (state.activeModalObra) {
      const currentIndex = state.obras.findIndex((o) => o.id === state.activeModalObra.id);
      let newIndex = currentIndex + direction;
      if (newIndex < 0) newIndex = state.obras.length - 1;
      if (newIndex >= state.obras.length) newIndex = 0;
      openModal(state.obras[newIndex], false);
      history.replaceState({ modalOpen: true, obraId: state.obras[newIndex].id }, '', '#obra-' + state.obras[newIndex].numero_str);
    } else if (state.activeModalPagina) {
      const currentIndex = state.paginas.findIndex((p) => p.numero === state.activeModalPagina.numero);
      let newIndex = currentIndex + direction;
      if (newIndex < 0) newIndex = state.paginas.length - 1;
      if (newIndex >= state.paginas.length) newIndex = 0;
      openFichaModal(state.paginas[newIndex], false);
      history.replaceState({ modalOpen: true, laminaId: state.paginas[newIndex].numero }, '', '#lamina-' + state.paginas[newIndex].numero_str);
    }
  }

  function renderModalThumbnails(obra) {
    if (!dom.modalThumbnails) return;
    dom.modalThumbnails.innerHTML = '';

    if (obra.fotos.length <= 1) {
      dom.modalThumbnails.style.display = 'none';
      return;
    }

    dom.modalThumbnails.style.display = 'flex';
    obra.fotos.forEach((foto, idx) => {
      const thumb = document.createElement('div');
      thumb.className = `c-modal-thumb ${idx === state.activePhotoIndex ? 'is-active' : ''}`;
      thumb.innerHTML = `<img src="${foto.web_image}" alt="Vista ${idx + 1}" />`;

      thumb.addEventListener('click', () => {
        state.activePhotoIndex = idx;

        document.querySelectorAll('.c-modal-thumb').forEach((t, i) => {
          t.classList.toggle('is-active', i === idx);
        });

        checkDeblurAvailability(obra);
        updateModalDisplay();
      });

      dom.modalThumbnails.appendChild(thumb);
    });
  }

  function checkDeblurAvailability(obra) {
    if (!dom.modalDeblurCompare) return;
    const currentFoto = obra.fotos[state.activePhotoIndex];

    if (currentFoto && currentFoto.deblur_image) {
      dom.modalDeblurCompare.style.display = 'block';
      dom.btnDeblurOrig.classList.add('is-active');
      dom.btnDeblurAI.classList.remove('is-active');
      state.isDeblurSelected = false;
    } else {
      dom.modalDeblurCompare.style.display = 'none';
      state.isDeblurSelected = false;
    }
  }

  function setupDownloadButton(obra) {
    if (!dom.btnDownloadPng) return;
    if (state.showingFicha) {
      const pagNum = getActivePhotoPagina(obra, state.activePhotoIndex);
      const pagStr = String(pagNum).padStart(3, '0');
      dom.btnDownloadPng.href = `assets/fichas/ficha_obra_${pagStr}.jpg`;
      dom.btnDownloadPng.setAttribute('download', `lamina_archivo_${pagStr}.jpg`);
      dom.btnDownloadPng.textContent = `Descargar Lámina ${pagStr} en alta resolución`;
    } else {
      const currentFoto = obra.fotos[state.activePhotoIndex];
      if (currentFoto) {
        dom.btnDownloadPng.href = currentFoto.web_image;
        dom.btnDownloadPng.setAttribute('download', currentFoto.archivo_original);
        dom.btnDownloadPng.textContent = 'Descargar fotografía en alta resolución';
      }
    }
  }

  function checkInitialHash() {
    const hash = window.location.hash;
    if (!hash) return;
    if (hash.startsWith('#obra-')) {
      let is3D = false;
      let numStr = hash.replace('#obra-', '');
      if (numStr.endsWith('-3d')) {
        is3D = true;
        numStr = numStr.replace('-3d', '');
      }
      const obra = state.obras.find((o) => o.numero_str === numStr);
      if (obra) {
        openModal(obra, false);
        if (is3D && obra.modelo_3d) {
          setViewMode('3d');
        }
      }
    } else if (hash.startsWith('#lamina-')) {
      const numStr = hash.replace('#lamina-', '');
      const pag = state.paginas.find((p) => p.numero_str === numStr);
      if (pag) openFichaModal(pag, false);
    }
  }

  // 13. Cursor personalizado interactivo (Gregor Collienne Style)
  
  // 14. Funcionalidad de Zoom Interactivo (Escritorio en Marco + Móvil Pantalla Completa con Pinch & Doble Toque)
  function setupImageZoom() {
    const figure = dom.modalFigure || document.querySelector('.c-modal-figure');
    const img = dom.modalMainImg;
    const hint = dom.modalZoomHint || document.getElementById('modalZoomHint');

    // Elementos del visor táctil a pantalla completa
    const touchModal = document.getElementById('touchZoomModal');
    const touchImg = document.getElementById('touchZoomImg');
    const touchStage = document.getElementById('touchZoomStage');
    const touchTitle = document.getElementById('touchZoomTitle');
    const touchClose = document.getElementById('touchZoomCloseBtn');
    const touchHint = document.getElementById('touchZoomHint');

    if (!figure || !img) return;

    const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;

    // --- A. ESCRITORIO: Zoom en marco con paneo dinámico ---
    function resetDesktopZoom() {
      state.isImageZoomed = false;
      figure.classList.remove('is-zoomed');
      img.style.transform = '';
      img.style.transformOrigin = '';
      if (hint) {
        hint.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg><span>Zoom</span>`;
      }
      const cursor = document.getElementById('customCursor');
      const cursorText = cursor ? cursor.querySelector('.custom-cursor__text') : null;
      if (cursorText && figure.matches(':hover')) {
        cursorText.textContent = 'ZOOM';
      }
    }

    function toggleDesktopZoom(e) {
      if (!img.src) return;
      state.isImageZoomed = !state.isImageZoomed;

      const cursor = document.getElementById('customCursor');
      const cursorText = cursor ? cursor.querySelector('.custom-cursor__text') : null;

      if (state.isImageZoomed) {
        figure.classList.add('is-zoomed');
        const rect = figure.getBoundingClientRect();
        const clientX = (e.clientX !== undefined) ? e.clientX : rect.left + rect.width / 2;
        const clientY = (e.clientY !== undefined) ? e.clientY : rect.top + rect.height / 2;

        const xPercent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const yPercent = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

        img.style.transformOrigin = `${xPercent.toFixed(1)}% ${yPercent.toFixed(1)}%`;
        img.style.transform = 'scale(2.6)';

        if (hint) {
          hint.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg><span>Alejar</span>`;
        }
        if (cursorText) {
          cursorText.textContent = 'ALEJAR';
        }
      } else {
        resetDesktopZoom();
      }
    }

    figure.addEventListener('mousemove', (e) => {
      if (!state.isImageZoomed || isTouchDevice()) return;
      const rect = figure.getBoundingClientRect();
      const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      img.style.transformOrigin = `${xPercent.toFixed(1)}% ${yPercent.toFixed(1)}%`;
    });

    // --- B. MÓVIL: Visor Pantalla Completa con Pinch-to-zoom y Doble Toque ---
    let touchState = {
      scale: 1,
      currentX: 0,
      currentY: 0,
      startX: 0,
      startY: 0,
      startScale: 1,
      startDistance: 0,
      lastTap: 0,
      isPanning: false,
      isPinching: false,
      pullY: 0
    };

    function applyTouchTransform(animate = false) {
      if (!touchImg) return;
      touchImg.style.transition = animate ? 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
      touchImg.style.transform = `translate(${touchState.currentX}px, ${touchState.currentY}px) scale(${touchState.scale})`;
      if (touchModal) {
        if (touchState.scale > 1.05) {
          touchModal.classList.add('is-zoomed');
        } else {
          touchModal.classList.remove('is-zoomed');
        }
      }
    }

    function clampTouchOffsets() {
      if (!touchStage || !touchImg) return;
      const stageRect = touchStage.getBoundingClientRect();
      const imgW = touchImg.offsetWidth * touchState.scale;
      const imgH = touchImg.offsetHeight * touchState.scale;

      const maxPanX = Math.max(0, (imgW - stageRect.width) / 2);
      const maxPanY = Math.max(0, (imgH - stageRect.height) / 2);

      touchState.currentX = Math.min(maxPanX, Math.max(-maxPanX, touchState.currentX));
      touchState.currentY = Math.min(maxPanY, Math.max(-maxPanY, touchState.currentY));
    }

    function openTouchZoomViewer() {
      if (!touchModal || !touchImg || !img.src) return;
      touchImg.src = img.src;

      let titleText = 'Detalle de Archivo';
      if (state.activeModalObra) {
        titleText = `Obra ${state.activeModalObra.numero_str} · ${state.activeModalObra.titulo}`;
      } else if (state.activeModalPagina) {
        titleText = `Lámina de Archivo ${state.activeModalPagina.numero_str}`;
      }
      if (touchTitle) touchTitle.textContent = titleText;

      touchState.scale = 1;
      touchState.currentX = 0;
      touchState.currentY = 0;
      applyTouchTransform(false);

      touchModal.classList.add('is-active');
      touchModal.setAttribute('aria-hidden', 'false');

      if (touchHint) {
        touchHint.style.opacity = '1';
        setTimeout(() => {
          if (touchHint && touchState.scale <= 1) {
            touchHint.style.opacity = '0';
          }
        }, 3200);
      }
    }

    function closeTouchZoomViewer() {
      if (!touchModal) return;
      touchModal.classList.remove('is-active');
      touchModal.setAttribute('aria-hidden', 'true');
      touchState.scale = 1;
      touchState.currentX = 0;
      touchState.currentY = 0;
      applyTouchTransform(false);
    }

    // Eventos táctiles en el visor a pantalla completa
    if (touchStage) {
      touchStage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          // Inicio de pellizco (Pinch)
          touchState.isPinching = true;
          touchState.isPanning = false;
          touchState.startDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          touchState.startScale = touchState.scale;
        } else if (e.touches.length === 1) {
          // Comprobar doble toque
          const now = Date.now();
          const dist = Math.hypot(e.touches[0].clientX - touchState.startX, e.touches[0].clientY - touchState.startY);

          if (now - touchState.lastTap < 320 && dist < 40) {
            // Doble toque detectado
            if (touchState.scale > 1.2) {
              touchState.scale = 1;
              touchState.currentX = 0;
              touchState.currentY = 0;
            } else {
              touchState.scale = 2.5;
              const rect = touchStage.getBoundingClientRect();
              const touchX = e.touches[0].clientX - rect.left - rect.width / 2;
              const touchY = e.touches[0].clientY - rect.top - rect.height / 2;
              touchState.currentX = -touchX * 1.5;
              touchState.currentY = -touchY * 1.5;
              clampTouchOffsets();
            }
            applyTouchTransform(true);
            touchState.lastTap = 0;
            return;
          }
          touchState.lastTap = now;

          touchState.isPanning = true;
          touchState.isPinching = false;
          touchState.startX = e.touches[0].clientX;
          touchState.startY = e.touches[0].clientY;
          touchState.pullY = 0;
        }
      }, { passive: false });

      touchStage.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Evitar scroll o comportamiento nativo del navegador

        if (touchState.isPinching && e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (touchState.startDistance > 0) {
            touchState.scale = Math.min(4.5, Math.max(0.9, touchState.startScale * (dist / touchState.startDistance)));
            applyTouchTransform(false);
          }
        } else if (touchState.isPanning && e.touches.length === 1) {
          const dx = e.touches[0].clientX - touchState.startX;
          const dy = e.touches[0].clientY - touchState.startY;
          touchState.startX = e.touches[0].clientX;
          touchState.startY = e.touches[0].clientY;

          if (touchState.scale > 1.05) {
            touchState.currentX += dx;
            touchState.currentY += dy;
            clampTouchOffsets();
            applyTouchTransform(false);
          } else {
            // Arrastre hacia abajo para cerrar (Pull-down to dismiss)
            touchState.pullY += dy;
            if (touchState.pullY > 0) {
              touchImg.style.transform = `translateY(${touchState.pullY}px) scale(${Math.max(0.7, 1 - touchState.pullY / 800)})`;
              touchModal.style.opacity = Math.max(0.3, 1 - touchState.pullY / 300);
            }
          }
        }
      }, { passive: false });

      touchStage.addEventListener('touchend', (e) => {
        if (touchState.isPinching && e.touches.length < 2) {
          touchState.isPinching = false;
          if (touchState.scale < 1) {
            touchState.scale = 1;
            touchState.currentX = 0;
            touchState.currentY = 0;
          }
          clampTouchOffsets();
          applyTouchTransform(true);
        } else if (touchState.isPanning && e.touches.length === 0) {
          touchState.isPanning = false;
          if (touchState.scale <= 1.05) {
            if (touchState.pullY > 90) {
              closeTouchZoomViewer();
              touchModal.style.opacity = '';
              return;
            } else {
              touchState.scale = 1;
              touchState.currentX = 0;
              touchState.currentY = 0;
              touchModal.style.opacity = '';
              applyTouchTransform(true);
            }
          } else {
            clampTouchOffsets();
            applyTouchTransform(true);
          }
        }
      }, { passive: true });
    }

    if (touchClose) {
      touchClose.addEventListener('click', () => closeTouchZoomViewer());
    }

    // Al hacer clic en la figura de la imagen principal:
    figure.addEventListener('click', (e) => {
      if (isTouchDevice()) {
        // En móvil/táctil: abre inmediatamente el visor inmersivo de pantalla completa con gestos intuitivos
        openTouchZoomViewer();
      } else {
        // En escritorio con ratón: zoom de aumento con seguimiento del cursor
        toggleDesktopZoom(e);
      }
    });

    window._resetModalZoom = () => {
      resetDesktopZoom();
      closeTouchZoomViewer();
    };
  }

  function setupCustomCursor() {
    const cursor = document.getElementById('customCursor');
    if (!cursor || !window.matchMedia('(pointer: fine)').matches) return;

    const cursorText = cursor.querySelector('.custom-cursor__text');

    window.addEventListener('mousemove', (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
      cursor.classList.add('is-visible');
    });

    document.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-visible');
    });

    document.addEventListener('mouseenter', () => {
      cursor.classList.add('is-visible');
    });

    document.addEventListener('mousedown', () => {
      cursor.classList.add('is-clicked');
    });

    document.addEventListener('mouseup', () => {
      cursor.classList.remove('is-clicked');
    });

    document.addEventListener('mouseover', (e) => {
      const zoomFig = e.target.closest('.c-modal-figure');
      if (zoomFig) {
        cursor.classList.add('is-hovering-artwork');
        if (cursorText) {
          cursorText.textContent = zoomFig.classList.contains('is-zoomed') ? 'ALEJAR' : 'ZOOM';
        }
        return;
      }

      const artwork = e.target.closest('.overview-item, .archive-ficha-card');
      if (artwork) {
        cursor.classList.add('is-hovering-artwork');
        if (cursorText) cursorText.textContent = 'VER';
        return;
      }

      const interactive = e.target.closest('a, button, [role="button"], .c-custom-dropdown__option, .c-custom-dropdown__trigger');
      if (interactive) {
        cursor.classList.add('is-hovering-link');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const zoomFig = e.target.closest('.c-modal-figure');
      if (zoomFig) {
        cursor.classList.remove('is-hovering-artwork');
        if (cursorText) cursorText.textContent = '';
      }

      const artwork = e.target.closest('.overview-item, .archive-ficha-card');
      if (artwork) {
        cursor.classList.remove('is-hovering-artwork');
        if (cursorText) cursorText.textContent = '';
      }

      const interactive = e.target.closest('a, button, [role="button"], .c-custom-dropdown__option, .c-custom-dropdown__trigger');
      if (interactive) {
        cursor.classList.remove('is-hovering-link');
      }
    });
  }

  // Inicializar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      setupCustomCursor();
    });
  } else {
    init();
    setupCustomCursor();
  }
})();
