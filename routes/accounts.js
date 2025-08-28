const express = require("express");
const { v4: uuidv4 } = require("uuid");
const store = require("../db");
const { getProvider } = require("../storage");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * Redirect to OAuth consent of given provider
 * GET /accounts/add/:provider
 */
router.get("/add/:provider", async (req, res) => {
    const providerName = req.params.provider;
    const provider = getProvider(providerName);
    if (!provider) return res.status(400).send(`Unknown provider: ${providerName}`);

    const state = uuidv4();
    const url = provider.getAuthUrl(state);

    // Save placeholder account
    const placeholder = { id: state, provider: providerName, status: "pending", createdAt: new Date().toISOString() };
    await store.saveAccount(placeholder);

    return res.redirect(url);
});

/**
 * OAuth callback
 * GET /accounts/callback/:provider
 * Google callback URL will be BASE_URL + /accounts/callback/google
 */
router.get("/callback/:provider", async (req, res) => {
    try {
        const providerName = req.params.provider;
        const provider = getProvider(providerName);
        if (!provider) return res.status(400).send(`Unknown provider: ${providerName}`);

        const account = await provider.handleOAuthCallback(req.query);
        // save account (upsert)
        await store.saveAccount(account);

        return res.send(`Account added: ${account.label} (id=${account.id}). You can close this window.`);
    } catch (e) {
        logger.error("OAuth callback error", e);
        return res.status(500).send("OAuth callback failed");
    }
});

/**
 * List accounts
 * GET /accounts
 */
router.get("/", async (req, res) => {
    const accounts = await store.listAccounts();
    res.json(
        accounts.map((a) => ({
            id: a.id,
            provider: a.provider,
            label: a.label,
            createdAt: a.createdAt,
            status: a.status || "connected",
        }))
    );
});

/**
 * Delete account
 * DELETE /accounts/:id
 */
router.delete("/:id", async (req, res) => {
    const id = req.params.id;
    await store.deleteAccount(id);
    res.json({ ok: true });
});

module.exports = router;
