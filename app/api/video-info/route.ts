import {owner} from '../../../lib/owner';
import {parseYouTube} from '../../../lib/life';
export async function POST(request:Request){
 if(!await owner(request))return Response.json({error:'Sign in first.'},{status:401});
 try{
  const body=await request.json() as {url?:unknown};
  if(typeof body.url!=='string'||body.url.length>2000)return Response.json({error:'Enter a valid video link.'},{status:400});
  const parsed=parseYouTube(body.url);
  try{const res=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(parsed.url),{signal:AbortSignal.timeout(6000)});
   if(res.ok){const data=await res.json() as {title?:string;author_name?:string};return Response.json({...parsed,title:data.title||'',author:data.author_name||''});}
  }catch{/* A manual title keeps saving usable if YouTube is unavailable. */}
  return Response.json({...parsed,title:'',author:'',metadataUnavailable:true});
 }catch(e){return Response.json({error:(e as Error).message},{status:400});}
}
