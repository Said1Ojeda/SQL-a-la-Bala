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

export function crearEditor({ valor = '', alCorrer, teclas = true, tablas = [] } = {}) {
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
    }

    if (teclas) {
        const zona = caja.querySelector('.teclas');
        const lista = [...TECLAS, ...tablas];
        zona.innerHTML = lista.map(t => `<button type="button">${esc(t)}</button>`).join('');
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
        set valor(v) { ta.value = v; pintar(); },
        enfocar() { ta.focus(); },
        meter
    };
}
