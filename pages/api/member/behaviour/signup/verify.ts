import type { NextApiRequest, NextApiResponse } from 'next';
import { RestError } from '@azure/data-tables';
import { MongoError } from 'mongodb';
import CryptoJS from 'crypto-js';

import AzureTableClient from '../../../../../modules/AzureTableClient';
import AtlasDatabaseClient from '../../../../../modules/AtlasDatabaseClient';

import { verifyRecaptchaResponse, verifyEnvironmentVariable, response405, response500, log, verifyEmailAddress } from '../../../../../lib/utils';
import { INotificationStatistics, IMemberComprehensive, IMemberStatistics, ILoginJournal } from '../../../../../lib/interfaces';

const recaptchaServerSecret = process.env.INVISIABLE_RECAPTCHA_SECRET_KEY ?? '';

export default async function VerifyToken(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    if ('POST' !== method) {
        response405(req, res);
        return;
    }
    const environmentVariable = verifyEnvironmentVariable({ recaptchaServerSecret });
    //// Verify environment variables ////
    if (!!environmentVariable) {
        const msg = `${environmentVariable} not found`;
        response500(res, msg);
        log(msg);
        return;
    }
    //// Declare DB client ////
    const atlasDbClient = AtlasDatabaseClient();
    try {
        const { recaptchaResponse } = req.query;
        // Step #1 verify if it is bot
        const { status: recaptchaStatus, message } = await verifyRecaptchaResponse(recaptchaServerSecret, recaptchaResponse);
        if (200 !== recaptchaStatus) {
            if (403 === recaptchaStatus) {
                res.status(403).send(message);
                return;
            }
            if (500 === recaptchaStatus) {
                response500(res, message);
                return;
            }
        }
        // Step #2 verify request info
        const { requestInfo } = req.query;
        if ('string' !== typeof requestInfo || '' === requestInfo) {
            res.status(403).send('Invalid request info');
            return;
        }
        // Step #3 decode base64 string to plain string
        const requestInfoStr = Buffer.from(requestInfo, 'base64').toString();
        if ('' === requestInfoStr) {
            res.status(403).send('Invalid request info');
            return;
        }
        const { emailAddress, providerId, verifyEmailAddressToken } = JSON.parse(requestInfoStr);
        //// [!] attemp to parse info JSON string makes the probability of causing SyntaxError ////
        if (!(emailAddress && providerId && verifyEmailAddressToken)) {
            res.status(400).send('Defactive request info');
            return;
        }
        if (!verifyEmailAddress(emailAddress)) {
            res.status(400).send('Improper email address');
            return;
        }
        const emailAddressHash = CryptoJS.SHA1(emailAddress).toString();
        // Step #4.1 look up verify email address credentials record (by email address hash) in [RL] Credentials
        const credentialsTableClient = AzureTableClient('Credentials');
        const emailVerificationCredentialsQuery = credentialsTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${emailAddressHash}' and RowKey eq 'VerifyEmailAddress'` } });
        //// [!] attemp to reterieve entity makes the probability of causing RestError ////
        const emailVerificationCredentialsQueryResult = await emailVerificationCredentialsQuery.next();
        if (!emailVerificationCredentialsQueryResult.value) {
            res.status(404).send('Email verification credentials record not found');
            return;
        }
        const { VerifyEmailAddressToken: verifyEmailAddressTokenReference } = emailVerificationCredentialsQueryResult.value;
        // Step #4.2 match tokens
        if (verifyEmailAddressTokenReference !== verifyEmailAddressToken) {
            res.status(404).send('Email verification tokens not match');
            return;
        }
        // Step #4.3 look up login credentials record in [RL] Credentials
        const loginCredentialsQuery = credentialsTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${emailAddressHash}' and RowKey eq '${providerId}'` } });
        const loginCredentialsQueryResult = await loginCredentialsQuery.next();
        if (!loginCredentialsQueryResult.value) {
            res.status(404).send('Login credentials record not found');
            return;
        }
        const { MemberId: memberId } = loginCredentialsQueryResult.value;
        // Step #4.4 look up member status (IMemberComprehensive) in [C] memberComprehensive
        await atlasDbClient.connect();
        const memberComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<IMemberComprehensive>('member');
        const memberComprehensiveQueryResult = await memberComprehensiveCollectionClient.findOne<IMemberComprehensive>({ memberId, providerId });
        if (null === memberComprehensiveQueryResult) {
            //// [!] document not found ////
            const msg = 'Member management (document of IMemberComprehensive) not found in [C] memberComprehensive';
            response500(res, msg);
            log(msg);
            return;
        }
        const { status } = memberComprehensiveQueryResult;
        if ('number' !== typeof status) {
            //// [!] member status (property of IMemberComprehensive) not found or status (code) error ////
            const msg = 'Member status (property of IMemberComprehensive) error in [C] memberComprehensive';
            response500(res, msg)
            log(msg);
            return;
        }
        // Step #4.5 verify member status
        if (0 !== status) {
            res.status(409).send('Request for activating member cannot be fulfilled');
            return;
        }
        // Step #5 update status code (IMemberComprehensive) in [C] memberComprehensive
        const memberComprehensiveCollectionUpdateResult = await memberComprehensiveCollectionClient.updateOne({ memberId, providerId }, {
            $set: {
                //// info ////
                verifiedTime: new Date().getTime(),
                gender: -1, // "keep as secret"
                //// management ////
                status: 200,
                allowPosting: true,
                allowCommenting: true
            }
        }, { upsert: true });
        if (!memberComprehensiveCollectionUpdateResult.acknowledged) {
            const msg = `Was trying updating document (IMemberComprehensive) in [C] memberComprehensive for member id: ${memberId}`;
            response500(res, msg);
            log(msg);
            return;
        }
        // Step #6 insert document (IMemberStatistics) in [C] memberStatistics
        const memberStatisticsCollectionClient = atlasDbClient.db('statistics').collection<IMemberStatistics>('member');
        const memberStatisticsCollectionInsertResult = await memberStatisticsCollectionClient.insertOne({
            memberId,
            // creation
            totalCreationCount: 0, // info page required
            totalCreationEditCount: 0,
            totalCreationDeleteCount: 0,
            // comment
            totalCommentCount: 0,
            totalCommentEditCount: 0,
            totalCommentDeleteCount: 0,
            // attitude
            totalLikeCount: 0,
            totalDislikeCount: 0,
            // on other members
            totalFollowingCount: 0,
            totalBlockedCount: 0,
            // by other members
            totalCreationHitCount: 0,
            totalCreationLikedCount: 0, // info page required
            totalCreationDislikedCount: 0,
            totalSavedCount: 0,
            totalCommentLikedCount: 0,
            totalCommentDislikedCount: 0,
            totalFollowedByCount: 0, // info page required
        });
        if (!memberStatisticsCollectionInsertResult.acknowledged) {
            const msg = `Was trying inserting document (IMemberStatistics) in [C] memberStatistics for member id: ${memberId}`;
            response500(res, msg);
            log(msg);
            return;
        }
        // Step #7 insert document (INotification) in [C] notificationStatistics
        const notificationStatisticsCollectionClient = atlasDbClient.db('statistics').collection<INotificationStatistics>('notification');
        const notificationCollectionInsertResult = await notificationStatisticsCollectionClient.insertOne({
            memberId,
            cuedCount: 0, // cued times accumulated from last count reset
            repliedCount: 0,
            likedCount: 0,
            savedCount: 0,
            followedCound: 0,
        });
        if (!notificationCollectionInsertResult.acknowledged) {
            const msg = `Was trying inserting document (INotification) in [C] notificationStatistics for member id: ${memberId}`;
            response500(res, msg);
            log(msg);
            return;
        }
        //// Response 200 ////
        res.status(200).send('Email address verified');
        // Step #8 write journal (ILoginJournal) in [C] loginJournal
        const loginJournalCollectionClient = atlasDbClient.db('journal').collection<ILoginJournal>('login');
        await loginJournalCollectionClient.insertOne({
            memberId,
            category: 'success',
            providerId,
            timestamp: new Date().toISOString(),
            message: 'Email address verified.'
        });
        await atlasDbClient.close();
    } catch (e: any) {
        let msg: string;
        if (e instanceof SyntaxError) {
            res.status(400).send('Improperly normalized request info');
            return;
        } else if (e instanceof TypeError) {
            msg = 'Was trying decoding recaptcha verification response.';
        } else if (e instanceof RestError) {
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