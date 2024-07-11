const express = require('express');
const DiscordOauth2 = require("discord-oauth2");
const crypto = require('crypto');
const oauth = new DiscordOauth2({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT,
});

const db = require('./db');

const router = express.Router();

const Nodeactyl = require('nodeactyl');
const ptero = new Nodeactyl.NodeactylApplication(process.env.PANEL_URL, process.env.PANEL_KEY);

const fs = require('fs');
const path = require('path');

const cooldownFilePath = path.join(__dirname, 'cooldowns.json');

// Function to read cooldown data from file
function readCooldowns() {
    if (fs.existsSync(cooldownFilePath)) {
        const data = fs.readFileSync(cooldownFilePath);
        return JSON.parse(data);
    }
    return {};
}

// Function to write cooldown data to file
function writeCooldowns(cooldowns) {
    fs.writeFileSync(cooldownFilePath, JSON.stringify(cooldowns, null, 2));
}

const cooldowns = readCooldowns(); // Load cooldown data

function genToken(length){
    //edit the token allowed characters
    var a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    var b = [];  
    for (var i=0; i<length; i++) {
        var j = (Math.random() * (a.length-1)).toFixed(0);
        b[i] = a[j];
    }
    return b.join("");
}

const fetch = require('node-fetch');

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

        var userInDB = await db.User.findOne({
            userID: user.id
        });
        if (!userInDB) {
            var pteroUser = await ptero.createUser(user.email, 'u' + user.id, 'Discord', 'Discord', user.avatar);
            console.log(pteroUser);
            userInDB = new db.User({
                userID: user.id,
                balance: 0,
                pteroID: pteroUser.attributes.id,
                password: user.avatar
            });
            await userInDB.save();
        }

        req.session.pteroID = userInDB.pteroID
        req.session.user = user;
        req.session.userID = user.id;
    } catch (e) {
        console.log('ERROR', String(e), e);
    }

    console.log(req.session);
    req.session.save();
    return res.redirect('/dash');
    // res.render('dashboard', {req, res});
});

router.use(async (req, res, next) => {
    // console.log('dash ses', req.session);
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

router.get('/', async (req, res) => {
    // res.send('yoo ' + req.session.user.global_name);
    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    var servers = await db.Server.find({
        userID: req.session.user.id
    });
    res.render('dashboard', { req, res, pass: user.password, servers, user });
});

router.get('/earn', async (req, res) => {
    
})

router.get('/server/api/create', async (req, res) => {
    const { name } = req.query;
    if (!name ) return res.json({ ok: false });

    var dbUser = await db.User.findOne({
        userID: req.session.userID
    });
    if (!dbUser) return res.json({ ok: false });
    if (dbUser.balance < 5) return res.type('txt').send('Failed to create server: you need at least 5 credits');
    
    var ram = 1024;
    var cpu = 100;
    var disk = 4096;

    const user = req.session.pteroID;
    let json = {
        'name': name,
        'user': user,
        'egg': 2,
        'docker_image': "ghcr.io/pterodactyl/yolks:java_21",
        'startup': "java -jar server.jar",
        'limits': {
            'memory': ram,
            'swap': 0,
            'disk': disk,
            'io': 100,
            'cpu': cpu,
        },
        'feature_limits': {
            'databases': 1,
            'allocations': 1,
            'backups': 0
        },
        'environment': {
            'MINECRAFT_VERSION': 'latest',
            'SERVER_JARFILE': 'server.jar',
            'DL_PATH': '',
            'BUILD_NUMBER': 'latest'
        },
        'allocation': {
            // 'default': 1,
            'additional': [],
        },
        'deploy': {
            'locations': [1],
            'dedicated_ip': false,
            'port_range': [],
        },
        'start_on_completion': true,
        'skip_scripts': false,
        'oom_disabled': false,
    }
    var srv = await ptero.createRawServer(json);

    // console.log(srv);

    srv = srv.attributes;

    var dbServer = new db.Server({
        userID: req.session.userID,
        pteroUID: srv.identifier,
        pteroNID: srv.id,
        pteroLID: srv.uuid,

        name,
        ram,
        cpu,
        disk,

        cost: 1
    });
    await dbServer.save();

    res.redirect('/dash');
});


router.get('/_', (req, res) => {
    res.json({
        auth: true
    });
});
module.exports = router;

function error(res, code, text) {
    res.status(code);
    res.type('txt');
    res.send('ERROR: ' + text);
}