var randomip = require('random-ip');
const dayjs = require('dayjs');
const fs = require('fs');
const shell = require('shelljs');

async function handle(req, res) {
    const { db } = req;

    var user = await db.User.findOne({
        userID: req.session.user.id
    });
    var vps = await db.VPS.find({
        userID: req.session.user.id
    });

    if (vps.length >= user.serverLimit) return res.send(`VPS limit exceeded. ${vps.length}/${user.serverLimit}`);

    const { name } = req.query;
    if (!name) return res.send(`No name in body`);

    var vpsCount = await db.VPS.countDocuments();

    const node = await db.Node.findOne({ name: 'main' });
    if (!node) return res.send(`No main node available`);

    if (!vpsCount > node.maxVPS) return res.send(`No slots available! ${vpsCount}/${node.maxVPS}`);

    var sshPort = await db.Port.findOne({
        isUsed: false
    });
    if (!sshPort) return res.send(`No port available`);

    sshPort.isUsed = true;
    sshPort.intPort = 22;
    await sshPort.save();

    let ip = randomip('10.5.0.1', 16);

    const proxID = node.nextID;
    node.nextID++;
    await node.save();

    const userVPS = new db.VPS({
        userID: req.session.userID,
        proxID,

        name,
        ip,

        sshPort: sshPort.port,
        password: 'changeme', // TODO: Generate password

        expiry: dayjs().add(2, 'day'),
        status: 'creating'
    });
    await userVPS.save();

    sshPort.vpsID = userVPS._id;
    await sshPort.save();

    req.hook.send(`<@${process.env.ADMIN_ID}> :green_square: **CREATE** - <@${req.session.userID}> ${name} - ${proxID} (${ip}) - ${sshPort.port}:22`);

    res.redirect(`/dash/vps/${userVPS.proxID}`);

    process.nextTick(async () => {
        console.log(`Creating ${name} with ${proxID} | ${ip} | ${sshPort.port}:22`);

        const sleep = (milliseconds) => {
            return new Promise(resolve => setTimeout(resolve, milliseconds))
        }

        var createCMD = getCreateCMD('alpine-3.20-default_20240908_amd64.tar.xz', proxID, userVPS);
        console.log(createCMD);
        var vpsCreateRes = await shell.exec(createCMD);

        if (vpsCreateRes.stderr.length > 0) {
            userVPS.status = 'error';
            await userVPS.save();

            return console.error(vpsCreateRes.stderr);
        }

        await shell.exec(`cp /etc/pve/firewall/100.fw /etc/pve/firewall/${proxID}.fw`);

        await shell.exec(`pct exec ${proxID} sh -- -c "apk update"`);
        await shell.exec(`pct exec ${proxID} sh -- -c "apk add openssh zsh git wget curl htop sudo bash htop neofetch"`);

        // SSH
        await shell.exec(`pct exec ${proxID} sh -- -c "echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config"`);
        await shell.exec(`pct exec ${proxID} sh -- -c "rc-update add sshd"`);

        // MOTD
        await shell.exec(`pct exec ${proxID} sh -- -c "echo '\tFree VPS by ErtixNodes.' > /etc/motd"`);

        // SHELL
        await shell.exec(`pct exec ${proxID} sh -- -c "bash <(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"`);
        await shell.exec(`pct exec ${proxID} sh -- -c "sed -i 's#/bin/ash#/bin/zsh#' /etc/passwd"`);

        // COMMAND LOGGER
        await shell.exec(`pct exec ${proxID} sh -- -c "wget https://raw.githubusercontent.com/ErtixNodes/pkg/feat-ci/setup.sh -O /pkg.sh"`);
        await shell.exec(`pct exec ${proxID} zsh -- /pkg.sh`);

        // SSH Port
        addForward(sshPort.port, 22, ip);

        userVPS.status = 'active';
        await userVPS.save();

        console.log(`${name} - Create done!`);
    });
}

function getCreateCMD(path, proxID, data) {
    // pct create $ID /var/lib/vz/template/cache/debian-12-standard_12.2-1_amd64.tar.zst --hostname=vps$ID --swap=4096 --memory=1024 --cmode=shell
    // --net0 name=eth0,bridge=vmbr0,firewall=1,gw=10.5.0.1,ip=$IP/16,rate=3 --ostype=debian --password $PASSWORD --start=1 --unprivileged=1 --cores=1
    // --features fuse=1,nesting=1,keyctl=1

    var cmd = '';
    cmd += 'pct create ';
    cmd += proxID;

    cmd += ` /var/lib/vz/template/cache/${path} `
    cmd += `--swap=256 `;
    cmd += `--hostname=alpine${proxID} `;
    cmd += `--memory=512 `;
    cmd += `--cmode=shell `;
    cmd += `--net0 name=eth0,bridge=vmbr0,firewall=1,gw=10.5.0.1,ip=${data.ip}/16,rate=3 `;
    cmd += `--ostype=alpine `;
    cmd += `--password ${data.password} `;
    cmd += `--start=1 `;
    cmd += `--unprivileged=1 `;
    cmd += `--cores=1 `;
    cmd += `--features fuse=1,nesting=1,keyctl=1 `;
    cmd += `--rootfs local:3`;

    return cmd;
}

async function addForward(port, intPort, ip) {

    console.log(`Adding :${port} -> ${ip}:${intPort}`);
    fs.writeFileSync(`/port/${port}.sh`, `iptables -t nat -A PREROUTING -p TCP --dport ${port} -j DNAT --to-destination ${ip}:${intPort}`);

    var a = await shell.exec(`bash /port/${port}.sh`);

    return a;
}

module.exports = handle;