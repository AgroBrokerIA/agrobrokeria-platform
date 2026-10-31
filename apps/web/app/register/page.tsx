"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const roles = [["Comprador","comprador"],["Vendedor","vendedor"],["Corredor","corredor"],["Exportador","exportador"],["Acopio","acopio"],["Cooperativa","cooperativa"],["Industria","industria"],["Intermediario","intermediario"],["Comisionista","comisionista"],["Productor","productor"]];
const bankRoles = ["corredor","intermediario","comisionista"];
const initial = {
  accountType:"PERSONA", role:"comprador", documentType:"DNI", documentNumber:"", cuilCuit:"",
  firstName:"", middleName:"", lastName:"", birthDate:"", gender:"", nationality:"Argentina", countryOfBirth:"Argentina", maritalStatus:"",
  legalName:"", tradeName:"", rucaNumber:"", email:"", phone:"", phoneAlt:"",
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
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [dniFront,setDniFront] = useState<File|null>(null);
  const [dniBack,setDniBack] = useState<File|null>(null);
  const [companyDocs,setCompanyDocs] = useState<File[]>([]);
  const isBankRole = bankRoles.includes(form.role);
  const isCompany = form.accountType === "EMPRESA";
  const update = (key:keyof FormState,value:string) => setForm(p=>({...p,[key]:value}));
  const normalize = (value:string) => value.trim().toLocaleUpperCase("es-AR");
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
    if(!form.documentNumber.trim()||!form.cuilCuit.trim()||!form.email.trim()||!form.phone.trim()){setError("Completá DNI, CUIL/CUIT, correo y teléfono.");return;}
    if(isCompany && (!form.legalName.trim()||!form.cuilCuit.trim())){setError("Para registrar una empresa se requiere razón social y CUIT.");return;}
    if(isBankRole && (!form.bankName||!form.accountHolder.trim()||!form.cbuCvu.trim())){setError("Para corredores, intermediarios y comisionistas, completá los datos bancarios para cobrar comisiones.");return;}
    setLoading(true);
    try {
      const {data,error:authError}=await supabase.auth.signUp({
        email:form.email.trim(),password:form.password,
        options:{data:{nombre:normalize([form.firstName,form.middleName,form.lastName].filter(Boolean).join(" ")),empresa:isCompany?normalize(form.legalName):"",tipo_usuario:form.role,account_type:form.accountType,legal_accepted:true}}
      });
      if(authError) throw authError;
      if(!data.user) throw new Error("No se pudo crear el usuario.");
      const draft:Record<string,unknown> = {
        user_id:data.user.id,account_type:form.accountType,role:form.role,document_type:form.documentType,document_number:form.documentNumber.replace(/\D/g,""),
        cuil_cuit:form.cuilCuit.replace(/\D/g,""),first_name:normalize(form.firstName),middle_name:normalize(form.middleName),last_name:normalize(form.lastName),
        birth_date:form.birthDate||null,gender:form.gender||null,nationality:form.nationality,country_of_birth:form.countryOfBirth,marital_status:form.maritalStatus||null,
        legal_name:isCompany?normalize(form.legalName):null,trade_name:normalize(form.tradeName)||null,ruca_number:form.rucaNumber.trim()||null,
        email:form.email.trim().toLowerCase(),phone:form.phone.trim(),phone_alt:form.phoneAlt.trim()||null,country:form.country,province:normalize(form.province),city:normalize(form.city),
        street:normalize(form.street),street_number:form.streetNumber.trim(),floor:form.floor.trim()||null,apartment:form.apartment.trim()||null,postal_code:form.postalCode.trim(),
        economic_activity:form.economicActivity||null,income_tax_status:form.incomeTaxStatus||null,vat_status:form.vatStatus||null,employment_status:form.employmentStatus||null,
        politically_exposed:form.politicallyExposed==="true",obliged_subject:form.obligedSubject==="true",lawful_funds:form.lawfulFunds==="true",us_tax_resident:form.usTaxResident==="true",
        terms_accepted_at:new Date().toISOString(),registration_completed:true,review_status:"NO_VERIFICADO",is_verified:false
      };
      if(data.session){
        const {error:saveError}=await supabase.from("account_onboarding").upsert(draft);
        if(saveError) throw saveError;
        if(isBankRole){
          const {error:bankError}=await supabase.from("user_bank_accounts").insert({user_id:data.user.id,bank_name:form.bankName,account_type:form.accountTypeBank,currency:form.currency,account_holder:normalize(form.accountHolder),cbu_cvu:form.cbuCvu.replace(/\s/g,""),alias:form.alias.trim()||null});
          if(bankError) throw bankError;
        }
        if(dniFront) await upload(data.user.id,dniFront,"DNI_FRENTE");
        if(dniBack) await upload(data.user.id,dniBack,"DNI_DORSO");
        for(const file of companyDocs) await upload(data.user.id,file,"DOCUMENTACION_EMPRESA");
        router.replace("/dashboard"); router.refresh(); return;
      }
      setMessage("La cuenta fue creada. Confirmá tu correo e ingresá para continuar. La documentación es opcional y no bloquea el acceso. Si tu proveedor exige confirmar el correo, los datos detallados deberán completarse en tu perfil al ingresar.");
    } catch(err) { setError(err instanceof Error?err.message:"No se pudo completar el registro."); }
    finally { setLoading(false); }
  }

  return <main className="auth-page auth-register">
    <div className="auth-art"><Link href="/" className="auth-brand"><span>↗</span><strong>AgroBroker IA</strong></Link><div className="auth-art-copy"><span>CREÁ TU CUENTA</span><h1>Entrá al mercado<br/>agrocomercial.</h1><p>Registrate y empezá a operar. La verificación documental es voluntaria para acceder al sistema.</p></div><div className="auth-art-grain" aria-hidden="true"/></div>
    <section className="auth-panel"><div className="auth-card auth-register-card">
      <div className="auth-logo">↗</div><h1>Crear cuenta</h1><p>Completá tus datos principales para ingresar a AgroBrokerIA.</p>
      {error&&<div className="auth-error" role="alert">{error}</div>}{message&&<div className="auth-success" role="status">{message}<p><Link href="/login">Ir a iniciar sesión</Link></p></div>}
      <form onSubmit={registrarse}>
        <h2>Tipo de cuenta</h2>
        <div className="auth-two-col"><label>Tipo de registro<select value={form.accountType} onChange={e=>update("accountType",e.target.value)}><option value="PERSONA">Persona física</option><option value="EMPRESA">Empresa / organización</option></select></label><label>Actividad en AgroBrokerIA<select value={form.role} onChange={e=>update("role",e.target.value)}>{roles.map(([label,value])=><option key={value} value={value}>{label}</option>)}</select></label></div>
        {isCompany?<><h2>Datos de la empresa</h2><label>Razón social<input value={form.legalName} onChange={e=>update("legalName",e.target.value)} required/></label><div className="auth-two-col"><label>Nombre comercial<input value={form.tradeName} onChange={e=>update("tradeName",e.target.value)}/></label><label>CUIT<input value={form.cuilCuit} onChange={e=>update("cuilCuit",e.target.value)} placeholder="30-12345678-9" required/></label></div><label>Matrícula RUCA (opcional)<input value={form.rucaNumber} onChange={e=>update("rucaNumber",e.target.value)}/></label></>:<><h2>Datos personales</h2><div className="auth-two-col"><label>Nombre<input value={form.firstName} onChange={e=>update("firstName",e.target.value)} required/></label><label>Segundo nombre<input value={form.middleName} onChange={e=>update("middleName",e.target.value)}/></label></div><div className="auth-two-col"><label>Apellido<input value={form.lastName} onChange={e=>update("lastName",e.target.value)} required/></label><label>Tipo de documento<select value={form.documentType} onChange={e=>update("documentType",e.target.value)}><option>DNI</option><option>Pasaporte</option><option>Otro</option></select></label></div><div className="auth-two-col"><label>Número de documento<input value={form.documentNumber} onChange={e=>update("documentNumber",e.target.value)} required/></label><label>CUIL / CUIT<input value={form.cuilCuit} onChange={e=>update("cuilCuit",e.target.value)} required/></label></div><div className="auth-two-col"><label>Fecha de nacimiento<input type="date" value={form.birthDate} onChange={e=>update("birthDate",e.target.value)}/></label><label>Género<select value={form.gender} onChange={e=>update("gender",e.target.value)}><option value="">Seleccionar</option><option>Femenino</option><option>Masculino</option><option>Otro</option><option>Prefiero no indicar</option></select></label></div><div className="auth-two-col"><label>Nacionalidad<input value={form.nationality} onChange={e=>update("nationality",e.target.value)}/></label><label>País de nacimiento<input value={form.countryOfBirth} onChange={e=>update("countryOfBirth",e.target.value)}/></label></div><label>Estado civil<select value={form.maritalStatus} onChange={e=>update("maritalStatus",e.target.value)}><option value="">Seleccionar</option><option>Soltero/a</option><option>Casado/a</option><option>Divorciado/a</option><option>Viudo/a</option><option>Unión convivencial</option></select></label></>}
        {isCompany&&<><h2>Representante de la empresa</h2><div className="auth-two-col"><label>Nombre y apellido<input value={form.firstName} onChange={e=>update("firstName",e.target.value)} required/></label><label>DNI del representante<input value={form.documentNumber} onChange={e=>update("documentNumber",e.target.value)} required/></label></div><label>CUIL del representante<input value={form.cuilCuit} onChange={e=>update("cuilCuit",e.target.value)} required/></label></>}
        <h2>Contacto y domicilio</h2><label>Correo electrónico<input type="email" value={form.email} onChange={e=>update("email",e.target.value)} required/></label><div className="auth-two-col"><label>Teléfono / celular<input type="tel" value={form.phone} onChange={e=>update("phone",e.target.value)} required/></label><label>Teléfono adicional<input type="tel" value={form.phoneAlt} onChange={e=>update("phoneAlt",e.target.value)}/></label></div><div className="auth-two-col"><label>País<input value={form.country} onChange={e=>update("country",e.target.value)}/></label><label>Provincia / Estado<input value={form.province} onChange={e=>update("province",e.target.value)} required/></label></div><div className="auth-two-col"><label>Localidad<input value={form.city} onChange={e=>update("city",e.target.value)} required/></label><label>Código postal<input value={form.postalCode} onChange={e=>update("postalCode",e.target.value)} required/></label></div><div className="auth-two-col"><label>Calle<input value={form.street} onChange={e=>update("street",e.target.value)} required/></label><label>Altura<input value={form.streetNumber} onChange={e=>update("streetNumber",e.target.value)} required/></label></div><div className="auth-two-col"><label>Piso<input value={form.floor} onChange={e=>update("floor",e.target.value)}/></label><label>Departamento<input value={form.apartment} onChange={e=>update("apartment",e.target.value)}/></label></div>
        <h2>Datos laborales e impositivos</h2><label>Actividad económica<input value={form.economicActivity} onChange={e=>update("economicActivity",e.target.value)} placeholder="Actividad principal"/></label><div className="auth-two-col"><label>Condición de Ganancias<select value={form.incomeTaxStatus} onChange={e=>update("incomeTaxStatus",e.target.value)}><option value="">Seleccionar</option>{["Inscripto","Monotributo","Exento","No inscripto","No responsable","Extranjero"].map(x=><option key={x}>{x}</option>)}</select></label><label>Condición IVA<select value={form.vatStatus} onChange={e=>update("vatStatus",e.target.value)}><option value="">Seleccionar</option>{["Responsable Inscripto","Monotributo","Consumidor final","Exento","No responsable"].map(x=><option key={x}>{x}</option>)}</select></label></div><label>Condición laboral<select value={form.employmentStatus} onChange={e=>update("employmentStatus",e.target.value)}><option value="">Seleccionar</option>{["Responsable inscripto","Empleado en relación de dependencia","Monotributista","Jubilado","Estudiante","Autónomo","Desempleado"].map(x=><option key={x}>{x}</option>)}</select></label>
        <h2>Declaraciones juradas</h2>{([["politicallyExposed","¿Es persona expuesta políticamente?"],["obligedSubject","¿Es sujeto obligado?"],["lawfulFunds","¿Los ingresos declarados son de origen lícito?"],["usTaxResident","¿Es residente fiscal de EE.UU. (FATCA)?"]] as const).map(([key,label])=><div className="auth-two-col" key={key}><label>{label}<select value={form[key]} onChange={e=>update(key,e.target.value)}><option value="">Seleccionar</option><option value="true">Sí</option><option value="false">No</option></select></label></div>)}
        {isBankRole&&<><h2>Cuenta bancaria para cobrar comisiones</h2><div className="auth-two-col"><label>Banco<input value={form.bankName} onChange={e=>update("bankName",e.target.value)} required/></label><label>Tipo de cuenta<select value={form.accountTypeBank} onChange={e=>update("accountTypeBank",e.target.value)}><option>Caja de ahorro</option><option>Cuenta corriente</option></select></label></div><div className="auth-two-col"><label>Moneda<select value={form.currency} onChange={e=>update("currency",e.target.value)}><option>ARS</option><option>USD</option></select></label><label>Titular de la cuenta<input value={form.accountHolder} onChange={e=>update("accountHolder",e.target.value)} required/></label></div><label>CBU / CVU<input value={form.cbuCvu} onChange={e=>update("cbuCvu",e.target.value)} required/></label><label>Alias (opcional)<input value={form.alias} onChange={e=>update("alias",e.target.value)}/></label></>}
        <h2>Documentación (opcional)</h2><p className="auth-legal">Podés registrarte y operar aunque no cargues documentos. Sin documentación aprobada no se otorga la insignia de verificado.</p>{!isCompany&&<><label>DNI frente<input type="file" accept="image/*,.pdf" onChange={e=>setDniFront(e.target.files?.[0]||null)}/></label><label>DNI dorso<input type="file" accept="image/*,.pdf" onChange={e=>setDniBack(e.target.files?.[0]||null)}/></label></>} {isCompany&&<label>Documentación de la empresa<input type="file" accept="image/*,.pdf" multiple onChange={e=>setCompanyDocs(Array.from(e.target.files||[]))}/></label>}
        <h2>Seguridad</h2><div className="auth-two-col"><label>Contraseña<input type="password" value={form.password} onChange={e=>update("password",e.target.value)} minLength={8} required/></label><label>Confirmar contraseña<input type="password" value={form.confirmPassword} onChange={e=>update("confirmPassword",e.target.value)} minLength={8} required/></label></div>
        <label className="auth-legal-check"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> Acepto los <Link href="/terminos">Términos y Condiciones</Link> y la Política de Privacidad.</label>
        <button className="auth-submit" type="submit" disabled={loading||!accepted}>{loading?"Creando cuenta...":"Crear cuenta y comenzar a operar"}</button>
      </form>
      <p className="auth-switch">¿Ya tenés cuenta? <Link href="/login">Ingresá aquí</Link></p>
    </div></section>
  </main>;
}
