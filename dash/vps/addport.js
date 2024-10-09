const shell = require('shelljs');
const fs = require('fs');

async function handle(req, res) {
    const { db } = req;

    res.type('txt');

    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    var vps = await db.VPS.findOne({
        userID: req.session.user.id,
        proxID: req.params.id
    });
    if (!vps) return res.send('UNKNOWN');

    var portsUsed = await db.Port.countDocuments({
        vpsID: vps._id
    });
    if (portsUsed > 5) return res.send(`Port limit: ${portsUsed}/5`);

    var newPort = await db.Port.findOne({
        isUsed: false
    });
    if (!newPort) return res.send(`No port available`);

    newPort.isUsed = true;
    newPort.intPort = newPort.port;
    newPort.vpsID = vps._id;
    await newPort.save();

    await addForward(newPort.port, newPort.port, vps.ip);

    req.hook.send(`<@${process.env.ADMIN_ID}> :blue_square: **FORWARD** - <@${req.session.userID}> ${vps.name} - :${newPort.port} -> VPS`);

    res.redirect(`/dash/vps/${vps.proxID}`);
}

async function addForward(port, intPort, ip) {

    console.log(`Adding :${port} -> ${ip}:${intPort}`);
    fs.writeFileSync(`/port/${port}.sh`, `iptables -t nat -A PREROUTING -p TCP --dport ${port} -j DNAT --to-destination ${ip}:${intPort}`);

    var a = await shell.exec(`bash /port/${port}.sh`);

    return a;
}

module.exports = handle;