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

    const { name } = req.query;
    if (!name) return res.send(`No name in body`);

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

    const userVPS = new db.VPS({
        userID: req.session.userID,
        proxID,

        name,
        ip,

        sshPort: sshPort.port,
        password: 'changeme', // TODO: Generate password

        expiry: dayjs().add(2, 'day'),
        status: 'creating'
    });
    await userVPS.save();

    sshPort.vpsID = userVPS._id;
    await sshPort.save();

    req.hook.send(`<@${process.env.ADMIN_ID}> :green_square: **CREATE** - <@${req.session.userID}> ${name} - ${proxID} (${ip}) - ${sshPort.port}:22`);

    res.redirect(`/dash/vps/${userVPS.proxID}`);

    const {Worker} = require('worker_threads');
    const worker = new Worker('./create.js', {workerData: {
        name,
        proxID,
        ip,
        sshPort: {
            port: sshPort.port,
            intPort: sshPort.intPort
        }
    }});
}

module.exports = handle;