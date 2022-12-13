import type { NextApiRequest, NextApiResponse } from 'next';
import { RestError } from '@azure/data-tables';
import { MongoError } from 'mongodb';
import CryptoJS from 'crypto-js';

import AzureTableClient from '../../../../../modules/AzureTableClient';
import AzureEmailCommunicationClient from '../../../../../modules/AzureEmailCommunicationClient';
import { IEmailAddressLoginCredentialMapping, IPasswordHash, IMemberInfo, IMemberManagement, IMemberLoginLog } from '../../../../../lib/interfaces';
import { LangConfigs, EmailMessage, VerifyAccountRequestInfo } from '../../../../../lib/types';
import { getRandomIdStr, verifyEmailAddress, verifyRecaptchaResponse, verifyEnvironmentVariable, response405, response500, log } from '../../../../../lib/utils';
import { composeVerifyAccountEmail } from '../../../../../lib/email';
import AtlasDatabaseClient from '../../../../../modules/AtlasDatabaseClient';

const appSecret = process.env.APP_AES_SECRET ?? '';
const recaptchaServerSecret = process.env.INVISIABLE_RECAPTCHA_SECRET_KEY ?? '';
const salt = process.env.APP_PASSWORD_SALT ?? '';

const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? '';
const lang = process.env.NEXT_PUBLIC_APP_LANG ?? 'ch';
const langConfigs: LangConfigs = {
    emailSubject: {
        ch: '验证您的 Mojito 账户',
        en: 'Verify your Mojito account'
    }
}

export default async function SignUp(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    if ('POST' !== method) {
        response405(req, res);
        return;
    }
    const atlasDbClient = AtlasDatabaseClient(); // Db client declared at top enable access from catch statement on error
    try {
        // Step #0 verify environment variables
        const environmentVariable = verifyEnvironmentVariable({ appSecret, recaptchaServerSecret, salt });
        if (!!environmentVariable) {
            response500(res, `${environmentVariable} not found`);
            return;
        }
        const { recaptchaResponse } = req.query;
        // Step #1 verify if it is bot
        const { status, message } = await verifyRecaptchaResponse(recaptchaServerSecret, recaptchaResponse);
        if (200 !== status) {
            if (403 === status) {
                res.status(403).send(message);
                return;
            }
            if (500 === status) {
                response500(res, message);
                return;
            }
        }
        const { emailAddress, password } = JSON.parse(req.body);
        // [!] attemp to parse JSON string to object makes the probability of causing SyntaxError
        // Step #2.1 verify email address
        if ('string' !== typeof emailAddress || '' === emailAddress) {
            res.status(403).send('Invalid email address');
            return;
        }
        if (!verifyEmailAddress(emailAddress)) {
            res.status(403).send('Email address not satisfied');
            return;
        }
        // Step #2.2 look up email address in [T] LoginCredentialsMapping
        const loginCredentialsMappingTableClient = AzureTableClient('LoginCredentialsMapping');
        const mappingQuery = loginCredentialsMappingTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq 'EmailAddress' and RowKey eq '${emailAddress}'` } });
        // [!] attemp to reterieve entity makes the probability of causing RestError
        const mappingQueryResult = await mappingQuery.next();
        if (mappingQueryResult.value && mappingQueryResult.value.IsActive) {
            res.status(400).send('Email address has been registered');
            return;
        }
        // Step #3.1 create a new member id
        const memberId = getRandomIdStr(true); // use UPPERCASE
        // Step #3.2 upsertEntity (emailAddressLoginCredentialMapping) to [RL] LoginCredentialsMapping (new email login mapping record)
        const emailAddressLoginCredentialMapping: IEmailAddressLoginCredentialMapping = {
            partitionKey: 'EmailAddress',
            rowKey: emailAddress,
            // MemberIdStr: memberId,
            MemberId: memberId, // Update: 5/12/2022: MemberIdStr -> MemberId
            IsActive: true
        }
        await loginCredentialsMappingTableClient.upsertEntity(emailAddressLoginCredentialMapping, 'Replace');
        // Step #3.3 upsertEntity (passwordHash) to [T] MemberLogin
        const passwordHash: IPasswordHash = {
            partitionKey: memberId,
            rowKey: 'PasswordHash',
            PasswordHash: CryptoJS.SHA256(password + salt).toString(),
            IsActive: true
        }
        const memberLoginTableClient = AzureTableClient('MemberLogin');
        await memberLoginTableClient.upsertEntity(passwordHash, 'Replace');
        // Step #3.4 upsertEntity (memberInfo) to [T] MemberComprehensive.Info (new member info record)
        const memberInfo: IMemberInfo = {
            partitionKey: memberId,
            rowKey: 'Info',
            RegisteredTimestamp: new Date().toISOString(),
            EmailAddress: emailAddress
        }
        const memberComprehensiveTableClient = AzureTableClient('MemberComprehensive'); // Update: 5/12/2022: applied new table layout (Info & Management merged)
        await memberComprehensiveTableClient.upsertEntity(memberInfo, 'Replace');
        // Step #3.5 upsertEntity (memberManagement) to [T] MemberComprehensive.Management (new member management record)
        const memberManagement: IMemberManagement = {
            partitionKey: memberId,
            rowKey: 'Management',
            MemberStatus: 0, // Established, email address not verified
            AllowPosting: false,
            AllowCommenting: false
        }
        await memberComprehensiveTableClient.upsertEntity(memberManagement, 'Replace');
        // Step #3.6 compose email to send verification link
        const info: VerifyAccountRequestInfo = { memberId };
        const emailMessage: EmailMessage = {
            sender: '<donotreply@mojito.co.nz>',
            content: {
                subject: langConfigs.emailSubject[lang],
                html: composeVerifyAccountEmail(domain, Buffer.from(CryptoJS.AES.encrypt(JSON.stringify(info), appSecret).toString()).toString('base64'), lang)
            },
            recipients: {
                to: [{ email: emailAddress }]
            }
        }
        const mailClient = AzureEmailCommunicationClient();
        const { messageId } = await mailClient.send(emailMessage);
        if (!messageId) {
            let msg = 'Was trying sending verification email';
            response500(res, msg);
            log(msg, {});
            return;
        }
        res.status(200).send('Member established');
        // Step #3.7 write log to [C] MemberLoginRecords
        await atlasDbClient.connect();
        const memberLoginLogCollectionClient = atlasDbClient.db('mojito-records-dev').collection('memberLoginLog');
        const loginLog: IMemberLoginLog = {
            category: 'success',
            providerId: 'MojitoMemberSystem',
            timestamp: new Date().toISOString(),
            message: 'Member established, email address verification required to get full access.'
        }
        await memberLoginLogCollectionClient.updateOne({ memberId }, { $addToSet: { logArr: loginLog } }, { upsert: true });
        atlasDbClient.close();
    } catch (e: any) {
        let msg: string;
        if (e instanceof RestError) {
            msg = 'Was trying communicating with table storage.';
        } else if (e instanceof MongoError) {
            msg = 'Was trying communicating with mongodb.';
            atlasDbClient.close();
        } else {
            msg = 'Uncategorized Error occurred.';
        }
        if (!res.headersSent) {
            response500(res, msg);
        }
        log(msg, e);
        return;
    }
}