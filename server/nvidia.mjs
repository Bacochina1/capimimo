const ENDPOINT='https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL='nvidia/nemotron-3-ultra-550b-a55b';

// The token stays server-side and provider errors are never forwarded to clients.
export async function nvidiaChat(env,{messages,maxTokens,temperature},fetcher=fetch){
 if(!env.NVIDIA_API_KEY)throw Error('IA indisponível.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetcher(ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+env.NVIDIA_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,messages,max_tokens:maxTokens,temperature,stream:false,chat_template_kwargs:{enable_thinking:false}}),signal:controller.signal});
  if(!response.ok)throw Error('IA indisponível.');
  const result=await response.json(),text=result?.choices?.[0]?.message?.content;
  if(typeof text!=='string'||!text.trim())throw Error('Resposta vazia.');
  return text.trim();
 }finally{clearTimeout(timeout);}
}
