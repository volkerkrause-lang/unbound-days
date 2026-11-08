import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {createHandler} from './handler.js';
const env=Deno.env.toObject();
const options={auth:{persistSession:false,autoRefreshToken:false}};
const auth=createClient(env.SUPABASE_URL,env.SUPABASE_ANON_KEY,options);
const admin=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,options);
Deno.serve(createHandler({env,admin,authenticate:async(token:string)=>{
 const {data,error}=await auth.auth.getUser(token);return error?null:data.user;
}}));
