import { NextResponse } from "next/server";
export const runtime="nodejs";
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 const auth=req.headers.get("authorization");
 if(!secret||auth!=="Bearer "+secret)return NextResponse.json({error:"CRON_NOT_CONFIGURED_OR_UNAUTHORIZED"},{status:401});
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!base)return NextResponse.json({error:"SUPABASE_URL_NOT_CONFIGURED"},{status:500});
 if(!serviceKey||!anon)return NextResponse.json({error:"SUPABASE_SERVER_KEYS_NOT_CONFIGURED"},{status:500});
 const r=await fetch(base+"/functions/v1/market-data-sync",{method:"POST",headers:{Authorization:"Bearer "+serviceKey,apikey:anon,"Content-Type":"application/json"},cache:"no-store"});
 const text=await r.text();return new NextResponse(text,{status:r.status,headers:{"content-type":"application/json"}});
}