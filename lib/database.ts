import {env} from 'cloudflare:workers';
export function getRawDb(){if(!env.DB)throw Error('The local database is unavailable.');return env.DB;}
