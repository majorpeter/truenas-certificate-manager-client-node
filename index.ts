import https from "https";
import axios, {AxiosResponseHeaders} from "axios";
import { readFileSync } from "fs";
import { argv } from "process";

import { getPfxByName as getPfxCertByName, installPfxCert, removePfxCertByName } from "./util";

const config: {
    caUrl: string;
    requiredRemainingDays: number;
} = JSON.parse(readFileSync(__dirname + '/config.json').toString());

const pfxName = 'tnscm';

async function renewCert(force: boolean): Promise<number> {
    const httpsAgent = new https.Agent({
        pfx: await getPfxCertByName(pfxName)
    });

    const remainingReqResult  = await axios.get(config.caUrl + '/remaining', {httpsAgent});
    if (remainingReqResult.status != 200) {
        console.log('Getting remainig cert days failed');
        return -1;
    }

    if (!force) {
        const remainingDays = parseInt(remainingReqResult.data);
        if (remainingDays >= config.requiredRemainingDays) {
            console.log(`Certificate still valid for ${remainingDays} days, no need to renew.`);
            return 0;
        }
    }

    const result = await axios.post(config.caUrl + '/renew', {}, {
        responseType: 'blob',
        responseEncoding: 'binary',
        httpsAgent
    });
    if (result.status == 200) {
        if ((<AxiosResponseHeaders> result.headers).getContentType() == 'application/x-pkcs12') {
            console.log('Received renewed cert');
            await removePfxCertByName(pfxName);
            await installPfxCert(result.data);
            console.log('Installed new cert!');
            return 0;
        }
    }
    return -2;
}

const args = argv.slice(2);
const force = args.indexOf('--force') >= 0;
renewCert(force);
