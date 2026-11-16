import { createPreviewRateLimiter, isPublicTarget, readLimited, safeUrl } from './link-preview.js';

const allowImport = createPreviewRateLimiter({ limit: 8, windowMs: 60_000, maxClients: 5000 });
const MAX_INPUT = 8192;
const TIMEOUT_MS = 7000;
const MAX_REDIRECTS = 3;

function durationMinutes(value) {
  const match = String(value || '').match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/iu);
  if (!match) return 0;
  return Math.round((Number(match[1] || 0) * 1440) + (Number(match[2] || 0) * 60) + Number(match[3] || 0) + (Number(match[4] || 0) / 60));
}
function plainText(value) {
  if (typeof value === 'string') return value.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (Array.isArray(value)) return value.map(plainText).filter(Boolean).join(' ');
  if (value && typeof value === 'object') return plainText(value.text || value.name || value['@value'] || '');
  return '';
}
function imageUrl(value, base) {
  const item = Array.isArray(value) ? value[0] : value;
  const raw = typeof item === 'string' ? item : item?.url || item?.contentUrl || '';
  if (!raw) return '';
  try { const url = new URL(raw, base); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
function recipeNodes(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) { for (const item of value) recipeNodes(item, out); return out; }
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.some(type => String(type).toLowerCase().split(/[\/#:]/u).pop() === 'recipe')) out.push(value);
  if (value['@graph']) recipeNodes(value['@graph'], out);
  return out;
}
function methodSteps(value) {
  const out=[];
  const visit=item=>{
    if(typeof item==='string'){const text=plainText(item);if(text)out.push(text);return;}
    if(Array.isArray(item)){item.forEach(visit);return;}
    if(!item||typeof item!=='object')return;
    const type=Array.isArray(item['@type'])?item['@type']:[item['@type']];
    if(type.includes('HowToSection')){if(item.name)out.push(plainText(item.name));visit(item.itemListElement);return;}
    const text=plainText(item.text||item.name);
    if(text)out.push(text); else if(item.itemListElement)visit(item.itemListElement);
  };
  visit(value);return out.slice(0,80).map(step=>step.slice(0,1000));
}
export function extractRecipeFromHtml(html, pageUrl) {
  const scripts = html.matchAll(/<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script\s*>/giu);
  for (const match of scripts) {
    if (match[2].length > 350_000) continue;
    let parsed;
    try { parsed = JSON.parse(match[2].replace(/^\s*<!--|-->\s*$/gu, '').trim()); } catch { continue; }
    const node=recipeNodes(parsed).find(item=>Array.isArray(item.recipeIngredient)&&item.recipeIngredient.length);
    if(!node)continue;
    const title=plainText(node.name).slice(0,160);
    if(!title)continue;
    const host=new URL(pageUrl).hostname.replace(/^www\./u,'');
    const image=imageUrl(node.image,pageUrl);
    const yieldText=plainText(node.recipeYield);
    const yieldMatch=yieldText.match(/\d+(?:\.\d+)?/u);
    return {url:pageUrl,sourceName:host,recipe:{title,image,sourceUrl:pageUrl,sourceName:host,description:plainText(node.description).slice(0,600),prepTime:durationMinutes(node.prepTime),cookTime:durationMinutes(node.cookTime),yield:yieldMatch?Math.min(100,Math.max(1,Number(yieldMatch[0]))):2,cuisine:plainText(node.recipeCuisine).slice(0,80),ingredients:node.recipeIngredient.slice(0,100).map(item=>String(item).slice(0,300)),instructions:methodSteps(node.recipeInstructions)}};
  }
  return null;
}

export async function onRequestPost({ request }) {
  const client=request.headers.get('CF-Connecting-IP')||'unknown-client';
  if(!allowImport(client))return Response.json({error:'rate_limited',message:'Too many recipe imports. Please try again shortly.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':'60'}});
  if(Number(request.headers.get('content-length')||0)>MAX_INPUT)return Response.json({error:'request_too_large',message:'The request was too large.'},{status:413,headers:{'Cache-Control':'no-store'}});
  let body;try{body=await request.json();}catch{return Response.json({error:'invalid_request',message:'Enter a valid recipe page URL.'},{status:400,headers:{'Cache-Control':'no-store'}});}
  let target=safeUrl(body?.url);
  if(!target||target.protocol!=='https:')return Response.json({error:'invalid_url',message:'Use a public HTTPS recipe page URL.'},{status:400,headers:{'Cache-Control':'no-store'}});
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),TIMEOUT_MS);
  try {
    for(let redirects=0;redirects<=MAX_REDIRECTS;redirects++){
      if(!target||!await isPublicTarget(target,abort.signal))return Response.json({error:'blocked_host',message:'This host cannot be fetched safely.'},{status:400,headers:{'Cache-Control':'no-store'}});
      const response=await fetch(target.href,{redirect:'manual',signal:abort.signal,headers:{Accept:'text/html,application/xhtml+xml;q=0.9','User-Agent':'UnboundRecipeImporter/1.0'}});
      if([301,302,303,307,308].includes(response.status)){
        if(redirects===MAX_REDIRECTS)return Response.json({error:'too_many_redirects',message:'The recipe page redirected too many times.'},{status:502,headers:{'Cache-Control':'no-store'}});
        const location=response.headers.get('location');target=location?safeUrl(new URL(location,target).href):null;
        if(!target||target.protocol!=='https:')return Response.json({error:'blocked_redirect',message:'The recipe page redirected to an unsafe address.'},{status:502,headers:{'Cache-Control':'no-store'}});
        continue;
      }
      if(!response.ok||! /^(?:text\/html|application\/xhtml\+xml)/iu.test(response.headers.get('content-type')||''))return Response.json({error:'unavailable',message:'The page could not be read. It may be blocked, private or unavailable.'},{status:502,headers:{'Cache-Control':'no-store'}});
      const html=await readLimited(response);
      const recipe=extractRecipeFromHtml(html,target.href);
      if(!recipe)return Response.json({error:'recipe_not_found',message:'No usable Schema.org recipe data was found. You can enter the recipe manually.'},{status:422,headers:{'Cache-Control':'no-store'}});
      return Response.json(recipe,{headers:{'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'}});
    }
  } catch { return Response.json({error:'unavailable',message:'The page could not be read. Check the URL or enter the recipe manually.'},{status:502,headers:{'Cache-Control':'no-store'}}); }
  finally { clearTimeout(timer); }
}
