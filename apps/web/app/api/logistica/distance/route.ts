import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function POST(request:NextRequest){
 try{
  const auth=request.headers.get("authorization")||"",token=auth.startsWith("Bearer ")?auth.slice(7):"";
  if(!token)return NextResponse.json({error:"Autenticación requerida."},{status:401});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,mapsKey=process.env.GOOGLE_MAPS_API_KEY;
  if(!url||!key)return NextResponse.json({error:"Servicio de autenticación no configurado."},{status:503});
  const sb=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await sb.auth.getUser(token);if(error||!user)return NextResponse.json({error:"Sesión inválida."},{status:401});
  if(!mapsKey)return NextResponse.json({error:"Falta configurar GOOGLE_MAPS_API_KEY en Vercel."},{status:503});
  const body=await request.json(),origin=String(body?.origin||"").trim(),destination=String(body?.destination||"").trim();
  if(!origin||!destination||origin.length>200||destination.length>200)return NextResponse.json({error:"Origen y destino son obligatorios."},{status:400});
  const params=new URLSearchParams({origins:origin,destinations:destination,mode:"driving",units:"metric",key:mapsKey});
  const response=await fetch("https://maps.googleapis.com/maps/api/distancematrix/json?"+params.toString(),{cache:"no-store"});
  const data=await response.json();
  if(!response.ok||data.status!=="OK"||data.rows?.[0]?.elements?.[0]?.status!=="OK")return NextResponse.json({error:"Google Maps no pudo calcular la distancia para ese trayecto."},{status:502});
  const element=data.rows[0].elements[0],meters=Number(element.distance?.value);
  if(!Number.isFinite(meters)||meters<=0)return NextResponse.json({error:"La distancia recibida no es válida."},{status:502});
  return NextResponse.json({distance_km:Math.ceil(meters/1000),distance_text:element.distance.text,duration_text:element.duration?.text||null,origin: data.origin_addresses?.[0]||origin,destination:data.destination_addresses?.[0]||destination});
 }catch{return NextResponse.json({error:"No se pudo calcular la distancia."},{status:500});}
}