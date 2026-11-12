// el motor es SQLite en el navegador, aca se traduce lo comun de SQL Server para que se sienta igual
import { ESQUEMA, DATOS } from './datos.js';

let SQL = null;

export async function iniciar() {
    if (SQL) return SQL;
    SQL = await initSqlJs({ locateFile: f => 'vendor/' + f });
    return SQL;
}

// textos y comentarios se guardan aparte para que las reglas no los toquen
function proteger(sql) {
    const textos = [];
    let s = '';
    let i = 0;
    while (i < sql.length) {
        const c = sql[i];
        if (c === '-' && sql[i + 1] === '-') {
            while (i < sql.length && sql[i] !== '\n') i++;
            continue;
        }
        if (c === '/' && sql[i + 1] === '*') {
            const fin = sql.indexOf('*/', i + 2);
            const trozo = sql.slice(i, fin === -1 ? sql.length : fin + 2);
            s += trozo.replace(/[^\n]/g, ' ');
            i = fin === -1 ? sql.length : fin + 2;
            continue;
        }
        const conN = (c === 'N' || c === 'n') && sql[i + 1] === "'" && !/[\w]/.test(sql[i - 1] || '');
        if (c === "'" || conN) {
            let j = i + (conN ? 2 : 1);
            let valor = '';
            while (j < sql.length) {
                if (sql[j] === "'" && sql[j + 1] === "'") { valor += "'"; j += 2; continue; }
                if (sql[j] === "'") break;
                valor += sql[j++];
            }
            textos.push(valor);
            s += '\u0001' + (textos.length - 1) + '\u0001';
            i = j + 1;
            continue;
        }
        s += c;
        i++;
    }
    return { s, textos };
}

function restaurar(s, textos) {
    return s.replace(/\u0001(\d+)\u0001/g, (_, n) => "'" + textos[+n].replace(/'/g, "''") + "'");
}

const SIEMPRE_CORTA = /^(INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK|CREATE|ALTER|DROP|PRINT|TRUNCATE|DECLARE|GO|SAVE)\b/i;

// SQL Server deja escribir sin punto y coma, por eso se corta tambien por renglon
function dividir(protegido) {
    const lotes = [];
    let actual = '';
    let prof = 0;
    const empuja = () => { if (actual.trim()) lotes.push(actual.trim()); actual = ''; };

    for (const renglon of protegido.split('\n')) {
        const limpio = renglon.trim();
        if (prof === 0 && actual.trim() && limpio) {
            const inicio = actual.trim();
            const ultimo = inicio.split('\n').filter(x => x.trim()).pop().trim();
            const empiezaUpdate = /^UPDATE\b/i.test(inicio);
            const esInsertSelect = /^INSERT\b/i.test(inicio) && !/\bVALUES\b/i.test(inicio);
            let corta = SIEMPRE_CORTA.test(limpio);
            if (/^SELECT\b/i.test(limpio)) {
                corta = !/(\bUNION|\bALL|\bEXCEPT|\bINTERSECT|\()$/i.test(ultimo) && !esInsertSelect && !/^WITH\b/i.test(inicio);
            }
            if (/^SET\b/i.test(limpio)) corta = !empiezaUpdate;
            if (corta) empuja();
        }
        for (const ch of renglon) {
            if (ch === '(') prof++;
            else if (ch === ')') prof = Math.max(0, prof - 1);
            else if (ch === ';' && prof === 0) { empuja(); continue; }
            actual += ch;
        }
        actual += '\n';
    }
    empuja();
    return lotes.filter(l => !/^GO$/i.test(l));
}

// mete LIMIT donde termina el select que tenia TOP, sirve tambien dentro de subconsultas
function quitarTop(s) {
    const re = /\bSELECT(\s+DISTINCT)?\s+TOP\s*\(?\s*(\d+)\s*\)?(\s+PERCENT)?/gi;
    const hallazgos = [];
    let m;
    while ((m = re.exec(s))) hallazgos.push({ i: m.index, largo: m[0].length, n: m[2], distinct: !!m[1] });
    for (let k = hallazgos.length - 1; k >= 0; k--) {
        const h = hallazgos[k];
        let prof = 0;
        let fin = s.length;
        for (let j = h.i; j < s.length; j++) {
            if (s[j] === '(') prof++;
            else if (s[j] === ')') {
                if (prof === 0) { fin = j; break; }
                prof--;
            }
        }
        const cola = s.slice(h.i + h.largo, fin);
        if (/\bLIMIT\b/i.test(cola)) continue;
        s = s.slice(0, h.i) + 'SELECT ' + (h.distinct ? 'DISTINCT ' : '') + cola.replace(/\s+$/, '') + ' LIMIT ' + h.n + (fin < s.length ? ' ' : '') + s.slice(fin);
    }
    return s;
}

// CONVERT puede traer 2 o 3 argumentos y sql.js no deja funciones con argumentos variables
function reescribirConvert(s) {
    const re = /\bCONVERT\s*\(/gi;
    let m;
    while ((m = re.exec(s))) {
        const ini = m.index + m[0].length;
        let prof = 0, fin = -1;
        const args = [];
        let desde = ini;
        for (let j = ini; j < s.length; j++) {
            const c = s[j];
            if (c === '(') prof++;
            else if (c === ')') {
                if (prof === 0) { fin = j; break; }
                prof--;
            } else if (c === ',' && prof === 0) { args.push(s.slice(desde, j)); desde = j + 1; }
        }
        if (fin === -1) break;
        args.push(s.slice(desde, fin));
        if (args.length < 2) continue;
        const tipo = args[0].trim().replace(/\s*\(.*\)$/, '');
        const nuevo = `CONVERTIR('${tipo}', ${args[1].trim()}, ${args[2] ? args[2].trim() : 'NULL'})`;
        s = s.slice(0, m.index) + nuevo + s.slice(fin + 1);
        re.lastIndex = m.index + nuevo.length;
    }
    return s;
}

// tablas con alias de un FROM con JOIN, mas las condiciones de cada ON
function piezasFrom(from) {
    const trozos = from.split(/\b(?:INNER\s+)?JOIN\b/i);
    if (/\b(LEFT|RIGHT|FULL|CROSS)\b\s*$/i.test(trozos.slice(0, -1).join(' '))) return null;
    const piezas = [];
    for (const t of trozos) {
        const m = /^\s*([\w\[\]\.]+)(?:\s+(?:AS\s+)?(?!ON\b)(\w+))?(?:\s+ON\s+([\s\S]+))?$/i.exec(t.trim());
        if (!m) return null;
        const tabla = limpiaNombre(m[1]);
        piezas.push({ tabla, alias: m[2] || tabla, on: m[3] ? m[3].trim() : null });
    }
    return piezas;
}

// UPDATE alias SET ... FROM tabla alias JOIN ... como en SQL Server
function updateConJoin(s) {
    const m = /^\s*UPDATE\s+([\w\[\]\.]+)\s+SET\s+([\s\S]+?)\s+FROM\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?\s*$/i.exec(s);
    if (!m) return s;
    const objetivo = limpiaNombre(m[1]).toLowerCase();
    const piezas = piezasFrom(m[3]);
    if (!piezas) return s;
    const base = piezas.find(p => p.alias.toLowerCase() === objetivo) || piezas.find(p => p.tabla.toLowerCase() === objetivo);
    if (!base) return s;
    const otras = piezas.filter(p => p !== base);
    const condiciones = piezas.map(p => p.on).filter(Boolean).map(c => '(' + c + ')');
    if (m[4]) condiciones.push('(' + m[4] + ')');
    // en SQLite la columna del SET va sin alias
    const sets = porComasCrudo(m[2]).map(a => a.replace(/^\s*[\w\[\]]+\.([\w\[\]]+)\s*=/, '$1 ='));
    let r = `UPDATE ${base.tabla} AS ${base.alias} SET ${sets.join(', ')}`;
    if (otras.length) r += ' FROM ' + otras.map(p => `${p.tabla} AS ${p.alias}`).join(', ');
    if (condiciones.length) r += ' WHERE ' + condiciones.join(' AND ');
    return r;
}

// DELETE alias FROM tabla alias JOIN ... se vuelve un DELETE por rowid
function deleteConJoin(s) {
    const m = /^\s*DELETE\s+(?!FROM\b)([\w\[\]\.]+)\s+FROM\s+([\s\S]+)$/i.exec(s);
    if (!m) return s;
    const objetivo = limpiaNombre(m[1]).toLowerCase();
    const resto = m[2];
    const desde = resto.split(/\bWHERE\b/i)[0];
    const piezas = piezasFrom(desde);
    const base = piezas && (piezas.find(p => p.alias.toLowerCase() === objetivo) || piezas.find(p => p.tabla.toLowerCase() === objetivo));
    if (!base) return s;
    return `DELETE FROM ${base.tabla} WHERE rowid IN (SELECT ${base.alias}.rowid FROM ${resto})`;
}

function porComasCrudo(t) {
    const r = [];
    let prof = 0, act = '';
    for (const c of t) {
        if (c === '(') prof++;
        if (c === ')') prof--;
        if (c === ',' && prof === 0) { r.push(act); act = ''; continue; }
        act += c;
    }
    if (act.trim()) r.push(act);
    return r;
}

function traducir(lote) {
    let s = lote;
    // en SQL Server las comillas dobles son nombres, no textos, SQLite los dejaria pasar como texto
    s = s.replace(/"([^"]*)"/g, '[$1]');
    s = s.replace(/\bWITH\s*\(\s*NOLOCK\s*\)/gi, '');
    s = s.replace(/^SET\s+IDENTITY_INSERT\b.*$/gim, '');
    s = s.replace(/\bBEGIN\s+TRAN(SACTION)?\b(\s+\w+)?/gi, 'BEGIN TRANSACTION');
    s = s.replace(/\bCOMMIT\s+TRAN(SACTION)?\b(\s+\w+)?/gi, 'COMMIT');
    s = s.replace(/\bROLLBACK\s+TRAN(SACTION)?\b(\s+\w+)?/gi, 'ROLLBACK');
    s = s.replace(/^\s*PRINT\s+(.+)$/i, 'SELECT $1 AS [Mensaje]');
    s = s.replace(/\bTRUNCATE\s+TABLE\b/gi, 'DELETE FROM');
    s = s.replace(/\bALTER\s+TABLE\s+(\S+)\s+ADD\s+(?!COLUMN\b)/gi, 'ALTER TABLE $1 ADD COLUMN ');
    s = s.replace(/\b(GETDATE|SYSDATETIME|GETUTCDATE)\s*\(\s*\)/gi, "datetime('now','localtime')");
    s = s.replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now','localtime')");
    s = s.replace(/@@ROWCOUNT\b/gi, 'changes()');
    s = s.replace(/\b(SCOPE_IDENTITY\s*\(\s*\)|@@IDENTITY\b)/gi, 'last_insert_rowid()');
    s = s.replace(/\bISNULL\s*\(/gi, 'IFNULL(');
    s = s.replace(/\bLEN\s*\(/gi, 'LENGTH(');
    s = s.replace(/\bLEFT\s*\(/gi, 'IZQ(');
    s = s.replace(/\bRIGHT\s*\(/gi, 'DER(');
    s = s.replace(/\b(DATEDIFF|DATEADD|DATEPART|DATENAME)\s*\(\s*(\w+)\s*,/gi, "$1('$2',");
    s = reescribirConvert(s);
    s = s.replace(/\bCAST\s*\(\s*([^()]+?)\s+AS\s+DATE\s*\)/gi, 'date($1)');
    s = s.replace(/\bCAST\s*\(\s*([^()]+?)\s+AS\s+DATETIME2?\s*\)/gi, 'datetime($1)');
    // sumar textos con + es de SQL Server, en SQLite se une con dos barras
    s = s.replace(/(\u0001\d+\u0001)\s*\+/g, '$1 ||').replace(/\+\s*(\u0001\d+\u0001)/g, '|| $1');

    if (/^\s*UPDATE\b/i.test(s) && /\bFROM\b/i.test(s)) s = updateConJoin(s);
    if (/^\s*DELETE\s+(?!FROM\b)\w/i.test(s)) s = deleteConJoin(s);
    // un default con funcion en SQLite necesita parentesis
    s = s.replace(/\bDEFAULT\s+(datetime\('now','localtime'\))/gi, 'DEFAULT ($1)');

    if (/^\s*CREATE\s+TABLE\b/i.test(s)) {
        s = s.replace(/\bINT\s+IDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
        s = s.replace(/\bIDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, '');
        // SQL Server por defecto no distingue mayusculas, asi se parece
        s = s.replace(/\bN?(VAR)?CHAR\s*\(\s*(\d+|MAX)\s*\)/gi, 'TEXT COLLATE NOCASE');
    }

    s = s.replace(/\bOFFSET\s+(\d+)\s+ROWS?\s+FETCH\s+(NEXT|FIRST)\s+(\d+)\s+ROWS?\s+ONLY\b/gi, 'LIMIT $3 OFFSET $1');
    s = quitarTop(s);
    return s;
}

function aFecha(v) {
    if (v === null || v === undefined) return null;
    const t = String(v);
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(t);
    if (!m) return null;
    return { a: +m[1], m: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0), s: +(m[6] || 0), conHora: !!m[4] };
}
const dos = n => String(n).padStart(2, '0');
function fechaTexto(f, conHora) {
    const base = f.a + '-' + dos(f.m) + '-' + dos(f.d);
    return conHora ? base + ' ' + dos(f.h) + ':' + dos(f.mi) + ':' + dos(f.s) : base;
}
const PARTE = p => {
    p = String(p).toLowerCase();
    if (['year', 'yy', 'yyyy'].includes(p)) return 'year';
    if (['month', 'mm', 'm'].includes(p)) return 'month';
    if (['day', 'dd', 'd', 'dayofyear', 'dy'].includes(p)) return 'day';
    if (['hour', 'hh'].includes(p)) return 'hour';
    if (['minute', 'mi', 'n'].includes(p)) return 'minute';
    if (['week', 'wk', 'ww'].includes(p)) return 'week';
    if (['weekday', 'dw'].includes(p)) return 'weekday';
    return 'day';
};
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function funciones(db) {
    db.create_function('IZQ', (t, n) => t === null ? null : String(t).slice(0, Math.max(0, n)));
    db.create_function('DER', (t, n) => t === null ? null : (n <= 0 ? '' : String(t).slice(-n)));
    db.create_function('CHARINDEX', (busca, t) => t === null ? null : String(t).toLowerCase().indexOf(String(busca).toLowerCase()) + 1);
    db.create_function('YEAR', v => { const f = aFecha(v); return f ? f.a : null; });
    db.create_function('MONTH', v => { const f = aFecha(v); return f ? f.m : null; });
    db.create_function('DAY', v => { const f = aFecha(v); return f ? f.d : null; });
    // los de SQLite no le hacen mayuscula a las tildes
    db.create_function('UPPER', t => t === null ? null : String(t).toLocaleUpperCase('es'));
    db.create_function('LOWER', t => t === null ? null : String(t).toLocaleLowerCase('es'));
    db.create_function('CEILING', v => v === null ? null : Math.ceil(v));
    db.create_function('FLOOR', v => v === null ? null : Math.floor(v));
    db.create_function('DATEDIFF', (p, a, b) => {
        const x = aFecha(a), y = aFecha(b);
        if (!x || !y) return null;
        const parte = PARTE(p);
        if (parte === 'year') return y.a - x.a;
        if (parte === 'month') return (y.a - x.a) * 12 + (y.m - x.m);
        const dx = Date.UTC(x.a, x.m - 1, x.d), dy = Date.UTC(y.a, y.m - 1, y.d);
        const dias = Math.round((dy - dx) / 86400000);
        if (parte === 'week') return Math.floor(dias / 7);
        if (parte === 'hour') return dias * 24 + (y.h - x.h);
        if (parte === 'minute') return (dias * 24 + (y.h - x.h)) * 60 + (y.mi - x.mi);
        return dias;
    });
    db.create_function('DATEADD', (p, n, v) => {
        const f = aFecha(v);
        if (!f) return null;
        const d = new Date(Date.UTC(f.a, f.m - 1, f.d, f.h, f.mi, f.s));
        const parte = PARTE(p);
        if (parte === 'year' || parte === 'month') {
            // como SQL Server, el 31 mas un mes cae en el ultimo dia del mes
            const meses = parte === 'year' ? n * 12 : n;
            const total = (f.a * 12 + f.m - 1) + meses;
            const a = Math.floor(total / 12), mes = total % 12;
            const ultimo = new Date(Date.UTC(a, mes + 1, 0)).getUTCDate();
            d.setUTCFullYear(a, mes, Math.min(f.d, ultimo));
        }
        else if (parte === 'week') d.setUTCDate(d.getUTCDate() + n * 7);
        else if (parte === 'hour') d.setUTCHours(d.getUTCHours() + n);
        else if (parte === 'minute') d.setUTCMinutes(d.getUTCMinutes() + n);
        else d.setUTCDate(d.getUTCDate() + n);
        return fechaTexto({ a: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds() }, f.conHora);
    });
    db.create_function('DATEPART', (p, v) => {
        const f = aFecha(v);
        if (!f) return null;
        const parte = PARTE(p);
        if (parte === 'year') return f.a;
        if (parte === 'month') return f.m;
        if (parte === 'hour') return f.h;
        if (parte === 'minute') return f.mi;
        if (parte === 'weekday') return new Date(Date.UTC(f.a, f.m - 1, f.d)).getUTCDay() + 1;
        return f.d;
    });
    db.create_function('DATENAME', (p, v) => {
        const f = aFecha(v);
        if (!f) return null;
        const parte = PARTE(p);
        if (parte === 'month') return MESES[f.m - 1];
        if (parte === 'weekday') return DIAS[new Date(Date.UTC(f.a, f.m - 1, f.d)).getUTCDay()];
        return String(parte === 'year' ? f.a : f.d);
    });
    db.create_function('CONVERTIR', (tipo, v, estilo) => {
        if (v === null) return null;
        const t = String(tipo).toUpperCase();
        if (t.includes('CHAR')) {
            const f = aFecha(v);
            if (f && estilo !== undefined && estilo !== null) {
                if (estilo == 103) return dos(f.d) + '/' + dos(f.m) + '/' + f.a;
                if (estilo == 101) return dos(f.m) + '/' + dos(f.d) + '/' + f.a;
                if (estilo == 23) return fechaTexto(f, false);
                if (estilo == 120) return fechaTexto(f, true);
                if (estilo == 108) return dos(f.h) + ':' + dos(f.mi) + ':' + dos(f.s);
            }
            return typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : String(v);
        }
        if (t === 'INT' || t === 'BIGINT' || t === 'SMALLINT') return parseInt(v, 10);
        if (t === 'DECIMAL' || t === 'NUMERIC' || t === 'MONEY' || t === 'FLOAT') return Number(v);
        if (t === 'DATE') { const f = aFecha(v); return f ? fechaTexto(f, false) : null; }
        if (t.startsWith('DATETIME')) { const f = aFecha(v); return f ? fechaTexto(f, true) : null; }
        return v;
    });
}

// los errores de SQLite dichos como los diria un compa, con el numero de SQL Server cuando aplica
export function explicarError(msg) {
    let m;
    if ((m = /no such table: (\S+)/i.exec(msg))) return `No existe la tabla ${m[1]}. Revisa cómo se escribe, las tablas son categorias, productos, clientes, ventas y detalle_venta. En SQL Server es el error 208.`;
    if ((m = /no such column: (\S+)/i.exec(msg))) return `No existe la columna ${m[1]}. Revisa el nombre o si le falta el alias de la tabla adelante. En SQL Server es el error 207.`;
    if ((m = /ambiguous column name: (\S+)/i.exec(msg))) return `La columna ${m[1]} existe en más de una tabla. Ponle adelante el alias, por ejemplo p.${m[1]}. En SQL Server es el error 209.`;
    if (/FOREIGN KEY constraint failed/i.test(msg)) return 'No se puede. Hay otros registros que dependen de este por una llave foránea, o el valor que pusiste no existe en la otra tabla. En SQL Server es el error 547.';
    if ((m = /NOT NULL constraint failed: (\S+)/i.exec(msg))) return `La columna ${m[1].split('.').pop()} no acepta vacíos, tienes que mandarle un valor. En SQL Server es el error 515.`;
    if (/UNIQUE constraint failed|PRIMARY KEY/i.test(msg)) return 'Ese valor ya existe y la llave no deja repetirlo. En SQL Server es el error 2627.';
    if (/misuse of aggregate/i.test(msg)) return 'No puedes usar COUNT, SUM o AVG dentro del WHERE. Para filtrar grupos ya contados se usa HAVING.';
    if (/GROUP BY clause is required before HAVING|HAVING clause on a non-aggregate/i.test(msg)) return 'HAVING filtra grupos, entonces necesita un GROUP BY antes.';
    if (/incomplete input/i.test(msg)) return 'La consulta quedó incompleta. Revisa que no falte cerrar un paréntesis o una comilla.';
    if (/unrecognized token/i.test(msg)) return 'Hay un símbolo que no se reconoce. Revisa las comillas, en SQL los textos van con comilla simple.';
    if (/cannot start a transaction within a transaction/i.test(msg)) return 'Ya hay una transacción abierta. Ciérrala con COMMIT o ROLLBACK antes de abrir otra.';
    if (/cannot (commit|rollback) - no transaction is active/i.test(msg)) return 'No hay ninguna transacción abierta. Primero va BEGIN TRAN.';
    if (/(\d+) values for (\d+) columns/i.test(msg)) return 'La cantidad de valores no cuadra con la cantidad de columnas del INSERT.';
    if (/table \S+ has (\d+) columns but (\d+) values were supplied/i.test(msg)) return 'La tabla tiene más columnas de las que mandaste. Pon la lista de columnas después del nombre de la tabla.';
    if ((m = /near "([^"]*)": syntax error/i.exec(msg))) return `Error de sintaxis cerca de "${m[1]}". Revisa comas, comillas y el orden de las partes. En SQL Server es el error 102.`;
    return msg;
}

// separa un select en sus partes, solo en el nivel de afuera
export function partes(sql) {
    const { s, textos } = proteger(sql);
    const t = s.trim().replace(/;\s*$/, '');
    const marcas = {};
    let prof = 0;
    const re = /(SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|UNION|EXCEPT|INTERSECT)\b/iy;
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (c === '(') { prof++; continue; }
        if (c === ')') { prof--; continue; }
        if (prof !== 0 || /\w/.test(t[i - 1] || '')) continue;
        re.lastIndex = i;
        const m = re.exec(t);
        if (!m) continue;
        const clave = m[1].toUpperCase().replace(/\s+/g, ' ');
        if (['UNION', 'EXCEPT', 'INTERSECT'].includes(clave)) return null;
        if (!(clave in marcas)) marcas[clave] = { i, fin: i + m[0].length };
        i += m[0].length - 1;
    }
    if (!marcas.SELECT || marcas.SELECT.i !== 0) return null;
    const orden = Object.entries(marcas).sort((a, b) => a[1].i - b[1].i);
    const p = {};
    orden.forEach(([k, v], idx) => {
        const hasta = idx + 1 < orden.length ? orden[idx + 1][1].i : t.length;
        p[k] = restaurar(t.slice(v.fin, hasta).trim(), textos);
    });
    let sel = p.SELECT || '';
    const out = { distinct: false, top: null, select: '', from: p.FROM || '', where: p.WHERE || '', groupBy: p['GROUP BY'] || '', having: p.HAVING || '', orderBy: p['ORDER BY'] || '' };
    let m;
    if ((m = /^DISTINCT\b\s*/i.exec(sel))) { out.distinct = true; sel = sel.slice(m[0].length); }
    if ((m = /^TOP\s*\(?\s*(\d+)\s*\)?\s*/i.exec(sel))) { out.top = +m[1]; sel = sel.slice(m[0].length); }
    out.select = sel;
    return out;
}

// divide por comas de afuera, para listas de columnas
export function porComas(t) {
    const r = [];
    let prof = 0, act = '';
    const { s, textos } = proteger(t);
    for (const c of s) {
        if (c === '(') prof++;
        if (c === ')') prof--;
        if (c === ',' && prof === 0) { r.push(restaurar(act.trim(), textos)); act = ''; continue; }
        act += c;
    }
    if (act.trim()) r.push(restaurar(act.trim(), textos));
    return r;
}

const AGREGADO = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i;
const norm = x => x.replace(/\s+/g, '').replace(/[\[\]]/g, '').toLowerCase();

// SQLite deja pasar columnas sueltas con GROUP BY, SQL Server no, asi que se revisa aca
// quita lo que va entre parentesis con SELECT, para no confundir un COUNT de una subconsulta
function sinSubconsultas(t) {
    let r = '', prof = 0, dentro = -1;
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (c === '(') {
            if (dentro < 0 && /^\(\s*SELECT\b/i.test(t.slice(i))) dentro = prof;
            prof++;
            if (dentro >= 0) continue;
        } else if (c === ')') {
            prof--;
            if (dentro >= 0) {
                if (prof === dentro) { dentro = -1; r += '0'; }
                continue;
            }
        } else if (dentro >= 0) continue;
        r += c;
    }
    return r;
}

function revisarAgrupado(lote) {
    if (!/^\s*SELECT\b/i.test(lote)) return null;
    const p = partes(lote);
    if (!p || !p.select) return null;
    const crudas = porComas(p.select);
    const aliasDe = c => (/\s+AS\s+\[?([^\]]+?)\]?\s*$/i.exec(c) || /\)\s+\[?(\w+)\]?\s*$/.exec(c) || /^\s*[\w.]+\s+\[?(\w+)\]?\s*$/.exec(c) || [])[1];
    const alias = crudas.map(aliasDe).filter(Boolean).map(x => x.toLowerCase().replace(/\s+/g, ''));
    const cols = crudas.map(c => sinSubconsultas(c.replace(/\s+AS\s+[\w\[\]]+$/i, '').replace(/\s+\[[^\]]+\]$/, '')));
    const hayAgregado = cols.some(c => AGREGADO.test(c));
    if (!p.groupBy && !hayAgregado) return null;
    const grupo = p.groupBy ? porComas(p.groupBy).map(norm) : [];
    // agrupar por el alias no se puede, el GROUP BY corre antes que el SELECT
    const conAlias = grupo.find(g => alias.includes(g) && !cols.some(c => norm(c) === g || norm(c).endsWith('.' + g)));
    if (conAlias) return `En SQL Server no puedes agrupar por el alias ${conAlias}, porque el GROUP BY se ejecuta antes que el SELECT y ese nombre todavía no existe. Repite la expresión completa en el GROUP BY. Es el error 207.`;
    for (const c of cols) {
        if (AGREGADO.test(c) || c.trim() === '*' && !p.groupBy) continue;
        if (/^\s*[\d.]+\s*$/.test(c) || /^'.*'$/.test(c.trim()) || c.trim() === '0') continue;
        const n = norm(c);
        const sinAlias = n.replace(/^\w+\./, '');
        if (grupo.includes(n) || grupo.some(g => g.replace(/^\w+\./, '') === sinAlias)) continue;
        return `La columna ${c.trim()} no está en el GROUP BY ni dentro de un COUNT, SUM, AVG, MIN o MAX. SQL Server no sabría cuál valor poner por cada grupo. Es el error 8120.`;
    }
    return null;
}

export function nuevaBase() {
    const db = new SQL.Database();
    funciones(db);
    const r = ejecutar(db, ESQUEMA + DATOS);
    if (r.error) throw new Error('No se pudo armar la tienda ' + r.error.texto);
    db.exec('PRAGMA foreign_keys = ON');
    return db;
}

const tipoDe = l => (/^\s*(\w+)/.exec(l) || [, ''])[1].toUpperCase();

export function tablaObjetivo(lote) {
    const { s } = proteger(lote);
    let m;
    if ((m = /^\s*INSERT\s+(?:INTO\s+)?([\w\[\]\.]+)/i.exec(s))) return limpiaNombre(m[1]);
    // con JOIN lo que va despues del UPDATE o del DELETE puede ser el alias
    const resolver = (nombre, from) => {
        const piezas = from ? piezasFrom(from.split(/\bWHERE\b/i)[0]) : null;
        const n = limpiaNombre(nombre).toLowerCase();
        const p = piezas && piezas.find(x => x.alias.toLowerCase() === n || x.tabla.toLowerCase() === n);
        return p ? p.tabla : limpiaNombre(nombre);
    };
    if ((m = /^\s*UPDATE\s+([\w\[\]\.]+)[\s\S]*?\bFROM\s+([\s\S]+)$/i.exec(s))) return resolver(m[1], m[2]);
    if ((m = /^\s*UPDATE\s+([\w\[\]\.]+)/i.exec(s))) return limpiaNombre(m[1]);
    if ((m = /^\s*DELETE\s+(?!FROM\b)([\w\[\]\.]+)\s+FROM\s+([\s\S]+)$/i.exec(s))) return resolver(m[1], m[2]);
    if ((m = /^\s*DELETE\s+(?:FROM\s+)?([\w\[\]\.]+)/i.exec(s))) return limpiaNombre(m[1]);
    if ((m = /^\s*TRUNCATE\s+TABLE\s+([\w\[\]\.]+)/i.exec(s))) return limpiaNombre(m[1]);
    return null;
}
const limpiaNombre = n => n.replace(/[\[\]]/g, '').replace(/^dbo\./i, '');

export function lotesDe(sql) {
    const { s, textos } = proteger(sql);
    return dividir(s).map(l => restaurar(l, textos));
}

export function tieneWhere(lote) {
    return /\bWHERE\b/i.test(proteger(lote).s);
}

// corre todo lo que escribio el usuario, lote por lote, y junta resultados y mensajes
export function ejecutar(db, sql) {
    const { s, textos } = proteger(sql);
    const lotes = dividir(s);
    const salida = { resultados: [], mensajes: [], error: null, lotes: [] };
    for (const l of lotes) {
        const original = restaurar(l, textos);
        const tipo = tipoDe(l);
        const malAgrupado = revisarAgrupado(original);
        if (malAgrupado) {
            salida.error = { texto: malAgrupado, lote: original };
            break;
        }
        const traducido = restaurar(traducir(l), textos);
        if (!traducido.trim()) continue;
        try {
            const res = db.exec(traducido);
            const afectadas = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].includes(tipo) ? db.getRowsModified() : null;
            salida.lotes.push({ tipo, sql: original, afectadas, tabla: tablaObjetivo(original) });
            for (const r of res) salida.resultados.push({ columnas: r.columns, filas: r.values, sql: original });
            if (afectadas !== null) salida.mensajes.push(`(${afectadas} ${afectadas === 1 ? 'fila afectada' : 'filas afectadas'})`);
            else if (tipo === 'SELECT' && !res.length) {
                salida.resultados.push({ columnas: columnasVacias(db, traducido), filas: [], sql: original });
                salida.mensajes.push('(0 filas)');
            } else if (tipo === 'SELECT') salida.mensajes.push(`(${res[0].values.length} ${res[0].values.length === 1 ? 'fila' : 'filas'})`);
            else if (tipo === 'BEGIN') salida.mensajes.push('Transacción abierta. Lo que hagas no queda hasta que pongas COMMIT.');
            else if (tipo === 'COMMIT') salida.mensajes.push('COMMIT listo, los cambios quedaron guardados.');
            else if (tipo === 'ROLLBACK') salida.mensajes.push('ROLLBACK listo, todo regresó a como estaba antes del BEGIN TRAN.');
            else if (tipo) salida.mensajes.push('Listo.');
        } catch (e) {
            salida.error = { texto: explicarError(e.message), crudo: e.message, lote: original };
            break;
        }
    }
    return salida;
}

// cuando un select no trae filas igual se quieren ver los encabezados
function columnasVacias(db, sql) {
    try {
        const st = db.prepare(sql);
        const c = st.getColumnNames();
        st.free();
        return c;
    } catch (e) { return []; }
}

export function consultar(db, sql) {
    const r = ejecutar(db, sql);
    if (r.error) throw new Error(r.error.texto);
    return r.resultados[r.resultados.length - 1] || { columnas: [], filas: [] };
}

// foto de una tabla con el rowid para ver que cambio despues
export function foto(db, tabla) {
    try {
        const r = db.exec(`SELECT rowid AS __r, * FROM ${tabla}`);
        if (!r.length) {
            const st = db.prepare(`SELECT * FROM ${tabla}`);
            const cols = st.getColumnNames();
            st.free();
            return { columnas: cols, filas: [], ids: [] };
        }
        return { columnas: r[0].columns.slice(1), filas: r[0].values.map(v => v.slice(1)), ids: r[0].values.map(v => v[0]) };
    } catch (e) {
        return null;
    }
}

export function diferencias(antes, despues) {
    const porId = new Map();
    antes.ids.forEach((id, k) => porId.set(id, antes.filas[k]));
    const filas = [];
    const vistos = new Set();
    despues.ids.forEach((id, k) => {
        const fila = despues.filas[k];
        vistos.add(id);
        if (!porId.has(id)) { filas.push({ estado: 'nueva', fila }); return; }
        const vieja = porId.get(id);
        const cambios = fila.map((v, i) => !iguales(v, vieja[i]));
        filas.push({ estado: cambios.some(Boolean) ? 'cambio' : 'igual', fila, vieja, cambios });
    });
    antes.ids.forEach((id, k) => { if (!vistos.has(id)) filas.push({ estado: 'borrada', fila: antes.filas[k] }); });
    return { columnas: despues.columnas, filas };
}

const iguales = (a, b) => normValor(a) === normValor(b);
function normValor(v) {
    if (v === null || v === undefined) return '\u0000';
    if (typeof v === 'number') return (Math.round(v * 100) / 100).toString();
    const n = Number(v);
    if (String(v).trim() !== '' && !isNaN(n) && /^-?\d+(\.\d+)?$/.test(String(v).trim())) return (Math.round(n * 100) / 100).toString();
    return String(v).trim().toLowerCase();
}

// compara dos resultados como lo haria un profe, sin fijarse en los nombres de columna
export function comparar(esperado, obtenido, ordenImporta) {
    if (!obtenido) return { igual: false, motivo: 'La consulta no devolvió ninguna tabla.' };
    if (obtenido.columnas.length !== esperado.columnas.length) {
        return { igual: false, motivo: `Salieron ${obtenido.columnas.length} columnas y se esperaban ${esperado.columnas.length}.`, columnas: { esperadas: esperado.columnas, tuyas: obtenido.columnas } };
    }
    const llave = f => f.map(normValor).join('\u0002');
    const a = esperado.filas.map(llave);
    const b = obtenido.filas.map(llave);
    if (a.length === b.length && a.join('\u0003') === b.join('\u0003')) return { igual: true };
    const as = [...a].sort().join('\u0003'), bs = [...b].sort().join('\u0003');
    if (as === bs) {
        if (ordenImporta) return { igual: false, motivo: 'Los datos están bien pero el orden no. Revisa el ORDER BY.' };
        return { igual: true };
    }
    // si las columnas vienen en otro orden tambien vale
    const t = f => f.map(normValor).sort().join('\u0002');
    const at = esperado.filas.map(t), bt = obtenido.filas.map(t);
    if ([...at].sort().join('\u0003') === [...bt].sort().join('\u0003')) return { igual: true };

    // lo que falta y lo que sobra, contando repetidos
    const cuenta = new Map();
    at.forEach(k => cuenta.set(k, (cuenta.get(k) || 0) + 1));
    const sobran = [];
    obtenido.filas.forEach((f, i) => {
        const n = cuenta.get(bt[i]) || 0;
        if (n > 0) cuenta.set(bt[i], n - 1);
        else sobran.push(f);
    });
    const faltan = [];
    const usadas = new Map();
    bt.forEach(k => usadas.set(k, (usadas.get(k) || 0) + 1));
    esperado.filas.forEach((f, i) => {
        const n = usadas.get(at[i]) || 0;
        if (n > 0) usadas.set(at[i], n - 1);
        else faltan.push(f);
    });
    const motivo = obtenido.filas.length !== esperado.filas.length
        ? `Salieron ${obtenido.filas.length} filas y se esperaban ${esperado.filas.length}.`
        : 'La cantidad de filas cuadra, pero algunos datos no son los que se pedían.';
    return { igual: false, motivo, faltan: { columnas: esperado.columnas, filas: faltan }, sobran: { columnas: obtenido.columnas, filas: sobran } };
}

// datos del primer JOIN para dibujarlo
export function infoJoin(sql) {
    const p = partes(sql);
    if (!p || !p.from) return null;
    const re = /^\s*([\w\[\]\.]+)(?:\s+(?:AS\s+)?(?!(?:INNER|LEFT|RIGHT|FULL|CROSS|JOIN|ON)\b)(\w+))?\s+(INNER\s+|LEFT\s+(?:OUTER\s+)?|RIGHT\s+(?:OUTER\s+)?|FULL\s+(?:OUTER\s+)?)?JOIN\s+([\w\[\]\.]+)(?:\s+(?:AS\s+)?(?!ON\b)(\w+))?\s+ON\s+([\w\.\[\]]+)\s*=\s*([\w\.\[\]]+)/i;
    const m = re.exec(p.from);
    if (!m) return null;
    const tipo = (m[3] || 'INNER').trim().split(/\s+/)[0].toUpperCase();
    const izq = { tabla: limpiaNombre(m[1]), alias: (m[2] || limpiaNombre(m[1])) };
    const der = { tabla: limpiaNombre(m[4]), alias: (m[5] || limpiaNombre(m[4])) };
    const lado = ref => {
        const [a, c] = ref.replace(/[\[\]]/g, '').split('.');
        if (!c) return null;
        if (a.toLowerCase() === izq.alias.toLowerCase()) return { lado: 'izq', col: c };
        if (a.toLowerCase() === der.alias.toLowerCase()) return { lado: 'der', col: c };
        return null;
    };
    const x = lado(m[6]), y = lado(m[7]);
    if (!x || !y || x.lado === y.lado) return null;
    izq.col = x.lado === 'izq' ? x.col : y.col;
    der.col = x.lado === 'der' ? x.col : y.col;
    const extra = p.from.slice(m[0].length).trim();
    return { tipo, izq, der, masJoins: /\bJOIN\b/i.test(extra) };
}
