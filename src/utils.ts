import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { AccountInfo } from '@solana/web3.js';
import { Metadata } from './metaplex/classes';

const DATA_DIRECTORY = '../src/data/';
const METADATA_FILE = 'metadata-cache.json';

export const loadData = (file = `${DATA_DIRECTORY}3d-soldiers.json`): string[] => {
    const defaultJson = [];
    const thePath = path.resolve(__dirname, file);
    try {
        return fs.existsSync(thePath) ? JSON.parse(fs.readFileSync(thePath).toString()) : defaultJson;
    } catch {
        return defaultJson;
    }
};

export const saveMetaData = (metadata: string, directory = DATA_DIRECTORY, fileName = METADATA_FILE): void => {
    const theDirectory = path.resolve(__dirname, directory);
    if (!fs.existsSync(theDirectory)) {
        fs.mkdirSync(theDirectory);
    }
    const thePath = path.resolve(__dirname, directory, fileName);
    fs.writeFileSync(thePath, metadata);
};

export function chunks<T>(array: T[], size: number): T[][] {
    return Array.apply(0, new Array(Math.ceil(array.length / size))).map((_, index) =>
        array.slice(index * size, (index + 1) * size),
    );
}

export const getMultipleAccounts = async (connection: any, keys: string[], commitment: string) => {
    const result = await Promise.all(
        chunks(keys, 99).map((chunk) => getMultipleAccountsCore(connection, chunk, commitment)),
    );

    const array = result
        .map(
            (a) =>
                a.array
                    .map((acc) => {
                        if (!acc) {
                            return undefined;
                        }

                        const { data, ...rest } = acc;
                        const obj = {
                            ...rest,
                            data: Buffer.from(data[0], 'base64'),
                        } as AccountInfo<Buffer>;
                        return obj;
                    })
                    .filter((_) => _) as AccountInfo<Buffer>[],
        )
        .flat();
    return { keys, array };
};

const getMultipleAccountsCore = async (connection: any, keys: string[], commitment: string) => {
    const args = connection._buildArgs([keys], commitment, 'base64');

    const unsafeRes = await connection._rpcRequest('getMultipleAccounts', args);
    if (unsafeRes.error) {
        throw new Error('failed to get info about account ' + unsafeRes.error.message);
    }

    if (unsafeRes.result.value) {
        const array = unsafeRes.result.value as AccountInfo<string[]>[];
        return { keys, array };
    }

    // TODO: fix
    throw new Error();
};

export const getImageUrl = async (meta: Metadata): Promise<string> => {
    return await fetch(meta.data.uri).then((result) => {
        return result.json().then((json) => {
            return (json as any).image;
        });
    });
};