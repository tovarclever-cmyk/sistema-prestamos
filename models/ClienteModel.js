const db = require('../config/db');

class ClienteModel {
    
    // 1. Obtener paginados
    static async obtenerPaginados(limit, offset) {
        try {
            const query = 'SELECT * FROM clientes ORDER BY created_at DESC LIMIT ? OFFSET ?';
            const [rows] = await db.query(query, [limit, offset]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // 2. Contar total
    static async contarTotal() {
        try {
            const [rows] = await db.query('SELECT COUNT(*) as total FROM clientes');
            return rows[0].total;
        } catch (error) {
            throw error;
        }
    }

    // 3. Crear cliente (AHORA CON FOTO)
    static async crear(datos) {
        try {
            const { dni, nombre, apellido, telefono, direccion, email, foto } = datos;
            const query = `
                INSERT INTO clientes (dni, nombre, apellido, telefono, direccion, email, foto) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const [result] = await db.query(query, [dni, nombre, apellido, telefono, direccion, email, foto]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // 4. Buscar por DNI
    static async buscarPorDNI(dni) {
        try {
            const [rows] = await db.query('SELECT * FROM clientes WHERE dni = ?', [dni]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // 5. Obtener Todos
    static async obtenerTodos() {
        try {
            const [rows] = await db.query('SELECT * FROM clientes ORDER BY nombre ASC');
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // 6. Buscador Paginado
    static async buscarPaginados(criterio, limit, offset) {
        try {
            const busqueda = `%${criterio}%`;
            const query = `
                SELECT * FROM clientes 
                WHERE nombre LIKE ? OR apellido LIKE ? OR dni LIKE ? 
                ORDER BY nombre ASC 
                LIMIT ? OFFSET ?
            `;
            const [rows] = await db.query(query, [busqueda, busqueda, busqueda, limit, offset]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // 7. Contar búsqueda
    static async contarBusqueda(criterio) {
        try {
            const busqueda = `%${criterio}%`;
            const query = `
                SELECT COUNT(*) as total FROM clientes 
                WHERE nombre LIKE ? OR apellido LIKE ? OR dni LIKE ?
            `;
            const [rows] = await db.query(query, [busqueda, busqueda, busqueda]);
            return rows[0].total;
        } catch (error) {
            throw error;
        }
    }

    // 8. Obtener por ID
    static async obtenerPorId(id) {
        try {
            const [rows] = await db.query('SELECT * FROM clientes WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // 9. (NUEVO) Actualizar Cliente
    static async actualizar(id, datos) {
        try {
            const { dni, nombre, apellido, telefono, direccion, email, foto } = datos;
            
            // Si subieron foto nueva, actualizamos todo. Si no, dejamos la foto anterior.
            let query, params;
            
            if (foto) {
                query = `UPDATE clientes SET dni=?, nombre=?, apellido=?, telefono=?, direccion=?, email=?, foto=? WHERE id=?`;
                params = [dni, nombre, apellido, telefono, direccion, email, foto, id];
            } else {
                query = `UPDATE clientes SET dni=?, nombre=?, apellido=?, telefono=?, direccion=?, email=? WHERE id=?`;
                params = [dni, nombre, apellido, telefono, direccion, email, id];
            }

            const [result] = await db.query(query, params);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ClienteModel;