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

const dayjs = require('dayjs');
var relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);

const plans = {
    'tiny1': {
        ram: 128,
        cpu: 25,
        disk: 512,
        cost: 1
    },
    'tiny2': {
        ram: 256,
        cpu: 25,
        disk: 1024,
        cost: 2
    },
    'tiny3': {
        ram: 512,
        cpu: 50,
        disk: 2048,
        cost: 4
    },
    'tiny4': {
        ram: 768,
        cpu: 50,
        disk: 2048,
        cost: 6
    },

    // over 1 gb
    'small1': {
        ram: 1024,
        cpu: 50,
        disk: 4096,
        cost: 8
    }
};

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

var isCheckServer = false;
setInterval(async () => {
    if (isCheckServer == true) return;
    isCheckServer = true;

    // ---------------------
    console.log(`> Checking servers...`);
    var expired = await db.Server.find({
        $or: [
            { lastPing: { $lt: (Date.now()-(1000*60*60*24*3)) } },
            // { lastPing: null },
            // { lastPing: { $exists : false } }
        ]
        // lastPing: {
        //     $or: [
        //         {}
        //     ]
        //     // $lt: (Date.now()-(1000*60*60*24*3))
        // }
        /* $or: [{ name: "Rambo" }, { breed: "Pugg" }, { age: 2 }]; */
        /*
                if ((Date.now()-(1000*60*60*24*3)) > srv.lastPing) {
                    console.log(`${srv.name} needs to get deleted`);
                } else {
                    console.log(`${srv.name} is new enough`);
                }
        */
    });
    var srvCount = await db.Server.countDocuments({});
    for(let i = 0; i < expired.length; i++) {
        var VPS = expired[i];
        // Expired
        // TODO: delete
        console.log(`| Expired: ${VPS.name}`);
        // Expired
    }
    console.log(`> Expired VPS: ${expired.length}/${srvCount}`);
    // ---------------------

    isCheckServer = false
}, 15*1000);

router.get('/node/charge/:token/:id', async (req, res) => {
    const { id, token } = req.params;
    const { suspend } = req.query;
    if (!suspend) return res.send('No suspend');
    if (token != 'SUPERSECRET') return res.send('Invalid token');

    var srv = await db.Server.findOne({
        pteroLID: id
    });
    if (!srv) {
        //console.log(`Srv ${id} no found in db`);
        return res.send('Invalid server');
    }

    srv.lastPing = Date.now();
    if (!srv.keep) srv.keep = false;
    await srv.save();

    var user = await db.User.findOne({
        userID: srv.userID
    });
    if (!user) {
        console.log(`user ${srv.userID} no found in db`);
        return res.send('invalid user');
    }

    user.balance = user.balance - 1;
    await user.save();

    if (suspend == 'true' || user.balance == 0) {
        console.log('i will suspend (angry emoji)')
        try {
            await ptero.suspendServer(srv.pteroNID);
        } catch(e) {
            console.log('cant sus', e);
        }
    }

    return res.send();
});

// Logging in
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return error(res, 400, 'No code');

    try {
        var token = await oauth.tokenRequest({
            code,
            scope: "identify email",
            grantType: "authorization_code",
        });

        // console.log(code, token);

        var user = await oauth.getUser(token.access_token);

         console.log('user', user);

        var userInDB = await db.User.findOne({
            userID: user.id
        });
        if (!userInDB) {
            try {
                var pteroPass = genToken(32);
                var pteroUser = await ptero.createUser(`u${user.id}@ertixnodes.xyz`, 'u' + user.id, 'Discord', 'Discord', pteroPass);
                // console.log(pteroUser);
                userInDB = new db.User({
                    userID: user.id,
                    balance: 1500, // free credits
                    pteroID: pteroUser.attributes.id,
                    password: pteroPass,
                    notif: false,
                    serverLimit: 1
                });
                await userInDB.save();
            } catch (e) {
                console.log('ERROR creating Pterodactyl user', e);
                return error(res, 500, 'Failed to create Pterodactyl user');
            }
        }

        req.session.pteroID = userInDB.pteroID
        req.session.user = user;
        req.session.userID = user.id;
    } catch (e) {
        console.log('ERROR', String(e), e);
    }

    // console.log(req.session);
    req.session.save();
    return res.redirect('/dash');
    // res.render('dashboard', {req, res});
});

router.get('/login', (req, res) => {
    res.render('dash/login', { req, res });
})

router.get('/api/login', async (req, res) => {
    const url = await oauth.generateAuthUrl({
        scope: ["identify"],
        state: crypto.randomBytes(16).toString("hex"), // Be aware that randomBytes is sync if no callback is provided
    });
    console.log(url);
    return res.redirect(url);
});

router.use(async (req, res, next) => {
    // console.log('dash ses', req.session);
    console.log(req.url)
    if (!req.session.user && req.url != '/login') {
        return res.redirect('/dash/login');
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
    res.render('dash/index', { req, res, pass: user.password, servers, user });
});

router.get('/create', async (req, res) => {
    // res.send('yoo ' + req.session.user.global_name);
    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    var servers = await db.Server.find({
        userID: req.session.user.id
    });
    res.render('dash/create', { req, res, pass: user.password, servers, user });
});

router.get('/earn', async (req, res) => {
    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    res.render('dash/earn', {req, res, user});
    // res.redirect('/dash/earn/cuty');
});

router.get('/credits', async (req, res) => {
    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    return res.type('txt').send(String(user.balance));
});

router.get('/earn/cuty', async (req, res) => {
    var userId = req.session.user.id;

    var tok = await db.Earn.findOne({
        userID: userId,
        isUsed: false
    });

    if (tok && tok.url) return res.redirect(tok.url);

    // Check if user is in cooldown
    if (cooldowns[userId]) {
        const lastEarnTime = new Date(cooldowns[userId]);
        const now = new Date();
        const timeDiff = now - lastEarnTime;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 24) {
            const nextEarnTime = new Date(lastEarnTime.getTime() + 24 * 60 * 60 * 1000);
            return res.send(`You can earn credits again ${Math.floor((nextEarnTime.getTime() - Date.now()) / 1000 / 60)} minutes (or ${Math.floor((nextEarnTime.getTime() - Date.now()) / 1000 / 60 / 60)} hours)`);
        }
    }

    var token = genToken(32);

    var url = await fetch(`https://api.cuty.io/quick?token=${process.env.CUTY}&url=${encodeURIComponent(`${process.env.DASH}/earn/claim/${token}`)}&format=text`);
    url = await url.text();

    const earn = new db.Earn({
        userID: userId,
        isUsed: false,
        creditCount: 1500,
        token,
        url
    });
    await earn.save();

    // Set the current time as the last earn time for the user and save to file
    cooldowns[userId] = new Date().toISOString();
    writeCooldowns(cooldowns);

    res.redirect(url);
});

router.get('/earn/cuty/time', async (req, res) => {
    var userId = req.session.user.id;

    if (cooldowns[userId]) {
        const lastEarnTime = new Date(cooldowns[userId]);
        const now = new Date();
        const timeDiff = now - lastEarnTime;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 24) {
            var nextEarnTime = new Date(lastEarnTime.getTime() + 24 * 60 * 60 * 1000);
            nextEarnTime = dayjs(nextEarnTime);
            // var diff = Math.floor((nextEarnTime.getTime() - Date.now())) / 1000;
            // var min = diff;
            // var o = Math.floor((diff / 60));
            // return res.type('txt').send(`${Math.round(diff)}s | ${o}m | ${Math.floor((nextEarnTime.getTime() - Date.now()) / 1000 / 60 / 60)}h`);
            // return res.type('txt').send(dayjs(Date.now()).to(nextEarnTime));

            var s = nextEarnTime.diff(Date.now(), 'second');
            var m = nextEarnTime.diff(Date.now(), 'minute');
            var h = nextEarnTime.diff(Date.now(), 'hour');
            

            return res.type('txt').send(`${h}h | ${m}m | ${s}s`);
        }
    }

    res.type('txt').send('Ready');
});

router.get('/earn/claim/:token', async (req, res) => {
    console.log(req.get('Referrer'), req.get('Referer'))
    const { token } = req.params;
    
    if (!token) return res.status(400).type('txt').send('No token provided');
    
    var tok = await db.Earn.findOne({
        token
    });
    if (!tok) return res.status(403).type('txt').send('Invalid token');
    
    if (tok.isUsed == true) return res.status(403).type('txt').send('Token already used');
    
    var user = await db.User.findOne({
        userID: tok.userID
    });
    if (!user) return res.status(403).type('txt').send('Invalid user');
    
    user.balance = user.balance + tok.creditCount;
    await user.save();
    
    tok.isUsed = true;
    await tok.save();

    setTimeout(async () => {
        var srv = await db.Server.find({
            userID: tok.userID
        });
        srv.forEach(async server => {
            try {
                await ptero.unsuspendServer(server.pteroNID);
            } catch(e) {
                console.log('cant unsuspend', e);
            }
        });
    }, 1);
    
    return res.redirect(`/dash`);
});

router.get('/server/api/create', async (req, res) => {
    const { name, type, plan } = req.query;
    if (!name || !type || !plan) return res.type('txt').send('Missing params');

    if (type != 'alpine') return res.type('txt').send('Invalid type');

    if (!plans[plan]) return res.type('txt').send('Invalid plan');

    var dbUser = await db.User.findOne({
        userID: req.session.userID
    });
    if (!dbUser) return res.json({ ok: false });

    if (!dbUser.serverLimit) {
        dbUser.serverLimit = 1;
        await dbUser.save();
    }

    var srv = await db.Server.find({
        userID: req.session.userID
    });

    if (srv.length >= dbUser.serverLimit) {
        return res.type('txt').send(`Server limit: ${dbUser.serverLimit} server\nYour server count: ${srv.length}`);
    }

    var pl = plans[plan];

    if (dbUser.balance < pl.cost * 5) return res.type('txt').send('Failed to create server: you need at least '+pl.cost*5+' credits');
    
    var ram = pl.ram;
    var cpu = pl.cpu;
    var disk = pl.disk;

    const user = req.session.pteroID;
    let json = {
        'name': '[VPS] ' + name,
        'user': user,
        'egg': 25,
        'docker_image': "ghcr.io/pterodactyl/yolks:debian",
        'startup': '/home/container/usr/local/bin/proot --rootfs="/home/container" --link2symlink --kill-on-exit --root-id --cwd=/ --bind=/proc --bind=/dev --bind=/sys --bind=/tmp /bin/sh',
        'limits': {
            'memory': ram,
            'swap': -1,
            'disk': disk,
            'io': 100,
            'cpu': cpu,
        },
        'feature_limits': {
            'databases': 0,
            'allocations': 3,
            'backups': 0
        },
        'environment': {
            /* Egg does not have env vars */
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
        'start_on_completion': false,
        'skip_scripts': false,
        'oom_disabled': false,
    }
    try {
        var srv = await ptero.createRawServer(json);
    } catch (e) {
        console.log('ERROR creating server', e);
       // return error(res, 500, 'Failed to create server');
       return res.redirect('/dash' + req.url);
    }

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

        cost: pl.cost
    });
    await dbServer.save();

    res.redirect('/dash');
});


module.exports = router;

function error(res, code, text) {
    res.status(code);
    res.type('txt');
    res.send('ERROR: ' + text);
}
