import https from "https";
import axios, {AxiosResponseHeaders} from "axios";
import { readFileSync } from "fs";

import { getPfxByName as getPfxCertByName, installPfxCert, removePfxCertByName } from "./util";

const config: {
    caUrl: string;
    requiredRemainingDays: number;
} = JSON.parse(readFileSync('./config.json').toString());

const pfxName = 'tnscm';

(async () => {
    const httpsAgent = new https.Agent({
        pfx: await getPfxCertByName(pfxName)
    });

    const remainingReqResult  = await axios.get(config.caUrl + '/remaining', {httpsAgent});
    if (remainingReqResult.status != 200) {
        console.log('Getting remainig cert days failed');
        return -1;
    }

    const remainingDays = parseInt(remainingReqResult.data);
    if (remainingDays >= config.requiredRemainingDays) {
        console.log(`Certificate still valid for ${remainingDays} days, no need to renew.`);
        return 0;
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
        }
    }
})();
