const express = require("express");
const { v4: uuidv4 } = require("uuid");
const store = require("../db");
const { getProvider } = require("../storage");
const logger = require("../utils/logger");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
// router.use(authMiddleware);

/**
 * Redirect to OAuth consent of given provider
 * GET /accounts/add/:provider
 */
router.get("/add/:provider", authMiddleware, async (req, res) => {
    const providerName = req.params.provider;
    const provider = getProvider(providerName);
    if (!provider) return res.status(400).send(`Unknown provider: ${providerName}`);

    const state = {
        csrf: uuidv4(),
        userId: req.userId, // comes from authMiddleware
    };
    const url = provider.getAuthUrl(JSON.stringify(state));

    const placeholder = {
        id: state.csrf,
        userId: req.userId,
        provider: providerName,
        status: "pending",
        createdAt: new Date().toISOString(),
    };
    await store.saveAccount(req.userId, placeholder);

    return res.redirect(url);
});

/**
 * OAuth callback
 * GET /accounts/callback/:provider
 * Google callback URL will be BASE_URL + /accounts/callback/google
 */
router.get("/callback/:provider", async (req, res) => {
    try {
      const provider = getProvider(req.params.provider);
      if (!provider) return res.status(400).send("Unknown provider");
  
      // state comes from Google redirect
      const stateObj = JSON.parse(req.query.state);
      const userId = stateObj.userId;
  
      const account = await provider.handleOAuthCallback(req.query);
      await store.saveAccount(userId, account);
  
      return res.send(`Account added for user=${userId}, account=${account.label} with account id = ${account.id}`);
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
    const accounts = await store.listAccounts(req.userId);
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
    await store.deleteAccount(req.userId, req.params.id);
    res.json({ ok: true });
});

module.exports = router;
