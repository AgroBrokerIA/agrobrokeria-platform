import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.1";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(URL, SERVICE);
const allowedLanguages = new Set(["es","en","pt","zh","fr","it","ru","hi"]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const labels: Record<string, Record<string,string>> = {
  es: { title:"CARTA DE INTENCIÓN (LOI)", date:"Fecha de emisión", buyer:"Comprador", tax:"Identificación fiscal", product:"Producto", quantity:"Cantidad total", quality:"Especificaciones de calidad", moisture:"Humedad máxima", foreign:"Materia extraña máxima", aflatoxin:"Aflatoxinas máximas", protein:"Proteína mínima", incoterm:"Incoterm", origin:"Puerto de origen", destination:"Puerto de destino", payment:"Instrumentos de pago declarados", validity:"Validez", disclaimer:"Este documento expresa una intención comercial preliminar y no constituye contrato de compraventa, compromiso de financiación, garantía bancaria ni confirmación de fondos. Toda operación queda sujeta a debida diligencia, aprobación documental y contrato definitivo firmado por las partes." , pricing:"Método de precio", premium:"Premium CBOT", schedule:"Programa de embarques", vessel:"Tipo de buque", tonsShipment:"Toneladas por embarque", country:"País de destino"},
  en: { title:"LETTER OF INTENT (LOI)", date:"Date of issue", buyer:"Buyer", tax:"Tax / Registration ID", product:"Commodity", quantity:"Total quantity", quality:"Quality specifications", moisture:"Maximum moisture", foreign:"Maximum foreign matter", aflatoxin:"Maximum aflatoxins", protein:"Minimum protein", incoterm:"Incoterm", origin:"Port of origin", destination:"Port of destination", payment:"Declared payment instruments", validity:"Validity", disclaimer:"This document expresses preliminary commercial intent only. It is not a sale contract, financing commitment, bank guarantee, or confirmation of funds. Any transaction remains subject to due diligence, document approval, and a definitive agreement signed by the parties." , pricing:"Pricing method", premium:"CBOT premium", schedule:"Shipment schedule", vessel:"Vessel type", tonsShipment:"Tons per shipment", country:"Destination country"},
  pt: { title:"CARTA DE INTENÇÃO (LOI)", date:"Data de emissão", buyer:"Comprador", tax:"Identificação fiscal", product:"Produto", quantity:"Quantidade total", quality:"Especificações de qualidade", moisture:"Umidade máxima", foreign:"Matéria estranha máxima", aflatoxin:"Aflatoxinas máximas", protein:"Proteína mínima", incoterm:"Incoterm", origin:"Porto de origem", destination:"Porto de destino", payment:"Instrumentos de pagamento declarados", validity:"Validade", disclaimer:"Este documento expressa apenas uma intenção comercial preliminar. Não constitui contrato de compra e venda, compromisso de financiamento, garantia bancária ou confirmação de fundos. A operação depende de diligência, aprovação documental e contrato definitivo assinado pelas partes." , pricing:"Método de preço", premium:"Prêmio CBOT", schedule:"Cronograma de embarques", vessel:"Tipo de embarcação", tonsShipment:"Toneladas por embarque", country:"País de destino"},
  fr: { title:"LETTRE D'INTENTION (LOI)", date:"Date d'émission", buyer:"Acheteur", tax:"Identifiant fiscal", product:"Produit", quantity:"Quantité totale", quality:"Spécifications de qualité", moisture:"Humidité maximale", foreign:"Matières étrangères maximales", aflatoxin:"Aflatoxines maximales", protein:"Protéines minimales", incoterm:"Incoterm", origin:"Port d'origine", destination:"Port de destination", payment:"Instruments de paiement déclarés", validity:"Validité", disclaimer:"Ce document exprime uniquement une intention commerciale préliminaire. Il ne constitue ni contrat de vente, ni engagement de financement, ni garantie bancaire, ni confirmation de fonds. Toute opération reste soumise à la diligence raisonnable, à l'approbation des documents et à un contrat définitif signé par les parties." , pricing:"Méthode de prix", premium:"Prime CBOT", schedule:"Calendrier des expéditions", vessel:"Type de navire", tonsShipment:"Tonnes par expédition", country:"Pays de destination"},
  it: { title:"LETTERA DI INTENTI (LOI)", date:"Data di emissione", buyer:"Acquirente", tax:"Identificativo fiscale", product:"Prodotto", quantity:"Quantità totale", quality:"Specifiche qualitative", moisture:"Umidità massima", foreign:"Materiale estraneo massimo", aflatoxin:"Aflatossine massime", protein:"Proteine minime", incoterm:"Incoterm", origin:"Porto di origine", destination:"Porto di destinazione", payment:"Strumenti di pagamento dichiarati", validity:"Validità", disclaimer:"Il presente documento esprime esclusivamente un'intenzione commerciale preliminare. Non costituisce contratto di compravendita, impegno di finanziamento, garanzia bancaria o conferma di fondi. Ogni operazione resta soggetta a due diligence, approvazione documentale e contratto definitivo firmato dalle parti." , pricing:"Metodo di prezzo", premium:"Premio CBOT", schedule:"Programma delle spedizioni", vessel:"Tipo di nave", tonsShipment:"Tonnellate per spedizione", country:"Paese di destinazione"},
  zh: { title:"意向书（LOI）", date:"签发日期", buyer:"买方", tax:"税务/注册编号", product:"商品", quantity:"总数量", quality:"质量规格", moisture:"最高水分", foreign:"最高杂质", aflatoxin:"黄曲霉毒素上限", protein:"最低蛋白质", incoterm:"国际贸易术语", origin:"起运港", destination:"目的港", payment:"声明的付款工具", validity:"有效期", disclaimer:"本文件仅表达初步商业意向，不构成买卖合同、融资承诺、银行担保或资金证明。任何交易均须经过尽职调查、文件审核并由双方签署最终协议。" , pricing:"定价方法", premium:"CBOT升水", schedule:"装运计划", vessel:"船舶类型", tonsShipment:"每批装运吨数", country:"目的国家"},
  ru: { title:"ПИСЬМО О НАМЕРЕНИЯХ (LOI)", date:"Дата выдачи", buyer:"Покупатель", tax:"Налоговый / регистрационный номер", product:"Товар", quantity:"Общее количество", quality:"Показатели качества", moisture:"Максимальная влажность", foreign:"Максимальная сорная примесь", aflatoxin:"Максимум афлатоксинов", protein:"Минимум белка", incoterm:"Инкотермс", origin:"Порт отправления", destination:"Порт назначения", payment:"Заявленные платежные инструменты", validity:"Срок действия", disclaimer:"Документ выражает только предварительное коммерческое намерение. Он не является договором купли-продажи, обязательством финансирования, банковской гарантией или подтверждением наличия средств. Сделка требует проверки, одобрения документов и окончательного соглашения, подписанного сторонами." , pricing:"Метод ценообразования", premium:"Премия CBOT", schedule:"График отгрузок", vessel:"Тип судна", tonsShipment:"Тонн на одну отгрузку", country:"Страна назначения"},
  hi: { title:"आशय पत्र (LOI)", date:"जारी करने की तारीख", buyer:"खरीदार", tax:"कर / पंजीकरण पहचान", product:"वस्तु", quantity:"कुल मात्रा", quality:"गुणवत्ता विनिर्देश", moisture:"अधिकतम नमी", foreign:"अधिकतम बाहरी पदार्थ", aflatoxin:"अधिकतम अफ्लाटॉक्सिन", protein:"न्यूनतम प्रोटीन", incoterm:"इन्कोटर्म", origin:"मूल बंदरगाह", destination:"गंतव्य बंदरगाह", payment:"घोषित भुगतान साधन", validity:"वैधता", disclaimer:"यह दस्तावेज़ केवल प्रारंभिक वाणिज्यिक इरादा व्यक्त करता है। यह बिक्री अनुबंध, वित्तपोषण प्रतिबद्धता, बैंक गारंटी या धन की पुष्टि नहीं है। कोई भी लेनदेन उचित जांच, दस्तावेज़ अनुमोदन और पक्षों द्वारा हस्ताक्षरित अंतिम समझौते के अधीन है।" , pricing:"मूल्य निर्धारण विधि", premium:"CBOT प्रीमियम", schedule:"शिपमेंट अनुसूची", vessel:"जहाज़ का प्रकार", tonsShipment:"प्रति शिपमेंट टन", country:"गंतव्य देश"}
};

function val(o: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) { const v=o[key]; if(v!==undefined&&v!==null&&String(v).trim()!=="") return String(v); }
  return "—";
}
async function translateText(text: string, source: string, target: string) {
  if (source === target || !text.trim()) return text;
  const key = Deno.env.get("TRANSLATION_API_KEY");
  if (!key) throw new Error("TRANSLATION_NOT_CONFIGURED");
  const endpoint = Deno.env.get("TRANSLATION_API_URL") || "https://translation.googleapis.com/language/translate/v2";
  const response = await fetch(endpoint, { method:"POST", headers: { "X-Goog-Api-Key":key, "content-type":"application/json" }, body:JSON.stringify({q:text,source,target,format:"text"}) });
  const payload = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error("TRANSLATION_PROVIDER_ERROR");
  const translated = payload?.data?.translations?.[0]?.translatedText;
  if (typeof translated !== "string" || !translated) throw new Error("EMPTY_TRANSLATION");
  return translated;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return json({error:"METHOD_NOT_ALLOWED"},405);
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return json({error:"AUTH_REQUIRED"},401);
    const userClient = createClient(URL, ANON, { global:{headers:{Authorization:auth}} });
    const {data:{user}} = await userClient.auth.getUser();
    if (!user) return json({error:"AUTH_REQUIRED"},401);

    const body = await req.json().catch(()=>({}));
    if (body.action === "translate") {
      const requestedTarget = typeof body.target === "string" ? body.target.toLowerCase() : "";
      const target = requestedTarget === "zh-cn" ? "zh" : requestedTarget;
      const texts = body.texts;
      if (!allowedLanguages.has(target) || !Array.isArray(texts) || texts.length < 1 || texts.length > 128 ||
          texts.some((value: unknown) => typeof value !== "string" || value.length > 5000) ||
          texts.reduce((sum: number, value: string) => sum + value.length, 0) > 30000) {
        return json({error:"INVALID_TRANSLATION_REQUEST"},400);
      }
      const {data:memberships,error:membershipError} = await db.from("company_users")
        .select("company_id").eq("profile_id",user.id).eq("activo",true).limit(1);
      if (membershipError) return json({error:"MEMBERSHIP_LOOKUP_FAILED"},500);
      const {data:admin} = await db.from("platform_admins").select("user_id")
        .eq("user_id",user.id).maybeSingle();
      if (!(memberships||[]).length && !admin) return json({error:"FORBIDDEN"},403);
      const translations = await Promise.all(texts.map((value:string)=>translateText(value,"en",target)));
      return json({translations});
    }

    const id = typeof body.document_id === "string" ? body.document_id : "";
    const target = typeof body.language === "string" ? body.language.toLowerCase() : "";
    const letterhead = body.letterhead === "neutral" || body.letterhead === "neutro" ? "neutro" : "empresa";
    if (!id || !allowedLanguages.has(target)) return json({error:"INVALID_REQUEST"},400);

    const {data:doc,error:docError} = await db.from("documentos_comex").select("*").eq("id",id).single();
    if (docError || !doc) return json({error:"DOCUMENT_NOT_FOUND"},404);

    const {data:membership,error:membershipError} = await db.from("company_users").select("company_id").eq("profile_id",user.id).eq("activo",true);
    if (membershipError) return json({error:"MEMBERSHIP_LOOKUP_FAILED"},500);
    const companyIds = new Set((membership||[]).map((x:any)=>String(x.company_id)));
    if (companyIds.size) {
      const {data:maps,error:mapError} = await db.from("company_empresa_map").select("empresa_id").in("company_id",Array.from(companyIds));
      if (mapError) return json({error:"COMPANY_MAPPING_LOOKUP_FAILED"},500);
      for (const row of maps||[]) companyIds.add(String(row.empresa_id));
    }
    if (!companyIds.has(String(doc.empresa_id))) return json({error:"FORBIDDEN"},403);

    const snapshot = (doc.datos_inmutables||{}) as Record<string,unknown>;
    const company = await db.from("empresas").select("razon_social,cuit,pais,idioma_preferido").eq("id",doc.empresa_id).maybeSingle();
    const header = letterhead==="empresa" ? await db.from("empresa_membretes").select("razon_social,cuit_tax_id,domicilio,ciudad,provincia_estado,pais,logo_url,membrete_texto,encabezado_texto").eq("empresa_id",doc.empresa_id).maybeSingle() : {data:null};
    const source = allowedLanguages.has(String(doc.idioma_origen)) ? String(doc.idioma_origen) : "es";
    const L = labels[source] || labels.es;
    const values = [
      L.title,
      `${L.date}: ${new Date().toISOString().slice(0,10)}`,
      `${L.buyer}: ${val(snapshot,"buyer_reason_social","razon_social_comprador")}`,
      `${L.tax}: ${val(snapshot,"buyer_cuit_tax_id","cuit_comprador")}`,
      `${L.product}: ${val(snapshot,"commodity","producto","producto_nombre")}`,
      `${L.quantity}: ${val(snapshot,"total_quantity_mt","cantidad_tn","toneladas")} MT`,
      L.quality,
      `${L.moisture}: ${val(snapshot,"moisture_max","humedad_maxima","humedad")}`,
      `${L.foreign}: ${val(snapshot,"foreign_matter_max","materia_extrana_maxima")}`,
      `${L.aflatoxin}: ${val(snapshot,"aflatoxins_max_ppb","aflatoxinas_max_ppb")}`,
      `${L.protein}: ${val(snapshot,"protein_min","proteina_minima")}`,
      `${L.incoterm}: ${val(snapshot,"incoterm","incoterm_codigo")}`,
      `${L.origin}: ${val(snapshot,"port_of_origin","puerto_origen")}`,
      `${L.destination}: ${val(snapshot,"port_of_destination","puerto_destino")}`,
      `${L.payment}: ${val(snapshot,"payment_instruments","instrumentos_pago")}`,
      `${L.pricing}: ${val(snapshot,"price_method","metodo_precio")}`,
      `${L.premium}: ${val(snapshot,"cbot_premium","premium_cbot")}`,
      `${L.schedule}: ${val(snapshot,"shipping_schedule","cantidad_envios")}`,
      `${L.vessel}: ${val(snapshot,"vessel_type","tipo_buque")}`,
      `${L.tonsShipment}: ${val(snapshot,"tons_per_shipment","toneladas_por_envio")}`,
      `${L.country}: ${val(snapshot,"destination_country","pais_destino")}`,
      `${L.validity}: ${val(snapshot,"validity_days","vigencia_dias") === "—" ? "15 calendar days" : val(snapshot,"validity_days","vigencia_dias")}`,
      L.disclaimer
    ];
    const translated = source===target ? values : await Promise.all(values.map(v=>translateText(v,source,target)));
    const pdf = await PDFDocument.create();
    pdf.setTitle("AgroBrokerIA - LOI / COMEX");
    pdf.setAuthor("AgroBrokerIA");
    pdf.setSubject("Documento comercial internacional");
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595.28,841.89]);
    const margin=48, width=595.28-margin*2;
    let y=790;
    const drawLine=(text:string, isTitle=false)=>{
      const size=isTitle?16:10.5;
      const activeFont=isTitle?bold:font;
      const maxChars=isTitle?65:94;
      const words=text.split(/\s+/);let line="";
      const lines:string[]=[];
      for(const word of words){const test=line?line+" "+word:word;if(test.length>maxChars){if(line)lines.push(line);line=word;}else line=test;}
      if(line)lines.push(line);
      for(const part of lines){
        if(y<62){page=pdf.addPage([595.28,841.89]);y=790;}
        page.drawText(part,{x:margin,y,size,font:activeFont,color:rgb(0.10,0.18,0.13),maxWidth:width});
        y-=isTitle?27:17;
      }
      if(isTitle)y-=8;
    };
    if(header.data){
      const h=header.data as Record<string,unknown>;
      drawLine(String(h.razon_social||company.data?.razon_social||"AgroBrokerIA"),true);
      drawLine([h.domicilio,h.ciudad,h.provincia_estado,h.pais].filter(Boolean).join(" · "));
      drawLine([h.cuit_tax_id,h.membrete_texto,h.encabezado_texto].filter(Boolean).join(" · "));
      y-=10;
    } else {
      drawLine("AGROBROKERIA · INTERNATIONAL COMMODITY DOCUMENT",true);
      y-=8;
    }
    for(let i=0;i<translated.length;i++) drawLine(translated[i],i===0);
    const bytes=await pdf.save();
    const digest=await crypto.subtle.digest("SHA-256",bytes);
    const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
    const safeProduct=val(snapshot,"commodity","producto","producto_nombre").replace(/[^a-z0-9]+/gi,"_").replace(/^_|_$/g,"")||"Commodity";
    const path=`comex/${doc.empresa_id}/${doc.id}/LOI_${safeProduct}_${target}_${hash.slice(0,12)}.pdf`;
    const upload=await db.storage.from("agrobroker-private").upload(path,bytes,{contentType:"application/pdf",upsert:false});
    if(upload.error)return json({error:"PDF_STORAGE_FAILED"},500);
    const {error:updateError}=await db.from("documentos_comex").update({idioma_generado:target,membrete_tipo:letterhead,hash_sha256:hash,storage_path:path,estado:"GENERADO",generado_en:new Date().toISOString()}).eq("id",doc.id);
    if(updateError){await db.storage.from("agrobroker-private").remove([path]);return json({error:"DOCUMENT_RECORD_UPDATE_FAILED"},500);}
    const {data:signed,error:signedError}=await db.storage.from("agrobroker-private").createSignedUrl(path,900);
    if(signedError||!signed?.signedUrl)return json({error:"SIGNED_URL_FAILED"},500);
    return json({ok:true,document_id:doc.id,language:target,hash_sha256:hash,storage_path:path,download_url:signed.signedUrl,expires_in:900});
  } catch (error) {
    const message=error instanceof Error?error.message:"DOCUMENT_EXPORT_FAILED";
    const status=message==="TRANSLATION_NOT_CONFIGURED"?503:500;
    return json({error:message},status);
  }
});