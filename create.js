const fs = require('fs');
const shell = require('shelljs');

const { workerData } = require('worker_threads');

const { name, proxID, ip, sshPort } = workerData;

const db = require('./db');
 
async function main(name, proxID, ip, sshPort) {
    console.log(`Creating ${name} with ${proxID} | ${ip} | ${sshPort.port}:22`);

    const sleep = (milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }

    const userVPS = await db.VPS.findOne({
        proxID
    });

    if (!userVPS) return console.error(`VPS not found: ${proxID}`);

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

main().then(() => {
    db.mongoose.connection.close();
    console.log('DB connection closed');
});