const express = require('express');
const DiscordOauth2 = require("discord-oauth2");
const crypto = require('crypto');
const oauth = new DiscordOauth2({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT,
});

const router = express.Router();

// Logging in
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return error(res, 400, 'No code');

    try {
        var token = await oauth.tokenRequest({
            code,
            scope: "identify",
            grantType: "authorization_code",
        });

        // console.log(code, token);

        var user = await oauth.getUser(token.access_token);

        console.log('user', user);

        req.session.user = user;
        req.session.userID = user.id;
    } catch (e) {
        console.log('ERROR', String(e));
    }

    console.log(req.session);
    req.session.save();
    return res.redirect('/dash');
    // res.render('dashboard', {req, res});
});

router.use(async (req, res, next) => {
    console.log('dash ses', req.session);
    if (!req.session.user) {
        const url = await oauth.generateAuthUrl({
            scope: ["identify"],
            state: crypto.randomBytes(16).toString("hex"), // Be aware that randomBytes is sync if no callback is provided
        });
        console.log(url);
        return res.redirect(url);
    }

    next();
});

router.get('/', (req, res) => {
    res.send('yoo ' + req.session.user.global_name);
    // res.render('dashboard', { req, res });
});
module.exports = router;

function error(res, code, text) {
    res.status(code);
    res.type('txt');
    res.send('ERROR: ' + text);
}