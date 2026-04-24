const ClienteModel = require('../models/ClienteModel');
const PrestamoModel = require('../models/PrestamoModel');
const EmpenoModel = require('../models/EmpenoModel');
const AhorroModel = require('../models/AhorroModel');
const ConfigModel = require('../models/ConfigModel');

const clientesController = {

    // 1. Listar
    listar: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 5;
            const offset = (page - 1) * limit;
            const busqueda = req.query.q || '';

            let clientes;
            let totalRegistros;

            if (busqueda) {
                clientes = await ClienteModel.buscarPaginados(busqueda, limit, offset);
                totalRegistros = await ClienteModel.contarBusqueda(busqueda);
            } else {
                clientes = await ClienteModel.obtenerPaginados(limit, offset);
                totalRegistros = await ClienteModel.contarTotal();
            }

            const totalPages = Math.ceil(totalRegistros / limit);

            res.render('clientes/index', { 
                title: 'Gestión de Clientes',
                clientes: clientes,
                busqueda: busqueda,
                currentPage: page,
                totalPages: totalPages,
                totalRegistros: totalRegistros
            });

        } catch (error) {
            console.error(error);
            req.flash('mensajeError', 'Error al obtener los clientes');
            res.redirect('/');
        }
    },

    // 2. Formulario Crear (ESTE ERA EL QUE DABA ERROR POR LA VISTA)
    mostrarFormulario: (req, res) => {
        res.render('clientes/crear', { 
            title: 'Nuevo Cliente'
            // Nota: No pasamos 'busqueda' aquí porque no debe haber buscador en la creación
        });
    },

    // 3. Guardar Cliente
    guardar: async (req, res) => {
        const { dni, nombre, apellido, telefono, direccion, email } = req.body;
        // Capturar foto si existe
        const foto = req.file ? req.file.filename : null;

        if (!dni || !nombre || !apellido) {
            req.flash('mensajeError', 'DNI, Nombre y Apellido son obligatorios');
            return res.redirect('/clientes/crear');
        }

        try {
            const existe = await ClienteModel.buscarPorDNI(dni);
            if (existe) {
                req.flash('mensajeError', 'El cliente con ese DNI ya existe');
                return res.redirect('/clientes/crear');
            }

            await ClienteModel.crear({ dni, nombre, apellido, telefono, direccion, email, foto });
            req.flash('mensajeExito', 'Cliente registrado correctamente');
            res.redirect('/clientes');

        } catch (error) {
            console.error(error);
            req.flash('mensajeError', 'Error al guardar el cliente');
            res.redirect('/clientes/crear');
        }
    },

    // 4. Ver Perfil
    verPerfil: async (req, res) => {
        const { id } = req.params;
        try {
            const [cliente, prestamos, empenos, cuentaAhorro, config] = await Promise.all([
                ClienteModel.obtenerPorId(id),
                PrestamoModel.obtenerPorCliente(id),
                EmpenoModel.obtenerPorCliente(id),
                AhorroModel.buscarPorCliente(id),
                ConfigModel.obtener()
            ]);

            if (!cliente) {
                req.flash('mensajeError', 'Cliente no encontrado');
                return res.redirect('/clientes');
            }

            const empresaConfig = config || { moneda: '$' };

            res.render('clientes/perfil', {
                title: `Perfil de ${cliente.nombre}`,
                cliente,
                prestamos,
                empenos,
                cuentaAhorro,
                empresa: empresaConfig
            });

        } catch (error) {
            console.error(error);
            req.flash('mensajeError', 'Error al cargar perfil');
            res.redirect('/clientes');
        }
    },

    // 5. Mostrar Edición
    mostrarEdicion: async (req, res) => {
        const { id } = req.params;
        try {
            const cliente = await ClienteModel.obtenerPorId(id);
            if (!cliente) {
                req.flash('mensajeError', 'Cliente no encontrado');
                return res.redirect('/clientes');
            }
            res.render('clientes/editar', {
                title: 'Editar Cliente',
                cliente
            });
        } catch (error) {
            console.error(error);
            res.redirect('/clientes');
        }
    },

    // 6. Procesar Edición
    actualizar: async (req, res) => {
        const { id } = req.params;
        const { dni, nombre, apellido, telefono, direccion, email } = req.body;
        const foto = req.file ? req.file.filename : null;

        try {
            await ClienteModel.actualizar(id, { dni, nombre, apellido, telefono, direccion, email, foto });
            req.flash('mensajeExito', 'Datos del cliente actualizados');
            res.redirect('/clientes');
        } catch (error) {
            console.error(error);
            req.flash('mensajeError', 'Error al actualizar');
            res.redirect(`/clientes/editar/${id}`);
        }
    }
};

module.exports = clientesController;