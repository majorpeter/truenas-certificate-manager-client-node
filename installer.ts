import os from 'os';
import fs from 'fs';
import { process as _proc } from './util';

const userDir = os.homedir() + '/.config/systemd/user/';
const serviceName = 'tnscm.service';

async function install() {
    try {
        await fs.promises.access(userDir);
    } catch (error) {
        await fs.promises.mkdir(userDir, {recursive: true});
        console.log(`Created ${userDir}`);
    }

    await fs.promises.writeFile(userDir + serviceName,
`[Unit]
Description=truenas-client-certificate-manager client
After=network.target

[Service]
SyslogIdentifier=tnscm
ExecStart=${process.execPath} ${__dirname + '/index.js'}

[Install]
WantedBy=default.target
`);
        console.log(`Created unit file ${serviceName}`);

        await _proc('systemctl', ['--user', 'enable', serviceName]);
        console.log('Successfully installed');
}

install();
