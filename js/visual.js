// el join dibujado con lineas y la consulta corrida por etapas
import { infoJoin, partes, consultar, ejecutar } from './motor.js';
import { tablaHTML, esc, valor } from './tabla.js';
import { resaltar } from './editor.js';

const ETIQUETA = {
    clientes: f => f.nombre,
    productos: f => f.nombre,
    categorias: f => f.nombre,
    ventas: f => `${f.fecha} ${f.metodo_pago}`,
    detalle_venta: f => `venta ${f.venta_id}, producto ${f.producto_id}`
};

function filasDe(db, tabla) {
    const r = consultar(db, `SELECT * FROM ${tabla}`);
    return r.filas.map(v => Object.fromEntries(r.columnas.map((c, i) => [c, v[i]])));
}

const etiqueta = (tabla, f, col) => (ETIQUETA[tabla] || (x => Object.entries(x).filter(([k]) => k !== col).slice(0, 2).map(([, v]) => v).join(' ')))(f);
const igual = (a, b) => a !== null && b !== null && String(a).toLowerCase() === String(b).toLowerCase();

export function dibujarJoin(caja, sql, db) {
    const info = infoJoin(sql);
    if (!info) {
        caja.innerHTML = `<p>Para dibujar el JOIN necesito una consulta con <code>FROM tabla a JOIN tabla b ON a.columna = b.columna</code>.</p>`;
        return false;
    }
    let izq, der;
    try {
        izq = filasDe(db, info.izq.tabla);
        der = filasDe(db, info.der.tabla);
    } catch (e) {
        caja.innerHTML = `<p>No pude leer las tablas del JOIN. ${esc(e.message)}</p>`;
        return false;
    }
    const MAX = 12;
    const vi = izq.slice(0, MAX), vd = der.slice(0, MAX);
    const parejas = [];
    vi.forEach((a, i) => vd.forEach((b, j) => { if (igual(a[info.izq.col], b[info.der.col])) parejas.push([i, j]); }));
    const conPareja = { izq: new Set(parejas.map(p => p[0])), der: new Set(parejas.map(p => p[1])) };
    const quedaIzq = info.tipo === 'LEFT' || info.tipo === 'FULL';
    const quedaDer = info.tipo === 'RIGHT' || info.tipo === 'FULL';

    const columna = (lado, filas, tabla, col, alias, queda) => filas.map((f, i) => {
        const tiene = conPareja[lado].has(i);
        const cls = tiene ? '' : (queda ? 'sola queda' : 'sola fuera');
        const marca = !tiene && queda ? '<span class="marca-null">sale con NULL</span>' : '';
        return `<div class="join-fila ${cls}" data-lado="${lado}" data-i="${i}"><span class="llave-valor">${valor(f[col])}</span><span class="texto">${esc(etiqueta(tabla, f, col))}</span>${marca}</div>`;
    }).join('');

    const solasIzq = vi.length - conPareja.izq.size;
    const solasDer = vd.length - conPareja.der.size;
    const total = parejas.length + (quedaIzq ? solasIzq : 0) + (quedaDer ? solasDer : 0);
    const explica = {
        INNER: `Solo salen las parejas completas. ${parejas.length} ${parejas.length === 1 ? 'línea' : 'líneas'}, ${parejas.length} ${parejas.length === 1 ? 'fila' : 'filas'}. Las que se quedaron sin pareja no salen.`,
        LEFT: `Salen las ${parejas.length} parejas y además ${solasIzq} de ${info.izq.tabla} que no tienen pareja, con las columnas de ${info.der.tabla} en NULL. En total ${total}.`,
        RIGHT: `Salen las ${parejas.length} parejas y además ${solasDer} de ${info.der.tabla} sin pareja, con lo de ${info.izq.tabla} en NULL. En total ${total}.`,
        FULL: `Salen las ${parejas.length} parejas, ${solasIzq} de ${info.izq.tabla} sin pareja y ${solasDer} de ${info.der.tabla} sin pareja. En total ${total}.`
    }[info.tipo];

    caja.innerHTML = `<div class="join-vista">
        <p class="join-titulo"><code>${info.tipo} JOIN</code> empareja <b>${esc(info.izq.alias)}.${esc(info.izq.col)}</b> con <b>${esc(info.der.alias)}.${esc(info.der.col)}</b></p>
        <div class="join-lienzo">
            <svg aria-hidden="true"></svg>
            <div class="join-col"><h4>${esc(info.izq.tabla)} <small>${esc(info.izq.col)}</small></h4>${columna('izq', vi, info.izq.tabla, info.izq.col, info.izq.alias, quedaIzq)}${izq.length > MAX ? `<p class="join-mas">y ${izq.length - MAX} más</p>` : ''}</div>
            <div class="join-col"><h4>${esc(info.der.tabla)} <small>${esc(info.der.col)}</small></h4>${columna('der', vd, info.der.tabla, info.der.col, info.der.alias, quedaDer)}${der.length > MAX ? `<p class="join-mas">y ${der.length - MAX} más</p>` : ''}</div>
        </div>
        <div class="join-resumen">${explica}${info.masJoins ? ' Esta consulta tiene más JOIN, aquí se dibuja solo el primero.' : ''}${izq.length > MAX || der.length > MAX ? ' Se dibujan las primeras 12 filas de cada tabla.' : ''}</div>
    </div>`;

    const lienzo = caja.querySelector('.join-lienzo');
    const svg = caja.querySelector('svg');
    let veces = 0;
    const trazar = () => {
        const base = lienzo.getBoundingClientRect();
        if (!base.width) return;
        // la animacion solo la primera vez, al cambiar de tamano se redibuja quieta
        const quieta = veces++ > 0;
        svg.innerHTML = parejas.map(([i, j], k) => {
            const a = lienzo.querySelector(`[data-lado="izq"][data-i="${i}"]`).getBoundingClientRect();
            const b = lienzo.querySelector(`[data-lado="der"][data-i="${j}"]`).getBoundingClientRect();
            const x1 = a.right - base.left, y1 = a.top + a.height / 2 - base.top;
            const x2 = b.left - base.left, y2 = b.top + b.height / 2 - base.top;
            const mx = (x1 + x2) / 2;
            const largo = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 1.2);
            return `<path class="linea-join" style="--l:${largo};${quieta ? 'animation:none;stroke-dashoffset:0' : `animation-delay:${k * 0.07}s`}" d="M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}"/>`;
        }).join('');
    };
    requestAnimationFrame(trazar);
    if (caja._ro) caja._ro.disconnect();
    caja._ro = new ResizeObserver(() => trazar());
    caja._ro.observe(lienzo);
    return true;
}

// tablas y alias del FROM para armar columnas con nombre completo
function tablasDelFrom(from) {
    const res = [];
    const re = /(?:^|\bJOIN\b|,)\s*([\w\[\]\.]+)(?:\s+(?:AS\s+)?(?!(?:INNER|LEFT|RIGHT|FULL|CROSS|OUTER|JOIN|ON|WHERE)\b)(\w+))?/gi;
    let m;
    while ((m = re.exec(from))) {
        const tabla = m[1].replace(/[\[\]]/g, '').replace(/^dbo\./i, '');
        res.push({ tabla, alias: m[2] || tabla });
    }
    return res;
}

function columnasCompletas(db, from) {
    const ts = tablasDelFrom(from);
    if (ts.length < 2) return '*';
    const cols = [];
    for (const t of ts) {
        const r = db.exec(`PRAGMA table_info(${t.tabla})`);
        if (!r.length) return '*';
        r[0].values.forEach(v => cols.push(`${t.alias}.${v[1]} AS [${t.alias}.${v[1]}]`));
    }
    return cols.join(', ');
}

export function dibujarOrden(caja, sql, db) {
    const p = partes(sql);
    if (!p || !p.from) {
        caja.innerHTML = '<p>El orden de ejecución se ve con una consulta SELECT que tenga FROM.</p>';
        return false;
    }
    const base = `FROM ${p.from}`;
    const w = p.where ? `\nWHERE ${p.where}` : '';
    const g = p.groupBy ? `\nGROUP BY ${p.groupBy}` : '';
    const h = p.having ? `\nHAVING ${p.having}` : '';
    const sel = `SELECT ${p.distinct ? 'DISTINCT ' : ''}${p.select}\n`;
    const pasos = [];
    pasos.push({ clave: 'FROM', sql: `SELECT ${columnasCompletas(db, p.from)}\n${base}`, txt: n => `Primero SQL Server arma la tabla del FROM${/\bJOIN\b/i.test(p.from) ? ' con los JOIN' : ''}. Todavía no filtra nada, hay ${n} filas con todas las columnas.` });
    if (p.where) pasos.push({ clave: 'WHERE', sql: `SELECT ${columnasCompletas(db, p.from)}\n${base}${w}`, txt: (n, a) => `El WHERE se queda con las filas que cumplen la condición. De ${a} quedan ${n}.` });
    if (p.groupBy) pasos.push({ clave: 'GROUP BY', sql: `SELECT ${p.groupBy}, COUNT(*) AS [filas en el grupo]\n${base}${w}${g}`, txt: n => `GROUP BY junta las filas que tienen el mismo ${p.groupBy}. Salen ${n} grupos, y al lado ves cuántas filas cayeron en cada uno.` });
    if (p.having) pasos.push({ clave: 'HAVING', sql: `SELECT ${p.groupBy}, COUNT(*) AS [filas en el grupo]\n${base}${w}${g}${h}`, txt: (n, a) => `HAVING descarta grupos completos. De ${a} grupos quedan ${n}.` });
    pasos.push({ clave: 'SELECT', sql: `${sel}${base}${w}${g}${h}`, txt: () => `Hasta aquí escoge las columnas del SELECT${p.distinct ? ' y DISTINCT quita las repetidas' : ''}. Por eso un alias que pones en el SELECT no se puede usar en el WHERE, todavía no existía.` });
    if (p.orderBy) pasos.push({ clave: 'ORDER BY', sql: `${sel}${base}${w}${g}${h}\nORDER BY ${p.orderBy}`, txt: () => 'ORDER BY ordena casi al final. Como el SELECT ya pasó, aquí sí puedes usar el alias.' });
    if (p.top !== null) pasos.push({ clave: 'TOP', sql: `SELECT TOP ${p.top} ${p.distinct ? 'DISTINCT ' : ''}${p.select}\n${base}${w}${g}${h}${p.orderBy ? `\nORDER BY ${p.orderBy}` : ''}`, txt: () => `Al final TOP ${p.top} se queda con las primeras ${p.top} filas. Por eso TOP sin ORDER BY trae cualquiera.` });

    const resultados = pasos.map(x => {
        const r = ejecutar(db, x.sql);
        return r.error ? { error: r.error.texto } : r.resultados[r.resultados.length - 1];
    });

    const escrito = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY'].filter(k => k === 'SELECT' || k === 'FROM' || (k === 'WHERE' && p.where) || (k === 'GROUP BY' && p.groupBy) || (k === 'HAVING' && p.having) || (k === 'ORDER BY' && p.orderBy));
    caja.innerHTML = `
        <div class="escrito-vs">
            <div><b>Así lo escribes</b>${escrito.join(', ')}${p.top !== null ? ', con TOP pegado al SELECT' : ''}</div>
            <div><b>Así lo ejecuta SQL Server</b>${pasos.map(x => x.clave).join(', ')}</div>
        </div>
        <ol class="orden-pasos">${pasos.map((x, i) => `<li><button type="button" data-paso="${i}"><span>${i + 1}</span>${x.clave}</button></li>`).join('')}</ol>
        <div class="orden-detalle"></div>
        <div class="acciones"><button type="button" class="btn chico suave" data-mover="-1">Paso anterior</button><button type="button" class="btn chico" data-mover="1">Siguiente paso</button></div>`;

    let actual = 0;
    const detalle = caja.querySelector('.orden-detalle');
    const consultaMarcada = clave => {
        const lineas = [];
        lineas.push(['SELECT', `SELECT ${p.top !== null ? `TOP ${p.top} ` : ''}${p.distinct ? 'DISTINCT ' : ''}${p.select}`]);
        lineas.push(['FROM', `FROM ${p.from}`]);
        if (p.where) lineas.push(['WHERE', `WHERE ${p.where}`]);
        if (p.groupBy) lineas.push(['GROUP BY', `GROUP BY ${p.groupBy}`]);
        if (p.having) lineas.push(['HAVING', `HAVING ${p.having}`]);
        if (p.orderBy) lineas.push(['ORDER BY', `ORDER BY ${p.orderBy}`]);
        return lineas.map(([k, t]) => (k === clave || (clave === 'TOP' && k === 'SELECT')) ? `<mark>${resaltar(t)}</mark>` : resaltar(t)).join('\n');
    };
    const mostrar = i => {
        actual = Math.max(0, Math.min(pasos.length - 1, i));
        caja.querySelectorAll('[data-paso]').forEach(b => { if (+b.dataset.paso === actual) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
        const r = resultados[actual];
        const anterior = actual > 0 && resultados[actual - 1] && resultados[actual - 1].filas ? resultados[actual - 1].filas.length : 0;
        const n = r && r.filas ? r.filas.length : 0;
        detalle.innerHTML = `
            <div class="orden-explica"><b>Paso ${actual + 1}.</b> ${esc(pasos[actual].txt(n, anterior))}</div>
            <pre class="pizarra consulta-marcada">${consultaMarcada(pasos[actual].clave)}</pre>
            ${r && r.error ? `<div class="error-sql">${esc(r.error)}</div>` : tablaHTML(r, { titulo: 'Cómo va la tabla en este paso', max: 60 })}`;
    };
    caja.addEventListener('click', ev => {
        const b = ev.target.closest('[data-paso]');
        if (b) mostrar(+b.dataset.paso);
        const m = ev.target.closest('[data-mover]');
        if (m) mostrar(actual + +m.dataset.mover);
    });
    mostrar(0);
    return true;
}
