
import type { NextApiRequest, NextApiResponse } from 'next';
import { getTimeBySecond } from './create';

/** Utils for general purpose v0.1.1
 * 
 * Last update 16/02/2023
 */

export function timeToString(timeBySecond: number, lang: string): string {
    let _lang = lang;
    if (!['tw', 'cn', 'en'].includes(lang)) {
        _lang = 'tw';
    }
    const langConfigs = {
        tw: { min: ' 分鐘前', mins: ' 分鐘前', hour: ' 小時前', hours: ' 小時前', houra: ' 小時', hoursa: ' 小時', day: ' 天前', days: ' 天前' },
        cn: { min: ' 分钟前', mins: ' 分钟前', hour: ' 小时前', hours: ' 小时前', houra: ' 小时', hoursa: ' 小时', day: ' 天前', days: ' 天前' },
        en: { min: ' minute', mins: ' minutes', hour: ' hour', hours: ' hours', houra: ' hour', hoursa: ' hours', day: ' day', days: ' days' }
    }[_lang];
    if (!('number' === typeof timeBySecond || 'string' === typeof timeBySecond)) {
        return `0${langConfigs?.min}`;
    }
    const diff = getTimeBySecond() - timeBySecond;
    if (86400 < diff) { // 24 * 60 * 60
        const d = Math.floor(diff / (86400));
        return `${d}${1 === d ? langConfigs?.day : langConfigs?.days}`;;
    }
    const mins = diff % 3600;
    const m = Math.floor(mins / 60);
    if (mins === diff) {
        return `${m}${1 === m ? langConfigs?.min : langConfigs?.mins}`;
    }
    const h = Math.floor(diff / 3600);
    if (3 > h) {
        return `${h}${1 === h ? langConfigs?.houra : langConfigs?.hoursa}${m}${1 === m ? langConfigs?.min : langConfigs?.mins}`;
    } else {
        return `${h}${1 === h ? langConfigs?.hour : langConfigs?.hours}`;
    }
}

export function getContentBrief(content: any, length = 21): string {
    if (!('string' === typeof content && '' !== content)) {
        return '';
    }
    if (content.length > length) {
        return `${content.slice(0, length)}...`;
    }
    return content;
}

export function statiaticsToString(num: number): string {
    if (num > 1000000) {
        `${num / 1000000}M`;
    } else if (num > 1000) {
        `${num / 1000}K`;
    } else {
        return `${num}`;
    }
    return '';
}

type TStates = {
    [key: string]: any;
};

// Utilize local storage
export function updateLocalStorage(storageName: string) {
    const fn = (states: TStates) => {
        const _: TStates = { ...states };
        window.localStorage.setItem(storageName, JSON.stringify(_));
    };
    return fn;
}

export function provideLocalStorage(storageName: string) {
    try {
        return JSON.parse(window.localStorage.getItem(storageName) ?? '{}');
    } catch (e) {
        console.log(`Attempt to parse object from local storage ${storageName}. ${e}`);
    } finally {
        return {};
    }
}

export function restoreFromLocalStorage(storageName: string) {
    const fn = (setStates: Function) => {
        try {
            const prevStates: TStates = JSON.parse(window.localStorage.getItem(storageName) ?? '{}');
            if (prevStates !== null && Object.keys(prevStates).length !== 0) {
                setStates(prevStates);
            }
        } catch (e) {
            console.log(`Attempt to restore from local storage ${storageName}. ${e}`);
        }
    };
    return fn;
}

// Compose response
export function response405(request: NextApiRequest, response: NextApiResponse) {
    const { url, method } = request;
    response.status(405).send(`${url}: ${method} is not allowed`);
}

export function response500(response: NextApiResponse, msg: string) {
    // response.status(500).send(msg);
    response.status(500).send('development' === process.env.NODE_ENV ? msg : 'Internal Server Error');
}

// Log
export function logWithDate(msg: string, origin = '', e: any = {}) {
    const date = new Date()
    console.log('Slog');
    console.log(`Date:\t${date.toISOString()} (${date.toString()})\nOrigin:\t${'' === origin ? 'Unknown origin' : origin}\nMsg:\t${msg}`);
    console.error(`Estack:\t${e?.stack}`);
}