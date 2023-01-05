import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from "next-auth/jwt"

import { MemberInfo } from '../../../../lib/types';
import { response405, response500 } from '../../../../lib/utils';

export default async function MemberInfo(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    if ('GET' !== method) {
        response405(req, res);
        return;
    }

    // GET | info
    // PUT | update info




    try {
        // [!] Limited resource supply for identiyless requests
        const { id: memberId } = req.query;
        // Step #1 verify post id
        if ('string' !== typeof memberId) {
            res.status(400).send('Improper member id');
            return;
        }
        // Step #2 create member info
        const info: MemberInfo = {
            id: memberId,
            nickname: '县长马邦德',
            postCounts: 13,
            followedByCounts: 4,
            likedCounts: 9,
            // avatarImageUrl: '' // avatar image url is provided by session (jwt)
        }
        // Step #3 verify session (identity)
        const token = await getToken({ req });
        if (token && token.sub) {
            // called by member him/herself
            const { p } = req.query
        }
        res.send(info);
    } catch (e) {
        response500(res, `Was trying . ${e}`);
        return;
    }
}