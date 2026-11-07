"use client";
import { useEffect,useState } from "react";
import { supabase } from "@/lib/supabase/client";
const langs = [
  ["es","Español"],["en","English"],["pt","Português"],["fr","Français"],["it","Italiano"],["zh","中文"],["ru","Русский"],["hi","हिन्दी"],
  ["nl","Nederlands"],["pl","Polski"],["ru","Русский"],["uk","Українська"],["tr","Türkçe"],["el","Ελληνικά"],
  ["ar","العربية"],["he","עברית"],["fa","فارسی"],["zh","中文"],["ja","日本語"],["ko","한국어"],
  ["hi","हिन्दी"],["bn","বাংলা"],["ur","اردو"],["id","Bahasa Indonesia"],["ms","Bahasa Melayu"],["th","ไทย"],
  ["vi","Tiếng Việt"],["sw","Kiswahili"],["af","Afrikaans"],["ro","Română"],["hu","Magyar"],["cs","Čeština"],
  ["sk","Slovenčina"],["bg","Български"],["hr","Hrvatski"],["sr","Српски"],["sl","Slovenščina"],
  ["sv","Svenska"],["no","Norsk"],["da","Dansk"],["fi","Suomi"],["ca","Català"],["eu","Euskara"],["gl","Galego"]
] as const;
export default function Idioma(){const[language,setLanguage]=useState("es"),[message,setMessage]=useState(""),[error,setError]=useState("");
useEffect(()=>{void(async()=>{const{data:{user}}=await supabase.auth.getUser();if(!user)return;const{data,error}=await supabase.from("profiles").select("idioma_preferido").eq("id",user.id).maybeSingle();if(error){setError(error.message);return}if(data?.idioma_preferido)setLanguage(data.idioma_preferido)})()},[]);
async function save(){setMessage("");setError("");localStorage.setItem("agrobrokeria.language",language);document.documentElement.lang=language;window.dispatchEvent(new Event("agrobrokeria:language-changed"));const{data:{user}}=await supabase.auth.getUser();if(user){const{error}=await supabase.from("profiles").update({idioma_preferido:language}).eq("id",user.id);if(error){setError(error.message);return}}setMessage("Idioma guardado.");}
return <main className="module-page"><div className="module-hero"><div><span className="eyebrow">IDIOMA</span><h1>Idioma y traducción</h1><p>Seleccioná el idioma de preferencia para tu cuenta. El original de mensajes y documentos siempre se conserva.</p></div></div><section className="company-card"><label htmlFor="language">Idioma principal</label><select id="language" value={language} onChange={e=>setLanguage(e.target.value)} style={{display:"block",marginTop:8,padding:12,borderRadius:10,border:"1px solid #dbe3ea"}}>{langs.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select><button className="module-pill" style={{marginTop:16}} onClick={save} type="button">Guardar idioma</button>{message&&<p>{message}</p>}{error&&<div className="module-alert module-alert-error">{error}</div>}<h2 style={{marginTop:28}}>Traducción automática</h2><p>La arquitectura conserva idioma original, idioma destino, versión, proveedor y estado. Si el proveedor no está configurado, no se inventa ninguna traducción.</p></section></main>}