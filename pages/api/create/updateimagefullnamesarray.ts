import type { NextApiRequest, NextApiResponse } from 'next';
import { RestError } from '@azure/data-tables';
import { MongoError } from 'mongodb';
import { getToken } from 'next-auth/jwt';

import AzureTableClient from '../../../modules/AzureTableClient';
import AtlasDatabaseClient from '../../../modules/AtlasDatabaseClient';

import { IMemberMemberMapping } from '../../../lib/interfaces/mapping';
import { IMemberComprehensive } from '../../../lib/interfaces/member';
import { IPostComprehensive } from '../../../lib/interfaces/post';
import { INotificationComprehensive, INotificationStatistics } from '../../../lib/interfaces/notification';

import { verifyId } from '../../../lib/utils/verify';
import { createNoticeId, getTimeBySecond } from '../../../lib/utils/create';
import { logWithDate, response405, response500 } from '../../../lib/utils/general';

const fnn = `${UpdateImageFullnamesArray.name} (API)`;

/**
 * This interface ONLY accepts PUT method
 * 
 * Post info required
 * -     token: JWT
 * -     postId: string (body)
 * -     imageFullnamesArr: string[] (body)
 * 
 * Last update:
 * - 04/03/2023 v0.1.1
 * - 31/05/2023 v0.1.2
 */

export default async function UpdateImageFullnamesArray(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    if ('PUT' !== method) {
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
    const { isValid, category, id: postId } = verifyId(req.body?.postId);
    if (!(isValid && 'post' === category)) {
        res.status(400).send('Invalid post id');
        return;
    }

    //// Verify array ////
    const { imageFullnamesArr } = req.body;
    if (!Array.isArray(imageFullnamesArr)) {
        res.status(400).send('Invalid image fullnames array');
        return;
    }

    //// Declare DB client ////
    const atlasDbClient = AtlasDatabaseClient();
    try {
        await atlasDbClient.connect();

        //// Verify member status ////
        const { sub: memberId } = token;
        const memberComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<IMemberComprehensive>('member');
        const memberComprehensiveQueryResult = await memberComprehensiveCollectionClient.findOne<IMemberComprehensive>({ memberId }, { projection: { _id: 0, status: 1, allowPosting: 1 } });
        if (null === memberComprehensiveQueryResult) {
            throw new Error(`Member attempt to update image fullnames array but have no document (of IMemberComprehensive, member id: ${memberId}) in [C] memberComprehensive`);
        }
        const { status: memberStatus, allowPosting } = memberComprehensiveQueryResult;
        if (!(0 < memberStatus && allowPosting)) {
            res.status(403).send('Method not allowed due to member suspended or deactivated');
            await atlasDbClient.close();
            return;
        }

        //// Verify post status ////
        const postComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<IPostComprehensive>('post');
        const postComprehensiveQueryResult = await postComprehensiveCollectionClient.findOne({ postId }, { projection: { _id: 0, status: 1, allowEditing: 1 } });
        if (null === postComprehensiveQueryResult) {
            res.status(404).send('Post not found');
            await atlasDbClient.close();
            return;
        }
        const { status: postStatus, allowEditing, title, cuedMemberInfoArr } = postComprehensiveQueryResult;
        if (!(1 === postStatus && allowEditing)) {
            res.status(403).send('Method not allowed due to restricted post status');
            await atlasDbClient.close();
            return;
        }

        //// Update image fullnames array ////
        const postComprehensiveInsertResult = await postComprehensiveCollectionClient.updateOne({ postId }, {
            $set: {
                imageFullnamesArr,
                status: 200
            }
        });
        if (!postComprehensiveInsertResult.acknowledged) {
            throw new Error(`Failed to update document (of IPostComprehensive, member id: ${memberId}) in [C] postComprehensive`);
        }

        //// Response 200 ////
        res.status(200).send('Image fullname array updated');

        //// (Cond.) Handle notice.cue ////
        if (Array.isArray(cuedMemberInfoArr) && cuedMemberInfoArr.length !== 0) {
            const blockingMemberMappingTableClient = AzureTableClient('BlockingMemberMapping');
            const notificationComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<INotificationComprehensive>('notification');
            const notificationStatisticsCollectionClient = atlasDbClient.db('statistics').collection<INotificationStatistics>('notification');

            // #1 maximum 12 members are allowed to cued at one time (in one comment)
            const cuedMemberIdsArrSliced = cuedMemberInfoArr.slice(0, 12);

            for await (const cuedMemberInfo of cuedMemberIdsArrSliced) {
                const { memberId: cuedId } = cuedMemberInfo;

                let isBlocked = false;
                // #2 look up record (of IMemberMemberMapping) in [RL] BlockingMemberMapping
                const blockingMemberMappingQuery = blockingMemberMappingTableClient.listEntities<IMemberMemberMapping>({ queryOptions: { filter: `PartitionKey eq '${cuedId}' and RowKey eq '${memberId}'` } });
                // [!] attemp to reterieve entity makes the probability of causing RestError
                const blockingMemberMappingQueryResult = await blockingMemberMappingQuery.next();
                if (blockingMemberMappingQueryResult.value) {
                    const { IsActive: isActive } = blockingMemberMappingQueryResult.value;
                    isBlocked = isActive;
                }
                if (!isBlocked) {

                    // #3 Upsert document (of notificationComprehensive) in [C] notificationComprehensive
                    const notificationComprehensiveUpdateResult = await notificationComprehensiveCollectionClient.updateOne({ noticeId: createNoticeId('cue', memberId, postId) }, {
                        noticeId: createNoticeId('cue', memberId, postId),
                        category: 'cue',
                        memberId: cuedId,
                        initiateId: memberId,
                        nickname: memberComprehensiveQueryResult.nickname,
                        postTitle: title,
                        commentBrief: '',
                        createdTimeBySecond: getTimeBySecond()
                    }, { upsert: true });
                    if (!notificationComprehensiveUpdateResult.acknowledged) {
                        logWithDate(`Failed to upsert document (of INotificationComprehensive, member id: ${cuedId}) in [C] notificationComprehensive`, fnn);
                    }
                    
                    // #4 update cue (of INotificationStatistics) (of cued member) in [C] notificationStatistics
                    const notificationStatisticsUpdateResult = await notificationStatisticsCollectionClient.updateOne({ memberId: cuedId }, { $inc: { cue: 1 } });
                    if (!notificationStatisticsUpdateResult.acknowledged) {
                        logWithDate(`Document (IPostComprehensive, post id: ${postId}) inserted in [C] postComprehensive successfully but failed to update cue (of INotificationStatistics, member id: ${cuedId}) in [C] notificationStatistics`, fnn);
                    }
                }
            }
        }

        await atlasDbClient.close();
        return;
    } catch (e: any) {
        let msg;
        if (e instanceof SyntaxError) {
            res.status(400).send('Improperly normalized request info');
            return;
        } else if (e instanceof RestError) {
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