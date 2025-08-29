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
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send("Email and password required");

    const existing = await store.getUserByEmail(email);
    if (existing) return res.status(400).send("Email already exists");

    const user = { id: uuidv4(), email, password }; // ⚠️ hash in prod
    await store.createUser(user);

    res.json({ id: user.id, email: user.email });
});

/**
 * Login
 */
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await store.getUserByEmail(email);

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
    res.json(user);
});

module.exports = router;
