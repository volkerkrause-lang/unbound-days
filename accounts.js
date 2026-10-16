import {accountConfig} from './account-config.js';
import {authStorage,googleLoginOptions} from './google-session.js';
let providerCredentials=null;
export const googleCredentials=()=>providerCredentials;
export const clearGoogleCredentials=()=>{providerCredentials=null;};
export const configured=!!(accountConfig.supabaseUrl&&accountConfig.supabasePublishableKey);
export let client=null,user=null,verified=false,recovery=false;
let sdkError='';
if(configured){
 try{
 const {createClient}=await import('./supabase-client.js');
 client=createClient(accountConfig.supabaseUrl,accountConfig.supabasePublishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:authStorage(localStorage)}});
 client.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY')recovery=true;if(session?.provider_token)providerCredentials={accessToken:session.provider_token,refreshToken:session.provider_refresh_token||''};if(event==='SIGNED_OUT')providerCredentials=null;});
 const {data,error}=await client.auth.getSession();if(error)throw error;user=data.session?.user||null;
 if(user&&navigator.onLine){const result=await client.auth.getUser();if(result.error){if(result.error.status===401||result.error.status===403){user=null;await client.auth.signOut({scope:'local'});}else throw result.error;}else{user=result.data.user;verified=true;}}
 }catch(e){sdkError=e.message;/* retain scoped offline session if verification unavailable */}
}
export const configurationError=()=>sdkError;
export const redirectURL=()=>new URL('./',location.href).href;
export const result=async promise=>{const r=await promise;if(r.error)throw r.error;return r.data;};
export async function role(){if(!client||!user)return 'user';const data=await result(client.from('profiles').select('role').eq('id',user.id).single());return data.role;}

export async function signInGoogle(consent=false){return result(client.auth.signInWithOAuth(googleLoginOptions(redirectURL(),user?.email,consent)));}
