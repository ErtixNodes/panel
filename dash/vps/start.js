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

    shell.exec(`pct start ${vps.proxID}`);

    res.redirect(`/dash/vps/${vps.proxID}`);
}

module.exports = handle;