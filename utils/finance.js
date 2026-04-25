const finance = {
    
    // Función para sumar días o meses a una fecha
    // En modo 'diario', salta los domingos (solo cuenta lunes a sábado)
    sumarFecha: (fecha, frecuencia) => {
        const nuevaFecha = new Date(fecha);
        if (frecuencia === 'diario') {
            // Avanzar 1 día
            nuevaFecha.setDate(nuevaFecha.getDate() + 1);
            // Si cae en domingo (0), saltar al lunes
            if (nuevaFecha.getDay() === 0) {
                nuevaFecha.setDate(nuevaFecha.getDate() + 1);
            }
        } else if (frecuencia === 'semanal') {
            nuevaFecha.setDate(nuevaFecha.getDate() + 7);
        } else if (frecuencia === 'quincenal') {
            nuevaFecha.setDate(nuevaFecha.getDate() + 15);
        } else if (frecuencia === 'mensual') {
            nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
        }
        return nuevaFecha;
    },

    // Calcular fecha fin para préstamos diarios (solo lunes a sábado)
    // Avanza N cuotas contando solo días hábiles (lun-sáb), sin domingos
    calcularFechaFinDiario: (fechaInicio, numCuotas) => {
        let fecha = new Date(fechaInicio);
        let diasContados = 0;
        while (diasContados < numCuotas) {
            fecha.setDate(fecha.getDate() + 1);
            // Solo contar si NO es domingo (0 = domingo)
            if (fecha.getDay() !== 0) {
                diasContados++;
            }
        }
        return fecha;
    },

    // Generar el array de cuotas
    calcularCronograma: (montoTotal, cuotas, frecuencia, fechaInicio) => {
        const listaCuotas = [];
        const montoCuota = montoTotal / cuotas;
        
        // La primera cuota suele ser un periodo DESPUÉS de la fecha de inicio
        let fechaActual = new Date(fechaInicio);
        fechaActual = finance.sumarFecha(fechaActual, frecuencia);

        for (let i = 1; i <= cuotas; i++) {
            listaCuotas.push({
                numero: i,
                fecha: new Date(fechaActual), // Copia de la fecha
                monto: montoCuota
            });

            // Avanzamos la fecha para la siguiente vuelta
            fechaActual = finance.sumarFecha(fechaActual, frecuencia);
        }

        return listaCuotas;
    }
};

module.exports = finance;