const shell = require('shelljs');

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

    var status = await shell.exec(`pct status ${vps.proxID}`);

    if (status.stderr.length > 0) return res.send(status.stderr);

    res.send(String(status.stdout).replace('status: ', '').replace('\n', ''));
}

module.exports = handle;