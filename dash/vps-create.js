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

    let ip = randomip('10.5.0.1', 16);

    const proxID = node.nextID;
    node.nextID++;
    await node.save();

    const userVPS = new db.VPS({
        userID: req.session.userID,
        proxID,

        name,
        ip,

        expiry: dayjs().add(2, 'day'),
        status: 'creating'
    });
    await userVPS.save();

    res.send('Creating...');
}

module.exports = handle;