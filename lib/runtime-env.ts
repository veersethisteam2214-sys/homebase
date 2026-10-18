export type RuntimeEnv=Record<string,unknown>;

let cached:RuntimeEnv|null=null;

/**
 * Environment values and bindings, wherever this happens to be running.
 * Workers expose bindings through `cloudflare:workers`; Node and Vercel use `process.env`.
 * The specifier is held in a variable so bundlers that cannot resolve the Workers module
 * still build — outside a Worker the import simply throws and we fall back to process.env.
 */
export async function runtimeEnv():Promise<RuntimeEnv>{
 if(cached)return cached;
 const base:RuntimeEnv=typeof process!=='undefined'&&process.env?{...process.env}:{};
 const specifier='cloudflare:workers';
 try{
  const workers=await import(/* @vite-ignore */ specifier) as {env?:RuntimeEnv};
  cached=workers.env?{...base,...workers.env}:base;
 }catch{
  cached=base;
 }
 return cached;
}

export function readString(env:RuntimeEnv,key:string){
 const value=env[key];
 return typeof value==='string'&&value?value:null;
}
