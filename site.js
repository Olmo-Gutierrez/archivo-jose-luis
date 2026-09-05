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
    lastScrollY: 0
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
    modalMainImg: document.getElementById('modalMainImg'),
    modalThumbnails: document.getElementById('modalThumbnails'),
    modalDeblurCompare: document.getElementById('modalDeblurCompare'),
    btnDeblurOrig: document.getElementById('btnDeblurOrig'),
    btnDeblurAI: document.getElementById('btnDeblurAI'),
    modalMetaObra: document.getElementById('modalMetaObra'),
    modalMetaTitulo: document.getElementById('modalMetaTitulo'),
    modalMetaDims: document.getElementById('modalMetaDims'),
    modalMetaFotosCount: document.getElementById('modalMetaFotosCount'),
    modalMetaLamina: document.getElementById('modalMetaLamina'),
    modalMetaMateriales: document.getElementById('modalMetaMateriales'),
    modalArchiveRefCard: document.getElementById('modalArchiveRefCard'),
    modalArchiveRefTitle: document.getElementById('modalArchiveRefTitle'),
    modalArchiveRefText: document.getElementById('modalArchiveRefText'),
    modalArchiveRefButtons: document.getElementById('modalArchiveRefButtons'),
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
    await loadCatalogData();
    updateCategorySelectCounts();
    renderOverview();
    renderArchiveFichas();
    checkInitialHash();
  }

  // 2. Carga de datos del catálogo
  async function loadCatalogData() {
    try {
      let resp = await fetch('data/catalogo_web.json');
      if (!resp.ok) {
        resp = await fetch('./data/catalogo_web.json');
      }
      if (!resp.ok) {
        resp = await fetch('/web/data/catalogo_web.json');
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
          <span class="overview-item__title">${obra.titulo}</span>
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

      const titulosResumen = pagina.obras_titulos.join(', ');

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

    // Navegación con Historial (Atrás del navegador y gesto móvil)
    window.addEventListener('popstate', () => {
      if (state.activeModalObra || state.activeModalPagina) {
        closeModal(false);
      }
    });
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

    state.activeModalObra = obra;
    state.activeModalPagina = null;
    state.activePhotoIndex = 0;
    state.isDeblurSelected = false;
    state.showingFicha = false;

    if (pushHistory) {
      history.pushState({ modalOpen: true, obraId: obra.id }, '', '#obra-' + obra.numero_str);
    }

    // Deshacer de cualquier tarjeta redundante de múltiples láminas
    if (dom.modalArchiveRefCard) {
      dom.modalArchiveRefCard.style.display = 'none';
      dom.modalArchiveRefCard.innerHTML = '';
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
      dom.modalMetaTitulo.innerHTML = `Obra ${obra.numero_str} · ${obra.categoria_nombre} <br><span class="curatorial-badge-orig">Título original documentado</span>`;
    } else {
      dom.modalMetaTitulo.innerHTML = `Obra ${obra.numero_str} · ${obra.categoria_nombre} <br><span class="curatorial-badge-attr">* Título atribuido para catalogación</span>`;
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

    // Mostrar modal y bloquear scroll de fondo
    dom.obraModal.classList.add('is-active');
    lockBodyScroll();
  }

  // 12. Modal de Lámina de Archivo Histórico (Al pulsar en sección Archivo)
  function openFichaModal(pagina, pushHistory = true) {
    if (!state.activeModalObra && !state.activeModalPagina) {
      state.lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
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
    dom.modalMetaFotosCount.textContent = `${pagina.num_obras} ${pagina.num_obras === 1 ? 'obra catalogada' : 'obras catalogadas'}`;
    dom.modalMetaMateriales.textContent = 'Cartulina histórica de archivo, fotografías montadas por el artista y anotaciones autógrafas.';

    if (dom.modalMetaLamina) {
      dom.modalMetaLamina.textContent = `Lámina ${pagina.numero_str}`;
    }

    // Tarjeta con las esculturas que contiene esta lámina
    if (dom.modalArchiveRefCard && dom.modalArchiveRefText && dom.modalArchiveRefButtons) {
      dom.modalArchiveRefCard.style.display = 'flex';
      dom.modalArchiveRefTitle.textContent = 'Esculturas en esta lámina';
      dom.modalArchiveRefButtons.innerHTML = '';

      if (pagina.num_obras > 1) {
        dom.modalArchiveRefText.innerHTML = `Esta lámina de cartulina contiene fotografías de <strong>${pagina.num_obras} obras distintas</strong> del artista:`;
      } else {
        dom.modalArchiveRefText.innerHTML = `Esta lámina de cartulina documenta la siguiente escultura:`;
      }

      pagina.obras_ids.forEach((oId) => {
        const obraObj = state.obras.find(o => o.id === oId);
        if (obraObj) {
          const btn = document.createElement('button');
          btn.className = 'c-modal-archive-ref-btn';
          btn.textContent = `Ver Obra ${obraObj.numero_str} (${obraObj.titulo}) →`;
          btn.addEventListener('click', () => openModal(obraObj));
          dom.modalArchiveRefButtons.appendChild(btn);
        }
      });
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
    state.activeModalObra = null;
    state.activeModalPagina = null;
    dom.obraModal.classList.remove('is-active');
    unlockBodyScroll();

    if (updateHistory && window.location.hash) {
      try {
        history.pushState(null, '', window.location.pathname + window.location.search);
      } catch (e) {}
    }
  }

  function navigateModal(direction) {
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
      const numStr = hash.replace('#obra-', '');
      const obra = state.obras.find((o) => o.numero_str === numStr);
      if (obra) openModal(obra, false);
    } else if (hash.startsWith('#lamina-')) {
      const numStr = hash.replace('#lamina-', '');
      const pag = state.paginas.find((p) => p.numero_str === numStr);
      if (pag) openFichaModal(pag, false);
    }
  }

  // 13. Cursor personalizado interactivo (Gregor Collienne Style)
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

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.overview-item, .archive-ficha-card');
      if (target) {
        cursor.classList.add('is-hovering-artwork');
        if (cursorText) cursorText.textContent = 'VER';
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('.overview-item, .archive-ficha-card');
      if (target) {
        cursor.classList.remove('is-hovering-artwork');
        if (cursorText) cursorText.textContent = '';
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
