const fetch = require('node-fetch');

function genToken(length) {
    //edit the token allowed characters
    var a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    var b = [];
    for (var i = 0; i < length; i++) {
        var j = (Math.random() * (a.length - 1)).toFixed(0);
        b[i] = a[j];
    }
    return b.join("");
}


async function handle(req, res) {
    const { db } = req;

    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    
    const nextEarnCuty = user.nextEarnCuty;

    var timeLeft = nextEarnCuty - Date.now();

    if (timeLeft > 0) return res.send(`In ${Math.ceil(timeLeft/1000/60/60)} hours`);

    var tok = await db.Earn.findOne({
        userID: user.userID,
        isUsed: false
    });

    if (tok && tok.url) return res.redirect(tok.url);

    var token = genToken(32);

    var url = await fetch(`https://api.cuty.io/quick?token=${process.env.CUTY}&url=${encodeURIComponent(`${process.env.URL}/dash/earn/claim/${token}`)}&format=text`);
    url = await url.text();

    user.nextEarnCuty = Date.now() + (1000 * 60 * 60 * 24);
    await user.save();

    const earn = new db.Earn({
        userID: user.userID,
        isUsed: false,
        creditCount: 7,
        token,
        url
    });
    await earn.save();

    res.redirect(url);
}

module.exports = handle;