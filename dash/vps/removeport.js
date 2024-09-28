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

    var newPort = await db.Port.findOne({
        isUsed: true,
        vpsID: vps._id,
        port: req.params.port
    });
    if (!newPort) return res.send(`Invalid port`);

    await removeForward(newPort.port, newPort.port, vps.ip);

    newPort.isUsed = false;
    newPort.intPort = null;
    newPort.vpsID = null;
    await newPort.save();

    req.hook.send(`<@${process.env.ADMIN_ID}> :blue_square: **FORWARD** - <@${req.session.userID}> ${vps.name} - :${newPort.port} -> \`null\``);

    res.redirect(`/dash/vps/${vps.proxID}#ports`);
}

async function removeForward(port, intPort, ip) {

    console.log(`Adding :${port} -> ${ip}:${intPort}`);

    try {
        await shell.exec(`iptables -t nat -D PREROUTING -p TCP --dport ${port} -j DNAT --to-destination ${ip}:${intPort}`);
        fs.rmSync(`/port/${port}.sh`);
    } catch (e) {
        console.log('Failed to remove port', String(e));
    }
}

module.exports = handle;