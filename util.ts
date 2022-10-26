import { spawn } from "child_process";
import os from "os";
import fs from "fs/promises";

const nssdbArg = `sql:${os.homedir()}/.pki/nssdb`;

export function process(name: string, params: string[]): Promise<{data: Buffer, error: Buffer}> {
    return new Promise((resolve, reject) => {
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];

        const proc = spawn(name, params);

        proc.stdout.on('data', (data: Buffer) => {
            stdout.push(data);
        });

        proc.stderr.on('data', (data: Buffer) => {
            stderr.push(data);
        });

        proc.on('close', (code) => {
            if (code != 0) {
                reject(new Error(Buffer.concat(stderr).toString()));
            }
            resolve({data: Buffer.concat(stdout), error: Buffer.concat(stderr)});
        });
    });
}

export async function getPfxByName(name: string): Promise<Buffer> {
    const dir = await fs.mkdtemp('/tmp/tnscm');
    let result = null;
    try {
        await process('pk12util', ['-d', nssdbArg, '-o', dir + '/p', '-n', name, '-W', '']);
        result = await fs.readFile(dir + '/p');
    } finally {
        await fs.rm(dir, {recursive: true});
    }
    return result;
}

export async function installPfxCert(pfx: Buffer) {
    const dir = await fs.mkdtemp('/tmp/tnscm');
    try {
        await fs.writeFile(dir + '/p', pfx, {encoding: 'binary'});
        await process('pk12util', ['-d', nssdbArg, '-i', dir + '/p', '-n', 'ASD', '-W', '']);
    } finally {
        await fs.rm(dir, {recursive: true});
    }
}

export async function removePfxCertByName(name: string) {
    await process('certutil', ['-d', nssdbArg, '-D', '-n', name]);
}
