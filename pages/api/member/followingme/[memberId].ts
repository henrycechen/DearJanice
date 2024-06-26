import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { RestError } from '@azure/data-tables';
import { MongoError } from 'mongodb';

import AtlasDatabaseClient from '../../../../modules/AtlasDatabaseClient';
import AzureTableClient from '../../../../modules/AzureTableClient';

import { logWithDate, response405, response500 } from '../../../../lib/utils/general';
import { verifyId } from '../../../../lib/utils/verify';
import { IMemberMemberMapping } from '../../../../lib/interfaces/mapping';
import { IMemberInfo, IMemberComprehensive } from '../../../../lib/interfaces/member';

const fnn = `${GetMembersFollowingMe.name} (API)`;

//////// Find out who is following me ////////

/**
 * Info required for GET requests
 * -     memberId: string
 * 
 * Info will be returned
 * -     arr: IConciseMemberInfo[]
 * 
 * Last update：
 * - 22/02/2023 v0.1.2
*/

export default async function GetMembersFollowingMe(req: NextApiRequest, res: NextApiResponse) {

    const { method } = req;
    if ('GET' !== method) {
        response405(req, res);
        return;
    }

    //// Verify identity ////
    const token = await getToken({ req });
    if (!(token && token?.sub)) {
        res.status(401).send('Unauthorized');
        return;
    }
    const { sub: tokenId } = token;

    //// Verify id ////
    const { isValid, category, id: memberId } = verifyId(req.query?.memberId);
    if (!(isValid && 'member' === category)) {
        res.status(400).send('Invalid member id');
        return;
    }

    //// Match the member id in token and the one in request ////
    if (tokenId !== memberId) {
        res.status(400).send('Requested member id and identity not matched');
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
            throw new Error(`Member attempt to GET followed member info but have no document (of IMemberComprehensive, member id: ${memberId}) in [C] memberComprehensive`);
        }

        const { status: memberStatus } = memberComprehensiveQueryResult;
        if (0 > memberStatus) {
            res.status(403).send('Method not allowed due to member suspended or deactivated');
            await atlasDbClient.close();
            return;
        }
        await atlasDbClient.close();

        //// Look up record (of IMemberMemberMapping) in [PRL] FollowedByMemberMapping ////
        const followingMemberMappingTableClient = AzureTableClient('FollowedByMemberMapping');
        const followingMemberMappingQuery = followingMemberMappingTableClient.listEntities<IMemberMemberMapping>({ queryOptions: { filter: `PartitionKey eq '${memberId}' and IsActive eq true` } });
        //// [!] attemp to reterieve entity makes the probability of causing RestError ////
        let followingMemberMappingQueryResult = await followingMemberMappingQuery.next();
        const arr: IMemberInfo[] = [];
        while (!followingMemberMappingQueryResult.done) {
            arr.push({
                memberId: followingMemberMappingQueryResult.value.rowKey,
                nickname: followingMemberMappingQueryResult.value.Nickname,
                briefIntro: followingMemberMappingQueryResult.value.BriefIntro,
                createdTimeBySecond: followingMemberMappingQueryResult.value.CreatedTimeBySecond,
            });
            followingMemberMappingQueryResult = await followingMemberMappingQuery.next();
        }

        //// Response 200 ////
        res.status(200).send(arr);
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