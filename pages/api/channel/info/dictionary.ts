import type { NextApiRequest, NextApiResponse } from 'next';
import { RestError } from '@azure/data-tables';

import AzureTableClient from '../../../../modules/AzureTableClient';
import { IChannelInfoDictionary } from '../../../../lib/interfaces/channel';
import { response405, response500, logWithDate } from '../../../../lib/utils/general';
const fname = GetChannelInfoDictionary.name;

/** GetChannelInfoDictionary v0.1.1
 * 
 * Last update: 21/02/2023
 * 
 * This interface ONLY accepts GET requests
 * 
 * No info required for GET requests
 * 
 */

export default async function GetChannelInfoDictionary(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    if ('GET' !== method) {
        response405(req, res);
        return;
    }
    try {
        // Step #1 look up channels info from [T] ChannelIndo
        const channelInfoTableClient = AzureTableClient('ChannelInfo');
        const channelInfoQuery = channelInfoTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq 'Info' and IsActive eq true` } });
        // [!] attemp to reterieve entity makes the probability of causing RestError
        let channelInfoQueryResult = await channelInfoQuery.next();
        if (!channelInfoQueryResult.value) {
            response500(res, 'No records of channel info dictionary');
            return;
        }
        const infoDict: IChannelInfoDictionary = {};
        do {
            const { rowKey, TW, CN, EN, SvgIconPath } = channelInfoQueryResult.value
            infoDict[rowKey] = {
                channelId: rowKey,
                name: {
                    tw: TW,
                    cn: CN,
                    en: EN
                },
                svgIconPath: SvgIconPath
            }
            channelInfoQueryResult = await channelInfoQuery.next();
        } while (!channelInfoQueryResult.done)
        // Step #2 response with post channel list
        res.status(200).send(infoDict);
    } catch (e: any) {
        let msg: string;
        if (e instanceof RestError) {
            msg = `Attempt to communicate with azure table storage.`;
        } else {
            msg = `Uncategorized. ${e?.msg}`;
        }
        if (!res.headersSent) {
            response500(res, msg);
        }
        logWithDate(msg, fname, e);
        return;
    }
}