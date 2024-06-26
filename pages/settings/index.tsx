import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { signIn, useSession, signOut } from 'next-auth/react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Menu from '@mui/material/Menu';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import TranslateIcon from '@mui/icons-material/Translate';

import { LangConfigs, TPreferenceStates } from '../../lib/types';
import { updateLocalStorage, restoreFromLocalStorage } from '../../lib/utils/general';


import SideMenu from '../../ui/SideMenu';
import SideColumn from '../../ui/SideColumn';
import Navbar from '../../ui/Navbar';

const storageName0 = 'PreferenceStates';
const updatePreferenceStatesCache = updateLocalStorage(storageName0);
const restorePreferenceStatesFromCache = restoreFromLocalStorage(storageName0);

const desc = process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? '';
const lang = process.env.NEXT_PUBLIC_APP_LANG ?? 'tw';
const langConfigs: LangConfigs = {
    ui: {
        tw: '界面',
        cn: '界面',
        en: 'UI'
    },
    changeLang: {
        tw: '變更界面語言',
        cn: '变更界面语言',
        en: 'Change UI language'
    },
    account: {
        tw: '賬號',
        cn: '账户',
        en: 'Account'
    },
    updatePassword: {
        tw: '變更密碼',
        cn: '变更密码',
        en: 'Update your password'
    },
    privacy: {
        tw: '隱私權',
        cn: '隐私',
        en: 'Privacy'
    },
    blacklist: {
        tw: '屏蔽列表',
        cn: '黑名单',
        en: 'Blacklist'
    },
    member: {
        tw: '會員',
        cn: '会员',
        en: 'Member'
    },
    infoStatistics: {
        tw: '信息和數據',
        cn: '信息和数据',
        en: 'Info & Statistics'
    },
    about: {
        tw: '關於',
        cn: '关于',
        en: 'About'
    },
    aboutMojito: {
        tw: '關於 Mojito',
        cn: '关于 Mojito',
        en: 'About Mojito'
    },
    guidelines: {
        tw: '網絡社區規範',
        cn: '网络社区规范',
        en: 'Community Guidelines'
    },
    privacyPolicy: {
        tw: '隱私權聲明',
        cn: '隐私权声明',
        en: 'Software Usage Privacy Statement'
    },
    terms: {
        tw: '軟體使用許可及服務協議',
        cn: '软件使用许可及服务协议',
        en: 'Software license and service agreement'
    },
    more: {
        tw: '更多',
        cn: '更多',
        en: 'More'
    },
    signout: {
        tw: '登出',
        cn: '登出',
        en: 'Sign Out'
    },
};

/**
 * Last update:
 * - 24/05/2023 v0.1.2 New layout applied
 */
const SettingsIndex = () => {

    const router = useRouter();
    const { status } = useSession({ required: true, onUnauthenticated() { signIn(); } });

    React.useEffect(() => {
        if ('authenticated' === status) {
            restorePreferenceStatesFromCache(setPreferenceStates);
        }
    }, [status]);

    // States - preference
    const [preferenceStates, setPreferenceStates] = React.useState<TPreferenceStates>({
        lang: lang,
        mode: 'light'
    });

    type TProcessStates = {
        languageSettingMenuAnchorEl: null | HTMLElement;
    };

    // States - process
    const [processStates, setProcessStates] = React.useState<TProcessStates>({
        languageSettingMenuAnchorEl: null
    });

    const handleOpenPopUpMenu = (event: React.MouseEvent<HTMLElement>) => {
        setProcessStates({ ...processStates, languageSettingMenuAnchorEl: event.currentTarget });
    };

    const handleClosePopUpMenu = () => {
        setProcessStates({ ...processStates, languageSettingMenuAnchorEl: null });
    };

    const handleSelectLang = (lang: string) => (event: React.MouseEvent<HTMLElement>) => {
        setProcessStates({ ...processStates, languageSettingMenuAnchorEl: null });
        setPreferenceStates({ ...preferenceStates, lang });
        updatePreferenceStatesCache({ ...preferenceStates, lang });
    };

    const handleMenuItemClick = (cat: number) => (event: React.MouseEvent<HTMLElement>) => {
        if (0 === cat) {
            router.push('/forgot/');
        }
        if (1 === cat) {
            router.push('/settings/privacy');
        }
        if (2 === cat) {
            router.push('/settings/blacklist');
        }
        if (3 === cat) {
            router.push('/settings/statistics');
        }

        if (10 === cat) {
            router.push('/about');
        }
        if (11 === cat) {
            router.push('/guidelines');
        }
        if (12 === cat) {
            router.push('/privacy');
        }
        if (13 === cat) {
            router.push('/terms');
        }

        if (99 === cat) {
            signOut();
        }
    };

    return (
        <>
            <Head>
                <title>
                    {{ tw: '設定', cn: '设置', en: 'Blacklist' }[preferenceStates.lang]}
                </title>
                <meta
                    name='description'
                    content={desc}
                    key='desc'
                />
            </Head>
            <Navbar lang={preferenceStates.lang} />
            <Grid container>

                {/* left */}
                <Grid item xs={0} sm={0} md={3} lg={3} xl={4} >
                    <Box sx={{ display: { xs: 'none', sm: 'none', md: 'flex' }, flexDirection: 'row-reverse', position: 'sticky', top: 0, left: 0, }}>
                        <SideMenu lang={preferenceStates.lang} />
                    </Box>
                </Grid>

                {/* middle */}
                <Grid item xs={12} sm={12} md={6} lg={6} xl={4}>
                    <Stack pt={{ xs: 2, sm: 2, md: 10 }} px={2} spacing={2}>

                        {/* UI */}
                        <Typography sx={{ color: 'text.disabled' }}>{langConfigs.ui[preferenceStates.lang]}</Typography>
                        <MenuList>

                            {/* language settings */}
                            <MenuItem sx={{ height: 48 }} onClick={handleOpenPopUpMenu}>
                                <ListItemText>{langConfigs.changeLang[preferenceStates.lang]}</ListItemText>
                                <ListItemIcon><TranslateIcon /></ListItemIcon>
                            </MenuItem>
                        </MenuList>

                        {/* account */}
                        <Typography sx={{ color: 'text.disabled' }}>{langConfigs.account[preferenceStates.lang]}</Typography>
                        <MenuList>

                            {/* update password */}
                            <MenuItem sx={{ height: 48 }} onClick={handleMenuItemClick(0)}>
                                <ListItemText>{langConfigs.updatePassword[preferenceStates.lang]}</ListItemText>
                            </MenuItem>

                            {/* pravicy settings */}
                            <MenuItem sx={{ height: 48 }} onClick={handleMenuItemClick(1)}>
                                <ListItemText>{langConfigs.privacy[preferenceStates.lang]}</ListItemText>
                            </MenuItem>

                            {/* blacklist */}
                            <MenuItem sx={{ height: 48 }} onClick={handleMenuItemClick(2)}>
                                <ListItemText>{langConfigs.blacklist[preferenceStates.lang]}</ListItemText>
                            </MenuItem>
                        </MenuList>


                        {/* member */}
                        <Typography sx={{ color: 'text.disabled' }}>{langConfigs.member[preferenceStates.lang]}</Typography>
                        <MenuList>

                            {/* member info */}
                            <MenuItem sx={{ height: 48 }} onClick={handleMenuItemClick(3)}>
                                <ListItemText>{langConfigs.infoStatistics[preferenceStates.lang]}</ListItemText>
                            </MenuItem>
                        </MenuList>

                        {/* about */}
                        <Typography sx={{ color: 'text.disabled' }}>{langConfigs.about[preferenceStates.lang]}</Typography>
                        <MenuList>

                            {/* about mojito */}
                            <MenuItem sx={{ height: 48 }} onClick={handleMenuItemClick(10)}>
                                <ListItemText>{langConfigs.aboutMojito[preferenceStates.lang]}</ListItemText>
                            </MenuItem>

                            {/* guidelines */}
                            <MenuItem sx={{ height: 48 }} onClick={handleMenuItemClick(11)}>
                                <ListItemText>{langConfigs.guidelines[preferenceStates.lang]}</ListItemText>
                            </MenuItem>

                            {/* privacy */}
                            <MenuItem sx={{ height: 48 }} onClick={handleMenuItemClick(12)}>
                                <ListItemText>{langConfigs.privacyPolicy[preferenceStates.lang]}</ListItemText>
                            </MenuItem>

                            {/* terms */}
                            <MenuItem sx={{ height: 48 }} onClick={handleMenuItemClick(13)}>
                                <ListItemText>{langConfigs.terms[preferenceStates.lang]}</ListItemText>
                            </MenuItem>
                        </MenuList>

                        {/* more */}
                        <Typography sx={{ color: 'text.disabled' }}>{langConfigs.more[preferenceStates.lang]}</Typography>
                        <MenuList>

                            {/* about mojito */}
                            <MenuItem sx={{ height: 48 }} onClick={handleMenuItemClick(99)}>
                                <ListItemText>{langConfigs.signout[preferenceStates.lang]}</ListItemText>
                            </MenuItem>
                        </MenuList>

                    </Stack>
                </Grid>

                {/* right */}
                <Grid item xs={0} sm={0} md={3} lg={3} xl={4}>
                    <Box sx={{ display: { xs: 'none', sm: 'none', md: 'block' } }}>
                        <SideColumn lang={preferenceStates.lang} />
                    </Box>
                </Grid>

            </Grid>

            {/* bottom space */}
            <Box pb={'10rem'} />

            {/* language menu */}
            <Menu
                sx={{ mt: '3rem' }}
                anchorEl={processStates.languageSettingMenuAnchorEl}
                anchorOrigin={{ vertical: 'top', horizontal: 'right', }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right', }}
                open={Boolean(processStates.languageSettingMenuAnchorEl)}
                onClose={handleClosePopUpMenu}
                MenuListProps={{}}
            >
                <MenuItem onClick={handleSelectLang('tw')}>
                    <ListItemText>繁体中文</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleSelectLang('cn')}>
                    <ListItemText>简体中文</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleSelectLang('en')}>
                    <ListItemText>English</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};

export default SettingsIndex;