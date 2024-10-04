async function handle(req, res) {
    const { db } = req;

    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    if (!user) {
        req.session.destroy();
        return res.redirect('/dash');
    }
    res.render('dash/create', { req, res, user });
}

module.exports = handle;