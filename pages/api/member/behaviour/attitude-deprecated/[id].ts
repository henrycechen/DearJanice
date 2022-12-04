import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from "next-auth/jwt"

import { MemberInfo } from '../../../../../lib/types';
import { response405, response500 } from '../../../../../lib/utils';


export default async function Attitude(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    // POST - Like request - upsert - rl-table
    // PUT - Unlike request - upsert - rl-table
    // req.query.id - like/unlike post/comment/subcomment id
    /**
     * {
     *      class: 'post' | 'comment' | 'subcomment'
     * }
     */
    if ('POST' !== method) {
        response405(req, res);
        return;
    }
    // Step #0 verify identity
    res.send('ok')
    return;


}