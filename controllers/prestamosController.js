const PrestamoModel = require('../models/PrestamoModel');
const ClienteModel = require('../models/ClienteModel');
const ConfigModel = require('../models/ConfigModel'); // <--- IMPORTANTE
const emailService = require('../utils/emailService');
const finance = require('../utils/finance');

const prestamosController = {

    // 1. Listar préstamos
    listar: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 5;
            const offset = (page - 1) * limit;
            const busqueda = req.query.q || '';

            let prestamos;
            let totalRegistros;

            if (busqueda) {
                prestamos = await PrestamoModel.buscarPaginados(busqueda, limit, offset);
                totalRegistros = await PrestamoModel.contarBusqueda(busqueda);
            } else {
                prestamos = await PrestamoModel.obtenerPaginados(limit, offset);
                totalRegistros = await PrestamoModel.contarTotal();
            }

            const totalPages = Math.ceil(totalRegistros / limit);

            // Obtener moneda para la lista también
            const config = await ConfigModel.obtener();
            const empresaConfig = config || { moneda: '$' };

            res.render('prestamos/index', { 
                title: 'Gestión de Préstamos',
                prestamos: prestamos,
                busqueda: busqueda,
                currentPage: page,
                totalPages: totalPages,
                totalRegistros: totalRegistros,
                empresa: empresaConfig
            });

        } catch (error) {
            console.error(error);
            req.flash('mensajeError', 'Error al cargar los préstamos');
            res.redirect('/');
        }
    },

    // 2. Formulario de nuevo préstamo (CORREGIDO AQUÍ)
    mostrarFormulario: async (req, res) => {
        try {
            // Obtenemos clientes y configuración en paralelo
            const [clientes, config] = await Promise.all([
                ClienteModel.obtenerTodos(),
                ConfigModel.obtener()
            ]);

            // Si no hay config, usamos default
            const empresaConfig = config || { moneda: '$' };

            res.render('prestamos/crear', { 
                title: 'Nuevo Préstamo',
                clientes: clientes,
                empresa: empresaConfig // <--- Enviamos la config a la vista
            });
        } catch (error) {
            console.error(error);
            req.flash('mensajeError', 'Error al cargar el formulario');
            res.redirect('/prestamos');
        }
    },

    // 3. Guardar préstamo
    guardar: async (req, res) => {
        try {
            const { cliente_id, monto, interes, cuotas, frecuencia, fecha_inicio } = req.body;

            if (!cliente_id || !monto || !cuotas || !fecha_inicio) {
                req.flash('mensajeError', 'Por favor complete los campos obligatorios');
                return res.redirect('/prestamos/crear');
            }

            const montoPrestado = parseFloat(monto);
            const tasa = parseFloat(interes);
            const numCuotas = parseInt(cuotas);
            
            const montoInteres = montoPrestado * (tasa / 100);
            const montoTotal = montoPrestado + montoInteres;

            let fechaFin = new Date(fecha_inicio);
            if (frecuencia === 'diario') fechaFin.setDate(fechaFin.getDate() + numCuotas);
            else if (frecuencia === 'semanal') fechaFin.setDate(fechaFin.getDate() + (numCuotas * 7));
            else if (frecuencia === 'mensual') fechaFin.setMonth(fechaFin.getMonth() + numCuotas);

            const fechaFinStr = fechaFin.toISOString().split('T')[0];

            await PrestamoModel.crear({
                cliente_id,
                monto_prestado: montoPrestado,
                tasa_interes: tasa,
                monto_total: montoTotal,
                cuotas: numCuotas,
                frecuencia,
                fecha_inicio,
                fecha_fin: fechaFinStr
            });

            // ENVÍO DE CORREO
            const cliente = await ClienteModel.obtenerPorId(cliente_id);
            if (cliente && cliente.email) {
                let config = await ConfigModel.obtener();
                const simboloMoneda = config ? config.moneda : '$';

                const htmlCorreo = emailService.plantillaPrestamo(
                    `${cliente.nombre} ${cliente.apellido}`,
                    montoPrestado,
                    cuotas,
                    montoTotal,
                    simboloMoneda
                );
                emailService.enviarCorreo(cliente.email, '¡Préstamo Aprobado! - Financiera', htmlCorreo);
            }

            req.flash('mensajeExito', 'Préstamo registrado correctamente');
            res.redirect('/prestamos');

        } catch (error) {
            console.error(error);
            req.flash('mensajeError', 'Error al crear el préstamo');
            res.redirect('/prestamos/crear');
        }
    },

    // 4. Ver Vencidos
    verVencidos: async (req, res) => {
        try {
            const vencidos = await PrestamoModel.obtenerVencidos();
            const config = await ConfigModel.obtener();
            res.render('prestamos/vencidos', { 
                title: 'Reporte de Morosidad',
                vencidos: vencidos,
                empresa: config || { moneda: '$' }
            });
        } catch (error) {
            console.error(error);
            req.flash('mensajeError', 'Error al cargar vencimientos');
            res.redirect('/prestamos');
        }
    },

    // 5. Ver Cronograma
    verCronograma: async (req, res) => {
        const { id } = req.params;
        try {
            const prestamo = await PrestamoModel.obtenerPorId(id);
            if(!prestamo) {
                req.flash('mensajeError', 'Préstamo no encontrado');
                return res.redirect('/prestamos');
            }

            const cronograma = finance.calcularCronograma(
                parseFloat(prestamo.monto_total), 
                prestamo.cuotas, 
                prestamo.frecuencia, 
                prestamo.fecha_inicio
            );

            const config = await ConfigModel.obtener();

            res.render('prestamos/cronograma', {
                title: 'Cronograma de Pagos',
                prestamo,
                cronograma,
                empresa: config || { moneda: '$' }
            });

        } catch (error) {
            console.error(error);
            res.redirect('/prestamos');
        }
    }
};

module.exports = prestamosController;