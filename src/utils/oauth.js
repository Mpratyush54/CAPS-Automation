const express = require("express");
const { google } = require("googleapis");

const router = express.Router();

// ✅ Use ENV variables
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

// 🔥 STEP 1: Redirect to Google login
router.get("/google", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",   // gives refresh_token
        prompt: "consent",        // forces refresh_token
        scope: ["https://www.googleapis.com/auth/drive"],
    });

    res.redirect(url);
});

// 🔥 STEP 2: Callback → get tokens
const GoogleToken = require("../models/GoogleToken");

router.get("/google/callback", async (req, res) => {
    try {
        const { code } = req.query;

        const { tokens } = await oauth2Client.getToken(code);

        console.log("🔥 TOKENS:", tokens);
        const existing = await GoogleToken.findOne({ userId: "admin" });

        //  Save or update in DB
        if (existing) {
            await GoogleToken.updateOne(
                { userId: "admin" },
                {
                    $set: {
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token || existing.refresh_token,
                        scope: tokens.scope,
                        token_type: tokens.token_type,
                        expiry_date: tokens.expiry_date,
                    }
                }
            );
        } else {
            await GoogleToken.insertOne({
                userId: "admin",
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                scope: tokens.scope,
                token_type: tokens.token_type,
                expiry_date: tokens.expiry_date,
            });
        }
        res.send("✅ OAuth success! Tokens saved in DB.");
    } catch (err) {
        console.error("❌ OAuth Error:", err.message);
        res.status(500).send("OAuth failed");
    }
});
module.exports = router;