require('dotenv').config();

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDB, closeDB, getDB } = require('./config/database');
const { initCollections } = require('./config/init');
const { connectRedis, closeRedis, getRedis, cacheGet, cacheSet } = require('./config/redis');
const { ObjectId } = require('mongodb');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { verifyToken } = require('./middleware/auth');
const oauthRoutes = require("./utils/oauth");

// 🔵 IMPORT YOUR EXISTING METRICS
const {
    register,
    httpRequestsTotal,
    httpRequestDuration,
    activeSockets,
    socketRooms,
    socketBroadcasts,
    redisAdapterStatus
} = require('./../config/metrics');

// 🔵 POD IDENTIFICATION FOR SCALING MONITORING
const POD_NAME = process.env.POD_NAME || 'local';


// Route imports
const authRoutes = require('./routes/auth');
const worklogRoutes = require('./routes/worklog');
const reportRoutes = require('./routes/reports');
const momRoutes = require('./routes/moms');
const eventRoutes = require('./routes/events');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const statsRoutes = require('./routes/stats');
const organizationRoutes = require('./routes/organization');
const profileRoutes = require('./routes/profile');
const { startNotificationWorker } = require('./workers/notificationWorker');
const { startPhotoSyncWorker } = require('./workers/photoSyncWorker');
// const webhookRoutes = require('./routes/webhook');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;


// ──────────────── REQUEST METRICS TRACKING ────────────────
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;

        if (httpRequestsTotal) {
            httpRequestsTotal.inc({
                method: req.method,
                route: req.route?.path || req.path,
                status: res.statusCode
            });
        }

        if (httpRequestDuration) {
            httpRequestDuration.observe({
                method: req.method,
                route: req.route?.path || req.path,
                status: res.statusCode
            }, duration);
        }
    });

    next();
});


// ──────────────── METRICS ENDPOINT ────────────────
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});


// ──────────────── Swagger Documentation ────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// ──────────────── Socket.IO Setup ────────────────
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            const allowedOrigins = [
                process.env.FRONTEND_URL || 'http://localhost:5174','http://192.168.1.6:5174',
                'https://forum-gamma-one.vercel.app',
                'http://localhost:3000',
            ];
            if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.trycloudflare.com')) {
                callback(null, true);
            } else {
                callback(new Error('CORS not allowed for this origin'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
    connectTimeout: 10000,
    maxHttpBufferSize: 1e6,
    perMessageDeflate: { threshold: 1024 },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
    },
});

// Initialize Socket Bridge for access from utilities
require('./lib/socketBridge').setIO(io);


// ──────────────── Redis Adapter (SCALING METRICS ENABLED) ────────────────
const pubClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    lazyConnect: true
});

const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        if (redisAdapterStatus) redisAdapterStatus.set(1);
        console.log('✅ Socket.IO Redis Adapter configured');
    })
    .catch(err => {
        if (redisAdapterStatus) redisAdapterStatus.set(0);
        console.warn('⚠️ Redis Adapter failed:', err.message);
    });


// ──────────────── SOCKET CONNECTION MONITORING ────────────────
io.on('connection', (socket) => {
    let userId = socket.handshake.query.userId || socket.handshake.auth?.userId;
    if (userId) userId = String(userId).toLowerCase();
    const fingerprint = socket.handshake.auth?.fingerprint;

    if (userId) {
        const room = `user:${userId}`;
        socket.join(room);
        console.log(`🔌 [SOCKET] User ${userId} joined room ${room}. Total rooms: ${socket.rooms.size}`);
        
        const redis = getRedis();
        if (redis) {
            redis.set(`user:active:${userId}`, 'true', 'EX', 300); // Online for 5 mins
        }

        // Detailed Session Tracking ( Situational Awareness )
        const { getDB } = require('./config/database');
        const { ObjectId } = require('mongodb');
        const db = getDB();

        // Create initial session record
        db.collection('userSessions').insertOne({
            userId: new ObjectId(userId),
            socketId: socket.id,
            fingerprint: fingerprint || 'unknown',
            startTime: new Date(),
            status: 'active',
            userAgent: socket.handshake.headers['user-agent'],
            ip: socket.handshake.address
        }).catch(err => console.error('Session Creation Error:', err.message));

        // Update overall user presence
        db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: { isOnline: true, lastActiveAt: new Date() } }
        ).catch(err => console.error('Presence Update Error:', err.message));
    }

    // Active socket count per pod
    if (activeSockets) {
        activeSockets.inc({ pod: POD_NAME });
    }

    // Track room changes dynamically
    if (socketRooms) {
        socketRooms.set(io.sockets.adapter.rooms.size);
    }

    // Heartbeat to keep activity alive
    socket.on('heartbeat', () => {
        if (userId && getRedis()) {
            getRedis().set(`user:active:${userId}`, 'true', 'EX', 300);
        }
    });

    socket.onAny(() => {
        if (socketRooms) {
            socketRooms.set(io.sockets.adapter.rooms.size);
        }
    });

    socket.on('disconnect', () => {
        if (activeSockets) {
            activeSockets.dec({ pod: POD_NAME });
        }

        if (socketRooms) {
            socketRooms.set(io.sockets.adapter.rooms.size);
        }

        if (userId && getRedis()) {
            getRedis().del(`user:active:${userId}`);

            // Mark session as disconnected
            const { getDB } = require('./config/database');
            const { ObjectId } = require('mongodb');
            const db = getDB();

            db.collection('userSessions').updateOne(
                { socketId: socket.id, status: 'active' },
                { $set: { status: 'disconnected', endTime: new Date() } }
            ).catch(err => console.error('Session Disconnect Error:', err.message));

            // Overall Presence
            db.collection('users').updateOne(
                { _id: new ObjectId(userId) },
                { $set: { isOnline: false } }
            ).catch(err => console.error('Presence Update Error:', err.message));
        }
    });
});


// Make io accessible
app.use((req, res, next) => {
    req.io = io;
    next();
});


// ──────────────── Security Middleware ────────────────
app.use(helmet());


// ──────────────── CORS ────────────────
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:5174','http://192.168.1.6:5174',
            'https://forum-gamma-one.vercel.app',
            'http://localhost:3000',
        ];
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.trycloudflare.com')) {
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed for this origin'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-bypass-token', 'x-api-key', 'x-offset', 'x-total-size'],
}));


// ──────────────── Body Parsing ────────────────
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));


// ──────────────── Logging ────────────────
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}


// ──────────────── Health Check ────────────────
app.get('/api/health', async (req, res) => {
    const redis = getRedis();
    const redisStatus = redis ? 'connected' : 'disconnected';

    res.json({
        status: 'ok',
        pod: POD_NAME,
        services: {
            mongodb: 'connected',
            redis: redisStatus,
            socketio: 'initialized',
        },
    });
});


// ──────────────── API Routes ────────────────
app.use('/api/events', eventRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/moms', momRoutes);
app.use('/api/reports/moms', momRoutes);
app.use('/api', worklogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/profile', profileRoutes);
// Google Config for the oauth

app.use("/auth", oauthRoutes);

// ──────────────── 404 Handler ────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
});


// ──────────────── Error Handler ────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error.'
            : err.message,
    });
});


// ──────────────── Start Server ────────────────
async function startServer() {
    try {
        await connectDB();
        await initCollections();
        connectRedis();

        server.listen(PORT,'0.0.0.0', () => {
            console.log(`🚀 Forum API running on port ${PORT}`);
        });

    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    await closeDB();
    await closeRedis();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeDB();
    await closeRedis();
    process.exit(0);
});

startServer().then(() => {
    startNotificationWorker();
    startPhotoSyncWorker();
});

module.exports = app;
