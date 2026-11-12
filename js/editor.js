// resaltado de SQL y el editor con teclas rapidas para el cel
const CLAVES = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN', 'ORDER', 'BY', 'GROUP', 'HAVING', 'TOP', 'DISTINCT', 'AS', 'ASC', 'DESC',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON', 'BEGIN', 'TRAN', 'TRANSACTION', 'COMMIT', 'ROLLBACK',
    'CREATE', 'TABLE', 'ALTER', 'DROP', 'ADD', 'PRIMARY', 'KEY', 'REFERENCES', 'IDENTITY', 'DEFAULT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'ALL', 'EXISTS', 'WITH',
    'OFFSET', 'FETCH', 'NEXT', 'ROWS', 'ONLY', 'TRUNCATE', 'PRINT', 'DECLARE', 'INT', 'NVARCHAR', 'VARCHAR', 'DECIMAL', 'DATE', 'DATETIME', 'BIT'];
const FUNCIONES = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ISNULL', 'COALESCE', 'GETDATE', 'DATEDIFF', 'DATEADD', 'DATEPART', 'DATENAME', 'YEAR', 'MONTH', 'DAY', 'UPPER', 'LOWER', 'LEN',
    'LTRIM', 'RTRIM', 'TRIM', 'REPLACE', 'SUBSTRING', 'CHARINDEX', 'CONVERT', 'CAST', 'ROUND', 'ABS', 'IIF', 'CONCAT', 'CEILING', 'FLOOR'];
const RE_CLAVE = new RegExp('\\b(' + CLAVES.join('|') + ')\\b', 'gi');
const RE_FUNC = new RegExp('\\b(' + FUNCIONES.join('|') + ')(?=\\s*\\()', 'gi');

const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function resaltar(sql, hueco) {
    // primero comentarios y textos, lo demas se colorea por partes
    const trozos = [];
    const re = /(--[^\n]*|\/\*[\s\S]*?\*\/)|(N?'(?:[^']|'')*'?)/g;
    let ultimo = 0, m;
    while ((m = re.exec(sql))) {
        trozos.push(colorear(sql.slice(ultimo, m.index)));
        trozos.push(m[1] ? `<span class="c">${esc(m[1])}</span>` : `<span class="s">${esc(m[2])}</span>`);
        ultimo = m.index + m[0].length;
    }
    trozos.push(colorear(sql.slice(ultimo)));
    let html = trozos.join('');
    if (hueco) html = html.replace(/___/g, '<span class="hueco">___</span>');
    return html;
}

function colorear(t) {
    return esc(t)
        .replace(RE_FUNC, '\u0001f$1\u0002')
        .replace(RE_CLAVE, m => '\u0001k' + m + '\u0002')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '\u0001n$1\u0002')
        .replace(/\u0001([kfn])/g, '<span class="$1">')
        .replace(/\u0002/g, '</span>');
}

const TECLAS = ['SELECT', 'FROM', 'WHERE', '*', ',', '=', "''", '( )', ';', 'AND', 'ORDER BY', 'GROUP BY', 'JOIN', 'ON', 'IS NULL'];

export function crearEditor({ valor = '', alCorrer, teclas = true, tablas = [], esquema = null } = {}) {
    const caja = document.createElement('div');
    caja.innerHTML = `
        <div class="editor">
            <pre aria-hidden="true"></pre>
            <textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Escribe tu consulta" placeholder="Escribe aquí tu consulta"></textarea>
        </div>
        ${teclas ? '<div class="teclas" aria-label="Teclas rápidas"></div>' : ''}`;
    const ta = caja.querySelector('textarea');
    const pre = caja.querySelector('pre');
    ta.value = valor;

    const pintar = () => { pre.innerHTML = resaltar(ta.value) + '\n'; };
    pintar();
    ta.addEventListener('input', pintar);

    ta.addEventListener('keydown', ev => {
        if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
            ev.preventDefault();
            if (alCorrer) alCorrer();
            return;
        }
        if (ev.key === 'Tab' && !ev.shiftKey) {
            ev.preventDefault();
            meter('    ');
        }
    });

    function meter(texto, retroceso = 0) {
        ta.focus();
        const ini = ta.selectionStart, fin = ta.selectionEnd;
        ta.value = ta.value.slice(0, ini) + texto + ta.value.slice(fin);
        const pos = ini + texto.length - retroceso;
        ta.setSelectionRange(pos, pos);
        pintar();
        ta.dispatchEvent(new Event('input'));
    }

    if (teclas) {
        const zona = caja.querySelector('.teclas');
        let ultimas = '';
        // las columnas salen solas cuando ya escribiste el nombre de su tabla
        const pintarTeclas = () => {
            const texto = ta.value.toLowerCase();
            const usadas = esquema ? Object.keys(esquema).filter(t => new RegExp('\\b' + t + '\\b').test(texto)) : [];
            const columnas = [...new Set(usadas.flatMap(t => esquema[t]))];
            const firma = usadas.join(',');
            if (firma === ultimas && zona.children.length) return;
            ultimas = firma;
            const lista = [...TECLAS, ...tablas];
            zona.innerHTML = lista.map(t => `<button type="button">${esc(t)}</button>`).join('') +
                columnas.map(c => `<button type="button" class="col">${esc(c)}</button>`).join('');
        };
        pintarTeclas();
        ta.addEventListener('input', pintarTeclas);
        zona.addEventListener('click', ev => {
            const b = ev.target.closest('button');
            if (!b) return;
            const t = b.textContent;
            if (t === "''") return meter("''", 1);
            if (t === '( )') return meter('()', 1);
            const antes = ta.value.slice(0, ta.selectionStart);
            const espacio = antes && !/\s$/.test(antes) && !/^[,;)]$/.test(t) ? ' ' : '';
            meter(espacio + t + (/^[,;]$/.test(t) ? ' ' : ' '));
        });
    }

    return {
        nodo: caja,
        get valor() { return ta.value; },
        set valor(v) { ta.value = v; pintar(); ta.dispatchEvent(new Event('input')); },
        enfocar() { ta.focus(); },
        meter
    };
}

const CLAUSULAS = /^(FROM|WHERE|GROUP BY|HAVING|ORDER BY|SET|VALUES|UNION ALL|UNION|(?:INNER|LEFT|RIGHT|FULL|CROSS)(?: OUTER)? JOIN|JOIN)$/;
const PEGADAS = ['GROUP BY', 'ORDER BY', 'UNION ALL', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'BEGIN TRAN', 'IS NOT NULL', 'IS NULL', 'NOT IN'];

// acomoda la consulta como se escribe en el trabajo, cada parte en su renglon
export function formatear(sql) {
    const mayus = t => t.replace(RE_CLAVE, m => m.toUpperCase()).replace(RE_FUNC, m => m.toUpperCase());
    // con comentarios solo se ponen mayusculas, moverlos de renglon los puede romper
    if (/--|\/\*/.test(sql)) return conTextos(sql, mayus);

    const textos = [];
    let s = sql.replace(/N?'(?:[^']|'')*'|"[^"]*"/g, m => { textos.push(m); return '\u0001' + (textos.length - 1) + '\u0001'; });
    const sentencias = [];
    let prof = 0, act = '';
    for (const c of s) {
        if (c === '(') prof++;
        if (c === ')') prof--;
        if (c === ';' && prof === 0) { sentencias.push(act); act = ''; continue; }
        act += c;
    }
    if (act.trim()) sentencias.push(act);

    const salida = sentencias.map(x => acomodar(mayus(x.replace(/\s+/g, ' ').trim()))).filter(Boolean);
    let r = salida.join(';\n\n') + (salida.length ? ';' : '');
    return r.replace(/\u0001(\d+)\u0001/g, (_, n) => textos[+n]);
}

function conTextos(sql, fn) {
    const re = /(--[^\n]*|\/\*[\s\S]*?\*\/|N?'(?:[^']|'')*')/g;
    let r = '', ultimo = 0, m;
    while ((m = re.exec(sql))) { r += fn(sql.slice(ultimo, m.index)) + m[0]; ultimo = m.index + m[0].length; }
    return r + fn(sql.slice(ultimo));
}

function acomodar(t) {
    if (!t) return '';
    // se parte en palabras y simbolos, cuidando los parentesis
    const piezas = t.match(/\u0001\d+\u0001|[A-Za-z_][\w.]*|\[[^\]]*\]|\d+(?:\.\d+)?|<>|<=|>=|!=|\S/g) || [];
    let out = '', prof = 0, clausula = '', i = 0;
    const sangria = '    ';
    while (i < piezas.length) {
        // palabras que van juntas como GROUP BY o LEFT JOIN
        let p = piezas[i], salto = 1;
        for (const k of PEGADAS) {
            const ks = k.split(' ');
            if (ks.every((w, j) => (piezas[i + j] || '').toUpperCase() === w)) { p = k; salto = ks.length; break; }
        }
        const P = p.toUpperCase();
        if (prof === 0 && CLAUSULAS.test(P) && out && !(P === 'FROM' && /^DELETE\s*$/i.test(out.trim()))) {
            out = out.replace(/\s+$/, '') + '\n' + P;
            clausula = P;
        } else if (prof === 0 && (P === 'AND' || P === 'OR') && /^(WHERE|HAVING)$/.test(clausula) || prof === 0 && (P === 'AND') && /JOIN$/.test(clausula)) {
            out = out.replace(/\s+$/, '') + '\n' + sangria + P;
        } else if (prof === 0 && P === 'ON' && /JOIN$/.test(clausula)) {
            out = out.replace(/\s+$/, '') + ' ON';
        } else if (p === ',') {
            out = out.replace(/\s+$/, '') + ',';
            if (prof === 0 && clausula === 'SELECT') out += '\n' + '       ';
            else out += ' ';
            i += salto;
            continue;
        } else if (p === '(') {
            // pegado a la funcion, separado de IN o VALUES
            const antes = out.replace(/\s+$/, '');
            const pegar = /[\w\]]$/.test(antes) && !/\b(IN|VALUES|EXISTS|AND|OR|ON|AS|WHERE|SELECT|FROM|JOIN|THEN|ELSE|WHEN)$/i.test(antes) && !/\u0001$/.test(antes) && !/\b(INTO|TABLE)\s+[\w\[\]]+$/i.test(antes);
            out = pegar ? antes + '(' : (antes ? antes + ' (' : '(');
            prof++;
            i += salto;
            continue;
        } else if (p === ')') {
            out = out.replace(/\s+$/, '') + ')';
            prof = Math.max(0, prof - 1);
            i += salto;
            continue;
        } else if (p === '.') {
            out = out.replace(/\s+$/, '') + '.';
            i += salto;
            continue;
        } else {
            if (out && !/[\s(.]$/.test(out)) out += ' ';
            out += P === p.toUpperCase() && /^[A-Z ]+$/.test(P) && CLAVE_SET.has(P.split(' ')[0]) ? P : p;
            if (P === 'SELECT' && prof === 0) clausula = 'SELECT';
        }
        if (!/[\s]$/.test(out)) out += ' ';
        i += salto;
    }
    return out.replace(/[ \t]+\n/g, '\n').replace(/[ \t]+$/g, '').replace(/ \)/g, ')');
}
const CLAVE_SET = new Set(CLAVES);
