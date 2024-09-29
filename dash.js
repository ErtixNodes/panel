const express = require('express');
const DiscordOauth2 = require("discord-oauth2");
const fs = require('fs');
const shell = require('shelljs');
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
    req.hook = hook;
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
app.get('/earn/link/cuty', require('./dash/earn-cuty.js'));
app.get('/earn/claim/:token', require('./dash/claim.js'));

app.get('/vps/create', require('./dash/vps-create.js'));
app.get('/vps/:id', require('./dash/vps.js'));
app.get('/vps/:id/status', require('./dash/vps/status.js'));
app.get('/vps/:id/start', require('./dash/vps/start.js'));
app.get('/vps/:id/restart', require('./dash/vps/restart.js'));
app.get('/vps/:id/stop', require('./dash/vps/stop.js'));
app.get('/vps/:id/kill', require('./dash/vps/kill.js'));

app.get('/vps/:id/addport', require('./dash/vps/addport.js'));
app.get('/vps/:id/removeport/:port', require('./dash/vps/removeport.js'));

app.get('/vps/:id/renew', require('./dash/vps/renew.js'));
app.get('/vps/:id/delete', require('./dash/vps/delete.js'));

app.get('/afk', require('./dash/afk/page.js'));
app.get('/afk/claim', require('./dash/afk/claim.js'));


let isCheckServer = false;
async function checkServer() {
    if (isCheckServer == true) return;
    isCheckServer = true;

    // CHECK
    var VPS = await db.VPS.find({
        expiry: {
            $lt: Date.now()
        }
    });
    for(let i = 0; i < VPS.length; i++) {
        let vps = VPS[i];

         var ports = await db.Port.find({
            vpsID: vps._id
         });
        for(let j = 0; j < ports.length; j++) {
            removeForward(ports[j].port, ports[j].intPort, vps.ip);
            ports[j].isUsed = false;
            ports[j].intPort = null;
            ports[j].vpsID = null;
            await ports[j].save();
        }

        await shell.exec(`pct stop ${vps.proxID}`);
        await shell.exec(`pct destroy ${vps.proxID}`);

        await hook.send(`<@${process.env.ADMIN_ID}> :red_circle: **EXPIRED** - VPS ${vps.name} deleted`);

        await db.VPS.deleteOne({
            _id: vps._id
        });

        console.log(`Deleted VPS ${vps._id}`);
    }
    // console.log(VPS);
    if (VPS.length > 0) hook.send(`<@${process.env.ADMIN_ID}> :blue_circle: ${VPS.length} vps expired!`);

    // END CHECK

    isCheckServer = false;
}

checkServer();
setInterval(checkServer, 5*60*1000);

async function removeForward(port, intPort, ip) {

    console.log(`Adding :${port} -> ${ip}:${intPort}`);

    try {
        await shell.exec(`iptables -t nat -D PREROUTING -p TCP --dport ${port} -j DNAT --to-destination ${ip}:${intPort}`);
        fs.rmSync(`/port/${port}.sh`);
    } catch (e) {
        console.log('Failed to remove port', String(e));
    }
}

module.exports = app;