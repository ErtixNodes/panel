async function handle(req, res) {
    const { db } = req;

    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    var vps = await db.VPS.findOne({
        userID: req.session.user.id,
        proxID: req.params.id
    });
    if (!vps) return res.redirect('/dash');

    var vpsPorts = await db.Port.find({
        vpsID: vps._id
    });

    res.render('dash/vps', { req, res, user, vps, vpsPorts });
}

module.exports = handle;