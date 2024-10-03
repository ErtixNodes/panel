async function handle(req, res) {
    const { db } = req;

    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    res.render('dash/afk', { req, res, user });
}

module.exports = handle;