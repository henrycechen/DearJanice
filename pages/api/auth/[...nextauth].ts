import NextAuth from "next-auth";
import GithubProvider from 'next-auth/providers/github';
import GoogleProvide from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import CryptoJS from 'crypto-js';

import { User } from 'next-auth';
import { RestError } from "@azure/storage-blob";
import AzureTableClient from '../../../modules/AzureTableClient';
import AtlasDatabaseClient from "../../../modules/AtlasDatabaseClient";
import AzureEmailCommunicationClient from "../../../modules/AzureEmailCommunicationClient";

import { verifyRecaptchaResponse, verifyEnvironmentVariable, getRandomIdStr, verifyEmailAddress, log } from '../../../lib/utils';
import { IMemberInfo, IMemberLoginLog, IMemberManagement, IThirdPartyLoginCredentialMapping } from '../../../lib/interfaces';
import { VerifyAccountRequestInfo, EmailMessage, LangConfigs } from "../../../lib/types";
import { composeVerifyAccountEmail } from "../../../lib/email";
import { MongoError } from "mongodb";

type LoginRequestInfo = {
    recaptchaResponse: any;
    emailAddress: any;
    password: any;
}

type ProviderIdMapping = {
    [key: string]: string
}

interface MemberUser extends User {
    id: string;
    nickname?: string;
    emailAddress?: string;
    avatarImageUrl?: string;
}

const recaptchaServerSecret = process.env.INVISIABLE_RECAPTCHA_SECRET_KEY ?? '';
const salt = process.env.APP_PASSWORD_SALT ?? '';
const loginProviderIdMapping: ProviderIdMapping = { // [!] Every time add a new provider, update this dictionary
    mojito: 'MojitoMemberSystem',
    github: 'GitHubOAuth',
    google: 'GoogleOAuth',
    // instagram
    // twitter
    // facebook
}

const appSecret = process.env.APP_AES_SECRET ?? '';
const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? '';
const lang = process.env.NEXT_PUBLIC_APP_LANG ?? 'ch';
const langConfigs: LangConfigs = {
    emailSubject: {
        ch: '验证您的 Mojito 账户',
        en: 'Verify your Mojito membership'
    }
}

export default NextAuth({
    session: {
        strategy: 'jwt',
        maxAge: 15 * 24 * 60 * 60, // [!] 15 days
    },
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID ?? '',
            clientSecret: process.env.GITHUB_SECRET ?? ''
        }),
        GoogleProvide({
            clientId: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ''
        }),
        CredentialsProvider({
            id: 'mojito',
            credentials: {
                recaptchaResponse: { label: "RecaptchaResponse", type: "text", placeholder: "" },
                emailAddress: { label: "EmailAddress", type: "text", placeholder: "" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, req) {
                if (!credentials) {
                    return null;
                }
                return {
                    id: '87076677',
                    email: 'test@test.com'
                }
                // return await verifyLoginCredentials(credentials);
            }
        })
    ],
    pages: {
        signIn: '/signin',
        signOut: 'signout',
        error: '/error'
    },
    callbacks: {
        async jwt({ token, user, account, profile }: any) {
            const provider = account?.provider;
            console.log('jwt call back' + account);
            // On token update (second call)
            if (!provider) {
                return token;
            }
            // On login with Mojito member system (first call)
            if ('mojito' === provider) {
                token.id = token.sub;
                return token;
            }
            // On login with third party login provider
            try {
                // Step #1.1 prepare account id
                const { providerAccountId: accountId } = account;
                // Step #1.1 prepare provider id
                const providerId = loginProviderIdMapping[provider];
                // Step #2 look up login credential mapping in [RL] LoginCredentialsMapping 
                const loginCredentialsMappingTableClient = AzureTableClient('LoginCredentialsMapping');
                const mappingQuery = loginCredentialsMappingTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${providerId}' and RowKey eq '${accountId}'` } });
                // [!] attemp to reterieve entity makes the probability of causing RestError
                const mappingQueryResult = await mappingQuery.next();
                if (!mappingQueryResult.value) {
                    throw new Error('Login credentials mapping record not found');
                } else {
                    const { MemberId: memberId } = mappingQueryResult.value; // Update 6/12/2022: column name changed, MemberIdStr => MemberId
                    token.id = memberId;
                }
                return token;
            } catch (e) {
                throw e;
            }
        },
        async signIn({ user, account, profile, email, credentials }) {
            // {id, email} = user
            // {provider} = account

            const provider = account?.provider ?? '';
            if (!Object.keys(loginProviderIdMapping).includes(provider)) {
                return '/signin?error=UnrecognizedProvider';
            }
            const providerId = loginProviderIdMapping[provider];
            const atlasDbClient = AtlasDatabaseClient(); // Db client declared at top enable access from catch statement on error
            if ('mojito' === provider) {
                //// #1 Login with Mojito member system
                try {
                    // Step #1 prepare member id
                    const { id: memberId } = user;
                    // Step #2.1 look up member status in [C] memberComprehensive
                    await atlasDbClient.connect();
                    console.log(memberId, providerId);
                    const memberComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection('member');
                    const memberComprehensiveResult = await memberComprehensiveCollectionClient.findOne({ memberId, providerId });
                    // if not found => null
                    console.log(memberComprehensiveResult);
                    
                    user.name = memberComprehensiveResult?.nickname;
                    user.image = memberComprehensiveResult?.image;

                    console.log(user);
                    
                    return '/signin?error=UnrecognizedProvider';




                    // Step #2.2 verify member status
                    const { MemberStatus: memberStatus } = memberManagementQueryResult.value; // Update 6/12/2022: column name changed, MemberStatusValue => MemberStatus
                    // Step #2.2.A member has been suspended or deactivated
                    if ([-2, -1].includes(memberStatus)) {
                        return '/error?error=MemberSuspendedOrDeactivated';
                    }
                    await atlasDbClient.connect();
                    const memberLoginLogCollectionClient = atlasDbClient.db('mojito-records-dev').collection('memberLoginLog');
                    // Step #2.2.B email address not verified
                    if (0 === memberStatus) {
                        const loginLog: IMemberLoginLog = {
                            category: 'error',
                            providerId: 'MojitoMemberSystem',
                            timestamp: new Date().toISOString(),
                            message: 'Attempted login while email address not verified.'
                        }
                        await memberLoginLogCollectionClient.updateOne({ memberId }, { $addToSet: { logArr: loginLog } }, { upsert: true });
                        atlasDbClient.close();
                        return '/signin?error=EmailAddressUnverified';
                    }
                    // Step #2.2.C normal, write log to [C] memberLoginLog
                    const loginLog: IMemberLoginLog = {
                        category: 'success',
                        providerId: 'MojitoMemberSystem',
                        timestamp: new Date().toISOString(),
                        message: 'Normal login.'
                    }
                    await memberLoginLogCollectionClient.updateOne({ memberId }, { $addToSet: { logArr: loginLog } }, { upsert: true });
                    atlasDbClient.close();
                    return true;
                } catch (e) {
                    let msg = ` '/api/auth/[...nextauth]/default/callbacks/signIn'`;
                    if (e instanceof RestError) {
                        msg = 'Was trying communicating with table storage.' + msg;
                    } else if (e instanceof MongoError) {
                        msg = 'Was trying communicating with mongodb.' + msg;
                        atlasDbClient.close();
                    } else {
                        msg = 'Uncategorized Error occurred.' + msg;
                    }
                    log(msg, e);
                    return false;
                }
            }
            //// #2 Login with third party login provider ////
            try {
                // Step #1.1 prepare account id
                const { providerAccountId: accountId } = account;
                // Step #1.2 prepare provider id
                const providerId = loginProviderIdMapping[provider];
                // Step #2 look up login credential mapping in [RL] LoginCredentialsMapping 
                const loginCredentialsMappingTableClient = AzureTableClient('LoginCredentialsMapping');
                const mappingQuery = loginCredentialsMappingTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${providerId}' and RowKey eq '${accountId}'` } });
                // [!] attemp to reterieve entity makes the probability of causing RestError
                const mappingQueryResult = await mappingQuery.next();
                //// Step #3A login credential mapping record NOOOOOOT found, create a new mojito member substitute ////
                if (!mappingQueryResult.value) {
                    const { email: emailAddressRef, name: nickName, image: avatarImageUrl } = user;
                    // Step #3A.0 verify email address
                    const emailAddress = emailAddressRef ?? '';
                    if (verifyEmailAddress(emailAddress)) {
                        // lack of email address or not valid
                        return `/signin?error=InappropriateEmailAddress&provider=${provider}`;
                    }
                    // Step #3A.1 create a new member id
                    const memberId = getRandomIdStr(true); // use UPPERCASE
                    // Step #3A.2 upsertEntity (emailAddressLoginCredentialMapping) to [RL] LoginCredentialsMapping (new third party login credential mapping record)
                    const loginCredentialsMapping: IThirdPartyLoginCredentialMapping = {
                        partitionKey: providerId,
                        rowKey: accountId,
                        MemberId: memberId,
                        IsActive: true
                    }
                    await loginCredentialsMappingTableClient.createEntity(loginCredentialsMapping);
                    // Step #3A.3 upsertEntity (memberInfo) to [T] MemberComprehensive.Info (new member info record)
                    const currentDateStr = new Date().toISOString();
                    const memberInfo: IMemberInfo = {
                        partitionKey: memberId,
                        rowKey: 'Info',
                        RegisteredTimestamp: currentDateStr,
                        VerifiedTimestamp: currentDateStr,
                        EmailAddress: emailAddress // assume the provided (by third party login provider) email address is a valid way to reach out to this third party login member
                    }
                    const memberComprehensiveTableClient = AzureTableClient('MemberComprehensive'); // Update: 6/12/2022: applied new table layout (Info & Management merged)
                    await memberComprehensiveTableClient.upsertEntity(memberInfo, 'Replace');
                    // Step #3A.4 upserEntity (membermanagement) to [T] MemberComprehensive.Info (new member management record)
                    const memberManagement: IMemberManagement = {
                        partitionKey: memberId,
                        rowKey: 'Management',
                        MemberStatus: 0, // Established, email address not verified
                        AllowPosting: false,
                        AllowCommenting: false
                    }
                    await memberComprehensiveTableClient.upsertEntity(memberManagement, 'Replace');
                    // Step #3A.5 compose email to send verification link
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
                        log('Was trying sending verification email', {});
                        return '/error';
                    }
                    // Step #3A.6 write log [C] MemberLoginLog
                    await atlasDbClient.connect();
                    const memberLoginLogCollectionClient = atlasDbClient.db('mojito-records-dev').collection('memberLoginLog');
                    const loginLog: IMemberLoginLog = {
                        category: 'success',
                        providerId: providerId,
                        timestamp: new Date().toISOString(),
                        message: 'Member established, email address verification required to get full access.'
                    }
                    await memberLoginLogCollectionClient.updateOne({ memberId }, { $addToSet: { logArr: loginLog } }, { upsert: true });
                    atlasDbClient.close();
                    return '/signup?info=ThirdPartySignupSuccess';
                }
                //// Step #3B login credential mapping record is found ////
                else {
                    const { MemberId: memberId } = mappingQueryResult.value;
                    // Step #3B.1 look up member status in [T] MemberComprehensive.Management
                    const memberComprehensiveTableClient = AzureTableClient('MemberComprehensive'); // Update 6/12/2022: applied new table layout, MemberManagement => MemberComprehensive.Management
                    const memberManagementQuery = memberComprehensiveTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${memberId}' and RowKey eq 'Management'` } });
                    // Step #3B.2 verify member status
                    const memberManagementQueryResult = await memberManagementQuery.next();
                    // Step #3B.2 #A member management record not found deemed account deactivated / suspended
                    if (!memberManagementQueryResult.value) {
                        // [!] member management record not found deemed account deactivated / suspended
                        return '/signin?error=MemberSuspendedOrDeactivated';
                    }
                    const { MemberStatus: memberStatus } = memberManagementQueryResult.value; // Update 6/12/2022: MemberStatusValue => MemberStatus
                    // Step #3B.2 #B member has been suspended or deactivated
                    if ([-2, -1].includes(memberStatus)) {
                        return '/signin?error=MemberSuspendedOrDeactivated';
                    }
                    await atlasDbClient.connect();
                    const memberStatisticsCollectionClient = atlasDbClient.db('mojito-records-dev').collection('memberLoginLog');
                    // Step #3B.2 #C email address not verified
                    if (0 === memberStatus) {
                        const loginLog: IMemberLoginLog = {
                            category: 'error',
                            providerId: providerId,
                            timestamp: new Date().toISOString(),
                            message: 'Attempted login while email address not verified.'
                        }
                        await memberStatisticsCollectionClient.updateOne({ memberId }, { $addToSet: { logArr: loginLog } }, { upsert: true });
                        atlasDbClient.close();
                        return '/signin?error=EmailAddressUnverified';
                    }
                    // Step #3B.2 #D normal, write log to [C] MemberLoginLog
                    const loginLog: IMemberLoginLog = {
                        category: 'success',
                        providerId: providerId,
                        timestamp: new Date().toISOString(),
                        message: 'Normal login.'
                    }
                    await memberStatisticsCollectionClient.updateOne({ memberId }, { $addToSet: { logArr: loginLog } }, { upsert: true });
                    atlasDbClient.close();
                    return true;
                }
            } catch (e) {
                let msg = ` '/api/auth/[...nextauth]/default/callbacks/signIn/third-party-login?provider=${provider}'`;
                if (e instanceof RestError) {
                    msg = 'Was trying communicating with table storage.' + msg;
                } else if (e instanceof MongoError) {
                    msg = 'Was trying communicating with mongodb.' + msg;
                    atlasDbClient.close();
                } else {
                    msg = 'Uncategorized Error occurred.' + msg;
                }
                log(msg, e);
                return false;
            }
        },
        async session({ session, user, token }: any) {
            session.user.id = token.id;
            return session;
        }
    }
})

async function verifyLoginCredentials(credentials: LoginRequestInfo): Promise<MemberUser | null> {
    // Step #0 verify environment variables
    const environmentVariable = verifyEnvironmentVariable({ recaptchaServerSecret, salt });
    if (!!environmentVariable) {
        throw new ReferenceError(`${environmentVariable} not found`);
    }
    try {
        const { recaptchaResponse } = credentials;
        // Step #1 verify if it is bot
        const { status } = await verifyRecaptchaResponse(recaptchaServerSecret, recaptchaResponse);
        if (200 !== status) {
            return null;
        }
        const { emailAddress, password } = credentials;
        // Step #2 look up email address sha1 in [RL] Credentials
        const credentialsTableClient = AzureTableClient('Credentials');
        const loginCredentialsQuery = credentialsTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${CryptoJS.SHA1(emailAddress).toString()}' and RowKey eq 'MojitoMemberSystem'` } });
        // [!] attemp to reterieve entity makes the probability of causing RestError
        const loginCredentialsQueryResult = await loginCredentialsQuery.next();
        if (!loginCredentialsQueryResult.value) {
            // [!] login credential mapping record not found deemed member deactivated / suspended / not registered
            return null;
        }
        const { MemberId: memberId, PasswordHash: passwordHashReference } = loginCredentialsQueryResult.value;
        // Step #4 match the password hashes
        const passwordHash = CryptoJS.SHA256(password + salt).toString();
        if (passwordHashReference !== passwordHash) {
            // [!] password hashes not match
            return null;
        }
        return {
            id: memberId,
            email: emailAddress,
            // name: nickname,
            // image: !memberInfoQueryResult.value ? '' : memberInfoQueryResult.value.AvatarImageUrl,
        }
    } catch (e) {
        let msg: string;
        if (e instanceof ReferenceError) {
            msg = `Enviroment variable not found. trace='/api/auth/[...nextauth]/veriftLoginCredentials'`;
        } else if (e instanceof RestError) {
            msg = `Was trying communicating with table storage. trace='/api/auth/[...nextauth]/veriftLoginCredentials'`
        } else {
            msg = `Uncategorized Error occurred. trace='/api/auth/[...nextauth]/veriftLoginCredentials'`;
        }
        log(msg, e);
        return null;
    }
}