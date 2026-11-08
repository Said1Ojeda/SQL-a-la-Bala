// la chuleta, moldes listos para copiar
const venn = (izq, centro, der, sinCentro) => `<svg viewBox="0 0 150 90" aria-hidden="true">
    <circle cx="55" cy="45" r="36" fill="${izq ? 'var(--rotulo)' : 'none'}" stroke="var(--tinta-2)" stroke-width="2.5"/>
    <circle cx="95" cy="45" r="36" fill="${der ? 'var(--rotulo)' : 'none'}" stroke="var(--tinta-2)" stroke-width="2.5"/>
    <path d="M75 15a36 36 0 0 1 0 60a36 36 0 0 1 0-60z" fill="${centro ? 'var(--rotulo)' : (sinCentro ? 'var(--papel)' : 'none')}" stroke="var(--tinta-2)" stroke-width="2.5"/>
</svg>`;

export const CHULETA = [
    {
        titulo: 'El orden de las partes',
        texto: `<p>Se <b>escriben</b> SELECT, FROM, WHERE, GROUP BY, HAVING y ORDER BY.</p><p>SQL Server las <b>ejecuta</b> FROM, WHERE, GROUP BY, HAVING, SELECT y ORDER BY. Por eso un alias del SELECT sirve en el ORDER BY pero no en el WHERE.</p>`,
        sql: 'SELECT TOP 10 columna, COUNT(*) AS n   -- 5\nFROM tabla t                         -- 1\nINNER JOIN otra o ON o.id = t.otra_id\nWHERE condición                      -- 2\nGROUP BY columna                     -- 3\nHAVING COUNT(*) > 1                  -- 4\nORDER BY n DESC;                     -- 6',
        probar: "SELECT TOP 3 metodo_pago, COUNT(*) AS n\nFROM ventas\nWHERE cliente_id IS NOT NULL\nGROUP BY metodo_pago\nHAVING COUNT(*) >= 1\nORDER BY n DESC;"
    },
    {
        titulo: 'INSERT',
        texto: '<p>Siempre con la lista de columnas. El id IDENTITY no se manda.</p>',
        sql: "-- una fila\nINSERT INTO clientes (nombre, telefono, zona, fecha_registro)\nVALUES ('Pedro Xol', NULL, 1, GETDATE());\n\n-- varias de un golpe\nINSERT INTO categorias (nombre)\nVALUES ('Mascotas'), ('Papelería');\n\n-- desde otra consulta\nINSERT INTO tabla_destino (col1, col2)\nSELECT col1, col2 FROM tabla_origen WHERE ...;\n\n-- el id que se acaba de crear\nSELECT SCOPE_IDENTITY();",
        probar: "INSERT INTO categorias (nombre)\nVALUES ('Mascotas'), ('Papelería');\n\nSELECT * FROM categorias;"
    },
    {
        titulo: 'UPDATE',
        texto: '<p>Primero el SELECT con el mismo WHERE. Si trae lo que quieres tocar, cambias el SELECT por el UPDATE.</p>',
        sql: "-- 1. revisar\nSELECT * FROM productos WHERE categoria_id = 5;\n\n-- 2. cambiar\nUPDATE productos\nSET precio = precio * 1.10,\n    existencia = existencia + 5\nWHERE categoria_id = 5;\n\n-- con JOIN, así se escribe en SQL Server\nUPDATE p\nSET p.precio = p.precio * 1.05\nFROM productos p\nINNER JOIN categorias c ON c.id = p.categoria_id\nWHERE c.nombre = 'Bebidas';",
        probar: 'SELECT * FROM productos WHERE categoria_id = 5;\n\nUPDATE productos\nSET precio = precio * 1.10\nWHERE categoria_id = 5;'
    },
    {
        titulo: 'DELETE',
        texto: '<p>Sin WHERE se va todo. Si da el error 547 es porque otra tabla depende de esa fila.</p>',
        sql: "-- 1. revisar\nSELECT * FROM clientes WHERE id = 7;\n\n-- 2. borrar\nDELETE FROM clientes\nWHERE id = 7;\n\n-- muchas veces es mejor desactivar\nUPDATE usuarios SET activo = 0 WHERE id = 7;",
        probar: 'SELECT * FROM clientes WHERE id = 7;\n\nDELETE FROM clientes\nWHERE id = 7;'
    },
    {
        titulo: 'La transacción segura',
        texto: '<p>Para tocar datos de producción. @@ROWCOUNT dice cuántas filas cambió la última instrucción.</p>',
        sql: "BEGIN TRAN;\n\nUPDATE productos\nSET precio = precio * 1.05\nWHERE categoria_id = 1;\n\nSELECT @@ROWCOUNT AS filas_cambiadas;\nSELECT * FROM productos WHERE categoria_id = 1;\n\n-- si todo cuadra\nCOMMIT;\n-- si no\n-- ROLLBACK;",
        probar: "BEGIN TRAN;\n\nUPDATE productos\nSET precio = precio * 1.05\nWHERE categoria_id = 1;\n\nSELECT @@ROWCOUNT AS filas_cambiadas;\n\nROLLBACK;"
    },
    {
        titulo: 'Los JOIN en un vistazo',
        ancha: true,
        texto: '<p>Lo amarillo es lo que sale. La tabla de la izquierda es la del FROM.</p>',
        html: `<div class="venn">
            <figure>${venn(false, true, false)}<figcaption>INNER JOIN</figcaption></figure>
            <figure>${venn(true, true, false)}<figcaption>LEFT JOIN</figcaption></figure>
            <figure>${venn(false, true, true)}<figcaption>RIGHT JOIN</figcaption></figure>
            <figure>${venn(true, true, true)}<figcaption>FULL JOIN</figcaption></figure>
            <figure>${venn(true, false, false, true)}<figcaption>LEFT con IS NULL</figcaption></figure>
        </div>`,
        sql: "-- solo los que tienen pareja\nSELECT p.nombre, c.nombre\nFROM productos p\nINNER JOIN categorias c ON c.id = p.categoria_id;\n\n-- todos los de la izquierda, con o sin pareja\nSELECT c.nombre, v.id\nFROM clientes c\nLEFT JOIN ventas v ON v.cliente_id = c.id;\n\n-- los que NO tienen pareja\nSELECT c.nombre\nFROM clientes c\nLEFT JOIN ventas v ON v.cliente_id = c.id\nWHERE v.id IS NULL;",
        probar: 'SELECT c.nombre, v.id AS venta\nFROM clientes c\nLEFT JOIN ventas v ON v.cliente_id = c.id;'
    },
    {
        titulo: 'GROUP BY y HAVING',
        texto: '<p>Lo que no está dentro de COUNT, SUM, AVG, MIN o MAX tiene que ir en el GROUP BY. WHERE filtra filas, HAVING filtra grupos.</p>',
        sql: "SELECT metodo_pago,\n       COUNT(*) AS ventas\nFROM ventas\nWHERE fecha >= '2026-10-01'\nGROUP BY metodo_pago\nHAVING COUNT(*) >= 2\nORDER BY ventas DESC;",
        probar: "SELECT metodo_pago,\n       COUNT(*) AS ventas\nFROM ventas\nWHERE fecha >= '2026-10-01'\nGROUP BY metodo_pago\nHAVING COUNT(*) >= 2\nORDER BY ventas DESC;"
    },
    {
        titulo: 'Funciones del día a día',
        sql: "GETDATE()                           -- fecha y hora de hoy\nDATEDIFF(day, desde, hasta)         -- días entre dos fechas\nDATEADD(month, 1, fecha)            -- sumar un mes\nYEAR(fecha), MONTH(fecha), DAY(fecha)\nCONVERT(VARCHAR(10), fecha, 103)    -- dd/mm/aaaa\nISNULL(columna, 'Sin dato')         -- cambiar NULL por algo\nUPPER(texto), LEN(texto), LEFT(texto, 3)\nnombre + ' - ' + CONVERT(VARCHAR, zona)  -- unir textos",
        probar: "SELECT nombre,\n       UPPER(nombre) AS mayusculas,\n       ISNULL(telefono, 'Sin teléfono') AS telefono,\n       CONVERT(VARCHAR(10), fecha_registro, 103) AS registro,\n       DATEDIFF(day, fecha_registro, GETDATE()) AS dias\nFROM clientes;"
    },
    {
        titulo: 'Errores que más salen',
        ancha: true,
        html: `<div class="marco-tabla"><table class="datos errores-tabla"><thead><tr><th>Error</th><th>Qué quiere decir</th><th>Qué hacer</th></tr></thead><tbody>
            <tr><td>102</td><td>Error de sintaxis</td><td>Revisa comas, comillas simples y el orden de las partes</td></tr>
            <tr><td>207</td><td>Columna que no existe</td><td>Revisa el nombre o el alias de adelante</td></tr>
            <tr><td>208</td><td>Tabla que no existe</td><td>Revisa el nombre y en qué base estás</td></tr>
            <tr><td>209</td><td>Columna ambigua</td><td>Está en las dos tablas del JOIN, ponle el alias, p.nombre</td></tr>
            <tr><td>515</td><td>No acepta NULL</td><td>Esa columna es NOT NULL, mándale un valor</td></tr>
            <tr><td>547</td><td>Choque con llave foránea</td><td>Otra tabla depende de esa fila, o el valor no existe en la otra tabla</td></tr>
            <tr><td>2627</td><td>Llave repetida</td><td>Ese valor ya existe en una llave primaria o única</td></tr>
            <tr><td>8120</td><td>Columna fuera del GROUP BY</td><td>Métela al GROUP BY o dentro de COUNT, SUM, AVG, MIN o MAX</td></tr>
            <tr><td>8134</td><td>División entre cero</td><td>Usa NULLIF(divisor, 0) para evitarla</td></tr>
        </tbody></table></div>`
    }
];
