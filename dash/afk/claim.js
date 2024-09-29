async function handle(req, res) {
    const { db } = req;

    var user = await db.User.findOne({
        userID: req.session.user.id
    });

    if (!user.nextAFK) user.nextAFK = Date.now()-1000;

    var timeLeft = user.nextAFK - Date.now();

    // console.log(timeLeft);

    if (timeLeft > 0) return res.send('Ratelimit');

    user.balance += (0.05 * 5);
    user.nextAFK = Date.now()+(5*60*1000);
    await user.save();

    res.send('OK');
}

module.exports = handle;