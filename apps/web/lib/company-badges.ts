export type CompanyBadge = { label: string; color: string; background: string; border: string; verified: boolean };

const BADGES: Record<string,{label:string;color:string;background:string;border:string}> = {
  ACOPIO:{label:"Acopio",color:"#15803D",background:"#DCFCE7",border:"#86EFAC"},
  COOPERATIVA:{label:"Cooperativa",color:"#15803D",background:"#DCFCE7",border:"#86EFAC"},
  INTERMEDIARIO:{label:"Intermediario",color:"#C2410C",background:"#FFEDD5",border:"#FDBA74"},
  BROKER:{label:"Corredor",color:"#1D4ED8",background:"#DBEAFE",border:"#93C5FD"},
  CORREDOR:{label:"Corredor",color:"#1D4ED8",background:"#DBEAFE",border:"#93C5FD"},
  PRODUCTOR:{label:"Productor",color:"#A16207",background:"#FEF9C3",border:"#FDE047"},
  COMPRADOR:{label:"Comprador",color:"#A16207",background:"#FEF9C3",border:"#FDE047"},
  EXPORTADOR:{label:"Exportador",color:"#6D28D9",background:"#EDE9FE",border:"#C4B5FD"},
  INDUSTRIA:{label:"Industria",color:"#6D28D9",background:"#EDE9FE",border:"#C4B5FD"},
  MOLINO:{label:"Molino",color:"#6D28D9",background:"#EDE9FE",border:"#C4B5FD"},
  LOGISTICA:{label:"Logística",color:"#334155",background:"#F1F5F9",border:"#CBD5E1"},
  LABORATORIO:{label:"Laboratorio",color:"#334155",background:"#F1F5F9",border:"#CBD5E1"},
};
export function getCompanyBadge(tipo:string|null|undefined, verified:boolean):CompanyBadge{
 const b=BADGES[String(tipo||"").toUpperCase()]||{label:tipo||"Empresa",color:"#475569",background:"#F1F5F9",border:"#CBD5E1"};
 return {...b,verified};
}
