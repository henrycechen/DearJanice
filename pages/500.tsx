import * as React from 'react';
import { useRouter } from 'next/router';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { LangConfigs } from '../lib/types';

import Navbar from '../ui/Navbar';
import Copyright from '../ui/Copyright';
import BackToHomeButtonGroup from '../ui/BackToHomeButtonGroup';
import Guidelines from '../ui/Guidelines';
import LangSwitch from '../ui/LangSwitch';
import Terms from '../ui/Terms';

export async function getStaticProps() {
    return {
        props: {
            errorMessage: {
                tw: [
                    '我們遭遇了一些技術難題😟',
                    '也許有些Bugs出現在了我們的伺服器軟體中🤯',
                    '我們的伺服器遭遇了一些不可抗力🥲',
                    '我們的伺服器剛剛在發呆😴',
                    '我們的伺服器在和它的朋友們喝Mojito😳'
                ][Math.floor(Math.random() * 5)],
                cn: [
                    '我们遇到了一些技术难题😟',
                    '可能有些Bugs出现在了我们的服务器程序中🤯',
                    '我们的服务器遭遇了某些不可抗力🥲',
                    '我们的服务器刚刚开小差了😴',
                    '我们的服务器正在和它的朋友们喝Mojito😳'
                ][Math.floor(Math.random() * 5)],
                en: 'Something went wrong in our server.'
            }
        },
    };
}

const lang = process.env.NEXT_PUBLIC_APP_LANG ?? 'tw';
const langConfigs: LangConfigs = {
    title: {
        tw: '出錯啦',
        cn: '出错啦',
        en: 'Opps'
    },
    accessDenniedError: {
        tw: '您的賬戶需要驗證電郵或已被注銷',
        cn: '您的账户需要验证邮箱或已被注销',
        en: 'Your account needs verification or has been canceled'
    },
    backToHome: {
        tw: '返回主頁',
        cn: '返回主页',
        en: 'Back to home'
    }
};

/**
 * Last update:
 * - 25/05/2023 v0.1.2 New layout applied
 */
export default function FiveHundred({ errorMessage }: any) {

    const router = useRouter();

    type TProcessStates = {
        lang: string;
    };

    const [processStates, setProcessStates] = React.useState<TProcessStates>({
        lang: lang
    });

    const setLang = () => {
        if ('tw' === processStates.lang) { setProcessStates({ ...processStates, lang: 'cn' }); }
        if ('cn' === processStates.lang) { setProcessStates({ ...processStates, lang: 'en' }); }
        if ('en' === processStates.lang) { setProcessStates({ ...processStates, lang: 'tw' }); }
    };

    return (
        <>
            <Navbar lang={processStates.lang} />
            <Stack
                sx={{ backgroundColor: '#2DAAE0', height: '100vh' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: '10rem' }}>
                    <Typography
                        sx={{
                            color: 'white',
                            fontSize: { xs: '5rem', sm: '7rem' },
                            fontWeight: 1000,
                            letterSpacing: '.2rem',
                            maxWidth: 460,
                            textAlign: 'center'
                        }}>
                        {langConfigs.title[processStates.lang]}
                    </Typography>
                </Box>
                <Box sx={{ color: 'white', textAlign: 'center', mt: '3rem', padding: 4 }}>
                    {!!router.query.error && 'AccessDenied' === router.query.error &&
                        <Typography variant='h6' sx={{ color: 'white', textAlign: 'center' }}>
                            {langConfigs.accessDenniedError[processStates.lang]}
                        </Typography>
                    }
                    {!router.query.error &&
                        <Typography variant='h6' sx={{ color: 'white', textAlign: 'center' }}>
                            {errorMessage[processStates.lang]}
                        </Typography>
                    }
                </Box>

                <BackToHomeButtonGroup color={'white'} lang={processStates.lang} />

                <Copyright sx={{ mt: '10rem', color: 'white' }} />
                <Guidelines sx={{ color: 'white' }} lang={processStates.lang} />
                <Terms sx={{ mb: 2, color: 'white' }} lang={processStates.lang} />
                <LangSwitch sx={{ mb: 8 }} setLang={setLang} />
            </Stack>
        </>
    );
}