// corre una leccion o un repaso, ejercicio por ejercicio
import { nuevaBase, ejecutar, consultar, comparar, lotesDe, tablaObjetivo, foto, diferencias, infoJoin, partes } from './motor.js';
import { crearEditor, resaltar } from './editor.js';
import { tablaHTML, diffHTML, errorHTML, mensajesHTML, esc } from './tabla.js';
import { dibujarJoin, dibujarOrden } from './visual.js';
import { TABLAS } from './datos.js';
import * as progreso from './progreso.js';

const BIEN = ['¡A la bala!', '¡Eso!', '¡Así mero!', '¡De una!', '¡Bien hecho!', '¡Clavado!'];
const MAL = ['Casi', 'Todavía no', 'Revisa otra vez', 'Ahí no era'];
const azar = l => l[Math.floor(Math.random() * l.length)];
const NOMBRES_TABLAS = TABLAS.map(t => t.nombre);

function barajar(l) {
    const a = [...l];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const sinComentarios = s => s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

// corre en una tienda nueva y saca la foto de lo que cambio
export function correrConFoto(db, sql) {
    const tablas = [...new Set(lotesDe(sql).map(tablaObjetivo).filter(Boolean))];
    const antes = tablas.map(t => foto(db, t));
    const r = ejecutar(db, sql);
    const cambios = tablas.map((t, i) => {
        const despues = foto(db, t);
        return antes[i] && despues ? { tabla: t, d: diferencias(antes[i], despues) } : null;
    }).filter(Boolean);
    return { r, cambios };
}

export function salidaHTML({ r, cambios }, { soloUltimo = false } = {}) {
    let html = '';
    const res = soloUltimo ? r.resultados.slice(-1) : r.resultados.slice(-3);
    html += res.map((t, i) => tablaHTML(t, { titulo: res.length > 1 ? `Resultado ${i + 1}` : 'Resultado' })).join('');
    html += cambios.map(c => diffHTML(c.tabla, c.d)).join('');
    html += errorHTML(r.error);
    html += mensajesHTML(r.mensajes);
    return html;
}

// botones para ver el join o el orden de la consulta que se acaba de correr
function extrasHTML(sql) {
    const p = /^\s*SELECT\b/i.test(sinComentarios(sql).trim()) ? partes(sinComentarios(sql)) : null;
    const j = p ? infoJoin(sinComentarios(sql)) : null;
    if (!p) return '';
    return `<div class="acciones">
        ${j ? '<button type="button" class="btn chico suave" data-extra="join">Ver el JOIN dibujado</button>' : ''}
        <button type="button" class="btn chico suave" data-extra="orden">Ver el orden en que corre</button>
    </div><div class="extra-panel"></div>`;
}

function conectarExtras(caja, sql) {
    caja.querySelectorAll('[data-extra]').forEach(b => b.addEventListener('click', () => {
        const panel = caja.querySelector('.extra-panel');
        const db = nuevaBase();
        panel.classList.add('panel');
        if (b.dataset.extra === 'join') dibujarJoin(panel, sinComentarios(sql), db);
        else dibujarOrden(panel, sinComentarios(sql), db);
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));
}

function revisarReglas(ej, sql) {
    const limpio = sinComentarios(sql);
    for (const x of ej.exige || []) if (!new RegExp(x.re, 'i').test(limpio)) return x.msg;
    for (const x of ej.noExige || []) if (new RegExp(x.re, 'i').test(limpio)) return x.msg;
    return null;
}

// el corazon de la revision, compara contra la solucion corrida en otra tienda nueva
export function calificar(ej, sql) {
    const regla = revisarReglas(ej, sql);
    if (regla) return { bien: false, motivo: regla };
    const dbU = nuevaBase();
    const usuario = correrConFoto(dbU, sql);
    if (usuario.r.error) return { bien: false, motivo: usuario.r.error.texto, salida: usuario, sql };
    const solucion = ej.tipo === 'fichas' ? ej.fichas.join(' ') : ej.solucion;
    const dbS = nuevaBase();
    const rs = ejecutar(dbS, solucion);
    if (ej.revisa) {
        const a = consultar(dbS, ej.revisa), b = consultar(dbU, ej.revisa);
        const c = comparar(a, b, false);
        if (!c.igual) {
            const motivo = a.filas.length !== b.filas.length
                ? `La tabla quedó con ${b.filas.length} filas y debía quedar con ${a.filas.length}.`
                : 'La tabla no quedó como se pedía. Revisa el valor que pusiste y el WHERE.';
            return { bien: false, motivo, salida: usuario, sql };
        }
        return { bien: true, salida: usuario, sql };
    }
    const esperado = rs.resultados[rs.resultados.length - 1];
    const obtenido = usuario.r.resultados[usuario.r.resultados.length - 1];
    const c = comparar(esperado, obtenido, !!ej.orden);
    if (!c.igual) return { bien: false, motivo: c.motivo, salida: usuario, sql };
    if (ej.columnas) {
        const nombres = obtenido.columnas.map(x => x.toLowerCase());
        const falta = ej.columnas.find(x => !nombres.includes(x.toLowerCase()));
        if (falta) return { bien: false, motivo: `Los datos están bien, pero falta la columna con el título ${falta}.`, salida: usuario, sql };
    }
    return { bien: true, salida: usuario, sql };
}

function esperadoHTML(ej) {
    try {
        const db = nuevaBase();
        const r = ejecutar(db, ej.solucion);
        const t = ej.revisa ? consultar(db, ej.revisa) : r.resultados[r.resultados.length - 1];
        if (!t) return '';
        return `<details class="esperado"><summary>${ej.revisa ? 'Cómo debe quedar la tabla' : 'Cómo debe salir el resultado'}</summary>${tablaHTML(t, { titulo: '', max: 30 })}</details>`;
    } catch (e) { return ''; }
}

export function abrirLeccion(raiz, { leccion, ejercicios, titulo, alSalir, alTerminar }) {
    const veredicto = document.getElementById('veredicto');
    const lista = ejercicios || leccion.ejercicios;
    const cola = lista.map(e => ({ ej: e, intento: 0 }));
    const total = cola.length;
    let hechos = 0, errores = 0, xp = 0;
    const esRepaso = !leccion;

    raiz.innerHTML = `<div class="leccion">
        <div class="barra-leccion">
            <button type="button" class="cerrar" aria-label="Salir de la lección"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
            <div class="avance" role="progressbar" aria-label="Avance" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="0"><div></div></div>
            <span class="vidas-xp" aria-live="polite"><span class="xp-lec">0</span> XP</span>
        </div>
        <div class="tarjeta" id="tarjeta"></div>
    </div>`;
    const tarjeta = raiz.querySelector('#tarjeta');
    raiz.querySelector('.cerrar').addEventListener('click', () => { cerrarVeredicto(); alSalir(); });

    const avanzar = () => {
        raiz.querySelector('.avance div').style.width = (hechos / total * 100) + '%';
        raiz.querySelector('.avance').setAttribute('aria-valuenow', hechos);
        raiz.querySelector('.xp-lec').textContent = xp;
    };

    function cerrarVeredicto() {
        veredicto.className = 'veredicto';
        veredicto.innerHTML = '';
        document.onkeydown = null;
    }

    function abrirVeredicto(bien, texto, solucion, alSeguir) {
        veredicto.className = 'veredicto abierto ' + (bien ? 'bien' : 'mal');
        veredicto.innerHTML = `<div class="veredicto-dentro">
            <div class="veredicto-texto" role="status">
                <b>${bien ? azar(BIEN) : azar(MAL)}</b>
                ${texto ? `<p>${esc(texto)}</p>` : ''}
                ${solucion ? `<pre class="pizarra" style="margin:8px 0 0">${resaltar(solucion)}</pre>` : ''}
            </div>
            <button type="button" class="btn ${bien ? 'verde' : 'rojo'}">Continuar</button>
        </div>`;
        const b = veredicto.querySelector('button');
        b.focus({ preventScroll: true });
        b.addEventListener('click', () => { cerrarVeredicto(); alSeguir(); });
    }

    function idea() {
        tarjeta.innerHTML = `
            <p class="tipo-ej">La idea</p>
            <h2>${esc(leccion.titulo)}</h2>
            ${leccion.idea}
            <pre class="pizarra molde">${resaltar(leccion.molde)}</pre>
            <p><b>Pruébalo.</b> Cámbiale lo que quieras y córrelo, la tienda se reinicia sola.</p>
            <div class="zona-editor"></div>
            <div class="acciones">
                <button type="button" class="btn suave chico" data-correr>Correr</button>
                <span class="ayuda-teclas">o Ctrl + Enter</span>
                <button type="button" class="btn derecha" data-empezar>A practicar</button>
            </div>
            <div class="salida"></div>`;
        const editor = crearEditor({ valor: leccion.ejemplo, alCorrer: correr, tablas: NOMBRES_TABLAS });
        tarjeta.querySelector('.zona-editor').appendChild(editor.nodo);
        function correr() {
            const sql = editor.valor;
            const s = correrConFoto(nuevaBase(), sql);
            const salida = tarjeta.querySelector('.salida');
            salida.innerHTML = salidaHTML(s) + (s.r.error ? '' : extrasHTML(sql));
            conectarExtras(salida, sql);
        }
        tarjeta.querySelector('[data-correr]').addEventListener('click', correr);
        tarjeta.querySelector('[data-empezar]').addEventListener('click', siguiente);
        correr();
        if (leccion.verJoin) {
            const b = tarjeta.querySelector('[data-extra="join"]');
            if (b) b.click();
        }
    }

    function siguiente() {
        if (!cola.length) return final();
        const item = cola.shift();
        const ej = item.ej;
        tarjeta.innerHTML = '';
        delete tarjeta.dataset.cerrado;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const listo = acierto => {
            if (acierto) {
                hechos++;
                const gana = item.intento === 0 ? 10 : 5;
                xp += gana;
                progreso.sumarXp(gana);
                if (esRepaso) progreso.anotarRepaso(ej.id, true);
            } else {
                errores++;
                item.intento++;
                progreso.anotarRepaso(ej.id, false);
                // el que se falla vuelve al final una vez mas
                if (item.intento < 2) cola.push(item);
                else hechos++;
            }
            avanzar();
            document.dispatchEvent(new CustomEvent('bala:progreso'));
        };
        if (ej.tipo === 'escribe') escribe(ej, listo);
        else if (ej.tipo === 'fichas') fichas(ej, listo);
        else elige(ej, listo);
    }

    function escribe(ej, listo) {
        tarjeta.innerHTML = `
            <p class="tipo-ej">Escríbela tú</p>
            <p class="enunciado">${esc(ej.enunciado)}</p>
            <div class="zona-editor"></div>
            ${esperadoHTML(ej)}
            <div class="pista" hidden></div>
            <div class="acciones">
                <button type="button" class="btn suave chico" data-correr>Probar</button>
                ${ej.pista ? '<button type="button" class="btn suave chico" data-pista>Una pista</button>' : ''}
                <button type="button" class="btn derecha" data-revisar>Comprobar</button>
            </div>
            <div class="salida"></div>`;
        const editor = crearEditor({ valor: ej.inicial || '', alCorrer: () => probar(), tablas: NOMBRES_TABLAS });
        tarjeta.querySelector('.zona-editor').appendChild(editor.nodo);
        editor.enfocar();
        const salida = tarjeta.querySelector('.salida');
        function probar() {
            if (!editor.valor.trim()) return;
            const s = correrConFoto(nuevaBase(), editor.valor);
            salida.innerHTML = salidaHTML(s) + (s.r.error ? '' : extrasHTML(editor.valor));
            conectarExtras(salida, editor.valor);
        }
        tarjeta.querySelector('[data-correr]').addEventListener('click', probar);
        const bp = tarjeta.querySelector('[data-pista]');
        if (bp) bp.addEventListener('click', () => {
            const p = tarjeta.querySelector('.pista');
            p.hidden = false;
            p.textContent = ej.pista;
        });
        const revisar = tarjeta.querySelector('[data-revisar]');
        revisar.addEventListener('click', () => {
            if (!editor.valor.trim()) { editor.enfocar(); return; }
            const c = calificar(ej, editor.valor);
            if (c.salida) {
                salida.innerHTML = salidaHTML(c.salida) + (c.salida.r.error ? '' : extrasHTML(editor.valor));
                conectarExtras(salida, editor.valor);
            }
            revisar.disabled = true;
            listo(c.bien);
            abrirVeredicto(c.bien, c.bien ? (ej.explica || '') : c.motivo, c.bien ? '' : ej.solucion, siguiente);
        });
    }

    function fichas(ej, listo) {
        const todas = barajar([...ej.fichas.map((t, i) => ({ t, k: 'f' + i })), ...(ej.extra || []).map((t, i) => ({ t, k: 'x' + i }))]);
        const puestas = [];
        tarjeta.innerHTML = `
            <p class="tipo-ej">Arma la consulta</p>
            <p class="enunciado">${esc(ej.enunciado)}</p>
            <div class="armado" aria-label="Tu consulta" aria-live="polite"></div>
            <div class="banco"></div>
            <div class="acciones"><button type="button" class="btn suave chico" data-limpiar>Quitar todo</button><button type="button" class="btn derecha" data-revisar disabled>Comprobar</button></div>
            <div class="salida"></div>`;
        const armado = tarjeta.querySelector('.armado'), banco = tarjeta.querySelector('.banco');
        const esClave = t => /^[A-Z][A-Z ]+[;]?$/.test(t) || /^(TOP \d+)$/.test(t);
        const pintar = () => {
            armado.innerHTML = puestas.map((p, i) => `<button type="button" class="ficha${esClave(p.t) ? ' clave' : ''}" data-quitar="${i}">${esc(p.t)}</button>`).join('');
            banco.innerHTML = todas.map(p => `<button type="button" class="ficha${esClave(p.t) ? ' clave' : ''}${puestas.includes(p) ? ' usada' : ''}" data-poner="${p.k}" ${puestas.includes(p) ? 'tabindex="-1" aria-hidden="true"' : ''}>${esc(p.t)}</button>`).join('');
            tarjeta.querySelector('[data-revisar]').disabled = !puestas.length;
        };
        pintar();
        banco.addEventListener('click', ev => {
            const b = ev.target.closest('[data-poner]');
            if (!b) return;
            const p = todas.find(x => x.k === b.dataset.poner);
            if (!puestas.includes(p)) puestas.push(p);
            pintar();
        });
        armado.addEventListener('click', ev => {
            const b = ev.target.closest('[data-quitar]');
            if (!b) return;
            puestas.splice(+b.dataset.quitar, 1);
            pintar();
        });
        tarjeta.querySelector('[data-limpiar]').addEventListener('click', () => { puestas.length = 0; pintar(); });
        const revisar = tarjeta.querySelector('[data-revisar]');
        revisar.addEventListener('click', () => {
            const sql = puestas.map(p => p.t).join(' ');
            let c;
            if (puestas.length !== ej.fichas.length || puestas.some(p => p.k[0] === 'x')) {
                c = calificar(ej, sql);
                if (c.bien || !c.motivo) c = { ...c, bien: false, motivo: puestas.some(p => p.k[0] === 'x') ? 'Usaste una ficha que no va.' : 'Te faltan fichas por poner.' };
            } else c = calificar(ej, sql);
            if (c.salida) tarjeta.querySelector('.salida').innerHTML = salidaHTML(c.salida);
            revisar.disabled = true;
            listo(c.bien);
            abrirVeredicto(c.bien, c.bien ? (ej.explica || '') : c.motivo, c.bien ? '' : ej.fichas.join(' '), siguiente);
        });
    }

    function elige(ej, listo) {
        const orden = barajar(ej.opciones.map((t, i) => i));
        let elegida = null;
        const esCodigo = ej.opciones.every(o => /^(FROM|SELECT|WHERE)\b/.test(o));
        tarjeta.innerHTML = `
            <p class="tipo-ej">${ej.codigo ? 'Lee el código' : 'Escoge'}</p>
            <p class="enunciado">${esc(ej.enunciado)}</p>
            ${ej.codigo ? `<pre class="pizarra">${resaltar(ej.codigo, true)}</pre>` : ''}
            <div class="opciones" role="radiogroup">${orden.map((i, n) => `<button type="button" class="opcion${esCodigo ? ' codigo' : ''}" role="radio" aria-checked="false" aria-pressed="false" data-op="${i}"><span class="letra">${'ABCD'[n]}</span><span>${esc(ej.opciones[i])}</span></button>`).join('')}</div>
            <div class="acciones"><button type="button" class="btn derecha" data-revisar disabled>Comprobar</button></div>
            <div class="salida"></div>`;
        const ops = tarjeta.querySelectorAll('.opcion');
        ops.forEach(o => o.addEventListener('click', () => {
            if (tarjeta.dataset.cerrado) return;
            elegida = +o.dataset.op;
            ops.forEach(x => { const si = x === o; x.setAttribute('aria-pressed', si); x.setAttribute('aria-checked', si); });
            tarjeta.querySelector('[data-revisar]').disabled = false;
        }));
        const revisar = tarjeta.querySelector('[data-revisar]');
        revisar.addEventListener('click', () => {
            tarjeta.dataset.cerrado = '1';
            revisar.disabled = true;
            const bien = elegida === ej.correcta;
            ops.forEach(x => {
                if (+x.dataset.op === ej.correcta) x.classList.add('bien');
                else if (+x.dataset.op === elegida) x.classList.add('mal');
            });
            if (ej.correr && ej.codigo) {
                const s = correrConFoto(nuevaBase(), ej.codigo);
                const salida = tarjeta.querySelector('.salida');
                salida.innerHTML = '<p class="tipo-ej" style="margin-top:18px">Así sale al correrlo</p>' + salidaHTML(s) + (s.r.error ? '' : extrasHTML(ej.codigo));
                conectarExtras(salida, ej.codigo);
                if (ej.verJoin) { const b = salida.querySelector('[data-extra="join"]'); if (b) b.click(); }
            }
            listo(bien);
            abrirVeredicto(bien, ej.explica, '', siguiente);
        });
    }

    function final() {
        const estrellas = errores === 0 ? 3 : errores <= 2 ? 2 : 1;
        if (!esRepaso) progreso.terminarLeccion(leccion.id, estrellas);
        document.dispatchEvent(new CustomEvent('bala:progreso'));
        raiz.querySelector('.avance div').style.width = '100%';
        tarjeta.classList.add('final');
        const estrella = on => `<svg viewBox="0 0 24 24" fill="${on ? 'var(--rotulo)' : 'var(--borde)'}" stroke="${on ? 'var(--rotulo-sombra)' : 'var(--borde)'}" stroke-width="1.5"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>`;
        tarjeta.innerHTML = `
            <h2>${esRepaso ? 'Repaso listo' : 'Lección terminada'}</h2>
            ${esRepaso ? '' : `<div class="estrellas" aria-label="${estrellas} de 3 estrellas">${[1, 2, 3].map(n => estrella(n <= estrellas)).join('')}</div>`}
            <div class="final-datos">
                <div><b>${xp}</b>XP ganados</div>
                <div><b>${total}</b>ejercicios</div>
                <div><b>${errores}</b>${errores === 1 ? 'tropiezo' : 'tropiezos'}</div>
            </div>
            <p>${errores ? 'Los que fallaste te van a volver a salir en el repaso, así no se te olvidan.' : 'Sin un solo error. Así se hace.'}</p>
            <div class="acciones" style="justify-content:center"><button type="button" class="btn" data-fin>Seguir</button></div>`;
        tarjeta.querySelector('[data-fin]').addEventListener('click', alTerminar);
        tarjeta.querySelector('[data-fin]').focus();
    }

    avanzar();
    if (esRepaso) siguiente();
    else idea();
}
