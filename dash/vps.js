async function handle(req, res) {
    const { db } = req;

    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    // var vps = await db.VPS.find({
    //     userID: req.session.user.id
    // });
    res.render('dash/vps', { req, res, vps, user });
}

module.exports = handle;