const dayjs = require('dayjs');

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

    if (vps.uptimeType != 'spot') return res.send('Only supported for spot vps!');

    var userCredit = user.balance;
    if (userCredit < 10) return res.send('You need more credits: 10 needed');

    user.balance -= 10;
    await user.save();

    vps.canStartAgain = true;
    vps.uptimeLeft += 60;
    await vps.save();

    req.hook.send(`:orange_square: **SPOT-ADD** - <@${req.session.userID}> ${vps.name} (+60>${vps.uptimeLeft})`);

    res.redirect(`/dash/vps/${vps.proxID}`);
}

module.exports = handle;