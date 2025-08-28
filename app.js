const express = require("express");
const bodyParser = require("body-parser");
const store = require("./db"); // resolves either memory or mongo store
const { PORT, BASE_URL, DB_TYPE } = require("./config/env");
const accountRoutes = require("./routes/accounts");
const storageRoutes = require("./routes/storage");
const logger = require("./utils/logger");

(async () => {
    try {
        // init selected store (memory store init is a no-op)
        if (store && typeof store.init === "function") {
            await store.init();
            // Optionally restore from DB if using memory store and you want to rehydrate
        }

        const app = express();
        app.use(bodyParser.json());

        // Routes
        app.use("/accounts", accountRoutes);
        app.use("/storage", storageRoutes);

        // basic ping
        app.get("/ping", (req, res) => res.send("OK"));

        app.listen(PORT, () => {
            logger.info(`Server listening on ${BASE_URL}`);
            logger.info(`Add Google account: ${BASE_URL}/accounts/add/google`);
            logger.info(`Storage endpoints under: ${BASE_URL}/storage/:accountId/...`);
            logger.info(`Using DB_TYPE=${DB_TYPE}`);
        });
    } catch (e) {
        logger.error("Failed to start server", e);
        process.exit(1);
    }
})();
