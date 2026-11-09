"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const roles = [["Comprador","comprador"],["Vendedor","vendedor"],["Transportista","transportista"],["Logística","logistica"],["Corredor oficial","corredor"],["Exportador","exportador"],["Acopio","acopio"],["Cooperativa","cooperativa"],["Industria","industria"],["Intermediario independiente","intermediario"],["Comisionista independiente","comisionista"],["Productor","productor"]];
const intermediaryRoles = ["corredor","intermediario","comisionista"];
const operatorTypeForRole = (role:string):string|null => ({
  productor:"productor", acopio:"acopio", cooperativa:"cooperativa",
  corredor:"corredor_oficial", intermediario:"comisionista_intermediario",
  comisionista:"comisionista_intermediario", exportador:"exportador",
  transportista:"transportista", logistica:"logistica"
} as Record<string,string>)[role] || null;
const initial = {
  accountType:"PERSONA", role:"comprador", documentType:"DNI", documentNumber:"", cuilCuit:"", companyCuit:"", representativeCuil:"",
  firstName:"", middleName:"", lastName:"", birthDate:"", gender:"", nationality:"Argentina", countryOfBirth:"Argentina", maritalStatus:"",
  legalName:"", tradeName:"", rucaNumber:"", representativePosition:"", email:"", phone:"", phoneAlt:"",
  country:"Argentina", province:"", city:"", street:"", streetNumber:"", floor:"", apartment:"", postalCode:"",
  economicActivity:"", incomeTaxStatus:"", vatStatus:"", employmentStatus:"",
  politicallyExposed:"", obligedSubject:"", lawfulFunds:"", usTaxResident:"",
  bankName:"", accountTypeBank:"Caja de ahorro", currency:"ARS", accountHolder:"", cbuCvu:"", alias:"",
  password:"", confirmPassword:""
};
type FormState = typeof initial;

export default function RegisterPage() {
  const router = useRouter();
  const [form,setForm] = useState<FormState>(initial);
  const [accepted,setAccepted] = useState(false);
  const [loading,setLoading] = useState(false);
  const [lookupLoading,setLookupLoading] = useState(false);
  const [lookupMessage,setLookupMessage] = useState("");
  const [lookupStatus,setLookupStatus] = useState<"idle"|"loading"|"success"|"warning"|"error">("idle");
  const lookupSequence=useRef(0);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [dniFront,setDniFront] = useState<File|null>(null);
  const [dniBack,setDniBack] = useState<File|null>(null);
  const [driverPhoto,setDriverPhoto] = useState<File|null>(null);
  const [driverDniFront,setDriverDniFront] = useState<File|null>(null);
  const [driverDniBack,setDriverDniBack] = useState<File|null>(null);
  const [statuteDoc,setStatuteDoc] = useState<File|null>(null);
  const [authorityDoc,setAuthorityDoc] = useState<File|null>(null);
  const [arcaProof,setArcaProof] = useState<File|null>(null);
  const [sisaProof,setSisaProof] = useState<File|null>(null);
  const isIntermediaryRole = intermediaryRoles.includes(form.role);
  const isBankRole = false;
  const tipoOperador = operatorTypeForRole(form.role);
  const isCompany = form.accountType === "EMPRESA";
  const isTransportista = form.role === "transportista";
  const isLogistica = form.role === "logistica";
  const update = (key:keyof FormState,value:string) => setForm(p=>({...p,[key]:value}));
  const handleCuilChange=(value:string)=>{
    update("cuilCuit",value);
    const digits=value.replace(/\D/g,"");
    lookupSequence.current++;
    if(digits.length===11)void buscarDatosOficiales(digits,"persona");
    else{setLookupLoading(false);setLookupStatus("idle");setLookupMessage(digits.length>0?"Ingresá los 11 dígitos del CUIL/CUIT para consultar ARCA.":"");}
  };
  const handleCompanyCuitChange=(value:string)=>{
    update("companyCuit",value);
    const digits=value.replace(/\D/g,"");
    lookupSequence.current++;
    if(digits.length===11)void buscarDatosOficiales(digits,"empresa");
    else{setLookupLoading(false);setLookupStatus("idle");setLookupMessage(digits.length>0?"Ingresá los 11 dígitos del CUIT para consultar ARCA.":"");}
  };
  const normalize = (value:string) => value.trim().toLocaleUpperCase("es-AR");
  async function buscarDatosOficiales(numero:string,tipo:"persona"|"empresa"){
    const cuit=numero.replace(/\D/g,"");
    if(cuit.length!==11)return;
    const requestId=++lookupSequence.current;
    setLookupLoading(true);setLookupStatus("loading");setLookupMessage("Consultando el padrón oficial de ARCA…");
    try{
      const response=await fetch("/api/v1/padron/consulta",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cuit})});
      const payload=await response.json().catch(()=>({}));
      if(requestId!==lookupSequence.current)return;
      if(!response.ok||!payload?.ok)throw new Error(payload?.error||"No se pudieron consultar los datos oficiales.");
      const d=payload.result;
      if(!d?.found){
        setLookupStatus("warning");
        setLookupMessage(d?.environment==="HOMOLOGACION"
          ?"Estás consultando el padrón de homologación de ARCA, que contiene CUIT ficticios de prueba y no devuelve datos reales. Para consultar un CUIT real se requiere habilitar el ambiente de producción con autorización y credenciales oficiales. Podés completar tus datos manualmente."
          :"ARCA no encontró datos para ese CUIL/CUIT. Revisá los 11 dígitos o completá los datos manualmente.");
        return;
      }
      const domicilioFiscal=d.domicilioFiscal||{};
      const nombre=d.nombre||"";
      const apellido=d.apellido||"";
      const razonSocial=d.razonSocial||[apellido,nombre].filter(Boolean).join(" ");
      const domicilio=d.domicilio||domicilioFiscal.direccion||"";
      const localidad=d.localidad||domicilioFiscal.localidad||"";
      const provincia=d.provincia||domicilioFiscal.provincia||"";
      const codigoPostal=d.codigoPostal||domicilioFiscal.codigoPostal||"";
      const impuestos:string[]=Array.isArray(d.impuestos)?d.impuestos.map((x:unknown)=>typeof x==="string"?x:String((x as {descripcion?:string})?.descripcion||"")):[];
      const actividades:string[]=Array.isArray(d.actividades)?d.actividades.map((x:unknown)=>typeof x==="string"?x:String((x as {descripcion?:string})?.descripcion||"")):[];
      setForm(prev=>({
        ...prev,
        ...(tipo==="empresa"?{
          legalName:razonSocial||prev.legalName,
          street:domicilio||prev.street,city:localidad||prev.city,province:provincia||prev.province,postalCode:codigoPostal||prev.postalCode,
          economicActivity:actividades[0]||prev.economicActivity,
          incomeTaxStatus:d.monotributoDetectado?"Monotributo":(impuestos.some(x=>/GANANCIAS/i.test(x))?"Inscripto":prev.incomeTaxStatus),
          vatStatus:d.monotributoDetectado?"Monotributo":(impuestos.some(x=>/IVA/i.test(x))?"Responsable Inscripto":prev.vatStatus)
        }:{
          firstName:nombre||prev.firstName,lastName:apellido||prev.lastName,
          birthDate:d.fechaNacimiento||prev.birthDate,
          gender:d.genero==="FEMENINO"?"Femenino":d.genero==="MASCULINO"?"Masculino":prev.gender,
          nationality:d.nacionalidad?String(d.nacionalidad).toLocaleLowerCase("es-AR").replace(/^./,x=>x.toLocaleUpperCase("es-AR")):prev.nationality,
          street:domicilio||prev.street,city:localidad||prev.city,province:provincia||prev.province,postalCode:codigoPostal||prev.postalCode,
          economicActivity:actividades[0]||prev.economicActivity,
          incomeTaxStatus:d.monotributoDetectado?"Monotributo":(impuestos.some(x=>/GANANCIAS/i.test(x))?"Inscripto":prev.incomeTaxStatus),
          vatStatus:d.monotributoDetectado?"Monotributo":(impuestos.some(x=>/IVA/i.test(x))?"Responsable Inscripto":prev.vatStatus)
        })
      }));
      setLookupStatus("success");
      setLookupMessage(d.source==="ARCA_MOCK_HOMOLOGACION"?"Datos de prueba simulados (homologación). El autocompletado funciona; estos datos no son una constancia real de ARCA.":"Datos encontrados en el padrón ARCA. Se completaron los campos disponibles; revisalos antes de confirmar.");
    }catch(e){
      if(requestId!==lookupSequence.current)return;
      const detail=e instanceof Error?e.message:"";
      const invalidLength=detail==="CUIT_CUIL_MUST_HAVE_11_DIGITS";
      const limited=detail==="PADRON_LOOKUP_RATE_LIMIT_EXCEEDED";
      setLookupStatus(invalidLength?"error":"warning");
      const credentialsMissing=/Faltan las credenciales X\.509 de ARCA/i.test(detail);
      const configurationMissing=/ARCA_CUIT_NO_CONFIGURADO|Falta ARCA_CUIT|SUPABASE_SERVER_KEYS_NOT_CONFIGURED|PADRON_RATE_LIMIT_UNAVAILABLE/.test(detail);
      setLookupMessage(invalidLength
        ?"El CUIL/CUIT debe contener exactamente 11 dígitos."
        :limited
          ?"La consulta alcanzó el límite temporal. Esperá unos minutos o completá los datos manualmente."
          :credentialsMissing||configurationMissing
            ?"La consulta real de CUIT todavía no está habilitada en este Preview: faltan ARCA_CUIT y/o el certificado y la clave privada X.509 de homologación (ARCA_CERTIFICATE_HOMO_BASE64 y ARCA_PRIVATE_KEY_HOMO_BASE64) en Vercel. Además, el certificado debe estar autorizado para ws_sr_constancia_inscripcion. No es un error del CUIT ingresado. Podés completar los datos manualmente mientras se configura."

            :"ARCA no respondió o rechazó la consulta. Podés completar tus datos manualmente y continuar; verificá la información antes de confirmar.");
    }finally{if(requestId===lookupSequence.current)setLookupLoading(false);}
  }
  const upload = async (userId:string,file:File,type:string) => {
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`onboarding/${userId}/${crypto.randomUUID()}-${safeName}`;
    const {error:uploadError}=await supabase.storage.from("agrobroker-private").upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError) throw uploadError;
    const {error:rowError}=await supabase.from("account_onboarding_documents").insert({user_id:userId,document_type:type,storage_path:path,file_name:file.name,mime_type:file.type,file_size:file.size,review_status:"PENDIENTE"});
    if(rowError) throw rowError;
  };
  async function registrarse(e:React.FormEvent) {
    e.preventDefault(); setError(""); setMessage("");
    if(!accepted){setError("Aceptá los Términos y Condiciones para continuar.");return;}
    if(form.password.length<8||form.password!==form.confirmPassword){setError("Revisá la contraseña: debe tener 8 caracteres como mínimo y coincidir.");return;}
    if(!form.documentNumber.trim()||(!isCompany&&!form.cuilCuit.trim())||!form.email.trim()||!form.phone.trim()){setError("Completá DNI, CUIL/CUIT, correo y teléfono.");return;}
    if(!isCompany && form.cuilCuit.replace(/[^0-9]/g,"").length!==11){setError("El CUIL/CUIT debe tener exactamente 11 dígitos. Podés completar los datos manualmente si ARCA no responde.");return;}
    if((isIntermediaryRole || isLogistica) && !isCompany){setError(isLogistica?"Para registrarte como empresa de Logística, seleccioná Empresa / organización y completá razón social y CUIT.":"Para operar como corredor oficial, comisionista o intermediario independiente necesitás registrar una empresa/organización con CUIT y completar la verificación del legajo.");return;}
    
    if(isTransportista && driverPhoto && (!["image/jpeg","image/png","image/webp"].includes(driverPhoto.type)||driverPhoto.size>5*1024*1024)){setError("La foto de perfil debe ser JPG, PNG o WEBP.");return;}
    if(isCompany && (!form.legalName.trim()||form.companyCuit.replace(/\D/g,"").length!==11||!form.documentNumber.trim()||!form.representativePosition.trim()||form.representativeCuil.replace(/\D/g,"").length!==11)){setError("Completá razón social, CUIT, DNI y CUIL de la persona representante y su cargo. Los documentos respaldatorios pueden agregarse luego desde Mi Perfil.");return;}
    const allowedDocs=["application/pdf","image/jpeg","image/png","image/webp"];
    if([dniFront,dniBack,statuteDoc,authorityDoc,arcaProof,sisaProof,driverDniFront,driverDniBack].filter((file):file is File=>!!file).some(file=>!allowedDocs.includes(file.type)||file.size<=0||file.size>10*1024*1024)){setError("Los documentos deben ser PDF/JPG/PNG/WEBP y no superar 10 MB cada uno.");return;}
    setLoading(true);
    try {
      const {data,error:authError}=await supabase.auth.signUp({
        email:form.email.trim(),password:form.password,
        options:{data:{
          nombre:normalize([form.firstName,form.middleName,form.lastName].filter(Boolean).join(" ")),
          empresa:isCompany?normalize(form.legalName):"",
          cuit:(isCompany?form.companyCuit:form.cuilCuit).replace(/\D/g,""),
          tipo_usuario:form.role,tipo_operador:tipoOperador,account_type:form.accountType,
          legal_accepted:true,legal_user_agent:typeof navigator!=="undefined"?navigator.userAgent:"",
          document_type:form.documentType,document_number:form.documentNumber.replace(/\D/g,""),
          first_name:normalize(form.firstName),middle_name:normalize(form.middleName),last_name:normalize(form.lastName),
          birth_date:form.birthDate||null,gender:form.gender||null,nationality:form.nationality,country_of_birth:form.countryOfBirth,marital_status:form.maritalStatus||null,
          representative_cuil:form.representativeCuil.replace(/\D/g,""),
          representative_position:isCompany?normalize(form.representativePosition):null,
          trade_name:normalize(form.tradeName),ruca_number:form.rucaNumber.trim(),
          email:form.email.trim().toLowerCase(),phone:form.phone.trim(),phone_alt:form.phoneAlt.trim(),
          country:form.country,province:normalize(form.province),city:normalize(form.city),street:normalize(form.street),
          street_number:form.streetNumber.trim(),floor:form.floor.trim(),apartment:form.apartment.trim(),postal_code:form.postalCode.trim(),
          economic_activity:form.economicActivity,income_tax_status:form.incomeTaxStatus,vat_status:form.vatStatus,employment_status:form.employmentStatus,
          politically_exposed:form.politicallyExposed==="true",obliged_subject:form.obligedSubject==="true",
          lawful_funds:form.lawfulFunds==="true",us_tax_resident:form.usTaxResident==="true"
        }}
      });
      if(authError) throw authError;
      if(!data.user) throw new Error("No se pudo crear el usuario.");
      const draft:Record<string,unknown> = {
        user_id:data.user.id,account_type:form.accountType,role:form.role,tipo_operador:tipoOperador,document_type:form.documentType,document_number:form.documentNumber.replace(/\D/g,""),
        cuil_cuit:(isCompany?form.companyCuit:form.cuilCuit).replace(/\D/g,""),representative_cuil:form.representativeCuil.replace(/\D/g,"")||null,first_name:normalize(form.firstName),middle_name:normalize(form.middleName),last_name:normalize(form.lastName),
        birth_date:form.birthDate||null,gender:form.gender||null,nationality:form.nationality,country_of_birth:form.countryOfBirth,marital_status:form.maritalStatus||null,
        legal_name:isCompany?normalize(form.legalName):null,trade_name:normalize(form.tradeName)||null,ruca_number:form.rucaNumber.trim()||null,representative_position:isCompany?normalize(form.representativePosition):null,
        email:form.email.trim().toLowerCase(),phone:form.phone.trim(),phone_alt:form.phoneAlt.trim()||null,country:form.country,province:normalize(form.province),city:normalize(form.city),
        street:normalize(form.street),street_number:form.streetNumber.trim(),floor:form.floor.trim()||null,apartment:form.apartment.trim()||null,postal_code:form.postalCode.trim(),
        economic_activity:form.economicActivity||null,income_tax_status:form.incomeTaxStatus||null,vat_status:form.vatStatus||null,employment_status:form.employmentStatus||null,
        politically_exposed:form.politicallyExposed==="true",obliged_subject:form.obligedSubject==="true",lawful_funds:form.lawfulFunds==="true",us_tax_resident:form.usTaxResident==="true",
        terms_accepted_at:new Date().toISOString(),registration_completed:true,review_status:isCompany?"PENDIENTE":"NO_VERIFICADO",is_verified:false
      };
      if(data.session){
        const {error:saveError}=await supabase.from("account_onboarding").upsert(draft);
        if(saveError) throw saveError;
        if(isCompany){
          const {error:companySyncError}=await supabase.rpc("sincronizar_empresa_desde_onboarding");
          if(companySyncError){router.replace("/perfil?empresa=pendiente");router.refresh();return;}
        }
        try {
        if(isTransportista && driverPhoto && driverDniFront && driverDniBack){
          const stamp=Date.now();
          const ext=(file:File)=>file.name.split(".").pop()||"jpg";
          const fotoPath=`transportistas/${data.user.id}/foto/${stamp}-foto.${ext(driverPhoto)}`;
          const dniFrontPath=`transportistas/${data.user.id}/dni/${stamp}-frente.${ext(driverDniFront)}`;
          const dniBackPath=`transportistas/${data.user.id}/dni/${stamp}-dorso.${ext(driverDniBack)}`;
          const bucket=supabase.storage.from("agrobroker-private");
          const uploaded:string[]=[];
          for(const [path,file] of [[fotoPath,driverPhoto],[dniFrontPath,driverDniFront],[dniBackPath,driverDniBack]] as [string,File][]){const result=await bucket.upload(path,file,{contentType:file.type,upsert:false});if(result.error){await bucket.remove(uploaded);throw result.error;}uploaded.push(path);}
          const {error:transportistaError}=await supabase.rpc("registrar_transportista",{p_nombre:normalize([form.firstName,form.middleName,form.lastName].filter(Boolean).join(" ")),p_dni:form.documentNumber.replace(/\D/g,""),p_cuit:form.cuilCuit.replace(/\D/g,"")||null,p_empresa:isCompany?normalize(form.legalName):null,p_telefono:form.phone.trim()||null,p_dni_path:dniFrontPath,p_dni_dorso_path:dniBackPath,p_foto_path:fotoPath});
          if(transportistaError){await bucket.remove(uploaded);throw transportistaError;}
        }
        if(!isTransportista && dniFront) await upload(data.user.id,dniFront,"DNI_FRENTE");
        if(dniBack) await upload(data.user.id,dniBack,"DNI_DORSO");
        if(isCompany && statuteDoc) await upload(data.user.id,statuteDoc,"ESTATUTO_CONTRATO_SOCIAL");
        if(isCompany && authorityDoc) await upload(data.user.id,authorityDoc,"PODER_ACTA_AUTORIDADES");
        if(isCompany && arcaProof) await upload(data.user.id,arcaProof,"CONSTANCIA_ARCA");
        if(isCompany && sisaProof) await upload(data.user.id,sisaProof,"SISA_CONSTANCIA");
        } catch {
          setMessage("Tu cuenta fue creada, pero no se pudo cargar uno o más documentos. Podés volver a adjuntarlos desde Mi Perfil; la verificación seguirá pendiente.");
          router.replace("/perfil?documentacion=pendiente"); router.refresh(); return;
        }
        router.replace("/dashboard"); router.refresh(); return;
      }
      setMessage(isCompany
        ? "La cuenta fue creada. Confirmá tu correo e ingresá. Los datos de la empresa quedaron guardados; por seguridad, volvé a cargar desde Mi Perfil el DNI, estatuto, poder o acta, constancia ARCA y constancia SISA para completar la revisión."
        : "La cuenta fue creada. Confirmá tu correo e ingresá para continuar. Tus datos básicos quedaron guardados; podés completar la documentación opcional desde Mi Perfil.");
    } catch(err) { setError(err instanceof Error?err.message:"No se pudo completar el registro."); }
    finally { setLoading(false); }
  }

  return <main className="auth-page auth-register">
    <div className="auth-art"><Link href="/" className="auth-brand"><span>↗</span><strong>AgroBroker IA</strong></Link><div className="auth-art-copy"><span>CREÁ TU CUENTA</span><h1>Entrá al mercado<br/>agrocomercial.</h1><p>Registrate y empezá a operar. Las empresas deben completar la validación fiscal antes de operar.</p></div><div className="auth-art-grain" aria-hidden="true"/></div>
    <section className="auth-panel auth-register-panel"><div className="auth-card auth-register-card">
      <div className="auth-logo">↗</div><h1>Crear cuenta</h1><p>Completá tus datos principales para ingresar a AgroBrokerIA.</p>
      {error&&<div className="auth-error" role="alert">{error}</div>}{message&&<div className="auth-success" role="status">{message}<p><Link href="/login">Ir a iniciar sesión</Link></p></div>}
      {lookupMessage&&<div className={lookupStatus==="error"?"auth-error":lookupStatus==="warning"||lookupStatus==="loading"?"auth-legal":"auth-success"} role="status" aria-live="polite">{lookupMessage}</div>}
      <form onSubmit={registrarse}>
        <h2>Tipo de cuenta</h2>
        <div className="auth-two-col"><label>Tipo de registro<select value={form.accountType} onChange={e=>update("accountType",e.target.value)}><option value="PERSONA">Persona física</option><option value="EMPRESA">Empresa / organización</option></select></label><label>Actividad en AgroBrokerIA<select value={form.role} onChange={e=>update("role",e.target.value)}>{roles.map(([label,value])=><option key={value} value={value}>{label}</option>)}</select></label></div>
        {isCompany?<><h2>Datos de la empresa</h2><div className="auth-field-row auth-field-row-three"><label>Razón social<input value={form.legalName} onChange={e=>update("legalName",e.target.value)} required/></label><label>Nombre comercial<input value={form.tradeName} onChange={e=>update("tradeName",e.target.value)}/></label><label>CUIT<input value={form.companyCuit} onChange={e=>handleCompanyCuitChange(e.target.value)} inputMode="numeric" maxLength={13} placeholder="30-12345678-9" required/></label></div><div className="auth-field-row auth-field-row-three"><label>Matrícula RUCA (opcional)<input value={form.rucaNumber} onChange={e=>update("rucaNumber",e.target.value)}/></label></div></>:<><h2>Identificación</h2><div className="auth-field-row auth-field-row-three"><label>Tipo de documento<select value={form.documentType} onChange={e=>update("documentType",e.target.value)}><option>DNI</option><option>Pasaporte</option><option>Otro</option></select></label><label>DNI / Número de documento<input value={form.documentNumber} onChange={e=>update("documentNumber",e.target.value)} required placeholder="Número de documento"/></label><label>CUIL / CUIT<input value={form.cuilCuit} onChange={e=>handleCuilChange(e.target.value)} placeholder="11 dígitos" inputMode="numeric" maxLength={13} autoComplete="off" required/><small className="auth-legal">Al ingresar los 11 dígitos se consulta automáticamente el padrón ARCA. El DNI por sí solo no permite consultar ese padrón.</small>{lookupStatus!=="success"&&form.cuilCuit.replace(/\D/g,"").length===11&&<button type="button" className="auth-legal" onClick={()=>void buscarDatosOficiales(form.cuilCuit,"persona")} disabled={lookupLoading}>Volver a consultar ARCA</button>}</label></div><h2>Datos personales</h2><div className="auth-field-row auth-field-row-three"><label>Nombre<input value={form.firstName} onChange={e=>update("firstName",e.target.value)} required/></label><label>Segundo nombre<input value={form.middleName} onChange={e=>update("middleName",e.target.value)}/></label><label>Apellido<input value={form.lastName} onChange={e=>update("lastName",e.target.value)} required/></label></div><div className="auth-field-row auth-field-row-three"><label>Fecha de nacimiento<input type="date" value={form.birthDate} onChange={e=>update("birthDate",e.target.value)}/></label><label>Estado civil<select value={form.maritalStatus} onChange={e=>update("maritalStatus",e.target.value)}><option value="">Seleccionar</option><option>Soltero/a</option><option>Casado/a</option><option>Divorciado/a</option><option>Viudo/a</option><option>Unión convivencial</option></select></label></div><div className="auth-field-row auth-field-row-three"><label>Género<select value={form.gender} onChange={e=>update("gender",e.target.value)}><option value="">Seleccionar</option><option>Femenino</option><option>Masculino</option><option>Otro</option><option>Prefiero no indicar</option></select></label><label>Nacionalidad<input value={form.nationality} onChange={e=>update("nationality",e.target.value)}/></label><label>País de nacimiento<input value={form.countryOfBirth} onChange={e=>update("countryOfBirth",e.target.value)}/></label></div></>}
        {isCompany&&<><h2>Representante de la empresa</h2><div className="auth-field-row auth-field-row-three"><label>Nombre y apellido<input value={form.firstName} onChange={e=>update("firstName",e.target.value)} required/></label><label>DNI del representante<input value={form.documentNumber} onChange={e=>update("documentNumber",e.target.value)} required/></label><label>CUIL del representante<input value={form.representativeCuil} onChange={e=>{update("representativeCuil",e.target.value);const digits=e.target.value.replace(/\\D/g,"");if(digits.length===11)void buscarDatosOficiales(digits,"persona")}} required/></label></div></> }
        <h2>Contacto y domicilio</h2><div className="auth-field-row auth-field-row-three"><label>Correo electrónico<input type="email" value={form.email} onChange={e=>update("email",e.target.value)} required/></label><label>Teléfono / celular<input type="tel" value={form.phone} onChange={e=>update("phone",e.target.value)} required/></label><label>Teléfono adicional<input type="tel" value={form.phoneAlt} onChange={e=>update("phoneAlt",e.target.value)}/></label></div><div className="auth-field-row auth-field-row-three"><label>País<input value={form.country} onChange={e=>update("country",e.target.value)}/></label><label>Provincia / Estado<input value={form.province} onChange={e=>update("province",e.target.value)} required/></label><label>Localidad<input value={form.city} onChange={e=>update("city",e.target.value)} required/></label></div><div className="auth-field-row auth-field-row-three"><label>Calle<input value={form.street} onChange={e=>update("street",e.target.value)} required/></label><label>Altura<input value={form.streetNumber} onChange={e=>update("streetNumber",e.target.value)} required/></label><label>Código postal<input value={form.postalCode} onChange={e=>update("postalCode",e.target.value)} required/></label></div><div className="auth-field-row auth-field-row-two"><label>Piso<input value={form.floor} onChange={e=>update("floor",e.target.value)}/></label><label>Departamento<input value={form.apartment} onChange={e=>update("apartment",e.target.value)}/></label></div>
        <h2>Datos laborales e impositivos</h2><div className="auth-field-row auth-field-row-two"><label>Actividad económica<input value={form.economicActivity} onChange={e=>update("economicActivity",e.target.value)} placeholder="Actividad principal"/></label><label>Condición de Ganancias<select value={form.incomeTaxStatus} onChange={e=>update("incomeTaxStatus",e.target.value)}><option value="">Seleccionar</option>{["Inscripto","Monotributo","Exento","No inscripto","No responsable","Extranjero"].map(x=><option key={x}>{x}</option>)}</select></label></div><div className="auth-field-row auth-field-row-two"><label>Condición laboral<select value={form.employmentStatus} onChange={e=>update("employmentStatus",e.target.value)}><option value="">Seleccionar</option>{["Responsable inscripto","Empleado en relación de dependencia","Monotributista","Jubilado","Estudiante","Autónomo","Desempleado"].map(x=><option key={x}>{x}</option>)}</select></label><label>Condición del IVA<select value={form.vatStatus} onChange={e=>update("vatStatus",e.target.value)}><option value="">Seleccionar</option>{["Responsable Inscripto","Monotributo","Consumidor final","Exento","No responsable"].map(x=><option key={x}>{x}</option>)}</select></label></div>
        <h2>Declaraciones juradas</h2>{([["politicallyExposed","¿Es persona expuesta políticamente?"],["obligedSubject","¿Es sujeto obligado?"],["lawfulFunds","¿Los ingresos declarados son de origen lícito?"],["usTaxResident","¿Es residente fiscal de EE.UU. (FATCA)?"]] as const).map(([key,label])=><div className="auth-declaration-row" key={key}><label>{label}<select value={form[key]} onChange={e=>update(key,e.target.value)}><option value="">Seleccionar</option><option value="true">Sí</option><option value="false">No</option></select></label></div>)}
        {isBankRole&&<><h2>Cuenta bancaria para cobrar comisiones</h2><div className="auth-two-col"><label>Banco<input value={form.bankName} onChange={e=>update("bankName",e.target.value)} required/></label><label>Tipo de cuenta<select value={form.accountTypeBank} onChange={e=>update("accountTypeBank",e.target.value)}><option>Caja de ahorro</option><option>Cuenta corriente</option></select></label></div><div className="auth-two-col"><label>Moneda<select value={form.currency} onChange={e=>update("currency",e.target.value)}><option>ARS</option><option>USD</option></select></label><label>Titular de la cuenta<input value={form.accountHolder} onChange={e=>update("accountHolder",e.target.value)} required/></label></div><label>CBU / CVU<input value={form.cbuCvu} onChange={e=>update("cbuCvu",e.target.value)} required/></label><label>Alias (opcional)<input value={form.alias} onChange={e=>update("alias",e.target.value)}/></label></>}
        <h2>{isTransportista?"Documentación para habilitación del transportista":isCompany?"Documentación para verificación empresarial":"Documentación (opcional)"}</h2>{isTransportista?<><p className="auth-legal">Para proteger a compradores y vendedores, todo transportista debe cargar una foto de perfil actual y su DNI. El DNI completo queda privado para el titular y Administración.</p><div className="auth-field-row auth-field-row-three"><label>Foto de perfil del conductor (opcional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setDriverPhoto(e.target.files?.[0]||null)}/></label><label>DNI frente (opcional)<input type="file" accept="image/*,application/pdf" onChange={e=>setDriverDniFront(e.target.files?.[0]||null)}/></label><label>DNI dorso (opcional)<input type="file" accept="image/*,application/pdf" onChange={e=>setDriverDniBack(e.target.files?.[0]||null)}/></label></div></>:<><p className="auth-legal">La creación de cuenta permite acceder a la plataforma. La cuenta se crea sin esperar la revisión documental. Las operaciones que requieran habilitación fiscal o legal quedan pendientes hasta su validación.</p><><label>{isCompany?"DNI del representante · frente (opcional)":"DNI frente"}<input type="file" accept="image/*,.pdf" onChange={e=>setDniFront(e.target.files?.[0]||null)}/></label><label>{isCompany?"DNI del representante · dorso (opcional)":"DNI dorso"}<input type="file" accept="image/*,.pdf" onChange={e=>setDniBack(e.target.files?.[0]||null)}/></label></> {isCompany&&<><label>Cargo del representante (socio gerente, presidente, apoderado, etc.)<input value={form.representativePosition} onChange={e=>update("representativePosition",e.target.value)} required placeholder="Indicar cargo y carácter de representación"/></label><label>Estatuto o contrato social inscripto (PDF/imagen · hasta 10 MB)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setStatuteDoc(e.target.files?.[0]||null)}/></label><label>Poder notarial vigente o última acta de designación de autoridades (PDF/imagen · hasta 10 MB)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setAuthorityDoc(e.target.files?.[0]||null)}/></label><label>Constancia de inscripción ARCA (PDF/imagen · hasta 10 MB)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setArcaProof(e.target.files?.[0]||null)}/></label><label>Constancia o consulta vigente SISA (PDF/imagen · hasta 10 MB)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setSisaProof(e.target.files?.[0]||null)}/></label><p className="auth-legal">Administración revisará manualmente CUIT, razón social, domicilio fiscal, actividad, inscripción societaria, vigencia y facultades del firmante, además de la situación SISA. La carga de documentos no equivale a aprobación ni a validación automática ante ARCA.</p></>}</>}
        <h2>Seguridad</h2><div className="auth-two-col"><label>Contraseña<input type="password" value={form.password} onChange={e=>update("password",e.target.value)} minLength={8} required/></label><label>Confirmar contraseña<input type="password" value={form.confirmPassword} onChange={e=>update("confirmPassword",e.target.value)} minLength={8} required/></label></div>
        <label className="auth-legal-check"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/> Declaro que la información y los fondos son lícitos; acepto la exclusividad de operatorias formales, los <Link href="/terminos">Términos y Condiciones</Link> y la Política de Privacidad. Entiendo que mi aceptación queda registrada con fecha, versión y huella digital.</label>
        <button className="auth-submit" type="submit" disabled={loading||!accepted}>{loading?"Creando cuenta...":"Crear cuenta y comenzar a operar"}</button>
      </form>
      <p className="auth-switch">¿Ya tenés cuenta? <Link href="/login">Ingresá aquí</Link></p>
    </div></section>
  </main>;
}
