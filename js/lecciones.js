// las lecciones, cada ejercicio se revisa corriendo la solucion en una tienda nueva
// tipos escribe, fichas y elige

export const UNIDADES = [
    { id: 'u1', titulo: 'Consultar', lema: 'Buscar en la tienda sin mover nada' },
    { id: 'u2', titulo: 'Modificar', lema: 'Agregar, cambiar y borrar con cuidado' },
    { id: 'u3', titulo: 'Resumir', lema: 'Las cuentas de fin de mes' },
    { id: 'u4', titulo: 'Unir tablas', lema: 'Juntar la libreta con el inventario' },
    { id: 'u5', titulo: 'Más allá', lema: 'Subconsultas y funciones del día a día' }
];

const NOMBRE = { re: '\\bnombre\\b', msg: 'Trae la columna nombre.' };

export const LECCIONES = [
    // unidad 1
    {
        id: 'select', unidad: 'u1', titulo: 'Pedir datos con SELECT',
        idea: `<p><code>SELECT</code> dice <b>qué columnas</b> quieres y <code>FROM</code> dice <b>de qué tabla</b>. Con <code>*</code> te trae todas las columnas.</p>
               <p>Separa las columnas con coma. Con <code>AS</code> le cambias el título a una columna en el resultado.</p>`,
        molde: 'SELECT columna1, columna2\nFROM tabla;',
        ejemplo: 'SELECT nombre, precio\nFROM productos;',
        ejercicios: [
            { tipo: 'elige', enunciado: '¿Qué palabra dice de qué tabla salen los datos?', codigo: 'SELECT nombre\nFROM clientes;', opciones: ['SELECT', 'FROM', 'nombre', 'El punto y coma'], correcta: 1, explica: 'FROM va seguido de la tabla. SELECT va seguido de las columnas.' },
            { tipo: 'fichas', enunciado: 'Arma la consulta que trae el nombre y el teléfono de todos los clientes.', fichas: ['SELECT', 'nombre', ',', 'telefono', 'FROM', 'clientes'], extra: ['WHERE', 'productos'] },
            { tipo: 'escribe', enunciado: 'Trae todas las columnas de la tabla categorias.', solucion: 'SELECT * FROM categorias;', pista: 'El asterisco trae todas las columnas.' },
            { tipo: 'escribe', enunciado: 'Trae solo el nombre y la existencia de cada producto.', solucion: 'SELECT nombre, existencia FROM productos;', pista: 'SELECT nombre, existencia FROM ...' },
            { tipo: 'elige', enunciado: '¿Cuántas filas devuelve esta consulta?', codigo: 'SELECT nombre\nFROM clientes;', opciones: ['1', '5', '7', '0'], correcta: 2, correr: true, explica: 'Sin WHERE trae una fila por cada cliente, y en la tienda hay 7.' },
            { tipo: 'escribe', enunciado: 'Trae el nombre de cada producto con el título Producto y el precio con el título Precio en quetzales.', solucion: 'SELECT nombre AS Producto, precio AS [Precio en quetzales] FROM productos;', columnas: ['Producto', 'Precio en quetzales'], pista: 'Si el título lleva espacios va entre corchetes, AS [Precio en quetzales].' }
        ]
    },
    {
        id: 'where', unidad: 'u1', titulo: 'Filtrar con WHERE',
        idea: `<p><code>WHERE</code> se queda solo con las filas que cumplen la condición. Se compara con <code>=</code>, <code>&lt;&gt;</code> que es distinto, <code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code> y <code>&lt;=</code>.</p>
               <p>Los textos van con <b>comilla simple</b>, <code>'Fiado'</code>. Para pedir dos cosas a la vez usa <code>AND</code>, y para una u otra usa <code>OR</code>.</p>`,
        molde: 'SELECT columnas\nFROM tabla\nWHERE condición;',
        ejemplo: 'SELECT nombre, precio\nFROM productos\nWHERE precio > 15;',
        ejercicios: [
            { tipo: 'escribe', enunciado: 'Trae todo de los productos que cuestan menos de Q5.', solucion: 'SELECT * FROM productos WHERE precio < 5;', pista: 'WHERE precio < 5' },
            { tipo: 'elige', enunciado: 'Completa para traer los clientes de la zona 7.', codigo: 'SELECT nombre\nFROM clientes\n___ zona = 7;', opciones: ['WHERE', 'HAVING', 'ON', 'AND'], correcta: 0, explica: 'WHERE filtra filas. HAVING es para grupos y ON es para los JOIN.' },
            { tipo: 'escribe', enunciado: 'Trae todo de los productos agotados, los que tienen existencia 0.', solucion: 'SELECT * FROM productos WHERE existencia = 0;' },
            { tipo: 'escribe', enunciado: 'Trae todo de las ventas que se dieron al fiado.', solucion: "SELECT * FROM ventas WHERE metodo_pago = 'Fiado';", pista: "El texto va con comilla simple, 'Fiado'." },
            { tipo: 'elige', enunciado: '¿Qué tiene de malo esta consulta?', codigo: 'SELECT *\nFROM clientes\nWHERE nombre = "Ana Sic";', opciones: ["Los textos van con comilla simple, 'Ana Sic'", 'Le falta el ORDER BY', 'El WHERE va antes del FROM', 'nombre va entre corchetes'], correcta: 0, explica: 'En SQL Server las comillas dobles son para nombres de columnas, no para textos.' },
            { tipo: 'escribe', enunciado: 'Trae todo de los productos de la categoría 1 que cuestan más de Q5.', solucion: 'SELECT * FROM productos WHERE categoria_id = 1 AND precio > 5;', pista: 'Dos condiciones que se cumplen a la vez van con AND.' },
            { tipo: 'escribe', enunciado: 'Trae el nombre y la zona de los clientes de la zona 11 o de la zona 18.', solucion: 'SELECT nombre, zona FROM clientes WHERE zona = 11 OR zona = 18;', pista: 'Una u otra va con OR.' }
        ]
    },
    {
        id: 'filtros', unidad: 'u1', titulo: 'LIKE, IN, BETWEEN y NULL',
        idea: `<p><code>LIKE</code> busca parecidos, el <code>%</code> vale por cualquier cosa. <code>IN</code> revisa contra una lista y <code>BETWEEN</code> un rango que <b>incluye</b> las dos puntas.</p>
               <p><code>NULL</code> quiere decir que no hay dato. No se compara con <code>=</code>, se pregunta con <code>IS NULL</code> o <code>IS NOT NULL</code>.</p>`,
        molde: "WHERE nombre LIKE 'Caf%'\nWHERE zona IN (7, 11)\nWHERE precio BETWEEN 5 AND 10\nWHERE telefono IS NULL",
        ejemplo: 'SELECT nombre, telefono\nFROM clientes\nWHERE telefono IS NULL;',
        ejercicios: [
            { tipo: 'escribe', enunciado: "Trae el nombre de los productos que llevan '1 lb' en el nombre.", solucion: "SELECT nombre FROM productos WHERE nombre LIKE '%1 lb%';", pista: "Con % antes y después, LIKE '%1 lb%'." },
            { tipo: 'escribe', enunciado: 'Trae nombre y precio de los productos que cuestan entre Q5 y Q10, incluidos.', solucion: 'SELECT nombre, precio FROM productos WHERE precio BETWEEN 5 AND 10;', exige: [{ re: '\\bBETWEEN\\b', msg: 'Hazlo con BETWEEN.' }] },
            { tipo: 'elige', enunciado: '¿Por qué esta consulta no trae a nadie?', codigo: 'SELECT nombre\nFROM clientes\nWHERE telefono = NULL;', opciones: ['NULL no se compara con =, se usa IS NULL', 'Porque todos tienen teléfono', 'A NULL le faltan comillas', 'telefono es palabra reservada'], correcta: 0, correr: true, explica: 'Comparar con NULL usando = nunca da verdadero. Por eso existe IS NULL.' },
            { tipo: 'escribe', enunciado: 'Trae el nombre de los clientes que no tienen teléfono registrado.', solucion: 'SELECT nombre FROM clientes WHERE telefono IS NULL;' },
            { tipo: 'escribe', enunciado: 'Trae todo de las ventas pagadas con Tarjeta o con Efectivo, usando IN.', solucion: "SELECT * FROM ventas WHERE metodo_pago IN ('Tarjeta', 'Efectivo');", exige: [{ re: '\\bIN\\s*\\(', msg: 'Hazlo con IN y la lista entre paréntesis.' }] },
            { tipo: 'fichas', enunciado: 'Arma la consulta de los productos que no tienen categoría.', fichas: ['SELECT', 'nombre', 'FROM', 'productos', 'WHERE', 'categoria_id', 'IS', 'NULL'], extra: ['=', 'HAVING'] },
            { tipo: 'elige', enunciado: '¿Cuántas filas devuelve?', codigo: "SELECT nombre\nFROM productos\nWHERE nombre LIKE 'C%';", opciones: ['3', '4', '5', '6'], correcta: 2, correr: true, explica: "Café, Champurradas, Crema, Cloro y Chicles. 'C%' quiere decir que empieza con C." }
        ]
    },
    {
        id: 'ordenar', unidad: 'u1', titulo: 'ORDER BY, TOP y DISTINCT',
        idea: `<p><code>ORDER BY</code> ordena de menor a mayor, y con <code>DESC</code> al revés. <code>TOP 5</code> se queda con las primeras 5 filas, casi siempre junto a un ORDER BY.</p>
               <p><code>DISTINCT</code> quita las filas repetidas.</p>`,
        molde: 'SELECT TOP 5 columnas\nFROM tabla\nWHERE condición\nORDER BY columna DESC;',
        ejemplo: 'SELECT TOP 3 nombre, precio\nFROM productos\nORDER BY precio DESC;',
        ejercicios: [
            { tipo: 'escribe', enunciado: 'Trae el nombre de los clientes ordenado de la A a la Z.', solucion: 'SELECT nombre FROM clientes ORDER BY nombre;', orden: true },
            { tipo: 'escribe', enunciado: 'Los 3 productos con más existencia, con nombre y existencia.', solucion: 'SELECT TOP 3 nombre, existencia FROM productos ORDER BY existencia DESC;', orden: true, pista: 'TOP 3 y ORDER BY existencia DESC' },
            { tipo: 'elige', enunciado: '¿Qué hace DESC en un ORDER BY?', opciones: ['Ordena de mayor a menor', 'Quita los repetidos', 'Trae solo la primera fila', 'Ordena por la columna de la descripción'], correcta: 0, explica: 'DESC es descendente. Sin nada, o con ASC, va de menor a mayor.' },
            { tipo: 'escribe', enunciado: '¿En qué zonas viven los clientes? Cada zona una sola vez.', solucion: 'SELECT DISTINCT zona FROM clientes;', exige: [{ re: '\\bDISTINCT\\b', msg: 'Usa DISTINCT para quitar repetidos.' }] },
            { tipo: 'escribe', enunciado: 'Trae todas las columnas del producto más barato, solo uno.', solucion: 'SELECT TOP 1 * FROM productos ORDER BY precio;' },
            { tipo: 'elige', enunciado: '¿Qué tiene de malo?', codigo: 'SELECT nombre\nFROM productos\nORDER BY precio DESC\nWHERE existencia > 0;', opciones: ['El WHERE va antes del ORDER BY', 'DESC va antes de precio', 'Falta el TOP', 'No se puede ordenar por una columna que no está en el SELECT'], correcta: 0, correr: true, explica: 'Las partes van en orden fijo, SELECT, FROM, WHERE, GROUP BY, HAVING y al final ORDER BY.' },
            { tipo: 'fichas', enunciado: 'Arma la consulta de las 5 ventas más recientes.', fichas: ['SELECT', 'TOP 5', '*', 'FROM', 'ventas', 'ORDER BY', 'fecha', 'DESC'], extra: ['ASC', 'WHERE'], orden: true }
        ]
    },

    // unidad 2
    {
        id: 'insert', unidad: 'u2', titulo: 'Agregar con INSERT',
        idea: `<p><code>INSERT INTO</code> agrega filas nuevas. Pon siempre la <b>lista de columnas</b> y luego los valores en el mismo orden.</p>
               <p>El <code>id</code> es <code>IDENTITY</code>, así que SQL Server lo pone solo. Para meter varias filas separa cada paréntesis con coma.</p>`,
        molde: 'INSERT INTO tabla (columna1, columna2)\nVALUES (valor1, valor2);',
        ejemplo: "INSERT INTO categorias (nombre)\nVALUES ('Golosinas');\n\nSELECT * FROM categorias;",
        ejercicios: [
            { tipo: 'escribe', enunciado: "Agrega la categoría 'Verduras'.", solucion: "INSERT INTO categorias (nombre) VALUES ('Verduras');", revisa: 'SELECT nombre FROM categorias ORDER BY id', pista: "INSERT INTO categorias (nombre) VALUES (...)" },
            { tipo: 'escribe', enunciado: 'Carmen Tuch se registró hoy. Vive en zona 5 y su teléfono es 5123-4567. Agrégala y usa GETDATE() para la fecha.', solucion: "INSERT INTO clientes (nombre, telefono, zona, fecha_registro) VALUES ('Carmen Tuch', '5123-4567', 5, GETDATE());", revisa: 'SELECT nombre, telefono, zona, CONVERT(DATE, fecha_registro) FROM clientes ORDER BY id', pista: 'Son cuatro columnas, nombre, telefono, zona y fecha_registro.' },
            { tipo: 'elige', enunciado: '¿Por qué este INSERT no lleva el id?', codigo: "INSERT INTO categorias (nombre)\nVALUES ('Mascotas');", opciones: ['Porque es IDENTITY y SQL Server lo pone solo', 'Porque el id siempre es 0', 'Porque se le olvidó y va a dar error', 'Porque categorias no tiene id'], correcta: 0, correr: true, explica: 'Una columna IDENTITY se numera sola. Si la mandas da error, a menos que actives IDENTITY_INSERT.' },
            { tipo: 'fichas', enunciado: 'Arma el INSERT de las tortillas por docena, panadería, a Q5 con 30 en existencia.', fichas: ['INSERT INTO', 'productos', '(nombre, categoria_id, precio, existencia)', 'VALUES', "('Tortillas docena', 3, 5.00, 30)"], extra: ['SET', 'WHERE'], revisa: 'SELECT nombre, categoria_id, precio, existencia FROM productos ORDER BY id' },
            { tipo: 'escribe', enunciado: "Agrega dos categorías de un solo golpe, 'Mascotas' y 'Papelería'.", solucion: "INSERT INTO categorias (nombre) VALUES ('Mascotas'), ('Papelería');", revisa: 'SELECT nombre FROM categorias ORDER BY id', pista: "VALUES ('Mascotas'), ('Papelería')" },
            { tipo: 'elige', enunciado: '¿Por qué falla este INSERT?', codigo: "INSERT INTO clientes (nombre, zona)\nVALUES ('Luis Coj', 7);", opciones: ['fecha_registro no acepta vacíos y no se mandó', 'Falta el id', 'La zona va entre comillas', 'Luis ya existe'], correcta: 0, correr: true, explica: 'fecha_registro es NOT NULL. Toda columna NOT NULL sin valor por defecto tiene que ir en el INSERT.' }
        ]
    },
    {
        id: 'update', unidad: 'u2', titulo: 'Cambiar con UPDATE',
        idea: `<p><code>UPDATE</code> cambia filas que ya existen. <code>SET</code> dice qué columna y a qué valor, y <code>WHERE</code> dice <b>cuáles filas</b>.</p>
               <p>Sin WHERE se cambian <b>todas</b>. La costumbre que salva el día es correr primero un <code>SELECT</code> con el mismo WHERE para ver qué vas a tocar.</p>`,
        molde: 'UPDATE tabla\nSET columna = nuevo_valor\nWHERE condición;',
        ejemplo: 'UPDATE productos\nSET precio = 10.00\nWHERE id = 1;\n\nSELECT * FROM productos WHERE id = 1;',
        ejercicios: [
            { tipo: 'escribe', enunciado: 'Subió el café. Ponle precio Q40 al producto 7.', solucion: 'UPDATE productos SET precio = 40 WHERE id = 7;', revisa: 'SELECT id, precio FROM productos ORDER BY id' },
            { tipo: 'escribe', enunciado: 'Llegaron 24 de maíz amarillo, el id 3. Súmale 24 a lo que ya hay de existencia.', solucion: 'UPDATE productos SET existencia = existencia + 24 WHERE id = 3;', revisa: 'SELECT id, existencia FROM productos ORDER BY id', pista: 'SET existencia = existencia + 24' },
            { tipo: 'elige', enunciado: '¿Qué pasa si corres esto?', codigo: 'UPDATE productos\nSET precio = 0;', opciones: ['Todos los productos quedan en Q0', 'Solo el primero queda en Q0', 'Da error por no tener WHERE', 'No pasa nada hasta poner COMMIT'], correcta: 0, correr: true, explica: 'Sin WHERE el UPDATE toca todas las filas. SQL Server no te pregunta nada.' },
            { tipo: 'escribe', enunciado: 'Beto Chávez, el cliente 2, ya dio su teléfono, 5544-0011.', solucion: "UPDATE clientes SET telefono = '5544-0011' WHERE id = 2;", revisa: 'SELECT id, telefono FROM clientes ORDER BY id' },
            { tipo: 'escribe', enunciado: 'Todo lo de Limpieza, la categoría 5, sube 10%.', solucion: 'UPDATE productos SET precio = precio * 1.10 WHERE categoria_id = 5;', revisa: 'SELECT id, precio FROM productos ORDER BY id', pista: 'Subir 10% es multiplicar por 1.10.' },
            { tipo: 'fichas', enunciado: 'Toño García, el cliente 6, se mudó a la zona 10.', fichas: ['UPDATE', 'clientes', 'SET', 'zona = 10', 'WHERE', 'id = 6'], extra: ['FROM', 'VALUES'], revisa: 'SELECT id, zona FROM clientes ORDER BY id' },
            { tipo: 'escribe', enunciado: 'El queso fresco, id 11, ahora vale Q30 y quedan 10. Cambia las dos columnas en un solo UPDATE.', solucion: 'UPDATE productos SET precio = 30, existencia = 10 WHERE id = 11;', revisa: 'SELECT id, precio, existencia FROM productos ORDER BY id', pista: 'Las columnas del SET van separadas por coma.' }
        ]
    },
    {
        id: 'delete', unidad: 'u2', titulo: 'Borrar con DELETE',
        idea: `<p><code>DELETE FROM</code> borra filas. Igual que el UPDATE, <b>sin WHERE borra todo</b>.</p>
               <p>Si otra tabla depende de esa fila por una llave foránea, SQL Server no te deja borrarla y te da el error 547. A veces es mejor marcar como inactivo que borrar.</p>`,
        molde: 'DELETE FROM tabla\nWHERE condición;',
        ejemplo: 'DELETE FROM categorias\nWHERE id = 6;\n\nSELECT * FROM categorias;',
        ejercicios: [
            { tipo: 'escribe', enunciado: 'Borra la categoría Ferretería, el id 6. No tiene productos.', solucion: 'DELETE FROM categorias WHERE id = 6;', revisa: 'SELECT * FROM categorias ORDER BY id' },
            { tipo: 'elige', enunciado: '¿Qué pasa con esto?', codigo: 'DELETE FROM categorias\nWHERE id = 1;', opciones: ['Da error porque hay productos de esa categoría', 'Borra la categoría y sus productos', 'Borra la categoría y los productos quedan sin categoría', 'No pasa nada'], correcta: 0, correr: true, explica: 'Los productos apuntan a la categoría 1 con una llave foránea. SQL Server protege esa relación.' },
            { tipo: 'escribe', enunciado: 'Borra el maíz, id 3, y la crema, id 12, en un solo DELETE. Están agotados y nunca se vendieron.', solucion: 'DELETE FROM productos WHERE id IN (3, 12);', revisa: 'SELECT id FROM productos ORDER BY id', pista: 'WHERE id IN (3, 12)' },
            { tipo: 'fichas', enunciado: 'Ana Sic, la cliente 7, pidió que la borren. No tiene compras.', fichas: ['DELETE', 'FROM', 'clientes', 'WHERE', 'id = 7'], extra: ['*', 'SET'], revisa: 'SELECT id FROM clientes ORDER BY id' },
            { tipo: 'elige', enunciado: '¿Cuál es la costumbre segura antes de un DELETE?', opciones: ['Correr un SELECT con el mismo WHERE para ver qué se va a borrar', 'Correrlo dos veces para asegurarse', 'Quitar el WHERE para que no falle', 'Borrar primero la tabla completa'], correcta: 0, explica: 'Si el SELECT trae justo lo que quieres borrar, cambias SELECT * por DELETE y listo.' },
            { tipo: 'escribe', enunciado: 'De la venta 6 borra solo el renglón de los chicles, el producto 15.', solucion: 'DELETE FROM detalle_venta WHERE venta_id = 6 AND producto_id = 15;', revisa: 'SELECT venta_id, producto_id FROM detalle_venta ORDER BY venta_id, producto_id', pista: 'Necesitas las dos condiciones con AND.' }
        ]
    },
    {
        id: 'transacciones', unidad: 'u2', titulo: 'La red de seguridad, BEGIN TRAN',
        idea: `<p><code>BEGIN TRAN</code> abre una transacción. Lo que hagas después <b>no queda</b> hasta que pongas <code>COMMIT</code>. Si algo salió mal, <code>ROLLBACK</code> regresa todo a como estaba.</p>
               <p>La forma segura de tocar datos importantes es abrir, cambiar, revisar con un SELECT y recién ahí decidir.</p>`,
        molde: 'BEGIN TRAN;\n\nUPDATE ...;\nSELECT ...;   -- revisas\n\nROLLBACK;    -- o COMMIT si todo bien',
        ejemplo: 'BEGIN TRAN;\nUPDATE productos SET precio = 0;\nSELECT nombre, precio FROM productos;\nROLLBACK;\n\nSELECT nombre, precio FROM productos;',
        ejercicios: [
            { tipo: 'elige', enunciado: '¿Qué zona sale al final?', codigo: 'BEGIN TRAN;\nUPDATE clientes SET zona = 1;\nROLLBACK;\n\nSELECT zona FROM clientes WHERE id = 1;', opciones: ['7, la de antes', '1', 'NULL', 'Da error'], correcta: 0, correr: true, explica: 'El ROLLBACK deshizo el UPDATE, Rosa sigue en la zona 7.' },
            { tipo: 'escribe', enunciado: 'Dentro de una transacción súbele Q1 a todas las bebidas, la categoría 2, y confírmala con COMMIT.', solucion: 'BEGIN TRAN;\nUPDATE productos SET precio = precio + 1 WHERE categoria_id = 2;\nCOMMIT;', revisa: 'SELECT id, precio FROM productos ORDER BY id', exige: [{ re: '\\bBEGIN\\s+TRAN', msg: 'Empieza con BEGIN TRAN.' }, { re: '\\bCOMMIT\\b', msg: 'Termina con COMMIT.' }] },
            { tipo: 'escribe', enunciado: 'Abre una transacción, borra todo el detalle_venta, revisa con un SELECT que quedó vacío y deshazlo con ROLLBACK.', solucion: 'BEGIN TRAN;\nDELETE FROM detalle_venta;\nSELECT * FROM detalle_venta;\nROLLBACK;', revisa: 'SELECT COUNT(*) FROM detalle_venta', exige: [{ re: '\\bBEGIN\\s+TRAN', msg: 'Empieza con BEGIN TRAN.' }, { re: '\\bDELETE\\b', msg: 'Falta el DELETE.' }, { re: '\\bROLLBACK\\b', msg: 'Termina con ROLLBACK.' }] },
            { tipo: 'elige', enunciado: 'Abriste BEGIN TRAN, hiciste un UPDATE y se cerró la conexión sin COMMIT. ¿Qué pasa?', opciones: ['Se deshace, la transacción nunca se confirmó', 'Se guarda solo', 'Se guarda la mitad', 'La tabla queda bloqueada para siempre'], correcta: 0, explica: 'Sin COMMIT, SQL Server hace ROLLBACK cuando se cierra la conexión.' },
            { tipo: 'fichas', enunciado: 'Prueba poner el agua pura, id 5, en existencia 0, pero sin que quede.', fichas: ['BEGIN TRAN;', 'UPDATE productos', 'SET existencia = 0', 'WHERE id = 5;', 'ROLLBACK;'], extra: ['COMMIT;'], revisa: 'SELECT id, existencia FROM productos ORDER BY id', exige: [{ re: '\\bROLLBACK\\b', msg: 'Para que no quede tiene que terminar con ROLLBACK.' }] }
        ]
    },

    // unidad 3
    {
        id: 'agregados', unidad: 'u3', titulo: 'Contar y sumar',
        idea: `<p><code>COUNT(*)</code> cuenta filas, <code>SUM</code> suma, <code>AVG</code> saca promedio, <code>MIN</code> y <code>MAX</code> el menor y el mayor. Sin GROUP BY devuelven <b>una sola fila</b>.</p>
               <p><code>COUNT(columna)</code> no cuenta los NULL, <code>COUNT(*)</code> sí.</p>`,
        molde: 'SELECT COUNT(*) AS total,\n       SUM(columna) AS suma\nFROM tabla\nWHERE condición;',
        ejemplo: 'SELECT COUNT(*) AS productos,\n       AVG(precio) AS promedio\nFROM productos;',
        ejercicios: [
            { tipo: 'escribe', enunciado: '¿Cuántos clientes hay?', solucion: 'SELECT COUNT(*) FROM clientes;' },
            { tipo: 'escribe', enunciado: '¿Cuántas unidades hay en total en la bodega? Suma la existencia.', solucion: 'SELECT SUM(existencia) FROM productos;' },
            { tipo: 'elige', enunciado: '¿Qué número sale?', codigo: 'SELECT COUNT(telefono)\nFROM clientes;', opciones: ['7', '5', '2', '0'], correcta: 1, correr: true, explica: 'Dos clientes no tienen teléfono. COUNT de una columna se salta los NULL.' },
            { tipo: 'escribe', enunciado: 'El precio más caro y el más barato, en una sola fila.', solucion: 'SELECT MAX(precio), MIN(precio) FROM productos;' },
            { tipo: 'escribe', enunciado: '¿Cuánto se vendió en total? Suma cantidad por precio_unitario de detalle_venta.', solucion: 'SELECT SUM(cantidad * precio_unitario) FROM detalle_venta;', pista: 'SUM(cantidad * precio_unitario)' },
            { tipo: 'elige', enunciado: '¿Por qué SQL Server rechaza esto?', codigo: 'SELECT nombre, COUNT(*)\nFROM productos;', opciones: ['nombre no está en un GROUP BY ni dentro de una función', 'COUNT necesita una columna', 'Falta el WHERE', 'productos está vacía'], correcta: 0, correr: true, explica: 'COUNT junta todo en una fila y SQL Server no sabe cuál nombre poner. Es el error 8120.' }
        ]
    },
    {
        id: 'agrupar', unidad: 'u3', titulo: 'GROUP BY y HAVING',
        idea: `<p><code>GROUP BY</code> junta las filas que tienen el mismo valor y saca una cuenta por cada grupo. Todo lo que pongas en el SELECT tiene que ir en el GROUP BY o dentro de una función.</p>
               <p><code>WHERE</code> filtra <b>filas</b> antes de agrupar. <code>HAVING</code> filtra <b>grupos</b> después de contar.</p>`,
        molde: 'SELECT columna, COUNT(*) AS cuantos\nFROM tabla\nWHERE condición_de_filas\nGROUP BY columna\nHAVING condición_de_grupos;',
        ejemplo: 'SELECT zona, COUNT(*) AS clientes\nFROM clientes\nGROUP BY zona;',
        ejercicios: [
            { tipo: 'escribe', enunciado: '¿Cuántos productos hay por categoría? Trae categoria_id y la cuenta.', solucion: 'SELECT categoria_id, COUNT(*) FROM productos GROUP BY categoria_id;' },
            { tipo: 'escribe', enunciado: '¿Cuántas ventas hubo por método de pago? Trae el método y la cuenta.', solucion: 'SELECT metodo_pago, COUNT(*) FROM ventas GROUP BY metodo_pago;' },
            { tipo: 'elige', enunciado: 'Completa para quedarte solo con las zonas que tienen más de 2 clientes.', codigo: 'SELECT zona, COUNT(*)\nFROM clientes\nGROUP BY zona\n___ COUNT(*) > 2;', opciones: ['HAVING', 'WHERE', 'AND', 'ON'], correcta: 0, correr: false, explica: 'La condición usa COUNT, que solo existe después de agrupar. Por eso va en HAVING.' },
            { tipo: 'escribe', enunciado: 'Las categorías con más de 2 productos, con categoria_id y la cuenta.', solucion: 'SELECT categoria_id, COUNT(*) FROM productos GROUP BY categoria_id HAVING COUNT(*) > 2;' },
            { tipo: 'escribe', enunciado: 'El total de cada venta, venta_id y la suma de cantidad por precio_unitario.', solucion: 'SELECT venta_id, SUM(cantidad * precio_unitario) FROM detalle_venta GROUP BY venta_id;' },
            { tipo: 'elige', enunciado: '¿Cuál se ejecuta primero?', opciones: ['WHERE, filtra filas antes de agrupar', 'HAVING, filtra antes de contar', 'Los dos al mismo tiempo', 'Depende del orden en que los escribas'], correcta: 0, explica: 'SQL Server hace FROM, WHERE, GROUP BY, HAVING, SELECT y ORDER BY, en ese orden. Pruébalo con el botón del orden.' },
            { tipo: 'escribe', enunciado: 'Por cliente, cuántas compras hizo sin fiado. Solo los que tengan 2 o más. Trae cliente_id y la cuenta.', solucion: "SELECT cliente_id, COUNT(*) FROM ventas WHERE metodo_pago <> 'Fiado' GROUP BY cliente_id HAVING COUNT(*) >= 2;", pista: 'WHERE para quitar el fiado, GROUP BY cliente_id y HAVING para los de 2 o más.' }
        ]
    },

    // unidad 4
    {
        id: 'inner', unidad: 'u4', titulo: 'INNER JOIN',
        idea: `<p>Un <code>JOIN</code> junta dos tablas. El <code>ON</code> dice qué columna de una se empareja con cuál de la otra, casi siempre la llave foránea con el id.</p>
               <p><code>INNER JOIN</code> solo deja las filas que <b>tienen pareja en las dos</b>. Usa alias cortos, <code>productos p</code>, para no escribir tanto.</p>`,
        molde: 'SELECT a.columna, b.columna\nFROM tabla_a a\nINNER JOIN tabla_b b ON b.id = a.b_id;',
        ejemplo: 'SELECT p.nombre, c.nombre AS categoria\nFROM productos p\nINNER JOIN categorias c ON c.id = p.categoria_id;',
        verJoin: true,
        ejercicios: [
            { tipo: 'elige', enunciado: '¿Qué hace el ON en un JOIN?', opciones: ['Dice qué columna de una tabla se empareja con cuál de la otra', 'Activa el JOIN', 'Filtra las filas del resultado final', 'Ordena el resultado'], correcta: 0, explica: 'ON productos.categoria_id = categorias.id quiere decir que cada producto va con la categoría que tiene ese id.' },
            { tipo: 'escribe', enunciado: 'Cada venta con el nombre del cliente. Trae id de la venta, fecha y nombre del cliente.', solucion: 'SELECT v.id, v.fecha, c.nombre FROM ventas v INNER JOIN clientes c ON c.id = v.cliente_id;', exige: [{ re: '\\bJOIN\\b', msg: 'Une ventas con clientes usando JOIN.' }], pista: 'FROM ventas v INNER JOIN clientes c ON c.id = v.cliente_id' },
            { tipo: 'elige', enunciado: '¿Cuántas filas devuelve?', codigo: 'SELECT p.nombre, c.nombre\nFROM productos p\nINNER JOIN categorias c ON c.id = p.categoria_id;', opciones: ['16', '14', '6', '20'], correcta: 1, correr: true, verJoin: true, explica: 'Hay 16 productos pero 2 no tienen categoría. INNER JOIN los deja fuera.' },
            { tipo: 'fichas', enunciado: 'Arma la consulta de lo que llevó la venta 4, nombre del producto y cantidad.', fichas: ['SELECT', 'p.nombre, d.cantidad', 'FROM', 'detalle_venta d', 'INNER JOIN', 'productos p', 'ON p.id = d.producto_id', 'WHERE', 'd.venta_id = 4'], extra: ['LEFT JOIN', 'GROUP BY'] },
            { tipo: 'escribe', enunciado: "El nombre de los productos de Lácteos. Une con categorias y filtra por el nombre de la categoría, 'Lácteos'.", solucion: "SELECT p.nombre FROM productos p INNER JOIN categorias c ON c.id = p.categoria_id WHERE c.nombre = 'Lácteos';", exige: [{ re: '\\bJOIN\\b', msg: 'Une productos con categorias usando JOIN.' }] },
            { tipo: 'elige', enunciado: '¿Por qué falla?', codigo: 'SELECT nombre\nFROM productos p\nINNER JOIN categorias c ON c.id = p.categoria_id;', opciones: ['nombre está en las dos tablas y no se sabe de cuál', 'Falta el WHERE', 'El alias no se puede usar en el ON', 'INNER JOIN no existe'], correcta: 0, correr: true, explica: 'Cuando una columna está en las dos tablas hay que decir de cuál, p.nombre o c.nombre.' },
            { tipo: 'escribe', enunciado: 'El nombre de cada producto que ha comprado el cliente 1. Une ventas, detalle_venta y productos, y filtra con cliente_id = 1.', solucion: 'SELECT p.nombre FROM ventas v INNER JOIN detalle_venta d ON d.venta_id = v.id INNER JOIN productos p ON p.id = d.producto_id WHERE v.cliente_id = 1;', pista: 'Son dos JOIN seguidos, ventas con detalle_venta y detalle_venta con productos.' }
        ]
    },
    {
        id: 'left', unidad: 'u4', titulo: 'LEFT JOIN, los que no tienen pareja',
        idea: `<p><code>LEFT JOIN</code> deja <b>todas</b> las filas de la tabla de la izquierda, la del FROM. Si no encuentran pareja, las columnas de la derecha salen en <code>NULL</code>.</p>
               <p>El truco más útil es LEFT JOIN más <code>WHERE derecha.id IS NULL</code>, que te da justo <b>los que no tienen</b>, como clientes que nunca compraron.</p>`,
        molde: 'SELECT a.columna\nFROM tabla_a a\nLEFT JOIN tabla_b b ON b.a_id = a.id\nWHERE b.a_id IS NULL;   -- los que no tienen',
        ejemplo: 'SELECT c.nombre, v.id AS venta\nFROM clientes c\nLEFT JOIN ventas v ON v.cliente_id = c.id;',
        verJoin: true,
        ejercicios: [
            { tipo: 'elige', enunciado: '¿Cuántas filas devuelve?', codigo: 'SELECT c.nombre, v.id\nFROM clientes c\nLEFT JOIN ventas v ON v.cliente_id = c.id;', opciones: ['7', '9', '10', '11'], correcta: 3, correr: true, verJoin: true, explica: 'Las 9 ventas que tienen cliente, más Toño y Ana que salen una vez con NULL.' },
            { tipo: 'escribe', enunciado: 'El nombre de los clientes que nunca han comprado.', solucion: 'SELECT c.nombre FROM clientes c LEFT JOIN ventas v ON v.cliente_id = c.id WHERE v.id IS NULL;', exige: [{ re: '\\bLEFT\\s+(OUTER\\s+)?JOIN\\b', msg: 'Hazlo con LEFT JOIN.' }], pista: 'LEFT JOIN ventas y WHERE v.id IS NULL' },
            { tipo: 'escribe', enunciado: 'El nombre de los productos que nunca se han vendido.', solucion: 'SELECT p.nombre FROM productos p LEFT JOIN detalle_venta d ON d.producto_id = p.id WHERE d.producto_id IS NULL;', exige: [{ re: '\\bLEFT\\s+(OUTER\\s+)?JOIN\\b', msg: 'Hazlo con LEFT JOIN.' }] },
            { tipo: 'escribe', enunciado: 'Todos los productos con el nombre de su categoría, aunque no tengan. Trae nombre del producto y nombre de la categoría.', solucion: 'SELECT p.nombre, c.nombre FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id;', exige: [{ re: '\\bLEFT\\s+(OUTER\\s+)?JOIN\\b', msg: 'Con INNER se pierden los que no tienen categoría.' }] },
            { tipo: 'elige', enunciado: '¿Cuál es la diferencia entre INNER y LEFT JOIN?', opciones: ['LEFT deja también las filas de la izquierda que no tienen pareja', 'LEFT es más rápido', 'INNER deja todo de la izquierda', 'Son iguales'], correcta: 0, explica: 'INNER solo parejas completas. LEFT todas las de la izquierda, con o sin pareja.' },
            { tipo: 'fichas', enunciado: 'Arma la consulta de las categorías que no tienen productos.', fichas: ['SELECT', 'c.nombre', 'FROM', 'categorias c', 'LEFT JOIN', 'productos p', 'ON p.categoria_id = c.id', 'WHERE', 'p.id IS NULL'], extra: ['INNER JOIN', '= NULL'] },
            { tipo: 'escribe', enunciado: "Todos los productos con su categoría, y si no tienen que diga 'Sin categoría'. Usa ISNULL.", solucion: "SELECT p.nombre, ISNULL(c.nombre, 'Sin categoría') FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id;", exige: [{ re: '\\bISNULL\\s*\\(', msg: 'Usa ISNULL para cambiar el NULL por el texto.' }] }
        ]
    },
    {
        id: 'right', unidad: 'u4', titulo: 'RIGHT y FULL JOIN',
        idea: `<p><code>RIGHT JOIN</code> es el espejo del LEFT, deja todo lo de la tabla de la <b>derecha</b>. Casi siempre se puede escribir como LEFT volteando las tablas.</p>
               <p><code>FULL JOIN</code> deja todo de <b>los dos lados</b>, con pareja o sin ella.</p>`,
        molde: 'FROM a\nRIGHT JOIN b ON ...   -- todo lo de b\n\nFROM a\nFULL JOIN b ON ...    -- todo de los dos',
        ejemplo: 'SELECT v.id AS venta, c.nombre\nFROM clientes c\nRIGHT JOIN ventas v ON v.cliente_id = c.id;',
        verJoin: true,
        ejercicios: [
            { tipo: 'escribe', enunciado: 'Todas las ventas con el nombre del cliente, aunque sea alguien de paso. Pon clientes en el FROM y usa RIGHT JOIN. Trae id de la venta y nombre.', solucion: 'SELECT v.id, c.nombre FROM clientes c RIGHT JOIN ventas v ON v.cliente_id = c.id;', exige: [{ re: '\\bRIGHT\\s+(OUTER\\s+)?JOIN\\b', msg: 'Hazlo con RIGHT JOIN.' }] },
            { tipo: 'elige', enunciado: '¿A cuál LEFT JOIN es igual este RIGHT JOIN?', codigo: 'FROM clientes c\nRIGHT JOIN ventas v ON v.cliente_id = c.id', opciones: ['FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id', 'FROM clientes c LEFT JOIN ventas v ON v.cliente_id = c.id', 'FROM ventas v INNER JOIN clientes c ON v.cliente_id = c.id', 'A ninguno'], correcta: 0, explica: 'Volteas las tablas y el RIGHT se vuelve LEFT. Por eso casi todos usan solo LEFT.' },
            { tipo: 'escribe', enunciado: 'En una sola consulta, los productos sin categoría y las categorías sin productos. Trae nombre del producto y nombre de la categoría.', solucion: 'SELECT p.nombre, c.nombre FROM productos p FULL JOIN categorias c ON c.id = p.categoria_id WHERE p.id IS NULL OR c.id IS NULL;', exige: [{ re: '\\bFULL\\s+(OUTER\\s+)?JOIN\\b', msg: 'Hazlo con FULL JOIN.' }], pista: 'FULL JOIN y WHERE p.id IS NULL OR c.id IS NULL' },
            { tipo: 'elige', enunciado: '¿Cuántas filas devuelve?', codigo: 'SELECT p.nombre, c.nombre\nFROM productos p\nFULL JOIN categorias c ON c.id = p.categoria_id;', opciones: ['16', '17', '14', '20'], correcta: 1, correr: true, verJoin: true, explica: '14 parejas, 2 productos sin categoría y 1 categoría sin productos.' }
        ]
    },

    // unidad 5
    {
        id: 'subconsultas', unidad: 'u5', titulo: 'Consultas dentro de consultas',
        idea: `<p>Una subconsulta es un <code>SELECT</code> entre paréntesis dentro de otro. Puede devolver <b>un solo valor</b>, para comparar con <code>=</code> o <code>&gt;</code>, o <b>una lista</b>, para usar con <code>IN</code>.</p>`,
        molde: 'SELECT columnas\nFROM tabla\nWHERE columna > (SELECT AVG(columna) FROM tabla);',
        ejemplo: 'SELECT nombre, precio\nFROM productos\nWHERE precio > (SELECT AVG(precio) FROM productos);',
        ejercicios: [
            { tipo: 'escribe', enunciado: 'El nombre de los productos con existencia menor al promedio de existencia.', solucion: 'SELECT nombre FROM productos WHERE existencia < (SELECT AVG(existencia) FROM productos);', exige: [{ re: '\\(\\s*SELECT\\b', msg: 'Saca el promedio con una subconsulta.' }] },
            { tipo: 'escribe', enunciado: 'El nombre de los clientes que han comprado al fiado alguna vez. Usa IN con una subconsulta a ventas.', solucion: "SELECT nombre FROM clientes WHERE id IN (SELECT cliente_id FROM ventas WHERE metodo_pago = 'Fiado');", exige: [{ re: '\\bIN\\s*\\(\\s*SELECT\\b', msg: 'Usa IN (SELECT ...).' }] },
            { tipo: 'elige', enunciado: '¿Qué devuelve esta subconsulta?', codigo: '(SELECT MAX(precio) FROM productos)', opciones: ['Un solo valor, 38', 'La lista de precios', 'El producto más caro completo', 'Nada, falta el WHERE'], correcta: 0, explica: 'MAX sin GROUP BY da una sola fila con un solo valor.' },
            { tipo: 'escribe', enunciado: 'El nombre del producto más caro, sin usar TOP. Compara el precio con el MAX de una subconsulta.', solucion: 'SELECT nombre FROM productos WHERE precio = (SELECT MAX(precio) FROM productos);', noExige: [{ re: '\\bTOP\\b', msg: 'Esta vez sin TOP.' }] },
            { tipo: 'escribe', enunciado: 'El nombre de los productos que nunca se han vendido, ahora con NOT IN.', solucion: 'SELECT nombre FROM productos WHERE id NOT IN (SELECT producto_id FROM detalle_venta);', exige: [{ re: '\\bNOT\\s+IN\\b', msg: 'Usa NOT IN.' }] }
        ]
    },
    {
        id: 'funciones', unidad: 'u5', titulo: 'Funciones de texto y fecha',
        idea: `<p>Las que más se usan en el trabajo son <code>GETDATE()</code> para la fecha de hoy, <code>DATEDIFF(day, desde, hasta)</code>, <code>DATEADD</code>, <code>YEAR</code>, <code>MONTH</code> y <code>DAY</code>.</p>
               <p>Para textos <code>UPPER</code>, <code>LEN</code>, <code>LEFT</code> y <code>+</code> para unir. <code>CONVERT(VARCHAR(10), fecha, 103)</code> deja la fecha como dd/mm/aaaa.</p>`,
        molde: 'SELECT UPPER(nombre),\n       CONVERT(VARCHAR(10), fecha, 103),\n       DATEDIFF(day, fecha, GETDATE())\nFROM tabla;',
        ejemplo: "SELECT id,\n       CONVERT(VARCHAR(10), fecha, 103) AS fecha,\n       DATEDIFF(day, fecha, '2026-10-31') AS dias\nFROM ventas;",
        ejercicios: [
            { tipo: 'escribe', enunciado: 'El nombre de los clientes en mayúsculas.', solucion: 'SELECT UPPER(nombre) FROM clientes;' },
            { tipo: 'escribe', enunciado: 'El id de cada venta y su fecha como dd/mm/aaaa, con CONVERT estilo 103.', solucion: 'SELECT id, CONVERT(VARCHAR(10), fecha, 103) FROM ventas;', exige: [{ re: '\\bCONVERT\\s*\\(', msg: 'Usa CONVERT con el estilo 103.' }] },
            { tipo: 'escribe', enunciado: 'Todo de las ventas hechas del día 15 en adelante. Usa DAY(fecha).', solucion: 'SELECT * FROM ventas WHERE DAY(fecha) >= 15;' },
            { tipo: 'escribe', enunciado: "Una etiqueta por cliente que diga el nombre, un guion y la zona, así, Rosa Méndez - Zona 7.", solucion: "SELECT nombre + ' - Zona ' + CONVERT(VARCHAR, zona) FROM clientes;", pista: "nombre + ' - Zona ' + CONVERT(VARCHAR, zona). El número hay que volverlo texto antes de unirlo." },
            { tipo: 'elige', enunciado: '¿Qué número sale?', codigo: "SELECT DATEDIFF(day, '2026-10-01', '2026-10-31');", opciones: ['30', '31', '29', '1'], correcta: 0, correr: true, explica: 'DATEDIFF cuenta los cambios de día entre las dos fechas, del 1 al 31 son 30.' },
            { tipo: 'escribe', enunciado: 'Nombre y cuántos días pasaron desde que cada cliente se registró hasta el 31 de octubre de 2026.', solucion: "SELECT nombre, DATEDIFF(day, fecha_registro, '2026-10-31') FROM clientes;", exige: [{ re: '\\bDATEDIFF\\s*\\(', msg: 'Usa DATEDIFF.' }] }
        ]
    }
];

// cada ejercicio lleva un id fijo para el repaso
LECCIONES.forEach(l => l.ejercicios.forEach((e, i) => { e.id = l.id + '.' + (i + 1); e.leccion = l.id; }));

export const PRUEBAME = [
    { titulo: 'Lo más caro', sql: 'SELECT TOP 5 nombre, precio\nFROM productos\nORDER BY precio DESC;' },
    { titulo: 'Clientes sin compras', sql: 'SELECT c.nombre\nFROM clientes c\nLEFT JOIN ventas v ON v.cliente_id = c.id\nWHERE v.id IS NULL;' },
    { titulo: 'Ventas por método', sql: 'SELECT metodo_pago, COUNT(*) AS ventas\nFROM ventas\nGROUP BY metodo_pago\nORDER BY ventas DESC;' },
    { titulo: 'Lo que se vendió por categoría', sql: 'SELECT c.nombre AS categoria,\n       SUM(d.cantidad * d.precio_unitario) AS vendido\nFROM detalle_venta d\nINNER JOIN productos p ON p.id = d.producto_id\nINNER JOIN categorias c ON c.id = p.categoria_id\nGROUP BY c.nombre\nHAVING SUM(d.cantidad * d.precio_unitario) > 20\nORDER BY vendido DESC;' },
    { titulo: 'Subir precios sin miedo', sql: 'BEGIN TRAN;\n\nUPDATE productos\nSET precio = precio * 1.05\nWHERE categoria_id = 1;\n\nSELECT nombre, precio FROM productos WHERE categoria_id = 1;\n\nROLLBACK;' }
];
