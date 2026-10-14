import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
// Configure exact development/release origins; never reflect arbitrary origins.
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const allowed=(Deno.env.get('APP_ORIGINS')||'').split(',').includes(origin);
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':allowed?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers});
 if(!allowed)return reply(403,'Origin denied');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,'Method denied');
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)return reply(401,'Authentication required');
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);if(error||!user?.email)return reply(401,'Invalid session');
 let password,captchaToken;try{const body=await req.json();password=body.password;captchaToken=body.captchaToken;}catch{return reply(400,'Invalid request');}
 if(typeof password!=='string'||password.length>1024)return reply(400,'Password required');
 // Fresh credential verification, rate-limited by Supabase Auth, binds deletion
 // to the authenticated account rather than any user ID supplied by the browser.
 const verified=await auth.auth.signInWithPassword({email:user.email,password,options:{captchaToken:typeof captchaToken==='string'?captchaToken:undefined}});
 if(verified.error||verified.data.user?.id!==user.id)return reply(403,'Reauthentication required');
 const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const deleted=await admin.auth.admin.deleteUser(user.id);if(deleted.error)return reply(500,'Account deletion failed');
 return reply(200,'Account deleted');
});
