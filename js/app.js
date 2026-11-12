// arranque, rutas y las pantallas de inicio, laboratorio, chuleta y repaso
import { iniciar, nuevaBase, lotesDe, tablaObjetivo, tieneWhere, consultar } from './motor.js';
import { LECCIONES, UNIDADES, PRUEBAME } from './lecciones.js';
import { TABLAS } from './datos.js';
import { crearEditor, resaltar, formatear } from './editor.js';
import { abrirLeccion, correrConFoto, salidaHTML } from './leccion.js';
import { dibujarJoin, dibujarOrden } from './visual.js';
import { esc } from './tabla.js';
import { CHULETA } from './chuleta.js';
import * as progreso from './progreso.js';

const raiz = document.getElementById('contenido');
const NOMBRES_TABLAS = TABLAS.map(t => t.nombre);
const ESQUEMA = Object.fromEntries(TABLAS.map(t => [t.nombre, t.columnas.map(c => c[0])]));

function guardado(clave, valor) {
    try {
        if (valor === undefined) return localStorage.getItem(clave);
        localStorage.setItem(clave, valor);
    } catch (e) { return null; }
}

// tema claro u oscuro
document.getElementById('tema').addEventListener('click', () => {
    const r = document.documentElement;
    const oscuro = r.dataset.tema ? r.dataset.tema === 'oscuro' : matchMedia('(prefers-color-scheme: dark)').matches;
    r.dataset.tema = oscuro ? 'claro' : 'oscuro';
    guardado('bala.tema', r.dataset.tema);
});

function marcador() {
    document.getElementById('racha').textContent = progreso.rachaActual();
    document.getElementById('xp').textContent = progreso.estado().xp;
    const n = progreso.pendientes().length;
    const g = document.getElementById('globo-repaso');
    g.hidden = !n;
    g.textContent = n;
}
document.addEventListener('bala:progreso', marcador);

function siguienteLeccion() {
    return LECCIONES.find(l => !progreso.leccionHecha(l.id)) || null;
}

const estrellaSVG = on => `<svg viewBox="0 0 24 24" fill="${on ? '#fff' : 'rgba(255,255,255,.25)'}"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>`;

function vistaInicio() {
    const toca = siguienteLeccion();
    const hechas = LECCIONES.filter(l => progreso.leccionHecha(l.id)).length;
    raiz.innerHTML = `<div class="ruta">
        <div class="bienvenida">
            <h1>Aprende SQL Server a la bala</h1>
            <p>Lecciones cortas con los datos de la tienda de don Chepe. Cada consulta corre de verdad aquí en tu navegador, y lo que se te olvida te vuelve a salir en el repaso.</p>
            <div class="seguir">${hechas ? '<a class="btn suave" href="#/examen">Examen</a> ' : ''}${toca ? `<a class="btn" href="#/leccion/${toca.id}">${hechas ? 'Seguir con' : 'Empezar con'} ${esc(toca.titulo)}</a>` : '<a class="btn" href="#/laboratorio">Todo listo, ve al laboratorio</a>'}</div>
        </div>
        ${UNIDADES.map((u, ui) => `
            <section class="unidad" aria-labelledby="u-${u.id}">
                <div class="unidad-rotulo"><b id="u-${u.id}">${esc(u.titulo)}</b><span>${esc(u.lema)}</span></div>
                <ol class="paradas">
                    ${LECCIONES.filter(l => l.unidad === u.id).map(l => {
        const h = progreso.leccionHecha(l.id);
        const n = LECCIONES.indexOf(l) + 1;
        return `<li class="parada${h ? ' hecha' : ''}${toca && toca.id === l.id ? ' toca' : ''}">
                            <a href="#/leccion/${l.id}">
                                <span class="boton-parada" aria-hidden="true">${n}</span>
                                <span class="parada-titulo">${esc(l.titulo)}</span>
                                <span class="estrellas" aria-label="${h ? h.estrellas + ' de 3 estrellas' : 'sin hacer'}">${h ? [1, 2, 3].map(k => estrellaSVG(k <= h.estrellas)).join('') : ''}</span>
                            </a>
                        </li>`;
    }).join('')}
                </ol>
            </section>`).join('')}
    </div>`;
}

function vistaLeccion(id) {
    const leccion = LECCIONES.find(l => l.id === id);
    if (!leccion) { location.hash = '#/'; return; }
    abrirLeccion(raiz, {
        leccion,
        alSalir: () => { location.hash = '#/'; },
        alTerminar: () => {
            const otra = siguienteLeccion();
            location.hash = otra ? '#/' : '#/laboratorio';
        }
    });
}

// examen de 10 al azar de lo que ya se vio, con reloj de 10 minutos
function vistaExamen() {
    const hechas = LECCIONES.filter(l => progreso.leccionHecha(l.id));
    const ex = progreso.estado().examen || {};
    raiz.innerHTML = `<div class="tarjeta examen-intro">
        <p class="tipo-ej">Examen a la bala</p>
        <h2>10 ejercicios, 10 minutos</h2>
        <p>Salen al azar y sin pistas. Solo al final ves las soluciones de los que fallaste, y esos se quedan en tu repaso.</p>
        ${ex.mejor !== null && ex.mejor !== undefined ? `<p>Tu mejor nota es <b>${ex.mejor}</b> de 100, en ${ex.intentos} ${ex.intentos === 1 ? 'intento' : 'intentos'}.</p>` : ''}
        <fieldset class="alcance">
            <legend>¿De qué?</legend>
            <label><input type="radio" name="alcance" value="vistas" ${hechas.length ? 'checked' : 'disabled'}> De las lecciones que ya hice <small>${hechas.length} de ${LECCIONES.length}</small></label>
            <label><input type="radio" name="alcance" value="todo" ${hechas.length ? '' : 'checked'}> De todo el curso</label>
        </fieldset>
        <div class="acciones"><button type="button" class="btn" data-arrancar>Arrancar el reloj</button></div>
    </div>`;
    raiz.querySelector('[data-arrancar]').addEventListener('click', () => {
        const alcance = raiz.querySelector('input[name=alcance]:checked').value;
        const fuente = alcance === 'vistas' ? hechas : LECCIONES;
        const todos = fuente.flatMap(l => l.ejercicios);
        // se mezclan y se cuida que no salgan dos seguidos de la misma leccion si se puede
        const mezcla = todos.map(e => ({ e, r: Math.random() })).sort((a, b) => a.r - b.r).map(x => x.e);
        const elegidos = [];
        for (const e of mezcla) {
            if (elegidos.length >= 10) break;
            if (elegidos.length && elegidos[elegidos.length - 1].leccion === e.leccion && mezcla.length > 20) continue;
            elegidos.push(e);
        }
        for (const e of mezcla) { if (elegidos.length >= 10) break; if (!elegidos.includes(e)) elegidos.push(e); }
        abrirLeccion(raiz, {
            ejercicios: elegidos,
            examen: { segundos: 600 },
            alSalir: () => { location.hash = '#/'; },
            alTerminar: () => { marcador(); location.hash = '#/avance'; }
        });
    });
}

const MEDALLAS = [
    { id: 'primera', titulo: 'Primera consulta', que: 'Terminar una lección', icono: 'estrella', si: p => Object.keys(p.lecciones).length >= 1 },
    { id: 'delete', titulo: 'Sin miedo al DELETE', que: 'Terminar Borrar con DELETE', icono: 'basura', si: p => !!p.lecciones.delete },
    { id: 'red', titulo: 'Red de seguridad', que: 'Terminar la de BEGIN TRAN', icono: 'escudo', si: p => !!p.lecciones.transacciones },
    { id: 'cuentas', titulo: 'Buen contador', que: 'Terminar las dos de resumir', icono: 'suma', si: p => !!(p.lecciones.agregados && p.lecciones.agrupar) },
    { id: 'join', titulo: 'Maestro del JOIN', que: 'Terminar INNER, LEFT y RIGHT', icono: 'cadena', si: p => !!(p.lecciones.inner && p.lecciones.left && p.lecciones.right) },
    { id: 'perfecto', titulo: 'Perfeccionista', que: '5 lecciones con 3 estrellas', icono: 'estrella', si: p => Object.values(p.lecciones).filter(l => l.estrellas === 3).length >= 5 },
    { id: 'racha3', titulo: 'Tres días seguidos', que: 'Racha de 3 días', icono: 'chile', si: p => (p.racha.mejor || p.racha.dias) >= 3 },
    { id: 'racha7', titulo: 'Semana completa', que: 'Racha de 7 días', icono: 'chile', si: p => (p.racha.mejor || p.racha.dias) >= 7 },
    { id: 'lab', titulo: 'Laboratorista', que: 'Correr 10 cosas en el laboratorio', icono: 'frasco', si: p => (p.lab || 0) >= 10 },
    { id: 'repaso', titulo: 'No se me olvida', que: 'Terminar un repaso', icono: 'vuelta', si: p => (p.repasos || 0) >= 1 },
    { id: 'aprobado', titulo: 'Examen aprobado', que: 'Sacar 70 o más en el examen', icono: 'reloj', si: p => p.examen && p.examen.mejor >= 70 },
    { id: 'cien', titulo: 'Cien redondo', que: 'Sacar 100 en el examen', icono: 'trofeo', si: p => p.examen && p.examen.mejor === 100 },
    { id: 'todo', titulo: 'Dueño de la tienda', que: 'Terminar todas las lecciones', icono: 'trofeo', si: p => LECCIONES.every(l => p.lecciones[l.id]) }
];

const ICONOS = {
    estrella: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
    basura: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" fill="none" stroke-width="2.2"/>',
    escudo: '<path d="M12 2.5l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-6z"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke-width="2.4"/>',
    suma: '<path d="M18 4H6l7 8-7 8h12" fill="none" stroke-width="2.6"/>',
    cadena: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke-width="2.4"/>',
    chile: '<path d="M14 4c.5 1.8-.3 3-1.3 3.7 4.2 1 7.3 4.6 7.3 9 0 3.9-2.8 7-7 7S5 20.6 5 16.9c0-3 1.5-5 3.2-6.1-.2 1.6.4 2.8 1.5 3.3-.3-4.3 1.6-8.1 4.3-10.1z"/>',
    frasco: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" fill="none" stroke-width="2.2"/><path d="M7.5 15h9l1.8 3.3a1 1 0 0 1-.9 1.5H6.6a1 1 0 0 1-.9-1.5z"/>',
    vuelta: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" fill="none" stroke-width="2.4"/>',
    reloj: '<circle cx="12" cy="13" r="8" fill="none" stroke-width="2.4"/><path d="M12 9v4l2.5 2M9 2h6" fill="none" stroke-width="2.4"/>',
    trofeo: '<path d="M7 3h10v5a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6"/>'
};

function vistaAvance() {
    const p = progreso.estado();
    const hechas = LECCIONES.filter(l => p.lecciones[l.id]);
    const estrellas = hechas.reduce((a, l) => a + (p.lecciones[l.id].estrellas || 0), 0);
    raiz.innerHTML = `
        <div class="lab-titulo"><h1>Mi avance</h1><p>Todo se guarda en este navegador.</p></div>
        <div class="avance-grid">
            <div class="hoja dato"><b>${p.xp}</b><span>XP</span></div>
            <div class="hoja dato"><b>${progreso.rachaActual()}</b><span>días de racha, la mejor fue de ${Math.max(p.racha.mejor || 0, progreso.rachaActual())}</span></div>
            <div class="hoja dato"><b>${hechas.length}<small>/${LECCIONES.length}</small></b><span>lecciones, ${estrellas} estrellas</span></div>
            <div class="hoja dato"><b>${p.examen && p.examen.mejor !== null && p.examen.mejor !== undefined ? p.examen.mejor : '·'}</b><span>mejor nota de examen</span></div>
        </div>
        <section class="hoja" style="margin-top:20px">
            <h2 class="titulo-seccion">Por unidad</h2>
            <div class="unidades-avance">${UNIDADES.map(u => {
        const ls = LECCIONES.filter(l => l.unidad === u.id);
        const n = ls.filter(l => p.lecciones[l.id]).length;
        return `<div class="unidad-barra"><span>${esc(u.titulo)}</span><div class="barra"><div style="width:${n / ls.length * 100}%"></div></div><small>${n} de ${ls.length}</small></div>`;
    }).join('')}</div>
        </section>
        <section class="hoja" style="margin-top:20px">
            <h2 class="titulo-seccion">Medallas</h2>
            <ul class="medallas">${MEDALLAS.map(m => {
        const tiene = !!m.si(p);
        return `<li class="medalla${tiene ? ' ganada' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS[m.icono]}</svg><b>${esc(m.titulo)}</b><small>${tiene ? 'Ganada' : esc(m.que)}</small></li>`;
    }).join('')}</ul>
        </section>
        <div class="acciones" style="justify-content:center;margin-top:22px"><a class="btn" href="#/examen">Hacer un examen</a><a class="btn suave" href="#/repaso">Ir al repaso</a></div>`;
}

function vistaRepaso() {
    const ids = progreso.pendientes();
    const todos = LECCIONES.flatMap(l => l.ejercicios);
    const ejercicios = ids.map(id => todos.find(e => e.id === id)).filter(Boolean).slice(0, 12);
    if (!ejercicios.length) {
        const futuros = progreso.enRepaso();
        raiz.innerHTML = `<div class="tarjeta repaso-vacio">
            <h2>Nada que repasar hoy</h2>
            <p>${futuros ? `Tienes ${futuros} ${futuros === 1 ? 'ejercicio guardado que vuelve' : 'ejercicios guardados que vuelven'} en los próximos días.` : 'Cuando falles un ejercicio se guarda aquí y te vuelve a salir al día siguiente, luego a los 3 días, a la semana y así, hasta que no se te olvide.'}</p>
            <div class="acciones" style="justify-content:center"><a class="btn" href="#/">Ir a las lecciones</a></div>
        </div>`;
        return;
    }
    abrirLeccion(raiz, {
        ejercicios,
        alSalir: () => { location.hash = '#/'; },
        alTerminar: () => { marcador(); location.hash = '#/'; }
    });
}

// el laboratorio guarda su propia tienda mientras la pagina este abierta
let dbLab = null;
let pendiente = null;

function vistaLab(sqlInicial) {
    if (!dbLab) dbLab = nuevaBase();
    const inicial = sqlInicial || guardado('bala.lab') || PRUEBAME[0].sql;
    raiz.innerHTML = `
        <div class="lab-titulo"><h1>Laboratorio</h1><p>Escribe lo que quieras contra la tienda. Si cambias datos te pregunta si los dejas o los deshaces.</p></div>
        <div class="lab">
            <aside class="hoja tienda" aria-label="Tablas de la tienda">
                <h2>La tienda</h2>
                <p>Toca una tabla o columna para meterla al editor.</p>
                <div class="esquema"></div>
                <div class="acciones"><button type="button" class="btn suave chico" data-reiniciar>Reiniciar la tienda</button></div>
            </aside>
            <section class="hoja">
                <div class="acciones" style="margin-top:0">
                    <label for="pruebame"><b>Pruébame</b></label>
                    <select id="pruebame" class="btn suave chico" style="font-weight:600">
                        <option value="">Escoge un ejemplo</option>
                        ${PRUEBAME.map((p, i) => `<option value="${i}">${esc(p.titulo)}</option>`).join('')}
                    </select>
                </div>
                <div class="zona-editor" style="margin-top:12px"></div>
                <div class="acciones">
                    <button type="button" class="btn" data-ejecutar><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>Ejecutar</button>
                    <span class="ayuda-teclas">Ctrl + Enter</span>
                    <button type="button" class="btn suave chico derecha" data-compartir title="Copia un enlace que abre el laboratorio con esta consulta">Copiar enlace</button>
                    <button type="button" class="btn suave chico" data-acomodar title="Pone cada parte en su renglón y las palabras clave en mayúsculas">Acomodar</button>
                </div>
                <div class="aviso"></div>
                <div class="pestanas" role="tablist">
                    <button type="button" role="tab" aria-selected="true" data-pes="resultado">Resultado</button>
                    <button type="button" role="tab" aria-selected="false" data-pes="orden">Orden en que corre</button>
                    <button type="button" role="tab" aria-selected="false" data-pes="join">JOIN dibujado</button>
                </div>
                <div class="panel" role="tabpanel"></div>
            </section>
        </div>`;
    const editor = crearEditor({ valor: inicial, alCorrer: ejecutarLab, tablas: NOMBRES_TABLAS, esquema: ESQUEMA });
    raiz.querySelector('.zona-editor').appendChild(editor.nodo);
    const panel = raiz.querySelector('.panel');
    const aviso = raiz.querySelector('.aviso');
    let ultimo = null;
    let pestana = 'resultado';

    function pintarEsquema() {
        const cuenta = t => { try { return consultar(dbLab, `SELECT COUNT(*) FROM ${t}`).filas[0][0]; } catch (e) { return '?'; } };
        raiz.querySelector('.esquema').innerHTML = TABLAS.map((t, i) => `
            <details class="tabla-esquema"${i < 2 ? ' open' : ''}>
                <summary><span>${t.nombre}</span><small>${cuenta(t.nombre)} filas</small></summary>
                <p class="que">${esc(t.que)}</p>
                <ul class="columnas-esquema">
                    <li><button type="button" data-meter="${t.nombre}"><b>${t.nombre}</b><span class="tipo">tabla</span></button></li>
                    ${t.columnas.map(([c, tipo, rol, ref]) => `<li><button type="button" data-meter="${c}" title="${rol === 'foranea' ? 'Llave foránea hacia ' + ref : rol === 'llave' ? 'Llave primaria' : ''}">
                        <span>${c}</span>${rol === 'llave' ? '<span class="llave">PK</span>' : ''}${rol === 'foranea' ? `<span class="foranea">FK ${ref}</span>` : ''}<span class="tipo">${tipo}</span></button></li>`).join('')}
                </ul>
            </details>`).join('');
    }
    pintarEsquema();
    raiz.querySelector('.esquema').addEventListener('click', ev => {
        const b = ev.target.closest('[data-meter]');
        if (!b) return;
        ev.preventDefault();
        const antes = editor.valor;
        editor.meter((antes && !/\s$/.test(antes) ? ' ' : '') + b.dataset.meter + ' ');
    });

    raiz.querySelector('[data-reiniciar]').addEventListener('click', () => {
        if (pendiente) cerrarPendiente(false);
        dbLab.close();
        dbLab = nuevaBase();
        pintarEsquema();
        aviso.innerHTML = '<div class="aviso-seguro"><h3>Tienda nueva</h3><p>Todos los datos regresaron a como estaban al principio.</p></div>';
        panel.innerHTML = '';
    });

    raiz.querySelector('#pruebame').addEventListener('change', ev => {
        if (ev.target.value === '') return;
        editor.valor = PRUEBAME[+ev.target.value].sql;
        ev.target.value = '';
        ejecutarLab();
    });

    raiz.querySelector('[data-ejecutar]').addEventListener('click', ejecutarLab);
    raiz.querySelector('[data-compartir]').addEventListener('click', async () => {
        const url = location.origin + location.pathname + '#/laboratorio?sql=' + encodeURIComponent(editor.valor);
        let ok = false;
        try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { }
        aviso.innerHTML = ok
            ? '<div class="aviso-seguro" role="status"><h3>Enlace copiado</h3><p>Quien lo abra ve el laboratorio con esta misma consulta, listo para correrla.</p></div>'
            : `<div class="aviso-seguro" role="status"><h3>Copia este enlace</h3><p style="word-break:break-all"><code>${esc(url)}</code></p></div>`;
    });
    raiz.querySelector('[data-acomodar]').addEventListener('click', () => { editor.valor = formatear(editor.valor); guardado('bala.lab', editor.valor); editor.enfocar(); });
    raiz.querySelector('.pestanas').addEventListener('click', ev => {
        const b = ev.target.closest('[data-pes]');
        if (!b) return;
        pestana = b.dataset.pes;
        pintarPestana();
    });

    function pintarPestana() {
        raiz.querySelectorAll('[data-pes]').forEach(b => b.setAttribute('aria-selected', b.dataset.pes === pestana));
        if (!ultimo) { panel.innerHTML = '<p style="color:var(--tinta-3)">Corre una consulta para ver algo aquí.</p>'; return; }
        if (pestana === 'resultado') panel.innerHTML = salidaHTML(ultimo.salida);
        else if (pestana === 'orden') dibujarOrden(panel, ultimo.sql, dbLab);
        else dibujarJoin(panel, ultimo.sql, dbLab);
    }

    function cerrarPendiente(dejar) {
        if (!pendiente) return;
        try { dbLab.exec(dejar ? 'RELEASE bala' : 'ROLLBACK TO bala; RELEASE bala'); } catch (e) { }
        pendiente = null;
        pintarEsquema();
    }

    function ejecutarLab(forzar) {
        const sql = editor.valor;
        guardado('bala.lab', sql);
        if (!sql.trim()) return;
        progreso.contarLab();
        if (pendiente) cerrarPendiente(true);
        const lotes = lotesDe(sql);
        const cambia = lotes.some(l => /^\s*(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(l));
        const controlaTran = lotes.some(l => /^\s*(BEGIN|COMMIT|ROLLBACK|SAVE)\b/i.test(l));

        // un UPDATE o DELETE sin WHERE se avisa antes de correrlo
        if (forzar !== true) {
            const peligroso = lotes.find(l => /^\s*(UPDATE|DELETE)\b/i.test(l) && !tieneWhere(l));
            if (peligroso) {
                const t = tablaObjetivo(peligroso);
                let n = '?';
                try { n = consultar(dbLab, `SELECT COUNT(*) FROM ${t}`).filas[0][0]; } catch (e) { }
                aviso.innerHTML = `<div class="aviso-seguro peligro" role="alert">
                    <h3>Ojo, esto no tiene WHERE</h3>
                    <p>Este ${/^\s*UPDATE/i.test(peligroso) ? 'UPDATE va a cambiar' : 'DELETE va a borrar'} las <b>${n} filas</b> de ${esc(t)}. En el trabajo esto se arregla con un respaldo, si hay.</p>
                    <div class="acciones" style="margin-top:0"><button type="button" class="btn suave chico" data-cancelar>Mejor no</button><button type="button" class="btn rojo chico" data-igual>Correrlo igual</button></div>
                </div>`;
                aviso.querySelector('[data-cancelar]').addEventListener('click', () => { aviso.innerHTML = ''; editor.enfocar(); });
                aviso.querySelector('[data-igual]').addEventListener('click', () => ejecutarLab(true));
                return;
            }
        }
        aviso.innerHTML = '';

        const seguro = cambia && !controlaTran;
        if (seguro) dbLab.exec('SAVEPOINT bala');
        const salida = correrConFoto(dbLab, sql);
        if (seguro) {
            if (salida.r.error && !salida.r.lotes.some(l => l.afectadas)) {
                dbLab.exec('ROLLBACK TO bala; RELEASE bala');
            } else {
                pendiente = true;
                const n = salida.r.lotes.reduce((a, l) => a + (l.afectadas || 0), 0);
                aviso.innerHTML = `<div class="aviso-seguro" role="status">
                    <h3>¿Lo dejas así?</h3>
                    <p>Se ${n === 1 ? 'tocó 1 fila' : `tocaron ${n} filas`}. Es como si hubieras abierto un <code>BEGIN TRAN</code>. Revisa abajo lo que cambió y decide.</p>
                    <div class="acciones" style="margin-top:0"><button type="button" class="btn suave chico" data-deshacer>Deshacer, ROLLBACK</button><button type="button" class="btn verde chico" data-dejar>Dejarlo, COMMIT</button></div>
                </div>`;
                aviso.querySelector('[data-dejar]').addEventListener('click', () => { cerrarPendiente(true); aviso.innerHTML = '<div class="aviso-seguro"><h3>COMMIT</h3><p>Los cambios quedaron guardados en la tienda.</p></div>'; });
                aviso.querySelector('[data-deshacer]').addEventListener('click', () => {
                    cerrarPendiente(false);
                    aviso.innerHTML = '<div class="aviso-seguro"><h3>ROLLBACK</h3><p>Todo regresó a como estaba antes de correrlo.</p></div>';
                    ultimo = { sql, salida: { r: { resultados: [], mensajes: ['ROLLBACK listo.'], error: null, lotes: [] }, cambios: [] } };
                    pintarPestana();
                });
            }
        }
        ultimo = { sql, salida };
        const primerSelect = lotes.find(l => /^\s*SELECT\b/i.test(l));
        if (primerSelect) ultimo.sql = primerSelect;
        if (pestana !== 'resultado' && !primerSelect) pestana = 'resultado';
        pintarPestana();
        pintarEsquema();
    }

    pintarPestana();
}

function vistaChuleta() {
    raiz.innerHTML = `
        <div class="lab-titulo"><h1>Chuleta</h1><p>Los moldes en el orden en que se escriben, para tenerlos a la mano en el trabajo.</p></div>
        <div class="chuleta">${CHULETA.map(c => `
            <article class="hoja${c.ancha ? ' chuleta-ancha' : ''}">
                <h2>${esc(c.titulo)}</h2>
                ${c.texto ? `<div class="chuleta-texto">${c.texto}</div>` : ''}
                ${c.html || ''}
                ${c.sql ? `<pre class="pizarra">${resaltar(c.sql)}</pre>` : ''}
                ${c.probar ? `<button type="button" class="btn chico suave" data-probar="${esc(c.probar)}">Probarlo en el laboratorio</button>` : ''}
            </article>`).join('')}
        </div>`;
    raiz.querySelectorAll('[data-probar]').forEach(b => b.addEventListener('click', () => {
        guardado('bala.lab', b.dataset.probar);
        location.hash = '#/laboratorio';
    }));
}

function ruta() {
    const [h, consulta] = location.hash.replace(/^#\/?/, '').split('?');
    const [vista, id] = h.split('/');
    // un enlace compartido trae la consulta en el sql
    const compartida = new URLSearchParams(consulta || '').get('sql');
    document.querySelectorAll('.menu a').forEach(a => a.removeAttribute('aria-current'));
    const activo = document.querySelector(`.menu a[data-vista="${vista || 'inicio'}"]`);
    if (activo) activo.setAttribute('aria-current', 'page');
    const v = document.getElementById('veredicto');
    v.className = 'veredicto';
    v.innerHTML = '';
    window.scrollTo(0, 0);
    if (vista === 'leccion') vistaLeccion(id);
    else if (vista === 'laboratorio') vistaLab(compartida || undefined);
    else if (vista === 'chuleta') vistaChuleta();
    else if (vista === 'repaso') vistaRepaso();
    else if (vista === 'examen') vistaExamen();
    else if (vista === 'avance') vistaAvance();
    else vistaInicio();
    marcador();
}

iniciar().then(() => {
    window.addEventListener('hashchange', ruta);
    ruta();
}).catch(e => {
    raiz.innerHTML = `<div class="tarjeta"><h2>No cargó el motor</h2><p>El navegador no pudo arrancar SQLite. Prueba con otro navegador o recarga la página.</p><pre class="pizarra">${esc(e.message)}</pre></div>`;
});
