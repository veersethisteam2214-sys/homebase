/**
 * node-postgres treats sslmode=require as verify-full, which rejects managed providers
 * whose chain is not in Node's trust store — Supabase's pooler among them. libpq's own
 * meaning for `require` is encrypt without verifying the chain, which is what a string
 * asking for `require` actually intends.
 *
 * Passing an `ssl` option alongside the connection string does not express that: pg
 * parses the string over the top of the explicit options, so sslmode wins. The mode has
 * to be taken out of the string for the choice here to survive. The parameter is removed
 * textually rather than by rebuilding the URL, so the password is never re-encoded.
 *
 * Kept free of any pg import so it can be tested on its own.
 */
export function pgConnection(connectionString:string){
 const match=/[?&]sslmode=([^&]*)/i.exec(connectionString);
 const mode=match?match[1].toLowerCase():null;
 let cleaned=connectionString;
 if(match){
  cleaned=cleaned.replace(/[?&]sslmode=[^&]*/i,found=>found.startsWith('?')?'?':'');
  cleaned=cleaned.replace('?&','?').replace(/[?&]$/,'');
 }
 const ssl=mode==='disable'
  ? false as const
  : mode==='verify-full'||mode==='verify-ca'
   ? {rejectUnauthorized:true}
   : {rejectUnauthorized:false};
 return {connectionString:cleaned,ssl};
}
