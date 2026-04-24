const PagoModel = require('../models/PagoModel');
const PrestamoModel = require('../models/PrestamoModel');
const ConfigModel = require('../models/ConfigModel'); // <--- Importante
const emailService = require('../utils/emailService');

const pagosController = {

    // 1. Mostrar formulario de cobro (MODIFICADO PARA MONEDA)
    mostrarFormulario: async (req, res) => {
        const { id_prestamo } = req.params;
        try {
            // Buscamos datos del préstamo, configuración y pagos previos
            const [prestamo, config] = await Promise.all([
                PrestamoModel.obtenerPorId(id_prestamo),
                ConfigModel.obtener() // <--- Obtenemos la moneda
            ]);
            
            if (!prestamo) {
                req.flash('mensajeError', 'El préstamo no existe');
                return res.redirect('/prestamos');
            }

            const totalPagado = parseFloat(await PagoModel.obtenerTotalPagado(id_prestamo));
            const totalDeuda = parseFloat(prestamo.monto_total);
            const saldoPendiente = totalDeuda - totalPagado;

            const historial = await PagoModel.obtenerHistorial(id_prestamo);

            // Preparamos objeto empresa (si falla config, usa $)
            const empresaConfig = config || { moneda: '$' };

            res.render('pagos/registrar', {
                title: 'Registrar Pago',
                prestamo: prestamo,
                saldoPendiente: saldoPendiente,
                historial: historial,
                empresa: empresaConfig // <--- Enviamos a la vista
            });

        } catch (error) {
            console.error(error);
            req.flash('mensajeError', 'Error al cargar el préstamo');
            res.redirect('/prestamos');
        }
    },

    // 2. Guardar el pago (Ya tenía la moneda para el email, lo mantenemos)
    guardar: async (req, res) => {
        const { prestamo_id, monto_pagado, observaciones } = req.body;

        try {
            if (!monto_pagado || monto_pagado <= 0) {
                req.flash('mensajeError', 'El monto debe ser mayor a 0');
                return res.redirect(`/pagos/registrar/${prestamo_id}`);
            }

            const prestamo = await PrestamoModel.obtenerPorId(prestamo_id);
            const totalPagado = parseFloat(await PagoModel.obtenerTotalPagado(prestamo_id));
            const saldoPendiente = parseFloat(prestamo.monto_total) - totalPagado;

            if (parseFloat(monto_pagado) > saldoPendiente) {
                req.flash('mensajeError', `El monto excede la deuda. Solo debe: ${saldoPendiente.toFixed(2)}`);
                return res.redirect(`/pagos/registrar/${prestamo_id}`);
            }

            await PagoModel.crear({
                prestamo_id,
                monto_pagado,
                observaciones
            });

            // Verificar si liquidó
            const nuevoTotalPagado = totalPagado + parseFloat(monto_pagado);
            if (nuevoTotalPagado >= (parseFloat(prestamo.monto_total) - 0.01)) {
                await PrestamoModel.actualizarEstado(prestamo_id, 'pagado');
            }

            // Enviar Correo
            if (prestamo.email) {
                let config = await ConfigModel.obtener();
                const simboloMoneda = config ? config.moneda : '$';

                const nuevoSaldo = saldoPendiente - parseFloat(monto_pagado);
                
                const htmlCorreo = emailService.plantillaPago(
                    `${prestamo.nombre} ${prestamo.apellido}`,
                    monto_pagado,
                    new Date(),
                    nuevoSaldo,
                    simboloMoneda
                );
                emailService.enviarCorreo(prestamo.email, 'Pago Recibido - Comprobante Digital', htmlCorreo);
            }

            req.flash('mensajeExito', 'Pago registrado y recibo enviado por correo');
            res.redirect('/prestamos');

        } catch (error) {
            console.error(error);
            req.flash('mensajeError', 'Error al registrar el pago');
            res.redirect('/prestamos');
        }
    }
};

module.exports = pagosController;