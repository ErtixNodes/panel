var randomip = require('random-ip');
const dayjs = require('dayjs');

async function handle(req, res) {
    const { db } = req;

    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    var vps = await db.VPS.find({
        userID: req.session.user.id
    });

    if (vps.length >= user.serverLimit) return res.send(`VPS limit exceeded. ${vps.length}/${user.serverLimit}`);

    var { name, os, uptime } = req.query;
    if (!name || !os || !uptime) return res.send(`No name, os or uptime in query!`);

    name = String(name);
    while(name.includes('@')) name = name.replace('@', '');

    if (uptime != 'spot') return res.send('Invalid uptime');

    if (os != 'alpine' && os != 'debian') return res.send(`Invalid OS: ${os}`);
    if (os == 'debian' && user.balance < 100) return res.send(`You need at least 100 credits to create a debian vps!`);

    var vpsCount = await db.VPS.countDocuments();

    const node = await db.Node.findOne({ name: 'main' });
    if (!node) return res.send(`No main node available`);

    if (!vpsCount > node.maxVPS) return res.send(`No slots available! ${vpsCount}/${node.maxVPS}`);

    var sshPort = await db.Port.findOne({
        isUsed: false
    });
    if (!sshPort) return res.send(`No port available`);

    sshPort.isUsed = true;
    sshPort.intPort = 22;
    await sshPort.save();

    let ip = randomip('10.6.0.0', 16);

    const proxID = node.nextID;
    node.nextID++;
    await node.save();

    function makeid(length) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
          counter += 1;
        }
        return result;
    }

    let password = makeid(10);

    const userVPS = new db.VPS({
        userID: req.session.userID,
        proxID,

        name,
        ip,
        os,

        ram: 0.5,
        disk: 3,
        cpu: 1,

        sshPort: sshPort.port,
        password, // TODO: Generate password

        expiry: dayjs().add(3, 'hour'),
        status: 'creating'
    });

    if (os == 'debian') {
        user.balance -= 3;
    }

    userVPS.uptimeType = uptime;
    userVPS.canStartAgain = true;
    if (uptime == 'spot') {
        userVPS.uptimeLeft = 60 * 4;
        userVPS.defaultUptime = 60 * 4;

        userVPS.ram = 8;
        userVPS.disk = 10;
    } else {
        if (user.balance < 7) return res.send('You need at least 7 credits for 24/7 vps!');
        user.balance -= 7;
    }
    await user.save();
    await userVPS.save();

    sshPort.vpsID = userVPS._id;
    await sshPort.save();

    req.hook.send(`<@${process.env.ADMIN_ID}> :green_square: **CREATE** [${uptime}] - <@${req.session.userID}> ${name} - ${proxID} (${os} @ ${ip}) - ${sshPort.port}:22 - \`${password}\``);

    res.redirect(`/dash/vps/${userVPS.proxID}`);

    const {Worker} = require('worker_threads');
    const worker = new Worker('./create.js', {workerData: {
        name,
        proxID,
        ip,
        sshPort: {
            port: sshPort.port,
            intPort: sshPort.intPort
        },
        os,
        uptime
    }});
}

module.exports = handle;