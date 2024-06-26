import type { NextApiRequest, NextApiResponse } from 'next';
import { RestError } from '@azure/data-tables';
import { MongoError } from 'mongodb';

import AtlasDatabaseClient from '../../../../modules/AtlasDatabaseClient';

import { IConciseMemberStatistics, IMemberComprehensive, IMemberStatistics } from '../../../../lib/interfaces/member';
import { response405, response500, logWithDate } from '../../../../lib/utils/general';
import { verifyId } from '../../../../lib/utils/verify';

const fnn = `${GetConciseMemberStatisticsById.name} (API)`;

/**
 * This interface ONLY accepts GET requests
 * 
 * Info required for GET requests
 * -     memberId: string (query, member id)
 * 
 * Info will be returned
 * -     obj: IConciseMemberStatistics
 * 
 * Last update:
 * - 29/04/2023 v0.1.2
*/

export default async function GetConciseMemberStatisticsById(req: NextApiRequest, res: NextApiResponse) {

    const { method } = req;
    if ('GET' !== method) {
        response405(req, res);
        return;
    }

    //// Verify id ////
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
        const memberComprehensiveQueryResult = await memberComprehensiveCollectionClient.findOne({ memberId }, { projection: { _id: 0, status: 1 } });

        if (null === memberComprehensiveQueryResult) {
            throw new Error(`Attempt to GET member statistics but have no document (of IMemberComprehensive, member id: ${memberId}) in [C] memberComprehensive`);
        }

        const { status: memberStatus } = memberComprehensiveQueryResult;
        if (0 > memberStatus) {
            res.status(403).send('Method not allowed due to member suspended or deactivated');
            await atlasDbClient.close();
            return;
        }

        const statistics: IConciseMemberStatistics = {
            memberId,
            totalCreationsCount: 0,
            totalCreationHitCount: 0,
            totalFollowedByCount: 0,
            totalCreationLikedCount: 0,
            totalCreationSavedCount: 0,
        };

        const memberStatisticsCollectionClient = atlasDbClient.db('statistics').collection<IMemberStatistics>('member');
        const memberStatisticsQueryResult = await memberStatisticsCollectionClient.findOne({ memberId }, {
            projection: {
                _id: 0,
                totalCreationsCount: 1,
                totalCreationDeleteCount: 1,
                totalCreationHitCount: 1,
                totalFollowedByCount: 1,
                totalUndoFollowedByCount: 1,
                totalCreationSavedCount: 1,
                totalCreationUndoSavedCount: 1,
                totalCreationLikedCount: 1,
                totalCreationUndoLikedCount: 1,
            }
        });

        if (null === memberStatisticsQueryResult) {
            await memberStatisticsCollectionClient.insertOne({
                memberId,

                // creation
                totalCreationsCount: 0, // info page required
                totalCreationHitCount: 0,
                totalCreationEditCount: 0,
                totalCreationDeleteCount: 0,
                totalCreationLikedCount: 0, // info page required
                totalCreationUndoLikedCount: 0,
                totalCreationDislikedCount: 0,
                totalCreationUndoDislikedCount: 0,
                totalCreationSavedCount: 0, // info page required
                totalCreationUndoSavedCount: 0,

                // attitude
                totalLikeCount: 0,
                totalUndoLikeCount: 0,
                totalDislikeCount: 0,
                totalUndoDislikeCount: 0,

                // comment
                totalCommentCount: 0,
                totalCommentEditCount: 0,
                totalCommentDeleteCount: 0,
                totalCommentLikedCount: 0,
                totalCommentUndoLikedCount: 0,
                totalCommentDislikedCount: 0,
                totalCommentUndoDislikedCount: 0,

                // post
                totalSavedCount: 0,
                totalUndoSavedCount: 0,

                // on other members
                totalFollowingCount: 0,
                totalUndoFollowingCount: 0,
                totalBlockingCount: 0,
                totalUndoBlockingCount: 0,

                // by other members
                totalFollowedByCount: 0, // info page required
                totalUndoFollowedByCount: 0,
                totalBlockedByCount: 0,
                totalUndoBlockedByCount: 0,

                // affair
                totalAffairOfCreationCount: 0,
                totalAffairOfCommentCount: 0
            });
        } else {
            statistics.totalCreationsCount = memberStatisticsQueryResult.totalCreationsCount - memberStatisticsQueryResult.totalCreationDeleteCount;
            statistics.totalCreationHitCount = memberStatisticsQueryResult.totalCreationHitCount;
            statistics.totalFollowedByCount = memberStatisticsQueryResult.totalFollowedByCount - memberStatisticsQueryResult.totalUndoFollowedByCount;
            statistics.totalCreationSavedCount = memberStatisticsQueryResult.totalCreationSavedCount - memberStatisticsQueryResult.totalCreationUndoSavedCount;
            statistics.totalCreationLikedCount = memberStatisticsQueryResult.totalCreationLikedCount - memberStatisticsQueryResult.totalCreationUndoLikedCount;
        }

        //// Response 200 ////
        res.status(200).send(statistics);

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