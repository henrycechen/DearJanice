import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { RestError } from '@azure/storage-blob';
import { MongoError } from 'mongodb';

import AtlasDatabaseClient from '../../../../../modules/AtlasDatabaseClient';

import { logWithDate, response405, response500 } from '../../../../../lib/utils/general';
import { verifyId } from '../../../../../lib/utils/verify';
import { IMemberComprehensive } from '../../../../../lib/interfaces/member';
import { getTimeBySecond } from '../../../../../lib/utils/create';

const fname = UpdateGender.name;

/** UpdateGender v0.1.1
 * 
 * Last update: 16/02/2023
 * 
 * This interface ONLY accepts PUT requests
 * 
 * Info required for PUT requests
 * - token: JWT
 * - gender: number (body, -1 | 0 | 1)
*/


export default async function UpdateGender(req: NextApiRequest, res: NextApiResponse) {

    const { method } = req;
    if ('PUT' !== method) {
        response405(req, res);
        return;
    }

    res.status(404);
    return;

    // //// Verify identity ////
    // const token = await getToken({ req });
    // if (!(token && token?.sub)) {
    //     res.status(401).send('Unauthorized');
    //     return;
    // }
    // const { sub: tokenId } = token;

    // //// Verify member id ////
    // const { isValid, category, id: memberId } = verifyId(req.query?.memberId);

    // if (!(isValid && 'member' === category)) {
    //     res.status(400).send('Invalid member id');
    //     return;
    // }

    // //// Match the member id in token and the one in request ////
    // if (tokenId !== memberId) {
    //     res.status(400).send('Requested member id and identity not matched');
    //     return;
    // }

    // //// Declare DB client ////
    // const atlasDbClient = AtlasDatabaseClient();
    // try {
    //     await atlasDbClient.connect();

    //     //// Verify member status ////
    //     const memberComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<IMemberComprehensive>('member');
    //     const memberComprehensiveQueryResult = await memberComprehensiveCollectionClient.findOne({ memberId }, { projection: { _id: 0, status: 1 } });
    //     if (null === memberComprehensiveQueryResult) {
    //         throw new Error(`Member attempt to update (PUT) gender but have no document (of IMemberComprehensive, member id: ${memberId}) in [C] memberComprehensive`);
    //     }

    //     const { status: memberStatus } = memberComprehensiveQueryResult;
    //     if (0 > memberStatus) {
    //         res.status(403).send('Method not allowed due to member suspended or deactivated');
    //         await atlasDbClient.close();
    //         return;
    //     }

    //     //// Verify gender ////
    //     const { gender } = req.body;
    //     if (!('number' === typeof gender && [-1, 0, 1].includes(gender))) {
    //         // TODO: Place nickname examination method here
    //         res.status(400).send('Invalid gender code');
    //         return;
    //     }

    //     //// Update properties (of IMemberComprehensive) in [C] memberComprehensive ////
    //     const memberComprehensiveUpdateResult = await memberComprehensiveCollectionClient.updateOne({ memberId }, {
    //         $set: {
    //             gender,
    //             lastGenderUpdatedTimeBySecond: getTimeBySecond()
    //         }
    //     })

    //     if (!memberComprehensiveUpdateResult.acknowledged) {
    //         logWithDate(`Failed to update gender, lastGenderUpdatedTimeBySecond (of IMemberComprehensive, member id: ${memberId}) in [C] memberComprehensive`, fname);
    //         res.status(500).send(`Attempt to update gender`);
    //         return;
    //     }

    //     res.status(200).send('Gender updated');
    //     await atlasDbClient.close();
    // } catch (e: any) {
    //     let msg;
    //     if (e instanceof RestError) {
    //         msg = `Attempt to communicate with azure table storage.`;
    //     } else if (e instanceof MongoError) {
    //         msg = `Attempt to communicate with atlas mongodb.`;
    //     } else {
    //         msg = `Uncategorized. ${e?.msg}`;
    //     }
    //     if (!res.headersSent) {
    //         response500(res, msg);
    //     }
    //     logWithDate(msg, fname, e);
    //     await atlasDbClient.close();
    //     return;
    // }
}