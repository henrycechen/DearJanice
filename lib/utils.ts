import { MongoClient } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';
import { IMemberComprehensive, IConciseMemberInfo, IAttitudeComprehensive, IAttitideMapping, ICommentComprehensive, IRestrictedCommentComprehensive, IRestrictedPostComprehensive, IPostComprehensive, IEditedPostComprehensive, ITopicComprehensive, } from './interfaces';
import { ProcessStates } from './types';

// import common utils for API
// import { createId, createNoticeId, getRandomIdStr, getRandomIdStrL, getRandomHexStr, timeStampToString, getNicknameFromToken, getContentBrief, getMappingFromAttitudeComprehensive, createCommentComprehensive, provideCommentComprehensiveUpdate, getRestrictedFromCommentComprehensive, getTopicBase64StringsArrayFromRequestBody, getImageUrlsArrayFromRequestBody, getParagraphsArrayFromRequestBody, getRestrictedFromPostComprehensive, verifyEmailAddress, verifyPassword, verifyId, verifyUrl, verifyRecaptchaResponse, verifyEnvironmentVariable, response405, response500, log } from '../../../../lib/utils';

// import common utils for Client
// import { updateLocalStorage, restoreFromLocalStorage} from '../../../../lib/utils';

//  Rules of creating random IDs / names
//
//  IDs
//  - Member id : 8 ~ 9 characters, UPPERCASE, begin with 'M'
//  - Notice id : 6 ~ 7 characters, UPPERCASE, begin with 'N'
//  - Topic id : base64 string from topic content string, begin with 'T'
//  - Comment id : 12 ~ 13 characters, UPPERCASE, comment begin with 'C', subcomment begin with 'D'
//  - Post id : 10 ~ 11 characters, UPPERCASE, begin with 'P'
//
//  Names
//  - Image filename : 10 characters, lowercase
//
//  Tokens
//  - Verify email address token: 8 characters Hex, UPPERCASE
//  - Reset password token: 8 characters Hex, UPPERCASE
//
export function createId(catergory: 'member' | 'notice' | 'comment' | 'subcomment' | 'post'): string {
    switch (catergory) {
        case 'member': return 'M' + Math.floor(Math.random() * Math.pow(10, 11)).toString(35).toUpperCase();
        case 'notice': return 'N' + Math.floor(Math.random() * Math.pow(10, 8)).toString(35).toUpperCase();
        case 'comment': return 'C' + Math.floor(Math.random() * Math.pow(10, 8)).toString(35).toUpperCase() + Math.floor(Math.random() * Math.pow(10, 9)).toString(35).toUpperCase();
        case 'subcomment': return 'D' + Math.floor(Math.random() * Math.pow(10, 8)).toString(35).toUpperCase() + Math.floor(Math.random() * Math.pow(10, 9)).toString(35).toUpperCase();
        case 'post': return 'P' + Math.floor(Math.random() * Math.pow(10, 14)).toString(35).toUpperCase();
    }
}

export function createNoticeId(category: 'cue' | 'reply' | 'like' | 'pin' | 'save' | 'follow', initiateId: string, postId = '', commentId = ''): string {
    switch (category) {
        case 'cue': return `C-${initiateId}${!postId ? '' : '-' + postId}${!commentId ? '' : '-' + commentId}`;
        case 'reply': return `R-${initiateId}${!postId ? '' : '-' + postId}${!commentId ? '' : '-' + commentId}`;
        case 'like': return `L-${initiateId}${!postId ? '' : '-' + postId}${!commentId ? '' : '-' + commentId}`;
        case 'pin': return `P-${initiateId}${!postId ? '' : '-' + postId}${!commentId ? '' : '-' + commentId}`;
        case 'save': return `S-${initiateId}${!postId ? '' : '-' + postId}`;
        case 'follow': return 'F-' + initiateId;
    }
}

export function getRandomIdStr(useUpperCase: boolean = false): string { // Length of 10
    if (useUpperCase) {
        return Math.floor(Math.random() * Math.pow(10, 15)).toString(35).toUpperCase();
    } else {
        return Math.floor(Math.random() * Math.pow(10, 15)).toString(35);
    }
}

export function getRandomIdStrL(useUpperCase: boolean = false): string { // Length of 16
    if (useUpperCase) {
        return Math.floor(Math.random() * Math.pow(10, 12)).toString(35).toUpperCase() + Math.floor(Math.random() * Math.pow(10, 12)).toString(35).toUpperCase();
    } else {
        return Math.floor(Math.random() * Math.pow(10, 12)).toString(35) + Math.floor(Math.random() * Math.pow(10, 12)).toString(35);
    }
}

export function getRandomHexStr(useUpperCase: boolean = false): string { // Length of 8 (Hex)
    if (useUpperCase) {
        return Math.floor(Math.random() * Math.pow(10, 10)).toString(16).toUpperCase();
    } else {
        return Math.floor(Math.random() * Math.pow(10, 10)).toString(16);
    }
}

export function timeToString(time: any, lang: string): string {
    let _lang = lang;
    if (!['tw', 'cn', 'en'].includes(lang)) {
        _lang = 'tw';
    }
    const langConfigs = {
        tw: { min: ' 分鐘前', mins: ' 分鐘前', hour: ' 小時前', hours: ' 小時前', houra: ' 小時', hoursa: ' 小時', day: ' 天前', days: ' 天前' },
        cn: { min: ' 分钟前', mins: ' 分钟前', hour: ' 小时前', hours: ' 小时前', houra: ' 小时', hoursa: ' 小时', day: ' 天前', days: ' 天前' },
        en: { min: ' minute', mins: ' minutes', hour: ' hour', hours: ' hours', houra: ' hour', hoursa: ' hours', day: ' day', days: ' days' }
    }[_lang];
    if (!time) {
        return `0${langConfigs?.min}`;
    }
    const diff = new Date().getTime() - new Date(time).getTime();
    if (24 * 3600000 < diff) {
        const d = Math.floor(diff / (24 * 3600000));
        return `${d}${1 === d ? langConfigs?.day : langConfigs?.days}`;;
    }
    const mins = diff % 3600000;
    const m = Math.floor(mins / 60000);
    if (mins === diff) {
        return `${m}${1 === m ? langConfigs?.min : langConfigs?.mins}`;
    }
    const h = Math.floor(diff / 3600000);
    if (3 > h) {
        return `${h}${1 === h ? langConfigs?.houra : langConfigs?.hoursa}${m}${1 === m ? langConfigs?.min : langConfigs?.mins}`;
    } else {
        return `${h}${1 === h ? langConfigs?.hour : langConfigs?.hours}`;
    }
}

//////// JWT ////////
/**
 * 
 * @param token JWT
 * @returns nickname | 'MojitoMemberM1234ABCD'
 */
export function getNicknameFromToken(token: any): string {
    if (token.hasOwnProperty('name')) {
        return token.name;
    } else if (token.hasOwnProperty('sub') && '' !== token.sub) {
        let id = `${token.sub}`;
        return 'MojitoMember ' + id.slice(0, 4);
    }
    return 'MojitoMember ' + getRandomHexStr(true);
}
//////// Member ////////
export function getNicknameBrief(nickname: any): string {
    if (!('string' === typeof nickname && '' !== nickname)) {
        return `'Mojito會員${Math.floor(Math.random() * Math.pow(10, 2)).toString(16).toUpperCase()}`;
    }
    if (nickname.length > 10) {
        return `${nickname.slice(0, 7)}...`;
    }
    return nickname;
}

export function provideCuedMemberInfoArray(cuedMemberInfoDictionary: { [memberId: string]: IConciseMemberInfo }): IConciseMemberInfo[] {
    const memberIdArr = Object.keys(cuedMemberInfoDictionary);
    if (0 === memberIdArr.length) {
        return []
    }
    return memberIdArr.map(memberId => cuedMemberInfoDictionary[memberId]);
}

//////// Content ////////
export function getContentBrief(content: any, length = 21): string | undefined {
    if (!('string' === typeof content && '' !== content)) {
        return undefined;
    }
    if (content.length > 21) {
        return `${content.slice(0, 21)}...`;
    }
    return content;
}

//////// Attitude ////////
export function createAttitudeComprehensive(memberId: string, postId: string, id: string, attitude: number): IAttitudeComprehensive {
    let att = 0;
    if ([-1, 0, 1].includes(attitude)) {
        att = attitude;
    }
    const cat = id.slice(0, 1);
    if ('P' === cat) {
        return {
            memberId,
            postId,
            attitude: att,
            commentAttitudeMapping: {}
        }
    }
    if (['C', 'D'].includes(cat)) {
        return {
            memberId,
            postId,
            attitude: 0,
            commentAttitudeMapping: { [id]: att }
        }
    }
    return {
        memberId,
        postId,
        attitude: 0,
        commentAttitudeMapping: {}
    }
}

type AttitudeComprehensiveUpdate = {
    attitude?: number;
    commentAttitudeMapping?: { [key: string]: number };
}

export function provideAttitudeComprehensiveUpdate(id: string, attitude: number): AttitudeComprehensiveUpdate {
    let att = 0;
    if ([-1, 0, 1].includes(attitude)) {
        att = attitude;
    }
    const cat = id.slice(0, 1);
    if ('P' === cat) {
        return {
            attitude: att
        }
    }
    if (['C', 'D'].includes(cat)) {
        return {
            commentAttitudeMapping: { [id]: att }
        }
    }
    return {}
}

export function getMappingFromAttitudeComprehensive(attitudeComprehensive: IAttitudeComprehensive | null): IAttitideMapping {
    if (null === attitudeComprehensive) {
        return {
            attitude: 0,
            commentAttitudeMapping: {}
        }
    }
    return {
        attitude: attitudeComprehensive.attitude,
        commentAttitudeMapping: { ...attitudeComprehensive.commentAttitudeMapping },
    }
}

//////// Comment ////////
export function createCommentComprehensive(commentId: string, parentId: string, postId: string, memberId: string, content: string, cuedMemberInfoArr: any): ICommentComprehensive {
    const arr = [];
    if (Array.isArray(cuedMemberInfoArr) && cuedMemberInfoArr.length !== 0) {
        arr.push(...cuedMemberInfoArr);
    }
    const comment: ICommentComprehensive = {
        commentId,
        parentId,
        postId,
        memberId,
        createdTime: new Date().getTime(),
        content, // required
        cuedMemberInfoArr: arr,
        status: 200,
        totalLikedCount: 0,
        totalUndoLikedCount: 0,
        totalDislikedCount: 0,
        totalUndoDislikedCount: 0,
        totalEditCount: 0,
        edited: []
    }
    if ('C' === commentId.slice(0, 1)) {
        comment.totalSubcommentCount = 0
        comment.totalSubcommentDeleteCount = 0
    }
    return comment;
}

type CommentComprehensiveUpdate = {
    content: string;
    cuedMemberInfoArr: IConciseMemberInfo[];
    status: 201;
    totalLikedCount: 0; // reset liked and disliked count
    totalUndoLikedCount: 0; // reset undo liked and undo disliked count
    totalDislikedCount: 0;
    totalUndoDislikedCount: 0;
}

export function provideCommentComprehensiveUpdate(content: string, cuedMemberInfoArr: IConciseMemberInfo[]): CommentComprehensiveUpdate {
    const updated: CommentComprehensiveUpdate = {
        content,
        cuedMemberInfoArr,
        status: 201,
        totalLikedCount: 0, // reset liked and disliked count
        totalUndoLikedCount: 0, // reset undo liked and undo disliked count
        totalDislikedCount: 0,
        totalUndoDislikedCount: 0
    };
    return updated;
}

export function getRestrictedFromCommentComprehensive(commentComprehensive: ICommentComprehensive): IRestrictedCommentComprehensive {
    const { status, totalLikedCount, totalUndoLikedCount, totalDislikedCount, totalUndoDislikedCount } = commentComprehensive;
    const restricted: IRestrictedCommentComprehensive = {
        commentId: commentComprehensive.commentId, // 12 ~ 13 characters, UPPERCASE, begin with 'C'
        postId: commentComprehensive.postId,
        memberId: commentComprehensive.memberId,
        createdTime: commentComprehensive.createdTime, // created time of this document (comment est.)
        content: '',
        cuedMemberInfoArr: [],
        status: status,
        totalLikedCount: totalLikedCount - totalUndoLikedCount,
        totalDislikedCount: totalDislikedCount - totalUndoDislikedCount,
        totalSubcommentCount: -1
    }
    const { totalSubcommentCount, totalSubcommentDeleteCount } = commentComprehensive;
    if (('number' === typeof totalSubcommentCount) && ('number' === typeof totalSubcommentDeleteCount)) {
        if (0 > totalSubcommentCount - totalSubcommentDeleteCount) {
            restricted.totalSubcommentCount = 0
        } else {
            restricted.totalSubcommentCount = totalSubcommentCount - totalSubcommentDeleteCount;
        }
    }
    if ('number' === typeof status && 0 > status) {
        return restricted;
    }
    restricted.content = commentComprehensive.content;
    restricted.cuedMemberInfoArr.push(...commentComprehensive.cuedMemberInfoArr);
    if ('number' === typeof status && 1 === status % 100) {
        const { edited } = commentComprehensive;
        if (Array.isArray(edited) && edited.length !== 0) {
            restricted.editedTime = edited[edited.length - 1].editedTime;
        }
    }
    return restricted;
}

//////// Topic ////////
export function getTopicBase64StringsArrayFromRequestBody(requestBody: any): string[] {
    if ('object' !== typeof requestBody) {
        return [];
    }
    if (!(undefined !== requestBody['topicsArr'] && Array.isArray(requestBody['topicsArr']))) {
        return [];
    }
    return requestBody['topicsArr'].map(topicContent => 'T' + Buffer.from(topicContent).toString('base64'));
}

export function provideTopicComprehensive(topicId: string, channelId: string,): ITopicComprehensive {
    return {
        topicId, // base64 string from topic content string
        channelId,
        createdTime: new Date().getTime(), // create time of this document (topic est.)
        status: 200,
        totalHitCount: 1, // total hit count of total posts of this topic
        totalSearchCount: 0,
        totalPostCount: 1,
        totalPostDeleteCount: 0,
        totalLikedCount: 0,
        totalUndoLikedCount: 0,
        totalCommentCount: 0,
        totalCommentDeleteCount: 0,
        totalSavedCount: 0,
        totalUndoSavedCount: 0,
    }
}

//////// Post ////////
export function getImageUrlsArrayFromRequestBody(requestBody: any): string[] {
    if ('object' !== typeof requestBody) {
        return [];
    }
    if (!(undefined !== requestBody['imageUrlsArr'] && Array.isArray(requestBody['imageUrlsArr']))) {
        return [];
    }
    return Array.prototype.filter.call([...requestBody['imageUrlsArr']], (imageUrl) => verifyUrl(imageUrl))
}

export function getParagraphsArrayFromRequestBody(requestBody: any): string[] {
    if ('object' !== typeof requestBody) {
        return [];
    }
    if (!(undefined !== requestBody['paragraphsArr'] && Array.isArray(requestBody['paragraphsArr']))) {
        return [];
    }
    return [...requestBody['paragraphsArr']];
}

export function getCuedMemberInfoArrayFromRequestBody(requestBody: any): IConciseMemberInfo[] {
    if ('object' !== typeof requestBody) {
        return [];
    }
    if (!(undefined !== requestBody['cuedMemberInfoArr'] && Array.isArray(requestBody['cuedMemberInfoArr']))) {
        return [];
    }
    return [...requestBody['cuedMemberInfoArr']];
}

type PostComprehensiveUpdate = {
    //// info ////
    title: string;
    imageUrlsArr: string[];
    paragraphsArr: string[];
    cuedMemberInfoArr: IConciseMemberInfo[];
    channelId: string;
    topicIdsArr: string[];
    //// management ////
    status: 201;
    //// statistics ////
    totalLikedCount: 0; // reset liked and disliked count
    totalUndoLikedCount: 0; // reset undo liked and undo disliked count
    totalDislikedCount: 0;
    totalUndoDislikedCount: 0;
}

export function providePostComprehensiveUpdate(title: string, imageUrlsArr: string[], paragraphsArr: string[], cuedMemberInfoArr: IConciseMemberInfo[], channelId: string, topicIdsArr: string[]): PostComprehensiveUpdate {
    const updated: PostComprehensiveUpdate = {
        title,
        imageUrlsArr,
        paragraphsArr,
        cuedMemberInfoArr,
        channelId,
        topicIdsArr,
        status: 201,
        totalLikedCount: 0,
        totalUndoLikedCount: 0,
        totalDislikedCount: 0,
        totalUndoDislikedCount: 0
    };
    return updated;
}

export function provideEditedPostInfo(postComprehensive: IPostComprehensive): IEditedPostComprehensive {
    return {
        editedTime: new Date().getTime(),
        titleBeforeEdit: postComprehensive.title,
        imageUrlsArrBeforeEdit: [...postComprehensive.imageUrlsArr],
        paragraphsArrBeforeEdit: [...postComprehensive.paragraphsArr],
        cuedMemberInfoArrBeforeEdit: [...postComprehensive.cuedMemberInfoArr],
        channelIdBeforeEdit: postComprehensive.channelId,
        topicIdsArrBeforeEdit: [...postComprehensive.topicIdsArr],
        totalLikedCountBeforeEdit: postComprehensive.totalLikedCount,
        totalDislikedCountBeforeEdit: postComprehensive.totalDislikedCount,
    }
}

export function getRestrictedFromPostComprehensive(postComprehensive: IPostComprehensive): IRestrictedPostComprehensive {
    ``
    const { status, totalLikedCount, totalUndoLikedCount, totalDislikedCount, totalUndoDislikedCount, totalCommentCount, totalCommentDeleteCount, totalSavedCount, totalUndoSavedCount } = postComprehensive;
    const totalLiked = totalLikedCount - totalUndoLikedCount;
    const totalDisliked = totalDislikedCount - totalUndoDislikedCount;
    const totalComment = totalCommentCount - totalCommentDeleteCount;
    const totalSaved = totalSavedCount - totalUndoSavedCount;
    const restricted: IRestrictedPostComprehensive = {
        //// info ////
        postId: postComprehensive.postId,
        memberId: postComprehensive.memberId,
        createdTime: postComprehensive.createdTime,
        title: '',
        imageUrlsArr: [],
        paragraphsArr: [],
        cuedMemberInfoArr: [],
        channelId: postComprehensive.channelId,
        topicIdsArr: [],
        pinnedCommentId: null,

        //// management ////
        status: status,

        //// statistics ////
        totalHitCount: postComprehensive.totalHitCount,
        totalLikedCount: totalLiked,
        totalDislikedCount: totalDisliked,
        totalCommentCount: totalComment,
        totalSavedCount: totalSaved,

        //// edit info ////
        editedTime: null,
    };
    if ('number' === typeof status && 0 > status) {
        return restricted;
    }
    restricted.title = postComprehensive.title;
    restricted.imageUrlsArr.push(...postComprehensive.imageUrlsArr);
    restricted.paragraphsArr.push(...postComprehensive.paragraphsArr);
    restricted.cuedMemberInfoArr.push(...postComprehensive.cuedMemberInfoArr);
    restricted.topicIdsArr.push(...postComprehensive.topicIdsArr);
    restricted.pinnedCommentId = postComprehensive.pinnedCommentId;
    if ('number' === typeof status && 1 === status % 100) {
        const { edited } = postComprehensive;
        if (Array.isArray(edited) && edited.length !== 0) {
            const lastEdit = edited[edited.length - 1];
            restricted.editedTime = lastEdit.editedTime;
        }
    }
    return restricted;
}

//////// Utilize local storage ////////
export function updateLocalStorage(storageName: string) {
    const update = (processStates: ProcessStates) => {
        const states: ProcessStates = { ...processStates };
        window.localStorage.setItem(storageName, JSON.stringify(states))
    }
    return update;
}

export function restoreFromLocalStorage(storageName: string) {
    const restore = (setProcessStates: Function) => {
        const prevStates: ProcessStates = JSON.parse(window.localStorage.getItem(storageName) ?? '{}')
        if (prevStates !== null && Object.keys(prevStates).length !== 0) {
            setProcessStates(prevStates);
        }
    }
    return restore;
}

//////// Verify infomation ////////
export function verifyEmailAddress(emailAddress: string): boolean {
    const regex = new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/);
    return regex.test(emailAddress);
}

export function verifyPassword(password: any): boolean {
    if (undefined === password) {
        return false;
    }
    if ('string' !== typeof password) {
        return false;
    }
    const regex = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/);
    return regex.test(password);
}

export function verifyId(id: any) {
    if (!(undefined !== id && 'string' === typeof id)) {
        return {
            isValid: false,
            category: '',
            id: ''
        }
    }
    const ref = `${id}`.toUpperCase();
    const cat = ref.slice(0, 1);
    if (!(new RegExp(/[CDMNPT]/).test(cat))) {
        return {
            isValid: false,
            category: '',
            id: ''
        }
    }
    switch (cat) {
        case 'M':
            if (new RegExp(`^[A-Z0-9]{8,9}$`).test(ref)) {
                return { isValid: false, category: 'member', id: '' }
            } else {
                return { isValid: true, category: 'member', id: ref }
            }
        case 'N':
            if (new RegExp(`^[A-Z0-9]{6,7}$`).test(ref)) {
                return { isValid: false, category: 'notice', id: '' }
            } else {
                return { isValid: true, category: 'notice', id: ref }
            }
        case 'T':
            return { isValid: true, category: 'topic', id: ref }
        case 'C':
            if (new RegExp(`^[A-Z0-9]{12,13}$`).test(ref)) {
                return { isValid: false, category: 'comment', id: '' }
            } else {
                return { isValid: true, category: 'comment', id: ref }
            }
        case 'D':
            if (new RegExp(`^[A-Z0-9]{12,13}$`).test(ref)) {
                return { isValid: false, category: 'subcomment', id: '' }
            } else {
                return { isValid: true, category: 'subcomment', id: ref }
            }
        case 'P':
            if (new RegExp(`^[A-Z0-9]{10,11}$`).test(ref)) {
                return { isValid: false, category: 'post', id: '' }
            } else {
                return { isValid: true, category: 'post', id: ref }
            }
        default: return {
            isValid: false,
            category: '',
            id: ''
        }
    }
}

export function verifyUrl(url: any): boolean {
    if (undefined === url) {
        return false;
    }
    if ('string' !== typeof url) {
        return false;
    }
    const regex = new RegExp(/^(?:https?):\/\/(.?\w)+(:\d+)?(\/([\w.%\-\/]))?$/);
    return regex.test(url);
}

type VerifyResult = {
    status: number;
    message: string;
}

export async function verifyRecaptchaResponse(recaptchaServerSecret: string, recaptchaResponse: any): Promise<VerifyResult> {
    try {
        if ('string' !== typeof recaptchaResponse || '' === recaptchaResponse) {
            return {
                status: 403,
                message: 'Invalid ReCAPTCHA response'
            }
        }
        if ('' === recaptchaServerSecret) {
            return {
                status: 500,
                message: 'ReCAPTCHA shared key not found'
            }
        }
        const recaptchaVerifyResp = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaServerSecret}&response=${recaptchaResponse}`, { method: 'POST' })
        // [!] invoke of json() make the probability of causing TypeError
        const { success } = await recaptchaVerifyResp.json();
        if (!success) {
            return {
                status: 403,
                message: 'ReCAPTCHA either failed or expired'
            }
        }
        return {
            status: 200,
            message: ''
        }
    } catch (e) {
        return {
            status: 500,
            message: e instanceof TypeError ? `Attempt to reterieve info from ReCAPTCHA response. ${e}` : `Uncategorized Error occurred. ${e}`
        }
    }
}

type EnvironmentVariableObject = {
    [key: string]: string;
}

export function verifyEnvironmentVariable(obj: EnvironmentVariableObject): string | undefined {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && '' === obj[key]) {
            return key;
        }
    }
    return undefined;
}

//////// Compose response ////////
export function response405(request: NextApiRequest, response: NextApiResponse) {
    const { url, method } = request;
    response.status(405).send(`${url}: ${method} is not allowed`);
}

export function response500(response: NextApiResponse, msg: string) {
    // response.status(500).send(msg);
    response.status(500).send('development' === process.env.NODE_ENV ? msg : 'Internal Server Error');
}

//////// Log ////////
export function log(msg: string, e: any = {}) {
    console.log(`[${new Date().toISOString()}] ${msg} ${e?.stack}`);
}