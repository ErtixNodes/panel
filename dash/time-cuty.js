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

/* router.get('/earn/cuty/time', async (req, res) => {
    var userId = req.session.user.id;

    if (cooldowns[userId]) {
        const lastEarnTime = new Date(cooldowns[userId]);
        const now = new Date();
        const timeDiff = now - lastEarnTime;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 24) {
            var nextEarnTime = new Date(lastEarnTime.getTime() + 24 * 60 * 60 * 1000);
            nextEarnTime = dayjs(nextEarnTime);
            // var diff = Math.floor((nextEarnTime.getTime() - Date.now())) / 1000;
            // var min = diff;
            // var o = Math.floor((diff / 60));
            // return res.type('txt').send(`${Math.round(diff)}s | ${o}m | ${Math.floor((nextEarnTime.getTime() - Date.now()) / 1000 / 60 / 60)}h`);
            // return res.type('txt').send(dayjs(Date.now()).to(nextEarnTime));

            var s = nextEarnTime.diff(Date.now(), 'second');
            var m = nextEarnTime.diff(Date.now(), 'minute');
            var h = nextEarnTime.diff(Date.now(), 'hour');


            return res.type('txt').send(`${h}h | ${m}m | ${s}s`);
        }
    }

    res.type('txt').send('Ready');
}); */