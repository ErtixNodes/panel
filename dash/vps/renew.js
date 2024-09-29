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

    var userCredit = user.balance;
    if (userCredit < 20) return res.send('You need more credits: 20 needed');

    user.balance -= 20;
    await user.save();

    vps.expiry = dayjs(vps.expiry).add(2, 'day');
    await vps.save();

    req.hook.send(`<@${process.env.ADMIN_ID}> :orange_square: **RENEW** - <@${req.session.userID}> ${vps.name}`);

    res.redirect(`/dash/vps/${vps.proxID}`);
}

module.exports = handle;