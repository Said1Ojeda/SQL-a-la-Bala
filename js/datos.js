// la tienda de don Chepe, escrita como se escribiria en SQL Server
// el motor la traduce igual que lo que escribe el usuario

export const ESQUEMA = `
CREATE TABLE categorias (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(50) NOT NULL
);

CREATE TABLE productos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(80) NOT NULL,
    categoria_id INT NULL REFERENCES categorias(id),
    precio DECIMAL(10,2) NOT NULL,
    existencia INT NOT NULL DEFAULT 0
);

CREATE TABLE clientes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(80) NOT NULL,
    telefono NVARCHAR(9) NULL,
    zona INT NOT NULL,
    fecha_registro DATE NOT NULL
);

CREATE TABLE ventas (
    id INT IDENTITY(1,1) PRIMARY KEY,
    cliente_id INT NULL REFERENCES clientes(id),
    fecha DATE NOT NULL,
    metodo_pago NVARCHAR(20) NOT NULL
);

CREATE TABLE detalle_venta (
    venta_id INT NOT NULL REFERENCES ventas(id),
    producto_id INT NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (venta_id, producto_id)
);
`;

export const DATOS = `
INSERT INTO categorias (id, nombre) VALUES
(1, 'Granos básicos'), (2, 'Bebidas'), (3, 'Panadería'),
(4, 'Lácteos'), (5, 'Limpieza'), (6, 'Ferretería');

INSERT INTO productos (id, nombre, categoria_id, precio, existencia) VALUES
(1, 'Frijol negro 1 lb', 1, 9.50, 40),
(2, 'Arroz 1 lb', 1, 6.00, 35),
(3, 'Maíz amarillo 1 lb', 1, 3.50, 0),
(4, 'Azúcar 1 lb', 1, 5.00, 50),
(5, 'Agua pura 600 ml', 2, 4.00, 60),
(6, 'Gaseosa 1.5 L', 2, 15.00, 24),
(7, 'Café molido 1 lb', 2, 38.00, 12),
(8, 'Pan francés bolsa', 3, 10.00, 15),
(9, 'Champurradas', 3, 8.00, 20),
(10, 'Leche entera 1 L', 4, 14.50, 18),
(11, 'Queso fresco 1 lb', 4, 32.00, 6),
(12, 'Crema 250 ml', 4, 12.00, 0),
(13, 'Jabón de lavar', 5, 7.50, 30),
(14, 'Cloro 1 L', 5, 11.00, 9),
(15, 'Chicles', NULL, 1.00, 100),
(16, 'Velas paquete', NULL, 6.50, 14);

INSERT INTO clientes (id, nombre, telefono, zona, fecha_registro) VALUES
(1, 'Rosa Méndez', '5512-3344', 7, '2025-01-15'),
(2, 'Beto Chávez', NULL, 7, '2025-02-03'),
(3, 'Marta López', '4433-2211', 11, '2025-03-20'),
(4, 'Chema Ruiz', '3021-8899', 7, '2025-06-11'),
(5, 'Lucía Pérez', NULL, 18, '2025-09-01'),
(6, 'Toño García', '5590-1122', 11, '2026-01-10'),
(7, 'Ana Sic', '4012-7788', 18, '2026-03-05');

INSERT INTO ventas (id, cliente_id, fecha, metodo_pago) VALUES
(1, 1, '2026-10-01', 'Efectivo'),
(2, 2, '2026-10-01', 'Fiado'),
(3, 1, '2026-10-03', 'Tarjeta'),
(4, 3, '2026-10-05', 'Efectivo'),
(5, 4, '2026-10-08', 'Fiado'),
(6, NULL, '2026-10-09', 'Efectivo'),
(7, 5, '2026-10-12', 'Efectivo'),
(8, 2, '2026-10-15', 'Fiado'),
(9, 1, '2026-10-20', 'Efectivo'),
(10, 3, '2026-10-28', 'Tarjeta');

INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario) VALUES
(1, 1, 2, 9.50), (1, 8, 1, 10.00),
(2, 6, 1, 15.00), (2, 9, 2, 8.00),
(3, 7, 1, 38.00), (3, 10, 2, 14.50),
(4, 2, 3, 6.00), (4, 4, 2, 5.00), (4, 5, 4, 4.00),
(5, 11, 1, 32.00),
(6, 15, 5, 1.00), (6, 5, 1, 4.00),
(7, 13, 2, 7.50), (7, 14, 1, 11.00),
(8, 1, 1, 9.50), (8, 6, 2, 15.00),
(9, 8, 2, 10.00), (9, 10, 1, 14.50),
(10, 7, 1, 38.00), (10, 9, 3, 8.00);
`;

// lo que se ve en el panel de la tienda, con los tipos como en SQL Server
export const TABLAS = [
    {
        nombre: 'categorias', que: 'Los pasillos de la tienda',
        columnas: [['id', 'INT', 'llave'], ['nombre', 'NVARCHAR(50)']]
    },
    {
        nombre: 'productos', que: 'Lo que se vende',
        columnas: [['id', 'INT', 'llave'], ['nombre', 'NVARCHAR(80)'], ['categoria_id', 'INT', 'foranea', 'categorias'], ['precio', 'DECIMAL(10,2)'], ['existencia', 'INT']]
    },
    {
        nombre: 'clientes', que: 'Los de siempre',
        columnas: [['id', 'INT', 'llave'], ['nombre', 'NVARCHAR(80)'], ['telefono', 'NVARCHAR(9)'], ['zona', 'INT'], ['fecha_registro', 'DATE']]
    },
    {
        nombre: 'ventas', que: 'Cada vez que alguien compra',
        columnas: [['id', 'INT', 'llave'], ['cliente_id', 'INT', 'foranea', 'clientes'], ['fecha', 'DATE'], ['metodo_pago', 'NVARCHAR(20)']]
    },
    {
        nombre: 'detalle_venta', que: 'Qué llevó en cada venta',
        columnas: [['venta_id', 'INT', 'foranea', 'ventas'], ['producto_id', 'INT', 'foranea', 'productos'], ['cantidad', 'INT'], ['precio_unitario', 'DECIMAL(10,2)']]
    }
];
