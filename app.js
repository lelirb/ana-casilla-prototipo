/* ==========================================================================
   ANA · Sistema de Notificación Electrónica · prototipo
   Un solo archivo. Cada pantalla se activa por <body data-pagina="...">.
     1. Utilidades compartidas: avisos en vivo, menús, desplegables
     2. Ingreso
     3. Bandeja unificada
     4. Nuevo documento (TUPA 2, persona natural)
   Sin dependencias. Los datos son de ejemplo.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const ICONOS = '';   /* los íconos están dentro de cada página: href="#id" */
  const icono = (id, extra = '') =>
    `<svg class="icono ${extra}" aria-hidden="true" focusable="false"><use href="${ICONOS}#${id}"></use></svg>`;
  const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------------------------------
     1. COMPARTIDO
     ------------------------------------------------------------------------ */

  /* Aviso en vivo: una región role="status" siempre presente para el lector
     de pantalla, y una notificación visible que se cierra sola. */
  let temporizador = null;
  function notificar(texto) {
    const region = $('#anuncio');
    if (region) {
      region.textContent = '';
      setTimeout(() => { region.textContent = texto; }, 60);
    }
    const caja = $('#notificacion');
    if (!caja) return;
    $('.notificacion__texto', caja).textContent = texto;
    caja.hidden = false;
    programarCierre();
    apartarSiTapa(document.activeElement);
  }
  // 2.2.1: el aviso se queda mientras el puntero o el foco están sobre él.
  function programarCierre() {
    const caja = $('#notificacion');
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { caja.hidden = true; }, 7000);
  }
  // 2.4.11: si el aviso tapa el elemento enfocado, se oculta (el texto ya se anunció en #anuncio).
  function apartarSiTapa(el) {
    const caja = $('#notificacion');
    if (!caja || caja.hidden || !el || el === document.body || caja.contains(el)) return;
    const a = el.getBoundingClientRect(), b = caja.getBoundingClientRect();
    if (a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom) caja.hidden = true;
  }
  function iniciarNotificacion() {
    const caja = $('#notificacion');
    if (!caja) return;
    const cerrar = $('[data-cerrar]', caja);
    const quitar = () => {
      const tenia = caja.contains(document.activeElement);
      caja.hidden = true;
      if (tenia && ultimoFoco && document.contains(ultimoFoco)) ultimoFoco.focus();
    };
    let ultimoFoco = null;
    if (cerrar) cerrar.addEventListener('click', quitar);
    caja.addEventListener('keydown', (e) => { if (e.key === 'Escape') quitar(); });
    ['mouseenter', 'focusin'].forEach((t) => caja.addEventListener(t, () => clearTimeout(temporizador)));
    ['mouseleave', 'focusout'].forEach((t) => caja.addEventListener(t, (e) => {
      if (t === 'focusout' && caja.contains(e.relatedTarget)) return;
      if (!caja.hidden) programarCierre();
    }));
    document.addEventListener('focusin', (e) => {
      if (!caja.contains(e.target)) { ultimoFoco = e.target; apartarSiTapa(e.target); }
    });
  }

  /* Enlaces que en el prototipo no llevan a ningún lado */
  function iniciarFueraDeAlcance() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-fuera-de-alcance]');
      if (!el) return;
      e.preventDefault();
      cerrarMenus();
      notificar(el.dataset.fueraDeAlcance || 'Esta pantalla no forma parte del prototipo.');
    });
  }

  /* Menú de botón (patrón menu button de WAI-ARIA).
     <button aria-haspopup="menu" aria-expanded aria-controls> + <ul role="menu"> */
  function cerrarMenus(excepto) {
    $$('[aria-haspopup="menu"][aria-expanded="true"]').forEach((b) => {
      if (b === excepto) return;
      b.setAttribute('aria-expanded', 'false');
      const m = document.getElementById(b.getAttribute('aria-controls'));
      if (m) m.hidden = true;
    });
  }
  function abrirMenu(boton, enfocar) {
    cerrarMenus(boton);
    const menu = document.getElementById(boton.getAttribute('aria-controls'));
    boton.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    const items = $$('[role="menuitem"]', menu);
    if (enfocar === 'ultimo') items[items.length - 1].focus();
    else if (enfocar !== false) items[0].focus();
  }
  function iniciarMenus() {
    document.addEventListener('click', (e) => {
      const boton = e.target.closest('[aria-haspopup="menu"]');
      if (boton) {
        const abierto = boton.getAttribute('aria-expanded') === 'true';
        if (abierto) cerrarMenus(); else abrirMenu(boton, e.detail === 0 ? 'primero' : false);
        return;
      }
      if (!e.target.closest('[role="menu"]')) cerrarMenus();
    });
    document.addEventListener('keydown', (e) => {
      const boton = e.target.closest && e.target.closest('[aria-haspopup="menu"]');
      if (boton && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        abrirMenu(boton, e.key === 'ArrowUp' ? 'ultimo' : 'primero');
        return;
      }
      const menu = e.target.closest && e.target.closest('[role="menu"]');
      if (!menu) return;
      const items = $$('[role="menuitem"]', menu);
      const i = items.indexOf(document.activeElement);
      const disparador = document.querySelector(`[aria-controls="${menu.id}"]`);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); cerrarMenus(); disparador && disparador.focus(); }
      else if (e.key === 'Tab') { cerrarMenus(); }
    });
  }

  /* Desplegable (patrón disclosure): <button aria-expanded aria-controls> */
  function iniciarDesplegables() {
    $$('[data-desplegable]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const abierto = boton.getAttribute('aria-expanded') === 'true';
        boton.setAttribute('aria-expanded', String(!abierto));
        document.getElementById(boton.getAttribute('aria-controls')).hidden = abierto;
      });
    });
  }

  /* Validación de campos: marca el control, muestra el mensaje y lo enlaza */
  function marcarError(control, mensaje) {
    const id = control.id + '-error';
    let error = document.getElementById(id);
    if (!error) return;
    if (mensaje) {
      control.setAttribute('aria-invalid', 'true');
      $('.campo__error-texto', error).textContent = mensaje;
      error.hidden = false;
    } else {
      control.removeAttribute('aria-invalid');
      error.hidden = true;
    }
  }

  /* Resumen de errores al inicio del formulario (WCAG 3.3.1) */
  function mostrarResumen(contenedor, errores, enfocar = true) {
    if (!contenedor) return;
    if (!errores.length) { contenedor.hidden = true; contenedor.innerHTML = ''; return; }
    const n = errores.length;
    contenedor.innerHTML =
      `${icono('alerta')}<div><p class="aviso__titulo">${n === 1 ? 'Hay 1 dato por corregir' : `Hay ${n} datos por corregir`}</p>` +
      `<ul>${errores.map((e) => `<li><a href="#${e.id}">${escapar(e.texto)}</a></li>`).join('')}</ul></div>`;
    contenedor.hidden = false;
    if (enfocar) contenedor.focus();
  }

  /* Peso con coma decimal, como se escribe en Perú: 0,03 MB */
  const mb = (bytes) => {
    const v = bytes / (1024 * 1024);
    if (v > 0 && v < 0.01) return 'menos de 0,01 MB';
    return v.toFixed(2).replace('.', ',') + ' MB';
  };
  const MAX_BYTES = 400 * 1024 * 1024;

  /* Combo con buscador (patrón combobox de ARIA 1.2, lista con filtro).
     Toma un <select> como fuente y como guardián del valor: el select queda
     oculto y recibe el valor elegido con su evento «change», así el resto del
     código sigue leyendo select.value. Los <optgroup> se pintan como grupos. */
  const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function crearCombo(select) {
    if (select.dataset.combo) return select._combo;
    select.dataset.combo = '1';
    const id = select.id;
    const caja = document.createElement('div');
    caja.className = 'combo';
    caja.innerHTML = `
      <input class="campo__control combo__entrada" id="${id}-entrada" type="text" role="combobox"
             aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-lista" autocomplete="off"
             aria-describedby="${id}-instruccion">
      <span class="combo__flecha" aria-hidden="true">${icono('chevron-abajo')}</span>
      <div class="combo__panel" hidden>
        <p class="combo__cantidad" id="${id}-cantidad"></p>
        <div class="combo__lista" id="${id}-lista" role="listbox" aria-labelledby="${id}-etiqueta"></div>
      </div>
      <span class="visualmente-oculto" id="${id}-instruccion">Escribe para filtrar la lista. Usa las flechas para recorrerla y Enter para elegir.</span>`;
    select.after(caja);
    select.hidden = true;
    select.tabIndex = -1;
    const entrada = $('.combo__entrada', caja), panel = $('.combo__panel', caja), lista = $('.combo__lista', caja), cantidad = $('.combo__cantidad', caja);
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) { label.htmlFor = `${id}-entrada`; label.id = label.id || `${id}-etiqueta`; lista.setAttribute('aria-labelledby', label.id); }
    let activa = -1, visibles = [];

    const opciones = () => Array.from(select.options).map((o) => ({ valor: o.value, texto: o.text, grupo: o.parentElement.tagName === 'OPTGROUP' ? o.parentElement.label : '' }));
    const textoElegido = () => (select.selectedIndex >= 0 ? select.options[select.selectedIndex].text : '');
    function pintar(filtro) {
      const f = sinTildes(filtro.trim());
      const todas = opciones();
      visibles = f ? todas.filter((o) => sinTildes(o.texto).includes(f)) : todas;
      const grupos = [];
      visibles.forEach((o) => { let g = grupos.find((x) => x.nombre === o.grupo); if (!g) { g = { nombre: o.grupo, items: [] }; grupos.push(g); } g.items.push(o); });
      let n = 0;
      const opcion = (o) => {
        const i = n++;
        const sel = o.valor === select.value;
        return `<div class="combo__opcion${sel ? ' combo__opcion--elegida' : ''}" role="option" id="${id}-op-${i}" data-i="${i}" aria-selected="${sel}">${escapar(o.texto)}${sel ? icono('check', 'combo__marca') : ''}</div>`;
      };
      lista.innerHTML = grupos.map((g, gi) => g.nombre
        ? `<div role="group" aria-labelledby="${id}-g-${gi}"><div class="combo__grupo" id="${id}-g-${gi}" role="presentation">${escapar(g.nombre)}</div>${g.items.map(opcion).join('')}</div>`
        : g.items.map(opcion).join('')).join('');
      const reales = visibles.filter((o) => o.valor !== '').length;
      cantidad.textContent = !visibles.length
        ? `No hay procedimientos con «${filtro.trim()}». Prueba con otra palabra.`
        : f ? `${reales} ${reales === 1 ? 'resultado' : 'resultados'} para «${filtro.trim()}»`
            : `${reales} ${reales === 1 ? 'procedimiento' : 'procedimientos'}`;
      activa = -1;
      entrada.removeAttribute('aria-activedescendant');
    }
    let tAnuncio = null;
    const anunciar = () => { clearTimeout(tAnuncio); tAnuncio = setTimeout(() => notificarSoloLector(cantidad.textContent), 500); };
    function abrir(filtro = '') {
      pintar(filtro);
      panel.hidden = false;
      entrada.setAttribute('aria-expanded', 'true');
      caja.classList.add('combo--abierto');
      const elegida = visibles.findIndex((o) => o.valor === select.value);
      if (!filtro && elegida >= 0) mover(elegida);
    }
    function cerrar(restaurar = true) {
      panel.hidden = true;
      entrada.setAttribute('aria-expanded', 'false');
      entrada.removeAttribute('aria-activedescendant');
      caja.classList.remove('combo--abierto');
      if (restaurar) entrada.value = textoElegido();
    }
    function mover(i) {
      if (!visibles.length) return;
      activa = (i + visibles.length) % visibles.length;
      $$('.combo__opcion', lista).forEach((el) => el.classList.toggle('combo__opcion--activa', Number(el.dataset.i) === activa));
      const el = $(`#${id}-op-${activa}`);
      entrada.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView({ block: 'nearest' });
    }
    function elegir(i) {
      const o = visibles[i];
      if (!o) return;
      const cambio = select.value !== o.valor;
      select.value = o.valor;
      cerrar();
      if (cambio) select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    entrada.addEventListener('click', () => { if (panel.hidden) { abrir(); entrada.select(); } });
    $('.combo__flecha', caja).addEventListener('click', () => { entrada.focus(); if (panel.hidden) abrir(); else cerrar(); });
    entrada.addEventListener('input', () => { abrir(entrada.value); anunciar(); });
    entrada.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (panel.hidden) abrir(); else mover(activa + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (panel.hidden) abrir(); else mover(activa - 1); }
      else if (e.key === 'Home' && !panel.hidden && !entrada.value) { e.preventDefault(); mover(0); }
      else if (e.key === 'End' && !panel.hidden && !entrada.value) { e.preventDefault(); mover(visibles.length - 1); }
      else if (e.key === 'Enter') { if (!panel.hidden) { e.preventDefault(); if (activa >= 0) elegir(activa); else if (visibles.length === 1) elegir(0); } }
      else if (e.key === 'Escape') { if (!panel.hidden) { e.preventDefault(); e.stopPropagation(); cerrar(); } }
      else if (e.key === 'Tab') { if (!panel.hidden) cerrar(); }
    });
    lista.addEventListener('mousedown', (e) => e.preventDefault());   // el foco se queda en la entrada
    lista.addEventListener('click', (e) => { const op = e.target.closest('[role="option"]'); if (op) elegir(Number(op.dataset.i)); });
    document.addEventListener('mousedown', (e) => { if (!caja.contains(e.target) && !panel.hidden) cerrar(); });
    entrada.addEventListener('blur', () => { setTimeout(() => { if (!caja.contains(document.activeElement) && !panel.hidden) cerrar(); }, 0); });
    const api = { refrescar() { entrada.value = textoElegido(); if (!panel.hidden) pintar(''); }, entrada };
    select._combo = api;
    api.refrescar();
    return api;
  }

  /* ------------------------------------------------------------------------
     2. INGRESO
     ------------------------------------------------------------------------ */
  function iniciarIngreso() {
    const form = $('#form-ingreso');
    const doc = $('#documento');
    const clave = $('#clave');
    const ver = $('#ver-clave');

    ver.addEventListener('click', () => {
      const visible = clave.type === 'text';
      clave.type = visible ? 'password' : 'text';
      ver.setAttribute('aria-pressed', String(!visible));
      ver.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
      $('use', ver).setAttribute('href', `${ICONOS}#${visible ? 'ojo' : 'ojo-tachado'}`);
    });

    doc.addEventListener('input', () => {
      const limpio = doc.value.replace(/\D/g, '').slice(0, 11);
      if (limpio !== doc.value) doc.value = limpio;
      if (doc.getAttribute('aria-invalid')) marcarError(doc, '');
    });
    clave.addEventListener('input', () => { if (clave.getAttribute('aria-invalid')) marcarError(clave, ''); });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const errores = [];
      const v = doc.value.trim();
      if (!v) errores.push([doc, 'Escribe tu DNI o RUC.']);
      else if (v.length !== 8 && v.length !== 11) errores.push([doc, 'El DNI tiene 8 dígitos y el RUC tiene 11. Revisa el número.']);
      if (!clave.value) errores.push([clave, 'Escribe tu contraseña.']);
      marcarError(doc, ''); marcarError(clave, '');
      errores.forEach(([c, m]) => marcarError(c, m));
      if (errores.length) { errores[0][0].focus(); return; }
      const boton = $('[type="submit"]', form);
      boton.setAttribute('aria-disabled', 'true');
      boton.textContent = 'Ingresando…';
      try { sessionStorage.setItem('ana-casilla-perfil', v.length === 11 ? 'juridica' : 'natural'); } catch (e) { /* sin almacenamiento: queda persona natural */ }
      window.location.href = 'bandeja.html';
    });
  }

  /* ------------------------------------------------------------------------
     3. BANDEJA UNIFICADA
     ------------------------------------------------------------------------ */
  // Ilustraciones del componente «Estado vacío» (decorativas)
  const ILU_VACIO = {
    'sin-tramites': '<svg class="vacio__ilustracion" viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" focusable="false"><path class="ilu-t ilu-r" d="M34 18h36l18 18v62a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z"/><path class="ilu-t ilu-b" d="M70 18v18h18"/><path class="ilu-t" d="M40 46L62 46"/><path class="ilu-t" d="M40 56L76 56"/><path class="ilu-t" d="M40 66L70 66"/><circle class="ilu-t ilu-b" cx="84" cy="86" r="14"/><path class="ilu-t" d="M84 79L84 93"/><path class="ilu-t" d="M77 86L91 86"/></svg>',
    'sin-resultados': '<svg class="vacio__ilustracion" viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" focusable="false"><path class="ilu-t ilu-r" d="M22 64l10-28h56l10 28v28a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4z"/><path class="ilu-t ilu-b" d="M22 64h22a16 10 0 0 0 32 0h22"/><path class="ilu-t" d="M48 22L44 16"/><path class="ilu-t" d="M60 20L60 12"/><path class="ilu-t" d="M72 22L76 16"/></svg>',
  };
  const ESTADOS = {
    'En revisión': { clase: 'en-revision', icono: 'reloj' },
    'Validado': { clase: 'validado', icono: 'check' },
    'Observado': { clase: 'observado', icono: 'error' },
    'Archivado': { clase: 'archivado', icono: 'archivo' },
    'Finalizado': { clase: 'finalizado', icono: 'sobre-abierto' }
  };

  /* Datos de ejemplo. fecha y validación en dd/mm/aaaa · hh:mm:ss */
  const TRAMITES = [
    ['68942-2026', 'NO TUPA', '04/10/2026', '20:20:35', null, null, 'Remisión de información complementaria del expediente 102998-2026', 'Carta S/N', 'En revisión', 4, false],
    ['68941-2026', 'NO TUPA', '04/10/2026', '19:42:56', null, null, 'Información complementaria sobre el caudal de captación', 'Carta S/N', 'En revisión', 4, false],
    ['68938-2026', 'NO TUPA', '03/10/2026', '20:00:16', null, null, 'Entrega de plano de ubicación actualizado', 'Carta S/N', 'En revisión', 4, false],
    ['68937-2026', 'TUPA', '03/10/2026', '19:51:14', '104337-2026', null, 'Permiso de uso de agua para épocas de superávit hídrico', 'Solicitud 014-2026', 'Observado', 4, false],
    ['68935-2026', 'NO TUPA', '03/10/2026', '19:27:23', null, null, 'Información complementaria', 'Carta 02', 'En revisión', 3, false],
    ['68934-2026', 'TUPA', '03/10/2026', '19:12:22', '104335-2026', ['03/10/2026', '19:30:51'], 'Solicitud de acceso a la información pública', 'Formulario AIP 2111-2026', 'Validado', 2, false],
    ['68932-2026', 'NO TUPA', '03/10/2026', '19:06:02', '104336-2026', ['03/10/2026', '19:31:28'], 'Opinión técnica vinculante sobre instrumento de gestión ambiental', 'Carta S/N', 'Validado', 4, false],
    ['68927-2026', 'NO TUPA', '03/10/2026', '13:53:48', '104330-2026', ['03/10/2026', '13:56:23'], 'Solicitud de constancia de uso de agua', 'Carta CART5464', 'Validado', 2, true],
    ['68893-2026', 'NO TUPA', '01/10/2026', '20:14:55', null, null, 'Bienes y servicios menores a 8 UIT · Orden de servicio 0001-2026', 'Carta 012-2026', 'En revisión', 5, false],
    ['68891-2026', 'TUPA', '01/10/2026', '20:05:50', '104302-2026', null, 'Permiso de uso de agua para épocas de superávit hídrico', 'Solicitud 012-2026', 'Observado', 5, false],
    ['68850-2026', 'TUPA', '29/09/2026', '10:12:04', '104251-2026', ['29/09/2026', '11:02:40'], 'Solicitud de acceso a la información pública', 'Formulario AIP 2088-2026', 'Finalizado', 1, false],
    ['68812-2026', 'TUPA', '26/09/2026', '16:40:11', '104230-2026', ['26/09/2026', '17:15:02'], 'Permiso de uso de agua para épocas de superávit hídrico', 'Solicitud 011-2026', 'Finalizado', 5, false],
    ['68790-2026', 'NO TUPA', '25/09/2026', '09:05:33', null, null, 'Entrega de documentos fuera de plazo', 'Carta S/N', 'Archivado', 1, false],
    ['68771-2026', 'NO TUPA', '24/09/2026', '15:22:47', '104201-2026', ['24/09/2026', '16:00:10'], 'Opinión técnica vinculante de proyecto de exploración minera', 'Carta 045-2026', 'Validado', 3, false],
    ['68745-2026', 'NO TUPA', '22/09/2026', '11:48:20', '104188-2026', ['22/09/2026', '12:10:55'], 'Información complementaria del expediente 104120-2026', 'Carta 07', 'Finalizado', 2, false],
    ['68730-2026', 'NO TUPA', '19/09/2026', '18:30:02', null, null, 'Consulta sobre requisitos de licencia de uso de agua', 'Carta S/N', 'Archivado', 1, false],
    ['68702-2026', 'TUPA', '17/09/2026', '08:55:41', '104150-2026', ['17/09/2026', '09:40:13'], 'Solicitud de acceso a la información pública', 'Formulario AIP 2010-2026', 'Finalizado', 1, false],
    ['68688-2026', 'NO TUPA', '16/09/2026', '14:03:27', '104141-2026', ['16/09/2026', '14:44:00'], 'Bienes y servicios menores a 8 UIT · Orden de servicio 0187-2026', 'Carta 031-2026', 'Validado', 3, false],
    ['68661-2026', 'TUPA', '15/09/2026', '10:17:39', '104133-2026', ['15/09/2026', '11:20:05'], 'Permiso de uso de agua para épocas de superávit hídrico', 'Solicitud 009-2026', 'Finalizado', 5, false]
  ].map(([ticket, tipo, fecha, hora, cut, validacion, asunto, documento, estado, archivos, nueva]) =>
    ({ ticket, tipo, fecha, hora, cut, validacion, asunto, documento, estado, archivos, nueva }))
   .sort((a, b) => aFecha(b.fecha, b.hora) - aFecha(a.fecha, a.hora));
  /* Procedimiento de cada trámite de ejemplo (para el filtro «Procedimiento») */
  TRAMITES.forEach((t) => {
    const a = t.asunto.toLowerCase();
    t.proc = t.tipo === 'TUPA'
      ? (a.includes('acceso a la información') ? '1' : a.includes('superávit') ? '2' : '')
      : (a.includes('bienes y servicios') ? 'bienes' : a.includes('exploración minera') ? 'minera' : a.includes('gestión ambiental') ? 'iga' : 'otros');
  });

  // El acuse se registra en el detalle; la bandeja lo lee al volver (solo en esta pestaña).
  const CLAVE_ACUSES = 'ana-casilla-acuses';
  function leerAcuses() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE_ACUSES)) || {}; } catch (e) { return {}; }
  }
  function guardarAcuse(ticket, fecha) {
    const a = leerAcuses(); a[ticket] = fecha;
    try { sessionStorage.setItem(CLAVE_ACUSES, JSON.stringify(a)); } catch (e) { /* sin almacenamiento: vale solo para esta vista */ }
  }
  function aplicarAcuses() {
    const a = leerAcuses();
    TRAMITES.forEach((t) => {
      if (a[t.ticket]) { t.nueva = false; t.estado = 'Finalizado'; t.acuse = a[t.ticket]; }
      if (a['subsanado:' + t.ticket]) { t.estado = 'En revisión'; t.subsanado = a['subsanado:' + t.ticket]; }
    });
  }

  /* Perfil de la sesión: DNI → persona natural, RUC → persona jurídica (datos de ejemplo) */
  const PERFILES = {
    natural: { tipo: 'natural', nombre: 'Ana Quispe Mamani', doc: 'DNI 46810236', iniciales: 'AQ', docTipo: 'Documento', nombreTipo: 'Nombres y apellidos' },
    juridica: { tipo: 'juridica', nombre: 'Empresa Minera Buenafe S.A.C.', doc: 'RUC 20512345678', iniciales: 'MB', docTipo: 'RUC', nombreTipo: 'Razón social' }
  };
  function leerPerfil() {
    try { return PERFILES[sessionStorage.getItem('ana-casilla-perfil')] || PERFILES.natural; } catch (e) { return PERFILES.natural; }
  }
  const PERFIL = leerPerfil();
  function aplicarPerfil() {
    const b = $('.usuario__boton');
    if (b) b.setAttribute('aria-label', `${PERFIL.nombre}, ${PERFIL.doc}, menú de tu cuenta`);
    $$('.usuario__avatar').forEach((e) => { e.textContent = PERFIL.iniciales; });
    $$('.usuario__nombre, .js-perfil-nombre').forEach((e) => { e.textContent = PERFIL.nombre; });
    $$('.usuario__doc, .js-perfil-doc').forEach((e) => { e.textContent = PERFIL.doc; });
    $$('.js-perfil-doc-tipo').forEach((e) => { e.textContent = PERFIL.docTipo; });
    $$('.js-perfil-nombre-tipo').forEach((e) => { e.textContent = PERFIL.nombreTipo; });
    $$('.js-solo-juridica').forEach((e) => { e.hidden = PERFIL.tipo !== 'juridica'; });
  }

  function aFecha(dmy, hms = '00:00:00') {
    const [d, m, y] = dmy.split('/').map(Number);
    const [h, mi, s] = hms.split(':').map(Number);
    return new Date(y, m - 1, d, h, mi, s).getTime();
  }
  function fechaValida(texto) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) return false;
    const [d, m, y] = texto.split('/').map(Number);
    const f = new Date(y, m - 1, d);
    return f.getFullYear() === y && f.getMonth() === m - 1 && f.getDate() === d;
  }

  function iniciarBandeja() {
    aplicarAcuses();
    // Demostración del estado «Aún no tienes trámites»: bandeja.html#sin-tramites
    const sinTramites = location.hash === '#sin-tramites';
    if (sinTramites) TRAMITES.length = 0;
    const form = $('#form-filtros');
    const cuerpo = $('#tabla-cuerpo');
    const resumen = $('#paginador-resumen');
    const paginas = $('#paginador-paginas');
    const porPagina = $('#por-pagina');
    const fInicio = $('#f-inicio');
    const fFin = $('#f-fin');
    let filtrados = TRAMITES.slice();
    let pagina = 1;
    let orden = { col: 'registro', dir: 'desc' };

    /* Valor con el que se ordena cada columna */
    const CLAVES = {
      ticket: (t) => t.ticket,
      registro: (t) => aFecha(t.fecha, t.hora),
      cut: (t) => t.cut || '',
      validacion: (t) => (t.validacion ? aFecha(t.validacion[0], t.validacion[1]) : 0),
      asunto: (t) => t.asunto.toLowerCase(),
      documento: (t) => t.documento.toLowerCase(),
      estado: (t) => t.estado
    };
    function ordenar() {
      const k = CLAVES[orden.col];
      const s = orden.dir === 'asc' ? 1 : -1;
      /* Las nuevas respuestas siempre van primero, como en Figma; dentro de cada grupo, el orden elegido */
      filtrados.sort((a, b) => (b.nueva - a.nueva) || (k(a) > k(b) ? s : k(a) < k(b) ? -s : 0));
    }
    function pintarEncabezados() {
      $$('.tabla thead th[data-orden]').forEach((th) => {
        const activa = th.dataset.orden === orden.col;
        if (activa) th.setAttribute('aria-sort', orden.dir === 'asc' ? 'ascending' : 'descending');
        else th.removeAttribute('aria-sort');
        $('use', th).setAttribute('href', `#${activa ? (orden.dir === 'asc' ? 'orden-asc' : 'orden-desc') : 'orden'}`);
      });
    }

    function fila(t) {
      const clase = t.nueva ? 'fila--nueva' : t.estado === 'Observado' ? 'fila--observado' : '';
      const validacion = t.validacion
        ? `<span class="tabla__fecha">${t.validacion[0]}</span><span class="tabla__hora">${t.validacion[1]}</span>`
        : '<span class="tabla__sin">Sin validar</span>';
      const nueva = t.nueva ? `<span class="marca-nueva">${icono('sobre')}Nueva respuesta</span>` : '';
      return `<tr class="${clase}" data-ticket="${t.ticket}">
        <td>
          <div class="tabla__acciones">
            ${t.estado === 'Archivado'
              ? `<button type="button" class="accion accion--ver" aria-label="Ver trámite ${t.ticket}" data-fuera-de-alcance="El detalle de un trámite archivado todavía no está diseñado.">${icono('ojo')}</button>`
              : `<a class="accion accion--ver" href="detalle.html#${t.ticket}" aria-label="Ver trámite ${t.ticket}">${icono('ojo')}</a>`}
            <div class="acciones-fila">
              <button type="button" class="accion" aria-label="Más acciones del trámite ${t.ticket}" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-${t.ticket}">${icono('mas-acciones')}</button>
              <ul class="menu" role="menu" id="menu-${t.ticket}" aria-label="Acciones del trámite ${t.ticket}" hidden>
                <li role="none"><button type="button" role="menuitem" class="menu__item" data-hoja>${icono('descargar')}Descargar hoja de envío</button></li>
                <li role="none"><button type="button" role="menuitem" class="menu__item" data-copiar>${icono('copiar')}Copiar N° de ticket</button></li>
              </ul>
            </div>
          </div>
        </td>
        <th scope="row" class="tabla__ticket">${t.ticket}</th>
        <td><span class="tabla__fecha">${t.fecha}</span><span class="tabla__hora">${t.hora}</span></td>
        <td>${t.cut ? `<span class="tabla__cut">${t.cut}</span>` : '<span class="tabla__sin">Aún sin CUT</span>'}</td>
        <td>${validacion}</td>
        <td><div class="tabla__asunto"><span>${escapar(t.asunto)}</span>${nueva}</div></td>
        <td class="tabla__documento">${escapar(t.documento)}</td>
        <td><span class="estado estado--${ESTADOS[t.estado].clase}">${t.estado}</span></td>
        <td><span class="tabla__archivos">${t.archivos}<span class="visualmente-oculto"> ${t.archivos === 1 ? 'archivo' : 'archivos'}</span>${icono('clip')}</span></td>
      </tr>`;
    }

    function pintar(anunciar) {
      ordenar();
      pintarEncabezados();
      const tam = Number(porPagina.value);
      const total = filtrados.length;
      const nPaginas = Math.max(1, Math.ceil(total / tam));
      pagina = Math.min(pagina, nPaginas);
      const desde = (pagina - 1) * tam;
      const lote = filtrados.slice(desde, desde + tam);

      cuerpo.innerHTML = lote.length
        ? lote.map(fila).join('')
        : `<tr><td colspan="9" class="tabla__vacia">${sinTramites
            ? estadoVacio('sin-tramites', '<strong class="vacio__titulo vacio__titulo--seccion">Aún no tienes trámites</strong>Aquí verás el listado de tus trámites. Puedes empezar presentando un nuevo documento.')
            : estadoVacio('sin-resultados', 'No hay resultados con esos filtros. Prueba con otros o limpia la búsqueda.')}</td></tr>`;

      const texto = total
        ? `Mostrando ${desde + 1}–${desde + lote.length} de ${total} ${total === 1 ? 'trámite' : 'trámites'}`
        : (sinTramites ? 'Aún no tienes trámites' : 'No hay trámites con esos filtros');
      resumen.textContent = texto;

      let botones = `<li><button type="button" class="paginador__pagina" data-ir="${pagina - 1}"${pagina === 1 ? ' disabled' : ''}>Anterior</button></li>`;
      for (let p = 1; p <= nPaginas; p++) {
        botones += `<li><button type="button" class="paginador__pagina" data-ir="${p}"${p === pagina ? ' aria-current="page"' : ''} aria-label="Página ${p}">${p}</button></li>`;
      }
      botones += `<li><button type="button" class="paginador__pagina" data-ir="${pagina + 1}"${pagina === nPaginas ? ' disabled' : ''}>Siguiente</button></li>`;
      paginas.innerHTML = botones;

      if (anunciar) notificar(texto + '.');
    }

    /* Las fechas llegan del selector nativo como aaaa-mm-dd */
    const desdeIso = (v) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
    [fInicio, fFin].forEach((c) => c.addEventListener('change', () => marcarError(c, '')));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#f-buscar').value.trim().toLowerCase();
      const tipo = $('#f-tipo').value;
      const proc = $('#f-proc').value;
      const estado = $('#f-estado').value;
      const ini = fInicio.value;
      const fin = fFin.value;

      marcarError(fInicio, ''); marcarError(fFin, '');
      if (ini && fin && desdeIso(fin) < desdeIso(ini)) {
        marcarError(fFin, 'La fecha fin no puede ser anterior a la fecha inicio.');
        fFin.focus();
        return;
      }
      filtrados = TRAMITES.filter((t) => {
        if (q && ![t.ticket, t.cut || '', t.asunto, t.documento].join(' ').toLowerCase().includes(q)) return false;
        if (tipo && t.tipo !== tipo) return false;
        if (proc && t.proc !== proc) return false;
        if (estado && t.estado !== estado) return false;
        const f = aFecha(t.fecha);
        if (ini && f < desdeIso(ini)) return false;
        if (fin && f > desdeIso(fin)) return false;
        return true;
      });
      pagina = 1;
      pintar(true);
    });

    /* Procedimiento depende del tipo: TUPA, NO TUPA o los dos grupos con «Todos» */
    const fTipo = $('#f-tipo'), fProc = $('#f-proc');
    function llenarFiltroProc() {
      const antes = fProc.value;
      const grupo = (k) => `<optgroup label="${k} · ${PROCEDIMIENTOS[k].length}">${PROCEDIMIENTOS[k].map(([v, t]) => `<option value="${v}">${escapar(t)}</option>`).join('')}</optgroup>`;
      const tipos = fTipo.value ? [fTipo.value] : Object.keys(PROCEDIMIENTOS);
      fProc.innerHTML = '<option value="">Todos</option>' + (tipos.length > 1 ? tipos.map(grupo).join('')
        : PROCEDIMIENTOS[tipos[0]].map(([v, t]) => `<option value="${v}">${escapar(t)}</option>`).join(''));
      const sigue = Array.from(fProc.options).some((o) => o.value === antes);
      fProc.value = sigue ? antes : '';
      crearCombo(fProc).refrescar();
      return antes && !sigue;
    }
    fTipo.addEventListener('change', () => {
      const volvio = llenarFiltroProc();
      notificarSoloLector(volvio ? 'El procedimiento elegido no es de este tipo. Procedimiento volvió a «Todos».'
        : `Procedimiento ahora muestra los de ${fTipo.value || 'TUPA y NO TUPA'}.`);
    });
    llenarFiltroProc();

    /* Móvil: «Filtros» abre una vista propia con migas «Mis trámites / Filtros» */
    const movil = window.matchMedia('(max-width: 720px)');
    const principal = $('#contenido'), migas = $('#migas-lista'), abrirF = $('#abrir-filtros');
    const migasBase = migas.innerHTML;
    function verFiltros(abrir, enfocar = true) {
      principal.classList.toggle('pagina--filtros', abrir);
      abrirF.setAttribute('aria-expanded', String(abrir));
      migas.innerHTML = abrir ? '<li><a href="bandeja.html" data-cerrar-filtros>Mis trámites</a></li><li><span aria-current="page">Filtros</span></li>' : migasBase;
      document.title = (abrir ? 'Filtros · ' : '') + document.title.replace(/^Filtros · /, '');
      if (enfocar) (abrir ? $('#filtros-titulo') : abrirF).focus();
    }
    abrirF.addEventListener('click', () => verFiltros(true));
    migas.addEventListener('click', (e) => { if (e.target.closest('[data-cerrar-filtros]')) { e.preventDefault(); verFiltros(false); } });
    movil.addEventListener('change', () => { if (!movil.matches && principal.classList.contains('pagina--filtros')) verFiltros(false, false); });
    form.addEventListener('submit', () => { if (movil.matches && principal.classList.contains('pagina--filtros')) setTimeout(() => { if (!$('[aria-invalid="true"]', form)) { verFiltros(false, false); $('#tabla-titulo').focus(); } }, 0); });

    form.addEventListener('reset', () => {
      setTimeout(() => {
        llenarFiltroProc();
        marcarError(fInicio, ''); marcarError(fFin, '');
        filtrados = TRAMITES.slice();
        pagina = 1;
        pintar(true);
      }, 0);
    });

    $('.tabla thead').addEventListener('click', (e) => {
      const th = e.target.closest('th[data-orden]');
      if (!th) return;
      const col = th.dataset.orden;
      orden = { col, dir: orden.col === col && orden.dir === 'asc' ? 'desc' : 'asc' };
      pagina = 1;
      pintar(false);
      const nombre = $('.tabla__ordenar', th).textContent.trim();
      notificar(`Ordenado por ${nombre}, ${orden.dir === 'asc' ? 'de menor a mayor' : 'de mayor a menor'}.`);
      $('.tabla__ordenar', th).focus();
    });

    porPagina.addEventListener('change', () => { pagina = 1; pintar(true); });

    paginas.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ir]');
      if (!b || b.disabled) return;
      pagina = Number(b.dataset.ir);
      pintar(true);
      $('#tabla-titulo').focus();
    });

    cuerpo.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-ticket]');
      if (!tr) return;
      const t = TRAMITES.find((x) => x.ticket === tr.dataset.ticket);

      if (e.target.closest('[data-hoja]')) {
        cerrarMenus();
        notificar(`En el sistema se descarga Hoja_Envio_${t.ticket}.pdf, tu constancia de presentación.`);
        $(`[aria-controls="menu-${t.ticket}"]`).focus();
      }
      if (e.target.closest('[data-copiar]')) {
        cerrarMenus();
        const ok = () => notificar(`Copiaste el N° de ticket ${t.ticket}.`);
        const falla = () => notificar(`No se pudo copiar. El N° de ticket es ${t.ticket}.`);
        try { navigator.clipboard.writeText(t.ticket).then(ok, falla); } catch (_) { falla(); }
        $(`[aria-controls="menu-${t.ticket}"]`).focus();
      }
    });

    pintar(false);
  }

  /* ------------------------------------------------------------------------
     4. NUEVO DOCUMENTO · TODOS LOS FLUJOS (TUPA 1, TUPA 2, NO TUPA)
     ------------------------------------------------------------------------ */
  // Cada procedimiento arma su propio recorrido de pasos (Figma · página «nuevo documento»)
  const NOMBRE_PASO = {
    inicio: '¿Qué quieres hacer?', solicitante: 'Datos del solicitante', informacion: 'Información solicitada',
    opcionales: 'Requisitos opcionales', notificacion: 'Modalidad de notificación', datos: 'Datos del documento',
    requisitos: 'Requisitos', anexos: 'Anexos', revision: 'Revisar y enviar'
  };
  const FLUJOS = {
    'TUPA:1': ['inicio', 'solicitante', 'informacion', 'opcionales', 'notificacion', 'revision'],
    'TUPA:2': ['inicio', 'datos', 'requisitos', 'anexos', 'revision'],
    'NO TUPA': ['inicio', 'datos', 'anexos', 'revision']
  };
  const TITULO_TRAMITE = {
    'TUPA:1': ['TUPA · Procedimiento 1', 'Solicitud de acceso a la información pública'],
    'TUPA:2': ['TUPA · Procedimiento 2', 'Permiso de uso de agua para épocas de superávit hídrico'],
    bienes: ['NO TUPA', 'Bienes y servicios menores a 8 UIT'],
    iga: ['NO TUPA', 'Opinión técnica vinculante · IGA'],
    otros: ['NO TUPA', 'Otros'],
    minera: ['NO TUPA', 'Opinión técnica vinculante de proyecto de exploración minera'],
    congreso: ['NO TUPA', 'Congreso']
  };
  // Lista de producción (casilla.ana.gob.pe). El TUPA salta del 9 al 11: el 10 no existe hoy.
  const PROCEDIMIENTOS = {
    TUPA: [
      ["1", "1. Acceso a la información pública creada u obtenida por la entidad, que se encuentre en su posesión o bajo su control"],
      ["2", "2. Permiso de uso de agua para épocas de superávit hídrico"],
      ["3", "3. Permiso de uso de aguas residuales"],
      ["4", "4. Autorización de uso de agua"],
      ["5", "5. Autorización de uso de agua con acreditación de disponibilidad hídrica aprobada"],
      ["6", "6. Prórroga de autorización de uso de agua"],
      ["7", "7. Constitución o modificación de servidumbre de agua forzosa"],
      ["8", "8. Autorización para la ejecución de obras en los bienes naturales asociados al agua y en la infraestructura hidráulica multisectorial"],
      ["9", "9. Reconocimiento administrativo de junta de usuarios"],
      ["11", "11. Autorización de ejecución de estudios de disponibilidad hídrica para obtención de licencia de uso de agua superficial o subterránea"],
      ["12", "12. Autorización para la ejecución de estudios de aprovechamiento hídrico con perforación de pozos exploratorios o para instalación de piezómetros"],
      ["13", "13. Acreditación de disponibilidad hídrica para el otorgamiento de derechos de uso de agua"],
      ["14", "14. Modificación de acreditación de disponibilidad hídrica en procedimiento simplificado para ejecución de proyectos de saneamiento y pequeños proyectos agrícolas"],
      ["15", "15. Prórroga de acreditación de disponibilidad hídrica para el otorgamiento de derechos de uso de agua en procedimiento simplificado para ejecución de proyectos de saneamiento y pequeños proyectos agrícolas"],
      ["16", "16. Autorización para la ejecución de obras de aprovechamiento hídrico destinadas a la obtención de derechos de uso de agua"],
      ["17", "17. Autorización para la ejecución de obras de aprovechamiento hídrico para la obtención de licencia de uso de agua en procedimiento simplificado para ejecución de proyectos de saneamiento y pequeños proyectos agrícolas"],
      ["18", "18. Autorización para la ejecución de obras de aprovechamiento hídrico para la obtención de licencia de uso de agua, en procedimiento simplificado para ejecución de proyectos de saneamiento y pequeños proyectos agrícolas, con opinión técnica favorable al instrumento de gestión ambiental"],
      ["19", "19. Prórroga de autorización para la ejecución de obras de aprovechamiento hídrico para la obtención de licencia de uso de agua en procedimiento simplificado para ejecución de proyectos de saneamiento y pequeños proyectos agrícolas"],
      ["20", "20. Licencia de uso de agua provisional"],
      ["21", "21. Otorgamiento de licencia de uso de agua"],
      ["22", "22. Otorgamiento de licencia de uso de agua en procedimiento simplificado para ejecución de proyectos de saneamiento y pequeños proyectos agrícolas"],
      ["23", "23. Autorización de ejecución de presas integrantes de la infraestructura hidráulica mayor de carácter multisectorial"],
      ["24", "24. Autorización al titular de derecho de uso de agua para brindar servicio de suministro de agua subterránea a favor de terceros"],
      ["25", "25. Autorización para la prestación del servicio de agua desalinizada a favor de terceros"],
      ["26", "26. Autorización de ejecución de obras de aprovechamiento hídrico para la instalación de plantas desalinizadoras"],
      ["27", "27. Autorización para el uso temporal de las fajas marginales y de las riberas de los ríos amazónicos para la siembra de cultivos"],
      ["28", "28. Autorización de vertimiento de aguas residuales tratadas a los cuerpos naturales de agua"],
      ["29", "29. Modificación de autorización de vertimiento de aguas residuales tratadas a los cuerpos naturales de agua, por cambio de características técnicas"],
      ["30", "30. Prórroga de autorización de vertimiento de aguas residuales tratadas a los cuerpos naturales de agua"],
      ["31", "31. Prórroga del plazo de descarga o rebose de las aguas residuales a un cuerpo natural de agua desde los sistemas de saneamiento"],
      ["32", "32. Autorización de reúso de aguas residuales tratadas"],
      ["33", "33. Modificación de autorización de reúso de aguas residuales tratadas por cambio de características técnicas"],
      ["34", "34. Prórroga de autorización de reúso de agua residual tratada"],
      ["35", "35. Reserva de recursos hídricos"],
      ["36", "36. Prórroga de reserva de recursos hídricos"],
      ["37", "37. Acreditación de disponibilidad hídrica para actividades acuícolas en las categorías productivas de Acuicultura de Recursos Limitados (AREL) y Acuicultura de Micro y Pequeña Empresa (AMYPE)"],
      ["38", "38. Autorización de ejecución de obras de aprovechamiento hídrico para usos acuícolas en las categorías productivas de Acuicultura de Recursos Limitados (AREL) y Acuicultura de Micro y Pequeña Empresa (AMYPE)"],
      ["39", "39. Licencia de uso de agua para las actividades acuícolas en las categorías productivas de Acuicultura de Recursos Limitados (AREL) y Acuicultura de Micro y Pequeña Empresa (AMYPE)"],
      ["40", "40. Permiso de uso de agua para las actividades acuícolas en las categorías productivas de Acuicultura de Recursos Limitados (AREL) y Acuicultura de Micro y Pequeña Empresa (AMYPE)"],
      ["41", "41. Inspección ocular – a distancias de hasta 10 km"],
      ["42", "42. Inspección ocular – a distancias mayores de 10 km hasta 50 km"],
      ["43", "43. Inspección ocular – a distancias mayores de 50 km hasta 100 km"],
      ["44", "44. Inspección ocular – a distancias mayores de 100 km"],
      ["45", "45. Otorgamiento de licencia de uso de agua en el marco de la formalización del uso de agua"],
      ["46", "46. Reconocimiento administrativo de las comisiones de usuarios"],
      ["47", "47. Reconocimiento administrativo de comités de usuarios"]
    ],
    'NO TUPA': [
      ["bienes", "Bienes y servicios menores a 8 UIT"],
      ["iga", "Opinión técnica vinculante · IGA"],
      ["otros", "Otros"],
      ["minera", "Opinión técnica vinculante de proyecto de exploración minera"],
      ["congreso", "Congreso"]
    ]
  };
  // Los TUPA sin flujo propio dibujado siguen el del TUPA 2 (datos, requisitos, anexos)
  const flujoDe = (clave) => FLUJOS[clave] || FLUJOS['TUPA:2'];
  const tituloDe = (clave) => {
    if (TITULO_TRAMITE[clave]) return TITULO_TRAMITE[clave];
    const n = clave.replace('TUPA:', '');
    const p = PROCEDIMIENTOS.TUPA.find(([v]) => v === n);
    return [`TUPA · Procedimiento ${n}`, p ? p[1].replace(/^\d+\. /, '') : ''];
  };
  const REQUISITOS = [
    { id: 'r1', nombre: '1. Solicitud dirigida al Administrador Local de Agua', obligatorio: true, archivo: { nombre: 'solicitud-ala.pdf', bytes: 31457 } },
    { id: 'r2', nombre: '2. Ser propietario o poseedor legítimo del predio o la unidad operativa en la que se hará uso del agua', obligatorio: true, archivo: { nombre: 'titulo-predio.pdf', bytes: 41943 } },
    { id: 'r3', nombre: '3. Memoria descriptiva', obligatorio: true, archivo: null },
    { id: 'r4', nombre: '4. Copia del documento que acredite obras de aprovechamiento hídrico autorizadas', obligatorio: false, archivo: null },
    { id: 'r5', nombre: '5. Comprobante de pago', obligatorio: true, archivo: null }
  ];

  const REPRESENTANTES = ['Carlos Huamán Ríos', 'Lucía Paredes Soto', 'Jorge Salazar Vega'];
  function iniciarNuevoDocumento() {
    const estado = {
      paso: 1,
      flujo: FLUJOS['TUPA:2'],
      clave: 'TUPA:2',
      digitalizado: { nombre: 'oficio-120-2026.pdf', bytes: 838861 },
      adjuntoPedido: null,
      hechos: new Set(),
      anexos: [{ nombre: 'plano-ubicacion.pdf', bytes: 1258291 }],
      enlaces: [],
      enviado: false
    };
    const titulosBase = document.title;

    /* ---- Avance ---- */
    function pintarAvance() {
      const lista = $('#avance-lista');
      const total = estado.flujo.length;
      const hechos = estado.enviado ? total : estado.hechos.size;
      $('#avance-relleno').style.width = `${(hechos / total) * 100}%`;
      $('#avance-texto').textContent = estado.enviado ? 'Solicitud enviada' : `Paso ${estado.paso} de ${total}`;

      lista.innerHTML = estado.flujo.map((id, i) => {
        const nombre = NOMBRE_PASO[id];
        const n = i + 1;
        const hecho = estado.enviado || (estado.hechos.has(n) && n !== estado.paso);
        const actual = !estado.enviado && n === estado.paso;
        const clase = hecho ? 'marcador--hecho' : actual ? 'marcador--actual' : 'marcador--pendiente';
        const condicion = hecho ? 'completado' : actual ? 'paso actual' : 'pendiente';
        const resumen = hecho ? resumenPaso(n) : '';
        const editar = hecho && !estado.enviado
          ? `<button type="button" class="enlace-editar" data-editar="${n}">${icono('editar')}Editar<span class="visualmente-oculto"> ${nombre}</span></button>`
          : '';
        return `<li class="avance__paso${hecho || actual ? ' avance__paso--activo' : ''}"${actual ? ' aria-current="step"' : ''}>
          <span class="marcador marcador--chico ${clase}" aria-hidden="true">${n}</span>
          <span class="avance__texto">
            <span class="avance__nombre">${nombre}<span class="visualmente-oculto">, ${condicion}</span></span>
            ${resumen ? `<span class="avance__resumen">${escapar(resumen)}</span>` : ''}
          </span>
          ${editar}
        </li>`;
      }).join('');
    }

    const esNoTupa = () => estado.clave === 'NO TUPA';
    function resumenPaso(num) {
      const n = { inicio: 1, datos: 2, requisitos: 3, anexos: 4, revision: 5 }[estado.flujo[num - 1]] || estado.flujo[num - 1];
      if (n === 1) return esNoTupa() ? `NO TUPA · ${TITULO_TRAMITE[proc.value][1]}` : `TUPA · Procedimiento ${proc.value}`;
      if (n === 'solicitante') return PERFIL.tipo === 'juridica' ? $('#rep-sol').value : `${PERFIL.nombre} · ${PERFIL.doc}`;
      if (n === 'informacion') return `${$('#entrega').value}${estado.adjuntoPedido ? ' · 1 archivo' : ''}`;
      if (n === 'opcionales') return $('#dependencia').value;
      if (n === 'notificacion') return $('#modalidad').value;
      if (n === 2) return `${$('#tipo-doc').value} ${$('#num-doc').value} · ${$('#folios').value} ${$('#folios').value === '1' ? 'folio' : 'folios'}`;
      if (n === 3) { const c = REQUISITOS.filter((r) => r.archivo).length; return `${c} ${c === 1 ? 'documento adjunto' : 'documentos adjuntos'}`; }
      if (n === 4) {
        const c = estado.anexos.length + estado.enlaces.length;
        return c ? `${c} ${c === 1 ? 'anexo' : 'anexos'}` : 'Sin anexos';
      }
      if (n === 5) return estado.enviado ? 'Enviado' : '';
      return '';
    }

    /* ---- Navegación entre pasos ---- */
    function irA(n) {
      const total = estado.flujo.length;
      const id = n > total ? 'confirmacion' : estado.flujo[n - 1];
      estado.paso = n;
      $$('[data-paso]').forEach((s) => { s.hidden = s.dataset.paso !== id; });
      if (id === 'revision') pintarRevision();
      pintarAvance();
      const vista = $(`[data-paso="${id}"]`);
      const titulo = $('.paso__titulo', vista);
      const num = $('.js-paso-num', vista); if (num) num.textContent = n;
      const pre = $('.js-paso-prefijo', vista); if (pre) pre.textContent = `Paso ${n} de ${total}: `;
      document.title = id === 'confirmacion' ? `Solicitud enviada · ${titulosBase}` : `Paso ${n} de ${total} · ${NOMBRE_PASO[id]} · ${titulosBase}`;
      window.scrollTo({ top: 0, behavior: 'auto' });
      titulo.focus();
    }

    function avanzar() {
      estado.hechos.add(estado.paso);
      irA(estado.paso + 1);
    }

    document.addEventListener('click', (e) => {
      const ed = e.target.closest('[data-editar]');
      if (ed) { irA(Number(ed.dataset.editar)); return; }
      const vol = e.target.closest('[data-volver]');
      if (vol) { irA(estado.paso - 1); }
    });

    /* ---- Paso 1 ---- */
    const tipo = $('#tipo-tramite');
    const proc = $('#procedimiento');
    function llenarProcedimientos() {
      const lista = PROCEDIMIENTOS[tipo.value];
      proc.innerHTML = lista.map(([v, t]) => `<option value="${v}">${escapar(t)}</option>`).join('');
      proc.value = tipo.value === 'TUPA' ? '2' : lista[0][0];
      crearCombo(proc).refrescar();
    }
    tipo.addEventListener('change', () => { llenarProcedimientos(); notificarSoloLector(`Procedimiento: se cargaron los de ${tipo.value}.`); });
    llenarProcedimientos();

    function aplicarProcedimiento() {
      const clave = tipo.value === 'TUPA' ? `TUPA:${proc.value}` : 'NO TUPA';
      if (clave !== estado.clave) { estado.hechos = new Set(); }   // otro recorrido: se empieza de nuevo
      estado.clave = clave;
      estado.flujo = flujoDe(clave);
      const [t, nombre] = tipo.value === 'TUPA' ? tituloDe(clave) : TITULO_TRAMITE[proc.value];
      $('#tramite-tipo').textContent = t;
      $('#tramite-nombre').textContent = nombre;
      // Datos del documento: lo que cambia por procedimiento
      $$('.js-solo-notupa').forEach((e) => { e.hidden = !esNoTupa(); });
      $$('.js-solo-tupa').forEach((e) => { e.hidden = esNoTupa(); });
      $$('.js-bloque').forEach((e) => { e.hidden = !(esNoTupa() && e.dataset.bloque === proc.value); });
      $('#conf-plazo').hidden = !(esNoTupa() && proc.value === 'congreso');
      const muestra = { bienes: ['Oficio', '120-2026', '8', 'Entrega de informe de conformidad de servicio'],
                        iga: ['Oficio', '120-2026', '8', 'Opinión técnica vinculante del proyecto Las Lomas'],
                        congreso: ['Oficio', '045-2026-CR', '4', 'Pedido de información sobre licencias de uso de agua'] }[proc.value];
      if (muestra && !estado.hechos.size) {
        $('#tipo-doc').value = muestra[0]; $('#num-doc').value = muestra[1]; $('#folios').value = muestra[2]; $('#asunto').value = muestra[3];
      }
    }

    $('#form-paso-1').addEventListener('submit', (e) => {
      e.preventDefault();
      aplicarProcedimiento();
      avanzar();
    });

    /* ---- Paso 2 ---- */
    const obligatorios2Base = [
      ['sede', 'Elige la sede a la que diriges el trámite.'],
      ['tipo-doc', 'Elige el tipo de documento.'],
      ['num-doc', 'Escribe el número de tu documento.'],
      ['folios', 'Escribe cuántos folios tiene tu documento.'],
      ['asunto', 'Escribe el asunto de tu documento.']
    ];
    const obligatoriosBloque = {
      iga: [['iga-sector', 'Elige el sector.'], ['iga-actividad', 'Elige la actividad.'], ['iga-tipo', 'Elige el tipo de IGA.'], ['iga-etapa', 'Elige la etapa.']],
      congreso: [['cg-camara', 'Elige la cámara.'], ['cg-congresista', 'Escribe el nombre del congresista.'], ['cg-comision', 'Escribe la comisión.'], ['cg-peticion', 'Elige el tipo de petición.']],
      bienes: [['orden-servicio', 'Escribe el número de la orden de servicio.']]
    };
    const obligatorios2 = () => [
      ...obligatorios2Base.filter(([id]) => !(id === 'sede' && esNoTupa())),
      ...(PERFIL.tipo === 'juridica' ? [['rep-doc', 'Elige al representante legal.']] : []),
      ...(esNoTupa() ? obligatoriosBloque[proc.value] || [] : [])
    ];
    /* Al corregir un campo se limpia su error y se quita del resumen */
    function alCorregir(c) {
      if (!c.getAttribute('aria-invalid') || !c.value.trim()) return;
      marcarError(c, '');
      const caja = $('#errores-paso-2');
      const item = caja.querySelector(`a[href="#${c.id}"]`);
      if (item) item.closest('li').remove();
      const quedan = caja.querySelectorAll('li').length;
      if (!quedan) { caja.hidden = true; caja.innerHTML = ''; }
      else $('.aviso__titulo', caja).textContent = quedan === 1 ? 'Hay 1 dato por corregir' : `Hay ${quedan} datos por corregir`;
    }
    $$('#form-paso-2 .campo__control').forEach((c) => {
      c.addEventListener('input', () => alCorregir(c));
      c.addEventListener('change', () => alCorregir(c));
    });

    $('#form-paso-2').addEventListener('submit', (e) => {
      e.preventDefault();
      const errores = [];
      obligatorios2().forEach(([id, msj]) => {
        const c = document.getElementById(id);
        marcarError(c, '');
        if (!c.value.trim()) errores.push({ id, texto: msj });
      });
      const folios = $('#folios');
      if (folios.value.trim() && !/^[1-9]\d{0,3}$/.test(folios.value.trim())) {
        errores.push({ id: 'folios', texto: 'Los folios van en número entero, desde 1.' });
      }
      const cut = $('#cut');
      marcarError(cut, '');
      if (cut.value.trim() && !/^\d{4,7}-\d{4}$/.test(cut.value.trim())) {
        errores.push({ id: 'cut', texto: 'El CUT va con número y año, por ejemplo 104330-2026.' });
      }
      const orden = $('#orden-servicio');
      if (esNoTupa() && proc.value === 'bienes' && orden.value.trim() && !/^\d{4}-\d{4}$/.test(orden.value.trim())) {
        errores.push({ id: 'orden-servicio', texto: 'La orden de servicio va con número y año, por ejemplo 0001-2026.' });
      }
      const rep = $('#rep-doc');
      if (PERFIL.tipo === 'juridica' && rep.value.trim() && !REPRESENTANTES.includes(rep.value.trim())) {
        errores.push({ id: 'rep-doc', texto: 'Elige un representante de la lista.' });
      }
      if (esNoTupa() && !estado.digitalizado) errores.push({ id: 'digitalizado', texto: 'Sube el documento digitalizado.' });
      errores.forEach((er) => { const c = document.getElementById(er.id); if (c) marcarError(c, er.texto); });
      mostrarResumen($('#errores-paso-2'), errores);
      if (!errores.length) avanzar();
    });

    /* ---- Paso 3 · Requisitos ---- */
    function pintarRequisitos() {
      $('#lista-requisitos').innerHTML = REQUISITOS.map((r) => `
        <li class="requisito${r.archivo ? ' requisito--listo' : ''}" id="req-${r.id}">
          <div class="requisito__cabecera">
            <span class="requisito__nombre" id="${r.id}-nombre">${escapar(r.nombre)}</span>
            <span class="requerido ${r.obligatorio ? 'requerido--si' : 'requerido--no'}">${r.obligatorio ? 'Obligatorio' : 'Opcional'}</span>
          </div>
          ${r.archivo
            ? `<div class="requisito__archivo">${icono('check')}<span class="requisito__archivo-nombre">${escapar(r.archivo.nombre)} · ${mb(r.archivo.bytes)}</span>
                 <button type="button" class="enlace-accion" data-ver-req="${r.id}">Ver<span class="visualmente-oculto"> ${escapar(r.archivo.nombre)}</span></button>
                 <button type="button" class="enlace-accion" data-quitar-req="${r.id}">Quitar<span class="visualmente-oculto"> ${escapar(r.archivo.nombre)}</span></button></div>`
            : `<div class="subir">
                 <input type="file" id="${r.id}" accept="application/pdf,.pdf" aria-describedby="${r.id}-nombre ${r.id}-error" data-requisito="${r.id}">
                 <label for="${r.id}" class="boton boton--secundario">Seleccionar PDF<span class="visualmente-oculto"> para ${escapar(r.nombre)}</span></label>
               </div>`}
          <p class="campo__error" id="${r.id}-error" hidden>${icono('alerta', 'icono--16')}<span class="campo__error-texto"></span></p>
        </li>`).join('');
      const total = REQUISITOS.reduce((s, r) => s + (r.archivo ? r.archivo.bytes : 0), 0);
      $('#peso-total').textContent = `Peso total de archivos: ${mb(total)}.`;
    }
    function errorRequisito(id, msj) {
      const li = $(`#req-${id}`);
      const er = $(`#${id}-error`);
      if (!li || !er) return;
      li.dataset.error = msj ? 'true' : 'false';
      $('.campo__error-texto', er).textContent = msj || '';
      er.hidden = !msj;
    }
    $('#lista-requisitos').addEventListener('change', (e) => {
      const input = e.target.closest('[data-requisito]');
      if (!input || !input.files.length) return;
      const f = input.files[0];
      const r = REQUISITOS.find((x) => x.id === input.dataset.requisito);
      if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') {
        errorRequisito(r.id, 'El archivo tiene que ser PDF.');
        input.value = '';
        return;
      }
      if (f.size > MAX_BYTES) {
        errorRequisito(r.id, `El archivo pesa ${mb(f.size)}. El máximo es 400 MB.`);
        input.value = '';
        return;
      }
      r.archivo = { nombre: f.name, bytes: f.size };
      pintarRequisitos();
      refrescarResumenRequisitos();
      notificar(`Se adjuntó ${f.name} a ${r.nombre}.`);
      const quitar = $(`[data-quitar-req="${r.id}"]`);
      quitar && quitar.focus();
    });
    $('#lista-requisitos').addEventListener('click', (e) => {
      const v = e.target.closest('[data-ver-req]');
      if (v) {
        const r = REQUISITOS.find((x) => x.id === v.dataset.verReq);
        notificar(`En el sistema se abre ${r.archivo.nombre} para que lo revises antes de enviar.`);
        return;
      }
      const b = e.target.closest('[data-quitar-req]');
      if (!b) return;
      const r = REQUISITOS.find((x) => x.id === b.dataset.quitarReq);
      const nombre = r.archivo.nombre;
      r.archivo = null;
      pintarRequisitos();
      notificar(`Quitaste ${nombre}.`);
      document.getElementById(r.id).focus();
    });
    function erroresRequisitos() {
      const errores = [];
      REQUISITOS.forEach((r) => {
        errorRequisito(r.id, '');
        if (r.obligatorio && !r.archivo) {
          errorRequisito(r.id, 'Este requisito es obligatorio. Adjunta el PDF.');
          errores.push({ id: r.id, texto: `Falta adjuntar: ${r.nombre.replace(/^\d+\.\s*/, '')}` });
        }
      });
      return errores;
    }
    /* Si el resumen ya está a la vista, se actualiza al adjuntar, sin mover el foco */
    function refrescarResumenRequisitos() {
      const caja = $('#errores-paso-3');
      if (caja.hidden) return;
      mostrarResumen(caja, erroresRequisitos(), false);
    }
    $('#form-paso-3').addEventListener('submit', (e) => {
      e.preventDefault();
      const errores = erroresRequisitos();
      mostrarResumen($('#errores-paso-3'), errores);
      if (!errores.length) avanzar();
    });

    /* ---- Paso 4 · Anexos ---- */
    function pintarAnexos() {
      const items = [
        ...estado.anexos.map((a, i) => `<li class="archivo">${icono('archivo')}<span class="archivo__nombre">${escapar(a.nombre)} · ${mb(a.bytes)}</span>
          <button type="button" class="enlace-accion" data-quitar-anexo="${i}">Quitar<span class="visualmente-oculto"> ${escapar(a.nombre)}</span></button></li>`),
        ...estado.enlaces.map((l, i) => `<li class="archivo">${icono('enlace')}<span class="archivo__nombre">${escapar(l.descripcion)} · ${escapar(l.url)}</span>
          <button type="button" class="enlace-accion" data-quitar-enlace="${i}">Quitar<span class="visualmente-oculto"> ${escapar(l.descripcion)}</span></button></li>`)
      ];
      $('#lista-anexos').innerHTML = items.join('');
      $('#anexos-vacio').hidden = items.length > 0;
    }
    $('#anexo-archivo').addEventListener('change', (e) => {
      const input = e.target;
      const malos = [];
      Array.from(input.files).forEach((f) => {
        if (f.size > MAX_BYTES) malos.push(f.name);
        else estado.anexos.push({ nombre: f.name, bytes: f.size });
      });
      input.value = '';
      pintarAnexos();
      notificar(malos.length
        ? `No se adjuntó ${malos.join(', ')}: pasa de 400 MB. Puedes compartirlo como enlace en la nube.`
        : 'Se adjuntaron los anexos.');
    });
    $('#lista-anexos').addEventListener('click', (e) => {
      const a = e.target.closest('[data-quitar-anexo]');
      const l = e.target.closest('[data-quitar-enlace]');
      if (a) { const [x] = estado.anexos.splice(Number(a.dataset.quitarAnexo), 1); notificar(`Quitaste ${x.nombre}.`); }
      if (l) { const [x] = estado.enlaces.splice(Number(l.dataset.quitarEnlace), 1); notificar(`Quitaste el enlace ${x.descripcion}.`); }
      if (a || l) { pintarAnexos(); $('#anexo-archivo').focus(); }
    });
    $('#en-nube').addEventListener('change', (e) => { $('#panel-nube').hidden = !e.target.checked; });
    $('#agregar-enlace').addEventListener('click', () => {
      const url = $('#enlace-url');
      const desc = $('#enlace-desc');
      marcarError(url, ''); marcarError(desc, '');
      let ok = true;
      let valida = false;
      try { valida = /^https:$/.test(new URL(url.value.trim()).protocol); } catch (_) { valida = false; }
      if (!url.value.trim()) { marcarError(url, 'Pega el enlace del archivo.'); ok = false; }
      else if (!valida) { marcarError(url, 'El enlace tiene que empezar con https://'); ok = false; }
      if (!desc.value.trim()) { marcarError(desc, 'Describe qué contiene el archivo.'); ok = false; }
      if (!ok) { (url.getAttribute('aria-invalid') ? url : desc).focus(); return; }
      estado.enlaces.push({ url: url.value.trim(), descripcion: desc.value.trim() });
      url.value = ''; desc.value = '';
      pintarAnexos();
      notificar('Agregaste el enlace a tus anexos.');
      url.focus();
    });
    $('#form-paso-4').addEventListener('submit', (e) => { e.preventDefault(); avanzar(); });

    /* ---- Paso 5 · Revisar y enviar ---- */
    function pintarRevision() {
      const reqs = REQUISITOS.filter((r) => r.archivo);
      const pesoReq = reqs.reduce((s, r) => s + r.archivo.bytes, 0);
      const anexos = [...estado.anexos.map((a) => a.nombre), ...estado.enlaces.map((l) => `${l.descripcion} (enlace)`)];
      const bloque = (n, titulo, filas) => `
        <section class="resumen__bloque" aria-labelledby="rev-${n}">
          <div class="resumen__cabecera">
            <h3 class="resumen__titulo" id="rev-${n}">${titulo}</h3>
            <button type="button" class="enlace-editar" data-editar="${n}">${icono('editar')}Editar<span class="visualmente-oculto"> ${titulo}</span></button>
          </div>
          <dl>${filas.map(([k, v]) => `<dt>${k}</dt><dd>${escapar(v)}</dd>`).join('')}</dl>
        </section>`;
      const filas = {
        inicio: () => [['Procedimiento', esNoTupa() ? `NO TUPA · ${TITULO_TRAMITE[proc.value][1]}` : proc.options[proc.selectedIndex].text]],
        solicitante: () => [[PERFIL.docTipo === 'RUC' ? 'Empresa' : 'Solicitante', `${PERFIL.nombre} · ${PERFIL.doc}`],
                            ...(PERFIL.tipo === 'juridica' ? [['Representante legal', $('#rep-sol').value]] : [])],
        informacion: () => [['Pedido', $('#pedido').value.trim()], ['Forma de entrega', $('#entrega').value],
                            ['Adjunto', estado.adjuntoPedido ? `${estado.adjuntoPedido.nombre} · ${mb(estado.adjuntoPedido.bytes)}` : 'Sin adjunto']],
        opcionales: () => [['Dependencia', $('#dependencia').value],
                           ...['sexo', 'edad', 'etnia', 'discapacidad', 'lengua', 'area'].filter((id) => $('#' + id).value.trim())
                             .map((id) => [$(`label[for="${id}"]`).childNodes[0].textContent.trim(), $('#' + id).value])],
        notificacion: () => [['Modalidad', $('#modalidad').value], ...($('#observaciones').value.trim() ? [['Observaciones', $('#observaciones').value.trim()]] : [])],
        datos: () => [
          ['Entidad y sede', `Autoridad Nacional del Agua · ${esNoTupa() ? 'Sede Central' : $('#sede').value}`],
          ...(PERFIL.tipo === 'juridica' ? [['Representante legal', $('#rep-doc').value]] : []),
          ...(esNoTupa() && proc.value === 'iga' ? [['IGA', `${$('#iga-sector').value} · ${$('#iga-actividad').value} · ${$('#iga-tipo').value} · ${$('#iga-etapa').value}`]] : []),
          ...(esNoTupa() && proc.value === 'congreso' ? [['Congreso', `${$('#cg-camara').value} · ${$('#cg-congresista').value} · ${$('#cg-comision').value} · ${$('#cg-peticion').value}`]] : []),
          ['Documento', `${$('#tipo-doc').value} ${$('#num-doc').value} · ${$('#folios').value} folios`],
          ['Asunto', $('#asunto').value],
          ...(esNoTupa() && proc.value === 'bienes' ? [['Orden de servicio', $('#orden-servicio').value]] : []),
          ...($('#cut').value.trim() ? [['CUT de referencia', $('#cut').value.trim()]] : []),
          ...($('#ref-ana').value.trim() ? [['Documento de referencia ANA', $('#ref-ana').value.trim()]] : []),
          ...(esNoTupa() && estado.digitalizado ? [['Documento digitalizado', `${estado.digitalizado.nombre} · ${mb(estado.digitalizado.bytes)}`]] : [])
        ],
        requisitos: () => [['Adjuntos', `${reqs.length} documentos · ${mb(pesoReq)}`]],
        anexos: () => [['Adjuntos', anexos.length ? anexos.join(', ') : 'Sin anexos']]
      };
      $('#revision').innerHTML = estado.flujo.slice(0, -1).map((id, i) => bloque(i + 1, NOMBRE_PASO[id], filas[id]())).join('');
    }
    $('#form-paso-5').addEventListener('submit', (e) => {
      e.preventDefault();
      estado.hechos.add(estado.paso);
      estado.enviado = true;
      const ahora = new Date();
      const dos = (n) => String(n).padStart(2, '0');
      $('#confirmacion-fecha').textContent =
        `${dos(ahora.getDate())}/${dos(ahora.getMonth() + 1)}/${ahora.getFullYear()}, ${dos(ahora.getHours())}:${dos(ahora.getMinutes())}`;
      irA(estado.flujo.length + 1);
      notificar('Enviaste tu solicitud. Se descargó tu hoja de envío.');
    });
    $('#descargar-hoja').addEventListener('click', () =>
      notificar('En el sistema se descarga de nuevo Hoja_Envio_69501-2026.pdf.'));

    /* ---- Archivo único: documento digitalizado (NO TUPA) y adjunto del pedido (TUPA 1) ---- */
    const UNICO = {
      digitalizado: { campo: 'digitalizado', max: MAX_BYTES, maxTexto: '400 MB', etiqueta: 'Documento digitalizado' },
      adjunto: { campo: 'adjuntoPedido', max: 300 * 1024 * 1024, maxTexto: '300 MB', etiqueta: 'Adjunto del pedido' }
    };
    function pintarArchivoUnico(clave) {
      const cfg = UNICO[clave];
      const zona = $(`#${clave}-zona`);
      const archivo = estado[cfg.campo];
      zona.innerHTML = archivo
        ? `<div class="archivo">
             ${icono('tramites', 'archivo__icono')}
             <span class="archivo__nombre">${escapar(archivo.nombre)} · ${mb(archivo.bytes)}</span>
             <button type="button" class="enlace-accion" data-quitar-unico="${clave}">Quitar<span class="visualmente-oculto"> ${escapar(archivo.nombre)}</span></button>
           </div>`
        : `<span class="subir"><input type="file" id="${clave}" accept="application/pdf,.pdf" data-unico="${clave}"
             aria-labelledby="${clave}-etiqueta ${clave}-boton" aria-describedby="${clave}-ayuda ${clave}-error">
             <label for="${clave}" class="boton boton--secundario" id="${clave}-boton">${icono('subir')}Seleccionar archivo</label></span>`;
    }
    $('.pasos').addEventListener('change', (e) => {
      const input = e.target.closest('[data-unico]');
      if (!input || !input.files.length) return;
      const clave = input.dataset.unico, cfg = UNICO[clave], f = input.files[0];
      let msj = '';
      if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') msj = 'El archivo tiene que ser PDF.';
      else if (f.size > cfg.max) msj = `El archivo pesa ${mb(f.size)}. El máximo es ${cfg.maxTexto}.`;
      if (msj) { marcarError(input, msj); input.focus(); return; }
      estado[cfg.campo] = { nombre: f.name, bytes: f.size };
      pintarArchivoUnico(clave);
      $(`[data-quitar-unico="${clave}"]`).focus();
      notificar(`Adjuntaste ${f.name}.`);
    });
    $('.pasos').addEventListener('click', (e) => {
      const q = e.target.closest('[data-quitar-unico]');
      if (!q) return;
      const clave = q.dataset.quitarUnico, cfg = UNICO[clave];
      const nombre = estado[cfg.campo].nombre;
      estado[cfg.campo] = null;
      pintarArchivoUnico(clave);
      $('#' + clave).focus();
      notificar(`Quitaste ${nombre}.`);
    });

    /* ---- Validación común de los pasos de TUPA 1 ---- */
    function validarPaso(idPaso, reglas) {
      const errores = [];
      reglas.forEach(([id, msj, prueba]) => {
        const c = document.getElementById(id);
        marcarError(c, '');
        const ok = prueba ? prueba(c) : (c.type === 'checkbox' ? c.checked : c.value.trim());
        if (!ok) errores.push({ id, texto: msj });
      });
      errores.forEach((er) => marcarError(document.getElementById(er.id), er.texto));
      mostrarResumen($(`#errores-${idPaso}`), errores);
      return !errores.length;
    }
    // Al corregir, el error se va (el resumen se actualiza en el siguiente envío)
    ['solicitante', 'informacion', 'opcionales', 'notificacion'].forEach((idPaso) => {
      $(`#form-${idPaso}`).addEventListener('change', (e) => {
        const c = e.target;
        if (c.getAttribute('aria-invalid') && (c.type === 'checkbox' ? c.checked : c.value.trim())) marcarError(c, '');
      });
    });

    // Contadores de caracteres (se leen con la ayuda del campo, sin anunciar cada tecla)
    [['pedido', 2000], ['observaciones', 1000]].forEach(([id, max]) => {
      const c = $('#' + id), k = $(`#${id}-contador`);
      c.addEventListener('input', () => { k.textContent = `${c.value.length} / ${max}`; });
    });

    const enLista = (lista) => (c) => lista.includes(c.value.trim());
    const DEPENDENCIAS = $$('#dependencias option').map((o) => o.value);

    $('#form-solicitante').addEventListener('submit', (e) => {
      e.preventDefault();
      const reglas = PERFIL.tipo === 'juridica'
        ? [['rep-sol', 'Elige al representante legal de la lista.', enLista(REPRESENTANTES)]] : [];
      if (validarPaso('solicitante', reglas)) avanzar();
    });
    $('#form-informacion').addEventListener('submit', (e) => {
      e.preventDefault();
      if (validarPaso('informacion', [
        ['pedido', 'Escribe qué información pides.'],
        ['entrega', 'Elige cómo quieres recibir la información.']
      ])) avanzar();
    });
    $('#form-opcionales').addEventListener('submit', (e) => {
      e.preventDefault();
      if (validarPaso('opcionales', [
        ['dependencia', 'Elige una dependencia de la lista.', enLista(DEPENDENCIAS)],
        ['edad', 'La edad va en número, por ejemplo 45.', (c) => !c.value.trim() || /^\d{1,3}$/.test(c.value.trim())]
      ])) avanzar();
    });
    $('#form-notificacion').addEventListener('submit', (e) => {
      e.preventDefault();
      if (validarPaso('notificacion', [
        ['modalidad', 'Elige la modalidad de notificación.'],
        ['autorizo', 'Marca la autorización para recibir comunicaciones por correo.'],
        ['consiento', 'Marca tu consentimiento para el tratamiento de datos personales.']
      ])) avanzar();
    });

    pintarRequisitos();
    pintarAnexos();
    pintarArchivoUnico('digitalizado');
    pintarArchivoUnico('adjunto');
    pintarAvance();
  }

  /* ------------------------------------------------------------------------
     DETALLE DEL TRÁMITE  (Figma casilla · frames «VER», persona natural)
     Un mismo detalle con cinco variantes, según el estado del trámite:
       En revisión · Validado · Observado · Respuesta nueva → Finalizado (acuse)
     ------------------------------------------------------------------------ */
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dosDig = (n) => String(n).padStart(2, '0');
  const dmy = (d) => `${dosDig(d.getDate())}/${dosDig(d.getMonth() + 1)}/${d.getFullYear()}`;
  const hms = (d) => `${dosDig(d.getHours())}:${dosDig(d.getMinutes())}:${dosDig(d.getSeconds())}`;
  const conDia = (d) => `${DIAS[d.getDay()]} ${dmy(d)}`;
  const masMinutos = (d, m) => new Date(d.getTime() + m * 60000);
  function diaHabil(d, n) {                       // n días hábiles después (sin feriados)
    const r = new Date(d); let k = 0;
    while (k < n) { r.setDate(r.getDate() + 1); if (r.getDay() % 6 !== 0) k++; }
    return r;
  }

  /* --- Subsanación: datos compartidos por el detalle (02) y subsanar.html (03–05) ---
     Lo que se observa es lo que el usuario subió para su TUPA o NO TUPA.
     Datos de ejemplo, tomados de Figma (TUPA 2, persona natural). */
  const REQ_TUPA2 = [
    { n: 1, nombre: 'Solicitud dirigida al Administrador Local de Agua', actual: 'solicitud.pdf', bytes: 31457, motivo: 'el archivo adjunto es una carta, no la solicitud.' },
    { n: 2, nombre: 'Ser propietario o poseedor legítimo del predio', actual: 'titulo-predio.pdf', bytes: 62914, motivo: 'el documento está incompleto, faltan páginas.' },
    { n: 3, nombre: 'Memoria descriptiva', actual: null, bytes: 0, motivo: 'no se adjuntó.' },
    { n: 4, nombre: 'Copia del documento que acredite obras de aprovechamiento hídrico', actual: 'obras.pdf', bytes: 52429 },
    { n: 5, nombre: 'Comprobante de pago', actual: 'pago.pdf', bytes: 20971, motivo: 'el pago no corresponde a este procedimiento.' }
  ];
  // A veces se observa un documento, a veces casi todos: depende de cómo se presentó.
  const OBSERVADOS = { '68937-2026': [1, 2, 3, 5], '68891-2026': [3] };
  const requisitosDe = (ticket) => REQ_TUPA2.map((r) => ({ ...r, observado: (OBSERVADOS[ticket] || []).includes(r.n), nuevo: null, error: '' }));
  function fechasObservacion(t) {
    const presentado = new Date(aFecha(t.fecha, t.hora));
    const observado = masMinutos(presentado, 3);
    return { presentado, observado, plazo: diaHabil(observado, 2) };
  }
  const conHora = (d) => `${dmy(d)} · ${hms(d)}`;

  // Fila de requisito: observado, conforme o subsanado. modo: detalle | corregir | revisar
  function filaRequisito(r, modo, ticket) {
    const id = `rq${r.n}`;
    const pre = modo === 'corregir' ? '' : `${modo}-`;   // ids únicos aunque la fila aparezca en dos vistas
    const nombre = `<span class="req-obs__nombre" id="${pre}${id}-nombre">${r.n}. ${escapar(r.nombre)}</span>`;
    if (r.nuevo) {
      return `<li class="req-obs req-obs--subsanado" id="${pre}fila-${id}">
        <span class="req-obs__texto">${nombre}<span class="req-obs__archivo">Nuevo: ${escapar(r.nuevo.nombre)} · ${mb(r.nuevo.bytes)}</span></span>
        <span class="pildora pildora--subsanado">Subsanado</span>
        ${modo === 'corregir' ? `<button type="button" class="enlace-accion" data-deshacer="${r.n}">Quitar<span class="visualmente-oculto"> ${escapar(r.nuevo.nombre)} de ${escapar(r.nombre)}</span></button>` : ''}
      </li>`;
    }
    if (!r.observado) {
      return `<li class="req-obs req-obs--conforme">
        <span class="req-obs__texto">${nombre}<span class="req-obs__archivo">${escapar(r.actual)} · ${mb(r.bytes)}</span></span>
        <span class="pildora pildora--conforme">Conforme</span>
      </li>`;
    }
    const verbo = r.actual ? 'Reemplazar archivo' : 'Subir archivo';
    const accion = modo === 'detalle'
      ? `<a class="boton boton--secundario" href="subsanar.html#${ticket}">${verbo}<span class="visualmente-oculto">: ${escapar(r.nombre)}</span></a>`
      : `<span class="subir"><input type="file" id="${id}" accept="application/pdf,.pdf" data-req="${r.n}" aria-describedby="${id}-motivo ${id}-error"${r.error ? ' aria-invalid="true"' : ''}>
           <label for="${id}" class="boton boton--secundario">${verbo}<span class="visualmente-oculto">: ${escapar(r.nombre)}</span></label></span>`;
    return `<li class="req-obs" id="${pre}fila-${id}"${r.error ? ' data-error="true"' : ''}>
      <span class="req-obs__texto">${nombre}
        <span class="req-obs__motivo" id="${pre}${id}-motivo">Motivo: ${escapar(r.motivo)}</span>
        ${r.actual ? `<span class="req-obs__archivo">Archivo actual: ${escapar(r.actual)}</span>` : ''}
        ${modo === 'corregir' ? `<span class="campo__error" id="${id}-error"${r.error ? '' : ' hidden'}>${icono('alerta', 'icono--16')}<span class="campo__error-texto">${escapar(r.error)}</span></span>` : ''}
      </span>
      <span class="pildora pildora--observado">Requiere subsanación</span>
      ${accion}
    </li>`;
  }

  const NOMBRES = ['informe1.pdf', 'plano-ubicacion.pdf', 'memoria-descriptiva.pdf', 'informe2.pdf'];

  function adjuntosDe(t) {
    const lista = [];
    const pdfs = Math.max(1, t.archivos - (t.archivos >= 3 ? 1 : 0));
    for (let i = 0; i < pdfs; i++) lista.push({ nombre: NOMBRES[i % NOMBRES.length], tipo: 'pdf' });
    if (t.archivos >= 3) lista.push({ nombre: 'Anexo', sub: 'Enlace externo', tipo: 'enlace' });
    lista.push({ nombre: 'Hoja de envío', sub: 'Constancia de tu presentación', tipo: 'hoja' });
    return lista;
  }

  function variante(t) {
    if (t.estado === 'Observado') return 'observado';
    if (t.estado === 'Finalizado') return 'leida';
    if (t.estado === 'Validado') return t.nueva ? 'nueva' : 'validado';
    if (t.estado === 'En revisión') return 'revision';
    return null;                                   // Archivado: sin diseño todavía
  }

  /* --- Piezas ------------------------------------------------------------ */
  function historial(hitos) {
    return `<section class="seccion-detalle" aria-labelledby="h-historial">
      <h2 class="seccion-detalle__titulo" id="h-historial">${icono('calendario')}Historial del trámite</h2>
      <ol class="historial">
        ${hitos.map((h) => `<li class="hito hito--${h.estado}"${h.estado === 'actual' || h.estado === 'observado' ? ' aria-current="step"' : ''}>
          <span class="hito__circulo">${icono(h.icono)}</span>
          <span class="hito__nombre">${h.nombre}<span class="visualmente-oculto">. ${{ hecho: 'Completado', actual: 'Paso actual', pendiente: 'Pendiente', observado: 'Paso actual, con observación' }[h.estado]}.</span></span>
          <span class="hito__fecha">${h.fecha}</span>
        </li>`).join('')}
      </ol>
    </section>`;
  }

  function datos(filas) {
    return `<dl class="datos-detalle">${filas.map((f) => `<div${f.ancho ? ' class="datos-detalle__ancho"' : ''}>
      <dt>${f.fecha ? icono('calendario', 'icono--16') : ''}${f.k}</dt><dd>${f.v}</dd></div>`).join('')}</dl>`;
  }

  const ESTADO_DOC = {
    'En revisión': '<span class="estado estado--en-revision">En revisión</span>',
    'Validado': `<span class="estado estado--doc estado--doc-validado">${icono('check', 'icono--14')}Validado</span>`,
    'Requiere subsanación': '<span class="estado estado--doc estado--doc-error">Requiere subsanación</span>'
  };
  function documento(d, i, estadoDoc) {
    const id = `doc-${i}`;
    const accion = d.tipo === 'enlace'
      ? `<button type="button" class="boton boton--secundario" id="${id}" data-abrir="${escapar(d.nombre)}">Abrir enlace<span class="visualmente-oculto"> de ${escapar(d.nombre)} (se abre en otra pestaña)</span></button>`
      : `<button type="button" class="boton boton--secundario" id="${id}" data-descargar="${escapar(d.nombre)}">${icono('descargar')}Descargar<span class="visualmente-oculto"> ${escapar(d.nombre)}</span></button>`;
    const pill = d.observado ? ESTADO_DOC['Requiere subsanación'] : (d.tipo !== 'hoja' && estadoDoc ? ESTADO_DOC[estadoDoc] : '');
    const sub = d.observado ? d.requisito : d.sub;
    return `<li class="documento${d.observado ? ' documento--observado' : ''}">
      ${icono('tramites', 'documento__icono')}
      <span class="documento__texto"><span class="documento__nombre">${escapar(d.nombre)}</span>${sub ? `<span class="documento__sub">${escapar(sub)}</span>` : ''}</span>
      ${pill}${accion}
    </li>`;
  }

  function tuSolicitud(t, v) {
    const pill = { revision: 'en-revision', validado: 'validado' }[v];
    const fechaV = { k: 'Fecha de validación', v: t.validacion ? t.validacion.join(' · ') : 'Pendiente' };
    const mensaje = {
      revision: t.subsanado ? 'Su subsanación fue recibida y la solicitud está siendo revisada nuevamente.' : 'Su solicitud fue ingresada con éxito y está siendo revisada.',
      validado: `Su solicitud ha sido validada correctamente con N° CUT ${t.cut}.`
    }[v];
    const estadoDoc = { revision: 'En revisión', validado: 'Validado' }[v];
    return `<section class="seccion-detalle" aria-labelledby="h-solicitud">
      <div class="seccion-detalle__cabecera">
        <h2 class="seccion-detalle__titulo" id="h-solicitud">${icono('expediente')}Tu solicitud</h2>
        <span class="estado estado--${pill}">${t.estado}</span>
      </div>
      ${datos([
        { k: 'N° de ticket', v: t.ticket },
        { k: 'N° de documento', v: escapar(t.documento) },
        { k: 'Asunto', v: escapar(t.asunto) },
        { k: 'Tipo de trámite', v: t.tipo },
        { k: 'Fecha de presentación', v: `${t.fecha} · ${t.hora}`, fecha: true },
        { ...fechaV, fecha: true },
        { k: 'Mensaje', v: escapar(mensaje), ancho: true }
      ])}
      <h3 class="subtitulo-detalle">Archivos adjuntos · enviados el ${t.fecha}, ${t.hora}</h3>
      <ul class="documentos">${adjuntosDe(t).map((d, i) => documento(d, i, estadoDoc)).join('')}</ul>
    </section>`;
  }

  function respuesta(t, leida) {
    const base = new Date(aFecha(t.validacion[0], t.validacion[1]));
    const deposito = masMinutos(base, 17), notif = masMinutos(deposito, 1), considera = diaHabil(notif, 1);
    const n = t.ticket.slice(2, 5);
    const docs = [
      { nombre: `Carta N° 0${n}-2026-ANA-DPDRH.pdf`, sub: 'Documento notificado' },
      { nombre: 'Constancia de depósito', sub: 'Fecha y hora del depósito en tu casilla' },
      { nombre: 'Acuse de recibo', sub: leida ? 'Registrado al abrir la respuesta' : 'Se genera al abrir la respuesta', pendiente: !leida }
    ];
    return `<section class="seccion-detalle" aria-labelledby="h-respuesta">
      <div class="seccion-detalle__cabecera">
        <h2 class="seccion-detalle__titulo" id="h-respuesta">${icono(leida ? 'sobre-abierto' : 'sobre')}Respuesta de la ANA</h2>
        ${leida
          ? `<span class="estado estado--leida">${icono('check')}Leída</span>`
          : `<span class="estado estado--en-revision">${icono('sobre')}Nueva</span>`}
      </div>
      ${datos([
        { k: 'Oficina que notifica', v: 'DPDRH' },
        { k: 'N° de notificación', v: `NOTIF-2026-000${n}` },
        { k: 'N° de documento', v: `Carta N° 0${n}-2026-ANA-DPDRH` },
        { k: 'Asunto', v: escapar(t.documento) },
        { k: 'Notificada a', v: `${PERFIL.nombre} · ${PERFIL.doc}` },
        { k: 'Procedimiento', v: `${t.tipo} · ${escapar(t.asunto)}` },
        { k: 'Fecha de depósito', v: `${conDia(deposito)} · ${hms(deposito)}`, fecha: true },
        { k: 'Fecha de notificación', v: `${conDia(notif)} · ${hms(notif)}`, fecha: true },
        { k: 'Se considera notificada', v: `${conDia(considera)} (siguiente día hábil)`, fecha: true },
        { k: 'Acuse de recibo (lectura)', v: leida ? `${conDia(leida)} · ${hms(leida)}` : 'Pendiente: se registra al abrir esta respuesta', fecha: true }
      ])}
      <h3 class="subtitulo-detalle">Documentos electrónicos</h3>
      <ul class="documentos">${docs.map((d, i) => d.pendiente
        ? `<li class="documento">${icono('tramites', 'documento__icono')}<span class="documento__texto"><span class="documento__nombre">${d.nombre}</span><span class="documento__sub">${d.sub}</span></span><span class="documento__espera">Registrando…</span></li>`
        : documento({ ...d, tipo: 'pdf' }, `r${i}`)).join('')}</ul>
    </section>`;
  }

  /* --- Variantes ---------------------------------------------------------- */
  function pintarDetalle(t, opciones = {}) {
    const v = variante(t);
    const titulo = t.cut && v !== 'revision' && v !== 'observado' ? `CUT ${t.cut}` : `Ticket ${t.ticket}`;
    const sub = t.cut && v !== 'revision' && v !== 'observado'
      ? `${t.tipo} · ${t.asunto} · Ticket ${t.ticket}`
      : `${t.tipo} · ${t.asunto} · El CUT se asigna al validar`;

    $('#detalle-titulo').textContent = titulo;
    $('#migas-actual').textContent = titulo;
    $('#detalle-sub').textContent = sub;
    document.title = `${titulo} · Casilla Electrónica · ANA`;
    const pillTitulo = { nueva: ['validado', 'Validado'], leida: ['finalizado', 'Finalizado'] }[v];
    $('#detalle-estado').innerHTML = pillTitulo ? `<span class="estado estado--${pillTitulo[0]}">${pillTitulo[1]}</span>` : '';
    // Figma 02 (subsanación): la hoja de envío la genera el sistema, va como acción del encabezado
    $('#detalle-acciones').innerHTML = v === 'observado'
      ? `<button type="button" class="boton boton--secundario boton--compacto" id="hoja-envio" data-descargar="Hoja_Envio_${t.ticket}.pdf">${icono('descargar')}Descargar hoja de envío</button>` : '';

    const presentaste = { nombre: 'Presentaste la solicitud', icono: 'enviar', fecha: `${t.fecha} · ${t.hora}` };
    const valFecha = t.validacion ? `${t.validacion[0]} · ${t.validacion[1]}` : '';
    let html = '';

    if (v === 'revision' && t.subsanado) {
      const f = fechasObservacion(t);
      html = historial([
        { ...presentaste, nombre: 'Presentado', estado: 'hecho' },
        { nombre: 'Observado', icono: 'cerrar', fecha: conHora(f.observado), estado: 'hecho' },
        { nombre: 'Subsanado', icono: 'tramites', fecha: conHora(new Date(t.subsanado)), estado: 'actual' },
        { nombre: 'Validación', icono: 'check', fecha: 'Pendiente', estado: 'pendiente' }
      ]) + tuSolicitud(t, v);
    } else if (v === 'revision') {
      html = historial([
        { ...presentaste, estado: 'actual' },
        { nombre: 'Validación', icono: 'check', fecha: 'Pendiente', estado: 'pendiente' },
        { nombre: 'Notificación', icono: 'sobre', fecha: 'Pendiente', estado: 'pendiente' },
        { nombre: 'Respuesta leída', icono: 'sobre-abierto', fecha: 'Pendiente', estado: 'pendiente' }
      ]) + tuSolicitud(t, v);
    }
    if (v === 'validado') {
      html = historial([
        { ...presentaste, estado: 'hecho' },
        { nombre: 'Validado', icono: 'check', fecha: `${valFecha} · CUT asignado`, estado: 'actual' },
        { nombre: 'Notificación', icono: 'sobre', fecha: 'Pendiente', estado: 'pendiente' },
        { nombre: 'Respuesta leída', icono: 'sobre-abierto', fecha: 'Pendiente', estado: 'pendiente' }
      ]) + tuSolicitud(t, v);
    }
    if (v === 'observado') {
      const f = fechasObservacion(t);
      const reqs = requisitosDe(t.ticket);
      const n = reqs.filter((r) => r.observado).length;
      html = `<div class="aviso aviso--marco-error" role="note">
          ${icono('error')}
          <div><p class="aviso__titulo">Tu solicitud fue observada. Subsana hasta el ${DIAS[f.plazo.getDay()].toLowerCase()} ${dmy(f.plazo)}</p>
          <p>Tienes ${n} ${n === 1 ? 'documento observado' : 'documentos observados'}. Si no subsanas dentro del plazo, el trámite se archivará.</p></div>
        </div>` +
        historial([
          { ...presentaste, nombre: 'Presentado', estado: 'hecho' },
          { nombre: 'Observado', icono: 'cerrar', fecha: conHora(f.observado), estado: 'observado' },
          { nombre: 'Subsanación', icono: 'tramites', fecha: `Pendiente · hasta el ${dmy(f.plazo)}`, estado: 'pendiente' },
          { nombre: 'Subsanado', icono: 'check', fecha: 'Pendiente', estado: 'pendiente' }
        ]) +
        `<section class="seccion-detalle" aria-labelledby="h-solicitud">
          <div class="seccion-detalle__cabecera">
            <h2 class="seccion-detalle__titulo" id="h-solicitud">${icono('expediente')}Tu solicitud</h2>
            <span class="estado estado--observado">Observado</span>
          </div>
          ${datos([{ k: 'N° de documento', v: escapar(t.documento) }, { k: 'Asunto', v: escapar(t.asunto) }])}
          <h3 class="subtitulo-detalle">Archivos adjuntos · enviados el ${t.fecha}, ${t.hora}</h3>
          <ul class="documentos documentos--subsanar">
            <li class="documento">
              ${icono('tramites', 'documento__icono')}
              <span class="documento__texto"><span class="documento__nombre">anexo1</span><span class="documento__sub">Enlace externo</span></span>
              <span class="pildora pildora--conforme">Conforme</span>
              <button type="button" class="boton boton--secundario" id="doc-anexo1" data-abrir="anexo1">Abrir enlace<span class="visualmente-oculto"> de anexo1 (se abre en otra pestaña)</span></button>
            </li>
            ${reqs.map((r) => filaRequisito(r, 'detalle', t.ticket)).join('')}
          </ul>
        </section>`;
    }
    if (v === 'nueva' || v === 'leida') {
      const base = new Date(aFecha(t.validacion[0], t.validacion[1]));
      const envio = masMinutos(base, 18);
      const leida = v === 'leida' ? (t.acuse ? new Date(t.acuse) : diaHabil(envio, 6)) : null;
      const aviso = opciones.recienLeida
        ? `<div class="aviso aviso--alerta" id="aviso-acuse">
            <div><p class="aviso__titulo">Se registró tu acuse de recibo y el trámite pasó a Finalizado</p>
            <p>Abriste esta respuesta el ${DIAS[leida.getDay()].toLowerCase()} ${dmy(leida)} a las ${hms(leida).slice(0, 5)}. Esa es la fecha de tu acuse de recibo y ya puedes descargarlo. Como el trámite está finalizado, ya no se puede agregar información complementaria.</p></div>
            <button type="button" class="boton boton--icono" id="cerrar-aviso-acuse" aria-label="Cerrar aviso">${icono('cerrar')}</button>
          </div>` : '';
      html = aviso + historial([
        { ...presentaste, estado: 'hecho' },
        { nombre: 'Validado', icono: 'check', fecha: `${valFecha} · CUT asignado`, estado: 'hecho' },
        { nombre: 'Envío de notificación', icono: 'sobre', fecha: `${dmy(envio)} · ${hms(envio)}`, estado: leida ? 'hecho' : 'actual' },
        { nombre: 'Leíste la respuesta', icono: 'sobre-abierto', fecha: leida ? `${dmy(leida)} · ${hms(leida)} · Finalizado` : 'Pendiente', estado: leida ? 'actual' : 'pendiente' }
      ]) + respuesta(t, leida);
    }

    // Repintar sin perder el foco de quien está usando el teclado
    const enfocado = document.activeElement && document.activeElement.id;
    $('#detalle').innerHTML = html;
    if (enfocado && $('#' + enfocado)) $('#' + enfocado).focus();
  }

  function iniciarDetalle() {
    aplicarAcuses();
    const cont = $('#detalle');
    function cargar() {
      const ticket = decodeURIComponent(location.hash.slice(1));
      const t = TRAMITES.find((x) => x.ticket === ticket) || TRAMITES.find((x) => x.nueva);
      if (!variante(t)) {
        cont.innerHTML = '<div class="aviso aviso--info">' + icono('info') + '<p>El detalle de un trámite archivado todavía no está diseñado.</p></div>';
        return;
      }
      pintarDetalle(t);
      // Respuesta nueva: el acuse se registra a los pocos segundos de abrirla (Figma, flujo VER, paso 2 → 3)
      if (variante(t) === 'nueva') {
        setTimeout(() => {
          const ahora = new Date();
          guardarAcuse(t.ticket, ahora.toISOString());
          t.nueva = false; t.estado = 'Finalizado'; t.acuse = ahora.toISOString();
          pintarDetalle(t, { recienLeida: true });
          // El aviso ya está a la vista: solo se anuncia al lector de pantalla, sin toast encima.
          const region = $('#anuncio');
          region.textContent = '';
          setTimeout(() => { region.textContent = 'Se registró tu acuse de recibo y el trámite pasó a Finalizado. Ya puedes descargar el acuse.'; }, 60);
        }, 4000);
      }
    }
    $('#contenido').addEventListener('click', (e) => {
      const d = e.target.closest('[data-descargar]');
      if (d) notificar(`En el sistema se descarga ${d.dataset.descargar}.`);
      const a = e.target.closest('[data-abrir]');
      if (a) notificar(`En el sistema se abre el enlace de ${a.dataset.abrir} en otra pestaña.`);
      if (e.target.closest('#cerrar-aviso-acuse')) {
        $('#aviso-acuse').remove();
        $('#detalle-titulo').focus();
      }
    });
    window.addEventListener('hashchange', cargar);
    cargar();
  }

  /* ------------------------------------------------------------------------
     SUBSANAR  (Figma casilla · página «subsanar documento», persona natural)
     03 Corregir: el trámite que hiciste (TUPA 2), en el paso de requisitos
     04 Revisar y enviar · 05 Enviada
     ------------------------------------------------------------------------ */
  function iniciarSubsanar() {
    aplicarAcuses();
    const ticket = decodeURIComponent(location.hash.slice(1));
    const t = TRAMITES.find((x) => x.ticket === ticket && x.estado === 'Observado')
           || TRAMITES.find((x) => x.estado === 'Observado');
    const reqs = requisitosDe(t.ticket);
    const f = fechasObservacion(t);
    const VISTAS = { corregir: 'Corregir trámite', revisar: 'Revisar y enviar la subsanación', enviada: 'Subsanación enviada' };

    // Datos fijos del trámite
    $$('.js-ticket-titulo').forEach((el) => { el.textContent = `Ticket ${t.ticket}`; });
    $('.js-procedimiento').textContent = `${t.tipo} 2 · ${t.asunto}`;
    $('.js-datos-doc').textContent = `${t.documento} · 3 folios`;
    $$('.js-volver-detalle').forEach((a) => { a.href = `detalle.html#${t.ticket}`; });
    const plazoTxt = `${DIAS[f.plazo.getDay()]} ${dmy(f.plazo)}`;
    $$('.js-tu-tramite').forEach((dl) => {
      dl.innerHTML = [
        ['N° de ticket', t.ticket],
        ['N° CUT', 'Se asigna al validar'],
        ['Procedimiento', `${t.tipo} 2 · ${escapar(t.asunto)}`],
        ['Presentado', conHora(f.presentado)],
        ['Observado', conHora(f.observado)],
        ['Plazo para subsanar', plazoTxt]
      ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    });

    function ir(vista) {
      $$('[data-vista]').forEach((s) => { s.hidden = s.dataset.vista !== vista; });
      document.title = `${VISTAS[vista]} · Casilla Electrónica · ANA`;
      const h = $(`[data-vista="${vista}"] .vista__titulo`);
      h.focus();
      window.scrollTo(0, 0);
    }

    /* --- 03 · Corregir ---------------------------------------------------- */
    const lista = $('#lista-corregir');
    const pintar = () => { lista.innerHTML = reqs.map((r) => filaRequisito(r, 'corregir', t.ticket)).join(''); };
    const pendientes = () => reqs.filter((r) => r.observado && !r.nuevo);

    function resumenErrores(enfocar) {
      const caja = $('#errores-corregir');
      const faltan = reqs.filter((r) => r.error);
      if (!faltan.length) { caja.hidden = true; caja.innerHTML = ''; return; }
      caja.innerHTML = `${icono('error')}<div><p class="aviso__titulo">Falta corregir ${faltan.length} ${faltan.length === 1 ? 'documento' : 'documentos'}</p>
        <ul>${faltan.map((r) => `<li><a href="#rq${r.n}">${r.n}. ${escapar(r.nombre)}: ${escapar(r.error)}</a></li>`).join('')}</ul></div>`;
      caja.hidden = false;
      if (enfocar) caja.focus();
    }

    lista.addEventListener('change', (e) => {
      const input = e.target.closest('[data-req]');
      if (!input || !input.files.length) return;
      const r = reqs.find((x) => x.n === Number(input.dataset.req));
      const archivo = input.files[0];
      if (!/\.pdf$/i.test(archivo.name) && archivo.type !== 'application/pdf') r.error = 'El archivo tiene que ser PDF.';
      else if (archivo.size > MAX_BYTES) r.error = `El archivo pesa ${mb(archivo.size)}. El máximo es 400 MB.`;
      else { r.error = ''; r.nuevo = { nombre: archivo.name, bytes: archivo.size }; }
      pintar();
      if (!$('#errores-corregir').hidden) resumenErrores(false);
      if (r.nuevo) {
        notificarSoloLector(`${r.nombre}: subsanado con ${archivo.name}. ${pendientes().length ? `Faltan ${pendientes().length}.` : 'Ya corregiste todos los documentos observados.'}`);
        const sig = pendientes()[0];                        // seguir con el siguiente documento
        ($(sig ? `#rq${sig.n}` : '[data-deshacer="' + r.n + '"]') || lista).focus();
      } else {
        $(`#rq${r.n}`).focus();
      }
    });
    lista.addEventListener('click', (e) => {
      const q = e.target.closest('[data-deshacer]');
      if (!q) return;
      const r = reqs.find((x) => x.n === Number(q.dataset.deshacer));
      notificarSoloLector(`Quitaste ${r.nuevo.nombre}. ${r.nombre} vuelve a requerir subsanación.`);
      r.nuevo = null;
      pintar();
      $(`#rq${r.n}`).focus();
    });
    $('#errores-corregir').addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#rq"]');
      if (a) { e.preventDefault(); $(a.getAttribute('href')).focus(); }
    });

    $('#form-corregir').addEventListener('submit', (e) => {
      e.preventDefault();
      pendientes().forEach((r) => { r.error = r.actual ? 'Reemplaza el archivo observado.' : 'Sube el archivo que falta.'; });
      if (pendientes().length) { pintar(); resumenErrores(true); return; }
      resumenErrores(false);
      pintarRevision();
      ir('revisar');
    });

    /* --- 04 · Revisar y enviar ------------------------------------------- */
    function pintarRevision() {
      $('#lista-revisar').innerHTML = reqs.filter((r) => r.nuevo).map((r) => filaRequisito(r, 'revisar', t.ticket)).join('');
      const conformes = reqs.filter((r) => !r.observado).length;
      $('#no-cambia').textContent = `${conformes} ${conformes === 1 ? 'documento conforme' : 'documentos conformes'}, los anexos y los datos del trámite.`;
    }
    $('#volver-corregir').addEventListener('click', () => ir('corregir'));
    $('#enviar-subsanacion').addEventListener('click', () => {
      const ahora = new Date();
      guardarAcuse('subsanado:' + t.ticket, ahora.toISOString());
      $('#enviada-fecha').textContent = `${dmy(ahora)}, ${hms(ahora).slice(0, 5)}`;
      ir('enviada');
      notificarSoloLector('Enviaste la subsanación. Tu solicitud volvió a revisión.');
    });

    pintar();
  }

  // Anuncio para lector de pantalla sin toast (la pantalla ya muestra el cambio)
  function notificarSoloLector(texto) {
    const region = $('#anuncio');
    if (!region) return;
    region.textContent = '';
    setTimeout(() => { region.textContent = texto; }, 60);
  }

  /* ------------------------------------------------------------------------
     MI PERFIL  (Figma casilla, página «mi perfil»)
     Secciones por enlace: #datos · #contrasena · #representantes · #representante
     ------------------------------------------------------------------------ */
  const UBIGEO = {
    Lima: { Lima: ['Ate', 'Cercado de Lima', 'Miraflores', 'Santiago de Surco'] },
    Arequipa: { Arequipa: ['Arequipa', 'Cayma', 'Yanahuara'] },
    Callao: { Callao: ['Bellavista', 'Callao', 'La Perla'] }
  };
  const DATOS_PERFIL = {
    natural: { correo: 'correo@ejemplo.com', celular: '987654321', direccion: 'Jr. Los Sauces 245', ubigeo: ['Lima', 'Lima', 'Ate'] },
    juridica: { correo: 'contacto@buenafe.pe', celular: '987654321', direccion: 'Av. Los Andes 1200', ubigeo: ['Arequipa', 'Arequipa', 'Cayma'], sector: 'Privado' }
  };
  // RENIEC simulado: cualquier DNI de 8 dígitos devuelve un nombre de ejemplo
  const RENIEC = { '41235678': ['Carlos', 'Huamán', 'Ríos'], '43987654': ['Lucía', 'Paredes', 'Soto'] };
  const REPS = [
    { tipo: 'DNI', num: '41235678', nombres: 'Carlos', paterno: 'Huamán', materno: 'Ríos', cargo: 'Gerente general', correo: 'c.huaman@buenafe.pe', celular: '987111222', activo: true, ubigeo: ['Arequipa', 'Arequipa', 'Arequipa'], direccion: 'Calle Mercaderes 310' },
    { tipo: 'DNI', num: '43987654', nombres: 'Lucía', paterno: 'Paredes', materno: 'Soto', cargo: 'Apoderada', correo: 'l.paredes@buenafe.pe', celular: '987333444', activo: true, ubigeo: ['Arequipa', 'Arequipa', 'Yanahuara'], direccion: 'Av. Ejército 820' },
    { tipo: 'Carné de extranjería', num: '001234567', nombres: 'Jorge', paterno: 'Salazar', materno: 'Vega', cargo: 'Jefe de asuntos ambientales', correo: 'j.salazar@buenafe.pe', celular: '987555666', activo: false, ubigeo: ['Lima', 'Lima', 'Miraflores'], direccion: 'Calle Berlín 455' }
  ];
  const nombreRep = (r) => [r.nombres, r.paterno, r.materno].filter(Boolean).join(' ');
  const docRep = (r) => `${r.tipo === 'DNI' ? 'DNI' : 'CE'} ${r.num}`;

  function iniciarUbigeo(p, valores) {
    const dep = $(`#${p}-dep`), prov = $(`#${p}-prov`), dist = $(`#${p}-dist`);
    const opciones = (sel, lista, valor) => { sel.innerHTML = '<option value="">Selecciona</option>' + lista.map((o) => `<option${o === valor ? ' selected' : ''}>${o}</option>`).join(''); };
    const pintar = (v = [dep.value, prov.value, dist.value]) => {
      opciones(dep, Object.keys(UBIGEO), v[0]);
      opciones(prov, v[0] ? Object.keys(UBIGEO[v[0]]) : [], v[1]);
      opciones(dist, v[0] && v[1] && UBIGEO[v[0]][v[1]] ? UBIGEO[v[0]][v[1]] : [], v[2]);
    };
    dep.addEventListener('change', () => pintar([dep.value, '', '']));   // en cascada: al cambiar el departamento se vacían los demás
    prov.addEventListener('change', () => pintar([dep.value, prov.value, '']));
    pintar(valores || ['', '', '']);
    return pintar;
  }

  function validar(idResumen, reglas) {
    const errores = [];
    reglas.forEach(([id, msj, prueba]) => {
      const c = document.getElementById(id);
      marcarError(c, '');
      if (!(prueba ? prueba(c) : c.value.trim())) errores.push({ id, texto: msj });
    });
    errores.forEach((er) => marcarError(document.getElementById(er.id), er.texto));
    mostrarResumen($(idResumen), errores);
    return !errores.length;
  }
  const esCorreo = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.value.trim());
  const esCelular = (c) => /^9\d{8}$/.test(c.value.replace(/\s/g, ''));

  function iniciarPerfil() {
    const J = PERFIL.tipo === 'juridica';
    const D = DATOS_PERFIL[PERFIL.tipo];
    const SECCIONES = J ? ['datos', 'contrasena', 'representantes', 'representante'] : ['datos', 'contrasena'];
    const NOMBRES = { datos: J ? 'Datos de la empresa' : 'Tus datos', contrasena: 'Contraseña', representantes: 'Representantes legales', representante: 'Agregar representante' };
    let editando = null;   // índice del representante que se edita

    // Textos según el perfil
    $('.js-nav-datos').textContent = NOMBRES.datos;
    $('#h-datos').textContent = NOMBRES.datos;
    $('.js-intro-datos').textContent = J ? 'Si cambias el correo o el celular, te enviaremos un código para confirmarlo.' : 'Si cambias tu correo o tu celular, te enviaremos un código para confirmarlo.';
    $$('.js-etq-doc').forEach((e) => { e.textContent = J ? 'RUC' : 'Documento'; });
    $$('.js-val-doc').forEach((e) => { e.textContent = J ? '20512345678' : PERFIL.doc; });
    $$('.js-etq-nombre').forEach((e) => { e.textContent = J ? 'Razón social' : 'Nombres y apellidos'; });
    $$('.js-val-nombre').forEach((e) => { e.textContent = PERFIL.nombre; });
    $('.js-origen-frase').textContent = J ? 'El RUC y la razón social vienen de SUNAT y no se pueden cambiar.' : 'Tu documento y tu nombre vienen de RENIEC y no se pueden cambiar.';
    $('.js-subt-direccion').textContent = J ? 'Dirección legal' : 'Dirección';
    $('#d-direccion').closest('.campo').querySelector('.js-etq-direccion').textContent = J ? 'Dirección legal / fiscal' : 'Dirección';
    if (J) { $('#d-correo-ayuda').textContent = 'Verificado. Aquí avisamos cuando llega una notificación.'; $('#d-celular-ayuda').textContent = 'Verificado. Aquí llega el SMS de aviso.'; }

    function ir(id, enfocar = true) {
      if (!SECCIONES.includes(id)) id = 'datos';
      $$('[data-seccion]').forEach((s) => { s.hidden = s.dataset.seccion !== id; });
      const actual = id === 'representante' ? 'representantes' : id;
      $$('.perfil-nav__item').forEach((a) => { if (a.dataset.ir === actual) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      // Migas: la sección dentro de Mi perfil
      const ol = $('#migas-lista');
      ol.innerHTML = '<li><a href="bandeja.html">Mis trámites</a></li>' + (id === 'representante'
        ? `<li><a href="#representantes">Mi perfil · Representantes legales</a></li><li><span aria-current="page">${editando === null ? 'Agregar representante' : 'Editar representante'}</span></li>`
        : '<li><span aria-current="page">Mi perfil</span></li>');
      $('#perfil-h1').textContent = id === 'representante' ? (editando === null ? 'Agregar representante legal' : 'Editar representante legal') : 'Mi perfil';
      document.title = `${id === 'representante' ? $('#perfil-h1').textContent : NOMBRES[id] + ' · Mi perfil'} · Casilla Electrónica · ANA`;
      if (id === 'representantes') pintarReps();
      if (enfocar) { const h = $(`[data-seccion="${id}"] .perfil__h2`); if (h) h.focus(); }
    }
    window.addEventListener('hashchange', () => ir(location.hash.slice(1)));

    /* --- Datos ---------------------------------------------------------- */
    const ubD = iniciarUbigeo('d', D.ubigeo);
    function cargarDatos() {
      $('#d-correo').value = D.correo; $('#d-celular').value = D.celular; $('#d-direccion').value = D.direccion; ubD(D.ubigeo);
      if (J) $('#sector').value = D.sector;
      ['d-correo', 'd-celular', 'd-direccion', 'd-dep', 'd-prov', 'd-dist'].forEach((i) => marcarError($('#' + i), ''));
      mostrarResumen($('#errores-datos'), []);
    }
    cargarDatos();
    $('#form-datos').addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = validar('#errores-datos', [
        ['d-correo', 'Escribe un correo válido, por ejemplo nombre@dominio.pe.', esCorreo],
        ['d-celular', 'El celular tiene 9 dígitos y empieza con 9.', esCelular],
        ['d-direccion', J ? 'Escribe la dirección legal.' : 'Escribe tu dirección.'],
        ['d-dep', 'Elige el departamento.'], ['d-prov', 'Elige la provincia.'], ['d-dist', 'Elige el distrito.']
      ]);
      if (!ok) return;
      const cambioContacto = $('#d-correo').value.trim() !== D.correo || $('#d-celular').value.trim() !== D.celular;
      Object.assign(D, { correo: $('#d-correo').value.trim(), celular: $('#d-celular').value.trim(), direccion: $('#d-direccion').value.trim(), ubigeo: [$('#d-dep').value, $('#d-prov').value, $('#d-dist').value] });
      notificar(cambioContacto ? 'Guardamos tus cambios. Te enviamos un código para confirmar el nuevo correo o celular.' : 'Guardamos tus cambios.');
    });
    $('#form-datos [data-cancelar]').addEventListener('click', () => { cargarDatos(); notificar('Se descartaron los cambios.'); });

    /* --- Contraseña ------------------------------------------------------ */
    const REGLAS = { largo: (v) => v.length >= 8, caso: (v) => /[a-záéíóúñ]/.test(v) && /[A-ZÁÉÍÓÚÑ]/.test(v), numero: (v) => /\d/.test(v), simbolo: (v) => /[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ\s]/.test(v) };
    const NIVEL = ['débil', 'débil', 'media', 'media', 'fuerte'];
    $('#clave-nueva').setAttribute('aria-describedby', 'medidor-texto requisitos clave-nueva-error');
    function pintarMedidor() {
      const v = $('#clave-nueva').value;
      const cumple = Object.keys(REGLAS).filter((k) => REGLAS[k](v));
      $$('#requisitos li').forEach((li) => {
        const ok = cumple.includes(li.dataset.req);
        li.classList.toggle('requisitos__item--ok', ok);
        li.dataset.estado = ok ? 'cumplido' : 'pendiente';
        $('.js-req-estado', li).textContent = ok ? ', cumplido' : ', pendiente';
      });
      const n = v ? cumple.length : 0;
      $('.medidor').dataset.nivel = !v ? '0' : n <= 1 ? '1' : n <= 3 ? '2' : '3';
      $('#medidor-texto').textContent = v ? `Seguridad: ${NIVEL[n]}. Cumple ${n} de 4 requisitos.` : 'Seguridad: escribe tu nueva contraseña';
    }
    $('#clave-nueva').addEventListener('input', pintarMedidor);
    pintarMedidor();
    $$('[data-ver-clave]').forEach((b) => b.addEventListener('click', () => {
      const c = $('#' + b.dataset.verClave); const ver = c.type === 'password';
      c.type = ver ? 'text' : 'password'; b.setAttribute('aria-pressed', String(ver));
      $('use', b).setAttribute('href', ver ? '#ojo-tachado' : '#ojo');
    }));
    $('#form-clave').addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = validar('#errores-clave', [
        ['clave-actual', 'Escribe tu contraseña actual.'],
        ['clave-nueva', 'La nueva contraseña no cumple todos los requisitos.', (c) => Object.values(REGLAS).every((f) => f(c.value))],
        ['clave-repetir', 'Las contraseñas no coinciden.', (c) => c.value && c.value === $('#clave-nueva').value]
      ]);
      if (!ok) return;
      e.target.reset(); pintarMedidor();
      notificar('Cambiaste tu contraseña. La próxima vez ingresa con la nueva.');
    });
    $('#form-clave [data-cancelar]').addEventListener('click', () => { $('#form-clave').reset(); pintarMedidor(); mostrarResumen($('#errores-clave'), []); });

    /* --- Representantes -------------------------------------------------- */
    function pintarReps(anunciar) {
      const q = $('#reps-buscar').value.trim().toLowerCase();
      const est = $('#reps-estado').value;
      const lista = REPS.map((r, i) => ({ r, i })).filter(({ r }) =>
        (!q || docRep(r).toLowerCase().includes(q) || nombreRep(r).toLowerCase().includes(q)) &&
        (est === 'Todos' || (est === 'Activos') === r.activo));
      $('#reps-cuerpo').innerHTML = lista.length ? lista.map(({ r, i }) => `<tr>
          <td>${docRep(r)}</td>
          <th scope="row">${escapar(nombreRep(r))}</th>
          <td>${escapar(r.cargo)}</td>
          <td><span class="tabla__contacto">${escapar(r.correo)}</span><span class="tabla__contacto tabla__contacto--sec">${r.celular.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}</span></td>
          <td><span class="estado estado--${r.activo ? 'validado' : 'archivado'}">${icono(r.activo ? 'check' : 'archivo')}${r.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td><div class="acciones-texto">
            <a class="enlace-accion" href="#representante" data-editar-rep="${i}">Editar<span class="visualmente-oculto"> a ${escapar(nombreRep(r))}</span></a>
            <button type="button" class="enlace-accion" data-${r.activo ? 'desactivar' : 'activar'}-rep="${i}">${r.activo ? 'Desactivar' : 'Activar'}<span class="visualmente-oculto"> a ${escapar(nombreRep(r))}</span></button>
          </div></td></tr>`).join('')
        : `<tr><td colspan="6">${estadoVacio('sin-resultados', 'No hay representantes con esos filtros. Prueba con otros o limpia la búsqueda.')}</td></tr>`;
      const activos = REPS.filter((r) => r.activo).length;
      $('#reps-resumen').textContent = `${REPS.length} representantes · ${activos} ${activos === 1 ? 'activo' : 'activos'}`;
      if (anunciar) notificarSoloLector(lista.length ? `${lista.length} ${lista.length === 1 ? 'representante' : 'representantes'}.` : 'No hay representantes con esos filtros.');
    }
    $('#form-reps').addEventListener('submit', (e) => { e.preventDefault(); pintarReps(true); });

    // Modal de confirmación: foco adentro, Escape cierra, al cerrar vuelve al botón que lo abrió
    const capa = $('#modal-desactivar');
    let origen = null, aDesactivar = null;
    function abrirModal(i, boton) {
      aDesactivar = i; origen = boton;
      $('#modal-titulo').textContent = `¿Desactivar a ${nombreRep(REPS[i])}?`;
      $('#modal-texto').textContent = 'Ya no podrá presentar trámites en nombre de la empresa ni recibirá avisos. Sus trámites anteriores se mantienen. Puedes volver a activarlo cuando quieras.';
      capa.hidden = false;
      $$('body > *:not(.modal-capa):not(script)').forEach((el) => { if (!el.hasAttribute('inert')) { el.setAttribute('inert', ''); el.dataset.inertModal = '1'; } });
      $('#modal-cancelar').focus();   // la acción que no destruye nada recibe el foco primero
    }
    function cerrarModal(confirmado) {
      capa.hidden = true;
      $$('[data-inert-modal]').forEach((el) => { el.removeAttribute('inert'); delete el.dataset.inertModal; });
      if (confirmado) {
        const r = REPS[aDesactivar]; r.activo = false; pintarReps();
        notificar(`Desactivaste a ${nombreRep(r)}.`);
        const b = $(`[data-activar-rep="${aDesactivar}"]`); if (b) b.focus();
      } else if (origen && document.contains(origen)) origen.focus();
    }
    $('#modal-confirmar').addEventListener('click', () => cerrarModal(true));
    $('#modal-cancelar').addEventListener('click', () => cerrarModal(false));
    capa.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrarModal(false); }
      if (e.key === 'Tab') {   // el foco no sale del diálogo
        const f = $$('button', capa); const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    $('#reps-cuerpo').addEventListener('click', (e) => {
      const d = e.target.closest('[data-desactivar-rep]'); if (d) abrirModal(Number(d.dataset.desactivarRep), d);
      const a = e.target.closest('[data-activar-rep]');
      if (a) { const i = Number(a.dataset.activarRep); REPS[i].activo = true; pintarReps(); notificar(`Activaste a ${nombreRep(REPS[i])}.`); const b = $(`[data-desactivar-rep="${i}"]`); if (b) b.focus(); }
      const ed = e.target.closest('[data-editar-rep]'); if (ed) { editando = Number(ed.dataset.editarRep); cargarRep(); }
    });
    $('[data-nuevo-rep]').addEventListener('click', () => { editando = null; cargarRep(); });

    /* --- Formulario del representante ------------------------------------ */
    const ubR = iniciarUbigeo('r');
    function modoDocumento() {
      const dni = $('#rep-tipo').value === 'DNI';
      $('#rep-num-ayuda').textContent = dni ? '8 dígitos' : '9 dígitos';
      $('#rep-num').setAttribute('inputmode', dni ? 'numeric' : 'text');
      const r = RENIEC[$('#rep-num').value.trim()];
      const nombreDni = dni && /^\d{8}$/.test($('#rep-num').value.trim()) ? (r || ['Rosa', 'Flores', 'Díaz']) : null;
      $('.js-rep-reniec').hidden = !nombreDni;
      $('.js-rep-manual').hidden = dni;
      if (nombreDni) { $('#rep-reniec-nombres').textContent = nombreDni[0]; $('#rep-reniec-paterno').textContent = nombreDni[1]; $('#rep-reniec-materno').textContent = nombreDni[2]; }
      return nombreDni;
    }
    $('#rep-tipo').addEventListener('change', modoDocumento);
    $('#rep-num').addEventListener('input', () => { const n = modoDocumento(); if (n) notificarSoloLector(`RENIEC: ${n.join(' ')}.`); });
    function cargarRep() {
      const r = editando === null ? { tipo: 'DNI', num: '', nombres: '', paterno: '', materno: '', cargo: '', correo: '', celular: '', direccion: '', ubigeo: ['', '', ''] } : REPS[editando];
      $('#rep-tipo').value = r.tipo; $('#rep-num').value = r.num; $('#rep-nombres').value = r.nombres; $('#rep-paterno').value = r.paterno; $('#rep-materno').value = r.materno;
      $('#rep-cargo').value = r.cargo; $('#rep-correo').value = r.correo; $('#rep-celular').value = r.celular; $('#r-direccion').value = r.direccion; ubR(r.ubigeo);
      $$('#form-rep .campo__control').forEach((c) => marcarError(c, '')); mostrarResumen($('#errores-rep'), []);
      modoDocumento();
    }
    $('#form-rep').addEventListener('submit', (e) => {
      e.preventDefault();
      const dni = $('#rep-tipo').value === 'DNI';
      const ok = validar('#errores-rep', [
        ['rep-num', dni ? 'El DNI tiene 8 dígitos.' : 'El carné de extranjería tiene 9 dígitos.', (c) => (dni ? /^\d{8}$/ : /^\d{9}$/).test(c.value.trim())],
        ...(dni ? [] : [['rep-nombres', 'Escribe los nombres.'], ['rep-paterno', 'Escribe el apellido paterno.']]),
        ['rep-cargo', 'Escribe el cargo.'],
        ['rep-correo', 'Escribe un correo válido, por ejemplo nombre@dominio.pe.', esCorreo],
        ['rep-celular', 'El celular tiene 9 dígitos y empieza con 9.', esCelular],
        ['r-direccion', 'Escribe la dirección.'], ['r-dep', 'Elige el departamento.'], ['r-prov', 'Elige la provincia.'], ['r-dist', 'Elige el distrito.']
      ]);
      if (!ok) return;
      const n = modoDocumento();
      const datos = { tipo: $('#rep-tipo').value, num: $('#rep-num').value.trim(),
        nombres: n ? n[0] : $('#rep-nombres').value.trim(), paterno: n ? n[1] : $('#rep-paterno').value.trim(), materno: n ? n[2] : $('#rep-materno').value.trim(),
        cargo: $('#rep-cargo').value.trim(), correo: $('#rep-correo').value.trim(), celular: $('#rep-celular').value.trim(),
        direccion: $('#r-direccion').value.trim(), ubigeo: [$('#r-dep').value, $('#r-prov').value, $('#r-dist').value] };
      if (editando === null) REPS.push({ ...datos, activo: true }); else Object.assign(REPS[editando], datos);
      notificar(editando === null ? `Agregaste a ${nombreRep(datos)}. Le enviamos un código para confirmar su correo y su celular.` : `Guardamos los cambios de ${nombreRep(datos)}.`);
      editando = null; location.hash = 'representantes';
    });
    $('[data-volver-reps]').addEventListener('click', () => { editando = null; location.hash = 'representantes'; });

    const inicial = location.hash.slice(1);
    if (inicial === 'representante') cargarRep();
    ir(inicial || 'datos', false);   // al cargar no se mueve el foco: solo al cambiar de sección
  }

  // Estado vacío de sección (componente del sistema)
  function estadoVacio(tipo, texto, accion) {
    return `<div class="vacio vacio--seccion">${ILU_VACIO[tipo]}<p class="vacio__texto">${texto}</p>${accion || ''}</div>`;
  }

  /* ------------------------------------------------------------------------
     REGISTRO · Crear tu cuenta (Figma casilla · página «crear cuenta»)
     6 pasos + términos (modal) + cuenta creada. ID Perú y el SMS son simulados.
     ------------------------------------------------------------------------ */
  function iniciarRegistro() {
    const PASOS = ['quien', 'identidad', 'datos', 'contacto', 'clave', 'revision'];
    const NOMBRE = { quien: '¿Quién va a usar esta casilla?', identidad: 'Identidad', datos: '¿Dónde vives?', contacto: 'Cómo te contactamos', clave: 'Tu contraseña', revision: 'Revisar y crear' };
    const METODO = { facial: 'reconocimiento facial', dnie: 'DNI electrónico', certificado: 'certificado digital' };
    const est = { paso: 1, hechos: new Set(), celularVerificado: '' };
    const titulos = document.title;

    function resumen(id) {
      if (id === 'quien') return $('input[name="quien"]:checked').value === 'persona' ? 'Yo, como persona' : 'Una empresa o institución';
      if (id === 'identidad') return 'Verificada con RENIEC';
      if (id === 'datos') return `${$('#r-dist').value}, ${$('#r-dep').value}`;
      if (id === 'contacto') return `${$('#r-correo').value.trim()} · ${$('#r-celular').value.trim()}`;
      if (id === 'clave') return 'Guardada';
      return '';
    }
    function pintarAvance() {
      const fin = est.paso > PASOS.length;
      const hechos = fin ? PASOS.length : est.hechos.size;
      $('#avance-relleno').style.width = `${(hechos / PASOS.length) * 100}%`;
      $('#avance-texto').textContent = fin ? 'Cuenta creada' : `Paso ${est.paso} de ${PASOS.length}`;
      $('#avance-lista').innerHTML = PASOS.map((id, i) => {
        const n = i + 1;
        const hecho = est.hechos.has(n) && n !== est.paso;
        const actual = n === est.paso;
        const clase = hecho ? 'marcador--hecho' : actual ? 'marcador--actual' : 'marcador--pendiente';
        const cond = hecho ? 'completado' : actual ? 'paso actual' : 'pendiente';
        const res = hecho ? resumen(id) : actual ? 'En curso' : '';
        // La identidad verificada no se edita: volver a ID Perú obliga a empezar de nuevo
        const editar = hecho && id !== 'identidad'
          ? `<button type="button" class="enlace-editar" data-editar="${n}">${icono('editar')}Editar<span class="visualmente-oculto"> ${NOMBRE[id]}</span></button>` : '';
        return `<li class="avance__paso${hecho || actual ? ' avance__paso--activo' : ''}"${actual ? ' aria-current="step"' : ''}>
          <span class="marcador marcador--chico ${clase}" aria-hidden="true">${n}</span>
          <span class="avance__texto"><span class="avance__nombre">${NOMBRE[id]}<span class="visualmente-oculto">, ${cond}</span></span>
          ${res ? `<span class="avance__resumen">${escapar(res)}</span>` : ''}</span>${editar}</li>`;
      }).join('');
    }
    function irA(n, enfocar = true) {
      est.paso = n;
      const id = n > PASOS.length ? 'creada' : PASOS[n - 1];
      $$('[data-paso]').forEach((s) => { s.hidden = s.dataset.paso !== id; });
      $('#contenido').classList.toggle('pagina--registro-fin', id === 'creada');
      pintarAvance();
      document.title = id === 'creada' ? `Cuenta creada · ${titulos}` : `Paso ${n} de 6 · ${NOMBRE[id]} · ${titulos}`;
      if (!enfocar) return;
      window.scrollTo({ top: 0, behavior: 'auto' });
      $(`[data-paso="${id}"] [tabindex="-1"]`).focus();
    }
    const avanzar = () => { est.hechos.add(est.paso); irA(est.paso + 1); };
    document.addEventListener('click', (e) => {
      const ed = e.target.closest('[data-editar]'); if (ed) { irA(Number(ed.dataset.editar)); return; }
      if (e.target.closest('[data-volver]')) irA(est.paso - 1);
    });

    /* 1 · Quién */
    $('#f-quien').addEventListener('submit', (e) => { e.preventDefault(); avanzar(); });

    /* 2 · Identidad: el botón del método envía el formulario; se simula la ida y vuelta a ID Perú */
    $('#r-num-doc').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
    $('#f-identidad').addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = validar('#errores-identidad', [['r-num-doc', 'Número de documento: el DNI tiene 8 dígitos.', (c) => /^\d{8}$/.test(c.value)]]);
      if (!ok) return;
      const dni = $('#r-num-doc').value;
      const [nom, pat, mat] = (RENIEC[dni] || ['Ana', 'Quispe', 'Mamani']).map((x) => x.toUpperCase());
      $('#r-nombres').textContent = nom; $('#r-paterno').textContent = pat; $('#r-materno').textContent = mat;
      const metodo = METODO[(e.submitter && e.submitter.value) || 'facial'];
      avanzar();
      notificar(`Volviste de ID Perú. Verificamos tu identidad con ${metodo}.`);
    });

    /* 3 · Datos */
    iniciarUbigeo('r', ['', '', '']);
    $('#f-datos').addEventListener('submit', (e) => {
      e.preventDefault();
      if (validar('#errores-datos', [
        ['r-direccion', 'Dirección: escribe la calle y el número.'],
        ['r-dep', 'Departamento: elige uno.'], ['r-prov', 'Provincia: elige una.'], ['r-dist', 'Distrito: elige uno.']])) avanzar();
    });

    /* 4 · Contacto + código por SMS */
    const cel = () => $('#r-celular').value.replace(/\s/g, '');
    const reglasContacto = () => [
      ['r-correo', 'Correo electrónico: escribe la dirección completa, con @ y el dominio. Por ejemplo: nombre@gmail.com', esCorreo],
      ['r-correo2', 'Confirma tu correo: debe ser igual al correo electrónico.', (c) => c.value.trim() && c.value.trim().toLowerCase() === $('#r-correo').value.trim().toLowerCase()],
      ['r-celular', 'Celular: tiene 9 dígitos y empieza con 9.', esCelular]
    ];
    $('#r-celular').addEventListener('input', () => { if (est.celularVerificado && cel() !== est.celularVerificado) est.celularVerificado = ''; });
    function pedirCodigo() {
      $('#codigo-sms').hidden = false;
      $('#r-codigo').value = '';
      marcarError($('#r-codigo'), '');
      $('#r-codigo-ayuda').textContent = `Se lo enviamos al ${cel().slice(0, 3)} *** ${cel().slice(-3)}. Vence en 10 minutos. En este prototipo sirve cualquier código de 6 dígitos.`;
      $('#t-codigo').focus();
    }
    $('#f-contacto').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validar('#errores-contacto', reglasContacto())) return;
      if (est.celularVerificado === cel()) { avanzar(); return; }
      pedirCodigo();
      notificar('Te enviamos un código por SMS. Escríbelo para verificar tu celular.');
    });
    $('#r-codigo').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
    $('#verificar-codigo').addEventListener('click', () => {
      const c = $('#r-codigo');
      if (!/^\d{6}$/.test(c.value)) { marcarError(c, 'El código tiene 6 dígitos. Revisa el SMS.'); c.focus(); return; }
      marcarError(c, '');
      est.celularVerificado = cel();
      $('#codigo-sms').hidden = true;
      avanzar();
      notificar('Verificamos tu celular.');
    });
    $('#reenviar-codigo').addEventListener('click', () => { pedirCodigo(); notificar('Te enviamos un código nuevo.'); });

    /* 5 · Contraseña (mismo medidor que Mi perfil) */
    const REGLAS = { largo: (v) => v.length >= 8, caso: (v) => /[a-záéíóúñ]/.test(v) && /[A-ZÁÉÍÓÚÑ]/.test(v), numero: (v) => /\d/.test(v), simbolo: (v) => /[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ\s]/.test(v) };
    const NIVEL = ['débil', 'débil', 'media', 'media', 'fuerte'];
    $('#r-clave').setAttribute('aria-describedby', 'medidor-texto requisitos r-clave-error');
    function medidor() {
      const v = $('#r-clave').value;
      const cumple = Object.keys(REGLAS).filter((k) => REGLAS[k](v));
      $$('#requisitos li').forEach((li) => {
        const ok = cumple.includes(li.dataset.req);
        li.classList.toggle('requisitos__item--ok', ok);
        li.dataset.estado = ok ? 'cumplido' : 'pendiente';
        $('.js-req-estado', li).textContent = ok ? ', cumplido' : ', pendiente';
      });
      const n = v ? cumple.length : 0;
      $('.medidor').dataset.nivel = !v ? '0' : n <= 1 ? '1' : n <= 3 ? '2' : '3';
      $('#medidor-texto').textContent = v ? `Seguridad: ${NIVEL[n]}. Cumple ${n} de 4 requisitos.` : 'Seguridad: escribe tu contraseña';
      return n;
    }
    $('#r-clave').addEventListener('input', medidor); medidor();
    $$('[data-ver-clave]').forEach((b) => b.addEventListener('click', () => {
      const c = $('#' + b.dataset.verClave); const ver = c.type === 'password';
      c.type = ver ? 'text' : 'password'; b.setAttribute('aria-pressed', String(ver));
      $('use', b).setAttribute('href', ver ? '#ojo-tachado' : '#ojo');
    }));
    $('#f-clave').addEventListener('submit', (e) => {
      e.preventDefault();
      if (validar('#errores-clave', [
        ['r-clave', 'Contraseña: debe cumplir los 4 requisitos de la lista.', () => medidor() === 4],
        ['r-clave2', 'Repite la contraseña: no coincide con la que escribiste.', (c) => c.value && c.value === $('#r-clave').value]])) avanzar();
    });

    /* 6 · Revisar y crear + modal de términos */
    const capa = $('#modal-terminos');
    let origen = null;
    function abrirTerminos(boton) {
      origen = boton; capa.hidden = false;
      $$('body > *:not(.modal-capa):not(script)').forEach((el) => { if (!el.hasAttribute('inert')) { el.setAttribute('inert', ''); el.dataset.inertModal = '1'; } });
      $('#terminos-titulo').focus();
    }
    function cerrarTerminos(acepta) {
      capa.hidden = true;
      $$('[data-inert-modal]').forEach((el) => { el.removeAttribute('inert'); delete el.dataset.inertModal; });
      const casilla = $('#r-terminos');
      if (acepta) { casilla.checked = true; marcarError(casilla, ''); notificar('Aceptaste los Términos y condiciones.'); casilla.focus(); }
      else if (origen && document.contains(origen)) origen.focus();
    }
    $('#abrir-terminos').addEventListener('click', (e) => abrirTerminos(e.currentTarget));
    // La casilla se marca solo si aceptas en la ventana (Figma): marcarla la abre
    $('#r-terminos').addEventListener('click', (e) => { if (e.target.checked) { e.preventDefault(); abrirTerminos(e.target); } });
    $('#terminos-aceptar').addEventListener('click', () => cerrarTerminos(true));
    $('#terminos-cerrar').addEventListener('click', () => cerrarTerminos(false));
    capa.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrarTerminos(false); }
      if (e.key === 'Tab') {
        const f = $$('button, [tabindex="0"]', capa); const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    $('#f-revision').addEventListener('submit', (e) => {
      e.preventDefault();
      if (validar('#errores-revision', [
        ['r-terminos', 'Acepta los Términos y condiciones para crear tu cuenta.', (c) => c.checked],
        ['r-declaro', 'Marca la declaración jurada para crear tu cuenta.', (c) => c.checked]])) { avanzar(); notificar('Creamos tu cuenta.'); }
    });

    irA(1, false);
  }

  /* ------------------------------------------------------------------------
     ARRANQUE
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    iniciarNotificacion();
    iniciarFueraDeAlcance();
    iniciarMenus();
    iniciarDesplegables();
    const pagina = document.body.dataset.pagina;
    if (pagina === 'ingreso') iniciarIngreso();
    if (pagina === 'bandeja') iniciarBandeja();
    if (pagina === 'nuevo-documento') iniciarNuevoDocumento();
    aplicarPerfil();
    // Páginas de error: volver atrás y reintentar
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-atras]')) history.back();
      if (e.target.closest('[data-recargar]')) location.reload();
    });
    if (pagina === 'detalle') iniciarDetalle();
    if (pagina === 'subsanar') iniciarSubsanar();
    if (pagina === 'perfil') iniciarPerfil();
    if (pagina === 'registro') iniciarRegistro();
  });
})();
