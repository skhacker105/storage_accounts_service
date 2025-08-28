require("dotenv").config();

module.exports = {
    PORT: process.env.PORT || 3000,
    BASE_URL: process.env.BASE_URL || `http://localhost:3001`,
    DB_TYPE: process.env.DB_TYPE || "memory",
    DB_URI: process.env.DB_URI || "",
    JWT_SECRET: process.env.JWT_SECRET || "supersecret",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
};
