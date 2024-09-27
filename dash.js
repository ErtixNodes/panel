const express = require('express');
const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT,
});

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const db = require('./db');

const app = express.Router();

const dayjs = require('dayjs');
var relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);

const { Webhook } = require('discord-webhook-node');
const hook = new Webhook(process.env.ADMIN_HOOK);

const fetch = require('node-fetch');

var isCheckServer = false;

hook.send(`<@${process.env.ADMIN_ID}> :blue_square: **BOOT** - Dashboard started`);

app.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return error(res, 400, 'No code');

    try {
        var token = await oauth.tokenRequest({
            code,
            scope: "identify email",
            grantType: "authorization_code",
        });

        var user = await oauth.getUser(token.access_token);

        var userInDB = await db.User.findOne({
            userID: user.id
        });
        if (!userInDB) {
            try {
                userInDB = new db.User({
                    userID: user.id,
                    balance: 60,
                    notif: true,
                    serverLimit: 1,
                    nextEarnCuty: Date.now()
                });
                await userInDB.save();
            } catch (e) {
                console.log('ERROR creating Pterodactyl user', e);
                return error(res, 500, 'Failed to create Pterodactyl user');
            }
        }

        req.session.user = user;
        req.session.userID = user.id;
    } catch (e) {
        console.log('ERROR', String(e), e);
    }

    req.session.save();
    return res.redirect('/dash');
});

app.use((req, res, next) => {
    req.db = db;
    req.oauth = oauth;
    next();
});

app.get('/login/url', require('./dash/login-url.js'));

app.use(async (req, res, next) => {
    console.log(req.url)
    if (!req.session.user && req.url != '/login') {
        return res.redirect('/dash/login/url');
    }

    next();
});

app.get('/', require('./dash/index.js'));
app.get('/earn/cuty/time', require('./dash/time-cuty.js'));
app.get('/earn/cuty', require('./dash/earn-cuty.js'));
app.get('/earn/claim/:token', require('./dash/claim.js'));

module.exports = app;