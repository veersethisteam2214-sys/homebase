import Homebase from './homebase';
import {requireChatGPTUser} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page() {
 // A single-user host puts its own access control in front of the whole app, so there is
 // no platform sign-in to redirect to. See lib/owner.ts for what that flag means.
 if(process.env.HOMEBASE_SINGLE_USER!=='1')await requireChatGPTUser('/');
 return <Homebase/>;
}
