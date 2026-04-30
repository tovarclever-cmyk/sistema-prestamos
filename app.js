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
console.log('--- CONFIGURACIÓN INICIADA ---');
console.log('Entorno:', process.env.NODE_ENV || 'development');
console.log('Puerto configurado:', process.env.PORT || 3000);

// 2. Importar conexión a Base de Datos
console.log('Conectando a la base de datos...');
const db = require('./config/db');

// 3. Configuración de Sesiones
console.log('Configurando sesiones...');
app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));
console.log('Sesiones listas.');

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
app.use('/simulador', protegerRuta, require('./routes/simulador'));

// RUTA DE SALUD (Para Railway)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- RUTA TEMPORAL 2: Arreglar columna vieja ---
app.get('/fix-db2', async (req, res) => {
    try {
        // 1. Copiar los datos de la columna vieja a la nueva (para no perder información)
        await db.query(`UPDATE prestamos SET fecha_fin = fecha_vencimiento WHERE fecha_fin IS NULL`);
        
        // 2. Hacer que la columna vieja ya no sea obligatoria para evitar el error
        await db.query(`ALTER TABLE prestamos MODIFY COLUMN fecha_vencimiento DATE DEFAULT NULL`);
        
        res.send('<h1>✅ ¡Error solucionado!</h1><p>Se migró la información y se quitó la restricción.</p><a href="/prestamos/crear">Volver a Préstamos</a>');
    } catch (error) {
        res.send(`<h1>❌ Error</h1><pre>${error.message}</pre>`);
    }
});
// -----------------------------------------------

// MANEJADOR DE ERROR 404
app.use((req, res, next) => {
    res.status(404).render('404');
});

// MANEJADOR DE ERRORES GLOBAL (Evita que la app se caiga)
app.use((err, req, res, next) => {
    console.error('--- ERROR NO CONTROLADO ---');
    console.error(err.stack);
    res.status(500).send('<h1>Error 500: Algo salió mal en el servidor</h1><p>Por favor contacta al administrador.</p>');
});

// 9. Iniciar Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n--- SERVIDOR INICIADO ---`);
    console.log(`Servidor corriendo en el puerto: ${PORT}`);
});