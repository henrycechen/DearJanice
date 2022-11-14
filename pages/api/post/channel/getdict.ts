import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from "next-auth/jwt"

import AzureTableClient from '../../../../modules/AzureTableClient';
import { PostChannel } from '../../../../lib/types';
import { response405, response500 } from '../../../../lib/utils';


export default async function GetList(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    if ('GET' !== method) {
        response405(req, res);
        return;
    }
    try {
        const token = await getToken({ req });
        // Step #0 verify session
        if (!token) {
            res.status(401).send('Unauthorized');
            return;
        }
        // Step #2 look up channels from [Table]
        const loginCredentialsMappingTableClient = AzureTableClient('PostChannel');
        const postChannelQuery = loginCredentialsMappingTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq 'PostChannel' and IsActive eq true` } });
        // [!] attemp to reterieve entity makes the probability of causing RestError
        let postChannelQueryResult = await postChannelQuery.next();
        if (!postChannelQueryResult.value) {
            response500(res, 'No records of post channels');
            return;
        }
        const postChannelDict: { [key: string]: PostChannel } = {};
        do {
            const { rowKey, CH, EN, SvgIconPath } = postChannelQueryResult.value
            postChannelDict[rowKey] = {
                channelId: rowKey,
                channelName: {
                    ch: CH,
                    en: EN
                },
                svgIconPath: SvgIconPath
            }

            postChannelQueryResult = await postChannelQuery.next();
        } while (!postChannelQueryResult.done)
        // Step #3 response with post channel list
        res.status(200).send(postChannelDict);
    } catch (e) {
        console.log(e);

        response500(res, `Uncategorized Error occurred. ${e}`);
        return;
    }
}