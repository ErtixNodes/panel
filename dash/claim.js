async function handle(req, res) {
    const { db } = req;

    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    
    console.log(req.get('Referrer'), req.get('Referer'));

    const { token } = req.params;

    if (!token) return res.status(400).type('txt').send('No token provided');

    var tok = await db.Earn.findOne({
        token
    });
    if (!tok) return res.status(403).type('txt').send('Invalid token');

    if (tok.isUsed == true) return res.status(403).type('txt').send('Token already used');

    var user = await db.User.findOne({
        userID: tok.userID
    });
    if (!user) return res.status(403).type('txt').send('Invalid user');

    user.balance = user.balance + tok.creditCount;
    user.notif = false;
    await user.save();

    tok.isUsed = true;
    await tok.save();

    return res.redirect(`/dash`);
}

module.exports = handle;