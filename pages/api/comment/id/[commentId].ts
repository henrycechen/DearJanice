import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { RestError } from '@azure/data-tables';
import { MongoError } from 'mongodb';

import AzureTableClient from '../../../../modules/AzureTableClient';
import AtlasDatabaseClient from '../../../../modules/AtlasDatabaseClient';

import { IMemberComprehensive, IMemberStatistics } from '../../../../lib/interfaces/member';
import { IPostComprehensive } from '../../../../lib/interfaces/post';
import { ICommentComprehensive } from '../../../../lib/interfaces/comment';
import { IChannelStatistics } from '../../../../lib/interfaces/channel';
import { ITopicComprehensive } from '../../../../lib/interfaces/topic';
import { INotificationComprehensive, INotificationStatistics } from '../../../../lib/interfaces/notification';

import { verifyId } from '../../../../lib/utils/verify';
import { getRestrictedFromCommentComprehensive, provideCommentComprehensiveUpdate } from '../../../../lib/utils/for/comment';
import { response405, response500, logWithDate, getContentBrief } from '../../../../lib/utils/general';
import { getCuedMemberInfoArrayFromRequestBody } from '../../../../lib/utils/for/post';
import { createNoticeId, getTimeBySecond } from '../../../../lib/utils/create';

const fnn = `${GetRestrictedCommentComprehensiveById.name} (API)`;

/**
 * This interface accepts GET, PUT and DELETE requests
 * 
 * Info required for GET method
 * -     id: string (comment id)
 * -     recaptchaResponse: string
 * 
 * Info will be returned for GET method
 * -     commentComprehensive: ICommentComprehensive
 * 
 * Info required for PUT method
 * -     recaptchaResponse: string (query string)
 * -     token: JWT
 * -     id(parentId): string (query)
 * -     content: string (body)
 * -     cuedMemberInfoArr: IConciseMemberInfo[] (body, optional)
 * 
 * Info required for DELETE method
 * -     token: JWT
 * -     id(parentId): string 
 * 
 * Last update:
 * - 21/02/2023 v0.1.1
 * - 31/05/2023 v0.1.2
 */

export default async function GetRestrictedCommentComprehensiveById(req: NextApiRequest, res: NextApiResponse) {

    const { method } = req;
    if (!['GET', 'PUT', 'DELETE'].includes(method ?? '')) {
        response405(req, res);
        return;
    }

    //// Verify comment id ////
    const { isValid, category, id: commentId } = verifyId(req.query?.commentId);
    if (!(isValid && ['comment', 'subcomment'].includes(category))) {
        res.status(400).send('Invalid comment id');
        return;
    }

    //// Declare DB client ////
    const atlasDbClient = AtlasDatabaseClient();
    try {
        await atlasDbClient.connect();
        const commentComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<ICommentComprehensive>('comment');
        const commentComprehensiveQueryResult = await commentComprehensiveCollectionClient.findOne({ commentId });
        if (null === commentComprehensiveQueryResult) {
            res.status(404).send('Comment not found');
            await atlasDbClient.close();
            return;
        }

        //// GET | comment info ////
        if ('GET' === method) {
            res.status(200).send(getRestrictedFromCommentComprehensive(commentComprehensiveQueryResult));
            await atlasDbClient.close();
            return;
        }

        const token = await getToken({ req });

        //// Verify identity ////
        if (!(token && token?.sub)) {
            res.status(400).send('Invalid identity');
            return;
        }

        //// Verify permission ////
        const { sub: memberId } = token;
        const { memberId: authorId } = commentComprehensiveQueryResult;
        if (authorId !== memberId) {
            res.status(403).send('Identity lack permissions');
            return;
        }

        //// Verify member status ////
        const memberComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<IMemberComprehensive>('member');
        const memberComprehensiveQueryResult = await memberComprehensiveCollectionClient.findOne({ memberId: authorId });
        if (null === memberComprehensiveQueryResult) {
            throw new Error(`Member Attempt to edit or delete document (of ICommentComprehensive) but have no document (of IMemberComprehensive, member id: ${authorId}) in [C] memberComprehensive`);
        }
        const { status: memberStatus, allowCommenting } = memberComprehensiveQueryResult;
        if (!(0 < memberStatus && allowCommenting)) {
            res.status(403).send('Method not allowed due to member suspended or deactivated');
            await atlasDbClient.close();
            return;
        }
        // Verify comment status ////
        const { status: commentStatus, postId } = commentComprehensiveQueryResult;
        if (0 > commentStatus) {
            res.status(403).send('Method not allowed due to comment deleted');
            await atlasDbClient.close();
            return;
        }

        //// PUT | edit comment ////
        if ('PUT' === method) {
            // #1 verify content
            const { content } = req.body;
            if (!('string' === content && '' !== content)) {
                res.status(400).send('Improper or blank content');
                return;
            }

            // #2.1 look up document (of IPostComprehensive) in [C] postComprehensive
            const postComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<IPostComprehensive>('post');
            const postComprehensiveQueryResult = await postComprehensiveCollectionClient.findOne({ postId });
            if (null === postComprehensiveQueryResult) {
                res.status(404).send('Post not found');
                await atlasDbClient.close();
                return;
            }

            // #2.2 verify post status (of IPostComprehensive)
            const { status: postStatus } = postComprehensiveQueryResult;
            if (0 > postStatus) {
                res.status(403).send('Method not allowed due to post deleted');
                await atlasDbClient.close();
                return;
            }

            //// Status all good ////
            const cuedMemberInfoArr = getCuedMemberInfoArrayFromRequestBody(req.body);

            // #3 update document (of ICommentComprehensive) in [C] commentComprehensive
            const commentComprehensiveInsertResult = await commentComprehensiveCollectionClient.updateOne(
                { commentId },
                { $set: provideCommentComprehensiveUpdate(content, cuedMemberInfoArr) }
            );
            if (!commentComprehensiveInsertResult.acknowledged) {
                throw new Error(`Failed to update document (of ICommentComprehensive, comment id: ${commentId}, post id: ${postId}) in [C] commentComprehensive`);
            }

            //// Response 200 ////
            res.status(200).send('Edit comment success');

            //// Update statistics ////
            // #4 update totalCommentEditCount (of IMemberStatistics) in [C] memberStatistics
            const memberStatisticsCollectionClient = atlasDbClient.db('statistics').collection<IMemberStatistics>('member');
            const memberStatisticsUpdateResult = await memberStatisticsCollectionClient.updateOne({ memberId: authorId }, {
                $inc: {
                    totalCommentEditCount: 1
                }
            });
            if (!memberStatisticsUpdateResult.acknowledged) {
                logWithDate(`Document (ICommentComprehensive, comment id: ${commentId}) was updated in [C] commentComprehensive successfully but failed to update totalCommentEditCount (of IMemberStatistics, member id: ${authorId}) in [C] memberStatistics`, fnn);
            }

            //// Handle notice.cue (cond.) ////
            // #5.1 verify cued member ids array
            if (cuedMemberInfoArr.length !== 0) {
                const blockingMemberMappingTableClient = AzureTableClient('BlockingMemberMapping');
                const notificationComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<INotificationComprehensive>('notification');
                const notificationStatisticsCollectionClient = atlasDbClient.db('statistics').collection<INotificationStatistics>('notification');
                const { title } = postComprehensiveQueryResult;
                
                // #5.2 maximum 12 members are allowed to cued at one time (in one comment)
                const cuedMemberInfoArrSliced = cuedMemberInfoArr.slice(0, 12);

                for await (const cuedMemberInfo of cuedMemberInfoArrSliced) {
                    const { memberId: memberId_cued } = cuedMemberInfo;
                    // #5.3 look up record (of IMemberMemberMapping) in [RL] BlockingMemberMapping
                    const _blockingMemberMappingQuery = blockingMemberMappingTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${memberId_cued}' and RowKey eq '${authorId}'` } });
                    //// [!] attemp to reterieve entity makes the probability of causing RestError ////
                    const _blockingMemberMappingQueryResult = await _blockingMemberMappingQuery.next();
                    if (!_blockingMemberMappingQueryResult.value) {
                        //// [!] comment author has not been blocked by cued member ////

                        // #5.4 upsert document (of notificationComprehensive) in [C] notificationComprehensive
                        const notificationComprehensiveUpdateResult = await notificationComprehensiveCollectionClient.updateOne({ noticeId: createNoticeId('cue', authorId, postId, commentId) }, {
                            noticeId: createNoticeId('cue', memberId, postId, commentId),
                            category: 'cue',
                            memberId: authorId,
                            initiateId: memberId,
                            nickname: memberComprehensiveQueryResult.nickname,
                            postTitle: title,
                            commentBrief: getContentBrief(content),
                            createdTimeBySecond: getTimeBySecond()
                        }, { upsert: true });
                        if (!notificationComprehensiveUpdateResult.acknowledged) {
                            logWithDate(`Failed to upsert document (of INotificationComprehensive, member id: ${authorId}) in [C] notificationComprehensive`, fnn);
                        }

                        // #5.5 update cue (INotificationStatistics) (of cued member) in [C] notificationStatistics
                        const notificationStatisticsUpdateResult = await notificationStatisticsCollectionClient.updateOne({ memberId: memberId_cued }, { $inc: { cue: 1 } });
                        if (!notificationStatisticsUpdateResult.acknowledged) {
                            logWithDate(`Document (ICommentComprehensive, comment id: ${commentId}) inserted in [C] commentComprehensive successfully but failed to update cue (of INotificationStatistics, member id: ${memberId_cued}) in [C] notificationStatistics`, fnn);
                        }
                    }
                }
            }
            await atlasDbClient.close();
            return;
        }

        //// DELETE | delete comment ////
        if ('DELETE' === method) {
            // #1 update status (of ICommentComprehensive) in [C] commentComprehensive
            const commentComprehensiveDeleteResult = await commentComprehensiveCollectionClient.updateOne({ commentId }, { $set: { status: -1 } });
            if (!commentComprehensiveDeleteResult.acknowledged) {
                throw new Error(`Failed to update status (-1, of ICommentComprehensive, comment id: ${commentId}) in [C] commentComprehensive`);
            }

            //// Response 200 ////
            res.status(200).send('Delete comment success');

            //// Update statistics ////
            // #2.1 update totalCommentDeleteCount (of IMemberStatistics) in [C] memberStatistics
            const memberStatisticsCollectionClient = atlasDbClient.db('statistics').collection<ICommentComprehensive>('member');
            const memberStatisticsUpdateResult = await memberStatisticsCollectionClient.updateOne({ memberId }, { $inc: { totalCommentDeleteCount: 1 } });
            if (!memberStatisticsUpdateResult.acknowledged) {
                logWithDate(`Document (ICommentComprehensive, comment id: ${commentId}) updated (deleted, status -1) in [C] commentComprehensive successfully but failed to update totalCommentDeleteCount (of IMemberStatistics, member id: ${memberId}) in [C] memberStatistics`, fnn);
            }

            // #2.2 (cond.) update totalSubcommentDeleteCount in [C] commentComprehensive (parent comment)
            if ('C' === commentId.slice(0, 1)) {
                const { parentId } = commentComprehensiveQueryResult;
                const commentComprehensiveUpdateResult = await commentComprehensiveCollectionClient.updateOne({ commentId: parentId }, { $inc: { totalSubcommentDeleteCount: 1 } });
                if (!commentComprehensiveUpdateResult.acknowledged) {
                    logWithDate(`Document (ICommentComprehensive, comment id: ${commentId}) updated (deleted, status -1) in [C] commentComprehensive successfully but failed to update totalSubcommentDeleteCount (of ICommentComprehensive, comment id: ${parentId}) in [C] commentComprehensive`, fnn);
                }
            }

            // #2.3 update totalCommentDeleteCount (of IPostComprehensive) in [C] postComprehensive
            const { postId } = commentComprehensiveQueryResult;
            const postComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<IPostComprehensive>('post');
            const postComprehensiveUpdateResult = await postComprehensiveCollectionClient.findOneAndUpdate({ postId }, { $inc: { totalCommentDeleteCount: 1 } });
            if (!postComprehensiveUpdateResult.ok) {
                logWithDate(`Document (ICommentComprehensive, comment id: ${commentId}) updated (deleted, status -1) in [C] commentComprehensive successfully but failed to update totalCommentDeleteCount (of IPostComprehensive, post id: ${postId}) in [C] postComprehensive`, fnn);
            }

            // #2.4 update totalCommentDeleteCount (of IChannelStatistics) in [C] channelStatistics
            const channelId = postComprehensiveUpdateResult.value?.channelId;
            const channelStatisticsCollectionClient = atlasDbClient.db('statistics').collection<IChannelStatistics>('channel');
            const channelStatisticsUpdateResult = await channelStatisticsCollectionClient.updateOne({ channelId }, { $inc: { totalCommentDeleteCount: 1 } });
            if (!channelStatisticsUpdateResult.acknowledged) {
                logWithDate(`Document (ICommentComprehensive, comment id: ${commentId}) updated (deleted, status -1) in [C] commentComprehensive successfully but failed to update totalCommentDeleteCount (of IChannelStatistics, channel id: ${channelId}) in [C] channelStatistics`, fnn);
            }

            // #2.5 (cond.) update totalCommentDeleteCount (of ITopicComprehensive) [C] topicComprehensive
            const topicIdsArr = postComprehensiveUpdateResult.value?.topicInfoArr;
            if (Array.isArray(topicIdsArr) && topicIdsArr.length !== 0) {
                const topicComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<ITopicComprehensive>('topic');
                for await (const topicId of topicIdsArr) {
                    // #5.1 update topic statistics or insert a new document (of ITopicComprehensive) in [C] topicComprehensive
                    const topicComprehensiveUpdateResult = await topicComprehensiveCollectionClient.updateOne({ topicId }, { $inc: { totalCommentDeleteCount: 1 } });
                    if (!topicComprehensiveUpdateResult.acknowledged) {
                        logWithDate(`Document (ICommentComprehensive, comment id: ${commentId}) updated (deleted, status -1) in [C] commentComprehensive successfully but failed to update totalCommentDeleteCount (of ITopicComprehensive, topic id: ${topicId}) in [C] topicComprehensive`, fnn);
                    }
                }
            }
            await atlasDbClient.close();
            return;
        }
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