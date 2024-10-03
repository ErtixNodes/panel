async function handle(req, res) {
    const { db } = req;

    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    
    const nextEarnCuty = user.nextEarnCuty;

    var timeLeft = nextEarnCuty - Date.now();

    if (timeLeft < 0) return res.send('Ready!');

    res.send(`In ${Math.ceil(timeLeft/1000/60/60)} hours`);
}

module.exports = handle;