async function handle(req, res) {
    const { db } = req;

    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    if (!user) {
        req.session.destroy();
        return res.redirect('/dash');
    }
    var vps = await db.VPS.find({
        userID: req.session.user.id
    });
    res.render('dash/index', { req, res, vps, user });
}

module.exports = handle;