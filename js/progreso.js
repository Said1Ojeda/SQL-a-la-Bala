// el progreso vive en el navegador, si no deja guardar se juega igual pero se pierde al cerrar
const CLAVE = 'bala.progreso';
// dias para volver a ver un ejercicio segun la caja en que va
const ESPERA = [0, 1, 3, 7, 14, 30];

let p = cargar();

function cargar() {
    try {
        const t = localStorage.getItem(CLAVE);
        if (t) return Object.assign(nuevo(), JSON.parse(t));
    } catch (e) { }
    return nuevo();
}
function nuevo() {
    return { xp: 0, racha: { dias: 0, ultimo: null }, lecciones: {}, repaso: {} };
}
function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch (e) { }
}

export function hoy() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function sumarDias(fecha, n) {
    const [a, m, d] = fecha.split('-').map(Number);
    const x = new Date(a, m - 1, d + n);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

export const estado = () => p;

export function rachaActual() {
    // si ayer no practico la racha ya se cayo aunque no se haya guardado
    const r = p.racha;
    if (!r.ultimo) return 0;
    if (r.ultimo === hoy() || r.ultimo === sumarDias(hoy(), -1)) return r.dias;
    return 0;
}

function marcarDia() {
    const h = hoy();
    if (p.racha.ultimo === h) return;
    p.racha.dias = p.racha.ultimo === sumarDias(h, -1) ? p.racha.dias + 1 : 1;
    p.racha.ultimo = h;
}

export function sumarXp(n) {
    p.xp += n;
    marcarDia();
    guardar();
}

export function terminarLeccion(id, estrellas) {
    const antes = p.lecciones[id] || {};
    p.lecciones[id] = { hecha: true, estrellas: Math.max(estrellas, antes.estrellas || 0), fecha: hoy() };
    marcarDia();
    guardar();
}

export function leccionHecha(id) {
    return p.lecciones[id] || null;
}

// repaso tipo cajas, el que fallas vuelve pronto, el que dominas se aleja
export function anotarRepaso(ejId, acerto) {
    const r = p.repaso[ejId];
    if (!acerto) {
        p.repaso[ejId] = { caja: 1, toca: sumarDias(hoy(), ESPERA[1]) };
    } else if (r) {
        const caja = Math.min(r.caja + 1, ESPERA.length - 1);
        if (caja >= ESPERA.length - 1) delete p.repaso[ejId];
        else p.repaso[ejId] = { caja, toca: sumarDias(hoy(), ESPERA[caja]) };
    }
    guardar();
}

export function pendientes() {
    const h = hoy();
    return Object.entries(p.repaso).filter(([, r]) => r.toca <= h).map(([id]) => id);
}

export function enRepaso() {
    return Object.keys(p.repaso).length;
}

export function borrarTodo() {
    p = nuevo();
    guardar();
}
