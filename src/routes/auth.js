// ─── Auth Routes ──────────────────────────────────────────────────
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../config/database');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { ObjectId } = require('mongodb');
const { authenticate, authorize } = require('../middleware/auth');
const { moderateContent } = require('../middleware/moderation');
const { sendSystemNotification } = require('../utils/notifications');

const router = express.Router();

const ROLES = {
    VOLUNTEER: 'Volunteer',
    TEAM_LEAD: 'Team Lead',
    ADMIN: 'Admin',
    SUPER_ADMIN: 'Super Admin',
};

// ──────────────── Helper ────────────────
function generateToken(user) {
    return jwt.sign(
        { id: (user._id || '').toString(), role: user.role || ROLES.VOLUNTEER },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { id: (user._id || '').toString(), role: user.role || ROLES.VOLUNTEER, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
}

function sanitizeUser(user) {
    const { password, ...safe } = user;
    return safe;
}

function generatePassword(length = 10) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
    let pwd = '';
    for (let i = 0; i < length; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
}

// ──────────────── POST /api/auth/signup ────────────────
/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               role: { type: string, enum: [Volunteer, Team Lead, Admin, Super Admin] }
 *               avatar: { type: string }
 *               profession: { type: string }
 *               expertise: { type: string }
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 token: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: Conflict - Email already registered
 */
router.post('/signup', moderateContent(['name', 'profession', 'expertise']), async (req, res) => {
    try {
        const { name, email, password, role, avatar, profession, expertise } = req.body;

        const CACHE_KEY = 'config:launch_status';
        let status = await cacheGet(CACHE_KEY);
        if (!status) {
            const tempDb = getDB();
            const configDoc = await tempDb.collection('config').findOne({ _id: 'launch_status' });
            status = {
                isLaunched: configDoc?.isLaunched ?? true,
                launchDate: configDoc?.launchDate ?? new Date().toISOString(),
                bypassToken: configDoc?.bypassToken || null,
                allowSignups: configDoc?.allowSignups ?? true
            };
            await cacheSet(CACHE_KEY, status, 300);
        }

        if (status.allowSignups === false) {
            return res.status(403).json({ error: 'Signups are currently disabled by the administrator.' });
        }

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: 'Invalid email address.' });
        }

        const db = getDB();
        const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: role || ROLES.VOLUNTEER,
            verified: true,
            avatar: avatar || '👤',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        if (profession) newUser.profession = profession;
        if (expertise) newUser.expertise = expertise;

        const result = await db.collection('users').insertOne(newUser);
        newUser._id = result.insertedId;

        const token = generateToken(newUser);

        res.status(201).json({
            message: 'Account created successfully!',
            token,
            user: sanitizeUser(newUser),
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Failed to create account.' });
    }
});

// ──────────────── POST /api/auth/login ────────────────
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate and get session tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               fingerprint: { type: string, description: "Unique device identifier for security tracking" }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 refreshToken: { type: string }
 *                 user: { type: object }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password, fingerprint } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const db = getDB();
        const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (user.banned) {
            return res.status(403).json({ error: 'Your account has been suspended.' });
        }

        // Auto-verify users if they aren't already (compat with old system)
        if (user.verified === false) {
            await db.collection('users').updateOne({ _id: user._id }, { $set: { verified: true } });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
        );

        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        await cacheSet(`user:${user._id}`, sanitizeUser(user), 300);

        res.json({
            message: 'Login successful!',
            token,
            refreshToken,
            user: sanitizeUser(user),
        });

        // Device-aware security visibility
        // Only notify if this is a genuinely NEW device fingerprint for this user
        let isKnownDevice = false;
        if (fingerprint) {
            const existingMatch = await db.collection('pushSubscriptions').findOne({
                userId: user._id,
                fingerprint: fingerprint
            });
            if (existingMatch) isKnownDevice = true;
        }

        if (!isKnownDevice) {
            console.log(`🛡️ [AUTH-SECURITY] New device fingerprint detected for user: ${user.name} (${fingerprint || 'no-fingerprint'})`);
            sendSystemNotification(user._id, {
                title: 'New Login Detected 🛡️',
                body: `A new session was started successfully from an unrecognized device hardware.`,
                type: 'security',
                url: '/profile',
                fromRoleLabel: 'Security'
            }).catch(() => { });
        } else {
            console.log(`🛡️ [AUTH-SECURITY] Login from known device: ${user.name} (FP: ${fingerprint})`);
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed.' });
    }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh session using a refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required.' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ error: 'Invalid refresh token.' });
        }

        const db = getDB();
        const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }

        const accessToken = generateToken(user);
        const nextRefreshToken = generateRefreshToken(user);

        res.json({
            message: 'Token refreshed successfully.',
            token: accessToken,
            refreshToken: nextRefreshToken,
            user: sanitizeUser(user),
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid refresh token.' });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get currently authenticated user data
 *     tags: [Auth]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 */
router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password while logged in
 *     tags: [Auth]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 */
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        }
        const db = getDB();
        const user = await db.collection('users').findOne({ _id: req.user._id });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await db.collection('users').updateOne(
            { _id: req.user._id },
            { $set: { password: hashedPassword, updatedAt: new Date() } }
        );
        await cacheDel(`user:${req.user._id}`);
        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to change password.' });
    }
});

/**
 * @swagger
 * /api/auth/bulk-create:
 *   post:
 *     summary: Create multiple users at once (Admin only)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [users]
 *             properties:
 *               users:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, email]
 *                   properties:
 *                     name: { type: string }
 *                     email: { type: string, format: email }
 *                     role: { type: string }
 *     responses:
 *       201:
 *         $ref: '#/components/responses/Created'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/bulk-create', authenticate, authorize('Admin'), async (req, res) => {
    try {
        const { users } = req.body;
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ error: 'Provide an array of users.' });
        }
        const db = getDB();
        const results = [];
        const failed = [];
        for (const userData of users) {
            const { name, email, role } = userData;
            const plainPassword = generatePassword(10);
            const hashedPassword = await bcrypt.hash(plainPassword, 10);
            const newUser = {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                role: role || ROLES.VOLUNTEER,
                avatar: '👤',
                verified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = await db.collection('users').insertOne(newUser);
            results.push({ id: result.insertedId.toString(), name: newUser.name, email: newUser.email, role: newUser.role, password: plainPassword });
        }
        res.status(201).json({ message: `Created ${results.length} users.`, users: results });
    } catch (err) {
        res.status(500).json({ error: 'Bulk creation failed.' });
    }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Terminate current session and clear server-side cache
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Ok'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout', authenticate, async (req, res) => {
    try {
        await cacheDel(`user:${req.user._id}`);
        res.json({ message: 'Logged out successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Logout failed.' });
    }
});

module.exports = router;
