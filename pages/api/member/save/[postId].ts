import type { NextApiRequest, NextApiResponse } from 'next';
import { RestError } from '@azure/data-tables';
import { getToken } from "next-auth/jwt"

import AzureTableClient from '../../../../modules/AzureTableClient';

import { IMemberPostMapping } from '../../../../lib/interfaces';
import { MemberInfo } from '../../../../lib/types';
import { verifyId, response405, response500, log } from '../../../../lib/utils';

// This interface only accepts POST (save post) method
// Use 'api/post/info/[postId]' to GET post info
//
// Info required:
// token: JWT;
// postId: string;
//
export default async function SavePost(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    if ('POST' !== method) {
        response405(req, res);
        return;
    }
    //// Verify identity ////
    const token = await getToken({ req });
    if (!(token && token?.sub)) {
        res.status(400).send('Invalid identity');
        return;
    }
    //// Verify post id ////
    const { postId } = req.query;
    if (!('string' === typeof postId && verifyId(postId, 10))) {
        res.status(400).send('Invalid post id');
        return;
    }
    try {
        const { sub: memberId } = token;
        const savedMappingTableClient = AzureTableClient('SavedMapping');
        const savedMappingQuery = savedMappingTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${memberId}' and RowKey eq '${postId}'` } });
        //// [!] attemp to reterieve entity makes the probability of causing RestError ////
        const savedMappingQueryResult = await savedMappingQuery.next();
        if (!savedMappingQueryResult.value) {
            //// [!] no record ////
            await savedMappingTableClient.upsertEntity<IMemberPostMapping>({ partitionKey: memberId, rowKey: postId, IsActive: true }, 'Replace');
        } else {
            const { IsActive: isActive } = savedMappingQueryResult.value?.IsActive;
            await savedMappingTableClient.upsertEntity<IMemberPostMapping>({ partitionKey: memberId, rowKey: postId, IsActive: !isActive }, 'Merge');
        }
        res.status(200).send('Post saved/unsaved');
    }
    catch (e: any) {
        let msg;
        if (e instanceof RestError) {
            msg = 'Was trying communicating with azure table storage.';
        } else {
            msg = `Uncategorized. ${e?.msg}`;
        }
        if (!res.headersSent) {
            response500(res, msg);
        }
        log(msg, e);
        return;
    }

}