# The Mojito App 莫希托

8 September 2022 | Established

27 October 2022 | Domain name announced

4 January 2023 | Logo registeration applied

[toc]

# Branding

26/10/2022 | Domain name officially announced

- mojito.co.nz 莫希托新西兰 (beta test)
- themojitoapp.com 🆕









# Management

## Admin email

webmaster.mojito@gmail.com









# Architecture

## Host

Azure Web App / [Vercel](https://vercel.com/pricing)





## DB

### 💡[Design] 

| Category        | Desc                                                 | Candidate           |
| --------------- | ---------------------------------------------------- | ------------------- |
| Content data    | Member info, post info, comment info, etc.           | Azure Table Storage |
| Statistics data | Member statistics, post statistics, topic statistics | MongoDB  Atlas      |

### Cost Management

#### Content data

| Mode       | Access Tier      | Storage (Storage in GB / month) | 10K Write | 10K Read | 10K Scan | 10K List |
| ---------- | ---------------- | ------------------------------- | --------- | -------- | -------- | -------- |
| Dev&Test   | **LRS**          | $0.0847 per GB                  | $0.0599   | $0.0120  | $0.2155  | $0.2155  |
| Production | **GRS** (RA-GRS) | $0.1059 per GB ($0.1377 per GB) | $0.1197   | $0.0120  | $0.2155  | $0.2155  |

#### Statistics data

| Mode       | Cluster           | Hourly rate |
| ---------- | ----------------- | ----------- |
| Dev&Test   | Free **Shared**   | N/A         |
| Production | **Dedicated** M10 | $0.12       |



## File Storage

### 💡[Design] 

| File Type | Desc                 | Candidate          |
| --------- | -------------------- | ------------------ |
| Images    | Avatars, post images | Azure Blob Storage |

### Cost Management

| Mode       | Access Tier | Storage (50 TB / month) | 10K Write | 10K Read |
| ---------- | ----------- | ----------------------- | --------- | -------- |
| Dev&Test   | **Hot**     | $0.0342 per GB          | $0.1223   | $0.0098  |
| Production | **Hot**     | $0.0342 per GB          | $0.1223   | $0.0098  |





# Interfaces & Types

Specifiy a type as a rule when communicating between components, APIs and DBs.



## MemberBehaviour

### VerifyAccountRequestInfo

```typescript
type VerifyAccountRequestInfo = {
    memberId: string;
}
```

### ResetPasswordRequestInfo

```typescript
type ResetPasswordRequestInfo = {
    memberId: string;
    resetPasswordToken: string;
    expireDate: number;
}
```





# Tables (Azure Storage)

\* Terms:

- [RL]: Relation record table
- [PRL]: Passive Relation record table (side-affected by operations on the corresponding RL table)



## 📘Credentials

| Property | Type   | Desc                     |
| -------- | ------ | ------------------------ |
| MemberId | string | 10 characters, UPPERCASE |

### [RL] Credentials

\* This table records the password credentials for login procedure

| PartitionKey        | RowKey                       | MemberId | PasswordHash          | LastUpdatedTimeBySecond |
| ------------------- | ---------------------------- | -------- | --------------------- | ----------------------- |
| EmailAddressSHA1Str | `"MojitoMemberSystem"`, etc. | string   | string, SHA256 String | number                  |

| PartitionKey        | RowKey                 | VerifyEmailAddressToken | CreatedTimeBySecond |
| ------------------- | ---------------------- | ----------------------- | ------------------- |
| EmailAddressSHA1Str | `"VerifyEmailAddress"` | string                  | number              |

| PartitionKey        | RowKey            | ResetPasswordToken | CreatedTimeBySecond |
| ------------------- | ----------------- | ------------------ | ------------------- |
| EmailAddressSHA1Str | `"ResetPassword"` | string             | number              |



## 📘Mapping

### [RL] FollowingMemberMapping

\* This table records the following member ids of the partition key (member id)

| PartitionKey | RowKey               | CreatedTimeBySecond | BriefIntro | IsActive |
| ------------ | :------------------- | ------------------- | ---------- | -------- |
| MemberIdStr  | FollowingMemberIdStr | number              | string     | boolean  |

### [PRL] FollowedByMemberMapping

\* This table records the member ids of who have been following the partition key (member id)

| PartitionKey | RowKey                | CreatedTimeBySecond | BriefIntro | IsActive |
| ------------ | --------------------- | ------------------- | ---------- | -------- |
| MemberIdStr  | FollowedByMemberIdStr | number              | string     | boolean  |

### [RL] BlockingMemberMapping

\* This table records the member ids blocked by the partition key (member id)

| PartitionKey | RowKey              | CreatedTimeBySecond | BriefIntro | IsActive |
| ------------ | ------------------- | ------------------- | ---------- | -------- |
| MemberIdStr  | BlockingMemberIdStr | number              | string     | boolean  |

### [PRL] BlockedByMemberMapping

\* This table records the member ids of who have blocked the partition key (member id)

| PartitionKey | RowKey               | CreatedTimeBySecond | BriefIntro | IsActive |
| ------------ | -------------------- | ------------------- | ---------- | -------- |
| MemberIdStr  | BlockedByMemberIdStr | number              | string     | boolean  |

### [RL] HistoryMapping

\* This table records the post ids viewed by the partition key (member id)

| Key          | Type    | Desc           |
| ------------ | ------- | -------------- |
| PartitionKey | string  | MemberIdStr    |
| RowKey       | string  | PostIdStr      |
| IsActive     | boolean | Default `true` |

### [RL] CreationsMapping

\* This table records the post ids published by the partition key (member id)

| Key          | Type    | Desc           |
| ------------ | ------- | -------------- |
| PartitionKey | string  | MemberIdStr    |
| RowKey       | string  | PostIdStr      |
| IsActive     | boolean | Default `true` |

### [RL] SavedMapping

\* This table records the post ids saved by the partition key (member id)

| Key          | Type    | Desc           |
| ------------ | ------- | -------------- |
| PartitionKey | string  | MemberIdStr    |
| RowKey       | string  | PostIdStr      |
| IsActive     | boolean | Default `true` |



## 📘Registry

### [RL] Registry

\* This table records the registry credentials

| PartitionKey | RowKey               | MemberId | IsActive |
| ------------ | -------------------- | -------- | -------- |
| `"Nickname"` | nicknameBase64String | string   | boolean  |



## 📘Notification

| Property     | Type   | Desc                                                         |
| ------------ | ------ | ------------------------------------------------------------ |
| NoticeId     | string | combined id strings, 10 ~ 36 characters, UPPERCASE, begin with 'N' plus Notice category code (e.g., 'NC', cued) |
| PostTitle    | string |                                                              |
| CommentBrief | string | maximum 21 characters                                        |

### [PRL] Notice

#### Cued (@)

| PartitionKey        | RowKey   | Category | InitiateId  | Nickname | PostTitle | CommentBrief? |
| ------------------- | -------- | -------- | ----------- | -------- | --------- | ------------- |
| NotifiedMemberIdStr | NoticeId | `"cue"`  | MemberIdStr | string   | string    | string        |

```
- WebMaster在文章“WebMaster在Mojito发的第一篇文章”中提到了您
- WebMaster在文章“WebMaster在Mojito发的第一篇文章”的评论“可喜可贺可惜可...”中提到了您
```

#### Replied (↩️)

| PartitionKey        | RowKey   | Category  | InitiateId  | Nickname | PostTitle | CommentBrief? |
| ------------------- | -------- | --------- | ----------- | -------- | --------- | ------------- |
| NotifiedMemberIdStr | NoticeId | `"reply"` | MemberIdStr | string   | string    | string        |

```
- WebMaster回复了您的文章“WebMaster在Mojito发的第一篇文章”
- WebMaster在文章“WebMaster在Mojito发的第一篇文章”中回复了您的评论“可喜可贺可惜可...”
```

#### Liked (❤️)

| PartitionKey        | RowKey   | Category | InitiateId  | Nickname | PostTitle | CommentBrief? |
| ------------------- | -------- | -------- | ----------- | -------- | --------- | ------------- |
| NotifiedMemberIdStr | NoticeId | `"like"` | MemberIdStr | string   | string    | string        |

```
- WebMaster喜欢了您的文章“WebMaster在Mojito发的第一篇文章”
- WebMaster喜欢了您在“WebMaster在Mojito发的第一篇文章”中发表的评论“可喜可贺可惜可...”
```

#### Pinned (⬆️)

| PartitionKey        | RowKey   | Category | InitiateId  | Nickname | PostTitle | CommentBrief |
| ------------------- | -------- | -------- | ----------- | -------- | --------- | ------------ |
| NotifiedMemberIdStr | NoticeId | `"pin"`  | MemberIdStr | string   | string    | string       |

```
- WebMaster置顶了您在“WebMaster在Mojito发的第一篇文章”中发表的评论“可喜可贺可惜可...”
```

#### Saved (💾)

| PartitionKey        | RowKey   | Category | InitiateId  | Nickname | PostTitle |
| ------------------- | -------- | -------- | ----------- | -------- | --------- |
| NotifiedMemberIdStr | NoticeId | `"save"` | MemberIdStr | string   | string    |

```
- WebMaster收藏了“WebMaster在Mojito发的第一篇文章”
```

#### Followed (🔔)

| PartitionKey        | RowKey   | Category   | InitiateId  | Nickname |
| ------------------- | -------- | ---------- | ----------- | -------- |
| NotifiedMemberIdStr | NoticeId | `"follow"` | MemberIdStr | string   |

```
- WebMaster关注了您
```



## 📘Channel

| ChannelId                    | ChannelNameStr | 繁體 |        | Svg Icon Reference |
| ---------------------------- | -------------- | ---- | ------ | ------------------ |
| recommend<br />(🚫Not-in-use) | Recommended    | 推薦 | 推荐   |                    |
| food                         | Food           |      | 美食   | RestaurantIcon     |
| shopping                     | Shopping       |      | 好物   | GradeIcon          |
| hobby                        | Hobby          | 興趣 | 兴趣   | NightlifeIcon      |
| event                        | Event          | 活動 | 活动   |                    |
| sports                       | Sports         | 運動 | 运动   | SportsTennisIcon   |
| travel                       | Travel         |      | 旅行   | AirplaneTicketIcon |
| photography                  | Photography    | 攝影 | 摄影   | PhotoCameraIcon    |
| work                         | Work           |      | 工作   |                    |
| life                         | Life           |      | 生活   | FamilyRestroomIcon |
| pets                         | Pets           | 寵物 | 萌宠   | PetsIcon           |
| automobile                   | Automobile     | 汽車 | 汽车   | TimeToLeaveIcon    |
| realestate                   | Realestate     | 房建 | 不动产 | HouseIcon          |
| furnishing                   | Furnishing     | 裝潢 | 家装   | YardIcon           |
| invest                       | Invest         | 投資 | 投资   | MonetizationOnIcon |
| politics                     | Politics       | 時政 | 时事   | NewspaperIcon      |
| chat                         | Chat           | 閑聊 | 灌水   |                    |
| all                          | All            |      | 全部   |                    |
| music                        | Music          | 音樂 | 音乐   | MusicNoteIcon      |

```
["food","shopping","hobby","event","sports","travel","photography","work","life","pets","automobile","realestate","furnishing","invest","politics","chat"]
```



### [T] ChannelInfo

| PartitionKey | RowKey       | ZH-TW  | ZH-CH  | EN     | SvgIconPath |
| ------------ | ------------ | ------ | ------ | ------ | ----------- |
| `"Info"`     | ChannelIdStr | string | string | string | string      |

| PartitionKey | RowKey      | InedxValue                |
| ------------ | ----------- | ------------------------- |
| `"IdArray"`  | `"default"` | string, stringified array |



## Reference

- Microsoft - Design for Querying [Link](https://learn.microsoft.com/en-us/azure/storage/tables/table-storage-design-for-query)





# Collections (Atlas)

\* Terms:

- \[C\]: Collection

```shell
mongosh "mongodb+srv://mojito-statistics-dev.cukb0vs.mongodb.net/mojito-statistics-dev" --apiVersion 1 --username dbmaster
```



## 📗Member

### [C] memberComprehensive

`mojito-statistics-dev.comprehensive.member`

```typescript
{
    _id: string;  // mongodb obejct id
    
    //// info ////
    memberId: string; // 8 ~ 9 characters, UPPERCASE, begin with 'M'
    providerId: string; // "MojitoMemberSystem" | "GitHubOAuth" | ...
    
    registeredTimeBySecond: number; // Math.floor(new Date().getTime() / 1000) 
    verifiedTimeBySecond: number;
    
    emailAddress: string;
    lastAvatarImageUpdatedTimeBySecond: number;
    
    nickname: string;
    lastNicknameUpdatedTimeBySecond: number;
    
    lastPasswordUpdatedTimeBySecond: number;
  	
    briefIntro: string;
    lastBriefIntroUpdatedTimeBySecond: number;
    
    gender: -1 | 0 | 1
    lastGenderUpdatedTimeBySecond: number;
    
    birthday: string;
    lastBirthdayUpdatedTimeBySecond: number;
    
    lastSettingsUpdatedTimeBySecond: number;
    
    //// management ////
    status: number;
    allowPosting: boolean;
    lastUploadImageRequestTimeBySecond: number;
    allowCommenting: boolean;
    
    allowKeepingBrowsingHistory: boolean;
    allowVisitingFollowedMembers: boolean;
    allowVisitingSavedPosts: boolean;
    hidePostsAndCommentsOfBlockedMember: boolean;
}
```

### 💡Member Status Code

| Code     | Explanation                                             |
| -------- | ------------------------------------------------------- |
| **-3**   | **Deactivated by WebMaster**                            |
| -2       | Deactivated (Cancelled)                                 |
| -1       | Suspended                                               |
| 0        | Established, email address not verified                 |
| **200**  | **Email address verified or third party login, normal** |
| **≥400** | **Restricted to certain content or behaviour**          |

### 💡Type CuedMemberInfo



### [C] memberStatistics

`mojito-statistics-dev.statistics.member`

```typescript
{
    _id: string; // mongodb obejct id
    memberId: string;
    
    // creation
    totalCreationsCount: number; // info page required
    totalCreationHitCount: number;
    totalCreationEditCount: number;
    totalCreationDeleteCount: number;
    totalCreationLikedCount: number; // info page required
    totalCreationUndoLikedCount: number;
    totalCreationDislikedCount: number;
    totalCreationUndoDislikedCount: number;
    totalCreationSavedCount: number; // info page required
    totalCreationUndoSavedCount: number;
    
    // attitude
    totalLikedCount: number;
    totalUndoLikedCount: number;
    totalDislikedCount: number;
    totalUndoDislikedCount: number;
    
    // comment
    totalCommentCount: number;
    totalCommentEditCount: number;
    totalCommentDeleteCount: number;
    totalCommentLikedCount: number;
    totalCommentUndoLikedCount: number;
    totalCommentDislikedCount: number;
    totalCommentUndoDislikedCount: number;
    
    // post
    totalSavedCount: number;
    totalUndoSavedCount: number;
    
    // on other members
    totalFollowingCount: number;
    totalUndoFollowingCount: number;
    totalBlockingCount: number;
    totalUndoBlockingCount: number;
    
    // by other members
    totalFollowedByCount: number; // info page required
    totalUndoFollowedByCount: number;
    totalBlockedByCount: number;
    totalUndoBlockedByCount: number;
}
```

### [C] memberStatisticsHistory

\* Maintained by automation script

```typescript
{
    _id: string; // mongodb obejct id
    
    memberId: string;    
 	createdTimeBySecond: number; // created time of this document (member statistics snapshot)
    memberStatisticsObj: { [key: timeStr]: MemberStatistics }
}
```

### 💡Type MemberStatistics

```typescript
{
    // creation
    totalCreationsCount: number; // info page required
    totalCreationEditCount: number;
    totalCreationDeleteCount: number;
    // by other members
	totalCreationLikedCount: number; // info page required
    totalCreationDislikedCount: number;
    totalCommentLikedCount: number;
    totalCommentDislikedCount: number;
    totalSavedCount: number; // info page required
    followedByCount: number; // info page required
}
```

### [C] loginJournal

`mojito-statistics-dev.journal.login`

```typescript
{
    _id: string; // mongodb obejct id
    memberId: string;
   	category: 'error' | 'success';
    providerId: 'MojitoMemberSystem' | string; // LoginProviderId
    timestamp: string; // new Date().toISOString()
    message: string; // short message, e.g., 'Attempted login while email address not verified.'
}
```



## 📗Notification

### [C] notificationStatistics

```typescript
{
    _id: ObjectId;
    memberId?: string; // member id
    cue?: number; // cued times accumulated from last count reset
    reply?: number;
    like?: number;
    pin?: number;
    save?: number;
    follow?: number;
}
```



## 📗Attitude

### [C] attitudeComprehensive

```typescript
{
    _id: string; // mongodb obejct id
    
    memberId: string;
    postId: string; // divided by post id
    attitude: number; // -1 | 0 | 1
    commentAttitudeMapping: {
        [key: commentIdStr]: number // -1 | 0 | 1
    };
}
```



## 📗Comment

### [C] commentComprehensive

```typescript
{
     _id: string; // mongodb obejct id
    
    //// info ////
    commentId: string; // 12 ~ 13 characters, UPPERCASE, comment id begin with 'C', subcomment id begin with 'D'
    parentId: string; // post or comment id
    postId: string;
    memberId: string;
    createdTimeBySecond: number; // Math.floor(new Date().getTime() / 1000) 
    content: string;
    cuedMemberComprehensivesArr: ICuedMemberComprehensive[];
    
	//// management ////
    status: number;
    
    //// statistics ////
    totalLikedCount: number;
    totalUndoLikedCount: number;
    totalDislikedCount: number;
    totalUndoDislikedCount: number;
    totalSubcommentCount: number; // for comment entities only
    totalSubcommentDeleteCount: number; // for comment entities only
    totalEditCount: number;
    totalAffairCount: number;
    
    //// edit info ////
    edited: IEditedCommentComprehensive[];
}
```

### 💡Type CuedMemberComprehensive

```typescript
{
    memberId: string;
    nickname: string;
}
```

### 💡Type EditedCommentComprehensive

```typescript
{
    editedTime: number;
    contentBeforeEdite: string;
    cuedMemberComprehensivesArrBeforeEdit: ICuedMemberComprehensive[];
    totalLikedCountBeforeEdit: number;
    totalDislikedCountBeforeEdit: number;
    totalSubcommentCountBeforeEdit?: number;
}
```

### 💡Type RestrictedCommentComprehensive

```typescript
{
    _id: string; // mongodb obejct id
    
     //// info ////
    commentId: string; //12 ~ 13 characters, UPPERCASE, comment id begin with 'C', subcomment id begin with 'D'
    postId: string;
    memberId: string;
    createdTimeBySecond: number; // created time of this document (comment est.)
    content: string | null;

    //// management ////
    status: number;

    //// statistics ////
    totalLikedCount: number;
    totalDislikedCount: number;
    totalSubcommentCount?: number; // for comment entities only

    //// edit info ////
    editedTime: number | null;
}
```

### 💡Comment Status Code

| Code    | Explanation00                          |
| ------- | -------------------------------------- |
| **-3**  | **Deactivated (removed) by WebMaster** |
| -1      | Deactivated (removed)                  |
| **200** | **Normal**                             |
| 201     | Normal, edited                         |



## 📗Channel

### [C] channelStatistics

```json
{
    _id: ObjectId; // mongodb obejct id
    
    //// info ////
    channelId: string; // pre-defined channel id
    createdTimeBySecond: number;
    
    //// total statistics ////
    totalHitCount: number;
    totalTopicCount: number;
    totalPostCount: number;
    totalPostDeleteCount: number;
    totalLikedCount: number;
    totalUndoLikedCount: number;
    totalCommentCount: number; // subcomment included
    totalCommentDeleteCount: number;
    totalSavedCount: number;
    totalUnavedCount: number;
}
```

### [C] channelStatisticsHistory

\* Maintained by automation script

```json
{
    _id: ObjectId; // mongodb obejct id
    
    //// info ////
    channelId: string;
    createdTimeBySecond: number; // created time of this document (channel statistics snapshot)
    channelStatisticsObj: { [key: timeStr]: ChannelStatistics }
}
```

### 💡Type ChannelStatistics

```json
{
    totalHitCount: number;
    totalTopicCount: number;
    totalPostCount: number;
    totalCommentCount: number;
}
```



## 📗Topic

### [C] topicComprehensive

```typescript
{
    _id: ObjectIdStr; // mongodb obejct id
    
    //// info ////
    topicId: string; // base64 string from topic content string，content string length no longer than 10
    channelId: string;
    createdTimeBySecond: number; // create time of this document (topic est.)
    
    //// management ////
    status: number;
    
    //// total statistics ////
    totalHitCount: number; // total hit count of total posts of this topic
    totalSearchCount: number;
    totalPostCount: number;
    totalPostDeleteCount: number;
    totalLikedCount: number;
    totalUndoLikedCount: number;
    totalCommentCount: number;
    totalCommentDeleteCount: number;
    totalSavedCount: number;
    totalUndoSavedCount: number;
}
```

### 💡Idea of improvement

It could be better for the "count" filed to be counted by statistics scripts, e.g.,

```typescript
// #5 (cond.) update totalHitCount (of ITopicComprehensive) in [C] topicComprehensive
const { topicIdsArr } = postComprehensiveQueryResult;
    if (Array.isArray(topicIdsArr) && topicIdsArr.length !== 0) {
        const topicComprehensiveCollectionClient = atlasDbClient.db('comprehensive').collection<ITopicComprehensive>('topic');
        for await (const topicId of topicIdsArr) {
        const topicComprehensiveUpdateResult = await topicComprehensiveCollectionClient.updateOne({ topicId }, {
        $inc: {        totalHitCount: 1        }        });
        if (!topicComprehensiveUpdateResult.acknowledged) {
        log(`Failed to update totalHitCount (of ITopicStatistics, topic id:${topicId}, post id: ${postId}) in [C] topicStatistics`);
        }
    }
}
```

1. Instead of accumulate `totalHitCount` by topic id, update all the topic-post mapping using `db.collection.updateMany()`
2. Utlize statistics scripts to count `hitCount` then accumlate to the `topicComprehensive.totalHitCount`

### 💡TopicStatus Codes

| Code    | Explanation                            |
| ------- | -------------------------------------- |
| **-3**  | **Deactivated (removed) by WebMaster** |
| -1      | Deactivated (removed)                  |
| **200** | **Normal**                             |

### [C] topicStatisticsHistory

\* Maintained by automation script

```typescript
{
 	_id: string; // mongodb obejct id
    
    topicId: string;    
 	createdTimeBySecond: number; // created time of this document (topic statistics snapshot)
    topicStatisticsObj: { [key: timeStr]: TopicStatistics }
}
```

### 💡Type TopicStatistics

```typescript
{
    totalPostCount: number;
    totalHitCount: number;
    totalCommentCount: number;
    totalSearchCount: number;
}
```

### [C] topicPostMapping

```typescript
{
     _id: string; // mongodb obejct id
    
    //// info ////
    topicId: string;
    postId: string;
    channelId: string;
    createdTimeBySecond: number; // created time of this document (post est. time)
    
    //// management ////
    status: number;
}
```



## 📗TopicRanking

### [C] topicRankingStatistics

\* Maintained by automation script

```typescript
{
    _id: string; // mongodb obejct id
    
    //// info ////
    rankingId: string; // topic ranking id
    channelId: string; // channel id
    topicRankingObj: TopicRankingStatistics
}
```

### [C] topicRankingStatisticsHistory

\* Maintained by automation script

```typescript
{
    _id: string; // mongodb obejct id
    
    //// ranking info ////
    rankingId: string; // topic ranking id
    channelId: string; // channel id
    createTime: number; // reated time of this document (topic ranking statistics snapshot)
    topicRankingStatisticsObj: { [key: timeStr]: TopicRankingStatistics }
}
```

### 💡Type TopicRankingStatistics

```typescript
{
   [key: topicIdStr]: {
       topicId: string;
       content: string;
   }
}
```



## 📗Post

### [C] postComprehensive

```typescript
{
    _id: ObjectId; // mongodb obejct id
    
    //// info ////
    postId: string; // 10 ~ 11 characters, UPPERCASE, begin with 'P'
    memberId: string;
    createdTimeBySecond: number; // Math.floor(new Date().getTime() / 1000) 
    title: string;
    imageFullamesArr: string[];
	paragraphsArr: string[];
    cuedMemberComprehensivesArr: ICuedMemberComprehensive[];
	channelId: string;
	topicIdsArr: string[];
	pinnedCommentId: string;

    //// management ////
    status: number; 

    //// total statistics ////
	totalHitCount: number; // viewed times accumulator
    totalMemberHitCount: number;
    totalLikedCount: number;
	totalUndolikedCount: number;
    totalDislikedCount: number;
	totalUndoDislikedCount: number;
    totalCommentCount: number;
    totalCommentDeleteCount: number;
    totalSavedCount: number;
	totalUndoSavedCount: number;
	totalEditCount: number;
    totalAffairCount: number;
    
    //// edit info ////
    edited: IEditedPostComprehensive[];
}
```

### 💡EditedPostComprehensive

```typescript
{
    editedTime: number;
    titleBeforeEdit: string;
    imageUrlsArrBeforeEdit: string[];
    paragraphsArrBeforeEdit: string[];
    cuedMemberComprehensivesArrBeforeEdit: ICuedMemberComprehensive[];
    channelIdBeforeEdit: string;
    topicIdsArrBeforeEdit: string[];
    totalLikedCountBeforeEdit: number;
    totalDislikedCountBeforeEdit: number;
    totalAffairCountBeforeEdit: number;
}
```

### 💡Type RestrictedPostComprehensive

```typescript
{
    //// info ////
    postId: string; // 10 characters, UPPERCASE
    memberId: string;
    createdTimeBySecond: number; // created time of this document (post est.)
    title: string | null;
    imageUrlsArr: string[];
    paragraphsArr: string[];
    cuedMemberComprehensivesArr: ICuedMemberComprehensive[];
    channelId: string;
    topicIdsArr: string[];
    pinnedCommentId: string | null;

    //// management ////
    status: number;

    //// statistics ////
    totalHitCount: number; // viewed times accumulator
    totalLikedCount: number;
    totalDislikedCount: number;
    totalCommentCount: number;
    totalSavedCount: number;

    //// edit info ////
    editedTime: number | null;
}
```

### 💡Post Status Codes

| Code     | Explanation                            |
| -------- | -------------------------------------- |
| **-3**   | **Deactivated (deleted) by WebMaster** |
| -1       | Deactivated (deleted)                  |
| 1        | Initiated (waiting on images upload)   |
| **200**  | **Normal**                             |
| 201      | Normal, edited                         |
| **≥400** | **Restricted to certain behaviour**    |
| 401      | Edited, disallow commenting            |

### [C] postStatisticsHistory

\* Maintained by automation script

```typescript
{
     _id: string; // mongodb obejct id
    
    postId: string;    
 	createdTimeBySecond: number; // created time of this document (post statistics snapshot)
    postStatisticsObj: { [key: timeStr]: PostStatistics }
}
```

### 💡Type PostStatistics

```typescript
{
    totalHitCount: number;
    totalLikedCount: number;
    totalDislikedCount: number;
    totalCommentCount: number;
    totalSavedCount: number;
}
```



## 📗PostRanking

### [C] postRankingStatistics 

\* Maintained by automation script

```json
{
    _id: ObjectId; // mongodb obejct id
    
    rankingId: string; // post ranking id
    channelId: string; // all/food/shopping/etc.
    postRankingObj: PostRankingStatistics;
}
```

| RankingId | Desc |
| --------- | ---- |
| 24H_NEW   |      |
| 24H_HOT   |      |
| 7D_HOT    |      |
| 30D_HOT   |      |

### [C] postRankingStatisticsHistory

\* Maintained by automation script

```typescript
{
    _id: string; // mongodb obejct id
    
    //// ranking info ////
    rankingId: string; // post ranking id
    channelId: string; // all/food/shopping/etc.
    createTime: number; // reated time of this document (post ranking statistics snapshot)
    postRankingStatisticsObj: { [key: timeStr]: PostRankingStatistics }
}
```

### 💡Type PostRankingStatistics

```typescript
{
    [key: postIdStr]: {
       postId: string;
       title: string;
       imageUrl: string; // url string of the first image or empty ("")
   }
}
```



## 📗Affair

### [C] affairComprehensive

```typescript
{
    _id: ObjectId; // mongodb obejct id
    
    affairId: string;
    defendantId: string; // member id
    referenceId: string; // post or comment id
    referenceContent: string;
	category: number; // 1 ~ 7
    comment: string;
    
    createdTimeBySecond: number; // Math.floor(new Date().getTime() / 1000) 
    status: number;
    
}
```

### 💡Affair category

| Category | Desc                |
| -------- | ------------------- |
| 1        | hatespeech          |
| 2        | harassment+bullying |
| 3        | pornography         |
| 4        | illegalactivities   |
| 5        | spam+advertising    |
| 6        | violence            |
| 7        | misinformation      |



## Reference

- MongoDB - Find a document [Link](https://www.mongodb.com/docs/drivers/node/current/usage-examples/find/)





# Systems Design

\* Terms:

- est: Establish / Initialize / Create
- acc: Accumulate
- inc: Increase
- dec: Decrease



## 📦Signup & Login

### ▶️Register with Mojito Member System

| Behaviour         | Involved tables / collections                                |
| ----------------- | ------------------------------------------------------------ |
| Register a member | [RL] Credentials ***(est.)***,<br />[C] memberComprehensive ***(est.)***<br />[C] memberLoginJournal ***(est.)*** |

1. Look up login credential (email address hash) in **[RL] Credentials**

2. Create a new record of ***LoginCredentials*** in **[RL] Credentials** or return ***"Email registered" error***

   ```json
   {
       partitionKey: "_", // email address hash
       rowKey: "MojitoMemberSystem",
       MemberId: "_", // 10 characters, UPPERCASE
       passwordHash: "_"
   }
   ```

3. **Upsert** a new record of ***VerifyEmailAddressCredentials*** in **[RL] Credentials**

   ```json
   {
       partitionKey: "_", // email address hash
       rowKey: "VerifyEmailAddress",
       VerifyEmailAddressToken: "_", // 8 characters Hex, UPPERCASE
   }
   ```

4. Create a new document of ***MemberComprehensive*** with limited info and management in **[C] memberComprehensive**

   ```json
   {
       //// info ////
       memberId: "_", // 10 characters, UPPERCASE
       providerId: "MojitoMemberSystem",
       registeredTimeBySecond: 1670987135509,
       emailAddress: "_",
       //// management ////
       status: 0,
       allowPosting: false,
       allowCommenting: false
   }
   ```

5. Create a new document of ***MemberLoginJournal*** in **[C] memberLoginJournal**

   ```json
   {
       memberId: "_",
      	category: 'success',
       providerId: 'MojitoMemberSystem',
       timestamp: "2022-12-14T03:05:35.509Z",
       message: "Registered. Please verify email address to get full access."
   }
   ```

6. Send email

   ```json
   { // base64 string contains info as follows
       memberId: "_",
       providerId: "MojitoMemberSystem",
       emailAddressHash: "",
       token: "" // 8 characters Hex, UPPERCASE
   }
   ```

### ▶️Request for re-send verification email

| Behaviour                  | Involved tables / collections                  |
| -------------------------- | ---------------------------------------------- |
| Request for password reset | [RL] Credentials,<br />[C] memberComprehensive |

1. Look up login credential (email address hash) in **[RL] Credentials**

2. Look up member management (status) in **[C] memberComprehensive** or return ***"Member can not be activated" error (status>0)***

3. Create a new record of ***VerifyEmailAddressCredentials*** in **[RL] Credentials**

   ```json
   {
       partitionKey: "_", // email address hash
       rowKey: "VerifyEmailAddress",
       ResetPasswordToken: "_" // 8 characters Hex, UPPERCASE
   }
   ```

4. Send email

   ```json
   { // base64 string contains info as follows
       memberId: "_",
       providerId: "MojitoMemberSystem",
       emailAddressHash: "_",
       token: "" // 8 characters Hex, UPPERCASE
   }
   ```

*\* This procedure applied for both Mojito Member System signin and Third-party login provider signin.*

*\* This procedure is unable to prohibit users from verifying two members with same the email address. This system allows member shares email addresses between login providers*

### ▶️Verify email address

| Behaviour            | Involved tables / collections                                |
| -------------------- | ------------------------------------------------------------ |
| Verify email address | [RL] Credentials,<br />[C] memberComprehensive,<br />[C] memberStatistics ***(est.)***<br />[C] notificationStatistics ***(est.)*** |

1. Retrieve info from email content

   ```json
   {
       providerId: "MojitoMemberSystem", // "MojitoMemberSystem"| "GitHubOAuth" | undefined (deemed as "MojitoMemberSystem")
       emailAddressHash: "_",
       token: "" // 8 characters Hex, UPPERCASE
   }
   ```

2. Look up login credentials (email address hash) in **[RL] Credentials**

3. Look up verify email address credentials (token) in **[RL] Credentials** or return ***"Member not found" error***

4. Match the verify email address tokens or return ***"Member cannot be activated" error (token not match or not found)***

5. Update member info (status, verified time) in **[C] memberComprehensive** or ***"Member cannot be activated" error***

   ```json
   {
       //// info ////
       verifiedTimeBySecond: new Date().getTime(),
       gender: 0,
       //// management ////
       status: 200,
       allowPosting: true,
       allowCommenting: true
   }
   ```

6. Create a new document of ***MemberStatistics*** in **[C] memberStatistics**

   ```json
   {
       memberId: "_",
       //// total statistics ////
       totalCreationsCount: 0, // info page required
       totalCreationEditCount: 0,
       // ...
   }
   ```

7. Create a new document of ***Notification*** in **[C] notificationStatistics**

   ```json
   {
       memberId: "_",
       newCuedCount: 0, // accumulated from last reset
       newRepliedCount: 0,
       newLikedCount: 0,
       newSavedCount: 0,
       newFollowedCount: 0,
   }
   ```

8. Create a new document of ***MemberLoginJournal*** in **[C] memberLoginJournal**

   ```json
   {
       memberId: "_",
      	category: 'success',
       providerId: 'MojitoMemberSystem',
       timestamp: "2022-12-14T03:05:35.509Z",
       message: "Email address verified."
   }
   ```

### ▶️Request re-send verification email

1. Retrieve request info (email address, provider id) from request body

### ▶️Login with Mojito Member System

| Behaviour                             | Involved tables / collections                                |
| ------------------------------------- | ------------------------------------------------------------ |
| Login with <br />Mojito Member System | [RL] Credentials,<br />[C] memberComprehensive,<br />[C] memberLoginJournal |

1. Look up login credentials (email address hash, password hash) in **[RL] Credentials**

2. Match password hashes or return ***"Member not found" error***

3. Look up member management (status) in **[C] memberComprehensive** or return ***"Email address and password not match" error***

4. Look up member info or return ***"Member not activated" or "Member has been suspended or deactivated" error***

5. Return member info

6. Create a new document of ***MemberLoginJournal*** in **[C] memberLoginJournal**

   ```json
   {
       memberId: "_",
      	category: 'success',
       providerId: 'MojitoMemberSystem',
       timestamp: "2022-12-14T03:05:35.509Z",
       message: "Login."
   }
   ```

### ▶️Login with Third-party login provider

| Behaviour                                   | Involved tables / collections                                |
| ------------------------------------------- | ------------------------------------------------------------ |
| Login with <br />Third-party login provider | [RL] Credentials,<br />[C] memberComprehensive,<br />[C] memberLoginJournal |

1. Look up login credential record (email address hash) in **[RL] Credentials**

2. Look up member management (status) in **[C] memberComprehensive** or

   1. Create a new record of ***LoginCredentials*** in **[RL] Credentials**

      ```json
      {
          partitionKey: "_", // email address hash
          rowKey: "GitHubOAuth", // login (register) with a GitHub account
          MemberId: "_" // 10 characters, UPPERCASE
      }
      ```

   2. **Upsert** a new record of ***VerifyEmailAddressCredentials*** in **[RL] Credentials**

      ```json
      {
          partitionKey: "_", // email address hash
          rowKey: "VerifyEmailAddress",
          VerifyEmailAddressToken: "_", // 8 characters Hex, UPPERCASE
      }
      ```

   3. Create a new document of ***MemberComprehensive*** with limited info and management in **[C] memberComprehensive**

      ```json
      {
          //// info ////
          memberId: "_", // 10 characters, UPPERCASE
          providerId: "GitHubOAuth", // login (register) with a GitHub account
          registeredTimeBySecond: 1670987135509,
          emailAddress: "_",
          nickname: "_",
         	avatarImageFullName: "_",
          //// management ////
          status: 0,
          allowPosting: false,
          allowCommenting: false
      }
      ```

   4. Create a new document of ***MemberLoginJournal*** in **[C] memberLoginJournal** 

      ```json
      {
          memberId: "_",
         	category: 'success',
          providerId: 'GitHubOAuth',
          timestamp: "2022-12-14T03:05:35.509Z",
          message: "Registered."
      }
      ```

   5. Send email (notice member to go over **▶️Verify email address** procedure before signin)

      ```json
      { // base64 string contains info as follows
          memberId: "_",
          providerId: "GitHubOAuth",
          emailAddressHash: "_",
          token: "" // 8 characters Hex, UPPERCASE
      }
      ```

4. Return member info or return ***"Member not activated" or "Member has been suspended or deactivated" error***

5. Create a new document of ***MemberLoginJournal*** in **[C] memberLoginJournal**

   ```typescript
   {
       memberId: "_",
      	category: 'success',
       providerId: 'GitHubOAuth',
       timestamp: "2022-12-14T03:05:35.509Z",
       message: "Login."
   }
   ```



## 📦Member Info

### ▶️Request for password reset

| Behaviour                  | Involved tables / collections |
| -------------------------- | ----------------------------- |
| Request for password reset | [RL] Credentials              |

1. Look up login credentials (email address hash) in **[RL] Credentials**

2. Create a new record of ***ResetPasswordCredentials*** in **[RL] Credentials** or return ***"Member not found" error***

   ```json
   {
       partitionKey: "_", // email address hash
       rowKey: "ResetPassword",
       ResetPasswordToken: "_" // 8 characters Hex, UPPERCASE
   }
   ```

3. Send email

   ```json
   { // base64 string contains info as follows
       emailAddressHash: "_",
       token: "" // 8 characters Hex, UPPERCASE
   }
   ```

### ▶️Reset password

| Behaviour      | Involved tables / collections |
| -------------- | ----------------------------- |
| Reset Password | [RL] Credentials              |

1. Look up login credentials (email address hash) in **[RL] Credentials** or return ***"Member not found" error***

2. Look up reset password credentials (token) in **[RL] Credentials**

3. Verify modified timestamp and match the reset password tokens or return ***"Password cannot be reset" error (token not match or not found)***

4. Return (success)

5. Create a new document of ***MemberLoginJournal*** in **[C] memberLoginJournal**

   ```json
   {
       memberId: "_",
      	category: 'success',
       providerId: 'MojitoMemberSystem',
       timestamp: "2022-12-14T03:05:35.509Z",
       message: "Reset password."
   }
   ```

   

### ▶️Update member info

| Behaviour                  | Involved tables / collections |
| -------------------------- | ----------------------------- |
| Update AvatarImageFullName | [C] memberComprehensive       |
| Update Nickname            | [C] memberComprehensive       |
| Update Password            | [RL] Credentials              |
| Update BriefIntro          | [C] memberComprehensive       |
| Update Gender              | [C] memberComprehensive       |
| Update Birthday            | [C] memberComprehensive       |

### 💡Forbid Members frequently updating their avatar image 

Only allow updating avatar image after 7 days since last update.

```typescript
const {Timestamp: lastModifiedTime} = MemberInfoQueryResult.value;
const diff:number = new Date().getTime() - new Date(lastModifiedTime).getTime();
if (diff < 604800000) {
    // allow updating avatar image
}
```

### 💡Forbid Members frequently updating their nicknames

Only allow updating nickname after 7 days since last update

```typescript
// Same as above
```

### 💡Forbid Members frequently updating other info

Only allow updating other info after 30 seconds since last update

```
您更新太频繁了，请稍候片刻再重试
```



## 📦Behaviour on other Members

### ▶️Follow/Unfollow a member

| Behaviour            | Affected tables / collections                                |
| -------------------- | ------------------------------------------------------------ |
| Follow a member      | [RL] FollowingMemberMapping ***(est.)***,<br />[PRL] FollowedByMemberMapping ***(est.)***,<br />( Cond. [PRL] Notice ),<br />( Cond. [C] Notification ***(acc.)*** ),<br />[C] MemberStatistics***(.totalFollowingCount acc.)***<br />[C] MemberStatistics***(.totalUndoFollowingCount acc. of the member has been followed)*** |
| Undo follow a member | [RL] FollowingMemberMapping ***(del.)***,<br />[PRL] FollowedByMemberMapping ***(del.)***,<br />[C] MemberStatistics***(.totalFollowingCount acc.)***<br />[C] MemberStatistics***(.totalUndoFollowedByCount acc. of the member has been undo followed)*** |


### ▶️Block/Unblock a member

| Behaviour           | Affected tables / collections                                |
| ------------------- | ------------------------------------------------------------ |
| Block a member      | [RL] BlockingMemberMapping ***(est./put.)***,<br />[C] memberStatistics***.totalBlockingCount (acc.)***<br />[C] memberStatistics***.totalBlockedByCount (acc. of the member has been blocked)***,<br />[PRL] BlockedByMemberMapping ***(est./put.)*** |
| Undo block a member | [RL] BlockingMemberMapping ***(put.)***,<br />[PRL] BlockedByMemberMapping ***(put.)***,<br />[C] memberStatistics***.totalUndoBlockingCount (acc.)***<br />[C] memberStatistics***.totalUndoBlockedByCount (acc. of the member has been blocked)*** |



## 📦Attitude

### ▶️Get attitude on a post/comment/subcomment

| Behaviour    | Affected tables / collections |
| ------------ | ----------------------------- |
| Get attitude | [C] attitudeComprehensive     |

### ▶️Express attitude on a comment/subcomment

| Behaviour    | Affected tables / collections                                |
| ------------ | ------------------------------------------------------------ |
| Like         | [C] attitudeComprehensive,<br />[C] memberStatistics***.totalLikedCount (inc.)***,<br />[C] memberStatistics***.totalCommentLikedCount (inc. of the comment author)***<br />[C] commentComprehensive***.totalLikedCount (inc.)***,<br />( Cond. [PRL] Notice***.Liked (est.)*** ),<br />( Cond. [C] notificationStatistics***.likedCount (acc.)*** ) |
| Undo like    | [C] attitudeComprehensive,<br />[C] memberStatistics***.totalUndoLikedCount (inc.)***,<br />[C] memberStatistics***.totalCommentUndoLikedCount (inc. of the comment author)***<br />[C] commentComprehensive***.totalUndoLikedCount (inc.)*** |
| Dislike      | [C] attitudeComprehensive,<br />[C] memberStatistics***.totalDislikedCount (inc.)***,<br />[C] memberStatistics***.totalCommentDislikedCount (inc. of the comment author)***<br />[C] commentComprehensive***.totalDislikedCount (inc.)*** |
| Undo dislike | [C] attitudeComprehensive,<br />[C] memberStatistics***.totalUndoDislikedCount (inc.)***,<br />[C] memberStatistics***.totalCommentUndoDislikedCount (inc. of the comment author)***<br />[C] commentComprehensive***.totalUndoDislikedCount (inc.)*** |

### ▶️Express attitude on a post

| Behaviour    | Affected tables / collections                                |
| ------------ | ------------------------------------------------------------ |
| Like         | [C] attitudeComprehensive,<br />[C] memberStatistics***.totalLikedCount (inc.)***,<br />[C] memberStatistics***.totalCreationLikedCount (inc. of the post author)***,<br />[C] postComprehensive***.totalLikedCount (inc.)***,<br />[C] channelStatistics***.totalLikedCount (inc.)***,<br />( Cond. [C] topicComprehensive***.totalLikedCount (inc.)*** ),<br />( Cond. [PRL] Notice***.Liked (est.)*** ),<br />( Cond. [C] notificationStatistics***.likedCount (acc.)*** ) |
| Undo like    | [C] attitudeComprehensive,<br />[C] memberStatistics***.totalUndoLikedCount (inc.)***,<br />[C] memberStatistics***.totalCreationUndoLikedCount (inc. of the post author)***,<br />[C] postComprehensive***.totalUndoLikedCount (inc.)***,<br />[C] channelStatistics***.totalUndoLikedCount (inc.)***,<br />( Cond. [C] topicComprehensive***.totalUndoLikedCount (inc.)*** ) |
| Dislike      | [C] attitudeComprehensive,<br />[C] memberStatistics***.totalDislikedCount (inc.)***,<br />[C] memberStatistics***.totalCreationDislikedCount (inc. of the post author)***,<br />[C] postComprehensive***.totalDislikedCount (inc.)*** |
| Undo dislike | [C] attitudeComprehensive,<br />[C] memberStatistics***.totalUndoDislikedCount (inc.)***,<br />[C] memberStatistics***.totalCreationUndoDislikedCount (inc. of the post author)***,<br />[C] postComprehensive***.totalUndoDislikedCount (inc.)*** |



## 📦Comment

### ▶️Create a comment / subcomment

| Behaviour                            | Affected tables / collections                                |
| ------------------------------------ | ------------------------------------------------------------ |
| Create a comment<br />(Cue a member) | [C] commentComprehensive ***(est.)***,<br />[C] memberStatistics***.totalCommentCount (acc.)***,<br />( Cond. [C] commentComprehensive***.totalSubcommentCount (acc.)*** )<br />[C] postComprehensive***.totalCommentCount (acc.)***,<br />[C] channelStatistics***.totalCommentCount (acc.)***<br />( Cond. [C] topicComprehensive***.totalCommentCount (acc.)*** )<br />( Cond. [PRL] Notice***.Replied (est.)*** ),<br />( Cond. [C] notificationStatistics***.repliedCount (acc.)*** ),<br />( Cond. [PRL] Notice***.Cued (est.)*** ),<br />( Cond. [C] notificationStatistics***.cuedCount (acc.)*** ) |

1. Look up document of ***IPostComprehensive*** in **[C] postComprehensive**
2. Insert a new document of ***ICommentComprehensive*** in **[C] commentComprehensive** or return  ***"Post not found" error***
3. Update document (**totalCommentCount**) in **[C] postComprehensive** 
4. Update document (**totalCommentCount**) in **[C] memberStatistics**
5. Update document (**totalCommentCount**) in **[C] channelStatistics**
6. Skip (if post not belonged to any topics) or Update documents (**totalCommentCount**) in **[C] topicComprehensive**
7. Skip (if not cued anyone or blocked) or Create a new record of ***RepliedNotice*** in **[PRL] Notice**
8. Skip (if not cued anyone or blocked) or Update document (**repliedCount**) in **[C] notificationStatistics**
9. Skip (if blocked by post author) or Create a new record of ***CuedNotice*** in **[PRL] Notice**
10. Skip (if blocked by post author)  or Update document (**cuedCount**) in **[C] notificationStatistics**

### ▶️Edit a comment / subcomment

| Behaviour                                                    | Affected tables / collections                                |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| Edit a comment<br />(Only allowed once,<br /> Editing results in losing<br />like / dislike data)🆕 | [C] commentComprehensive ***(put.)***,<br />[C] memberStatistics***.totalCommentEditCount (acc.)***,<br />( Cond. [PRL] Notice***.Cued (est.)*** ),<br />( Cond. [C] notificationStatistics***.cuedCount (acc.)*** ) |

1. Look up comment management (status) in **[C] commentComprehensive**

2. Verify comment status

3. Update document (**content, status=201, totalEditCount (acc.)**) in **[C] commentComprehensive** or return ***"Method not allowed" error (status<0)***

   ```
   201 [有更改]/[Edited]
   ```

4. Update document (**totalCommentEditCount++**) in **[C] memberStatistics**

5. Skip (if not cued anyone or blocked) or Create a new record of ***RepliedNotice*** in **[PRL] Notice**

6. Skip (if not cued anyone or blocked) or Update document (**cuedCount**) in **[C] notificationStatistics**

*\* Edit actions are only allowed once. Once performed would result in losing like/dislike data*

### ▶️Delete a comment / subcomment

| Behaviour        | Affected tables / collections                                |
| ---------------- | ------------------------------------------------------------ |
| Delete a comment | [C] commentComprehensive ***(put.)***,<br />[C] memberStatistics***.totalCommentDeleteCount (acc.)***<br />( Cond. [C] commentComprehensive***.totalSubcommentDeleteCount (acc.)*** )<br />[C] postComprehensive***.totalCommentDeleteCount (acc.)***<br />[C] channelStatistics***.totalCommentDeleteCount(acc.)***<br />( Cond. [C] topicComprehensive***.totalCommentDeleteCount(acc.)*** ) |

1. Update document (**content, status=-1/-3**) in **[C] commentComprehensive**

   ```
   -1 [已删除]/[Removed]
   -3 [已被管理员删除]/[Removed by MojitoMaster]
   ```

2. Update document (**totalCommentEditCount++**) in **[C] memberStatistics**

### ▶️Pin a comment

| Behaviour     | Affected tables / collections                      |
| ------------- | -------------------------------------------------- |
| Pin a comment | [C] postComprehensive***.pinnedCommentId (put.)*** |



## 📦Topic

| Behaviour      | Affected tables / collections                        |
| -------------- | ---------------------------------------------------- |
| Create a topic | See ▶️Create a post                                   |
| Refer a topic  | See ▶️Create a post                                   |
| Search a topic | [C] topicComprehensive***.totalSearchCount (acc.)*** |



## 📦Post

### ▶️View a post

| Behaviour   | Affected tables / collections                                |
| ----------- | ------------------------------------------------------------ |
| View a post | ( Cond. [RL] HistoryMapping ***(est./put. of the post viewer)*** ),<br />[C] memberStatistics***.totalCreationHitCount (acc.)***,<br />[C] postComprehensive***.totalHitCount (acc.)***,<br />[C] channelStatistics***.totalHitCount (acc.)***,<br />( Cond. [C] topicStatistics ***.totalHitCount (acc.)*** ) |

1. Look up post status in **[C] postComprehensive**

### ▶️Create a post

| Behaviour     | Affected tables / collections                                |
| ------------- | ------------------------------------------------------------ |
| Create a post | [C] postComprehensive,<br />[C] memberStatistics***.totalCreationsCount (acc.)***,<br />[C] channelStatistics***.totalPostCount (acc.)***<br />( Cond. [C] topicComprehensive***.totalPostCount (acc.)*** ),<br />( Cond. [C] topicPostMapping ***(est.)*** )<br />( Cond. [PRL] Notice***.Cued (est.)*** ),<br />( Cond. [C] notificationStatistics***.cuedCount (acc.)*** ) |

1. Insert a new document of ***IPostComprehensive*** in **[C] postComprehensive**
2. Skip (if this post not belonged to any topics) or Insert a new document of ***ITopicPostMapping*** in **[C] topicPostMapping**
3. Skip (if this post belongs to no new topics) or Insert a new document of ***ITopicComprehensive***  in **[C] topicComprehensive**, Insert a new document of ***ITopicPostMapping*** in **[C] topicPostMapping**
4. Update document (**totalCreationsCount**) in **[C] memberStatistics**
5. Update document (**totalPostCount**) in **[C] channelStatistics**
6. Skip (if this post not belonged to any topics) or Update documents (**totalPostCount**) in **[C] topicComprehensive**
7. Skip (if blocked by post author) or Create a new record of ***CuedNotice*** in **[PRL] Notice**
8. Skip (if blocked by post author)  or Update document (**cuedCount**) in **[C] notificationStatistics**

### ▶️Edit a post

| Behaviour   | Affected tables / collections                                |
| ----------- | ------------------------------------------------------------ |
| Edit a post | [C] postComprehensive,<br />[C] memberComprehensive***.totalCommentEditCount (acc.)***<br />( Cond. [C] topicComprehensive***.totalPostCount (acc./dec.)*** ),<br />( Cond. [C] topicPostMapping ***(est./del.)*** )<br />( Cond. [PRL] Notice***.Cued (est.)*** ),<br />( Cond. [C] notificationStatistics***.cuedCount (acc.)*** ) |

### ▶️Delete a creation (post)

| Behaviour     | Affected tables / collections                                |
| ------------- | ------------------------------------------------------------ |
| Delete a post | [RL] CreationMapping ***(del.)***<br />[C] postComprehensive***.status (put.)***,<br />[C] memberStatistics***.totalCreationDeleteCount (acc.)***,<br />[C] channelStatistics***.totalPostDeleteCount (acc.)***,<br />( Cond. [C] topicComprehensive***.totalPostDeleteCount (acc.)*** ),<br />( Cond. [C] topicPostMapping***.status (put.)***) |

### ▶️Save a post

| Behaviour     | Affected tables / collections                                |
| ------------- | ------------------------------------------------------------ |
| Save a post   | [RL] SavedMapping,<br />[C] memberStatistics***.totalSavedCount (acc.)***,<br />[C] memberStatistics***.totalCreationSavedCount (acc.)***,<br />[C] postComprehensive***.totalSavedCount (acc.)***,<br />[C] channelStatistics***.totalSavedCount (acc.)***<br />( Cond.[C] topicComprehensive***.totalSavedCount (acc.)*** ),<br />( Cond. [PRL] Notice***.Saved (est.)*** ),<br />( Cond. [C] notificationStatistics***.savedCount (acc.)*** ) |
| Unsave a post | [C] memberStatistics***.totalUndoSavedCount (acc.)***,<br />[C] memberStatistics***.totalCreationUndoSavedCount (acc.)***,<br />[C] postComprehensive***.totalUndoSavedCount(acc.)***,<br />[C] channelStatistics***.totalUndoSavedCount (acc.)***<br />( Cond. [C] topicComprehensive***.totalUndoSavedCount(acc.) )*** |



# APIs



## 🛠️Notification

GET|`/api/notification/[id]`



## 🛠️Member

### Signup

POST|`/api/member/behaviour/signup/index`

### Signin

POST|`/api/auth/[...nextauth]`

### Info & Statistics

GET|`/api/member/info/[id]`

POST|`/api/member/info/[id]`

POST|`/api/member/behaviour/follow/[id]`

POST|`/api/member/behaviour/block/[id]`

GET|`/api/member/behaviour/resetpassword/request?emaillAddress=`



## 🛠️Comment

###  Comment Info & Statistics

GET|`/api/comment/s/of/[postId]`

POST|`/api/comment/of/[postId]/info/index`

GET|`/api/comment/of/[postId]/info/[commentId]`

POST|`/api/comment/of/[postId]/info/[commentId]`

PUT|`/api/comment/of/[postId]/info/[commentId]`

DELETE|`/api/comment/of/[postId]/info/[commentId]`

### Subcomment Info & Statistics

GET|`/api/subcomment/s/of/[commentId]`

POST|`/api/subcomment/of/[commentId]/info/index`

GET|`/api/subcomment/of/[commentId]/info/[subcommentId]`

POST|`/api/subcomment/of/[commentId]/info/[subcommentId]`

PUT|`/api/subcomment/of/[commentId]/info/[subcommentId]`

DELETE|`/api/subcomment/of/[commentId]/info/[subcommentId]`



## 🛠️Channel

### Info & Statistics

GET|`/api/channel/info/[id]`

GET|`/api/channel/dictionary`

GET|`/api/channel/index`



## 🛠️Topic

### Info & Statistics

GET| `/api/topic/[id]`

GET| `/api/topic/of/channel/[id]`

POST| `/api/topic/index`



## 🛠️Post

### Info & Statistics

GET|`/api/post/info/[id]`

POST|`/api/post/info/index`

PUT|`/api/post/info/[id]`

DELETE|`/api/post/info/[id]`

POST|`/api/post/behaviour/save/[id]`

POST|`/api/post/behaviour/attitude/[id]`





 





# Mail



## Use Azure Communication Service to send emails

## Send an email

```shell
npm i @azure/communication-email
```

[Reference](https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/send-email?pivots=programming-language-javascript)





# Ui Design

## Swiper on home page

Options

- [Swiper](https://swiperjs.com/get-started)



## Post FormData(image) to API

During dev, three ways of posting form data has been tested but finally the way using `Axios` has been accepted.

### Fetch API (JSON)

```typescript
/// using fetch
const resp = await fetch('/api/image/putImage', {
    method: 'POST',
    body: JSON.stringify({
        file: formdata
    })
})
console.log(await resp.text())
```

### XMLHttpRequest (FormData)

```typescript
// using XMLHttpRequest
const request = new XMLHttpRequest();
request.open('POST', '/api/image/putImage');
request.setRequestHeader('content-type', 'multipart/form-data; boundary=null'); // boundary must be set? During tests it is
request.send(formData);
```

### Axios (FormData with progress indicator) 

```typescript
let formData = new FormData();
const config = {
    headers: { 'Content-Type': 'multipart/form-data' }, // headers must be in correct 
    onUploadProgress: (event) => {
        console.log(`Current progress:`, Math.round((event.loaded * 100) / event.total));
    },
};
formData.append('uploadpic', uploadFileList, (uploadFileList as any).name);

const response = await axios.post('/api/image/putImage', formData, config);
console.log('response', response.data);
```



## MUI Theme

- With `themeProvider` can easily modify the default mui theme

  ```tsx
  const theme = createTheme({
      palette: {
          primary: 'black'
      }
  })
  
  return(
      <ThemeProvider theme={theme}>
      </ThemeProvider>
  )
  ```

  

- With `<CssBaseline />` can disable all the default css styles

  ```
  <h3></h3> => <div></div>
  ```




## Error Page

| Error                        | Origin | Desc |
| ---------------------------- | ------ | ---- |
| AccessDenied                 | signin |      |
| EmailAddressUnverified       | signin |      |
| InappropriateEmailAddress    |        |      |
| PermissionDenied             |        |      |
| MemberSuspendedOrDeactivated | signin |      |
| MemberDeactivated            | signin |      |



## MemberInfo

```typescript
{/* initiate info */}
<Stack direction={'row'} sx={{ maxHeight: 40 }}>
    {/* <IconButton sx={{ px: 0 }} onClick={handleClickOnInitiateInfo(info.initiateId)}> */}
    <Avatar src={provideAvatarImageUrl(info.initiateId, domain)} sx={{ width: 40, height: 40, bgcolor: 'grey' }}>{info.nickname?.charAt(0).toUpperCase()}</Avatar>
    {/* </IconButton> */}
    <Box ml={1} width={100}>
        <TextButton color={'inherit'} onClick={handleClickOnInitiateInfo(info.initiateId)}>

            {/* nickname */}
            <Typography align={'left'} fontSize={14}>{getNicknameBrief(info.nickname)}</Typography>

            {/* created time */}
            <Typography variant={'body2'} fontSize={{ xs: 12, align: 'right' }}>{timeToString(info.createdTimeBySecond, preferenceStates.lang)}</Typography>
        </TextButton>
    </Box>
</Stack>
```





# Db & Storage



## Using Azure Data Tables Api

```
npm install @azure/data-tables
```



## Docs Reference

[Reference](https://www.npmjs.com/package/@azure/data-tables/v/13.0.0)



## `&` Used in no-standard CSS

```scss
a {
   color:#ff0000;
   &:hover {
      color:#0000ff;
   }
}
```

```css
a {
   color:#ff0000;
}

a:hover {
   color:#0000ff;
}
```



## Authorize access to data in Azure Storage

> Each time you access data in your storage account, your client  application makes a request over HTTP/HTTPS to Azure Storage. By  default, every resource in Azure Storage is secured, and every request  to a secure resource must be authorized. Authorization ensures that the  client application has the appropriate permissions to access a  particular resource in your storage account.

[Reference](https://learn.microsoft.com/en-us/azure/storage/common/authorize-data-access)



# Authenticate & Authorize



## NextAuth.js

[Reference](https://next-auth.js.org/)

[Example](https://github.com/nextauthjs/next-auth-example)



## Use JWT

Use dependencies

-  [JWT](https://www.npmjs.com/package/jsonwebtoken)
- [Cookie](https://www.npmjs.com/package/cookie)

Demo

 * Reference NextJS cookie [demo](https://github.com/vercel/next.js/blob/deprecated-main/examples/api-routes-middleware/utils/cookies.js) 

 * Mojito demo

    ```typescript
    const privateKey = 'hello_mojito';
    const options = {
        httpOnly: true,
        maxAge: 15 * 60 // 15 minutes
    };
    const token = jwt.sign({ // payload
        memberId: '0',
        memberNickname: 'henrycechen',
    }, privateKey);
    // name, token, options
    res.setHeader('Set-Cookie', cookie.serialize('grant-token', token, options)); 
    res.status(200).send('Valid token');
    ```

    

```typescript
export default async function Verify(req: NextApiRequest, res: NextApiResponse) {
    const { method, url, query } = req;
    if ('GET' !== method) {
        res.status(403).send(`${url}: ${method} is not allowed`);
    } else if ('string' !== typeof query.token) {
        res.status(403).send('Invalid token');
    } else {
        const info = btoa(query.token);
        // verify memberif against token
        const match = true;
        if (match) {
            res.status(200).send('Valid token');
        } else {
            res.status(403).send('Invalid token');
        }
    }
}
```



## A study on `[...nextauth].ts`

### `signin({ user, account, profile, email, credentials })` callback

**A credential signIn will get the result**

- user

  ```json
  {
    id: '6TTK1WH0OD',
    email: 'henrycechen@gmail.com',
    image: 'imageUrl',
    emailAddress: 'henrycechen@gmail.com',
    nickname: '',
    avatarImageFullName: ''
  }
  ```

- account

  ```json
  {
    providerAccountId: '6TTK1WH0OD',
    type: 'credentials',
    provider: 'credentials'
  }
  ```

- profile

  ```json
  undefined
  ```

- email

  ```json
  undefined
  ```

- credentials

  ```json
  {
    recaptchaResponse: '03AEkXODAaGpnQMK...MkUWaWNsqrg',
    emailAddress: 'henrycechen@gmail.com',
    password: '123@abcD',
    csrfToken: 'c998d89b2402c3fd18f3cd0e06ba17917461248e08f098f8e72837aab3dbe335',
    callbackUrl: 'http://localhost/signin?callbackUrl=http%3A%2F%2Flocalhost%2F',
    json: 'true'
  }
  ```

  

**A GitHub user signIn will get the result**

- user

  ```json
  {
    id: '74887388',
    name: 'HenryCeChen',
    email: 'henrycechen@gmail.com',
    image: 'https://avatars.githubusercontent.com/u/74887388?v=4'
  }
  ```
  
- account

  ```json
  {
    provider: 'github',
    type: 'oauth',
    providerAccountId: '74887388',
    access_token: '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',
    token_type: 'bearer',
    scope: 'read:user,user:email'
  }
  ```

- profile

  ```json
  {
    login: 'henrycechen',
    id: 74887388,
    node_id: 'MDQ6VXNlcjc0ODg3Mzg4',
    avatar_url: 'https://avatars.githubusercontent.com/u/74887388?v=4',
    gravatar_id: '',
    url: 'https://api.github.com/users/henrycechen',
    html_url: 'https://github.com/henrycechen',
    followers_url: 'https://api.github.com/users/henrycechen/followers',
    following_url: 'https://api.github.com/users/henrycechen/following{/other_user}',
    gists_url: 'https://api.github.com/users/henrycechen/gists{/gist_id}',
    starred_url: 'https://api.github.com/users/henrycechen/starred{/owner}{/repo}',
    subscriptions_url: 'https://api.github.com/users/henrycechen/subscriptions',
    organizations_url: 'https://api.github.com/users/henrycechen/orgs',
    repos_url: 'https://api.github.com/users/henrycechen/repos',
    events_url: 'https://api.github.com/users/henrycechen/events{/privacy}',
    received_events_url: 'https://api.github.com/users/henrycechen/received_events',
    type: 'User',
    site_admin: false,
    name: 'HenryCeChen',
    company: null,
    blog: '',
    location: null,
    email: 'henrycechen@gmail.com',
    hireable: null,
    bio: null,
    twitter_username: null,
    public_repos: 8,
    public_gists: 0,
    followers: 0,
    following: 0,
    created_at: '2020-11-23T02:50:11Z',
    updated_at: '2022-11-02T08:19:09Z',
    private_gists: 0,
    total_private_repos: 2,
    owned_private_repos: 2,
    disk_usage: 12274,
    collaborators: 0,
    two_factor_authentication: false,
    plan: {
      name: 'free',
      space: 976562499,
      collaborators: 0,
      private_repos: 10000
    }
  }
  ```

- email

  ```json
  undefined
  ```

- credentials

  ```json
  undefined
  ```
  



### `jwt({ token, user, account, profile })` callback

**A GitHub user signIn will get the result (first call of jwt())**

- token

  ```json
  {
    name: 'HenryCeChen',
    email: 'henrycechen@gmail.com',
    picture: 'https://avatars.githubusercontent.com/u/74887388?v=4',
    sub: '74887388'
  }
  ```
  
- user

  ```json
  {
    id: '74887388',
    name: 'HenryCeChen',
    email: 'henrycechen@gmail.com',
    image: 'https://avatars.githubusercontent.com/u/74887388?v=4'
  }
  ```
  
- account

  ```json
  {
    provider: 'github',
    type: 'oauth',
    providerAccountId: '74887388',
    access_token: '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',
    token_type: 'bearer',
    scope: 'read:user,user:email'
  }
  ```
  
- profile

  ```json
  {
    login: 'henrycechen',
    id: 74887388,
    node_id: 'MDQ6VXNlcjc0ODg3Mzg4',
    avatar_url: 'https://avatars.githubusercontent.com/u/74887388?v=4',
    gravatar_id: '',
    url: 'https://api.github.com/users/henrycechen',
    html_url: 'https://github.com/henrycechen',
    followers_url: 'https://api.github.com/users/henrycechen/followers',
    following_url: 'https://api.github.com/users/henrycechen/following{/other_user}',
    gists_url: 'https://api.github.com/users/henrycechen/gists{/gist_id}',
    starred_url: 'https://api.github.com/users/henrycechen/starred{/owner}{/repo}',
    subscriptions_url: 'https://api.github.com/users/henrycechen/subscriptions',
    organizations_url: 'https://api.github.com/users/henrycechen/orgs',
    repos_url: 'https://api.github.com/users/henrycechen/repos',
    events_url: 'https://api.github.com/users/henrycechen/events{/privacy}',
    received_events_url: 'https://api.github.com/users/henrycechen/received_events',
    type: 'User',
    site_admin: false,
    name: 'HenryCeChen',
    company: null,
    blog: '',
    location: null,
    email: 'henrycechen@gmail.com',
    hireable: null,
    bio: null,
    twitter_username: null,
    public_repos: 8,
    public_gists: 0,
    followers: 0,
    following: 0,
    created_at: '2020-11-23T02:50:11Z',
    updated_at: '2022-11-02T08:19:09Z',
    private_gists: 0,
    total_private_repos: 2,
    owned_private_repos: 2,
    disk_usage: 12274,
    collaborators: 0,
    two_factor_authentication: false,
    plan: {
      name: 'free',
      space: 976562499,
      collaborators: 0,
      private_repos: 10000
    }
  }
  ```





# Anti-Robot



## ReCAPTCHA

[recaptcha console](https://www.google.com/u/4/recaptcha/admin/site/584181821)

### 使用ReCAPTCHA保护所有不被NextAuth保护的API Endpoint

本节使用Change password service作为例子。

本服务器使用第三方依赖`react-google-recaptcha`提供ReCAPTCHA component。

在每次与API交互时，Request中都必须包含`recaptchaResponse`，否则服务器会拒绝服务并返回403状态码。

```typescript
// #1 verify if requested by human
if ('string' !== typeof recaptchaResponse || '' === recaptchaResponse) {
    res.status(403).send('Invalid ReCAPTCHA response');
    return;
}
if ('' === recaptchaServerSecret) {
    response500(res, 'ReCAPTCHA shared key not found');
    return;
}
const recaptchaVerifyResp = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaServerSecret}&response=${recaptchaResponse}`, { method: 'POST' })
// [!] invoke of json() make the probability of causing TypeError
const { success } = await recaptchaVerifyResp.json();
if (!success) {
    res.status(403).send('ReCAPTCHA failed');
    return;
}
```



### Solve react-google-recaptcha null ref issue

This demo is used to reset ReCAPTCHA challenge

```typescript
let Recaptcha: any;
// ...
const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
	event.preventDefault();
    // ...
    Recaptcha?.reset();
}
return (
	{/* React Components */}
    <ReCAPTCHA
        // ...
        ref={(ref: any) => ref && (Recaptcha = ref)}
    />
)
```

[Reference](https://stackoverflow.com/questions/46514194/how-to-reset-google-recaptcha-with-react-google-recaptcha)



## AES

### Change password service

本服务器使用AES产生修改密码的令牌。

使用伪随机数产生`resetPasswordToken`，添加到`requestInfo`中，后作为凭据唤出修改密码界面

```typescript
const info: ResetPasswordRequestInfo = {
    memberId,
    resetPasswordToken: token,
    expireDate: new Date().getTime() + 15 * 60 * 1000 // set valid time for 15 minutes
}
```

由于AES加密会使用`+`、`/` 等字符，所以再加密后再做了一次Base64

```typescript
Buffer.from(CryptoJS.AES.encrypt(JSON.stringify(info), appSecret).toString()).toString('base64')
```

以下为实际测试用例中的`requestInfo`的载荷

```
VTJGc2RHVmtYMS9HQWQydEQ1aFJMUXlmUDhoYXJlZzJjNW0vMEJ3SCttcFhhUXdTZFF3RGtyNjN4OXcxWWFPOGt1cTJvTmpQTGU0SEo2OE9hamdUOUJVZWQyVXNteDhFTFhHZnZrcFBvVi93YSs0b3NmQ1Fsanl2eGpZOEFiUnQ= 
```

解密后的JSON Object如下

```json
{
    "memberId":"1",
    "resetPasswordToken":"12E3EF56BBE8AC",
    "expireDate":1667912944866
}
```

解密后的Info无需访问数据库即可得知`memberId`并判断Token是否过期





# Error Definitions





# Develop



## Use Azure Storage

[Reference](https://learn.microsoft.com/en-us/azure/storage/queues/storage-nodejs-how-to-use-queues?tabs=javascript)



## Use Gmail Api to send emails

[Youtube](https://www.youtube.com/watch?v=-rcRf7yswfM)



## [TS] Option '--resolveJsonModule' cannot be specified without 'node' module resolution strategy.

In `tsconfig.json` file,

the defult settings is configured to 

```json
"resolveJsonModule": true,
```

The compiler was yelling

```
Option '--resolveJsonModule' cannot be specified without 'node' module resolution strategy.
```

Also in the other TS file

```
Cannot find module 'next'. Did you mean to set the 'moduleResolution' option to 'node', or to add aliases to the 'paths' option?
```

### Solution

Simply add to `tsconfig.json`

```json
"moduleResolution": "node",
```



## Use axios to post form data

This is an archive for an old way of uploading image

```typescript
let formData = new FormData();
const config = {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event: any) => {
        console.log(`Upload progress:`, Math.round((event.loaded * 100) / event.total));
    }
}
try {
    formData.append('image', await fetch(settingslayoutStates.avatarImageFullName).then(r => r.blob()));
    const resp = await axios.post(`/api/avatar/upload/${memberId}`, formData, config);
    alert(resp)
    if (200 === resp.status) {
        setSettingsLayoutStates({ ...settingslayoutStates, disableUploadAvatarImageButton: true, uploadAvatarImageResult: 200 });
    } else {
        setSettingsLayoutStates({ ...settingslayoutStates, disableUploadAvatarImageButton: false, uploadAvatarImageResult: 400 });
    }
} catch (e) {
    console.log(`Attempt to upload avatar image. ${e}`);
    return;
}
```



## Block member by id

```typescript
let isBlocked: boolean;
// #1 look up record (of IMemberMemberMapping) in [RL] BlockingMemberMapping
const blockingMemberMappingTableClient = AzureTableClient('BlockingMemberMapping');
const blockingMemberMappingQuery = blockingMemberMappingTableClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${memberId}' and RowKey eq '${memberId_object}'` } });
//// [!] attemp to reterieve entity makes the probability of causing RestError ////
const blockingMemberMappingQueryResult = await blockingMemberMappingQuery.next();
// #1.2 verify if member has been blocked
if (!blockingMemberMappingQueryResult.value) {
    // Case [Block]
    isBlocked = false;
} else {
    // verify isActive
    isBlocked = !!blockingMemberMappingQueryResult.value;
}
if (isBlocked) {
    // Case [Undo Block]
    await blockingMemberMappingTableClient.upsertEntity<IMemberMemberMapping>({
        partitionKey: memberId,
        rowKey: memberId_object,
        IsActive: false
    }, 'Replace');
    // #2.1 update totalUndoBlockingCount (of IMemberStatistics) in [C] memberStatistics
    const memberStatisticsCollectionClient = atlasDbClient.db('statistics').collection<IMemberStatistics>('member');
    const memberStatisticsUpdateResult = await memberStatisticsCollectionClient.updateOne({ memberId }, { $inc: { totalUndoBlockingCount: 1 } });
    if (!memberStatisticsUpdateResult.acknowledged) {
        logWithDate(`Failed to update totalUndoBlockingCount (of IMemberStatistics, member id: ${memberId}) in [C] memberStatistics`);
    }
    // #2.2 update totalUndoBlockedByCount (of IMemberStatistics) in [C] memberStatistics
    const memberBlockedStatisticsUpdateResult = await memberStatisticsCollectionClient.updateOne({ memberId: memberId_object }, { $inc: { totalUndoBlockedByCount: 1 } });
    if (!memberBlockedStatisticsUpdateResult.acknowledged) {
        logWithDate(`Failed to update totalUndoBlockedByCount (of IMemberStatistics, member id: ${memberId_object}) in [C] memberStatistics`);
    }
} else {
    // Case [Block]
    await blockingMemberMappingTableClient.upsertEntity<IMemberMemberMapping>({
        partitionKey: memberId,
        rowKey: memberId_object,
        IsActive: true
    }, 'Replace');
    // #2.1 update totalBlockingCount (of IMemberStatistics) in [C] memberStatistics
    const memberStatisticsCollectionClient = atlasDbClient.db('statistics').collection<IMemberStatistics>('member');
    const memberStatisticsUpdateResult = await memberStatisticsCollectionClient.updateOne({ memberId }, { $inc: { totalBlockingCount: 1 } });
    if (!memberStatisticsUpdateResult.acknowledged) {
        logWithDate(`Failed to update totalBlockingCount (of IMemberStatistics, member id: ${memberId}) in [C] memberStatistics`);
    }
    // #2.2 update totalBlockedByCount (of IMemberStatistics) in [C] memberStatistics
    const memberBlockedStatisticsUpdateResult = await memberStatisticsCollectionClient.updateOne({ memberId: memberId_object }, { $inc: { totalBlockedByCount: 1 } });
    if (!memberBlockedStatisticsUpdateResult.acknowledged) {
        logWithDate(`Failed to update totalBlockedByCount (of IMemberStatistics, member id: ${memberId_object}) in [C] memberStatistics`);
    }
}
await atlasDbClient.close();
```





# Test



## Generate test id

```typescript
'TEST-' + Math.floor(Math.random() * Math.pow(10, 10)).toString(35).toUpperCase()
```

```typescript
//// FIXME: TEST-3G29WQD ////
const a = await noticeTableClient.upsertEntity<INoticeInfo>({
    partitionKey: notifiedMemberId,
    rowKey: createNoticeId('reply', memberId, postId, commentId),
    Category: 'reply',
    InitiateId: memberId,
    Nickname: getNicknameFromToken(token),
    PostTitle: title,
    CommentBrief: getContentBrief(content)
}, 'Replace');
console.log(`TEST-3G29WQD: path='/api/comment/on/[id]/index.ts/' result: ` + a.version);
//// FIXME: TEST-3G29WQD ////
```





# Moderate



## Use OpenAI API to examine content



```javascript
const fetch = require('node-fetch');

const API_KEY = 'YOUR_API_KEY'; // 替换为您的 OpenAI API KEY
const MODEL_ID = 'YOUR_MODEL_ID'; // 替换为您的 OpenAI 模型 ID
const URL = `https://api.openai.com/v1/models/${MODEL_ID}/completions`;

async function detectNonstandardLanguage(text) {
  const prompt = `识别文本中的不规范用语：\n${text}\n建议替换为：`;
  const data = {
    prompt,
    temperature: 0.5,
    max_tokens: 10,
    n: 1,
    stop: '\n',
  };
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  };

  const response = await fetch(URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (response.ok) {
    const json = await response.json();
    return json.choices[0].text.trim();
  } else {
    throw new Error('OpenAI API request failed');
  }
}

// 使用示例
const text = '我讨厌现在的中国ZF';
detectNonstandardLanguage(text)
  .then((suggestion) => {
    console.log(`您可以尝试使用 "${suggestion}" 来替换 "ZF"`);
  })
  .catch((error) => {
    console.error(error);
  });
```







# TypeScript



## Type VS Interface

> When to use `type`:
>
> - Use `type` when defining an alias for primitive types (string, boolean, number, bigint, symbol, etc)
> - Use `type` when defining tuple types
> - Use `type` when defining function types
> - Use `type` when defining a union
> - Use `type` when trying to overload functions in object types via composition
> - Use `type` when needing to take advantage of mapped types
>
> When to use `interface`:
>
> - Use `interface` for all object types where using `type` is not required (see above)
> - Use `interface` when you want to take advantage of declaration merging.
>
> [Reference](https://stackoverflow.com/questions/37233735/interfaces-vs-types-in-typescript)



## Extending types with interfaces/extends vs Intersecction types

>  Extending types with interfaces/extends is suggested over creating intersection types.
>
> [Reference](https://stackoverflow.com/questions/37233735/interfaces-vs-types-in-typescript)



## Union Type

```typescript
let a = number | null;
```



## Literal Type

```typescript
let a = 50 | 100
```



## Optional property access operator

```typescript
type Customer = {
    birthday?: Date
}

function getCustomer(id: number): Customer | null | undefined {
    return id === 0 ? null: {birthday: new Date()};
}

let customer = getCustomer(0);
// Optional property access operator ?.
console.log(customer?.birthday?.getFullYear())
```



## Optional * operator

```typescript
customer?.[0] // optional element access operator

let log: any =  null;
log?.('a'); // optional call
```





# Reference



## UI - Img Slides - Carousel

[API](https://github.com/Learus/react-material-ui-carousel/blob/master/README.md)



## Create Random name

### Random Hex

```javascript
Math.floor(Math.random()*1677721500).toString(16).toUpperCase();
```

### Random 16

```
Math.floor(Math.random() * Math.pow(10, 16)).toString(16).toUpperCase();
```

### Random 35

```
Math.floor(Math.random() * Math.pow(10, 16)).toString(35).toUpperCase();
```

