import type { NextApiRequest, NextApiResponse } from 'next';
import { RestError } from '@azure/data-tables';
import { MongoError } from 'mongodb';

import AtlasDatabaseClient from '../../../../../modules/AtlasDatabaseClient';

import { IMemberComprehensive } from '../../../../../lib/interfaces/member';
import { response405, response500, logWithDate } from '../../../../../lib/utils/general';
import { verifyId } from '../../../../../lib/utils/verify';

const fnn = `${GetMemberInfoById.name} (API)`;

/**
 * This interface ONLY accepts GET requests
 * 
 * Info required for ONLY requests
 * -     token: JWT
 * -     id: string (query, member id)
 * 
 * Last update:
 * - 28/04/2023 v0.1.2
*/

export default async function GetMemberInfoById(req: NextApiRequest, res: NextApiResponse) {

    const { method } = req;
    if ('GET' !== method) {
        response405(req, res);
        return;
    }

    //// Verify member id ////
    const { isValid, category, id: memberId } = verifyId(req.query?.memberId);
    if (!(isValid && 'member' === category)) {
        res.status(400).send('Invalid member id');
        return;
    }

    //// Declare DB client ////
    const atlasDbClient = AtlasDatabaseClient();
    try {
        await atlasDbClient.connect();

        //// Verify member status ////
        const memberComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<IMemberComprehensive>('member');
        const memberComprehensiveQueryResult = await memberComprehensiveCollectionClient.findOne({ memberId }, {
            projection: {
                _id: 0,
                memberId: 1,

                providerId: 1,
                registeredTimeBySecond: 1,
                verifiedTimeBySecond: 1,
                emailAddress: 1,

                nickname: 1,
                briefIntro: 1,
                gender: 1,
                birthdayBySecond: 1,

                status: 1,
                allowPosting: 1,
                allowCommenting: 1,
                allowKeepingBrowsingHistory: 1,
                allowVisitingFollowedMembers: 1,
                allowVisitingSavedPosts: 1,
                hidePostsAndCommentsOfBlockedMember: 1,
            }
        });

        if (null === memberComprehensiveQueryResult) {
            res.status(404).send('Member not found');
            await atlasDbClient.close();
            return;
        }

        const { status: memberStatus } = memberComprehensiveQueryResult;
        if (0 > memberStatus) {
            res.status(403).send('Method not allowed due to member suspended or deactivated');
            await atlasDbClient.close();
            return;
        }

        //// Response 200 ////
        res.status(200).send(memberComprehensiveQueryResult);
        
        await atlasDbClient.close();
        return;
    } catch (e: any) {
        let msg;
        if (e instanceof RestError) {
            msg = `Attempt to communicate with azure table storage.`;
        } else if (e instanceof MongoError) {
            msg = `Attempt to communicate with atlas mongodb.`;
        } else {
            msg = `Uncategorized. ${e?.msg}`;
        }
        if (!res.headersSent) {
            response500(res, msg);
        }
        logWithDate(msg, fnn, e);
        await atlasDbClient.close();
        return;
    }
}