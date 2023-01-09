import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt'
import { RestError } from '@azure/data-tables';
import { MongoError } from 'mongodb';

import AzureTableClient from '../../../../../modules/AzureTableClient';
import AtlasDatabaseClient from "../../../../../modules/AtlasDatabaseClient";

import { IMemberComprehensive, } from '../../../../../lib/interfaces';
import { verifyId, response405, response500, log } from '../../../../../lib/utils';

/** This interface ONLY accepts DELETE requests
 * 
 * Info required for DELETE requests
 * token: JWT
 * postId: string (query)
*/

export default async function DeleteCreationById(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    if ('DELETE' !== method) {
        response405(req, res);
        return;
    }
    //// Verify identity ////
    const token = await getToken({ req });
    if (!(token && token?.sub)) {
        res.status(400).send('Invalid identity');
        return;
    }
    // Verify post id
    const { isValid, category, id: postId } = verifyId(req.body?.postId);
    if (!(isValid && 'post' === category)) {
        res.status(400).send('Invalid post id');
        return;
    }
    //// Declare DB client ////
    const atlasDbClient = AtlasDatabaseClient();
    try {
        const { sub: memberId } = token;
        //// Verify member status ////
        const memberComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<IMemberComprehensive>('member');
        const memberComprehensiveQueryResult = await memberComprehensiveCollectionClient.findOne({ memberId });
        if (null === memberComprehensiveQueryResult) {
            throw new Error(`Member was trying delete creation but have no document (of IMemberComprehensive, member id: ${memberId}) in [C] memberComprehensive`);
        }
        const { status: memberStatus } = memberComprehensiveQueryResult;
        if (0 > memberStatus) {
            res.status(403).send('Method not allowed due to member suspended or deactivated');
            await atlasDbClient.close();
            return;
        }
        await atlasDbClient.close();
        // Delete record (of IMemberPostMapping) in [RL] HistoryMapping
        const noticeTableClient = AzureTableClient('HistoryMapping');
        await noticeTableClient.deleteEntity(memberId, postId);

        // TODO: update statistics


        res.status(200).send('Delete browsing history success');
    } catch (e: any) {
        let msg;
        if (e instanceof RestError) {
            msg = 'Was trying communicating with azure table storage.';
        } else if (e instanceof MongoError) {
            msg = 'Was trying communicating with atlas mongodb.';
        } else {
            msg = `Uncategorized. ${e?.msg}`;
        }
        if (!res.headersSent) {
            response500(res, msg);
        }
        log(msg, e);
        await atlasDbClient.close();
        return;
    }
}