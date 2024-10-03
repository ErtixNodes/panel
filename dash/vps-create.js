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

    var { name, os } = req.query;
    if (!name || !os) return res.send(`No name or os in body`);

    name = String(name);
    while(name.includes('@')) name = name.replace('@', '');

    if (os != 'alpine' && os != 'debian') return res.send(`Invalid OS: ${os}`);
    if (os == 'debian' && user.balance < 3) return res.send(`You need at least 3 credits to create a debian vps!`);

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

        sshPort: sshPort.port,
        password, // TODO: Generate password

        expiry: dayjs().add(2, 'day'),
        status: 'creating'
    });
    await userVPS.save();

    sshPort.vpsID = userVPS._id;
    await sshPort.save();

    if (os == 'debian') {
        user.balance -= 3;
        await user.save();
    }

    req.hook.send(`<@${process.env.ADMIN_ID}> :green_square: **CREATE** - <@${req.session.userID}> ${name} - ${proxID} (${os} @ ${ip}) - ${sshPort.port}:22 - \`${password}\``);

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
        os
    }});
}

module.exports = handle;