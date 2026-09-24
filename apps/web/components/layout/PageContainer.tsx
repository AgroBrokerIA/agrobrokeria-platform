import { ReactNode } from "react";
export default function PageContainer({children}:{children:ReactNode}){return <div className="page-shell"><main>{children}</main></div>}