const express = require("express");
const { v4: uuidv4 } = require("uuid");
const store = require("../db");
const { generateToken } = require("../middleware/auth");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

/**
 * Register
 */
router.post("/register", async (req, res) => {
    const { email, phoneNumber, password } = req.body;
    if (!email || !phoneNumber || !password) return res.status(400).send("Email and password required");

    const existingPhone = await store.getUserByPhoneNumber(phoneNumber);
    const existingEmail = await store.getUserByEmail(email);
    if (existingPhone) return res.status(400).send("Phone number already exists");
    if (existingEmail) return res.status(400).send("Email already exists");

    const user = { ...req.body, id: uuidv4(), email, password }; // ⚠️ hash in prod
    await store.createUser(user);

    res.json({ ...user });
});

/**
 * Login
 */
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    let user = await store.getUserByEmail(email);
    if (!user) user = await store.getUserByPhoneNumber(email);

    if (!user || user.password !== password) {
        return res.status(401).send("Invalid email or password");
    }

    const token = generateToken(user.id);
    res.json({ token });
});

/**
 * List all users
 * Pending to add only my access to it using middleware
 */
router.get("/", async (req, res) => {
    const users = await store.listUsers();
    res.json(users.map((u) => ({ id: u.id, email: u.email })));
});

/**
 * List one user
 */
router.get("/myInfo", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const user = await store.getUser(userId);
    user.storageAccounts = user.storageAccounts.map(acc => ({
        id: acc.id,
        provider: acc.provider,
        label: acc.label,
        createdAt: acc.createdAt,
        userId: acc.userId
    }))
    res.json({ ...user, password: "" });
});

module.exports = router;
