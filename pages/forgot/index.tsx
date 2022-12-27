import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import ReCAPTCHA from "react-google-recaptcha";

import { LangConfigs } from '../../lib/types';
import { verifyEmailAddress } from '../../lib/utils';

import Copyright from '../../ui/Copyright';
import BackToHomeButtonGroup from '../../ui/BackToHomeButtonGroup';

const domain = process.env.NEXT_PUBLIC_APP_DOMAIN;
const recaptchaClientKey = process.env.NEXT_PUBLIC_INVISIABLE_RECAPTCHA_SITE_KEY ?? '';
const lang = process.env.NEXT_PUBLIC_APP_LANG ?? 'ch';
const langConfigs: LangConfigs = {
    submit: {
        ch: '确认',
        en: 'Confirm'
    },
    pleaseEnterEmailAddress: {
        ch: '请输入注册 Mojito 账户时使用的邮件地址',
        en: 'Please enter the email address you used to register your Mojito account'
    },
    emailAddress: {
        ch: '邮件地址',
        en: 'Email address'
    },
    invalidEmailAddressError: {
        ch: '无效的邮件地址',
        en: 'Invalid email address'
    },
    recaptchaLang: {
        ch: 'zh-CN',
        en: 'en'
    },
    recaptchaNotVerifiedError: {
        ch: '请告诉我们您不是机器人😎',
        en: 'Please tell us if you are not a robot😎'
    },
    recaptchaError: {
        ch: '我们的人机验证系统出了些问题🤯...请尝试刷新或联系我们的管理员',
        en: 'Something went wrong with our CAPTCHA🤯...Please try to refresh or contact our Webmaster'
    },
    memberIdNotFoundError: {
        ch: '看起来我们没有您的注册信息😧',
        en: 'We do not seem to have your registration information😧'
    },
    goodResult: {
        ch: '一封含有重置密码的邮件已发到您注册时使用的邮箱中，请检查收件箱🙂',
        en: 'An email containing a reset password has been sent to the email address you used to register, please check your inbox🙂'
    },
    badResult: {
        ch: '我们的服务器出了些问题🤯...请稍后重试或者联系我们的管理员',
        en: 'Something went wrong with our server 🤯... Please try again later or contact our Webmaster'
    }
}

const Forgot = () => {
    let recaptcha: any;

    // Declare process states
    const [processStates, setProcessStates] = React.useState({
        /**
         * component list:
         * - resetpasswordrequestform
         * - resetpasswordrequestresult
         */
        componentOnDisplay: 'resetpasswordrequestform',
        recaptchaResponse: '',
        errorContent: '',
        displayError: false,
        displayCircularProgress: false,
        resultContent: '',
    });

    // Handle process states change
    React.useEffect(() => { post() }, [processStates.recaptchaResponse]);
    const post = async () => {
        if ('' === processStates.recaptchaResponse) {
            // ReCAPTCHA challenge is not ready
            return;
        }
        if ('' !== emailAddress) {
            const resp = await fetch(`/api/member/resetpassword/request?emailAddress=${emailAddress}&recaptchaResponse=${processStates.recaptchaResponse}`, { method: 'POST' });
            if (200 === resp.status) {
                setProcessStates({
                    ...processStates,
                    componentOnDisplay: 'resetpasswordrequestresult',
                    displayCircularProgress: false,
                    resultContent: langConfigs.goodResult[lang]
                });
            } else if (404 === resp.status) {
                // SignIn credential not found, reset ReCAPTCHA
                recaptcha?.reset();
                setProcessStates({
                    ...processStates,
                    errorContent: langConfigs.memberIdNotFoundError[lang],
                    displayError: true,
                    displayCircularProgress: false
                })
            } else {
                // 500
                setProcessStates({
                    ...processStates,
                    componentOnDisplay: 'resetpasswordrequestresult',
                    displayCircularProgress: false,
                    resultContent: langConfigs.badResult[lang]
                })
            }
        }
    }

    // Declare email address state
    const [emailAddress, setEmailAddress] = React.useState('');

    // Handle email address input
    const handleTextFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEmailAddress(event.target.value);
    }

    // Handle reset password request form submit
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!verifyEmailAddress(emailAddress)) {
            setProcessStates({ ...processStates, errorContent: langConfigs.invalidEmailAddressError[lang], displayError: true });
            return;
        } else {
            setProcessStates({ ...processStates, displayError: false });
        }
        setProcessStates({ ...processStates, displayCircularProgress: true });
        recaptcha?.execute();
    }

    // Handle ReCAPTCHA challenge
    const handleRecaptchaChange = (value: any) => {
        if (!!value) {
            setProcessStates({ ...processStates, recaptchaResponse: value })
        } else {
            setProcessStates({ ...processStates })
        }
    }

    return (
        <>
            <Container component='main' maxWidth={'xs'} >
                {/* resetpasswordrequestform */}
                <Stack sx={{ mt: '5rem', display: 'resetpasswordrequestform' === processStates.componentOnDisplay ? 'block' : 'none' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Link href="/">
                            <Avatar src={`${domain}/favicon.ico`} sx={{ width: 56, height: 56 }} />
                        </Link>
                    </Box>
                    <Typography component="h1" variant="h5" sx={{ mt: 2, textAlign: 'center' }}>
                        {langConfigs.pleaseEnterEmailAddress[lang]}
                    </Typography>
                    <Stack component={'form'} spacing={2} sx={{ mt: 4 }} onSubmit={handleSubmit} >
                        <Box sx={{ display: processStates.displayError ? 'block' : 'none' }}>
                            <Alert severity='error' >
                                <strong>{processStates.errorContent}</strong>
                            </Alert>
                        </Box>
                        <TextField
                            required
                            name='emailAddress'
                            label={langConfigs.emailAddress[lang]}
                            value={emailAddress}
                            onChange={handleTextFieldChange}
                        />
                        <Box>
                            <Button type='submit' fullWidth variant='contained'>
                                <Typography sx={{ display: !processStates.displayCircularProgress ? 'block' : 'none' }}>
                                    {langConfigs.submit[lang]}
                                </Typography>
                                <CircularProgress sx={{ color: 'white', display: processStates.displayCircularProgress ? 'block' : 'none' }} />
                            </Button>
                        </Box>
                    </Stack>
                </Stack>
                {/* resetpasswordrequestresult */}
                <Box sx={{ mt: '18rem', mb: '10rem', display: 'resetpasswordrequestresult' === processStates.componentOnDisplay ? 'block' : 'none' }}>
                    <Typography textAlign={'center'}>
                        {processStates.resultContent}
                    </Typography>
                    <BackToHomeButtonGroup />
                </Box>
                <Copyright sx={{ mt: 8, mb: 4 }} />
            </Container>
            <ReCAPTCHA
                sitekey={recaptchaClientKey}
                size={'invisible'}
                hl={langConfigs.recaptchaLang[lang]}
                ref={(ref: any) => ref && (recaptcha = ref)}
                onChange={handleRecaptchaChange}
            />
        </>
    )
}

export default Forgot;