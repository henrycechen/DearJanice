import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';

import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import CreateIcon from '@mui/icons-material/Create';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmailIcon from '@mui/icons-material/Email';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Brightness4Icon from '@mui/icons-material/Brightness4';

import useTheme from '@mui/material/styles/useTheme';

import { useSession, signIn, signOut } from 'next-auth/react';
import { LangConfigs } from '../lib/types';
import { useRouter } from 'next/router';

import { ColorModeContext } from './Theme';

type TNavBarProps = {
    nickname: string;
    avatarImageUrl: string;
}

const domain = process.env.NEXT_PUBLIC_APP_DOMAIN;
const lang = process.env.NEXT_PUBLIC_APP_LANG ?? 'tw';
const langConfigs: LangConfigs = {
    signIn: {
        tw: '登入',
        cn: '登入',
        en: 'Sign in'
    },
    createPost: {
        tw: '發帖',
        cn: '发帖',
        en: 'Create post'
    },
    message: {
        tw: '消息',
        cn: '消息',
        en: 'Message'
    },
    member: {
        tw: '賬戶',
        cn: '账户',
        en: 'Member'
    },
    signOut: {
        tw: '登出',
        cn: '登出',
        en: 'Sign out'
    }
}

export default function NavBar(props: TNavBarProps) {


    const { data: session, status } = useSession();
    const mySession: any = { ...session }
    const router = useRouter();

    const theme = useTheme();
    const colorMode = React.useContext(ColorModeContext);

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const handleOpenMemberMenu = (event: React.MouseEvent<HTMLElement>) => { setAnchorEl(event.currentTarget) }
    const handleCloseMemberMenu = () => { setAnchorEl(null) }
    const handleClick = (actionIndex: number) => {
        setAnchorEl(null);
        if (actionIndex === 0) { router.push('/me/createpost') };
        if (actionIndex === 1) { router.push(`/me/id/${mySession?.user?.id}?layout=message`) };
        if (actionIndex === 2) { router.push(`/me/id/${mySession?.user?.id}?layout=post`) };
        if (actionIndex === 3) { signOut() };
    }

    const handleSignIn = (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        signIn();
    }

    const handleColorModeSelect = () => {
        const preferredColorMode = colorMode.mode === 'dark' ? 'light' : 'dark'
        colorMode.setMode(preferredColorMode);
        document.cookie = `PreferredColorMode=${preferredColorMode}`
    }

    return (
        <AppBar position='sticky'>
            <Container maxWidth={'xl'}>
                <Toolbar disableGutters>
                    <Link href='/' mt={1}>
                        <Box component={'img'} src={`${domain}/logo${'dark' === theme.palette.mode ? '-dark' : ''}.png`} sx={{ height: '2.5rem' }} />
                    </Link>
                    <Box sx={{ flexGrow: 1 }}></Box>
                    {'authenticated' !== status && !session && (
                        <Button variant='contained' onClick={handleSignIn}>{langConfigs.signIn[lang]}</Button>
                    )}
                    {session && (
                        <Box sx={{ flexGrow: 0 }}>
                            <Tooltip title="Open settings">
                                <IconButton onClick={handleOpenMemberMenu} sx={{ p: 0 }}>
                                    <Avatar alt={props.nickname} src={props.avatarImageUrl} />
                                </IconButton>
                            </Tooltip>
                            <Menu
                                sx={{ mt: '45px' }}
                                anchorEl={anchorEl}
                                anchorOrigin={{ vertical: 'top', horizontal: 'right', }}
                                keepMounted
                                transformOrigin={{ vertical: 'top', horizontal: 'right', }}
                                open={Boolean(anchorEl)}
                                onClose={handleCloseMemberMenu}
                                MenuListProps={{}}
                            >
                                <MenuItem onClick={() => handleClick(0)} >
                                    <ListItemIcon><CreateIcon /></ListItemIcon>
                                    <ListItemText>{langConfigs.createPost[lang]}</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => handleClick(1)} >
                                    <ListItemIcon><EmailIcon /></ListItemIcon>
                                    <ListItemText>{langConfigs.message[lang]}</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => handleClick(2)} >
                                    <ListItemIcon><AccountCircleIcon /></ListItemIcon>
                                    <ListItemText>{langConfigs.member[lang]}</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => handleClick(3)} >
                                    <ListItemIcon><ExitToAppIcon /></ListItemIcon>
                                    <ListItemText>{langConfigs.signOut[lang]}</ListItemText>
                                </MenuItem>
                                <Divider />
                                <MenuItem onClick={handleColorModeSelect} >
                                    <ListItemIcon>
                                        {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                                    </ListItemIcon>
                                    <ListItemText>
                                        {theme.palette.mode}
                                    </ListItemText>
                                </MenuItem>
                            </Menu>
                        </Box>
                    )}
                </Toolbar>
            </Container>
        </AppBar>
    )
}