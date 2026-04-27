const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const flash = require('connect-flash');

const ConfigModel = require('./models/ConfigModel');
const PrestamoModel = require('./models/PrestamoModel');

// 1. Configuración de variables de entorno
dotenv.config();

// 2. Importar conexión a Base de Datos
const db = require('./config/db');

// 3. Configuración de Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

app.use(flash());

// 4. Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 5. Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// 6. Procesar datos de formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 7. VARIABLES GLOBALES E INTELIGENCIA
app.use(async (req, res, next) => {
    res.locals.mensajeExito = req.flash('mensajeExito');
    res.locals.mensajeError = req.flash('mensajeError');
    res.locals.usuario = req.session.usuario || null;
    
    try {
        const config = await ConfigModel.obtener();
        res.locals.empresa = config || { nombre_empresa: 'Sistema', logo: null };

        // Alertas de Vencidos
        if (req.session.usuario) {
            await PrestamoModel.procesarVencimientos();
            const totalVencidos = await PrestamoModel.contarVencidos();
            res.locals.alertasVencidos = totalVencidos;
        } else {
            res.locals.alertasVencidos = 0;
        }

    } catch (error) {
        res.locals.empresa = { nombre_empresa: 'Sistema', logo: null };
        res.locals.alertasVencidos = 0;
    }
    
    next();
});

// ---> RUTAS Y CONTROLADORES
const protegerRuta = require('./middleware/auth');
const dashboardController = require('./controllers/dashboardController');

// 8. DEFINICIÓN DE RUTAS
app.use('/auth', require('./routes/auth'));

// Rutas Privadas
app.get('/', protegerRuta, dashboardController.mostrarDashboard);

app.use('/clientes', protegerRuta, require('./routes/clientes'));
app.use('/prestamos', protegerRuta, require('./routes/prestamos'));
app.use('/pagos', protegerRuta, require('./routes/pagos'));
app.use('/empenos', protegerRuta, require('./routes/empenos'));
app.use('/ahorros', protegerRuta, require('./routes/ahorros'));
app.use('/usuarios', protegerRuta, require('./routes/usuarios'));
app.use('/reportes', protegerRuta, require('./routes/reportes'));
app.use('/config', protegerRuta, require('./routes/config'));
app.use('/perfil', protegerRuta, require('./routes/perfil'));
app.use('/gastos', protegerRuta, require('./routes/gastos'));
app.use('/caja', protegerRuta, require('./routes/caja'));
app.use('/backup', protegerRuta, require('./routes/backup'));
app.use('/bitacora', protegerRuta, require('./routes/bitacora'));
app.use('/simulador', protegerRuta, require('./routes/simulador')); // <--- NUEVA RUTA

// --- RUTA TEMPORAL PARA ARREGLAR LA BASE DE DATOS EN RAILWAY ---
app.get('/fix-db', async (req, res) => {
    try {
        await db.query(`
            ALTER TABLE prestamos 
            ADD COLUMN fecha_fin DATE AFTER fecha_inicio,
            MODIFY COLUMN frecuencia ENUM('diario', 'semanal', 'quincenal', 'mensual') NOT NULL
        `);
        res.send('<h1>✅ ¡Base de datos corregida exitosamente!</h1><p>Ya puedes volver a la aplicación y crear préstamos.</p><a href="/prestamos">Volver a Préstamos</a>');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            res.send('<h1>⚠️ La columna ya existe</h1><p>El arreglo ya fue aplicado antes.</p><a href="/prestamos">Volver a Préstamos</a>');
        } else {
            res.send(`<h1>❌ Error al corregir</h1><pre>${error.message}</pre>`);
        }
    }
});
// ----------------------------------------------------------------

// MANEJADOR DE ERROR 404
app.use((req, res, next) => {
    res.status(404).render('404');
});

// 9. Iniciar Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n--- SERVIDOR INICIADO ---`);
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});