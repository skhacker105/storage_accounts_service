const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"]?.split(" ")[1] || req.query?.token || req.cookies?.token;;
    if (!authHeader) return res.status(401).send("Missing Authorization token");

    try {
        const payload = jwt.verify(authHeader, JWT_SECRET);
        req.userId = payload.userId;
        next();
    } catch (err) {
        return res.status(401).send("Invalid or expired token");
    }
}

function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}

module.exports = { authMiddleware, generateToken };
