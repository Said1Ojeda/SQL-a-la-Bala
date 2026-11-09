// dibuja resultados, errores y lo que cambio en una tabla
export const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function valor(v, decimales) {
    if (v === null || v === undefined) return '<span class="nulo">NULL</span>';
    if (typeof v === 'number') return Number.isInteger(v) && !decimales ? String(v) : v.toFixed(2);
    return esc(v);
}

// si una columna trae algun decimal se muestran todos con dos, asi los precios se ven parejos
function columnasDecimales(filas, n) {
    const r = new Array(n).fill(false);
    filas.forEach(f => f.forEach((v, i) => { if (typeof v === 'number' && !Number.isInteger(v)) r[i] = true; }));
    return r;
}
const clase = v => typeof v === 'number' ? ' class="num"' : '';

export function tablaHTML(res, { titulo = '', max = 200 } = {}) {
    if (!res) return '';
    const filas = res.filas.slice(0, max);
    const dec = columnasDecimales(res.filas, res.columnas.length);
    const cab = `<tr><th class="nfila" scope="col"><span class="oculto">Fila</span></th>${res.columnas.map(c => `<th scope="col">${esc(c || '(sin nombre)')}</th>`).join('')}</tr>`;
    const cuerpo = filas.length
        ? filas.map((f, i) => `<tr><td class="nfila">${i + 1}</td>${f.map((v, k) => `<td${clase(v)}>${valor(v, dec[k])}</td>`).join('')}</tr>`).join('')
        : `<tr><td class="nfila"></td><td colspan="${res.columnas.length || 1}" style="color:var(--tinta-3)">Sin filas</td></tr>`;
    const n = res.filas.length;
    return `<div class="resultado">
        <div class="resultado-cabeza"><span>${esc(titulo)}</span><span>${n} ${n === 1 ? 'fila' : 'filas'}${n > max ? `, se muestran ${max}` : ''}</span></div>
        <div class="marco-tabla"><table class="datos"><thead>${cab}</thead><tbody>${cuerpo}</tbody></table></div>
    </div>`;
}

export function diffHTML(tabla, d) {
    if (!d) return '';
    const cuenta = { nueva: 0, cambio: 0, borrada: 0 };
    d.filas.forEach(f => { if (cuenta[f.estado] !== undefined) cuenta[f.estado]++; });
    const tocadas = d.filas.filter(f => f.estado !== 'igual');
    const resumen = [
        cuenta.nueva ? `${cuenta.nueva} ${cuenta.nueva === 1 ? 'nueva' : 'nuevas'}` : '',
        cuenta.cambio ? `${cuenta.cambio} ${cuenta.cambio === 1 ? 'cambiada' : 'cambiadas'}` : '',
        cuenta.borrada ? `${cuenta.borrada} ${cuenta.borrada === 1 ? 'borrada' : 'borradas'}` : ''
    ].filter(Boolean).join(', ') || 'nada cambió';
    // si cambio mucho se ensenan solo las tocadas y unas cuantas de contexto
    const lista = d.filas.length > 24 ? tocadas.slice(0, 40) : d.filas;
    const cab = `<tr>${d.columnas.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr>`;
    const dec = columnasDecimales(d.filas.flatMap(f => f.vieja ? [f.fila, f.vieja] : [f.fila]), d.columnas.length);
    const cuerpo = lista.map(f => {
        const celdas = f.fila.map((v, i) => {
            if (f.estado === 'cambio' && f.cambios[i]) return `<td class="cambio"><del>${valor(f.vieja[i], dec[i])}</del>${valor(v, dec[i])}</td>`;
            return `<td${clase(v)}>${valor(v, dec[i])}</td>`;
        }).join('');
        return `<tr class="${f.estado}">${celdas}</tr>`;
    }).join('');
    return `<div class="resultado">
        <div class="resultado-cabeza"><span>Así quedó ${esc(tabla)}</span><span>${resumen}</span></div>
        <div class="marco-tabla"><table class="datos"><thead>${cab}</thead><tbody>${cuerpo}</tbody></table></div>
        <div class="leyenda">
            <span><i style="background:var(--menta-suave);border:1px solid var(--menta)"></i>nueva</span>
            <span><i style="background:var(--ambar-suave);border:1px solid var(--rotulo-sombra)"></i>cambió</span>
            <span><i style="background:var(--chile-suave);border:1px solid var(--chile)"></i>borrada</span>
        </div>
    </div>`;
}

export function errorHTML(err) {
    if (!err) return '';
    return `<div class="error-sql" role="alert"><b>No corrió.</b> ${esc(err.texto)}</div>`;
}

export function mensajesHTML(m) {
    return m && m.length ? `<div class="mensajes">${esc(m.join('\n'))}</div>` : '';
}
