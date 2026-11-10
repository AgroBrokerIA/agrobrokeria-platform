export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      account_onboarding: {
        Row: {
          account_type: string
          actividad_agro_validada: boolean
          apartment: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          country_of_birth: string | null
          created_at: string
          cuil_cuit: string | null
          document_number: string | null
          document_type: string | null
          economic_activity: string | null
          email: string | null
          employment_status: string | null
          first_name: string | null
          floor: string | null
          gender: string | null
          income_tax_status: string | null
          is_verified: boolean
          last_name: string | null
          lawful_funds: boolean | null
          legal_name: string | null
          marital_status: string | null
          middle_name: string | null
          nationality: string | null
          obliged_subject: boolean | null
          phone: string | null
          phone_alt: string | null
          politically_exposed: boolean | null
          postal_code: string | null
          province: string | null
          registration_completed: boolean
          representative_cuil: string | null
          representative_position: string | null
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          role: string
          ruca_number: string | null
          sisa_categoria: string | null
          sisa_status: string
          street: string | null
          street_number: string | null
          terms_accepted_at: string | null
          tipo_operador: string | null
          trade_name: string | null
          updated_at: string
          us_tax_resident: boolean | null
          user_id: string
          vat_status: string | null
        }
        Insert: {
          account_type?: string
          actividad_agro_validada?: boolean
          apartment?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          country_of_birth?: string | null
          created_at?: string
          cuil_cuit?: string | null
          document_number?: string | null
          document_type?: string | null
          economic_activity?: string | null
          email?: string | null
          employment_status?: string | null
          first_name?: string | null
          floor?: string | null
          gender?: string | null
          income_tax_status?: string | null
          is_verified?: boolean
          last_name?: string | null
          lawful_funds?: boolean | null
          legal_name?: string | null
          marital_status?: string | null
          middle_name?: string | null
          nationality?: string | null
          obliged_subject?: boolean | null
          phone?: string | null
          phone_alt?: string | null
          politically_exposed?: boolean | null
          postal_code?: string | null
          province?: string | null
          registration_completed?: boolean
          representative_cuil?: string | null
          representative_position?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          ruca_number?: string | null
          sisa_categoria?: string | null
          sisa_status?: string
          street?: string | null
          street_number?: string | null
          terms_accepted_at?: string | null
          tipo_operador?: string | null
          trade_name?: string | null
          updated_at?: string
          us_tax_resident?: boolean | null
          user_id: string
          vat_status?: string | null
        }
        Update: {
          account_type?: string
          actividad_agro_validada?: boolean
          apartment?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          country_of_birth?: string | null
          created_at?: string
          cuil_cuit?: string | null
          document_number?: string | null
          document_type?: string | null
          economic_activity?: string | null
          email?: string | null
          employment_status?: string | null
          first_name?: string | null
          floor?: string | null
          gender?: string | null
          income_tax_status?: string | null
          is_verified?: boolean
          last_name?: string | null
          lawful_funds?: boolean | null
          legal_name?: string | null
          marital_status?: string | null
          middle_name?: string | null
          nationality?: string | null
          obliged_subject?: boolean | null
          phone?: string | null
          phone_alt?: string | null
          politically_exposed?: boolean | null
          postal_code?: string | null
          province?: string | null
          registration_completed?: boolean
          representative_cuil?: string | null
          representative_position?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          ruca_number?: string | null
          sisa_categoria?: string | null
          sisa_status?: string
          street?: string | null
          street_number?: string | null
          terms_accepted_at?: string | null
          tipo_operador?: string | null
          trade_name?: string | null
          updated_at?: string
          us_tax_resident?: boolean | null
          user_id?: string
          vat_status?: string | null
        }
        Relationships: []
      }
      account_onboarding_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      aceptaciones_legales: {
        Row: {
          aceptado_at: string
          company_id: string | null
          documento_legal_id: string
          hash_sha256: string
          id: string
          ip: string | null
          profile_id: string
          user_agent: string | null
          version: string
        }
        Insert: {
          aceptado_at?: string
          company_id?: string | null
          documento_legal_id: string
          hash_sha256: string
          id?: string
          ip?: string | null
          profile_id: string
          user_agent?: string | null
          version: string
        }
        Update: {
          aceptado_at?: string
          company_id?: string | null
          documento_legal_id?: string
          hash_sha256?: string
          id?: string
          ip?: string | null
          profile_id?: string
          user_agent?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "aceptaciones_legales_documento_legal_id_fkey"
            columns: ["documento_legal_id"]
            isOneToOne: false
            referencedRelation: "documentos_legales"
            referencedColumns: ["id"]
          },
        ]
      }
      acuerdos: {
        Row: {
          aceptado: boolean | null
          creado_en: string | null
          descripcion: string | null
          fecha_acuerdo: string | null
          id: string
          operacion_id: string
        }
        Insert: {
          aceptado?: boolean | null
          creado_en?: string | null
          descripcion?: string | null
          fecha_acuerdo?: string | null
          id?: string
          operacion_id: string
        }
        Update: {
          aceptado?: boolean | null
          creado_en?: string | null
          descripcion?: string | null
          fecha_acuerdo?: string | null
          id?: string
          operacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acuerdos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      acuerdos_comerciales: {
        Row: {
          calidad: string | null
          condicion_entrega: string | null
          confirmado_at: string | null
          created_at: string
          destino: string | null
          estado: string
          flete: string | null
          forma_pago: string | null
          id: string
          lugar_carga: string | null
          observaciones: string | null
          operacion_id: string
          plazo_pago: string | null
          updated_at: string
        }
        Insert: {
          calidad?: string | null
          condicion_entrega?: string | null
          confirmado_at?: string | null
          created_at?: string
          destino?: string | null
          estado?: string
          flete?: string | null
          forma_pago?: string | null
          id?: string
          lugar_carga?: string | null
          observaciones?: string | null
          operacion_id: string
          plazo_pago?: string | null
          updated_at?: string
        }
        Update: {
          calidad?: string | null
          condicion_entrega?: string | null
          confirmado_at?: string | null
          created_at?: string
          destino?: string | null
          estado?: string
          flete?: string | null
          forma_pago?: string | null
          id?: string
          lugar_carga?: string | null
          observaciones?: string | null
          operacion_id?: string
          plazo_pago?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acuerdos_comerciales_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: true
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      adelantos_financieros: {
        Row: {
          actualizado_at: string
          comprobante_storage_path: string | null
          creado_at: string
          desembolsado_at: string | null
          entidad_financiera_cuit: string
          entidad_financiera_nombre: string | null
          estado: string
          id: string
          idempotency_key: string
          kilos_descargados_confirmados: number
          metadata_entidad: Json
          monto_bruto_adelanto_ars: number
          monto_neto_estimado_ars: number
          motivo_rechazo: string | null
          operacion_id: string
          porcentaje_adelanto: number
          productor_empresa_id: string
          referencia_entidad: string | null
          revisado_por: string | null
          solicitado_por: string
          tasa_estructuracion_pct: number | null
          valor_bruto_lote_ars: number
          viaje_id: string
        }
        Insert: {
          actualizado_at?: string
          comprobante_storage_path?: string | null
          creado_at?: string
          desembolsado_at?: string | null
          entidad_financiera_cuit: string
          entidad_financiera_nombre?: string | null
          estado?: string
          id?: string
          idempotency_key?: string
          kilos_descargados_confirmados: number
          metadata_entidad?: Json
          monto_bruto_adelanto_ars: number
          monto_neto_estimado_ars: number
          motivo_rechazo?: string | null
          operacion_id: string
          porcentaje_adelanto?: number
          productor_empresa_id: string
          referencia_entidad?: string | null
          revisado_por?: string | null
          solicitado_por: string
          tasa_estructuracion_pct?: number | null
          valor_bruto_lote_ars: number
          viaje_id: string
        }
        Update: {
          actualizado_at?: string
          comprobante_storage_path?: string | null
          creado_at?: string
          desembolsado_at?: string | null
          entidad_financiera_cuit?: string
          entidad_financiera_nombre?: string | null
          estado?: string
          id?: string
          idempotency_key?: string
          kilos_descargados_confirmados?: number
          metadata_entidad?: Json
          monto_bruto_adelanto_ars?: number
          monto_neto_estimado_ars?: number
          motivo_rechazo?: string | null
          operacion_id?: string
          porcentaje_adelanto?: number
          productor_empresa_id?: string
          referencia_entidad?: string | null
          revisado_por?: string | null
          solicitado_por?: string
          tasa_estructuracion_pct?: number | null
          valor_bruto_lote_ars?: number
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adelantos_financieros_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adelantos_financieros_productor_empresa_id_fkey"
            columns: ["productor_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adelantos_financieros_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      adjuntos_chat: {
        Row: {
          creado_en: string | null
          id: string
          mensaje_id: string
          nombre_archivo: string | null
          tipo_archivo: string | null
          url_archivo: string | null
        }
        Insert: {
          creado_en?: string | null
          id?: string
          mensaje_id: string
          nombre_archivo?: string | null
          tipo_archivo?: string | null
          url_archivo?: string | null
        }
        Update: {
          creado_en?: string | null
          id?: string
          mensaje_id?: string
          nombre_archivo?: string | null
          tipo_archivo?: string | null
          url_archivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adjuntos_chat_mensaje_id_fkey"
            columns: ["mensaje_id"]
            isOneToOne: false
            referencedRelation: "mensajes"
            referencedColumns: ["id"]
          },
        ]
      }
      adobe_sign_oauth_states: {
        Row: {
          company_id: string | null
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string
          user_id?: string
        }
        Relationships: []
      }
      adobe_sign_oauth_tokens: {
        Row: {
          access_token: string
          api_access_point: string
          company_id: string | null
          connected_at: string
          expires_at: string
          id: string
          provider: string
          refresh_token: string
          revoked_at: string | null
          scopes: string[]
          token_type: string
          updated_at: string
          user_id: string | null
          web_access_point: string | null
        }
        Insert: {
          access_token: string
          api_access_point: string
          company_id?: string | null
          connected_at?: string
          expires_at: string
          id?: string
          provider?: string
          refresh_token: string
          revoked_at?: string | null
          scopes?: string[]
          token_type?: string
          updated_at?: string
          user_id?: string | null
          web_access_point?: string | null
        }
        Update: {
          access_token?: string
          api_access_point?: string
          company_id?: string | null
          connected_at?: string
          expires_at?: string
          id?: string
          provider?: string
          refresh_token?: string
          revoked_at?: string | null
          scopes?: string[]
          token_type?: string
          updated_at?: string
          user_id?: string | null
          web_access_point?: string | null
        }
        Relationships: []
      }
      ai_opportunities: {
        Row: {
          buyer_company_id: string | null
          company_id: string | null
          confidence: number | null
          created_at: string | null
          description: string | null
          detected_at: string | null
          estimated_margin: number | null
          estimated_volume: number | null
          expires_at: string | null
          id: string
          offer_id: string | null
          opportunity_type: string
          reasoning: Json | null
          score: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          buyer_company_id?: string | null
          company_id?: string | null
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          detected_at?: string | null
          estimated_margin?: number | null
          estimated_volume?: number | null
          expires_at?: string | null
          id?: string
          offer_id?: string | null
          opportunity_type: string
          reasoning?: Json | null
          score?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          buyer_company_id?: string | null
          company_id?: string | null
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          detected_at?: string | null
          estimated_margin?: number | null
          estimated_volume?: number | null
          expires_at?: string | null
          id?: string
          offer_id?: string | null
          opportunity_type?: string
          reasoning?: Json | null
          score?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_opportunities_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_ia: {
        Row: {
          creada_en: string | null
          cuenta_id: string
          descripcion: string | null
          id: string
          leida: boolean | null
          tipo: string | null
          titulo: string | null
        }
        Insert: {
          creada_en?: string | null
          cuenta_id: string
          descripcion?: string | null
          id?: string
          leida?: boolean | null
          tipo?: string | null
          titulo?: string | null
        }
        Update: {
          creada_en?: string | null
          cuenta_id?: string
          descripcion?: string | null
          id?: string
          leida?: boolean | null
          tipo?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_ia_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_oportunidad_emitidas: {
        Row: {
          emitida_en: string
          profile_id: string
          publicacion_compra_id: string
          publicacion_venta_id: string
        }
        Insert: {
          emitida_en?: string
          profile_id: string
          publicacion_compra_id: string
          publicacion_venta_id: string
        }
        Update: {
          emitida_en?: string
          profile_id?: string
          publicacion_compra_id?: string
          publicacion_venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_oportunidad_emitidas_publicacion_compra_id_fkey"
            columns: ["publicacion_compra_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_oportunidad_emitidas_publicacion_compra_id_fkey"
            columns: ["publicacion_compra_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_oportunidad_emitidas_publicacion_venta_id_fkey"
            columns: ["publicacion_venta_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_oportunidad_emitidas_publicacion_venta_id_fkey"
            columns: ["publicacion_venta_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
        ]
      }
      arca_company_config: {
        Row: {
          cert_homologacion_secret_name: string
          cert_secret_name: string
          company_id: string
          created_at: string
          cuit_secret_name: string | null
          enabled: boolean
          environment: string
          id: string
          private_key_homologacion_secret_name: string
          private_key_secret_name: string
          production_enabled: boolean
          punto_venta: number
          updated_at: string
        }
        Insert: {
          cert_homologacion_secret_name?: string
          cert_secret_name: string
          company_id: string
          created_at?: string
          cuit_secret_name?: string | null
          enabled?: boolean
          environment?: string
          id?: string
          private_key_homologacion_secret_name?: string
          private_key_secret_name: string
          production_enabled?: boolean
          punto_venta: number
          updated_at?: string
        }
        Update: {
          cert_homologacion_secret_name?: string
          cert_secret_name?: string
          company_id?: string
          created_at?: string
          cuit_secret_name?: string | null
          enabled?: boolean
          environment?: string
          id?: string
          private_key_homologacion_secret_name?: string
          private_key_secret_name?: string
          production_enabled?: boolean
          punto_venta?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arca_company_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      arca_tickets_acceso: {
        Row: {
          ambiente: string
          cuit: string
          expiration_time: string
          id: string
          servicio: string
          sign: string
          token: string
          updated_at: string
        }
        Insert: {
          ambiente: string
          cuit: string
          expiration_time: string
          id?: string
          servicio: string
          sign: string
          token: string
          updated_at?: string
        }
        Update: {
          ambiente?: string
          cuit?: string
          expiration_time?: string
          id?: string
          servicio?: string
          sign?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      auditoria: {
        Row: {
          accion: string | null
          creado_en: string | null
          cuenta_id: string | null
          descripcion: string | null
          dispositivo: string | null
          id: string
          ip: string | null
          registro_id: string | null
          tabla: string | null
        }
        Insert: {
          accion?: string | null
          creado_en?: string | null
          cuenta_id?: string | null
          descripcion?: string | null
          dispositivo?: string | null
          id?: string
          ip?: string | null
          registro_id?: string | null
          tabla?: string | null
        }
        Update: {
          accion?: string | null
          creado_en?: string | null
          cuenta_id?: string | null
          descripcion?: string | null
          dispositivo?: string | null
          id?: string
          ip?: string | null
          registro_id?: string | null
          tabla?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      ayuda_articulos: {
        Row: {
          activo: boolean
          actualizado_en: string
          categoria: string
          contenido: string
          id: string
          slug: string
          titulo: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          categoria: string
          contenido: string
          id?: string
          slug: string
          titulo: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          categoria?: string
          contenido?: string
          id?: string
          slug?: string
          titulo?: string
        }
        Relationships: []
      }
      billeteras_comisiones: {
        Row: {
          empresa_id: string
          id: string
          moneda_id: number
          saldo_disponible: number
          saldo_en_retiro: number
          saldo_pendiente: number
          saldo_retirado: number
          updated_at: string
        }
        Insert: {
          empresa_id: string
          id?: string
          moneda_id: number
          saldo_disponible?: number
          saldo_en_retiro?: number
          saldo_pendiente?: number
          saldo_retirado?: number
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          id?: string
          moneda_id?: number
          saldo_disponible?: number
          saldo_en_retiro?: number
          saldo_pendiente?: number
          saldo_retirado?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billeteras_comisiones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billeteras_comisiones_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
        ]
      }
      billeteras_comisiones_movimientos: {
        Row: {
          billetera_id: string
          created_at: string
          empresa_id: string
          estado: string
          id: string
          importe: number
          metadata: Json
          moneda_id: number
          operacion_comision_id: string | null
          operacion_id: string | null
          profile_id: string | null
          proveedor_pago: string | null
          referencia_externa: string | null
          referencia_interna: string | null
          signo: number
          tipo: string
        }
        Insert: {
          billetera_id: string
          created_at?: string
          empresa_id: string
          estado?: string
          id?: string
          importe: number
          metadata?: Json
          moneda_id: number
          operacion_comision_id?: string | null
          operacion_id?: string | null
          profile_id?: string | null
          proveedor_pago?: string | null
          referencia_externa?: string | null
          referencia_interna?: string | null
          signo: number
          tipo: string
        }
        Update: {
          billetera_id?: string
          created_at?: string
          empresa_id?: string
          estado?: string
          id?: string
          importe?: number
          metadata?: Json
          moneda_id?: number
          operacion_comision_id?: string | null
          operacion_id?: string | null
          profile_id?: string | null
          proveedor_pago?: string | null
          referencia_externa?: string | null
          referencia_interna?: string | null
          signo?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "billeteras_comisiones_movimientos_billetera_id_fkey"
            columns: ["billetera_id"]
            isOneToOne: false
            referencedRelation: "billeteras_comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billeteras_comisiones_movimientos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billeteras_comisiones_movimientos_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billeteras_comisiones_movimientos_operacion_comision_id_fkey"
            columns: ["operacion_comision_id"]
            isOneToOne: false
            referencedRelation: "operacion_comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billeteras_comisiones_movimientos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billeteras_comisiones_movimientos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campanas_prospeccion: {
        Row: {
          created_at: string
          created_by: string | null
          estado: string
          ia_enabled: boolean
          id: string
          localidad: string | null
          nombre: string
          objetivo: string
          producto: string | null
          provincia: string | null
          puerto: string | null
          requiere_revision_humana: boolean
          tipo_prospecto: string | null
          updated_at: string
          volumen_max_tn: number | null
          volumen_min_tn: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estado?: string
          ia_enabled?: boolean
          id?: string
          localidad?: string | null
          nombre: string
          objetivo: string
          producto?: string | null
          provincia?: string | null
          puerto?: string | null
          requiere_revision_humana?: boolean
          tipo_prospecto?: string | null
          updated_at?: string
          volumen_max_tn?: number | null
          volumen_min_tn?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estado?: string
          ia_enabled?: boolean
          id?: string
          localidad?: string | null
          nombre?: string
          objetivo?: string
          producto?: string | null
          provincia?: string | null
          puerto?: string | null
          requiere_revision_humana?: boolean
          tipo_prospecto?: string | null
          updated_at?: string
          volumen_max_tn?: number | null
          volumen_min_tn?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campanas_prospeccion_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cancelaciones_contrato: {
        Row: {
          contrato_id: string | null
          created_at: string
          devolucion_estado: string
          estado_revision: string
          evidencia_url: string | null
          id: string
          importe_comision_considerado: number
          importe_comision_devuelto: number
          justificativo: string
          moneda_id: number | null
          motivo: string
          observaciones_revision: string | null
          operacion_id: string
          revisada_at: string | null
          revisada_por: string | null
          solicitada_por: string
          updated_at: string
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          devolucion_estado?: string
          estado_revision?: string
          evidencia_url?: string | null
          id?: string
          importe_comision_considerado?: number
          importe_comision_devuelto?: number
          justificativo: string
          moneda_id?: number | null
          motivo: string
          observaciones_revision?: string | null
          operacion_id: string
          revisada_at?: string | null
          revisada_por?: string | null
          solicitada_por: string
          updated_at?: string
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          devolucion_estado?: string
          estado_revision?: string
          evidencia_url?: string | null
          id?: string
          importe_comision_considerado?: number
          importe_comision_devuelto?: number
          justificativo?: string
          moneda_id?: number | null
          motivo?: string
          observaciones_revision?: string | null
          operacion_id?: string
          revisada_at?: string | null
          revisada_por?: string | null
          solicitada_por?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancelaciones_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancelaciones_contrato_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancelaciones_contrato_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancelaciones_contrato_revisada_por_fkey"
            columns: ["revisada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancelaciones_contrato_solicitada_por_fkey"
            columns: ["solicitada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_lugares_recepcion: {
        Row: {
          activo: boolean
          codigo: string
          descripcion: string | null
          id: number
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          codigo: string
          descripcion?: string | null
          id?: number
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          codigo?: string
          descripcion?: string | null
          id?: number
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      catalogo_puertos: {
        Row: {
          activo: boolean
          codigo: string
          creado_en: string
          id: number
          localidad: string | null
          nombre: string
          orden: number
          pais: string
          provincia: string | null
          tipo: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          creado_en?: string
          id?: number
          localidad?: string | null
          nombre: string
          orden?: number
          pais?: string
          provincia?: string | null
          tipo?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          creado_en?: string
          id?: number
          localidad?: string | null
          nombre?: string
          orden?: number
          pais?: string
          provincia?: string | null
          tipo?: string
        }
        Relationships: []
      }
      cierres_logistica: {
        Row: {
          cantidad_camiones: number
          codigo_operacion: string
          comision_logistica_ars: number
          comision_logistica_pct: number
          comision_logistica_por_camion_ars: number | null
          creado_por: string
          empresa_dadora_id: string
          empresa_transportista_id: string
          estado_cierre: string
          estado_pago_comision_logistica: string
          fecha_cierre: string
          id: string
          id_demanda_flete: string
          id_oferta_flete: string
          motivo_revision: string | null
          operacion_id: string | null
          referencia_pago: string | null
          revisado_at: string | null
          revisado_por: string | null
          total_flete_pactado_ars: number
          url_comprobante_logistica: string | null
          valor_flete_por_camion_ars: number | null
        }
        Insert: {
          cantidad_camiones: number
          codigo_operacion: string
          comision_logistica_ars: number
          comision_logistica_pct: number
          comision_logistica_por_camion_ars?: number | null
          creado_por: string
          empresa_dadora_id: string
          empresa_transportista_id: string
          estado_cierre?: string
          estado_pago_comision_logistica?: string
          fecha_cierre?: string
          id?: string
          id_demanda_flete: string
          id_oferta_flete: string
          motivo_revision?: string | null
          operacion_id?: string | null
          referencia_pago?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          total_flete_pactado_ars: number
          url_comprobante_logistica?: string | null
          valor_flete_por_camion_ars?: number | null
        }
        Update: {
          cantidad_camiones?: number
          codigo_operacion?: string
          comision_logistica_ars?: number
          comision_logistica_pct?: number
          comision_logistica_por_camion_ars?: number | null
          creado_por?: string
          empresa_dadora_id?: string
          empresa_transportista_id?: string
          estado_cierre?: string
          estado_pago_comision_logistica?: string
          fecha_cierre?: string
          id?: string
          id_demanda_flete?: string
          id_oferta_flete?: string
          motivo_revision?: string | null
          operacion_id?: string | null
          referencia_pago?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          total_flete_pactado_ars?: number
          url_comprobante_logistica?: string | null
          valor_flete_por_camion_ars?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cierres_logistica_empresa_dadora_id_fkey"
            columns: ["empresa_dadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_logistica_empresa_transportista_id_fkey"
            columns: ["empresa_transportista_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_logistica_id_demanda_flete_fkey"
            columns: ["id_demanda_flete"]
            isOneToOne: false
            referencedRelation: "demandas_logistica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_logistica_id_oferta_flete_fkey"
            columns: ["id_oferta_flete"]
            isOneToOne: false
            referencedRelation: "ofertas_logistica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_logistica_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cierres_logistica_camiones: {
        Row: {
          actualizado_at: string
          cierre_logistica_id: string
          comision_ars: number
          creado_at: string
          estado: string
          id: string
          numero_camion: number
          operacion_id: string
          valor_flete_ars: number
          viaje_id: string | null
        }
        Insert: {
          actualizado_at?: string
          cierre_logistica_id: string
          comision_ars: number
          creado_at?: string
          estado?: string
          id: string
          numero_camion: number
          operacion_id: string
          valor_flete_ars: number
          viaje_id?: string | null
        }
        Update: {
          actualizado_at?: string
          cierre_logistica_id?: string
          comision_ars?: number
          creado_at?: string
          estado?: string
          id?: string
          numero_camion?: number
          operacion_id?: string
          valor_flete_ars?: number
          viaje_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cierres_logistica_camiones_cierre_logistica_id_fkey"
            columns: ["cierre_logistica_id"]
            isOneToOne: false
            referencedRelation: "cierres_logistica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_logistica_camiones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_logistica_camiones_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: true
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      comisiones: {
        Row: {
          creada_en: string | null
          estado: string | null
          id: string
          importe_calculado: number | null
          moneda_id: number | null
          operacion_id: string
          participante_id: string
          tipo: string
          valor: number
        }
        Insert: {
          creada_en?: string | null
          estado?: string | null
          id?: string
          importe_calculado?: number | null
          moneda_id?: number | null
          operacion_id: string
          participante_id: string
          tipo: string
          valor: number
        }
        Update: {
          creada_en?: string | null
          estado?: string | null
          id?: string
          importe_calculado?: number | null
          moneda_id?: number | null
          operacion_id?: string
          participante_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "comisiones_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "operacion_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      comisiones_intermediarios: {
        Row: {
          acuerdo_previo: boolean
          acuerdo_previo_detalle: string | null
          alias: string | null
          banco: string | null
          cbu: string | null
          contacto_id: string | null
          created_at: string
          cuit_titular_pago: string | null
          entidad_financiera: string | null
          estado: string
          fecha_acuerdo: string | null
          fecha_devolucion: string | null
          fecha_pago: string | null
          fecha_retencion: string | null
          id: string
          lado: string
          medio_pago: string | null
          moneda: string | null
          observaciones: string | null
          operacion_id: string
          parte_operacion_id: string | null
          quien_abona: string
          referencia_pago: string | null
          tipo_comision: string
          titular_pago: string | null
          updated_at: string
          valor_comision: number
        }
        Insert: {
          acuerdo_previo?: boolean
          acuerdo_previo_detalle?: string | null
          alias?: string | null
          banco?: string | null
          cbu?: string | null
          contacto_id?: string | null
          created_at?: string
          cuit_titular_pago?: string | null
          entidad_financiera?: string | null
          estado?: string
          fecha_acuerdo?: string | null
          fecha_devolucion?: string | null
          fecha_pago?: string | null
          fecha_retencion?: string | null
          id?: string
          lado: string
          medio_pago?: string | null
          moneda?: string | null
          observaciones?: string | null
          operacion_id: string
          parte_operacion_id?: string | null
          quien_abona: string
          referencia_pago?: string | null
          tipo_comision?: string
          titular_pago?: string | null
          updated_at?: string
          valor_comision: number
        }
        Update: {
          acuerdo_previo?: boolean
          acuerdo_previo_detalle?: string | null
          alias?: string | null
          banco?: string | null
          cbu?: string | null
          contacto_id?: string | null
          created_at?: string
          cuit_titular_pago?: string | null
          entidad_financiera?: string | null
          estado?: string
          fecha_acuerdo?: string | null
          fecha_devolucion?: string | null
          fecha_pago?: string | null
          fecha_retencion?: string | null
          id?: string
          lado?: string
          medio_pago?: string | null
          moneda?: string | null
          observaciones?: string | null
          operacion_id?: string
          parte_operacion_id?: string | null
          quien_abona?: string
          referencia_pago?: string | null
          tipo_comision?: string
          titular_pago?: string | null
          updated_at?: string
          valor_comision?: number
        }
        Relationships: [
          {
            foreignKeyName: "comisiones_intermediarios_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      commodities: {
        Row: {
          activo: boolean
          codigo: string | null
          created_at: string
          id: string
          nombre: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo?: string | null
          created_at?: string
          id?: string
          nombre: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string | null
          created_at?: string
          id?: string
          nombre?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: []
      }
      commodity_product_map: {
        Row: {
          commodity_id: string
          created_at: string
          id: string
          product_id: number
        }
        Insert: {
          commodity_id: string
          created_at?: string
          id?: string
          product_id: number
        }
        Update: {
          commodity_id?: string
          created_at?: string
          id?: string
          product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "commodity_product_map_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commodity_product_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ciudad: string | null
          condicion_iva: string | null
          created_at: string | null
          cuit: string | null
          descripcion: string | null
          direccion: string | null
          email: string | null
          estado: Database["public"]["Enums"]["company_status"] | null
          id: string
          localidad_id: number | null
          logo: string | null
          nombre_comercial: string | null
          pais: string | null
          pais_id: number | null
          provincia: string | null
          provincia_id: number | null
          razon_social: string
          sitio_web: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          ciudad?: string | null
          condicion_iva?: string | null
          created_at?: string | null
          cuit?: string | null
          descripcion?: string | null
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["company_status"] | null
          id?: string
          localidad_id?: number | null
          logo?: string | null
          nombre_comercial?: string | null
          pais?: string | null
          pais_id?: number | null
          provincia?: string | null
          provincia_id?: number | null
          razon_social: string
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          ciudad?: string | null
          condicion_iva?: string | null
          created_at?: string | null
          cuit?: string | null
          descripcion?: string | null
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["company_status"] | null
          id?: string
          localidad_id?: number | null
          logo?: string | null
          nombre_comercial?: string | null
          pais?: string | null
          pais_id?: number | null
          provincia?: string | null
          provincia_id?: number | null
          razon_social?: string
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_localidad_id_fkey"
            columns: ["localidad_id"]
            isOneToOne: false
            referencedRelation: "localidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_pais_id_fkey"
            columns: ["pais_id"]
            isOneToOne: false
            referencedRelation: "paises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "provincias"
            referencedColumns: ["id"]
          },
        ]
      }
      company_empresa_map: {
        Row: {
          company_id: string
          confidence: number
          created_at: string
          empresa_id: string
          id: string
          match_method: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          company_id: string
          confidence?: number
          created_at?: string
          empresa_id: string
          id?: string
          match_method?: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          company_id?: string
          confidence?: number
          created_at?: string
          empresa_id?: string
          id?: string
          match_method?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "company_empresa_map_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_empresa_map_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      company_preferences: {
        Row: {
          active: boolean
          commodity_id: string | null
          company_id: string
          created_at: string
          id: string
          max_quantity: number | null
          min_quantity: number | null
          operation_type: string | null
          preferred_conditions: Json | null
          preferred_destinations: Json | null
          preferred_origins: Json | null
          preferred_payment_methods: Json | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          commodity_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          max_quantity?: number | null
          min_quantity?: number | null
          operation_type?: string | null
          preferred_conditions?: Json | null
          preferred_destinations?: Json | null
          preferred_origins?: Json | null
          preferred_payment_methods?: Json | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          commodity_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          max_quantity?: number | null
          min_quantity?: number | null
          operation_type?: string | null
          preferred_conditions?: Json | null
          preferred_destinations?: Json | null
          preferred_origins?: Json | null
          preferred_payment_methods?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_preferences_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_relationships: {
        Row: {
          cancelled_deals: number | null
          company_a_id: string
          company_b_id: string
          completed_deals: number | null
          created_at: string | null
          defaulted_deals: number | null
          first_deal_at: string | null
          id: string
          last_deal_at: string | null
          notes: string | null
          relationship_type: string | null
          total_deals: number | null
          total_value: number | null
          total_volume: number | null
          updated_at: string | null
        }
        Insert: {
          cancelled_deals?: number | null
          company_a_id: string
          company_b_id: string
          completed_deals?: number | null
          created_at?: string | null
          defaulted_deals?: number | null
          first_deal_at?: string | null
          id?: string
          last_deal_at?: string | null
          notes?: string | null
          relationship_type?: string | null
          total_deals?: number | null
          total_value?: number | null
          total_volume?: number | null
          updated_at?: string | null
        }
        Update: {
          cancelled_deals?: number | null
          company_a_id?: string
          company_b_id?: string
          completed_deals?: number | null
          created_at?: string | null
          defaulted_deals?: number | null
          first_deal_at?: string | null
          id?: string
          last_deal_at?: string | null
          notes?: string | null
          relationship_type?: string | null
          total_deals?: number | null
          total_value?: number | null
          total_volume?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_relationships_company_a_id_fkey"
            columns: ["company_a_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_company_b_id_fkey"
            columns: ["company_b_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          activo: boolean | null
          company_id: string
          created_at: string | null
          id: string
          profile_id: string
          rol: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          activo?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          profile_id: string
          rol?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          activo?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          profile_id?: string
          rol?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      config_comisiones_agrobrokeria: {
        Row: {
          comision_granos_pct: number
          comision_granos_usd_por_tn: number
          comision_logistica_pct: number
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comision_granos_pct?: number
          comision_granos_usd_por_tn?: number
          comision_logistica_pct?: number
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comision_granos_pct?: number
          comision_granos_usd_por_tn?: number
          comision_logistica_pct?: number
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      configuracion_empresa: {
        Row: {
          creado_en: string | null
          empresa_id: string | null
          formato_fecha: string | null
          formato_numero: string | null
          google_meet_habilitado: boolean | null
          id: string
          idioma: string | null
          idioma_documentos: string | null
          idioma_mensajes: string | null
          idioma_notificaciones: string | null
          moneda_preferida: string | null
          pais_iso: string | null
          recibir_alertas: boolean | null
          recibir_emails: boolean | null
          recibir_whatsapp: boolean | null
          traduccion_documentos: boolean | null
          traduccion_mensajes: boolean | null
          unidad_preferida: string | null
          zona_horaria: string | null
        }
        Insert: {
          creado_en?: string | null
          empresa_id?: string | null
          formato_fecha?: string | null
          formato_numero?: string | null
          google_meet_habilitado?: boolean | null
          id?: string
          idioma?: string | null
          idioma_documentos?: string | null
          idioma_mensajes?: string | null
          idioma_notificaciones?: string | null
          moneda_preferida?: string | null
          pais_iso?: string | null
          recibir_alertas?: boolean | null
          recibir_emails?: boolean | null
          recibir_whatsapp?: boolean | null
          traduccion_documentos?: boolean | null
          traduccion_mensajes?: boolean | null
          unidad_preferida?: string | null
          zona_horaria?: string | null
        }
        Update: {
          creado_en?: string | null
          empresa_id?: string | null
          formato_fecha?: string | null
          formato_numero?: string | null
          google_meet_habilitado?: boolean | null
          id?: string
          idioma?: string | null
          idioma_documentos?: string | null
          idioma_mensajes?: string | null
          idioma_notificaciones?: string | null
          moneda_preferida?: string | null
          pais_iso?: string | null
          recibir_alertas?: boolean | null
          recibir_emails?: boolean | null
          recibir_whatsapp?: boolean | null
          traduccion_documentos?: boolean | null
          traduccion_mensajes?: boolean | null
          unidad_preferida?: string | null
          zona_horaria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      congestion_puertos: {
        Row: {
          actualizado_at: string
          calculado_con_gps_at: string | null
          camiones_activos_en_espera: number
          detalle: Json
          id: string
          muestra_desde: string | null
          nivel: string
          terminal_id: string
          tiempo_espera_promedio_minutos: number
          viajes_detectados: string[]
        }
        Insert: {
          actualizado_at?: string
          calculado_con_gps_at?: string | null
          camiones_activos_en_espera?: number
          detalle?: Json
          id?: string
          muestra_desde?: string | null
          nivel?: string
          terminal_id: string
          tiempo_espera_promedio_minutos?: number
          viajes_detectados?: string[]
        }
        Update: {
          actualizado_at?: string
          calculado_con_gps_at?: string | null
          camiones_activos_en_espera?: number
          detalle?: Json
          id?: string
          muestra_desde?: string | null
          nivel?: string
          terminal_id?: string
          tiempo_espera_promedio_minutos?: number
          viajes_detectados?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "congestion_puertos_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: true
            referencedRelation: "terminales_puerto"
            referencedColumns: ["id"]
          },
        ]
      }
      contactos_comerciales: {
        Row: {
          activo: boolean
          created_at: string
          cuit: string | null
          dni: string | null
          domicilio: string | null
          email: string | null
          id: string
          localidad: string | null
          nombre_razon_social: string
          observaciones: string | null
          provincia: string | null
          representante_cargo: string | null
          representante_dni: string | null
          representante_nombre: string | null
          telefono: string | null
          tipo_persona: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          cuit?: string | null
          dni?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre_razon_social: string
          observaciones?: string | null
          provincia?: string | null
          representante_cargo?: string | null
          representante_dni?: string | null
          representante_nombre?: string | null
          telefono?: string | null
          tipo_persona?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          cuit?: string | null
          dni?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre_razon_social?: string
          observaciones?: string | null
          provincia?: string | null
          representante_cargo?: string | null
          representante_dni?: string | null
          representante_nombre?: string | null
          telefono?: string | null
          tipo_persona?: string
          updated_at?: string
        }
        Relationships: []
      }
      contraofertas: {
        Row: {
          cantidad_tn: number | null
          creada_en: string | null
          empresa_id: string
          estado: string | null
          id: string
          observaciones: string | null
          oferta_id: string
          precio_tn: number | null
        }
        Insert: {
          cantidad_tn?: number | null
          creada_en?: string | null
          empresa_id: string
          estado?: string | null
          id?: string
          observaciones?: string | null
          oferta_id: string
          precio_tn?: number | null
        }
        Update: {
          cantidad_tn?: number | null
          creada_en?: string | null
          empresa_id?: string
          estado?: string | null
          id?: string
          observaciones?: string | null
          oferta_id?: string
          precio_tn?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contraofertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contraofertas_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas_negociacion"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_copias_firmadas: {
        Row: {
          contrato_id: string
          empresa_id: string
          estado: string
          id: string
          nombre_archivo: string
          observaciones: string | null
          operacion_id: string
          revisado_at: string | null
          revisado_por: string | null
          rol: string
          sha256: string
          storage_path: string
          subido_at: string
          subido_por: string
          version_contrato: number
        }
        Insert: {
          contrato_id: string
          empresa_id: string
          estado?: string
          id?: string
          nombre_archivo: string
          observaciones?: string | null
          operacion_id: string
          revisado_at?: string | null
          revisado_por?: string | null
          rol: string
          sha256: string
          storage_path: string
          subido_at?: string
          subido_por: string
          version_contrato: number
        }
        Update: {
          contrato_id?: string
          empresa_id?: string
          estado?: string
          id?: string
          nombre_archivo?: string
          observaciones?: string | null
          operacion_id?: string
          revisado_at?: string | null
          revisado_por?: string | null
          rol?: string
          sha256?: string
          storage_path?: string
          subido_at?: string
          subido_por?: string
          version_contrato?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_copias_firmadas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_copias_firmadas_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_firmantes: {
        Row: {
          autenticacion_metodo: string | null
          contrato_id: string
          creado_en: string | null
          email: string | null
          empresa_id: string
          evidencia: Json
          fecha_firma: string | null
          firmado: boolean | null
          id: string
          metodo_firma: string | null
          nombre: string | null
          orden_firma: number | null
          proveedor: string | null
          proveedor_signer_id: string | null
          rol: string | null
        }
        Insert: {
          autenticacion_metodo?: string | null
          contrato_id: string
          creado_en?: string | null
          email?: string | null
          empresa_id: string
          evidencia?: Json
          fecha_firma?: string | null
          firmado?: boolean | null
          id?: string
          metodo_firma?: string | null
          nombre?: string | null
          orden_firma?: number | null
          proveedor?: string | null
          proveedor_signer_id?: string | null
          rol?: string | null
        }
        Update: {
          autenticacion_metodo?: string | null
          contrato_id?: string
          creado_en?: string | null
          email?: string | null
          empresa_id?: string
          evidencia?: Json
          fecha_firma?: string | null
          firmado?: boolean | null
          id?: string
          metodo_firma?: string | null
          nombre?: string | null
          orden_firma?: number | null
          proveedor?: string | null
          proveedor_signer_id?: string | null
          rol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_firmantes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_firmantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_versiones: {
        Row: {
          archivo_docx: string | null
          archivo_pdf: string | null
          contenido: string
          contrato_id: string
          creado_en: string
          creado_por: string
          documento_hash: string | null
          estado: string
          id: string
          motivo: string | null
          storage_path: string | null
          version: number
        }
        Insert: {
          archivo_docx?: string | null
          archivo_pdf?: string | null
          contenido: string
          contrato_id: string
          creado_en?: string
          creado_por: string
          documento_hash?: string | null
          estado?: string
          id?: string
          motivo?: string | null
          storage_path?: string | null
          version: number
        }
        Update: {
          archivo_docx?: string | null
          archivo_pdf?: string | null
          contenido?: string
          contrato_id?: string
          creado_en?: string
          creado_por?: string
          documento_hash?: string | null
          estado?: string
          id?: string
          motivo?: string | null
          storage_path?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_versiones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          abierto_at: string | null
          actualizado_en: string | null
          acuerdo_id: string | null
          archivo_pdf: string | null
          calidad: string | null
          cancelado_por_vencimiento_at: string | null
          cantidad_tn: number | null
          categoria_destino: Database["public"]["Enums"]["tipo_destino_grano"]
          condicion_entrega: string | null
          confirmado_at: string | null
          contenido: string | null
          creado_en: string | null
          destino: string | null
          destino_homologado_id: number | null
          direccion_destino: string | null
          estado: string | null
          fecha_firma: string | null
          fecha_vigencia_desde: string | null
          fecha_vigencia_hasta: string | null
          firma_externa_confirmada_at: string | null
          firma_externa_confirmada_por: string | null
          firma_externa_documento_id: string | null
          firma_externa_estado: string
          flete: string | null
          forma_pago: string | null
          id: string
          importe_total: number | null
          intermediacion_externa_aviso_version: string | null
          intermediario_externo_cuit_snapshot: string | null
          intermediario_externo_empresa_id: string | null
          intermediario_externo_nombre_snapshot: string | null
          localidad_destino: string | null
          lugar_carga: string | null
          nombre_establecimiento_destino: string | null
          numero_contrato: string
          observaciones: string | null
          operacion_id: string
          pacto_comision_externa_declarada: boolean
          plazo_pago: string | null
          precio_tn: number | null
          provincia_destino: string | null
          storage_path: string | null
          updated_at: string | null
          vencimiento_at: string | null
        }
        Insert: {
          abierto_at?: string | null
          actualizado_en?: string | null
          acuerdo_id?: string | null
          archivo_pdf?: string | null
          calidad?: string | null
          cancelado_por_vencimiento_at?: string | null
          cantidad_tn?: number | null
          categoria_destino?: Database["public"]["Enums"]["tipo_destino_grano"]
          condicion_entrega?: string | null
          confirmado_at?: string | null
          contenido?: string | null
          creado_en?: string | null
          destino?: string | null
          destino_homologado_id?: number | null
          direccion_destino?: string | null
          estado?: string | null
          fecha_firma?: string | null
          fecha_vigencia_desde?: string | null
          fecha_vigencia_hasta?: string | null
          firma_externa_confirmada_at?: string | null
          firma_externa_confirmada_por?: string | null
          firma_externa_documento_id?: string | null
          firma_externa_estado?: string
          flete?: string | null
          forma_pago?: string | null
          id?: string
          importe_total?: number | null
          intermediacion_externa_aviso_version?: string | null
          intermediario_externo_cuit_snapshot?: string | null
          intermediario_externo_empresa_id?: string | null
          intermediario_externo_nombre_snapshot?: string | null
          localidad_destino?: string | null
          lugar_carga?: string | null
          nombre_establecimiento_destino?: string | null
          numero_contrato: string
          observaciones?: string | null
          operacion_id: string
          pacto_comision_externa_declarada?: boolean
          plazo_pago?: string | null
          precio_tn?: number | null
          provincia_destino?: string | null
          storage_path?: string | null
          updated_at?: string | null
          vencimiento_at?: string | null
        }
        Update: {
          abierto_at?: string | null
          actualizado_en?: string | null
          acuerdo_id?: string | null
          archivo_pdf?: string | null
          calidad?: string | null
          cancelado_por_vencimiento_at?: string | null
          cantidad_tn?: number | null
          categoria_destino?: Database["public"]["Enums"]["tipo_destino_grano"]
          condicion_entrega?: string | null
          confirmado_at?: string | null
          contenido?: string | null
          creado_en?: string | null
          destino?: string | null
          destino_homologado_id?: number | null
          direccion_destino?: string | null
          estado?: string | null
          fecha_firma?: string | null
          fecha_vigencia_desde?: string | null
          fecha_vigencia_hasta?: string | null
          firma_externa_confirmada_at?: string | null
          firma_externa_confirmada_por?: string | null
          firma_externa_documento_id?: string | null
          firma_externa_estado?: string
          flete?: string | null
          forma_pago?: string | null
          id?: string
          importe_total?: number | null
          intermediacion_externa_aviso_version?: string | null
          intermediario_externo_cuit_snapshot?: string | null
          intermediario_externo_empresa_id?: string | null
          intermediario_externo_nombre_snapshot?: string | null
          localidad_destino?: string | null
          lugar_carga?: string | null
          nombre_establecimiento_destino?: string | null
          numero_contrato?: string
          observaciones?: string | null
          operacion_id?: string
          pacto_comision_externa_declarada?: boolean
          plazo_pago?: string | null
          precio_tn?: number | null
          provincia_destino?: string | null
          storage_path?: string | null
          updated_at?: string | null
          vencimiento_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_acuerdo_id_fkey"
            columns: ["acuerdo_id"]
            isOneToOne: false
            referencedRelation: "acuerdos_comerciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_destino_homologado_id_fkey"
            columns: ["destino_homologado_id"]
            isOneToOne: false
            referencedRelation: "destinos_homologados"
            referencedColumns: ["id_destino"]
          },
          {
            foreignKeyName: "contratos_intermediario_externo_empresa_id_fkey"
            columns: ["intermediario_externo_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_modelo_historico: {
        Row: {
          archivado_at: string
          contrato_id: string
          modelo_legacy: string
          motivo: string
        }
        Insert: {
          archivado_at?: string
          contrato_id: string
          modelo_legacy: string
          motivo: string
        }
        Update: {
          archivado_at?: string
          contrato_id?: string
          modelo_legacy?: string
          motivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_modelo_historico_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      conversaciones: {
        Row: {
          creada_en: string | null
          estado: string | null
          id: string
          operacion_id: string
        }
        Insert: {
          creada_en?: string | null
          estado?: string | null
          id?: string
          operacion_id: string
        }
        Update: {
          creada_en?: string | null
          estado?: string | null
          id?: string
          operacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      conversaciones_fletes: {
        Row: {
          cierre_logistica_id: string
          creada_at: string
          empresa_dadora_id: string
          empresa_transportista_id: string
          estado: string
          id: string
        }
        Insert: {
          cierre_logistica_id: string
          creada_at?: string
          empresa_dadora_id: string
          empresa_transportista_id: string
          estado?: string
          id?: string
        }
        Update: {
          cierre_logistica_id?: string
          creada_at?: string
          empresa_dadora_id?: string
          empresa_transportista_id?: string
          estado?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversaciones_fletes_cierre_logistica_id_fkey"
            columns: ["cierre_logistica_id"]
            isOneToOne: true
            referencedRelation: "cierres_logistica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversaciones_fletes_empresa_dadora_id_fkey"
            columns: ["empresa_dadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversaciones_fletes_empresa_transportista_id_fkey"
            columns: ["empresa_transportista_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      conversaciones_publicaciones: {
        Row: {
          actualizado_at: string
          creado_at: string
          id: string
          interesado_profile_id: string
          publicacion_id: string
          publicador_profile_id: string
        }
        Insert: {
          actualizado_at?: string
          creado_at?: string
          id?: string
          interesado_profile_id: string
          publicacion_id: string
          publicador_profile_id: string
        }
        Update: {
          actualizado_at?: string
          creado_at?: string
          id?: string
          interesado_profile_id?: string
          publicacion_id?: string
          publicador_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversaciones_publicaciones_interesado_profile_id_fkey"
            columns: ["interesado_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversaciones_publicaciones_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversaciones_publicaciones_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversaciones_publicaciones_publicador_profile_id_fkey"
            columns: ["publicador_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      costos_logisticos: {
        Row: {
          concepto: string | null
          creado_en: string | null
          id: string
          importe: number | null
          moneda_id: number | null
          observaciones: string | null
          viaje_id: string
        }
        Insert: {
          concepto?: string | null
          creado_en?: string | null
          id?: string
          importe?: number | null
          moneda_id?: number | null
          observaciones?: string | null
          viaje_id: string
        }
        Update: {
          concepto?: string | null
          creado_en?: string | null
          id?: string
          importe?: number | null
          moneda_id?: number | null
          observaciones?: string | null
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "costos_logisticos_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costos_logisticos_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_type: string
          company_id: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          profile_id: string | null
          related_company_id: string | null
          scheduled_at: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          activity_type: string
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          profile_id?: string | null
          related_company_id?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_type?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          profile_id?: string | null
          related_company_id?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_related_company_id_fkey"
            columns: ["related_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cuenta_roles: {
        Row: {
          cuenta_id: string
          rol_id: number
        }
        Insert: {
          cuenta_id: string
          rol_id: number
        }
        Update: {
          cuenta_id?: string
          rol_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cuenta_roles_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuenta_roles_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas: {
        Row: {
          actualizado_en: string
          codigo: string
          creado_en: string
          email: string
          estado: string
          id: string
          password_hash: string | null
          score: number
          telefono: string | null
          verificado: boolean
        }
        Insert: {
          actualizado_en?: string
          codigo: string
          creado_en?: string
          email: string
          estado?: string
          id?: string
          password_hash?: string | null
          score?: number
          telefono?: string | null
          verificado?: boolean
        }
        Update: {
          actualizado_en?: string
          codigo?: string
          creado_en?: string
          email?: string
          estado?: string
          id?: string
          password_hash?: string | null
          score?: number
          telefono?: string | null
          verificado?: boolean
        }
        Relationships: []
      }
      cuentas_financieras_retiro: {
        Row: {
          alias: string | null
          banco: string | null
          cbu: string | null
          created_at: string
          cuit_cuil: string | null
          cvu: string | null
          empresa_id: string
          es_predeterminada: boolean
          estado: string
          id: string
          medio_cobro_id: string | null
          moneda_id: number | null
          motivo_rechazo: string | null
          profile_id: string | null
          proveedor: string | null
          tipo: string
          tipo_cuenta: string | null
          titular: string | null
          updated_at: string
          verificada_at: string | null
          verificada_por: string | null
        }
        Insert: {
          alias?: string | null
          banco?: string | null
          cbu?: string | null
          created_at?: string
          cuit_cuil?: string | null
          cvu?: string | null
          empresa_id: string
          es_predeterminada?: boolean
          estado?: string
          id?: string
          medio_cobro_id?: string | null
          moneda_id?: number | null
          motivo_rechazo?: string | null
          profile_id?: string | null
          proveedor?: string | null
          tipo?: string
          tipo_cuenta?: string | null
          titular?: string | null
          updated_at?: string
          verificada_at?: string | null
          verificada_por?: string | null
        }
        Update: {
          alias?: string | null
          banco?: string | null
          cbu?: string | null
          created_at?: string
          cuit_cuil?: string | null
          cvu?: string | null
          empresa_id?: string
          es_predeterminada?: boolean
          estado?: string
          id?: string
          medio_cobro_id?: string | null
          moneda_id?: number | null
          motivo_rechazo?: string | null
          profile_id?: string | null
          proveedor?: string | null
          tipo?: string
          tipo_cuenta?: string | null
          titular?: string | null
          updated_at?: string
          verificada_at?: string | null
          verificada_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_financieras_retiro_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_financieras_retiro_medio_cobro_id_fkey"
            columns: ["medio_cobro_id"]
            isOneToOne: false
            referencedRelation: "medios_cobro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_financieras_retiro_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_financieras_retiro_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_financieras_retiro_verificada_por_fkey"
            columns: ["verificada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demandas_logistica: {
        Row: {
          actualizado_at: string
          cantidad_camiones_necesitados: number
          creado_at: string
          creado_por: string
          destino_carga: string
          distancia_estimada_km: number | null
          empresa_dadora_id: string
          estado: string
          fecha_requerida: string | null
          id: string
          observaciones: string | null
          operacion_id: string | null
          origen_carga: string
          permite_adelanto_combustible: boolean
          tarifa_estimada_ars: number | null
          tipo_carroceria: string
        }
        Insert: {
          actualizado_at?: string
          cantidad_camiones_necesitados: number
          creado_at?: string
          creado_por: string
          destino_carga: string
          distancia_estimada_km?: number | null
          empresa_dadora_id: string
          estado?: string
          fecha_requerida?: string | null
          id?: string
          observaciones?: string | null
          operacion_id?: string | null
          origen_carga: string
          permite_adelanto_combustible?: boolean
          tarifa_estimada_ars?: number | null
          tipo_carroceria?: string
        }
        Update: {
          actualizado_at?: string
          cantidad_camiones_necesitados?: number
          creado_at?: string
          creado_por?: string
          destino_carga?: string
          distancia_estimada_km?: number | null
          empresa_dadora_id?: string
          estado?: string
          fecha_requerida?: string | null
          id?: string
          observaciones?: string | null
          operacion_id?: string | null
          origen_carga?: string
          permite_adelanto_combustible?: boolean
          tarifa_estimada_ars?: number | null
          tipo_carroceria?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandas_logistica_empresa_dadora_id_fkey"
            columns: ["empresa_dadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_logistica_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      destinos_homologados: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          cuit_operador: string | null
          direccion: string | null
          fuente_datos: string
          id_destino: number
          localidad: string
          nombre_establecimiento: string
          provincia: string
          tipo: Database["public"]["Enums"]["tipo_destino_grano"]
          verificado: boolean
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          cuit_operador?: string | null
          direccion?: string | null
          fuente_datos?: string
          id_destino?: number
          localidad: string
          nombre_establecimiento: string
          provincia?: string
          tipo: Database["public"]["Enums"]["tipo_destino_grano"]
          verificado?: boolean
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          cuit_operador?: string | null
          direccion?: string | null
          fuente_datos?: string
          id_destino?: number
          localidad?: string
          nombre_establecimiento?: string
          provincia?: string
          tipo?: Database["public"]["Enums"]["tipo_destino_grano"]
          verificado?: boolean
        }
        Relationships: []
      }
      documento_traducciones: {
        Row: {
          contenido_path: string | null
          contrato_id: string | null
          creado_en: string
          documento_id: string | null
          error_codigo: string | null
          estado: string
          hash_sha256: string | null
          id: string
          idioma_destino: string
          idioma_origen: string
          proveedor: string | null
          solicitado_por: string | null
          traducido_en: string | null
          version: number
        }
        Insert: {
          contenido_path?: string | null
          contrato_id?: string | null
          creado_en?: string
          documento_id?: string | null
          error_codigo?: string | null
          estado?: string
          hash_sha256?: string | null
          id?: string
          idioma_destino: string
          idioma_origen: string
          proveedor?: string | null
          solicitado_por?: string | null
          traducido_en?: string | null
          version?: number
        }
        Update: {
          contenido_path?: string | null
          contrato_id?: string | null
          creado_en?: string
          documento_id?: string | null
          error_codigo?: string | null
          estado?: string
          hash_sha256?: string | null
          id?: string
          idioma_destino?: string
          idioma_origen?: string
          proveedor?: string | null
          solicitado_por?: string | null
          traducido_en?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documento_traducciones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_traducciones_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_operacion"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_aduaneros: {
        Row: {
          aprobado: boolean | null
          archivo_pdf: string | null
          creado_en: string | null
          exportacion_id: string
          id: string
          numero_documento: string | null
          tipo_documento: string | null
        }
        Insert: {
          aprobado?: boolean | null
          archivo_pdf?: string | null
          creado_en?: string | null
          exportacion_id: string
          id?: string
          numero_documento?: string | null
          tipo_documento?: string | null
        }
        Update: {
          aprobado?: boolean | null
          archivo_pdf?: string | null
          creado_en?: string | null
          exportacion_id?: string
          id?: string
          numero_documento?: string | null
          tipo_documento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_aduaneros_exportacion_id_fkey"
            columns: ["exportacion_id"]
            isOneToOne: false
            referencedRelation: "exportaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_comex: {
        Row: {
          contenido_generado: Json
          contrato_id: string | null
          creado_en: string
          creado_por: string
          datos_inmutables: Json
          empresa_id: string
          estado: string
          generado_en: string | null
          hash_sha256: string | null
          id: string
          idioma_generado: string
          idioma_origen: string
          membrete_tipo: string
          operacion_id: string | null
          publicacion_id: string | null
          storage_path: string | null
          tipo_documento: string
        }
        Insert: {
          contenido_generado?: Json
          contrato_id?: string | null
          creado_en?: string
          creado_por?: string
          datos_inmutables?: Json
          empresa_id: string
          estado?: string
          generado_en?: string | null
          hash_sha256?: string | null
          id?: string
          idioma_generado?: string
          idioma_origen?: string
          membrete_tipo?: string
          operacion_id?: string | null
          publicacion_id?: string | null
          storage_path?: string | null
          tipo_documento: string
        }
        Update: {
          contenido_generado?: Json
          contrato_id?: string | null
          creado_en?: string
          creado_por?: string
          datos_inmutables?: Json
          empresa_id?: string
          estado?: string
          generado_en?: string | null
          hash_sha256?: string | null
          id?: string
          idioma_generado?: string
          idioma_origen?: string
          membrete_tipo?: string
          operacion_id?: string | null
          publicacion_id?: string | null
          storage_path?: string | null
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_comex_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_comex_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_comex_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_comex_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_comex_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_legales: {
        Row: {
          codigo: string
          contenido: string
          creado_en: string
          estado: string
          hash_sha256: string
          id: string
          titulo: string
          version: string
          vigencia_desde: string
        }
        Insert: {
          codigo: string
          contenido: string
          creado_en?: string
          estado?: string
          hash_sha256: string
          id?: string
          titulo: string
          version: string
          vigencia_desde: string
        }
        Update: {
          codigo?: string
          contenido?: string
          creado_en?: string
          estado?: string
          hash_sha256?: string
          id?: string
          titulo?: string
          version?: string
          vigencia_desde?: string
        }
        Relationships: []
      }
      documentos_operacion: {
        Row: {
          aprobado: boolean | null
          cargado_por: string | null
          creado_en: string | null
          evidencia_firma: Json | null
          firmado_externamente: boolean
          firmado_externamente_at: string | null
          id: string
          nombre_archivo: string | null
          obligatorio: boolean | null
          observaciones: string | null
          operacion_id: string
          sha256: string | null
          tipo_documento: string | null
          url_archivo: string | null
          version: number | null
        }
        Insert: {
          aprobado?: boolean | null
          cargado_por?: string | null
          creado_en?: string | null
          evidencia_firma?: Json | null
          firmado_externamente?: boolean
          firmado_externamente_at?: string | null
          id?: string
          nombre_archivo?: string | null
          obligatorio?: boolean | null
          observaciones?: string | null
          operacion_id: string
          sha256?: string | null
          tipo_documento?: string | null
          url_archivo?: string | null
          version?: number | null
        }
        Update: {
          aprobado?: boolean | null
          cargado_por?: string | null
          creado_en?: string | null
          evidencia_firma?: Json | null
          firmado_externamente?: boolean
          firmado_externamente_at?: string | null
          id?: string
          nombre_archivo?: string | null
          obligatorio?: boolean | null
          observaciones?: string | null
          operacion_id?: string
          sha256?: string | null
          tipo_documento?: string | null
          url_archivo?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_operacion_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      echeq_eventos: {
        Row: {
          creado_at: string
          echeq_id: string
          estado: string | null
          evento_id: string | null
          firma_valida: boolean
          id: string
          payload: Json
          procesado: boolean
          proveedor: string | null
          tipo_evento: string
        }
        Insert: {
          creado_at?: string
          echeq_id: string
          estado?: string | null
          evento_id?: string | null
          firma_valida?: boolean
          id?: string
          payload?: Json
          procesado?: boolean
          proveedor?: string | null
          tipo_evento: string
        }
        Update: {
          creado_at?: string
          echeq_id?: string
          estado?: string | null
          evento_id?: string | null
          firma_valida?: boolean
          id?: string
          payload?: Json
          procesado?: boolean
          proveedor?: string | null
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "echeq_eventos_echeq_id_fkey"
            columns: ["echeq_id"]
            isOneToOne: false
            referencedRelation: "echeq_operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      echeq_operaciones: {
        Row: {
          actualizado_at: string
          ambiente: string
          beneficiario_identificador: string
          creado_at: string
          empresa_beneficiaria_id: string | null
          empresa_emisora_id: string | null
          estado: string
          external_id: string | null
          fecha_emision: string | null
          fecha_pago: string | null
          id: string
          importe: number
          metadata: Json
          moneda_id: number | null
          motivo_estado: string | null
          numero_echeq: string | null
          operacion_id: string | null
          proveedor: string | null
          tipo: string
        }
        Insert: {
          actualizado_at?: string
          ambiente?: string
          beneficiario_identificador: string
          creado_at?: string
          empresa_beneficiaria_id?: string | null
          empresa_emisora_id?: string | null
          estado?: string
          external_id?: string | null
          fecha_emision?: string | null
          fecha_pago?: string | null
          id?: string
          importe: number
          metadata?: Json
          moneda_id?: number | null
          motivo_estado?: string | null
          numero_echeq?: string | null
          operacion_id?: string | null
          proveedor?: string | null
          tipo: string
        }
        Update: {
          actualizado_at?: string
          ambiente?: string
          beneficiario_identificador?: string
          creado_at?: string
          empresa_beneficiaria_id?: string | null
          empresa_emisora_id?: string | null
          estado?: string
          external_id?: string | null
          fecha_emision?: string | null
          fecha_pago?: string | null
          id?: string
          importe?: number
          metadata?: Json
          moneda_id?: number | null
          motivo_estado?: string | null
          numero_echeq?: string | null
          operacion_id?: string | null
          proveedor?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "echeq_operaciones_empresa_beneficiaria_id_fkey"
            columns: ["empresa_beneficiaria_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echeq_operaciones_empresa_emisora_id_fkey"
            columns: ["empresa_emisora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echeq_operaciones_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echeq_operaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      embarques: {
        Row: {
          buque: string | null
          creado_en: string | null
          estado: string | null
          exportacion_id: string
          fecha_carga: string | null
          fecha_salida: string | null
          id: string
          numero_viaje: string | null
        }
        Insert: {
          buque?: string | null
          creado_en?: string | null
          estado?: string | null
          exportacion_id: string
          fecha_carga?: string | null
          fecha_salida?: string | null
          id?: string
          numero_viaje?: string | null
        }
        Update: {
          buque?: string | null
          creado_en?: string | null
          estado?: string | null
          exportacion_id?: string
          fecha_carga?: string | null
          fecha_salida?: string | null
          id?: string
          numero_viaje?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embarques_exportacion_id_fkey"
            columns: ["exportacion_id"]
            isOneToOne: false
            referencedRelation: "exportaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_distintivos: {
        Row: {
          color_codigo: string
          color_hex: string
          descripcion: string
          etiqueta: string
          tipo_empresa: string
        }
        Insert: {
          color_codigo: string
          color_hex: string
          descripcion: string
          etiqueta: string
          tipo_empresa: string
        }
        Update: {
          color_codigo?: string
          color_hex?: string
          descripcion?: string
          etiqueta?: string
          tipo_empresa?: string
        }
        Relationships: []
      }
      empresa_membretes: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          ciudad: string | null
          codigo_postal: string | null
          creado_en: string
          cuit_tax_id: string | null
          datos_bancarios_texto: string | null
          domicilio: string | null
          email: string | null
          empresa_id: string
          encabezado_texto: string | null
          id: string
          idioma_documento_preferido: string
          logo_url: string | null
          membrete_texto: string | null
          nombre_comercial: string | null
          numero_registro: string | null
          pais: string | null
          provincia_estado: string | null
          razon_social: string | null
          representante_cargo: string | null
          representante_nombre: string | null
          sitio_web: string | null
          telefono: string | null
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          creado_en?: string
          cuit_tax_id?: string | null
          datos_bancarios_texto?: string | null
          domicilio?: string | null
          email?: string | null
          empresa_id: string
          encabezado_texto?: string | null
          id?: string
          idioma_documento_preferido?: string
          logo_url?: string | null
          membrete_texto?: string | null
          nombre_comercial?: string | null
          numero_registro?: string | null
          pais?: string | null
          provincia_estado?: string | null
          razon_social?: string | null
          representante_cargo?: string | null
          representante_nombre?: string | null
          sitio_web?: string | null
          telefono?: string | null
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          creado_en?: string
          cuit_tax_id?: string | null
          datos_bancarios_texto?: string | null
          domicilio?: string | null
          email?: string | null
          empresa_id?: string
          encabezado_texto?: string | null
          id?: string
          idioma_documento_preferido?: string
          logo_url?: string | null
          membrete_texto?: string | null
          nombre_comercial?: string | null
          numero_registro?: string | null
          pais?: string | null
          provincia_estado?: string | null
          razon_social?: string | null
          representante_cargo?: string | null
          representante_nombre?: string | null
          sitio_web?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_membretes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_scoring_actual: {
        Row: {
          alertas_desvio_no_justificadas: number
          badge_code: string
          badge_color: string
          badge_label: string
          calculado_at: string
          cobertura_pct: number
          cuit: string
          empresa_id: string
          estado_scoring: string
          factores: Json
          operaciones_evaluadas: number
          score: number | null
          score_calidad: number | null
          score_fiscal: number | null
          score_liquidacion: number | null
          score_logistica: number | null
          updated_at: string
          version_algoritmo: string
          viajes_evaluados: number
        }
        Insert: {
          alertas_desvio_no_justificadas?: number
          badge_code?: string
          badge_color?: string
          badge_label?: string
          calculado_at?: string
          cobertura_pct?: number
          cuit: string
          empresa_id: string
          estado_scoring?: string
          factores?: Json
          operaciones_evaluadas?: number
          score?: number | null
          score_calidad?: number | null
          score_fiscal?: number | null
          score_liquidacion?: number | null
          score_logistica?: number | null
          updated_at?: string
          version_algoritmo?: string
          viajes_evaluados?: number
        }
        Update: {
          alertas_desvio_no_justificadas?: number
          badge_code?: string
          badge_color?: string
          badge_label?: string
          calculado_at?: string
          cobertura_pct?: number
          cuit?: string
          empresa_id?: string
          estado_scoring?: string
          factores?: Json
          operaciones_evaluadas?: number
          score?: number | null
          score_calidad?: number | null
          score_fiscal?: number | null
          score_liquidacion?: number | null
          score_logistica?: number | null
          updated_at?: string
          version_algoritmo?: string
          viajes_evaluados?: number
        }
        Relationships: [
          {
            foreignKeyName: "empresa_scoring_actual_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_scoring_historial: {
        Row: {
          alertas_desvio_no_justificadas: number
          badge_code: string
          badge_color: string
          badge_label: string
          calculado_at: string
          cobertura_pct: number
          cuit: string
          empresa_id: string
          estado_scoring: string
          factores: Json
          id: string
          operaciones_evaluadas: number
          score: number | null
          score_calidad: number | null
          score_fiscal: number | null
          score_liquidacion: number | null
          score_logistica: number | null
          version_algoritmo: string
          viajes_evaluados: number
        }
        Insert: {
          alertas_desvio_no_justificadas?: number
          badge_code: string
          badge_color: string
          badge_label: string
          calculado_at?: string
          cobertura_pct: number
          cuit: string
          empresa_id: string
          estado_scoring: string
          factores?: Json
          id?: string
          operaciones_evaluadas?: number
          score?: number | null
          score_calidad?: number | null
          score_fiscal?: number | null
          score_liquidacion?: number | null
          score_logistica?: number | null
          version_algoritmo?: string
          viajes_evaluados?: number
        }
        Update: {
          alertas_desvio_no_justificadas?: number
          badge_code?: string
          badge_color?: string
          badge_label?: string
          calculado_at?: string
          cobertura_pct?: number
          cuit?: string
          empresa_id?: string
          estado_scoring?: string
          factores?: Json
          id?: string
          operaciones_evaluadas?: number
          score?: number | null
          score_calidad?: number | null
          score_fiscal?: number | null
          score_liquidacion?: number | null
          score_logistica?: number | null
          version_algoritmo?: string
          viajes_evaluados?: number
        }
        Relationships: [
          {
            foreignKeyName: "empresa_scoring_historial_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          activa: boolean | null
          actualizado_en: string | null
          agrobroker_score: number | null
          codigo_postal: string | null
          condicion_iva: string | null
          creado_en: string | null
          cuenta_id: string
          cuit: string | null
          descripcion: string | null
          direccion: string | null
          id: string
          idioma_preferido: string
          localidad: string | null
          nombre_comercial: string | null
          operaciones_canceladas: number
          operaciones_exitosas: number
          operaciones_realizadas: number
          pais: string | null
          pais_registro: string | null
          provincia: string | null
          razon_social: string
          reputacion_score: number
          sitio_web: string | null
          tipo_empresa: string
          tipo_operador: string | null
          toneladas_operadas: number
          ultima_operacion_at: string | null
          verificada: boolean | null
        }
        Insert: {
          activa?: boolean | null
          actualizado_en?: string | null
          agrobroker_score?: number | null
          codigo_postal?: string | null
          condicion_iva?: string | null
          creado_en?: string | null
          cuenta_id: string
          cuit?: string | null
          descripcion?: string | null
          direccion?: string | null
          id?: string
          idioma_preferido?: string
          localidad?: string | null
          nombre_comercial?: string | null
          operaciones_canceladas?: number
          operaciones_exitosas?: number
          operaciones_realizadas?: number
          pais?: string | null
          pais_registro?: string | null
          provincia?: string | null
          razon_social: string
          reputacion_score?: number
          sitio_web?: string | null
          tipo_empresa: string
          tipo_operador?: string | null
          toneladas_operadas?: number
          ultima_operacion_at?: string | null
          verificada?: boolean | null
        }
        Update: {
          activa?: boolean | null
          actualizado_en?: string | null
          agrobroker_score?: number | null
          codigo_postal?: string | null
          condicion_iva?: string | null
          creado_en?: string | null
          cuenta_id?: string
          cuit?: string | null
          descripcion?: string | null
          direccion?: string | null
          id?: string
          idioma_preferido?: string
          localidad?: string | null
          nombre_comercial?: string | null
          operaciones_canceladas?: number
          operaciones_exitosas?: number
          operaciones_realizadas?: number
          pais?: string | null
          pais_registro?: string | null
          provincia?: string | null
          razon_social?: string
          reputacion_score?: number
          sitio_web?: string | null
          tipo_empresa?: string
          tipo_operador?: string | null
          toneladas_operadas?: number
          ultima_operacion_at?: string | null
          verificada?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_bancos: {
        Row: {
          activo: boolean | null
          alias: string | null
          banco: string | null
          cbu_encriptado: string | null
          creado_en: string | null
          empresa_id: string
          id: string
          moneda: string | null
          titular: string | null
        }
        Insert: {
          activo?: boolean | null
          alias?: string | null
          banco?: string | null
          cbu_encriptado?: string | null
          creado_en?: string | null
          empresa_id: string
          id?: string
          moneda?: string | null
          titular?: string | null
        }
        Update: {
          activo?: boolean | null
          alias?: string | null
          banco?: string | null
          cbu_encriptado?: string | null
          creado_en?: string | null
          empresa_id?: string
          id?: string
          moneda?: string | null
          titular?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_bancos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_calificaciones: {
        Row: {
          actualizado_en: string | null
          agrobroker_score: number | null
          empresa_id: string
          id: string
          operaciones_canceladas: number | null
          operaciones_exitosas: number | null
          tiempo_promedio_respuesta: number | null
        }
        Insert: {
          actualizado_en?: string | null
          agrobroker_score?: number | null
          empresa_id: string
          id?: string
          operaciones_canceladas?: number | null
          operaciones_exitosas?: number | null
          tiempo_promedio_respuesta?: number | null
        }
        Update: {
          actualizado_en?: string | null
          agrobroker_score?: number | null
          empresa_id?: string
          id?: string
          operaciones_canceladas?: number | null
          operaciones_exitosas?: number | null
          tiempo_promedio_respuesta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_calificaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_certificaciones: {
        Row: {
          activo: boolean | null
          certificacion: string
          creado_en: string | null
          empresa_id: string
          fecha_emision: string | null
          fecha_vencimiento: string | null
          id: string
          numero_certificado: string | null
          organismo_emisor: string | null
        }
        Insert: {
          activo?: boolean | null
          certificacion: string
          creado_en?: string | null
          empresa_id: string
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          numero_certificado?: string | null
          organismo_emisor?: string | null
        }
        Update: {
          activo?: boolean | null
          certificacion?: string
          creado_en?: string | null
          empresa_id?: string
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          numero_certificado?: string | null
          organismo_emisor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_certificaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_contactos: {
        Row: {
          activo: boolean | null
          cargo: string | null
          creado_en: string | null
          email: string | null
          empresa_id: string
          id: string
          nombre: string
          principal: boolean | null
          telefono: string | null
          whatsapp: string | null
        }
        Insert: {
          activo?: boolean | null
          cargo?: string | null
          creado_en?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          nombre: string
          principal?: boolean | null
          telefono?: string | null
          whatsapp?: string | null
        }
        Update: {
          activo?: boolean | null
          cargo?: string | null
          creado_en?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          principal?: boolean | null
          telefono?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_contactos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_documentos: {
        Row: {
          creado_en: string | null
          empresa_id: string
          fecha_vencimiento: string | null
          id: string
          nombre_archivo: string | null
          observaciones: string | null
          tipo_documento: string
          url_archivo: string | null
          verificado: boolean | null
        }
        Insert: {
          creado_en?: string | null
          empresa_id: string
          fecha_vencimiento?: string | null
          id?: string
          nombre_archivo?: string | null
          observaciones?: string | null
          tipo_documento: string
          url_archivo?: string | null
          verificado?: boolean | null
        }
        Update: {
          creado_en?: string | null
          empresa_id?: string
          fecha_vencimiento?: string | null
          id?: string
          nombre_archivo?: string | null
          observaciones?: string | null
          tipo_documento?: string
          url_archivo?: string | null
          verificado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_preferencias: {
        Row: {
          contrato_anual: boolean | null
          contrato_mensual: boolean | null
          creado_en: string | null
          empresa_id: string
          exporta: boolean | null
          forma_pago_id: number | null
          id: string
          importa: boolean | null
          incoterm_id: number | null
          observaciones: string | null
        }
        Insert: {
          contrato_anual?: boolean | null
          contrato_mensual?: boolean | null
          creado_en?: string | null
          empresa_id: string
          exporta?: boolean | null
          forma_pago_id?: number | null
          id?: string
          importa?: boolean | null
          incoterm_id?: number | null
          observaciones?: string | null
        }
        Update: {
          contrato_anual?: boolean | null
          contrato_mensual?: boolean | null
          creado_en?: string | null
          empresa_id?: string
          exporta?: boolean | null
          forma_pago_id?: number | null
          id?: string
          importa?: boolean | null
          incoterm_id?: number | null
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_preferencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_preferencias_forma_pago_id_fkey"
            columns: ["forma_pago_id"]
            isOneToOne: false
            referencedRelation: "formas_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_preferencias_incoterm_id_fkey"
            columns: ["incoterm_id"]
            isOneToOne: false
            referencedRelation: "incoterms"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_productos: {
        Row: {
          compra: boolean | null
          creado_en: string | null
          empresa_id: string
          id: string
          observaciones: string | null
          prioridad: number | null
          producto_id: number
          venta: boolean | null
          volumen_maximo: number | null
          volumen_minimo: number | null
        }
        Insert: {
          compra?: boolean | null
          creado_en?: string | null
          empresa_id: string
          id?: string
          observaciones?: string | null
          prioridad?: number | null
          producto_id: number
          venta?: boolean | null
          volumen_maximo?: number | null
          volumen_minimo?: number | null
        }
        Update: {
          compra?: boolean | null
          creado_en?: string | null
          empresa_id?: string
          id?: string
          observaciones?: string | null
          prioridad?: number | null
          producto_id?: number
          venta?: boolean | null
          volumen_maximo?: number | null
          volumen_minimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_productos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_productos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_verificacion_requisitos: {
        Row: {
          actualizado_at: string
          creado_at: string
          documento_id: string | null
          empresa_id: string
          estado: string
          id: string
          observaciones: string | null
          requisito_id: number
          verificado_at: string | null
        }
        Insert: {
          actualizado_at?: string
          creado_at?: string
          documento_id?: string | null
          empresa_id: string
          estado?: string
          id?: string
          observaciones?: string | null
          requisito_id: number
          verificado_at?: string | null
        }
        Update: {
          actualizado_at?: string
          creado_at?: string
          documento_id?: string | null
          empresa_id?: string
          estado?: string
          id?: string
          observaciones?: string | null
          requisito_id?: number
          verificado_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_verificacion_requisitos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_verificacion_requisitos_requisito_id_fkey"
            columns: ["requisito_id"]
            isOneToOne: false
            referencedRelation: "verificacion_requisitos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_verificaciones: {
        Row: {
          consultado_at: string | null
          creado_en: string | null
          ejecutado_por: string | null
          empresa_id: string
          estado: string | null
          fecha_verificacion: string | null
          fuente_oficial: string | null
          id: string
          identificador_consulta: string | null
          observaciones: string | null
          organismo: string | null
          resultado: Json | null
          tipo_consulta: string | null
          vencimiento_at: string | null
          verificado_por: string | null
        }
        Insert: {
          consultado_at?: string | null
          creado_en?: string | null
          ejecutado_por?: string | null
          empresa_id: string
          estado?: string | null
          fecha_verificacion?: string | null
          fuente_oficial?: string | null
          id?: string
          identificador_consulta?: string | null
          observaciones?: string | null
          organismo?: string | null
          resultado?: Json | null
          tipo_consulta?: string | null
          vencimiento_at?: string | null
          verificado_por?: string | null
        }
        Update: {
          consultado_at?: string | null
          creado_en?: string | null
          ejecutado_por?: string | null
          empresa_id?: string
          estado?: string | null
          fecha_verificacion?: string | null
          fuente_oficial?: string | null
          id?: string
          identificador_consulta?: string | null
          observaciones?: string | null
          organismo?: string | null
          resultado?: Json | null
          tipo_consulta?: string | null
          vencimiento_at?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_verificaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_verificaciones_verificado_por_fkey"
            columns: ["verificado_por"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_zonas: {
        Row: {
          creado_en: string | null
          empresa_id: string
          id: string
          localidad: string | null
          provincia: string
          puerto: string | null
          radio_km: number | null
        }
        Insert: {
          creado_en?: string | null
          empresa_id: string
          id?: string
          localidad?: string | null
          provincia: string
          puerto?: string | null
          radio_km?: number | null
        }
        Update: {
          creado_en?: string | null
          empresa_id?: string
          id?: string
          localidad?: string | null
          provincia?: string
          puerto?: string | null
          radio_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_zonas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          creado_en: string | null
          fecha_entrega: string | null
          id: string
          observaciones: string | null
          recibido_por: string | null
          toneladas_entregadas: number | null
          viaje_id: string
        }
        Insert: {
          creado_en?: string | null
          fecha_entrega?: string | null
          id?: string
          observaciones?: string | null
          recibido_por?: string | null
          toneladas_entregadas?: number | null
          viaje_id: string
        }
        Update: {
          creado_en?: string | null
          fecha_entrega?: string | null
          id?: string
          observaciones?: string | null
          recibido_por?: string | null
          toneladas_entregadas?: number | null
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      estadisticas_empresa: {
        Row: {
          actualizado_en: string | null
          empresa_id: string
          id: string
          operaciones_exitosas: number | null
          toneladas_compradas: number | null
          toneladas_vendidas: number | null
          total_compras: number | null
          total_ventas: number | null
        }
        Insert: {
          actualizado_en?: string | null
          empresa_id: string
          id?: string
          operaciones_exitosas?: number | null
          toneladas_compradas?: number | null
          toneladas_vendidas?: number | null
          total_compras?: number | null
          total_ventas?: number | null
        }
        Update: {
          actualizado_en?: string | null
          empresa_id?: string
          id?: string
          operaciones_exitosas?: number | null
          toneladas_compradas?: number | null
          toneladas_vendidas?: number | null
          total_compras?: number | null
          total_ventas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estadisticas_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      estados_operacion: {
        Row: {
          id: number
          nombre: string
          orden: number | null
        }
        Insert: {
          id?: number
          nombre: string
          orden?: number | null
        }
        Update: {
          id?: number
          nombre?: string
          orden?: number | null
        }
        Relationships: []
      }
      estados_pago: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      eventos_pago_externo: {
        Row: {
          creado_at: string
          error_message: string | null
          evento_id: string | null
          firma_valida: boolean
          id: string
          payload: Json
          procesado: boolean
          proveedor: string
          tipo_evento: string
          transaccion_id: string | null
        }
        Insert: {
          creado_at?: string
          error_message?: string | null
          evento_id?: string | null
          firma_valida?: boolean
          id?: string
          payload?: Json
          procesado?: boolean
          proveedor: string
          tipo_evento: string
          transaccion_id?: string | null
        }
        Update: {
          creado_at?: string
          error_message?: string | null
          evento_id?: string | null
          firma_valida?: boolean
          id?: string
          payload?: Json
          procesado?: boolean
          proveedor?: string
          tipo_evento?: string
          transaccion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_pago_externo_transaccion_id_fkey"
            columns: ["transaccion_id"]
            isOneToOne: false
            referencedRelation: "transacciones_pago_externo"
            referencedColumns: ["id"]
          },
        ]
      }
      exportaciones: {
        Row: {
          creado_en: string | null
          estado: string | null
          fecha_embarque: string | null
          id: string
          incoterm_id: number | null
          operacion_id: string
          pais_destino_id: number | null
          puerto_destino: string | null
          puerto_origen_id: string | null
        }
        Insert: {
          creado_en?: string | null
          estado?: string | null
          fecha_embarque?: string | null
          id?: string
          incoterm_id?: number | null
          operacion_id: string
          pais_destino_id?: number | null
          puerto_destino?: string | null
          puerto_origen_id?: string | null
        }
        Update: {
          creado_en?: string | null
          estado?: string | null
          fecha_embarque?: string | null
          id?: string
          incoterm_id?: number | null
          operacion_id?: string
          pais_destino_id?: number | null
          puerto_destino?: string | null
          puerto_origen_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exportaciones_incoterm_id_fkey"
            columns: ["incoterm_id"]
            isOneToOne: false
            referencedRelation: "incoterms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportaciones_pais_destino_id_fkey"
            columns: ["pais_destino_id"]
            isOneToOne: false
            referencedRelation: "paises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportaciones_puerto_origen_id_fkey"
            columns: ["puerto_origen_id"]
            isOneToOne: false
            referencedRelation: "puertos"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_arca_incidentes: {
        Row: {
          categoria: string
          codigos_arca: string[]
          creado_at: string
          detalle_tecnico: string | null
          factura_id: string
          id: string
          intento: number
          mensajes_arca: string[]
          metadata: Json
          resultado_arca: string | null
        }
        Insert: {
          categoria: string
          codigos_arca?: string[]
          creado_at?: string
          detalle_tecnico?: string | null
          factura_id: string
          id?: string
          intento?: number
          mensajes_arca?: string[]
          metadata?: Json
          resultado_arca?: string | null
        }
        Update: {
          categoria?: string
          codigos_arca?: string[]
          creado_at?: string
          detalle_tecnico?: string | null
          factura_id?: string
          id?: string
          intento?: number
          mensajes_arca?: string[]
          metadata?: Json
          resultado_arca?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factura_arca_incidentes_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_eventos: {
        Row: {
          actor_profile_id: string | null
          creado_en: string
          evento: string
          factura_id: string
          id: string
          metadata: Json
        }
        Insert: {
          actor_profile_id?: string | null
          creado_en?: string
          evento: string
          factura_id: string
          id?: string
          metadata?: Json
        }
        Update: {
          actor_profile_id?: string | null
          creado_en?: string
          evento?: string
          factura_id?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "factura_eventos_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      facturacion_eventos_outbox: {
        Row: {
          actualizado_at: string
          cantidad_tn: number | null
          clave_idempotencia: string
          creado_at: string
          estado: string
          factura_id: string | null
          id: string
          importe_origen: number | null
          intentos: number
          moneda_origen: string | null
          operacion_id: string
          payload: Json
          procesado_at: string | null
          proximo_intento_at: string | null
          registro_origen_id: string
          tabla_origen: string
          tipo_evento: string
          ultimo_error_codigo: string | null
          ultimo_error_mensaje: string | null
        }
        Insert: {
          actualizado_at?: string
          cantidad_tn?: number | null
          clave_idempotencia: string
          creado_at?: string
          estado?: string
          factura_id?: string | null
          id?: string
          importe_origen?: number | null
          intentos?: number
          moneda_origen?: string | null
          operacion_id: string
          payload?: Json
          procesado_at?: string | null
          proximo_intento_at?: string | null
          registro_origen_id: string
          tabla_origen: string
          tipo_evento: string
          ultimo_error_codigo?: string | null
          ultimo_error_mensaje?: string | null
        }
        Update: {
          actualizado_at?: string
          cantidad_tn?: number | null
          clave_idempotencia?: string
          creado_at?: string
          estado?: string
          factura_id?: string | null
          id?: string
          importe_origen?: number | null
          intentos?: number
          moneda_origen?: string | null
          operacion_id?: string
          payload?: Json
          procesado_at?: string | null
          proximo_intento_at?: string | null
          registro_origen_id?: string
          tabla_origen?: string
          tipo_evento?: string
          ultimo_error_codigo?: string | null
          ultimo_error_mensaje?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturacion_eventos_outbox_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturacion_eventos_outbox_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          actualizada_en: string | null
          arca_attempt_key: string | null
          arca_autorizado_at: string | null
          arca_codigo: string | null
          arca_environment: string | null
          arca_mensaje: string | null
          arca_numero_solicitado: number | null
          arca_request_id: string | null
          arca_request_xml: string | null
          arca_response_xml: string | null
          arca_resultado: string | null
          arca_service: string | null
          archivo_pdf: string | null
          cae: string | null
          cae_vencimiento: string | null
          caea: string | null
          cantidad_tn: number | null
          concepto_descripcion: string | null
          condicion_iva_receptor: number | null
          contrato_id: string | null
          creada_en: string | null
          cuit_emisor: string | null
          cuit_receptor: string | null
          doc_tipo_receptor: number | null
          empresa_id: string
          empresa_receptor_id: string | null
          estado: string | null
          fecha_emision: string | null
          fecha_servicio_desde: string | null
          fecha_servicio_hasta: string | null
          fecha_vencimiento: string | null
          id: string
          importe: number | null
          importe_iva: number | null
          importe_neto: number | null
          importe_total: number | null
          iva_alicuota: number | null
          moneda_cotizacion: number | null
          moneda_id: number | null
          numero_comprobante: number | null
          numero_factura: string | null
          operacion_id: string
          producto_id: number | null
          punto_venta: number | null
          razon_social_emisor: string | null
          razon_social_receptor: string | null
          storage_path: string | null
          tipo_comprobante_codigo: number | null
          tipo_factura: string | null
          usuario_responsable: string | null
        }
        Insert: {
          actualizada_en?: string | null
          arca_attempt_key?: string | null
          arca_autorizado_at?: string | null
          arca_codigo?: string | null
          arca_environment?: string | null
          arca_mensaje?: string | null
          arca_numero_solicitado?: number | null
          arca_request_id?: string | null
          arca_request_xml?: string | null
          arca_response_xml?: string | null
          arca_resultado?: string | null
          arca_service?: string | null
          archivo_pdf?: string | null
          cae?: string | null
          cae_vencimiento?: string | null
          caea?: string | null
          cantidad_tn?: number | null
          concepto_descripcion?: string | null
          condicion_iva_receptor?: number | null
          contrato_id?: string | null
          creada_en?: string | null
          cuit_emisor?: string | null
          cuit_receptor?: string | null
          doc_tipo_receptor?: number | null
          empresa_id: string
          empresa_receptor_id?: string | null
          estado?: string | null
          fecha_emision?: string | null
          fecha_servicio_desde?: string | null
          fecha_servicio_hasta?: string | null
          fecha_vencimiento?: string | null
          id?: string
          importe?: number | null
          importe_iva?: number | null
          importe_neto?: number | null
          importe_total?: number | null
          iva_alicuota?: number | null
          moneda_cotizacion?: number | null
          moneda_id?: number | null
          numero_comprobante?: number | null
          numero_factura?: string | null
          operacion_id: string
          producto_id?: number | null
          punto_venta?: number | null
          razon_social_emisor?: string | null
          razon_social_receptor?: string | null
          storage_path?: string | null
          tipo_comprobante_codigo?: number | null
          tipo_factura?: string | null
          usuario_responsable?: string | null
        }
        Update: {
          actualizada_en?: string | null
          arca_attempt_key?: string | null
          arca_autorizado_at?: string | null
          arca_codigo?: string | null
          arca_environment?: string | null
          arca_mensaje?: string | null
          arca_numero_solicitado?: number | null
          arca_request_id?: string | null
          arca_request_xml?: string | null
          arca_response_xml?: string | null
          arca_resultado?: string | null
          arca_service?: string | null
          archivo_pdf?: string | null
          cae?: string | null
          cae_vencimiento?: string | null
          caea?: string | null
          cantidad_tn?: number | null
          concepto_descripcion?: string | null
          condicion_iva_receptor?: number | null
          contrato_id?: string | null
          creada_en?: string | null
          cuit_emisor?: string | null
          cuit_receptor?: string | null
          doc_tipo_receptor?: number | null
          empresa_id?: string
          empresa_receptor_id?: string | null
          estado?: string | null
          fecha_emision?: string | null
          fecha_servicio_desde?: string | null
          fecha_servicio_hasta?: string | null
          fecha_vencimiento?: string | null
          id?: string
          importe?: number | null
          importe_iva?: number | null
          importe_neto?: number | null
          importe_total?: number | null
          iva_alicuota?: number | null
          moneda_cotizacion?: number | null
          moneda_id?: number | null
          numero_comprobante?: number | null
          numero_factura?: string | null
          operacion_id?: string
          producto_id?: number | null
          punto_venta?: number | null
          razon_social_emisor?: string | null
          razon_social_receptor?: string | null
          storage_path?: string | null
          tipo_comprobante_codigo?: number | null
          tipo_factura?: string | null
          usuario_responsable?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_empresa_receptor_id_fkey"
            columns: ["empresa_receptor_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      fco: {
        Row: {
          archivo_pdf: string | null
          creado_en: string | null
          empresa_emisora: string | null
          empresa_receptora: string | null
          estado: string | null
          fecha_emision: string | null
          hash_sha256: string | null
          id: string
          idioma_documento: string
          operacion_id: string
        }
        Insert: {
          archivo_pdf?: string | null
          creado_en?: string | null
          empresa_emisora?: string | null
          empresa_receptora?: string | null
          estado?: string | null
          fecha_emision?: string | null
          hash_sha256?: string | null
          id?: string
          idioma_documento?: string
          operacion_id: string
        }
        Update: {
          archivo_pdf?: string | null
          creado_en?: string | null
          empresa_emisora?: string | null
          empresa_receptora?: string | null
          estado?: string | null
          fecha_emision?: string | null
          hash_sha256?: string | null
          id?: string
          idioma_documento?: string
          operacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fco_empresa_emisora_fkey"
            columns: ["empresa_emisora"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fco_empresa_receptora_fkey"
            columns: ["empresa_receptora"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fco_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      finanzas_auditoria: {
        Row: {
          accion: string
          created_at: string
          datos: Json
          empresa_id: string | null
          entidad: string
          entidad_id: string | null
          id: string
          profile_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          datos?: Json
          empresa_id?: string | null
          entidad: string
          entidad_id?: string | null
          id?: string
          profile_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          datos?: Json
          empresa_id?: string | null
          entidad?: string
          entidad_id?: string | null
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finanzas_auditoria_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzas_auditoria_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_eventos: {
        Row: {
          actor_profile_id: string | null
          creado_at: string
          evento: string
          id: string
          ip_address: unknown
          metadata: Json
          solicitud_id: string
          user_agent: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          creado_at?: string
          evento: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          solicitud_id: string
          user_agent?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          creado_at?: string
          evento?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          solicitud_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firma_eventos_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_eventos_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "firma_solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_solicitudes: {
        Row: {
          actualizado_at: string
          autenticacion_metodo: string | null
          certificado_subject: string | null
          contrato_id: string | null
          creado_at: string
          creado_por: string
          documento_contenido: string
          documento_hash: string
          documento_id: string | null
          documento_nombre: string
          documento_tipo: string
          empresa_solicitante_id: string | null
          estado: string
          expira_at: string
          firmado_at: string | null
          firmante_email: string
          firmante_nombre: string
          firmante_rol: string
          id: string
          operacion_id: string
          proveedor: string | null
          proveedor_request_id: string | null
          proveedor_signed_document_url: string | null
          proveedor_status: string | null
          token_hash: string
        }
        Insert: {
          actualizado_at?: string
          autenticacion_metodo?: string | null
          certificado_subject?: string | null
          contrato_id?: string | null
          creado_at?: string
          creado_por: string
          documento_contenido: string
          documento_hash: string
          documento_id?: string | null
          documento_nombre: string
          documento_tipo: string
          empresa_solicitante_id?: string | null
          estado?: string
          expira_at?: string
          firmado_at?: string | null
          firmante_email: string
          firmante_nombre: string
          firmante_rol: string
          id?: string
          operacion_id: string
          proveedor?: string | null
          proveedor_request_id?: string | null
          proveedor_signed_document_url?: string | null
          proveedor_status?: string | null
          token_hash: string
        }
        Update: {
          actualizado_at?: string
          autenticacion_metodo?: string | null
          certificado_subject?: string | null
          contrato_id?: string | null
          creado_at?: string
          creado_por?: string
          documento_contenido?: string
          documento_hash?: string
          documento_id?: string | null
          documento_nombre?: string
          documento_tipo?: string
          empresa_solicitante_id?: string | null
          estado?: string
          expira_at?: string
          firmado_at?: string | null
          firmante_email?: string
          firmante_nombre?: string
          firmante_rol?: string
          id?: string
          operacion_id?: string
          proveedor?: string | null
          proveedor_request_id?: string | null
          proveedor_signed_document_url?: string | null
          proveedor_status?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "firma_solicitudes_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_solicitudes_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      firmas_electronicas: {
        Row: {
          autenticacion_evidencia: Json
          certificado_serial: string | null
          certificado_subject: string | null
          consentimiento: boolean
          declaracion: string
          documento_firmado_url: string | null
          documento_hash: string
          documento_original_url: string | null
          evidencia_hash: string
          firma_nombre: string
          firmado_at: string
          firmante_email: string
          firmante_nombre: string
          id: string
          ip_address: unknown
          metadata: Json
          proveedor: string | null
          proveedor_transaction_id: string | null
          solicitud_id: string
          user_agent: string | null
        }
        Insert: {
          autenticacion_evidencia?: Json
          certificado_serial?: string | null
          certificado_subject?: string | null
          consentimiento: boolean
          declaracion: string
          documento_firmado_url?: string | null
          documento_hash: string
          documento_original_url?: string | null
          evidencia_hash: string
          firma_nombre: string
          firmado_at?: string
          firmante_email: string
          firmante_nombre: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          proveedor?: string | null
          proveedor_transaction_id?: string | null
          solicitud_id: string
          user_agent?: string | null
        }
        Update: {
          autenticacion_evidencia?: Json
          certificado_serial?: string | null
          certificado_subject?: string | null
          consentimiento?: boolean
          declaracion?: string
          documento_firmado_url?: string | null
          documento_hash?: string
          documento_original_url?: string | null
          evidencia_hash?: string
          firma_nombre?: string
          firmado_at?: string
          firmante_email?: string
          firmante_nombre?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          proveedor?: string | null
          proveedor_transaction_id?: string | null
          solicitud_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firmas_electronicas_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: true
            referencedRelation: "firma_solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pago: {
        Row: {
          id: number
          nombre: string | null
        }
        Insert: {
          id?: number
          nombre?: string | null
        }
        Update: {
          id?: number
          nombre?: string | null
        }
        Relationships: []
      }
      google_oauth_states: {
        Row: {
          company_id: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string
          user_id: string
        }
        Insert: {
          company_id: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri: string
          user_id: string
        }
        Update: {
          company_id?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string
          user_id?: string
        }
        Relationships: []
      }
      google_oauth_tokens: {
        Row: {
          connected_at: string
          connected_by: string | null
          connected_company_id: string | null
          id: string
          provider: string
          refresh_token: string
          revoked_at: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          connected_at?: string
          connected_by?: string | null
          connected_company_id?: string | null
          id?: string
          provider?: string
          refresh_token: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          connected_at?: string
          connected_by?: string | null
          connected_company_id?: string | null
          id?: string
          provider?: string
          refresh_token?: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      historial_ia: {
        Row: {
          accion: string | null
          creada_en: string | null
          descripcion: string | null
          id: string
          publicacion_id: string | null
        }
        Insert: {
          accion?: string | null
          creada_en?: string | null
          descripcion?: string | null
          id?: string
          publicacion_id?: string | null
        }
        Update: {
          accion?: string | null
          creada_en?: string | null
          descripcion?: string | null
          id?: string
          publicacion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_ia_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_ia_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_pagos: {
        Row: {
          creado_en: string | null
          estado: string | null
          id: string
          observaciones: string | null
          pago_id: string
          usuario_id: string | null
        }
        Insert: {
          creado_en?: string | null
          estado?: string | null
          id?: string
          observaciones?: string | null
          pago_id: string
          usuario_id?: string | null
        }
        Update: {
          creado_en?: string | null
          estado?: string | null
          id?: string
          observaciones?: string | null
          pago_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_pagos_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_pagos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      incoterms: {
        Row: {
          codigo: string | null
          descripcion: string | null
          id: number
        }
        Insert: {
          codigo?: string | null
          descripcion?: string | null
          id?: number
        }
        Update: {
          codigo?: string | null
          descripcion?: string | null
          id?: number
        }
        Relationships: []
      }
      ingresos_comisiones: {
        Row: {
          created_at: string
          empresa_receptora_id: string
          estado: string
          fecha_confirmacion: string | null
          fecha_instruccion: string | null
          id: string
          importe: number
          medio_pago: string
          metadata: Json
          moneda_id: number
          operacion_comision_id: string | null
          operacion_id: string | null
          profile_id: string | null
          proveedor_pago: string | null
          referencia_operacion: string | null
          referencia_pago: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_receptora_id: string
          estado?: string
          fecha_confirmacion?: string | null
          fecha_instruccion?: string | null
          id?: string
          importe: number
          medio_pago: string
          metadata?: Json
          moneda_id: number
          operacion_comision_id?: string | null
          operacion_id?: string | null
          profile_id?: string | null
          proveedor_pago?: string | null
          referencia_operacion?: string | null
          referencia_pago?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_receptora_id?: string
          estado?: string
          fecha_confirmacion?: string | null
          fecha_instruccion?: string | null
          id?: string
          importe?: number
          medio_pago?: string
          metadata?: Json
          moneda_id?: number
          operacion_comision_id?: string | null
          operacion_id?: string | null
          profile_id?: string | null
          proveedor_pago?: string | null
          referencia_operacion?: string | null
          referencia_pago?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingresos_comisiones_empresa_receptora_id_fkey"
            columns: ["empresa_receptora_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingresos_comisiones_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingresos_comisiones_operacion_comision_id_fkey"
            columns: ["operacion_comision_id"]
            isOneToOne: false
            referencedRelation: "operacion_comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingresos_comisiones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingresos_comisiones_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos_ofertas_canje: {
        Row: {
          actualizado_at: string
          categoria_insumo: string
          creado_at: string
          descripcion_producto: string
          disponibilidad: boolean
          estado_verificacion: string
          id: string
          imagen_storage_path: string | null
          localidad: string | null
          marca: string | null
          moneda: string
          precio_referencia: number
          producto_grano_equivalente_id: number | null
          proveedor_empresa_id: string
          provincia: string | null
          unidad_comercial: string
          verificada_at: string | null
          verificada_por: string | null
        }
        Insert: {
          actualizado_at?: string
          categoria_insumo: string
          creado_at?: string
          descripcion_producto: string
          disponibilidad?: boolean
          estado_verificacion?: string
          id?: string
          imagen_storage_path?: string | null
          localidad?: string | null
          marca?: string | null
          moneda?: string
          precio_referencia: number
          producto_grano_equivalente_id?: number | null
          proveedor_empresa_id: string
          provincia?: string | null
          unidad_comercial?: string
          verificada_at?: string | null
          verificada_por?: string | null
        }
        Update: {
          actualizado_at?: string
          categoria_insumo?: string
          creado_at?: string
          descripcion_producto?: string
          disponibilidad?: boolean
          estado_verificacion?: string
          id?: string
          imagen_storage_path?: string | null
          localidad?: string | null
          marca?: string | null
          moneda?: string
          precio_referencia?: number
          producto_grano_equivalente_id?: number | null
          proveedor_empresa_id?: string
          provincia?: string | null
          unidad_comercial?: string
          verificada_at?: string | null
          verificada_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_ofertas_canje_producto_grano_equivalente_id_fkey"
            columns: ["producto_grano_equivalente_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_ofertas_canje_proveedor_empresa_id_fkey"
            columns: ["proveedor_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      integraciones_pago: {
        Row: {
          actualizado_at: string
          ambiente: string
          creado_at: string
          credencial_secret_ref: string | null
          empresa_id: string | null
          habilitado: boolean
          id: string
          metadata: Json
          proveedor: string
          webhook_secret_ref: string | null
        }
        Insert: {
          actualizado_at?: string
          ambiente?: string
          creado_at?: string
          credencial_secret_ref?: string | null
          empresa_id?: string | null
          habilitado?: boolean
          id?: string
          metadata?: Json
          proveedor: string
          webhook_secret_ref?: string | null
        }
        Update: {
          actualizado_at?: string
          ambiente?: string
          creado_at?: string
          credencial_secret_ref?: string | null
          empresa_id?: string | null
          habilitado?: boolean
          id?: string
          metadata?: Json
          proveedor?: string
          webhook_secret_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integraciones_pago_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      intereses_comerciales: {
        Row: {
          activo: boolean | null
          cantidad_maxima: number | null
          cantidad_minima: number | null
          creado_en: string | null
          empresa_id: string
          id: string
          incoterm_id: number | null
          localidad: string | null
          moneda_id: number | null
          precio_objetivo: number | null
          prioridad: number | null
          producto_id: number
          provincia: string | null
          puerto: string | null
          tipo_operacion: string
        }
        Insert: {
          activo?: boolean | null
          cantidad_maxima?: number | null
          cantidad_minima?: number | null
          creado_en?: string | null
          empresa_id: string
          id?: string
          incoterm_id?: number | null
          localidad?: string | null
          moneda_id?: number | null
          precio_objetivo?: number | null
          prioridad?: number | null
          producto_id: number
          provincia?: string | null
          puerto?: string | null
          tipo_operacion: string
        }
        Update: {
          activo?: boolean | null
          cantidad_maxima?: number | null
          cantidad_minima?: number | null
          creado_en?: string | null
          empresa_id?: string
          id?: string
          incoterm_id?: number | null
          localidad?: string | null
          moneda_id?: number | null
          precio_objetivo?: number | null
          prioridad?: number | null
          producto_id?: number
          provincia?: string | null
          puerto?: string | null
          tipo_operacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "intereses_comerciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intereses_comerciales_incoterm_id_fkey"
            columns: ["incoterm_id"]
            isOneToOne: false
            referencedRelation: "incoterms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intereses_comerciales_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intereses_comerciales_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_public_counters: {
        Row: {
          active_demands: number
          active_offers: number
          id: number
          updated_at: string
          verified_companies: number
        }
        Insert: {
          active_demands?: number
          active_offers?: number
          id: number
          updated_at?: string
          verified_companies?: number
        }
        Update: {
          active_demands?: number
          active_offers?: number
          id?: number
          updated_at?: string
          verified_companies?: number
        }
        Relationships: []
      }
      liquidaciones: {
        Row: {
          creada_en: string | null
          estado: string | null
          id: string
          importe_bruto: number | null
          importe_neto_vendedor: number | null
          importe_total_comprador: number | null
          moneda_id: number | null
          operacion_id: string
          total_comisiones: number | null
        }
        Insert: {
          creada_en?: string | null
          estado?: string | null
          id?: string
          importe_bruto?: number | null
          importe_neto_vendedor?: number | null
          importe_total_comprador?: number | null
          moneda_id?: number | null
          operacion_id: string
          total_comisiones?: number | null
        }
        Update: {
          creada_en?: string | null
          estado?: string | null
          id?: string
          importe_bruto?: number | null
          importe_neto_vendedor?: number | null
          importe_total_comprador?: number | null
          moneda_id?: number | null
          operacion_id?: string
          total_comisiones?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "liquidaciones_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      localidades: {
        Row: {
          activo: boolean | null
          codigo_externo: string | null
          codigo_postal: string | null
          id: number
          latitud: number | null
          longitud: number | null
          nombre: string
          provincia_id: number
        }
        Insert: {
          activo?: boolean | null
          codigo_externo?: string | null
          codigo_postal?: string | null
          id?: number
          latitud?: number | null
          longitud?: number | null
          nombre: string
          provincia_id: number
        }
        Update: {
          activo?: boolean | null
          codigo_externo?: string | null
          codigo_postal?: string | null
          id?: number
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          provincia_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "localidades_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "provincias"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_adelantos_combustible: {
        Row: {
          cierre_logistica_id: string
          comprobante_path: string | null
          creado_at: string
          estado: string
          id: string
          monto_solicitado_ars: number
          motivo_rechazo: string | null
          porcentaje_flete: number
          referencia_transferencia: string | null
          revisado_at: string | null
          revisado_por: string | null
          solicitado_por: string
        }
        Insert: {
          cierre_logistica_id: string
          comprobante_path?: string | null
          creado_at?: string
          estado?: string
          id?: string
          monto_solicitado_ars: number
          motivo_rechazo?: string | null
          porcentaje_flete: number
          referencia_transferencia?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          solicitado_por: string
        }
        Update: {
          cierre_logistica_id?: string
          comprobante_path?: string | null
          creado_at?: string
          estado?: string
          id?: string
          monto_solicitado_ars?: number
          motivo_rechazo?: string | null
          porcentaje_flete?: number
          referencia_transferencia?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          solicitado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistica_adelantos_combustible_cierre_logistica_id_fkey"
            columns: ["cierre_logistica_id"]
            isOneToOne: false
            referencedRelation: "cierres_logistica"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_choferes: {
        Row: {
          activo: boolean
          actualizado_at: string
          creado_at: string
          creado_por: string
          cuil_chofer: string
          empresa_id: string
          id: string
          nombre_apellido: string
          numero_licencia_linti: string | null
          telefono_celular: string
        }
        Insert: {
          activo?: boolean
          actualizado_at?: string
          creado_at?: string
          creado_por?: string
          cuil_chofer: string
          empresa_id: string
          id?: string
          nombre_apellido: string
          numero_licencia_linti?: string | null
          telefono_celular: string
        }
        Update: {
          activo?: boolean
          actualizado_at?: string
          creado_at?: string
          creado_por?: string
          cuil_chofer?: string
          empresa_id?: string
          id?: string
          nombre_apellido?: string
          numero_licencia_linti?: string | null
          telefono_celular?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistica_choferes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_flota_camiones: {
        Row: {
          activo: boolean
          actualizado_at: string
          creado_at: string
          creado_por: string
          empresa_id: string
          estado_disponibilidad: boolean
          id: string
          marca_modelo: string | null
          patente_acoplado: string | null
          patente_chasis: string
        }
        Insert: {
          activo?: boolean
          actualizado_at?: string
          creado_at?: string
          creado_por?: string
          empresa_id: string
          estado_disponibilidad?: boolean
          id?: string
          marca_modelo?: string | null
          patente_acoplado?: string | null
          patente_chasis: string
        }
        Update: {
          activo?: boolean
          actualizado_at?: string
          creado_at?: string
          creado_por?: string
          empresa_id?: string
          estado_disponibilidad?: boolean
          id?: string
          marca_modelo?: string | null
          patente_acoplado?: string | null
          patente_chasis?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistica_flota_camiones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_sistema: {
        Row: {
          creado_en: string | null
          detalle: Json | null
          id: string
          mensaje: string | null
          nivel: string | null
          origen: string | null
        }
        Insert: {
          creado_en?: string | null
          detalle?: Json | null
          id?: string
          mensaje?: string | null
          nivel?: string | null
          origen?: string | null
        }
        Update: {
          creado_en?: string | null
          detalle?: Json | null
          id?: string
          mensaje?: string | null
          nivel?: string | null
          origen?: string | null
        }
        Relationships: []
      }
      loi: {
        Row: {
          archivo_pdf: string | null
          creado_en: string | null
          empresa_emisora: string | null
          empresa_receptora: string | null
          estado: string | null
          fecha_emision: string | null
          hash_sha256: string | null
          id: string
          idioma_documento: string
          operacion_id: string
        }
        Insert: {
          archivo_pdf?: string | null
          creado_en?: string | null
          empresa_emisora?: string | null
          empresa_receptora?: string | null
          estado?: string | null
          fecha_emision?: string | null
          hash_sha256?: string | null
          id?: string
          idioma_documento?: string
          operacion_id: string
        }
        Update: {
          archivo_pdf?: string | null
          creado_en?: string | null
          empresa_emisora?: string | null
          empresa_receptora?: string | null
          estado?: string | null
          fecha_emision?: string | null
          hash_sha256?: string | null
          id?: string
          idioma_documento?: string
          operacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loi_empresa_emisora_fkey"
            columns: ["empresa_emisora"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loi_empresa_receptora_fkey"
            columns: ["empresa_receptora"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loi_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      market_public_summary: {
        Row: {
          actualizado_at: string
          commodity: string
          fecha_mercado: string | null
          moneda: string
          precio_promedio: number
          publicaciones: number
          variacion: number | null
        }
        Insert: {
          actualizado_at?: string
          commodity: string
          fecha_mercado?: string | null
          moneda: string
          precio_promedio: number
          publicaciones: number
          variacion?: number | null
        }
        Update: {
          actualizado_at?: string
          commodity?: string
          fecha_mercado?: string | null
          moneda?: string
          precio_promedio?: number
          publicaciones?: number
          variacion?: number | null
        }
        Relationships: []
      }
      market_quotes: {
        Row: {
          commodity_id: string | null
          created_at: string
          currency: string | null
          fingerprint: string
          freshness: string
          id: string
          market: string | null
          market_date: string
          obtained_at: string
          payload: Json
          port: string | null
          position: string | null
          previous_value: number | null
          price: number | null
          price_type: string
          product_id: number | null
          published_at: string | null
          source: string
          source_reference: string | null
          status: string
          unit: string | null
          variation: number | null
          variety: string | null
        }
        Insert: {
          commodity_id?: string | null
          created_at?: string
          currency?: string | null
          fingerprint: string
          freshness?: string
          id?: string
          market?: string | null
          market_date: string
          obtained_at?: string
          payload?: Json
          port?: string | null
          position?: string | null
          previous_value?: number | null
          price?: number | null
          price_type: string
          product_id?: number | null
          published_at?: string | null
          source: string
          source_reference?: string | null
          status?: string
          unit?: string | null
          variation?: number | null
          variety?: string | null
        }
        Update: {
          commodity_id?: string | null
          created_at?: string
          currency?: string | null
          fingerprint?: string
          freshness?: string
          id?: string
          market?: string | null
          market_date?: string
          obtained_at?: string
          payload?: Json
          port?: string | null
          position?: string | null
          previous_value?: number | null
          price?: number | null
          price_type?: string
          product_id?: number | null
          published_at?: string | null
          source?: string
          source_reference?: string | null
          status?: string
          unit?: string | null
          variation?: number | null
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_quotes_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_quotes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      market_sync_runs: {
        Row: {
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          metadata: Json
          records_saved: number
          records_seen: number
          source: string
          started_at: string
          status: string
        }
        Insert: {
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          records_saved?: number
          records_seen?: number
          source: string
          started_at?: string
          status: string
        }
        Update: {
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          records_saved?: number
          records_seen?: number
          source?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      medios_cobro: {
        Row: {
          actualizado_at: string
          alias: string | null
          banco: string | null
          cbu: string | null
          creado_at: string
          cuit_cuil: string | null
          datos_adicionales: Json | null
          empresa_id: string
          es_predeterminado: boolean
          estado: string
          id: string
          moneda_id: number | null
          motivo_rechazo: string | null
          nombre: string
          profile_id: string | null
          tipo: string
          tipo_cuenta: string | null
          titular: string | null
        }
        Insert: {
          actualizado_at?: string
          alias?: string | null
          banco?: string | null
          cbu?: string | null
          creado_at?: string
          cuit_cuil?: string | null
          datos_adicionales?: Json | null
          empresa_id: string
          es_predeterminado?: boolean
          estado?: string
          id?: string
          moneda_id?: number | null
          motivo_rechazo?: string | null
          nombre: string
          profile_id?: string | null
          tipo: string
          tipo_cuenta?: string | null
          titular?: string | null
        }
        Update: {
          actualizado_at?: string
          alias?: string | null
          banco?: string | null
          cbu?: string | null
          creado_at?: string
          cuit_cuil?: string | null
          datos_adicionales?: Json | null
          empresa_id?: string
          es_predeterminado?: boolean
          estado?: string
          id?: string
          moneda_id?: number | null
          motivo_rechazo?: string | null
          nombre?: string
          profile_id?: string | null
          tipo?: string
          tipo_cuenta?: string | null
          titular?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medios_cobro_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medios_cobro_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes: {
        Row: {
          conversacion_id: string
          creado_en: string | null
          empresa_id: string
          id: string
          leido: boolean | null
          mensaje: string
        }
        Insert: {
          conversacion_id: string
          creado_en?: string | null
          empresa_id: string
          id?: string
          leido?: boolean | null
          mensaje: string
        }
        Update: {
          conversacion_id?: string
          creado_en?: string | null
          empresa_id?: string
          id?: string
          leido?: boolean | null
          mensaje?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes_comerciales: {
        Row: {
          actualizado_at: string
          advertencia_externa: boolean | null
          categoria_comercial: string | null
          creado_at: string
          destinatario_empresa_id: string | null
          destinatario_profile_id: string | null
          estado: string
          id: string
          idioma_origen: string | null
          leido_at: string | null
          mensaje: string
          moderacion_codigo: string | null
          moderacion_estado: string | null
          moderacion_explicacion: string | null
          operacion_id: string
          remitente_empresa_id: string | null
          remitente_profile_id: string | null
          tipo_mensaje: string
        }
        Insert: {
          actualizado_at?: string
          advertencia_externa?: boolean | null
          categoria_comercial?: string | null
          creado_at?: string
          destinatario_empresa_id?: string | null
          destinatario_profile_id?: string | null
          estado?: string
          id?: string
          idioma_origen?: string | null
          leido_at?: string | null
          mensaje: string
          moderacion_codigo?: string | null
          moderacion_estado?: string | null
          moderacion_explicacion?: string | null
          operacion_id: string
          remitente_empresa_id?: string | null
          remitente_profile_id?: string | null
          tipo_mensaje?: string
        }
        Update: {
          actualizado_at?: string
          advertencia_externa?: boolean | null
          categoria_comercial?: string | null
          creado_at?: string
          destinatario_empresa_id?: string | null
          destinatario_profile_id?: string | null
          estado?: string
          id?: string
          idioma_origen?: string | null
          leido_at?: string | null
          mensaje?: string
          moderacion_codigo?: string | null
          moderacion_estado?: string | null
          moderacion_explicacion?: string | null
          operacion_id?: string
          remitente_empresa_id?: string | null
          remitente_profile_id?: string | null
          tipo_mensaje?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_comerciales_destinatario_empresa_id_fkey"
            columns: ["destinatario_empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_comerciales_destinatario_profile_id_fkey"
            columns: ["destinatario_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_comerciales_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_comerciales_remitente_empresa_id_fkey"
            columns: ["remitente_empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_comerciales_remitente_profile_id_fkey"
            columns: ["remitente_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes_fletes: {
        Row: {
          adjunto_path: string | null
          conversacion_id: string
          creado_at: string
          emisor_profile_id: string | null
          es_sistema: boolean
          id: string
          mensaje: string
        }
        Insert: {
          adjunto_path?: string | null
          conversacion_id: string
          creado_at?: string
          emisor_profile_id?: string | null
          es_sistema?: boolean
          id?: string
          mensaje: string
        }
        Update: {
          adjunto_path?: string | null
          conversacion_id?: string
          creado_at?: string
          emisor_profile_id?: string | null
          es_sistema?: boolean
          id?: string
          mensaje?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_fletes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones_fletes"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes_generados_ia: {
        Row: {
          asunto: string | null
          creada_en: string | null
          estado: string | null
          id: string
          mensaje: string | null
          oportunidad_id: string | null
        }
        Insert: {
          asunto?: string | null
          creada_en?: string | null
          estado?: string | null
          id?: string
          mensaje?: string | null
          oportunidad_id?: string | null
        }
        Update: {
          asunto?: string | null
          creada_en?: string | null
          estado?: string | null
          id?: string
          mensaje?: string | null
          oportunidad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_generados_ia_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes_publicaciones: {
        Row: {
          conversacion_id: string
          creado_at: string
          id: string
          leido_at: string | null
          mensaje: string
          remitente_profile_id: string
        }
        Insert: {
          conversacion_id: string
          creado_at?: string
          id?: string
          leido_at?: string | null
          mensaje: string
          remitente_profile_id: string
        }
        Update: {
          conversacion_id?: string
          creado_at?: string
          id?: string
          leido_at?: string | null
          mensaje?: string
          remitente_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_publicaciones_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones_publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_publicaciones_remitente_profile_id_fkey"
            columns: ["remitente_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes_traducciones: {
        Row: {
          creado_en: string
          error_codigo: string | null
          estado: string
          id: string
          idioma_destino: string
          idioma_origen: string
          mensaje_id: string
          proveedor: string | null
          solicitado_por: string | null
          texto_original: string
          texto_traducido: string | null
          traducido_en: string | null
          version: number
        }
        Insert: {
          creado_en?: string
          error_codigo?: string | null
          estado?: string
          id?: string
          idioma_destino: string
          idioma_origen: string
          mensaje_id: string
          proveedor?: string | null
          solicitado_por?: string | null
          texto_original: string
          texto_traducido?: string | null
          traducido_en?: string | null
          version?: number
        }
        Update: {
          creado_en?: string
          error_codigo?: string | null
          estado?: string
          id?: string
          idioma_destino?: string
          idioma_origen?: string
          mensaje_id?: string
          proveedor?: string | null
          solicitado_por?: string | null
          texto_original?: string
          texto_traducido?: string | null
          traducido_en?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_traducciones_mensaje_id_fkey"
            columns: ["mensaje_id"]
            isOneToOne: false
            referencedRelation: "mensajes_comerciales"
            referencedColumns: ["id"]
          },
        ]
      }
      mercadopago_conexiones: {
        Row: {
          access_token_enc: string
          actualizado_at: string
          company_id: string
          conectado_at: string
          empresa_id: string | null
          estado: string
          id: string
          live_mode: boolean
          metadata: Json
          mp_user_id: string
          profile_id: string | null
          public_key: string | null
          refresh_token_enc: string
          scope: string | null
          token_expires_at: string | null
        }
        Insert: {
          access_token_enc: string
          actualizado_at?: string
          company_id: string
          conectado_at?: string
          empresa_id?: string | null
          estado?: string
          id?: string
          live_mode?: boolean
          metadata?: Json
          mp_user_id: string
          profile_id?: string | null
          public_key?: string | null
          refresh_token_enc: string
          scope?: string | null
          token_expires_at?: string | null
        }
        Update: {
          access_token_enc?: string
          actualizado_at?: string
          company_id?: string
          conectado_at?: string
          empresa_id?: string | null
          estado?: string
          id?: string
          live_mode?: boolean
          metadata?: Json
          mp_user_id?: string
          profile_id?: string | null
          public_key?: string | null
          refresh_token_enc?: string
          scope?: string | null
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mercadopago_conexiones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercadopago_conexiones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercadopago_conexiones_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mercadopago_oauth_states: {
        Row: {
          code_verifier_enc: string
          company_id: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          nonce: string
          profile_id: string
        }
        Insert: {
          code_verifier_enc: string
          company_id: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          nonce: string
          profile_id: string
        }
        Update: {
          code_verifier_enc?: string
          company_id?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          nonce?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercadopago_oauth_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercadopago_oauth_states_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monedas: {
        Row: {
          codigo: string | null
          id: number
          nombre: string | null
          simbolo: string | null
        }
        Insert: {
          codigo?: string | null
          id?: number
          nombre?: string | null
          simbolo?: string | null
        }
        Update: {
          codigo?: string | null
          id?: number
          nombre?: string | null
          simbolo?: string | null
        }
        Relationships: []
      }
      motor_compatibilidad: {
        Row: {
          creada_en: string | null
          empresa_id: string
          explicacion: Json
          id: string
          publicacion_id: string
          puntaje_cantidad: number | null
          puntaje_condicion: number | null
          puntaje_documentacion: number | null
          puntaje_historial: number | null
          puntaje_logistica: number | null
          puntaje_precio: number | null
          puntaje_producto: number | null
          puntaje_total: number | null
          puntaje_zona: number | null
          recomendada: boolean | null
        }
        Insert: {
          creada_en?: string | null
          empresa_id: string
          explicacion?: Json
          id?: string
          publicacion_id: string
          puntaje_cantidad?: number | null
          puntaje_condicion?: number | null
          puntaje_documentacion?: number | null
          puntaje_historial?: number | null
          puntaje_logistica?: number | null
          puntaje_precio?: number | null
          puntaje_producto?: number | null
          puntaje_total?: number | null
          puntaje_zona?: number | null
          recomendada?: boolean | null
        }
        Update: {
          creada_en?: string | null
          empresa_id?: string
          explicacion?: Json
          id?: string
          publicacion_id?: string
          puntaje_cantidad?: number | null
          puntaje_condicion?: number | null
          puntaje_documentacion?: number | null
          puntaje_historial?: number | null
          puntaje_logistica?: number | null
          puntaje_precio?: number | null
          puntaje_producto?: number | null
          puntaje_total?: number | null
          puntaje_zona?: number | null
          recomendada?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "motor_compatibilidad_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motor_compatibilidad_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motor_compatibilidad_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          actualizado_at: string | null
          conversacion_id: string | null
          creada_en: string | null
          cuenta_id: string | null
          id: string
          leida: boolean | null
          mensaje: string | null
          oferta_id: string | null
          operacion_id: string | null
          profile_id: string | null
          publicacion_id: string | null
          tipo: string | null
          titulo: string | null
        }
        Insert: {
          actualizado_at?: string | null
          conversacion_id?: string | null
          creada_en?: string | null
          cuenta_id?: string | null
          id?: string
          leida?: boolean | null
          mensaje?: string | null
          oferta_id?: string | null
          operacion_id?: string | null
          profile_id?: string | null
          publicacion_id?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Update: {
          actualizado_at?: string | null
          conversacion_id?: string | null
          creada_en?: string | null
          cuenta_id?: string | null
          id?: string
          leida?: boolean | null
          mensaje?: string | null
          oferta_id?: string | null
          operacion_id?: string | null
          profile_id?: string | null
          publicacion_id?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones_publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas_negociacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
        ]
      }
      ofertas_logistica: {
        Row: {
          actualizado_at: string
          cantidad_camiones: number
          creado_at: string
          creado_por: string
          destino_solicitado: string | null
          empresa_transportista_id: string
          estado: string
          fecha_disponibilidad: string
          id: string
          observaciones: string | null
          tipo_carroceria: string
          transportista_id: string
          ubicacion_actual: string
        }
        Insert: {
          actualizado_at?: string
          cantidad_camiones: number
          creado_at?: string
          creado_por: string
          destino_solicitado?: string | null
          empresa_transportista_id: string
          estado?: string
          fecha_disponibilidad: string
          id?: string
          observaciones?: string | null
          tipo_carroceria?: string
          transportista_id: string
          ubicacion_actual: string
        }
        Update: {
          actualizado_at?: string
          cantidad_camiones?: number
          creado_at?: string
          creado_por?: string
          destino_solicitado?: string | null
          empresa_transportista_id?: string
          estado?: string
          fecha_disponibilidad?: string
          id?: string
          observaciones?: string | null
          tipo_carroceria?: string
          transportista_id?: string
          ubicacion_actual?: string
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_logistica_empresa_transportista_id_fkey"
            columns: ["empresa_transportista_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_logistica_transportista_id_fkey"
            columns: ["transportista_id"]
            isOneToOne: false
            referencedRelation: "transportistas"
            referencedColumns: ["id"]
          },
        ]
      }
      ofertas_negociacion: {
        Row: {
          cantidad_original: number | null
          cantidad_tn: number | null
          creada_en: string | null
          empresa_id: string
          estado: string | null
          factor_normalizacion: number | null
          id: string
          moneda_id: number | null
          observaciones: string | null
          operacion_id: string
          precio_tn: number | null
          unidad_base: string | null
          unidad_original: string | null
        }
        Insert: {
          cantidad_original?: number | null
          cantidad_tn?: number | null
          creada_en?: string | null
          empresa_id: string
          estado?: string | null
          factor_normalizacion?: number | null
          id?: string
          moneda_id?: number | null
          observaciones?: string | null
          operacion_id: string
          precio_tn?: number | null
          unidad_base?: string | null
          unidad_original?: string | null
        }
        Update: {
          cantidad_original?: number | null
          cantidad_tn?: number | null
          creada_en?: string | null
          empresa_id?: string
          estado?: string | null
          factor_normalizacion?: number | null
          id?: string
          moneda_id?: number | null
          observaciones?: string | null
          operacion_id?: string
          precio_tn?: number | null
          unidad_base?: string | null
          unidad_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_negociacion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_negociacion_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_negociacion_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_documents: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
          offer_id: string
          tipo: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
          offer_id: string
          tipo?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
          offer_id?: string
          tipo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_documents_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_images: {
        Row: {
          created_at: string | null
          id: string
          offer_id: string
          principal: boolean | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          offer_id: string
          principal?: boolean | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          offer_id?: string
          principal?: boolean | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_images_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          calidad: string | null
          campaña: string | null
          cantidad: number
          company_id: string
          created_at: string | null
          estado: Database["public"]["Enums"]["offer_status"] | null
          fecha_publicacion: string | null
          fecha_vencimiento: string | null
          id: string
          incoterm: string | null
          moneda: string | null
          observaciones: string | null
          precio: number | null
          product_id: string
          puerto: string | null
          tipo: Database["public"]["Enums"]["offer_type"]
          unidad: string | null
          updated_at: string | null
        }
        Insert: {
          calidad?: string | null
          campaña?: string | null
          cantidad: number
          company_id: string
          created_at?: string | null
          estado?: Database["public"]["Enums"]["offer_status"] | null
          fecha_publicacion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          incoterm?: string | null
          moneda?: string | null
          observaciones?: string | null
          precio?: number | null
          product_id: string
          puerto?: string | null
          tipo: Database["public"]["Enums"]["offer_type"]
          unidad?: string | null
          updated_at?: string | null
        }
        Update: {
          calidad?: string | null
          campaña?: string | null
          cantidad?: number
          company_id?: string
          created_at?: string | null
          estado?: Database["public"]["Enums"]["offer_status"] | null
          fecha_publicacion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          incoterm?: string | null
          moneda?: string | null
          observaciones?: string | null
          precio?: number | null
          product_id?: string
          puerto?: string | null
          tipo?: Database["public"]["Enums"]["offer_type"]
          unidad?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_aceptaciones_confidencialidad: {
        Row: {
          aceptado_at: string
          company_id: string
          created_at: string
          documento_legal_id: string
          hash_sha256: string
          id: string
          ip: string | null
          operacion_id: string
          profile_id: string
          rol: string
          user_agent: string | null
          version: string
        }
        Insert: {
          aceptado_at?: string
          company_id: string
          created_at?: string
          documento_legal_id: string
          hash_sha256: string
          id?: string
          ip?: string | null
          operacion_id: string
          profile_id: string
          rol: string
          user_agent?: string | null
          version: string
        }
        Update: {
          aceptado_at?: string
          company_id?: string
          created_at?: string
          documento_legal_id?: string
          hash_sha256?: string
          id?: string
          ip?: string | null
          operacion_id?: string
          profile_id?: string
          rol?: string
          user_agent?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacion_aceptaciones_confidencialidad_documento_legal_id_fkey"
            columns: ["documento_legal_id"]
            isOneToOne: false
            referencedRelation: "documentos_legales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_aceptaciones_confidencialidad_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_carta_porte_autorizaciones: {
        Row: {
          autorizado_at: string
          autorizado_por: string
          corredor_profile_id: string
          id: string
          motivo: string | null
          operacion_id: string
          revocado_at: string | null
          revocado_por: string | null
        }
        Insert: {
          autorizado_at?: string
          autorizado_por: string
          corredor_profile_id: string
          id?: string
          motivo?: string | null
          operacion_id: string
          revocado_at?: string | null
          revocado_por?: string | null
        }
        Update: {
          autorizado_at?: string
          autorizado_por?: string
          corredor_profile_id?: string
          id?: string
          motivo?: string | null
          operacion_id?: string
          revocado_at?: string | null
          revocado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operacion_carta_porte_autorizaciones_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_carta_porte_autorizaciones_corredor_profile_id_fkey"
            columns: ["corredor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_carta_porte_autorizaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_carta_porte_autorizaciones_revocado_por_fkey"
            columns: ["revocado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_comision_pruebas: {
        Row: {
          actualizado_at: string
          archivo_path: string
          creado_at: string
          enviado_por: string
          estado: string
          id: string
          nombre_archivo: string
          observaciones: string | null
          operacion_id: string
          referencia_prueba: string
          tamano_bytes: number
        }
        Insert: {
          actualizado_at?: string
          archivo_path: string
          creado_at?: string
          enviado_por: string
          estado?: string
          id?: string
          nombre_archivo: string
          observaciones?: string | null
          operacion_id: string
          referencia_prueba: string
          tamano_bytes?: number
        }
        Update: {
          actualizado_at?: string
          archivo_path?: string
          creado_at?: string
          enviado_por?: string
          estado?: string
          id?: string
          nombre_archivo?: string
          observaciones?: string | null
          operacion_id?: string
          referencia_prueba?: string
          tamano_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "operacion_comision_pruebas_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_comision_retenciones: {
        Row: {
          actualizado_at: string
          comprobante_url: string | null
          creado_at: string
          empresa_pagadora_id: string
          enviado_por: string
          estado: string
          fecha_validacion_manual: string | null
          id: string
          importe: number
          liberado_at: string | null
          medio_pago: string
          moneda_id: number
          observaciones: string | null
          operacion_id: string
          referencia_bancaria_validada: string | null
          referencia_pago: string
          verificado_at: string | null
          verificado_por: string | null
        }
        Insert: {
          actualizado_at?: string
          comprobante_url?: string | null
          creado_at?: string
          empresa_pagadora_id: string
          enviado_por: string
          estado?: string
          fecha_validacion_manual?: string | null
          id?: string
          importe: number
          liberado_at?: string | null
          medio_pago?: string
          moneda_id: number
          observaciones?: string | null
          operacion_id: string
          referencia_bancaria_validada?: string | null
          referencia_pago: string
          verificado_at?: string | null
          verificado_por?: string | null
        }
        Update: {
          actualizado_at?: string
          comprobante_url?: string | null
          creado_at?: string
          empresa_pagadora_id?: string
          enviado_por?: string
          estado?: string
          fecha_validacion_manual?: string | null
          id?: string
          importe?: number
          liberado_at?: string | null
          medio_pago?: string
          moneda_id?: number
          observaciones?: string | null
          operacion_id?: string
          referencia_bancaria_validada?: string | null
          referencia_pago?: string
          verificado_at?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operacion_comision_retenciones_empresa_pagadora_id_fkey"
            columns: ["empresa_pagadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_comision_retenciones_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_comision_retenciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: true
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_comision_viajes: {
        Row: {
          estado: string
          id: string
          importe_asignado: number | null
          importe_liberado: number
          liberada_at: string | null
          liberada_por: string | null
          moneda_id: number | null
          operacion_id: string
          referencia: string
          retencion_id: string | null
          toneladas_entregadas: number
          valor_por_tn: number
          viaje_id: string
        }
        Insert: {
          estado?: string
          id?: string
          importe_asignado?: number | null
          importe_liberado: number
          liberada_at?: string | null
          liberada_por?: string | null
          moneda_id?: number | null
          operacion_id: string
          referencia: string
          retencion_id?: string | null
          toneladas_entregadas: number
          valor_por_tn?: number
          viaje_id: string
        }
        Update: {
          estado?: string
          id?: string
          importe_asignado?: number | null
          importe_liberado?: number
          liberada_at?: string | null
          liberada_por?: string | null
          moneda_id?: number | null
          operacion_id?: string
          referencia?: string
          retencion_id?: string | null
          toneladas_entregadas?: number
          valor_por_tn?: number
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacion_comision_viajes_liberada_por_fkey"
            columns: ["liberada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_comision_viajes_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_comision_viajes_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_comision_viajes_retencion_id_fkey"
            columns: ["retencion_id"]
            isOneToOne: false
            referencedRelation: "operacion_comision_retenciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_comision_viajes_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: true
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_comisiones: {
        Row: {
          actualizado_at: string
          cantidad_tn: number | null
          concepto: string
          creado_at: string
          empresa_id: string | null
          estado: string
          factura_estado: string
          fecha_pago: string | null
          id: string
          iva_importe: number | null
          iva_porcentaje: number | null
          medio_pago: string | null
          modalidad_calculo: string
          moneda_id: number | null
          observaciones: string | null
          operacion_id: string
          origen_comision: string | null
          porcentaje: number | null
          profile_id: string | null
          referencia_pago: string | null
          saldo_pagado: number
          saldo_pendiente: number
          saldo_reservado: number
          subtotal: number
          tipo_comision: string
          tipo_ganancia: string
          total: number
          valor_base: number | null
          valor_unitario: number | null
        }
        Insert: {
          actualizado_at?: string
          cantidad_tn?: number | null
          concepto: string
          creado_at?: string
          empresa_id?: string | null
          estado?: string
          factura_estado?: string
          fecha_pago?: string | null
          id?: string
          iva_importe?: number | null
          iva_porcentaje?: number | null
          medio_pago?: string | null
          modalidad_calculo?: string
          moneda_id?: number | null
          observaciones?: string | null
          operacion_id: string
          origen_comision?: string | null
          porcentaje?: number | null
          profile_id?: string | null
          referencia_pago?: string | null
          saldo_pagado?: number
          saldo_pendiente?: number
          saldo_reservado?: number
          subtotal?: number
          tipo_comision?: string
          tipo_ganancia?: string
          total?: number
          valor_base?: number | null
          valor_unitario?: number | null
        }
        Update: {
          actualizado_at?: string
          cantidad_tn?: number | null
          concepto?: string
          creado_at?: string
          empresa_id?: string | null
          estado?: string
          factura_estado?: string
          fecha_pago?: string | null
          id?: string
          iva_importe?: number | null
          iva_porcentaje?: number | null
          medio_pago?: string | null
          modalidad_calculo?: string
          moneda_id?: number | null
          observaciones?: string | null
          operacion_id?: string
          origen_comision?: string | null
          porcentaje?: number | null
          profile_id?: string | null
          referencia_pago?: string | null
          saldo_pagado?: number
          saldo_pendiente?: number
          saldo_reservado?: number
          subtotal?: number
          tipo_comision?: string
          tipo_ganancia?: string
          total?: number
          valor_base?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operacion_comisiones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_comisiones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_comisiones_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_control_comercial: {
        Row: {
          alias: string | null
          banco: string | null
          cancelacion_estado: string
          cancelacion_evidencia_url: string | null
          cancelacion_fecha: string | null
          cancelacion_justificativo: string | null
          cancelacion_motivo: string | null
          cancelacion_revision_estado: string | null
          cancelacion_revision_fecha: string | null
          cancelacion_revision_observaciones: string | null
          cancelacion_revision_por: string | null
          cancelacion_solicitada_por: string | null
          cantidad_cuotas: number | null
          cbu: string | null
          comision_estado: string
          comision_fecha_devolucion: string | null
          comision_fecha_pago: string | null
          comision_fecha_retencion: string | null
          comision_medio_pago: string | null
          comision_moneda: string | null
          comision_monto: number | null
          comision_referencia_pago: string | null
          comprador_firma_estado: string
          condiciones_financiacion: string | null
          condiciones_pago: string | null
          created_at: string
          cuit_titular_pago: string | null
          datos_operativos_estado: string
          datos_operativos_liberados_at: string | null
          entidad_financiera: string | null
          fecha_firma_comprador: string | null
          fecha_firma_intermediario: string | null
          fecha_firma_vendedor: string | null
          fecha_primer_vencimiento: string | null
          fondos_estado: string
          fondos_fecha_habilitacion: string | null
          fondos_fecha_liberacion: string | null
          fondos_referencia: string | null
          gastos_financieros: string | null
          id: string
          intermediario_firma_estado: string
          medio_pago: string | null
          moneda_pago: string | null
          no_elusion_aceptada: boolean
          no_elusion_aceptada_at: string | null
          no_elusion_observaciones: string | null
          operacion_id: string
          tasa_financiacion: number | null
          titular_pago: string | null
          updated_at: string
          vendedor_firma_estado: string
          visado_calidad: string | null
          visado_condicion: string | null
          visado_estado: string
          visado_fecha: string | null
          visado_humedad: string | null
          visado_motivo_rechazo: string | null
          visado_observaciones: string | null
          visado_proteina: string | null
          visado_responsable: string | null
          visado_resultado: string | null
        }
        Insert: {
          alias?: string | null
          banco?: string | null
          cancelacion_estado?: string
          cancelacion_evidencia_url?: string | null
          cancelacion_fecha?: string | null
          cancelacion_justificativo?: string | null
          cancelacion_motivo?: string | null
          cancelacion_revision_estado?: string | null
          cancelacion_revision_fecha?: string | null
          cancelacion_revision_observaciones?: string | null
          cancelacion_revision_por?: string | null
          cancelacion_solicitada_por?: string | null
          cantidad_cuotas?: number | null
          cbu?: string | null
          comision_estado?: string
          comision_fecha_devolucion?: string | null
          comision_fecha_pago?: string | null
          comision_fecha_retencion?: string | null
          comision_medio_pago?: string | null
          comision_moneda?: string | null
          comision_monto?: number | null
          comision_referencia_pago?: string | null
          comprador_firma_estado?: string
          condiciones_financiacion?: string | null
          condiciones_pago?: string | null
          created_at?: string
          cuit_titular_pago?: string | null
          datos_operativos_estado?: string
          datos_operativos_liberados_at?: string | null
          entidad_financiera?: string | null
          fecha_firma_comprador?: string | null
          fecha_firma_intermediario?: string | null
          fecha_firma_vendedor?: string | null
          fecha_primer_vencimiento?: string | null
          fondos_estado?: string
          fondos_fecha_habilitacion?: string | null
          fondos_fecha_liberacion?: string | null
          fondos_referencia?: string | null
          gastos_financieros?: string | null
          id?: string
          intermediario_firma_estado?: string
          medio_pago?: string | null
          moneda_pago?: string | null
          no_elusion_aceptada?: boolean
          no_elusion_aceptada_at?: string | null
          no_elusion_observaciones?: string | null
          operacion_id: string
          tasa_financiacion?: number | null
          titular_pago?: string | null
          updated_at?: string
          vendedor_firma_estado?: string
          visado_calidad?: string | null
          visado_condicion?: string | null
          visado_estado?: string
          visado_fecha?: string | null
          visado_humedad?: string | null
          visado_motivo_rechazo?: string | null
          visado_observaciones?: string | null
          visado_proteina?: string | null
          visado_responsable?: string | null
          visado_resultado?: string | null
        }
        Update: {
          alias?: string | null
          banco?: string | null
          cancelacion_estado?: string
          cancelacion_evidencia_url?: string | null
          cancelacion_fecha?: string | null
          cancelacion_justificativo?: string | null
          cancelacion_motivo?: string | null
          cancelacion_revision_estado?: string | null
          cancelacion_revision_fecha?: string | null
          cancelacion_revision_observaciones?: string | null
          cancelacion_revision_por?: string | null
          cancelacion_solicitada_por?: string | null
          cantidad_cuotas?: number | null
          cbu?: string | null
          comision_estado?: string
          comision_fecha_devolucion?: string | null
          comision_fecha_pago?: string | null
          comision_fecha_retencion?: string | null
          comision_medio_pago?: string | null
          comision_moneda?: string | null
          comision_monto?: number | null
          comision_referencia_pago?: string | null
          comprador_firma_estado?: string
          condiciones_financiacion?: string | null
          condiciones_pago?: string | null
          created_at?: string
          cuit_titular_pago?: string | null
          datos_operativos_estado?: string
          datos_operativos_liberados_at?: string | null
          entidad_financiera?: string | null
          fecha_firma_comprador?: string | null
          fecha_firma_intermediario?: string | null
          fecha_firma_vendedor?: string | null
          fecha_primer_vencimiento?: string | null
          fondos_estado?: string
          fondos_fecha_habilitacion?: string | null
          fondos_fecha_liberacion?: string | null
          fondos_referencia?: string | null
          gastos_financieros?: string | null
          id?: string
          intermediario_firma_estado?: string
          medio_pago?: string | null
          moneda_pago?: string | null
          no_elusion_aceptada?: boolean
          no_elusion_aceptada_at?: string | null
          no_elusion_observaciones?: string | null
          operacion_id?: string
          tasa_financiacion?: number | null
          titular_pago?: string | null
          updated_at?: string
          vendedor_firma_estado?: string
          visado_calidad?: string | null
          visado_condicion?: string | null
          visado_estado?: string
          visado_fecha?: string | null
          visado_humedad?: string | null
          visado_motivo_rechazo?: string | null
          visado_observaciones?: string | null
          visado_proteina?: string | null
          visado_responsable?: string | null
          visado_resultado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operacion_control_comercial_cancelacion_revision_por_fkey"
            columns: ["cancelacion_revision_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_control_comercial_cancelacion_solicitada_por_fkey"
            columns: ["cancelacion_solicitada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_control_comercial_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: true
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_documentos_fiscales: {
        Row: {
          actualizado_at: string
          ambiente: string
          cae: string | null
          cae_vencimiento: string | null
          coe: string | null
          comision_id: string | null
          creado_at: string
          cuit_emisor: string | null
          cuit_receptor: string | null
          empresa_emisora_id: string | null
          empresa_receptora_id: string | null
          error_codigo: string | null
          error_mensaje: string | null
          estado_fiscal: string
          estado_sistema: string
          external_id: string | null
          fecha_emision: string | null
          fecha_vencimiento: string | null
          id: string
          importe_iva: number | null
          importe_neto: number | null
          importe_total: number | null
          moneda: string | null
          numero_comprobante: number | null
          operacion_id: string
          organismo: string
          profile_emisor_id: string | null
          punto_venta: number | null
          request_xml: string | null
          response_json: Json | null
          response_xml: string | null
          servicio: string | null
          solicitud_id: string | null
          tipo_cambio: number | null
          tipo_comprobante: number | null
          tipo_documento: string
        }
        Insert: {
          actualizado_at?: string
          ambiente?: string
          cae?: string | null
          cae_vencimiento?: string | null
          coe?: string | null
          comision_id?: string | null
          creado_at?: string
          cuit_emisor?: string | null
          cuit_receptor?: string | null
          empresa_emisora_id?: string | null
          empresa_receptora_id?: string | null
          error_codigo?: string | null
          error_mensaje?: string | null
          estado_fiscal?: string
          estado_sistema?: string
          external_id?: string | null
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          importe_iva?: number | null
          importe_neto?: number | null
          importe_total?: number | null
          moneda?: string | null
          numero_comprobante?: number | null
          operacion_id: string
          organismo?: string
          profile_emisor_id?: string | null
          punto_venta?: number | null
          request_xml?: string | null
          response_json?: Json | null
          response_xml?: string | null
          servicio?: string | null
          solicitud_id?: string | null
          tipo_cambio?: number | null
          tipo_comprobante?: number | null
          tipo_documento: string
        }
        Update: {
          actualizado_at?: string
          ambiente?: string
          cae?: string | null
          cae_vencimiento?: string | null
          coe?: string | null
          comision_id?: string | null
          creado_at?: string
          cuit_emisor?: string | null
          cuit_receptor?: string | null
          empresa_emisora_id?: string | null
          empresa_receptora_id?: string | null
          error_codigo?: string | null
          error_mensaje?: string | null
          estado_fiscal?: string
          estado_sistema?: string
          external_id?: string | null
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          importe_iva?: number | null
          importe_neto?: number | null
          importe_total?: number | null
          moneda?: string | null
          numero_comprobante?: number | null
          operacion_id?: string
          organismo?: string
          profile_emisor_id?: string | null
          punto_venta?: number | null
          request_xml?: string | null
          response_json?: Json | null
          response_xml?: string | null
          servicio?: string | null
          solicitud_id?: string | null
          tipo_cambio?: number | null
          tipo_comprobante?: number | null
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacion_documentos_fiscales_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "operacion_comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_documentos_fiscales_empresa_emisora_id_fkey"
            columns: ["empresa_emisora_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_documentos_fiscales_empresa_receptora_id_fkey"
            columns: ["empresa_receptora_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_documentos_fiscales_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_documentos_fiscales_profile_emisor_id_fkey"
            columns: ["profile_emisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_liquidacion: {
        Row: {
          ajustes_usd: number
          cantidad_contractual_tn: number
          cantidad_entregada_tn: number
          comision_agrobroker_usd: number
          confirmado_por: string | null
          creado_at: string
          creado_por: string | null
          deducciones_usd: number
          diferencia_tn: number
          estado: string
          fecha_liquidacion: string | null
          id: string
          importe_bruto_usd: number
          importe_neto_usd: number
          kilos_entregados: number
          observaciones: string | null
          operacion_id: string
          precio_tn: number
          referencia_comprobante: string | null
          updated_at: string
        }
        Insert: {
          ajustes_usd?: number
          cantidad_contractual_tn?: number
          cantidad_entregada_tn?: number
          comision_agrobroker_usd?: number
          confirmado_por?: string | null
          creado_at?: string
          creado_por?: string | null
          deducciones_usd?: number
          diferencia_tn?: number
          estado?: string
          fecha_liquidacion?: string | null
          id?: string
          importe_bruto_usd?: number
          importe_neto_usd?: number
          kilos_entregados?: number
          observaciones?: string | null
          operacion_id: string
          precio_tn?: number
          referencia_comprobante?: string | null
          updated_at?: string
        }
        Update: {
          ajustes_usd?: number
          cantidad_contractual_tn?: number
          cantidad_entregada_tn?: number
          comision_agrobroker_usd?: number
          confirmado_por?: string | null
          creado_at?: string
          creado_por?: string | null
          deducciones_usd?: number
          diferencia_tn?: number
          estado?: string
          fecha_liquidacion?: string | null
          id?: string
          importe_bruto_usd?: number
          importe_neto_usd?: number
          kilos_entregados?: number
          observaciones?: string | null
          operacion_id?: string
          precio_tn?: number
          referencia_comprobante?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacion_liquidacion_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_logistica: {
        Row: {
          actualizado_por: string | null
          carta_porte_codigo: string | null
          carta_porte_estado: string | null
          carta_porte_fecha_emision: string | null
          carta_porte_fecha_vencimiento: string | null
          carta_porte_numero: string | null
          carta_porte_origen: string | null
          carta_porte_qr: string | null
          carta_porte_response: Json | null
          carta_porte_verificada_at: string | null
          chofer_documento: string | null
          chofer_nombre: string | null
          creado_at: string
          creado_por: string | null
          destino: string | null
          estado: string
          fecha_carga: string | null
          fecha_entrega: string | null
          fecha_estimada_entrega: string | null
          hora_carga: string | null
          id: string
          kilos_entregados: number | null
          numero_turno: string | null
          observaciones_entrega: string | null
          operacion_id: string
          patente_acoplado: string | null
          patente_camion: string | null
          transportista: string | null
          transportista_cuit: string | null
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          carta_porte_codigo?: string | null
          carta_porte_estado?: string | null
          carta_porte_fecha_emision?: string | null
          carta_porte_fecha_vencimiento?: string | null
          carta_porte_numero?: string | null
          carta_porte_origen?: string | null
          carta_porte_qr?: string | null
          carta_porte_response?: Json | null
          carta_porte_verificada_at?: string | null
          chofer_documento?: string | null
          chofer_nombre?: string | null
          creado_at?: string
          creado_por?: string | null
          destino?: string | null
          estado?: string
          fecha_carga?: string | null
          fecha_entrega?: string | null
          fecha_estimada_entrega?: string | null
          hora_carga?: string | null
          id?: string
          kilos_entregados?: number | null
          numero_turno?: string | null
          observaciones_entrega?: string | null
          operacion_id: string
          patente_acoplado?: string | null
          patente_camion?: string | null
          transportista?: string | null
          transportista_cuit?: string | null
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          carta_porte_codigo?: string | null
          carta_porte_estado?: string | null
          carta_porte_fecha_emision?: string | null
          carta_porte_fecha_vencimiento?: string | null
          carta_porte_numero?: string | null
          carta_porte_origen?: string | null
          carta_porte_qr?: string | null
          carta_porte_response?: Json | null
          carta_porte_verificada_at?: string | null
          chofer_documento?: string | null
          chofer_nombre?: string | null
          creado_at?: string
          creado_por?: string | null
          destino?: string | null
          estado?: string
          fecha_carga?: string | null
          fecha_entrega?: string | null
          fecha_estimada_entrega?: string | null
          hora_carga?: string | null
          id?: string
          kilos_entregados?: number | null
          numero_turno?: string | null
          observaciones_entrega?: string | null
          operacion_id?: string
          patente_acoplado?: string | null
          patente_camion?: string | null
          transportista?: string | null
          transportista_cuit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacion_logistica_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_movimientos_economicos: {
        Row: {
          actualizado_at: string
          comision_id: string | null
          concepto: string
          creado_at: string
          empresa_id: string | null
          estado: string
          fecha_movimiento: string
          id: string
          importe: number
          moneda_id: number | null
          operacion_id: string
          profile_id: string | null
          referencia: string | null
          signo: number
          tipo_movimiento: string
        }
        Insert: {
          actualizado_at?: string
          comision_id?: string | null
          concepto: string
          creado_at?: string
          empresa_id?: string | null
          estado?: string
          fecha_movimiento?: string
          id?: string
          importe?: number
          moneda_id?: number | null
          operacion_id: string
          profile_id?: string | null
          referencia?: string | null
          signo?: number
          tipo_movimiento: string
        }
        Update: {
          actualizado_at?: string
          comision_id?: string | null
          concepto?: string
          creado_at?: string
          empresa_id?: string | null
          estado?: string
          fecha_movimiento?: string
          id?: string
          importe?: number
          moneda_id?: number | null
          operacion_id?: string
          profile_id?: string | null
          referencia?: string | null
          signo?: number
          tipo_movimiento?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacion_movimientos_economicos_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "operacion_comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_movimientos_economicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_movimientos_economicos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_movimientos_economicos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_participantes: {
        Row: {
          creada_en: string | null
          empresa_id: string
          factura_aprobada: boolean | null
          factura_presentada: boolean | null
          id: string
          monto_comision: number | null
          operacion_id: string
          porcentaje_comision: number | null
          rol: string
        }
        Insert: {
          creada_en?: string | null
          empresa_id: string
          factura_aprobada?: boolean | null
          factura_presentada?: boolean | null
          id?: string
          monto_comision?: number | null
          operacion_id: string
          porcentaje_comision?: number | null
          rol: string
        }
        Update: {
          creada_en?: string | null
          empresa_id?: string
          factura_aprobada?: boolean | null
          factura_presentada?: boolean | null
          id?: string
          monto_comision?: number | null
          operacion_id?: string
          porcentaje_comision?: number | null
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacion_participantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_participantes_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_workflow: {
        Row: {
          creado_en: string | null
          estado: string | null
          etapa_actual_id: string | null
          id: string
          operacion_id: string
          workflow_id: string
        }
        Insert: {
          creado_en?: string | null
          estado?: string | null
          etapa_actual_id?: string | null
          id?: string
          operacion_id: string
          workflow_id: string
        }
        Update: {
          creado_en?: string | null
          estado?: string | null
          etapa_actual_id?: string | null
          id?: string
          operacion_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacion_workflow_etapa_actual_id_fkey"
            columns: ["etapa_actual_id"]
            isOneToOne: false
            referencedRelation: "workflow_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_workflow_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_workflow_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      operaciones: {
        Row: {
          actualizada_en: string | null
          cantidad_original: number | null
          cantidad_tn: number
          codigo: string
          creada_en: string | null
          estado: string | null
          factor_normalizacion: number | null
          fecha_operacion: string | null
          id: string
          importe_total: number | null
          incoterm_id: number | null
          modalidad_comercial: string | null
          moneda_id: number | null
          precio_tn: number
          publicacion_compra_id: string | null
          publicacion_venta_id: string | null
          unidad_base: string | null
          unidad_original: string | null
        }
        Insert: {
          actualizada_en?: string | null
          cantidad_original?: number | null
          cantidad_tn: number
          codigo: string
          creada_en?: string | null
          estado?: string | null
          factor_normalizacion?: number | null
          fecha_operacion?: string | null
          id?: string
          importe_total?: number | null
          incoterm_id?: number | null
          modalidad_comercial?: string | null
          moneda_id?: number | null
          precio_tn: number
          publicacion_compra_id?: string | null
          publicacion_venta_id?: string | null
          unidad_base?: string | null
          unidad_original?: string | null
        }
        Update: {
          actualizada_en?: string | null
          cantidad_original?: number | null
          cantidad_tn?: number
          codigo?: string
          creada_en?: string | null
          estado?: string | null
          factor_normalizacion?: number | null
          fecha_operacion?: string | null
          id?: string
          importe_total?: number | null
          incoterm_id?: number | null
          modalidad_comercial?: string | null
          moneda_id?: number | null
          precio_tn?: number
          publicacion_compra_id?: string | null
          publicacion_venta_id?: string | null
          unidad_base?: string | null
          unidad_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operaciones_incoterm_id_fkey"
            columns: ["incoterm_id"]
            isOneToOne: false
            referencedRelation: "incoterms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_publicacion_compra_id_fkey"
            columns: ["publicacion_compra_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_publicacion_compra_id_fkey"
            columns: ["publicacion_compra_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_publicacion_venta_id_fkey"
            columns: ["publicacion_venta_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_publicacion_venta_id_fkey"
            columns: ["publicacion_venta_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          cantidad: number | null
          comprador_company_id: string | null
          created_at: string | null
          estado: Database["public"]["Enums"]["operation_status"] | null
          fecha_operacion: string | null
          id: string
          moneda: string | null
          offer_id: string
          precio: number | null
          updated_at: string | null
          vendedor_company_id: string | null
        }
        Insert: {
          cantidad?: number | null
          comprador_company_id?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["operation_status"] | null
          fecha_operacion?: string | null
          id?: string
          moneda?: string | null
          offer_id: string
          precio?: number | null
          updated_at?: string | null
          vendedor_company_id?: string | null
        }
        Update: {
          cantidad?: number | null
          comprador_company_id?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["operation_status"] | null
          fecha_operacion?: string | null
          id?: string
          moneda?: string | null
          offer_id?: string
          precio?: number | null
          updated_at?: string | null
          vendedor_company_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operations_comprador_company_id_fkey"
            columns: ["comprador_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_vendedor_company_id_fkey"
            columns: ["vendedor_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidades: {
        Row: {
          creada_en: string | null
          detalles: Json
          distancia_km: number | null
          empresa_id: string
          estado: string | null
          id: string
          indice_compatibilidad: number | null
          publicacion_id: string
        }
        Insert: {
          creada_en?: string | null
          detalles?: Json
          distancia_km?: number | null
          empresa_id: string
          estado?: string | null
          id?: string
          indice_compatibilidad?: number | null
          publicacion_id: string
        }
        Update: {
          creada_en?: string | null
          detalles?: Json
          distancia_km?: number | null
          empresa_id?: string
          estado?: string | null
          id?: string
          indice_compatibilidad?: number | null
          publicacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_inteligentes_coincidencias: {
        Row: {
          comprador_empresa_id: string
          creado_at: string
          estado: string
          id: string
          notificado_at: string | null
          orden_id: string
          score_cobertura_pct: number | null
          score_confianza: number | null
        }
        Insert: {
          comprador_empresa_id: string
          creado_at?: string
          estado?: string
          id?: string
          notificado_at?: string | null
          orden_id: string
          score_cobertura_pct?: number | null
          score_confianza?: number | null
        }
        Update: {
          comprador_empresa_id?: string
          creado_at?: string
          estado?: string
          id?: string
          notificado_at?: string | null
          orden_id?: string
          score_cobertura_pct?: number | null
          score_confianza?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_inteligentes_coincidencias_comprador_empresa_id_fkey"
            columns: ["comprador_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_inteligentes_coincidencias_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_inteligentes_pizarra"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_inteligentes_pizarra: {
        Row: {
          activada_at: string | null
          actualizado_at: string
          cancelada_at: string | null
          creado_at: string
          creado_por: string
          estado: string
          expira_at: string | null
          id: string
          mercado_referencia: string
          minimo_score_premium: number
          moneda: string
          precio_limite: number
          producto_id: number
          productor_empresa_id: string
          solo_compradores_premium: boolean
          tipo_precio: string
          toneladas_objetivo: number
          ultima_cotizacion_id: string | null
          ultima_evaluacion_at: string | null
          ultimo_precio_observado: number | null
        }
        Insert: {
          activada_at?: string | null
          actualizado_at?: string
          cancelada_at?: string | null
          creado_at?: string
          creado_por: string
          estado?: string
          expira_at?: string | null
          id?: string
          mercado_referencia?: string
          minimo_score_premium?: number
          moneda?: string
          precio_limite: number
          producto_id: number
          productor_empresa_id: string
          solo_compradores_premium?: boolean
          tipo_precio?: string
          toneladas_objetivo: number
          ultima_cotizacion_id?: string | null
          ultima_evaluacion_at?: string | null
          ultimo_precio_observado?: number | null
        }
        Update: {
          activada_at?: string | null
          actualizado_at?: string
          cancelada_at?: string | null
          creado_at?: string
          creado_por?: string
          estado?: string
          expira_at?: string | null
          id?: string
          mercado_referencia?: string
          minimo_score_premium?: number
          moneda?: string
          precio_limite?: number
          producto_id?: number
          productor_empresa_id?: string
          solo_compradores_premium?: boolean
          tipo_precio?: string
          toneladas_objetivo?: number
          ultima_cotizacion_id?: string | null
          ultima_evaluacion_at?: string | null
          ultimo_precio_observado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_inteligentes_pizarra_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_inteligentes_pizarra_productor_empresa_id_fkey"
            columns: ["productor_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_inteligentes_pizarra_ultima_cotizacion_id_fkey"
            columns: ["ultima_cotizacion_id"]
            isOneToOne: false
            referencedRelation: "market_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      padron_lookup_rate_limits: {
        Row: {
          ip_hash: string
          request_count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          ip_hash: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          ip_hash?: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      pagos: {
        Row: {
          comprobante: string | null
          creado_en: string | null
          empresa_cobradora: string | null
          empresa_pagadora: string | null
          estado: string | null
          fecha_pago: string | null
          id: string
          importe: number | null
          metodo_pago: string | null
          moneda_id: number | null
          operacion_id: string
        }
        Insert: {
          comprobante?: string | null
          creado_en?: string | null
          empresa_cobradora?: string | null
          empresa_pagadora?: string | null
          estado?: string | null
          fecha_pago?: string | null
          id?: string
          importe?: number | null
          metodo_pago?: string | null
          moneda_id?: number | null
          operacion_id: string
        }
        Update: {
          comprobante?: string | null
          creado_en?: string | null
          empresa_cobradora?: string | null
          empresa_pagadora?: string | null
          estado?: string | null
          fecha_pago?: string | null
          id?: string
          importe?: number | null
          metodo_pago?: string | null
          moneda_id?: number | null
          operacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_empresa_cobradora_fkey"
            columns: ["empresa_cobradora"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_empresa_pagadora_fkey"
            columns: ["empresa_pagadora"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      paises: {
        Row: {
          activo: boolean | null
          codigo_iso: string
          emoji: string | null
          id: number
          nombre: string
          region: string | null
          subregion: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo_iso: string
          emoji?: string | null
          id?: number
          nombre: string
          region?: string | null
          subregion?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo_iso?: string
          emoji?: string | null
          id?: number
          nombre?: string
          region?: string | null
          subregion?: string | null
        }
        Relationships: []
      }
      partes_operacion: {
        Row: {
          contacto_id: string | null
          created_at: string
          cuit: string | null
          dni: string | null
          domicilio: string | null
          email: string | null
          id: string
          localidad: string | null
          nombre_razon_social: string
          operacion_id: string
          orden_firma: number | null
          provincia: string | null
          representante_cargo: string | null
          representante_dni: string | null
          representante_nombre: string | null
          rol: string
          telefono: string | null
          tipo_persona: string
          updated_at: string
        }
        Insert: {
          contacto_id?: string | null
          created_at?: string
          cuit?: string | null
          dni?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre_razon_social: string
          operacion_id: string
          orden_firma?: number | null
          provincia?: string | null
          representante_cargo?: string | null
          representante_dni?: string | null
          representante_nombre?: string | null
          rol: string
          telefono?: string | null
          tipo_persona?: string
          updated_at?: string
        }
        Update: {
          contacto_id?: string | null
          created_at?: string
          cuit?: string | null
          dni?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre_razon_social?: string
          operacion_id?: string
          orden_firma?: number | null
          provincia?: string | null
          representante_cargo?: string | null
          representante_dni?: string | null
          representante_nombre?: string | null
          rol?: string
          telefono?: string | null
          tipo_persona?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partes_operacion_contacto_id_fkey"
            columns: ["contacto_id"]
            isOneToOne: false
            referencedRelation: "contactos_comerciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_operacion_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_contrato: {
        Row: {
          activa: boolean
          clausulas: Json
          codigo: string
          created_at: string
          id: string
          nombre: string
          tipo_contrato: string
          updated_at: string
          version: number
        }
        Insert: {
          activa?: boolean
          clausulas?: Json
          codigo: string
          created_at?: string
          id?: string
          nombre: string
          tipo_contrato: string
          updated_at?: string
          version?: number
        }
        Update: {
          activa?: boolean
          clausulas?: Json
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          tipo_contrato?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_payment_accounts: {
        Row: {
          account_holder: string
          account_type: string | null
          active: boolean
          alias: string | null
          bank_name: string
          cbu: string
          created_at: string
          created_by: string | null
          currency: string
          holder_tax_id: string | null
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_holder: string
          account_type?: string | null
          active?: boolean
          alias?: string | null
          bank_name: string
          cbu: string
          created_at?: string
          created_by?: string | null
          currency?: string
          holder_tax_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_type?: string | null
          active?: boolean
          alias?: string | null
          bank_name?: string
          cbu?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          holder_tax_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      postulaciones_logistica: {
        Row: {
          creado_at: string
          creado_por: string
          empresa_transportista_id: string
          estado: string
          id: string
          id_demanda_flete: string
          id_oferta_flete: string
        }
        Insert: {
          creado_at?: string
          creado_por: string
          empresa_transportista_id: string
          estado?: string
          id?: string
          id_demanda_flete: string
          id_oferta_flete: string
        }
        Update: {
          creado_at?: string
          creado_por?: string
          empresa_transportista_id?: string
          estado?: string
          id?: string
          id_demanda_flete?: string
          id_oferta_flete?: string
        }
        Relationships: [
          {
            foreignKeyName: "postulaciones_logistica_empresa_transportista_id_fkey"
            columns: ["empresa_transportista_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulaciones_logistica_id_demanda_flete_fkey"
            columns: ["id_demanda_flete"]
            isOneToOne: false
            referencedRelation: "demandas_logistica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulaciones_logistica_id_oferta_flete_fkey"
            columns: ["id_oferta_flete"]
            isOneToOne: false
            referencedRelation: "ofertas_logistica"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_calculations: {
        Row: {
          base_price: number | null
          commission: number
          commodity_id: string | null
          created_at: string
          currency: string
          discount: number
          final_price: number | null
          formula: string
          freight: number
          id: string
          market_quote_id: string | null
          operation_id: string | null
          other_costs: number
          premium: number
          price_type: string
          product_id: number | null
          quantity: number
          snapshot: Json
          taxes: number
          unit: string
        }
        Insert: {
          base_price?: number | null
          commission?: number
          commodity_id?: string | null
          created_at?: string
          currency: string
          discount?: number
          final_price?: number | null
          formula: string
          freight?: number
          id?: string
          market_quote_id?: string | null
          operation_id?: string | null
          other_costs?: number
          premium?: number
          price_type: string
          product_id?: number | null
          quantity: number
          snapshot?: Json
          taxes?: number
          unit: string
        }
        Update: {
          base_price?: number | null
          commission?: number
          commodity_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          final_price?: number | null
          formula?: string
          freight?: number
          id?: string
          market_quote_id?: string | null
          operation_id?: string | null
          other_costs?: number
          premium?: number
          price_type?: string
          product_id?: number | null
          quantity?: number
          snapshot?: Json
          taxes?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_calculations_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_calculations_market_quote_id_fkey"
            columns: ["market_quote_id"]
            isOneToOne: false
            referencedRelation: "market_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_calculations_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_calculations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean | null
          categoria: string | null
          codigo: string
          id: number
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          codigo: string
          id?: number
          nombre: string
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          codigo?: string
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          activo: boolean | null
          categoria: string | null
          created_at: string | null
          id: string
          nombre: string
          unidad: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          id?: string
          nombre: string
          unidad?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          id?: string
          nombre?: string
          unidad?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_company_id: string | null
          created_at: string | null
          cuit: string | null
          email: string | null
          empresa: string | null
          formato_fecha: string | null
          formato_numero: string | null
          id: string
          idioma: string | null
          idioma_preferido: string
          is_verified: boolean
          nombre: string | null
          pais_iso: string | null
          provincia: string | null
          telefono: string | null
          tipo_usuario: string | null
          verification_notes: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
          zona_horaria: string | null
        }
        Insert: {
          active_company_id?: string | null
          created_at?: string | null
          cuit?: string | null
          email?: string | null
          empresa?: string | null
          formato_fecha?: string | null
          formato_numero?: string | null
          id: string
          idioma?: string | null
          idioma_preferido?: string
          is_verified?: boolean
          nombre?: string | null
          pais_iso?: string | null
          provincia?: string | null
          telefono?: string | null
          tipo_usuario?: string | null
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          zona_horaria?: string | null
        }
        Update: {
          active_company_id?: string | null
          created_at?: string | null
          cuit?: string | null
          email?: string | null
          empresa?: string | null
          formato_fecha?: string | null
          formato_numero?: string | null
          id?: string
          idioma?: string | null
          idioma_preferido?: string
          is_verified?: boolean
          nombre?: string | null
          pais_iso?: string | null
          provincia?: string | null
          telefono?: string | null
          tipo_usuario?: string | null
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          zona_horaria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      propuestas_publicacion: {
        Row: {
          cantidad_tn: number
          conversacion_id: string
          creada_at: string
          emisor_empresa_id: string
          emisor_profile_id: string
          estado: string
          id: string
          moneda_id: number | null
          observaciones: string | null
          operacion_id: string | null
          precio_tn: number
          propuesta_anterior_id: string | null
          publicacion_id: string
          respondida_at: string | null
        }
        Insert: {
          cantidad_tn: number
          conversacion_id: string
          creada_at?: string
          emisor_empresa_id: string
          emisor_profile_id: string
          estado?: string
          id?: string
          moneda_id?: number | null
          observaciones?: string | null
          operacion_id?: string | null
          precio_tn: number
          propuesta_anterior_id?: string | null
          publicacion_id: string
          respondida_at?: string | null
        }
        Update: {
          cantidad_tn?: number
          conversacion_id?: string
          creada_at?: string
          emisor_empresa_id?: string
          emisor_profile_id?: string
          estado?: string
          id?: string
          moneda_id?: number | null
          observaciones?: string | null
          operacion_id?: string | null
          precio_tn?: number
          propuesta_anterior_id?: string | null
          publicacion_id?: string
          respondida_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propuestas_publicacion_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones_publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_publicacion_emisor_empresa_id_fkey"
            columns: ["emisor_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_publicacion_emisor_profile_id_fkey"
            columns: ["emisor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_publicacion_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_publicacion_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_publicacion_propuesta_anterior_id_fkey"
            columns: ["propuesta_anterior_id"]
            isOneToOne: false
            referencedRelation: "propuestas_publicacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_publicacion_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propuestas_publicacion_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
        ]
      }
      prorrogas_contrato: {
        Row: {
          contrato_id: string
          created_at: string
          datos_adicionales: Json
          dias_aprobados: number | null
          dias_solicitados: number
          estado_revision: string
          evidencia_url: string | null
          id: string
          justificativo: string
          motivo: string
          observaciones_revision: string | null
          operacion_id: string
          revisada_at: string | null
          revisada_por: string | null
          solicitada_por: string
          updated_at: string
          vencimiento_aprobado_at: string | null
          vencimiento_solicitado_at: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          datos_adicionales?: Json
          dias_aprobados?: number | null
          dias_solicitados: number
          estado_revision?: string
          evidencia_url?: string | null
          id?: string
          justificativo: string
          motivo: string
          observaciones_revision?: string | null
          operacion_id: string
          revisada_at?: string | null
          revisada_por?: string | null
          solicitada_por: string
          updated_at?: string
          vencimiento_aprobado_at?: string | null
          vencimiento_solicitado_at: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          datos_adicionales?: Json
          dias_aprobados?: number | null
          dias_solicitados?: number
          estado_revision?: string
          evidencia_url?: string | null
          id?: string
          justificativo?: string
          motivo?: string
          observaciones_revision?: string | null
          operacion_id?: string
          revisada_at?: string | null
          revisada_por?: string | null
          solicitada_por?: string
          updated_at?: string
          vencimiento_aprobado_at?: string | null
          vencimiento_solicitado_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prorrogas_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prorrogas_contrato_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      prospeccion_fuentes: {
        Row: {
          activo: boolean
          base_url: string | null
          created_at: string
          id: string
          nombre: string
          politicas_aceptadas: boolean
          requiere_credenciales: boolean
          tipo: string
        }
        Insert: {
          activo?: boolean
          base_url?: string | null
          created_at?: string
          id?: string
          nombre: string
          politicas_aceptadas?: boolean
          requiere_credenciales?: boolean
          tipo: string
        }
        Update: {
          activo?: boolean
          base_url?: string | null
          created_at?: string
          id?: string
          nombre?: string
          politicas_aceptadas?: boolean
          requiere_credenciales?: boolean
          tipo?: string
        }
        Relationships: []
      }
      prospectos_campana: {
        Row: {
          campana_id: string
          enviado_at: string | null
          estado: string
          id: string
          mensaje_generado: string | null
          prospecto_id: string
          responded_at: string | null
          score: number | null
        }
        Insert: {
          campana_id: string
          enviado_at?: string | null
          estado?: string
          id?: string
          mensaje_generado?: string | null
          prospecto_id: string
          responded_at?: string | null
          score?: number | null
        }
        Update: {
          campana_id?: string
          enviado_at?: string | null
          estado?: string
          id?: string
          mensaje_generado?: string | null
          prospecto_id?: string
          responded_at?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prospectos_campana_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "campanas_prospeccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospectos_campana_prospecto_id_fkey"
            columns: ["prospecto_id"]
            isOneToOne: false
            referencedRelation: "prospectos_comerciales"
            referencedColumns: ["id"]
          },
        ]
      }
      prospectos_comerciales: {
        Row: {
          company_id: string | null
          consentimiento_contacto: boolean
          contacto_nombre: string | null
          created_at: string
          created_by: string | null
          email: string | null
          empresa_id: string | null
          estado: string
          fuente: string
          fuente_referencia: string | null
          id: string
          localidad: string | null
          nombre_empresa: string | null
          notas: string | null
          pais: string | null
          productos: string[]
          provincia: string | null
          score: number | null
          sitio_web: string | null
          telefono: string | null
          tipo_prospecto: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          consentimiento_contacto?: boolean
          contacto_nombre?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          empresa_id?: string | null
          estado?: string
          fuente: string
          fuente_referencia?: string | null
          id?: string
          localidad?: string | null
          nombre_empresa?: string | null
          notas?: string | null
          pais?: string | null
          productos?: string[]
          provincia?: string | null
          score?: number | null
          sitio_web?: string | null
          telefono?: string | null
          tipo_prospecto: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          consentimiento_contacto?: boolean
          contacto_nombre?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          empresa_id?: string | null
          estado?: string
          fuente?: string
          fuente_referencia?: string | null
          id?: string
          localidad?: string | null
          nombre_empresa?: string | null
          notas?: string | null
          pais?: string | null
          productos?: string[]
          provincia?: string | null
          score?: number | null
          sitio_web?: string | null
          telefono?: string | null
          tipo_prospecto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospectos_comerciales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospectos_comerciales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospectos_comerciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      provincias: {
        Row: {
          activo: boolean | null
          codigo: string | null
          codigo_externo: string | null
          id: number
          latitud: number | null
          longitud: number | null
          nombre: string
          pais_id: number | null
          tipo: string
        }
        Insert: {
          activo?: boolean | null
          codigo?: string | null
          codigo_externo?: string | null
          id?: number
          latitud?: number | null
          longitud?: number | null
          nombre: string
          pais_id?: number | null
          tipo?: string
        }
        Update: {
          activo?: boolean | null
          codigo?: string | null
          codigo_externo?: string | null
          id?: number
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          pais_id?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "provincias_pais_id_fkey"
            columns: ["pais_id"]
            isOneToOne: false
            referencedRelation: "paises"
            referencedColumns: ["id"]
          },
        ]
      }
      publicaciones: {
        Row: {
          actualizada_en: string | null
          aflatoxinas_max_ppb: number | null
          base_precio_cbot: boolean
          calidad: string | null
          cantidad_envios: number | null
          cantidad_original: number | null
          cantidad_tn: number
          categoria_destino:
            | Database["public"]["Enums"]["tipo_destino_grano"]
            | null
          creada_en: string | null
          destino_homologado_id: number | null
          direccion_destino: string | null
          empresa_id: string | null
          estado: string | null
          factor_normalizacion: number | null
          fecha_disponible: string | null
          fecha_vencimiento: string | null
          granos_danados_maximos: number | null
          granos_quebrados_maximos: number | null
          humedad: number | null
          humedad_maxima: number | null
          id: string
          incoterm_id: number | null
          instrumentos_pago_internacional: string[]
          intermediario_empresa_id: string | null
          localidad: string | null
          localidad_destino: string | null
          localidad_id: number | null
          lugares_entrega: string[]
          lugares_recepcion: string[]
          materia_extrana_maxima: number | null
          moneda_id: number | null
          nombre_establecimiento_destino: string | null
          observaciones: string | null
          pais_destino: string | null
          pais_id: number | null
          precio_tn: number | null
          premium_cbot: number | null
          producto_id: number
          proteina: number | null
          proteina_minima: number | null
          provincia: string | null
          provincia_destino: string | null
          provincia_id: number | null
          publicador_profile_id: string | null
          puerto: string | null
          puerto_ids: string[]
          puerto_origen_destino: string | null
          puertos: string[]
          representado_cuit: string | null
          representado_razon_social: string | null
          representado_sisa_categoria: string | null
          tipo: string
          tipo_buque: string | null
          toneladas_por_envio: number | null
          unidad_base: string | null
          unidad_original: string | null
        }
        Insert: {
          actualizada_en?: string | null
          aflatoxinas_max_ppb?: number | null
          base_precio_cbot?: boolean
          calidad?: string | null
          cantidad_envios?: number | null
          cantidad_original?: number | null
          cantidad_tn: number
          categoria_destino?:
            | Database["public"]["Enums"]["tipo_destino_grano"]
            | null
          creada_en?: string | null
          destino_homologado_id?: number | null
          direccion_destino?: string | null
          empresa_id?: string | null
          estado?: string | null
          factor_normalizacion?: number | null
          fecha_disponible?: string | null
          fecha_vencimiento?: string | null
          granos_danados_maximos?: number | null
          granos_quebrados_maximos?: number | null
          humedad?: number | null
          humedad_maxima?: number | null
          id?: string
          incoterm_id?: number | null
          instrumentos_pago_internacional?: string[]
          intermediario_empresa_id?: string | null
          localidad?: string | null
          localidad_destino?: string | null
          localidad_id?: number | null
          lugares_entrega?: string[]
          lugares_recepcion?: string[]
          materia_extrana_maxima?: number | null
          moneda_id?: number | null
          nombre_establecimiento_destino?: string | null
          observaciones?: string | null
          pais_destino?: string | null
          pais_id?: number | null
          precio_tn?: number | null
          premium_cbot?: number | null
          producto_id: number
          proteina?: number | null
          proteina_minima?: number | null
          provincia?: string | null
          provincia_destino?: string | null
          provincia_id?: number | null
          publicador_profile_id?: string | null
          puerto?: string | null
          puerto_ids?: string[]
          puerto_origen_destino?: string | null
          puertos?: string[]
          representado_cuit?: string | null
          representado_razon_social?: string | null
          representado_sisa_categoria?: string | null
          tipo: string
          tipo_buque?: string | null
          toneladas_por_envio?: number | null
          unidad_base?: string | null
          unidad_original?: string | null
        }
        Update: {
          actualizada_en?: string | null
          aflatoxinas_max_ppb?: number | null
          base_precio_cbot?: boolean
          calidad?: string | null
          cantidad_envios?: number | null
          cantidad_original?: number | null
          cantidad_tn?: number
          categoria_destino?:
            | Database["public"]["Enums"]["tipo_destino_grano"]
            | null
          creada_en?: string | null
          destino_homologado_id?: number | null
          direccion_destino?: string | null
          empresa_id?: string | null
          estado?: string | null
          factor_normalizacion?: number | null
          fecha_disponible?: string | null
          fecha_vencimiento?: string | null
          granos_danados_maximos?: number | null
          granos_quebrados_maximos?: number | null
          humedad?: number | null
          humedad_maxima?: number | null
          id?: string
          incoterm_id?: number | null
          instrumentos_pago_internacional?: string[]
          intermediario_empresa_id?: string | null
          localidad?: string | null
          localidad_destino?: string | null
          localidad_id?: number | null
          lugares_entrega?: string[]
          lugares_recepcion?: string[]
          materia_extrana_maxima?: number | null
          moneda_id?: number | null
          nombre_establecimiento_destino?: string | null
          observaciones?: string | null
          pais_destino?: string | null
          pais_id?: number | null
          precio_tn?: number | null
          premium_cbot?: number | null
          producto_id?: number
          proteina?: number | null
          proteina_minima?: number | null
          provincia?: string | null
          provincia_destino?: string | null
          provincia_id?: number | null
          publicador_profile_id?: string | null
          puerto?: string | null
          puerto_ids?: string[]
          puerto_origen_destino?: string | null
          puertos?: string[]
          representado_cuit?: string | null
          representado_razon_social?: string | null
          representado_sisa_categoria?: string | null
          tipo?: string
          tipo_buque?: string | null
          toneladas_por_envio?: number | null
          unidad_base?: string | null
          unidad_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publicaciones_destino_homologado_id_fkey"
            columns: ["destino_homologado_id"]
            isOneToOne: false
            referencedRelation: "destinos_homologados"
            referencedColumns: ["id_destino"]
          },
          {
            foreignKeyName: "publicaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicaciones_incoterm_id_fkey"
            columns: ["incoterm_id"]
            isOneToOne: false
            referencedRelation: "incoterms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicaciones_intermediario_empresa_id_fkey"
            columns: ["intermediario_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicaciones_localidad_id_fkey"
            columns: ["localidad_id"]
            isOneToOne: false
            referencedRelation: "localidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicaciones_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicaciones_pais_id_fkey"
            columns: ["pais_id"]
            isOneToOne: false
            referencedRelation: "paises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicaciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicaciones_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "provincias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicaciones_publicador_profile_id_fkey"
            columns: ["publicador_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      puertos: {
        Row: {
          activo: boolean | null
          id: string
          nombre: string
          pais_id: number | null
          provincia: string | null
          tipo: string | null
        }
        Insert: {
          activo?: boolean | null
          id?: string
          nombre: string
          pais_id?: number | null
          provincia?: string | null
          tipo?: string | null
        }
        Update: {
          activo?: boolean | null
          id?: string
          nombre?: string
          pais_id?: number | null
          provincia?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "puertos_pais_id_fkey"
            columns: ["pais_id"]
            isOneToOne: false
            referencedRelation: "paises"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas_stock_oportunidad: {
        Row: {
          actualizada_en: string
          cantidad_tn: number
          creada_en: string
          creado_por: string
          destinatario_empresa_id: string
          estado: string
          id: string
          publicacion_compra_id: string
          publicacion_venta_id: string
          solicitante_empresa_id: string
          vence_en: string
        }
        Insert: {
          actualizada_en?: string
          cantidad_tn: number
          creada_en?: string
          creado_por?: string
          destinatario_empresa_id: string
          estado?: string
          id?: string
          publicacion_compra_id: string
          publicacion_venta_id: string
          solicitante_empresa_id: string
          vence_en?: string
        }
        Update: {
          actualizada_en?: string
          cantidad_tn?: number
          creada_en?: string
          creado_por?: string
          destinatario_empresa_id?: string
          estado?: string
          id?: string
          publicacion_compra_id?: string
          publicacion_venta_id?: string
          solicitante_empresa_id?: string
          vence_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_stock_oportunidad_destinatario_empresa_id_fkey"
            columns: ["destinatario_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_stock_oportunidad_publicacion_compra_id_fkey"
            columns: ["publicacion_compra_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_stock_oportunidad_publicacion_compra_id_fkey"
            columns: ["publicacion_compra_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_stock_oportunidad_publicacion_venta_id_fkey"
            columns: ["publicacion_venta_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_stock_oportunidad_publicacion_venta_id_fkey"
            columns: ["publicacion_venta_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_stock_oportunidad_solicitante_empresa_id_fkey"
            columns: ["solicitante_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      retiros_comisiones: {
        Row: {
          actualizado_at: string
          aprobado_por: string | null
          comprobante_url: string | null
          creado_at: string
          empresa_id: string
          estado: string
          fecha_aprobacion: string | null
          fecha_pago: string | null
          fecha_rechazo: string | null
          fecha_solicitud: string
          id: string
          importe: number
          medio_cobro_id: string
          moneda_id: number
          motivo_rechazo: string | null
          observaciones: string | null
          pagado_por: string | null
          profile_id: string | null
          referencia: string | null
        }
        Insert: {
          actualizado_at?: string
          aprobado_por?: string | null
          comprobante_url?: string | null
          creado_at?: string
          empresa_id: string
          estado?: string
          fecha_aprobacion?: string | null
          fecha_pago?: string | null
          fecha_rechazo?: string | null
          fecha_solicitud?: string
          id?: string
          importe: number
          medio_cobro_id: string
          moneda_id: number
          motivo_rechazo?: string | null
          observaciones?: string | null
          pagado_por?: string | null
          profile_id?: string | null
          referencia?: string | null
        }
        Update: {
          actualizado_at?: string
          aprobado_por?: string | null
          comprobante_url?: string | null
          creado_at?: string
          empresa_id?: string
          estado?: string
          fecha_aprobacion?: string | null
          fecha_pago?: string | null
          fecha_rechazo?: string | null
          fecha_solicitud?: string
          id?: string
          importe?: number
          medio_cobro_id?: string
          moneda_id?: number
          motivo_rechazo?: string | null
          observaciones?: string | null
          pagado_por?: string | null
          profile_id?: string | null
          referencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retiros_comisiones_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiros_comisiones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiros_comisiones_medio_cobro_id_fkey"
            columns: ["medio_cobro_id"]
            isOneToOne: false
            referencedRelation: "medios_cobro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiros_comisiones_pagado_por_fkey"
            columns: ["pagado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiros_comisiones_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      retiros_comisiones_detalle: {
        Row: {
          comision_id: string
          creado_at: string
          id: string
          importe_pagado: number
          importe_reservado: number
          retiro_id: string
        }
        Insert: {
          comision_id: string
          creado_at?: string
          id?: string
          importe_pagado?: number
          importe_reservado: number
          retiro_id: string
        }
        Update: {
          comision_id?: string
          creado_at?: string
          id?: string
          importe_pagado?: number
          importe_reservado?: number
          retiro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retiros_comisiones_detalle_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "operacion_comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiros_comisiones_detalle_retiro_id_fkey"
            columns: ["retiro_id"]
            isOneToOne: false
            referencedRelation: "retiros_comisiones"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      sco: {
        Row: {
          archivo_pdf: string | null
          creado_en: string | null
          empresa_emisora: string | null
          estado: string | null
          fecha_emision: string | null
          hash_sha256: string | null
          id: string
          idioma_documento: string
          operacion_id: string
        }
        Insert: {
          archivo_pdf?: string | null
          creado_en?: string | null
          empresa_emisora?: string | null
          estado?: string | null
          fecha_emision?: string | null
          hash_sha256?: string | null
          id?: string
          idioma_documento?: string
          operacion_id: string
        }
        Update: {
          archivo_pdf?: string | null
          creado_en?: string | null
          empresa_emisora?: string | null
          estado?: string | null
          fecha_emision?: string | null
          hash_sha256?: string | null
          id?: string
          idioma_documento?: string
          operacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sco_empresa_emisora_fkey"
            columns: ["empresa_emisora"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sco_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      seguimientos: {
        Row: {
          creado_en: string | null
          estado: string | null
          fecha_proximo_contacto: string | null
          id: string
          observaciones: string | null
          oportunidad_id: string
        }
        Insert: {
          creado_en?: string | null
          estado?: string | null
          fecha_proximo_contacto?: string | null
          id?: string
          observaciones?: string | null
          oportunidad_id: string
        }
        Update: {
          creado_en?: string | null
          estado?: string | null
          fecha_proximo_contacto?: string | null
          id?: string
          observaciones?: string | null
          oportunidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguimientos_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_matches: {
        Row: {
          buyer_company_id: string
          condition_score: number | null
          confidence_score: number | null
          created_at: string | null
          explanation: Json | null
          history_score: number | null
          id: string
          location_score: number | null
          match_score: number | null
          offer_id: string
          payment_score: number | null
          price_score: number | null
          publicacion_id: string | null
          status: string | null
          updated_at: string | null
          volume_score: number | null
        }
        Insert: {
          buyer_company_id: string
          condition_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          explanation?: Json | null
          history_score?: number | null
          id?: string
          location_score?: number | null
          match_score?: number | null
          offer_id: string
          payment_score?: number | null
          price_score?: number | null
          publicacion_id?: string | null
          status?: string | null
          updated_at?: string | null
          volume_score?: number | null
        }
        Update: {
          buyer_company_id?: string
          condition_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          explanation?: Json | null
          history_score?: number | null
          id?: string
          location_score?: number | null
          match_score?: number | null
          offer_id?: string
          payment_score?: number | null
          price_score?: number | null
          publicacion_id?: string | null
          status?: string | null
          updated_at?: string | null
          volume_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_matches_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_matches_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_matches_publicacion_id_fkey"
            columns: ["publicacion_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_oportunidad: {
        Row: {
          actualizado_at: string
          creada_en: string
          destinatario_company_id: string
          estado: string
          id: string
          mensaje: string
          publicacion_compra_id: string
          publicacion_venta_id: string
          remitente_company_id: string
          remitente_profile_id: string
        }
        Insert: {
          actualizado_at?: string
          creada_en?: string
          destinatario_company_id: string
          estado?: string
          id?: string
          mensaje: string
          publicacion_compra_id: string
          publicacion_venta_id: string
          remitente_company_id: string
          remitente_profile_id: string
        }
        Update: {
          actualizado_at?: string
          creada_en?: string
          destinatario_company_id?: string
          estado?: string
          id?: string
          mensaje?: string
          publicacion_compra_id?: string
          publicacion_venta_id?: string
          remitente_company_id?: string
          remitente_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_oportunidad_destinatario_company_id_fkey"
            columns: ["destinatario_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_oportunidad_publicacion_compra_id_fkey"
            columns: ["publicacion_compra_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_oportunidad_publicacion_compra_id_fkey"
            columns: ["publicacion_compra_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_oportunidad_publicacion_venta_id_fkey"
            columns: ["publicacion_venta_id"]
            isOneToOne: false
            referencedRelation: "publicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_oportunidad_publicacion_venta_id_fkey"
            columns: ["publicacion_venta_id"]
            isOneToOne: false
            referencedRelation: "vw_publicaciones_activas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_oportunidad_remitente_company_id_fkey"
            columns: ["remitente_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_reprogramacion_puerto: {
        Row: {
          actualizado_at: string
          creado_at: string
          estado: string
          id: string
          motivo: string
          observaciones_revision: string | null
          revisado_at: string | null
          revisado_por: string | null
          solicitado_por: string
          terminal_alternativa_id: string | null
          terminal_id: string
          tipo_solicitud: string
          viaje_id: string
        }
        Insert: {
          actualizado_at?: string
          creado_at?: string
          estado?: string
          id?: string
          motivo: string
          observaciones_revision?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          solicitado_por: string
          terminal_alternativa_id?: string | null
          terminal_id: string
          tipo_solicitud: string
          viaje_id: string
        }
        Update: {
          actualizado_at?: string
          creado_at?: string
          estado?: string
          id?: string
          motivo?: string
          observaciones_revision?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          solicitado_por?: string
          terminal_alternativa_id?: string | null
          terminal_id?: string
          tipo_solicitud?: string
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_reprogramacion_puerto_terminal_alternativa_id_fkey"
            columns: ["terminal_alternativa_id"]
            isOneToOne: false
            referencedRelation: "terminales_puerto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_reprogramacion_puerto_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "terminales_puerto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_reprogramacion_puerto_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      soporte_tickets: {
        Row: {
          actualizado_at: string
          asunto: string
          categoria: string
          creado_at: string
          descripcion: string
          email: string | null
          estado: string
          id: string
          notas_admin: string | null
          prioridad: string
          profile_id: string
          resuelto_at: string | null
          resuelto_por: string | null
        }
        Insert: {
          actualizado_at?: string
          asunto: string
          categoria?: string
          creado_at?: string
          descripcion: string
          email?: string | null
          estado?: string
          id?: string
          notas_admin?: string | null
          prioridad?: string
          profile_id: string
          resuelto_at?: string | null
          resuelto_por?: string | null
        }
        Update: {
          actualizado_at?: string
          asunto?: string
          categoria?: string
          creado_at?: string
          descripcion?: string
          email?: string | null
          estado?: string
          id?: string
          notas_admin?: string | null
          prioridad?: string
          profile_id?: string
          resuelto_at?: string | null
          resuelto_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soporte_tickets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soporte_tickets_resuelto_por_fkey"
            columns: ["resuelto_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas: {
        Row: {
          creada_en: string | null
          cuenta_id: string | null
          descripcion: string | null
          estado: string | null
          id: string
          operacion_id: string | null
          prioridad: string | null
          titulo: string
          vencimiento: string | null
        }
        Insert: {
          creada_en?: string | null
          cuenta_id?: string | null
          descripcion?: string | null
          estado?: string | null
          id?: string
          operacion_id?: string | null
          prioridad?: string | null
          titulo: string
          vencimiento?: string | null
        }
        Update: {
          creada_en?: string | null
          cuenta_id?: string | null
          descripcion?: string | null
          estado?: string | null
          id?: string
          operacion_id?: string | null
          prioridad?: string | null
          titulo?: string
          vencimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas_referencia_catac: {
        Row: {
          activa: boolean
          actualizado_at: string
          actualizado_por: string | null
          distancia_km_desde: number
          distancia_km_hasta: number
          fuente: string
          id: string
          valor_tonelada_ars: number
          vigencia_desde: string
          vigencia_hasta: string | null
        }
        Insert: {
          activa?: boolean
          actualizado_at?: string
          actualizado_por?: string | null
          distancia_km_desde: number
          distancia_km_hasta: number
          fuente?: string
          id?: string
          valor_tonelada_ars: number
          vigencia_desde?: string
          vigencia_hasta?: string | null
        }
        Update: {
          activa?: boolean
          actualizado_at?: string
          actualizado_por?: string | null
          distancia_km_desde?: number
          distancia_km_hasta?: number
          fuente?: string
          id?: string
          valor_tonelada_ars?: number
          vigencia_desde?: string
          vigencia_hasta?: string | null
        }
        Relationships: []
      }
      terminales_puerto: {
        Row: {
          activa: boolean
          actualizado_at: string
          creado_at: string
          id: string
          latitud: number
          localidad: string | null
          longitud: number
          nombre: string
          provincia: string | null
          puerto: string
          radio_geocerca_m: number
        }
        Insert: {
          activa?: boolean
          actualizado_at?: string
          creado_at?: string
          id?: string
          latitud: number
          localidad?: string | null
          longitud: number
          nombre: string
          provincia?: string | null
          puerto: string
          radio_geocerca_m?: number
        }
        Update: {
          activa?: boolean
          actualizado_at?: string
          creado_at?: string
          id?: string
          latitud?: number
          localidad?: string | null
          longitud?: number
          nombre?: string
          provincia?: string | null
          puerto?: string
          radio_geocerca_m?: number
        }
        Relationships: []
      }
      tipos_empresa: {
        Row: {
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      tokens_api: {
        Row: {
          activo: boolean | null
          creado_en: string | null
          empresa_id: string | null
          id: string
          nombre: string | null
          token_hash: string | null
        }
        Insert: {
          activo?: boolean | null
          creado_en?: string | null
          empresa_id?: string | null
          id?: string
          nombre?: string | null
          token_hash?: string | null
        }
        Update: {
          activo?: boolean | null
          creado_en?: string | null
          empresa_id?: string | null
          id?: string
          nombre?: string | null
          token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_api_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      traducciones_ui: {
        Row: {
          actualizado_en: string
          clave: string
          id: string
          idioma: string
          texto: string
          version: number
        }
        Insert: {
          actualizado_en?: string
          clave: string
          id?: string
          idioma: string
          texto: string
          version?: number
        }
        Update: {
          actualizado_en?: string
          clave?: string
          id?: string
          idioma?: string
          texto?: string
          version?: number
        }
        Relationships: []
      }
      transacciones_pago_externo: {
        Row: {
          actualizado_at: string
          ambiente: string
          checkout_url: string | null
          creado_at: string
          empresa_id: string | null
          error_code: string | null
          error_message: string | null
          estado: string
          external_order_id: string | null
          external_payment_id: string | null
          id: string
          idempotency_key: string
          importe: number
          integracion_id: string | null
          moneda_id: number | null
          operacion_id: string | null
          pago_id: string | null
          proveedor: string
          provider_response: Json
          provider_status: string | null
        }
        Insert: {
          actualizado_at?: string
          ambiente?: string
          checkout_url?: string | null
          creado_at?: string
          empresa_id?: string | null
          error_code?: string | null
          error_message?: string | null
          estado?: string
          external_order_id?: string | null
          external_payment_id?: string | null
          id?: string
          idempotency_key: string
          importe: number
          integracion_id?: string | null
          moneda_id?: number | null
          operacion_id?: string | null
          pago_id?: string | null
          proveedor: string
          provider_response?: Json
          provider_status?: string | null
        }
        Update: {
          actualizado_at?: string
          ambiente?: string
          checkout_url?: string | null
          creado_at?: string
          empresa_id?: string | null
          error_code?: string | null
          error_message?: string | null
          estado?: string
          external_order_id?: string | null
          external_payment_id?: string | null
          id?: string
          idempotency_key?: string
          importe?: number
          integracion_id?: string | null
          moneda_id?: number | null
          operacion_id?: string | null
          pago_id?: string | null
          proveedor?: string
          provider_response?: Json
          provider_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transacciones_pago_externo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_pago_externo_integracion_id_fkey"
            columns: ["integracion_id"]
            isOneToOne: false
            referencedRelation: "integraciones_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_pago_externo_moneda_id_fkey"
            columns: ["moneda_id"]
            isOneToOne: false
            referencedRelation: "monedas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_pago_externo_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_pago_externo_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
        ]
      }
      transportistas: {
        Row: {
          activo: boolean | null
          actualizado_at: string
          contacto: string | null
          creado_en: string | null
          cuit: string | null
          dni: string | null
          dni_documento_path: string | null
          dni_dorso_documento_path: string | null
          email: string | null
          empresa_id: string | null
          empresa_transporte: string | null
          foto_perfil_path: string | null
          id: string
          nombre_completo: string | null
          observaciones_verificacion: string | null
          profile_id: string | null
          telefono: string | null
          tipo_transporte: string | null
          verificacion_estado: string
          verificado_at: string | null
          verificado_por: string | null
        }
        Insert: {
          activo?: boolean | null
          actualizado_at?: string
          contacto?: string | null
          creado_en?: string | null
          cuit?: string | null
          dni?: string | null
          dni_documento_path?: string | null
          dni_dorso_documento_path?: string | null
          email?: string | null
          empresa_id?: string | null
          empresa_transporte?: string | null
          foto_perfil_path?: string | null
          id?: string
          nombre_completo?: string | null
          observaciones_verificacion?: string | null
          profile_id?: string | null
          telefono?: string | null
          tipo_transporte?: string | null
          verificacion_estado?: string
          verificado_at?: string | null
          verificado_por?: string | null
        }
        Update: {
          activo?: boolean | null
          actualizado_at?: string
          contacto?: string | null
          creado_en?: string | null
          cuit?: string | null
          dni?: string | null
          dni_documento_path?: string | null
          dni_dorso_documento_path?: string | null
          email?: string | null
          empresa_id?: string | null
          empresa_transporte?: string | null
          foto_perfil_path?: string | null
          id?: string
          nombre_completo?: string | null
          observaciones_verificacion?: string | null
          profile_id?: string | null
          telefono?: string | null
          tipo_transporte?: string | null
          verificacion_estado?: string
          verificado_at?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transportistas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transportistas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transportistas_verificado_por_fkey"
            columns: ["verificado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      triangulaciones_canje: {
        Row: {
          acopio_empresa_id: string | null
          actualizado_at: string
          agronomia_empresa_id: string
          aprobado_at: string | null
          condiciones: Json
          creado_at: string
          creado_por: string
          estado: string
          id: string
          liquidado_at: string | null
          moneda_insumo: string
          moneda_pizarra: string | null
          oferta_insumo_id: string
          operacion_granos_id: string | null
          precio_pizarra_referencia: number | null
          producto_grano_id: number
          productor_empresa_id: string
          toneladas_equivalentes_snapshot: number | null
          toneladas_grano: number
          valor_insumo_snapshot: number
        }
        Insert: {
          acopio_empresa_id?: string | null
          actualizado_at?: string
          agronomia_empresa_id: string
          aprobado_at?: string | null
          condiciones?: Json
          creado_at?: string
          creado_por: string
          estado?: string
          id?: string
          liquidado_at?: string | null
          moneda_insumo: string
          moneda_pizarra?: string | null
          oferta_insumo_id: string
          operacion_granos_id?: string | null
          precio_pizarra_referencia?: number | null
          producto_grano_id: number
          productor_empresa_id: string
          toneladas_equivalentes_snapshot?: number | null
          toneladas_grano: number
          valor_insumo_snapshot: number
        }
        Update: {
          acopio_empresa_id?: string | null
          actualizado_at?: string
          agronomia_empresa_id?: string
          aprobado_at?: string | null
          condiciones?: Json
          creado_at?: string
          creado_por?: string
          estado?: string
          id?: string
          liquidado_at?: string | null
          moneda_insumo?: string
          moneda_pizarra?: string | null
          oferta_insumo_id?: string
          operacion_granos_id?: string | null
          precio_pizarra_referencia?: number | null
          producto_grano_id?: number
          productor_empresa_id?: string
          toneladas_equivalentes_snapshot?: number | null
          toneladas_grano?: number
          valor_insumo_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "triangulaciones_canje_acopio_empresa_id_fkey"
            columns: ["acopio_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triangulaciones_canje_agronomia_empresa_id_fkey"
            columns: ["agronomia_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triangulaciones_canje_oferta_insumo_id_fkey"
            columns: ["oferta_insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos_ofertas_canje"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triangulaciones_canje_operacion_granos_id_fkey"
            columns: ["operacion_granos_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triangulaciones_canje_producto_grano_id_fkey"
            columns: ["producto_grano_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triangulaciones_canje_productor_empresa_id_fkey"
            columns: ["productor_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_conversion_rules: {
        Row: {
          base_unit: string | null
          created_at: string
          dimension: string
          factor: number
          from_unit: string
          id: string
          source: string
          to_unit: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          base_unit?: string | null
          created_at?: string
          dimension: string
          factor: number
          from_unit: string
          id?: string
          source: string
          to_unit: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          base_unit?: string | null
          created_at?: string
          dimension?: string
          factor?: number
          from_unit?: string
          id?: string
          source?: string
          to_unit?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      user_bank_accounts: {
        Row: {
          account_holder: string
          account_type: string
          alias: string | null
          bank_name: string
          cbu_cvu: string
          created_at: string
          currency: string
          id: string
          user_id: string
        }
        Insert: {
          account_holder: string
          account_type: string
          alias?: string | null
          bank_name: string
          cbu_cvu: string
          created_at?: string
          currency: string
          id?: string
          user_id: string
        }
        Update: {
          account_holder?: string
          account_type?: string
          alias?: string | null
          bank_name?: string
          cbu_cvu?: string
          created_at?: string
          currency?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      vehiculos: {
        Row: {
          capacidad_tn: number | null
          creado_en: string | null
          habilitado: boolean | null
          id: string
          patente: string | null
          tipo: string | null
          transportista_id: string
        }
        Insert: {
          capacidad_tn?: number | null
          creado_en?: string | null
          habilitado?: boolean | null
          id?: string
          patente?: string | null
          tipo?: string | null
          transportista_id: string
        }
        Update: {
          capacidad_tn?: number | null
          creado_en?: string | null
          habilitado?: boolean | null
          id?: string
          patente?: string | null
          tipo?: string | null
          transportista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_transportista_id_fkey"
            columns: ["transportista_id"]
            isOneToOne: false
            referencedRelation: "transportistas"
            referencedColumns: ["id"]
          },
        ]
      }
      verificacion_requisitos_catalogo: {
        Row: {
          codigo: string
          descripcion: string
          fuente: string | null
          id: number
          nombre: string
          obligatorio: boolean
          tipo_empresa: string
        }
        Insert: {
          codigo: string
          descripcion: string
          fuente?: string | null
          id?: number
          nombre: string
          obligatorio?: boolean
          tipo_empresa: string
        }
        Update: {
          codigo?: string
          descripcion?: string
          fuente?: string | null
          id?: number
          nombre?: string
          obligatorio?: boolean
          tipo_empresa?: string
        }
        Relationships: []
      }
      verificaciones_programadas: {
        Row: {
          activa: boolean
          creada_en: string
          empresa_id: string
          frecuencia_dias: number
          id: string
          organismo: string
          proxima_consulta_at: string
        }
        Insert: {
          activa?: boolean
          creada_en?: string
          empresa_id: string
          frecuencia_dias?: number
          id?: string
          organismo: string
          proxima_consulta_at: string
        }
        Update: {
          activa?: boolean
          creada_en?: string
          empresa_id?: string
          frecuencia_dias?: number
          id?: string
          organismo?: string
          proxima_consulta_at?: string
        }
        Relationships: []
      }
      versiones_documentos: {
        Row: {
          creado_en: string | null
          creado_por: string | null
          documento_id: string | null
          id: string
          tipo_documento: string | null
          url_archivo: string | null
          version: number | null
        }
        Insert: {
          creado_en?: string | null
          creado_por?: string | null
          documento_id?: string | null
          id?: string
          tipo_documento?: string | null
          url_archivo?: string | null
          version?: number | null
        }
        Update: {
          creado_en?: string | null
          creado_por?: string | null
          documento_id?: string | null
          id?: string
          tipo_documento?: string | null
          url_archivo?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "versiones_documentos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      viaje_cartas_porte: {
        Row: {
          archivo_path: string
          cargada_por: string
          creada_at: string
          estado_verificacion: string
          id: string
          kilos_declarados: number | null
          nombre_archivo: string
          numero_carta_porte: string
          observaciones: string | null
          operacion_id: string
          sha256: string | null
          toneladas_declaradas: number | null
          validada_at: string | null
          validada_por: string | null
          viaje_id: string
        }
        Insert: {
          archivo_path: string
          cargada_por?: string
          creada_at?: string
          estado_verificacion?: string
          id?: string
          kilos_declarados?: number | null
          nombre_archivo: string
          numero_carta_porte: string
          observaciones?: string | null
          operacion_id: string
          sha256?: string | null
          toneladas_declaradas?: number | null
          validada_at?: string | null
          validada_por?: string | null
          viaje_id: string
        }
        Update: {
          archivo_path?: string
          cargada_por?: string
          creada_at?: string
          estado_verificacion?: string
          id?: string
          kilos_declarados?: number | null
          nombre_archivo?: string
          numero_carta_porte?: string
          observaciones?: string | null
          operacion_id?: string
          sha256?: string | null
          toneladas_declaradas?: number | null
          validada_at?: string | null
          validada_por?: string | null
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viaje_cartas_porte_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaje_cartas_porte_validada_por_fkey"
            columns: ["validada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaje_cartas_porte_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      viaje_eventos: {
        Row: {
          alerta_justificada: boolean
          alerta_resuelta_at: string | null
          alerta_resuelta_por: string | null
          empresa_nombre: string | null
          estado: string
          id: string
          lugar: string | null
          observaciones: string | null
          operacion_id: string
          registrado_at: string
          registrado_por: string
          toneladas: number | null
          viaje_id: string
        }
        Insert: {
          alerta_justificada?: boolean
          alerta_resuelta_at?: string | null
          alerta_resuelta_por?: string | null
          empresa_nombre?: string | null
          estado: string
          id?: string
          lugar?: string | null
          observaciones?: string | null
          operacion_id: string
          registrado_at?: string
          registrado_por?: string
          toneladas?: number | null
          viaje_id: string
        }
        Update: {
          alerta_justificada?: boolean
          alerta_resuelta_at?: string | null
          alerta_resuelta_por?: string | null
          empresa_nombre?: string | null
          estado?: string
          id?: string
          lugar?: string | null
          observaciones?: string | null
          operacion_id?: string
          registrado_at?: string
          registrado_por?: string
          toneladas?: number | null
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viaje_eventos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaje_eventos_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      viaje_recepcion_recordatorios: {
        Row: {
          creado_at: string
          hito_horas: number
          id: string
          notificacion_id: string | null
          profile_id: string
          viaje_id: string
        }
        Insert: {
          creado_at?: string
          hito_horas: number
          id?: string
          notificacion_id?: string | null
          profile_id: string
          viaje_id: string
        }
        Update: {
          creado_at?: string
          hito_horas?: number
          id?: string
          notificacion_id?: string | null
          profile_id?: string
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viaje_recepcion_recordatorios_notificacion_id_fkey"
            columns: ["notificacion_id"]
            isOneToOne: false
            referencedRelation: "notificaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaje_recepcion_recordatorios_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaje_recepcion_recordatorios_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      viaje_telemetria: {
        Row: {
          cpe_numero: string
          id: string
          latitud: number
          longitud: number
          nivel_bateria: number | null
          operacion_id: string
          recibido_at: string
          rumbo_grados: number | null
          senal_red: string | null
          timestamp_dispositivo: string
          transportista_profile_id: string
          velocidad_kmh: number | null
          viaje_id: string
        }
        Insert: {
          cpe_numero: string
          id?: string
          latitud: number
          longitud: number
          nivel_bateria?: number | null
          operacion_id: string
          recibido_at?: string
          rumbo_grados?: number | null
          senal_red?: string | null
          timestamp_dispositivo: string
          transportista_profile_id: string
          velocidad_kmh?: number | null
          viaje_id: string
        }
        Update: {
          cpe_numero?: string
          id?: string
          latitud?: number
          longitud?: number
          nivel_bateria?: number | null
          operacion_id?: string
          recibido_at?: string
          rumbo_grados?: number | null
          senal_red?: string | null
          timestamp_dispositivo?: string
          transportista_profile_id?: string
          velocidad_kmh?: number | null
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viaje_telemetria_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaje_telemetria_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      viajes: {
        Row: {
          acoplado_vehiculo_id: string | null
          actualizado_at: string
          alerta_detencion_activa: boolean
          alerta_detencion_desde: string | null
          asignado_por: string | null
          carta_porte_ctg: string | null
          carta_porte_descargada_at: string | null
          carta_porte_emitida_at: string | null
          carta_porte_environment: string | null
          carta_porte_estado: string
          carta_porte_estado_arca: string | null
          carta_porte_nro_orden: number | null
          carta_porte_numero: string | null
          carta_porte_response: Json | null
          carta_porte_sucursal: number | null
          carta_porte_tipo_cpe: string | null
          carta_porte_tn: number | null
          carta_porte_ultima_consulta_arca: string | null
          carta_porte_verificacion_arca: Json | null
          chofer_cuil: string | null
          chofer_nombre: string | null
          cierre_logistica_id: string | null
          creado_en: string | null
          destino: string | null
          destino_direccion: string | null
          destino_nombre: string | null
          entrega_liberada_auto_at: string | null
          entregado_confirmado_at: string | null
          entregado_confirmado_por: string | null
          estado: string | null
          fecha_llegada: string | null
          fecha_salida: string | null
          id: string
          kilos_cargados: number | null
          kilos_entregados: number | null
          logistica_camion_id: string | null
          logistica_chofer_id: string | null
          operacion_id: string
          origen: string | null
          origen_nombre: string | null
          patente_acoplado: string | null
          patente_camion: string | null
          productor_kilos_recibidos: number | null
          productor_recepcion_confirmada_at: string | null
          productor_recepcion_confirmada_por: string | null
          productor_recepcion_evidencia_path: string | null
          productor_recepcion_observaciones: string | null
          productor_recepcion_observada_at: string | null
          receptor_objecion_hasta: string | null
          ruta_autorizada_geojson: Json | null
          transportista_entrega_confirmada_at: string | null
          transportista_entrega_confirmada_por: string | null
          transportista_entrega_evidencia_path: string | null
          transportista_kilos_entregados: number | null
          transportista_profile_id: string | null
          vehiculo_id: string | null
        }
        Insert: {
          acoplado_vehiculo_id?: string | null
          actualizado_at?: string
          alerta_detencion_activa?: boolean
          alerta_detencion_desde?: string | null
          asignado_por?: string | null
          carta_porte_ctg?: string | null
          carta_porte_descargada_at?: string | null
          carta_porte_emitida_at?: string | null
          carta_porte_environment?: string | null
          carta_porte_estado?: string
          carta_porte_estado_arca?: string | null
          carta_porte_nro_orden?: number | null
          carta_porte_numero?: string | null
          carta_porte_response?: Json | null
          carta_porte_sucursal?: number | null
          carta_porte_tipo_cpe?: string | null
          carta_porte_tn?: number | null
          carta_porte_ultima_consulta_arca?: string | null
          carta_porte_verificacion_arca?: Json | null
          chofer_cuil?: string | null
          chofer_nombre?: string | null
          cierre_logistica_id?: string | null
          creado_en?: string | null
          destino?: string | null
          destino_direccion?: string | null
          destino_nombre?: string | null
          entrega_liberada_auto_at?: string | null
          entregado_confirmado_at?: string | null
          entregado_confirmado_por?: string | null
          estado?: string | null
          fecha_llegada?: string | null
          fecha_salida?: string | null
          id?: string
          kilos_cargados?: number | null
          kilos_entregados?: number | null
          logistica_camion_id?: string | null
          logistica_chofer_id?: string | null
          operacion_id: string
          origen?: string | null
          origen_nombre?: string | null
          patente_acoplado?: string | null
          patente_camion?: string | null
          productor_kilos_recibidos?: number | null
          productor_recepcion_confirmada_at?: string | null
          productor_recepcion_confirmada_por?: string | null
          productor_recepcion_evidencia_path?: string | null
          productor_recepcion_observaciones?: string | null
          productor_recepcion_observada_at?: string | null
          receptor_objecion_hasta?: string | null
          ruta_autorizada_geojson?: Json | null
          transportista_entrega_confirmada_at?: string | null
          transportista_entrega_confirmada_por?: string | null
          transportista_entrega_evidencia_path?: string | null
          transportista_kilos_entregados?: number | null
          transportista_profile_id?: string | null
          vehiculo_id?: string | null
        }
        Update: {
          acoplado_vehiculo_id?: string | null
          actualizado_at?: string
          alerta_detencion_activa?: boolean
          alerta_detencion_desde?: string | null
          asignado_por?: string | null
          carta_porte_ctg?: string | null
          carta_porte_descargada_at?: string | null
          carta_porte_emitida_at?: string | null
          carta_porte_environment?: string | null
          carta_porte_estado?: string
          carta_porte_estado_arca?: string | null
          carta_porte_nro_orden?: number | null
          carta_porte_numero?: string | null
          carta_porte_response?: Json | null
          carta_porte_sucursal?: number | null
          carta_porte_tipo_cpe?: string | null
          carta_porte_tn?: number | null
          carta_porte_ultima_consulta_arca?: string | null
          carta_porte_verificacion_arca?: Json | null
          chofer_cuil?: string | null
          chofer_nombre?: string | null
          cierre_logistica_id?: string | null
          creado_en?: string | null
          destino?: string | null
          destino_direccion?: string | null
          destino_nombre?: string | null
          entrega_liberada_auto_at?: string | null
          entregado_confirmado_at?: string | null
          entregado_confirmado_por?: string | null
          estado?: string | null
          fecha_llegada?: string | null
          fecha_salida?: string | null
          id?: string
          kilos_cargados?: number | null
          kilos_entregados?: number | null
          logistica_camion_id?: string | null
          logistica_chofer_id?: string | null
          operacion_id?: string
          origen?: string | null
          origen_nombre?: string | null
          patente_acoplado?: string | null
          patente_camion?: string | null
          productor_kilos_recibidos?: number | null
          productor_recepcion_confirmada_at?: string | null
          productor_recepcion_confirmada_por?: string | null
          productor_recepcion_evidencia_path?: string | null
          productor_recepcion_observaciones?: string | null
          productor_recepcion_observada_at?: string | null
          receptor_objecion_hasta?: string | null
          ruta_autorizada_geojson?: Json | null
          transportista_entrega_confirmada_at?: string | null
          transportista_entrega_confirmada_por?: string | null
          transportista_entrega_evidencia_path?: string | null
          transportista_kilos_entregados?: number | null
          transportista_profile_id?: string | null
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viajes_acoplado_vehiculo_id_fkey"
            columns: ["acoplado_vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_cierre_logistica_id_fkey"
            columns: ["cierre_logistica_id"]
            isOneToOne: false
            referencedRelation: "cierres_logistica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_entregado_confirmado_por_fkey"
            columns: ["entregado_confirmado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_logistica_camion_id_fkey"
            columns: ["logistica_camion_id"]
            isOneToOne: false
            referencedRelation: "logistica_flota_camiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_logistica_chofer_id_fkey"
            columns: ["logistica_chofer_id"]
            isOneToOne: false
            referencedRelation: "logistica_choferes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_productor_recepcion_confirmada_por_fkey"
            columns: ["productor_recepcion_confirmada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_transportista_entrega_confirmada_por_fkey"
            columns: ["transportista_entrega_confirmada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_transportista_profile_id_fkey"
            columns: ["transportista_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      videollamada_eventos: {
        Row: {
          creado_en: string
          evento: string
          id: string
          metadata: Json | null
          profile_id: string | null
          videollamada_id: string
        }
        Insert: {
          creado_en?: string
          evento: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          videollamada_id: string
        }
        Update: {
          creado_en?: string
          evento?: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          videollamada_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videollamada_eventos_videollamada_id_fkey"
            columns: ["videollamada_id"]
            isOneToOne: false
            referencedRelation: "videollamadas_comerciales"
            referencedColumns: ["id"]
          },
        ]
      }
      videollamada_participantes: {
        Row: {
          autorizado: boolean
          empresa_id: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          profile_id: string
          rol: string | null
          videollamada_id: string
        }
        Insert: {
          autorizado?: boolean
          empresa_id?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          profile_id: string
          rol?: string | null
          videollamada_id: string
        }
        Update: {
          autorizado?: boolean
          empresa_id?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          profile_id?: string
          rol?: string | null
          videollamada_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videollamada_participantes_videollamada_id_fkey"
            columns: ["videollamada_id"]
            isOneToOne: false
            referencedRelation: "videollamadas_comerciales"
            referencedColumns: ["id"]
          },
        ]
      }
      videollamadas_comerciales: {
        Row: {
          actualizada_en: string
          creada_en: string
          creador_profile_id: string
          enlace: string | null
          error_codigo: string | null
          estado: string
          fin_at: string | null
          id: string
          inicio_at: string | null
          meeting_id: string | null
          negociacion_id: string | null
          operacion_id: string | null
          proveedor: string
          titulo: string | null
        }
        Insert: {
          actualizada_en?: string
          creada_en?: string
          creador_profile_id: string
          enlace?: string | null
          error_codigo?: string | null
          estado?: string
          fin_at?: string | null
          id?: string
          inicio_at?: string | null
          meeting_id?: string | null
          negociacion_id?: string | null
          operacion_id?: string | null
          proveedor?: string
          titulo?: string | null
        }
        Update: {
          actualizada_en?: string
          creada_en?: string
          creador_profile_id?: string
          enlace?: string | null
          error_codigo?: string | null
          estado?: string
          fin_at?: string | null
          id?: string
          inicio_at?: string | null
          meeting_id?: string | null
          negociacion_id?: string | null
          operacion_id?: string | null
          proveedor?: string
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videollamadas_comerciales_negociacion_id_fkey"
            columns: ["negociacion_id"]
            isOneToOne: false
            referencedRelation: "ofertas_negociacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videollamadas_comerciales_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_etapas: {
        Row: {
          creado_en: string | null
          descripcion: string | null
          id: string
          nombre: string
          obligatoria: boolean | null
          orden: number
          workflow_id: string
        }
        Insert: {
          creado_en?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          obligatoria?: boolean | null
          orden: number
          workflow_id: string
        }
        Update: {
          creado_en?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          obligatoria?: boolean | null
          orden?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_etapas_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_historial: {
        Row: {
          etapa_id: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          observaciones: string | null
          operacion_workflow_id: string
          usuario_id: string | null
        }
        Insert: {
          etapa_id?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          observaciones?: string | null
          operacion_workflow_id: string
          usuario_id?: string | null
        }
        Update: {
          etapa_id?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          observaciones?: string | null
          operacion_workflow_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_historial_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "workflow_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_historial_operacion_workflow_id_fkey"
            columns: ["operacion_workflow_id"]
            isOneToOne: false
            referencedRelation: "operacion_workflow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_historial_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          activo: boolean | null
          creado_en: string | null
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          creado_en?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean | null
          creado_en?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
    }
    Views: {
      memoria_comercial: {
        Row: {
          empresa: string | null
          empresa_id: string | null
          localidad: string | null
          operaciones_confirmadas: number | null
          precio_maximo: number | null
          precio_minimo: number | null
          precio_promedio: number | null
          primera_operacion: string | null
          producto: string | null
          producto_id: number | null
          provincia: string | null
          puerto: string | null
          rol: string | null
          toneladas_totales: number | null
          ultima_operacion: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operacion_participantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicaciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_publicaciones_activas: {
        Row: {
          cantidad_tn: number | null
          id: string | null
          moneda: string | null
          nombre_comercial: string | null
          precio_tn: number | null
          producto: string | null
          provincia: string | null
          publicador_nombre: string | null
          publicador_tipo: string | null
          puerto: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aceptar_confidencialidad_operacion: {
        Args: {
          p_ip?: string
          p_operacion_id: string
          p_rol: string
          p_user_agent?: string
        }
        Returns: string
      }
      aceptar_documento_legal: {
        Args: { p_documento_id: string; p_ip: string; p_user_agent: string }
        Returns: string
      }
      admin_actualizar_mapa_verificacion_empresa: {
        Args: { p_empresa_id: string; p_verificada: boolean }
        Returns: undefined
      }
      admin_aprobar_empresa_compliance: {
        Args: {
          p_actividad_agro_validada: boolean
          p_arca_observaciones: string
          p_arca_vencimiento: string
          p_arca_verificada: boolean
          p_review_notes: string
          p_review_status: string
          p_sisa_categoria: string
          p_sisa_status: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_listar_directorio_contactos: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          activo: boolean
          cargo: string
          creado_en: string
          email: string
          empresa_id: string
          id: string
          nombre: string
          nombre_comercial: string
          principal: boolean
          razon_social: string
          telefono: string
          whatsapp: string
        }[]
      }
      admin_listar_directorio_empresas: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          activa: boolean
          creado_at: string
          cuit: string
          direccion: string
          email: string
          id: string
          localidad: string
          nombre_comercial: string
          origen: string
          pais: string
          provincia: string
          razon_social: string
          sitio_web: string
          telefono: string
          tipo: string
          verificada: boolean
        }[]
      }
      admin_listar_directorio_intereses: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          activo: boolean
          cantidad_maxima: number
          cantidad_minima: number
          creado_en: string
          empresa_id: string
          id: string
          localidad: string
          nombre_comercial: string
          precio_objetivo: number
          prioridad: number
          producto: string
          producto_id: number
          provincia: string
          puerto: string
          razon_social: string
          tipo_operacion: string
        }[]
      }
      admin_listar_medios_cobro: {
        Args: never
        Returns: {
          actualizado_at: string
          alias: string
          banco: string
          cbu: string
          creado_at: string
          cuit_cuil: string
          empresa_cuit: string
          empresa_id: string
          empresa_razon_social: string
          es_predeterminado: boolean
          estado: string
          id: string
          moneda_id: number
          motivo_rechazo: string
          nombre: string
          profile_id: string
          tipo: string
          tipo_cuenta: string
          titular: string
        }[]
      }
      admin_listar_retiros_comisiones: {
        Args: never
        Returns: {
          aprobado_por: string
          comprobante_url: string
          empresa_cuit: string
          empresa_id: string
          empresa_razon_social: string
          estado: string
          fecha_aprobacion: string
          fecha_pago: string
          fecha_rechazo: string
          fecha_solicitud: string
          importe: number
          medio_alias: string
          medio_banco: string
          medio_cbu: string
          medio_cobro_id: string
          medio_cuit_cuil: string
          medio_estado: string
          medio_moneda_id: number
          medio_nombre: string
          medio_tipo: string
          medio_tipo_cuenta: string
          medio_titular: string
          motivo_rechazo: string
          observaciones: string
          pagado_por: string
          profile_id: string
          referencia: string
          retiro_id: string
          retiro_moneda_id: number
        }[]
      }
      admin_registrar_revision_fiscal_empresa: {
        Args: {
          p_actividad_agro_validada: boolean
          p_arca_vencimiento: string
          p_arca_verificada: boolean
          p_observaciones?: string
          p_sisa_categoria: string
          p_sisa_status: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_resolver_medio_cobro: {
        Args: {
          p_estado: string
          p_medio_id: string
          p_motivo_rechazo?: string
        }
        Returns: undefined
      }
      admin_sincronizar_empresa_desde_onboarding: {
        Args: { p_user_id: string }
        Returns: string
      }
      agrobroker_horas_habiles: {
        Args: { p_fin: string; p_inicio: string }
        Returns: number
      }
      aprobar_documento_operacion: {
        Args: {
          p_aprobado?: boolean
          p_documento_id: string
          p_observaciones?: string
        }
        Returns: {
          aprobado: boolean | null
          cargado_por: string | null
          creado_en: string | null
          evidencia_firma: Json | null
          firmado_externamente: boolean
          firmado_externamente_at: string | null
          id: string
          nombre_archivo: string | null
          obligatorio: boolean | null
          observaciones: string | null
          operacion_id: string
          sha256: string | null
          tipo_documento: string | null
          url_archivo: string | null
          version: number | null
        }
        SetofOptions: {
          from: "*"
          to: "documentos_operacion"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      asignar_intermediario_operacion: {
        Args: { p_empresa_id: string; p_operacion_id: string }
        Returns: string
      }
      asignar_recursos_flota_a_viaje: {
        Args: { p_camion_id: string; p_chofer_id: string; p_viaje_id: string }
        Returns: undefined
      }
      asignar_transportista_a_viaje: {
        Args: {
          p_patente_acoplado?: string
          p_patente_camion: string
          p_transportista_profile_id: string
          p_viaje_id: string
        }
        Returns: undefined
      }
      autorizar_corredor_cartas_porte: {
        Args: {
          p_corredor_profile_id: string
          p_motivo?: string
          p_operacion_id: string
        }
        Returns: string
      }
      avanzar_operacion_workflow: {
        Args: {
          p_estado?: string
          p_etapa_destino_id: string
          p_workflow_id: string
        }
        Returns: Json
      }
      avanzar_visado_aprobado_a_retencion: {
        Args: { p_operacion_id: string }
        Returns: Json
      }
      buscar_corredores_para_autorizar: {
        Args: { p_operacion_id: string; p_texto?: string }
        Returns: {
          email: string
          nombre: string
          profile_id: string
        }[]
      }
      buscar_negocio_ia: {
        Args: { p_publicacion_id: string }
        Returns: {
          demanda_score: number
          empresa: string
          empresa_id: string
          explicacion: Json
          match_score: number
          operaciones_historicas: number
          precio_promedio: number
          recomendada: boolean
          toneladas_historicas: number
          ultima_provincia: string
        }[]
      }
      buscar_tarifa_referencia_catac: {
        Args: { p_distancia_km: number }
        Returns: {
          distancia_km_desde: number
          distancia_km_hasta: number
          fuente: string
          id: string
          valor_tonelada_ars: number
          vigencia_desde: string
        }[]
      }
      calcular_importe: {
        Args: { cantidad: number; precio: number }
        Returns: number
      }
      calcular_precio_operacion: {
        Args: {
          p_base_price: number
          p_commission?: number
          p_discount?: number
          p_formula?: string
          p_freight?: number
          p_market_quote_id: string
          p_operation_id: string
          p_other_costs?: number
          p_premium?: number
          p_taxes?: number
        }
        Returns: string
      }
      calcular_smart_matches: {
        Args: { p_publicacion_id: string }
        Returns: {
          empresa: string
          empresa_id: string
          puntaje_total: number
          recomendada: boolean
        }[]
      }
      cambiar_estado_oferta: {
        Args: { p_nuevo_estado: string; p_oferta_id: string }
        Returns: boolean
      }
      cambiar_estado_publicacion: {
        Args: { p_nuevo_estado: string; p_publicacion_id: string }
        Returns: boolean
      }
      cerrar_operacion_logistica_market: {
        Args: {
          p_demanda_id: string
          p_oferta_id: string
          p_total_flete_ars: number
        }
        Returns: string
      }
      confirmar_entrega_transportista: {
        Args: {
          p_evidencia_path?: string
          p_kilos_entregados: number
          p_observaciones?: string
          p_viaje_id: string
        }
        Returns: Json
      }
      confirmar_entrega_viaje_y_liberar_comision: {
        Args: { p_kilos_entregados: number; p_viaje_id: string }
        Returns: Json
      }
      confirmar_firma_externa: {
        Args: {
          p_contrato_id: string
          p_documento_id: string
          p_nombre_archivo?: string
          p_sha256: string
        }
        Returns: Json
      }
      confirmar_liquidacion_y_cerrar_operacion: {
        Args: { p_operacion_id: string }
        Returns: undefined
      }
      confirmar_recepcion_productor: {
        Args: {
          p_confirmar: boolean
          p_evidencia_path?: string
          p_kilos_recibidos: number
          p_observaciones?: string
          p_viaje_id: string
        }
        Returns: Json
      }
      confirmar_retencion_comision_plataforma: {
        Args: { p_observaciones?: string; p_retencion_id: string }
        Returns: Json
      }
      contactar_por_oportunidad: {
        Args: {
          p_mensaje: string
          p_publicacion_compra_id: string
          p_publicacion_venta_id: string
        }
        Returns: string
      }
      convert_unit: {
        Args: { p_from: string; p_to: string; p_value: number }
        Returns: Json
      }
      crear_documento_comex_borrador: {
        Args: {
          p_idioma?: string
          p_membrete?: string
          p_operacion_id: string
          p_tipo_documento?: string
        }
        Returns: string
      }
      crear_fco_comercial:
        | {
            Args: { p_archivo_pdf?: string; p_operacion_id: string }
            Returns: string
          }
        | {
            Args: {
              p_archivo_pdf: string
              p_empresa_emisora: string
              p_empresa_receptora: string
              p_hash_sha256: string
              p_idioma: string
              p_operacion_id: string
            }
            Returns: string
          }
      crear_loi_comercial:
        | {
            Args: { p_archivo_pdf?: string; p_operacion_id: string }
            Returns: string
          }
        | {
            Args: {
              p_archivo_pdf: string
              p_empresa_emisora: string
              p_empresa_receptora: string
              p_hash_sha256: string
              p_idioma: string
              p_operacion_id: string
            }
            Returns: string
          }
      crear_medio_cobro: { Args: { p_datos: Json }; Returns: string }
      crear_notificacion_ia: {
        Args: {
          p_mensaje: string
          p_profile_id: string
          p_publicacion_id: string
          p_tipo: string
          p_titulo: string
        }
        Returns: string
      }
      crear_oferta_desde_publicacion: {
        Args: {
          p_cantidad_tn: number
          p_moneda_id: number
          p_observaciones: string
          p_precio_tn: number
          p_publicacion_id: string
        }
        Returns: Json
      }
      crear_operacion_desde_publicaciones: {
        Args: {
          p_cantidad_tn: number
          p_precio_tn: number
          p_publicacion_compra_id: string
          p_publicacion_venta_id: string
        }
        Returns: string
      }
      crear_oportunidad_ia: {
        Args: {
          p_empresa_id: string
          p_indice_compatibilidad?: number
          p_publicacion_id: string
        }
        Returns: string
      }
      crear_propuesta_publicacion: {
        Args: {
          p_cantidad_tn: number
          p_conversacion_id: string
          p_moneda_id: number
          p_observaciones?: string
          p_precio_tn: number
        }
        Returns: string
      }
      crear_sco_comercial:
        | {
            Args: { p_archivo_pdf?: string; p_operacion_id: string }
            Returns: string
          }
        | {
            Args: {
              p_archivo_pdf: string
              p_empresa_emisora: string
              p_empresa_receptora: string
              p_hash_sha256: string
              p_idioma: string
              p_operacion_id: string
            }
            Returns: string
          }
      crear_solicitud_factura: {
        Args: {
          p_condicion_iva_receptor?: number
          p_doc_tipo_receptor?: number
          p_empresa_receptor_id: string
          p_fecha_emision?: string
          p_fecha_vencimiento?: string
          p_importe_iva: number
          p_importe_neto: number
          p_iva_alicuota?: number
          p_operacion_id: string
          p_punto_venta: number
          p_tipo_comprobante_codigo: number
        }
        Returns: string
      }
      crear_solicitud_firma_contrato: {
        Args: {
          p_contrato_id: string
          p_firmante_email: string
          p_firmante_nombre: string
          p_firmante_rol: string
        }
        Returns: Json
      }
      crear_solicitud_verificacion_empresa: {
        Args: {
          p_empresa_id: string
          p_observaciones?: string
          p_organismo: string
          p_tipo_consulta: string
        }
        Returns: string
      }
      crear_version_contrato: {
        Args: {
          p_contenido: string
          p_contrato_id: string
          p_estado?: string
          p_motivo: string
        }
        Returns: string
      }
      crear_viaje_operacion: {
        Args: {
          p_destino: string
          p_destino_nombre: string
          p_operacion_id: string
          p_origen: string
          p_origen_nombre: string
          p_patente_acoplado?: string
          p_patente_camion: string
          p_transportista_profile_id: string
        }
        Returns: string
      }
      crear_viaje_operacion_con_vehiculos: {
        Args: {
          p_acoplado_vehiculo_id: string
          p_destino: string
          p_destino_nombre: string
          p_operacion_id: string
          p_origen: string
          p_origen_nombre: string
          p_transportista_profile_id: string
          p_vehiculo_id: string
        }
        Returns: string
      }
      crear_viaje_operacion_con_vehiculos_completo: {
        Args: {
          p_acoplado_vehiculo_id: string
          p_chofer_cuil: string
          p_chofer_nombre: string
          p_destino: string
          p_destino_nombre: string
          p_operacion_id: string
          p_origen: string
          p_origen_nombre: string
          p_transportista_profile_id: string
          p_vehiculo_id: string
        }
        Returns: string
      }
      crear_videollamada_comercial: {
        Args: {
          p_inicio: string
          p_negociacion_id: string
          p_operacion_id: string
          p_titulo: string
        }
        Returns: string
      }
      datos_partes_contrato_operacion: {
        Args: { p_operacion_id: string }
        Returns: {
          cuit: string
          empresa_id: string
          razon_social: string
          rol: string
          sisa_categoria: string
          sisa_status: string
          verificada: boolean
        }[]
      }
      eliminar_medio_cobro: { Args: { p_medio_id: string }; Returns: undefined }
      eliminar_publicacion: {
        Args: { p_publicacion_id: string }
        Returns: boolean
      }
      enviar_mensaje_comercial_seguro: {
        Args: {
          p_destinatario_empresa_id: string
          p_destinatario_profile_id: string
          p_idioma_origen?: string
          p_mensaje: string
          p_operacion_id: string
        }
        Returns: string
      }
      enviar_mensaje_publicacion: {
        Args: { p_conversacion_id: string; p_mensaje: string }
        Returns: string
      }
      enviar_propuesta_formal_oportunidad: {
        Args: {
          p_cantidad_tn: number
          p_mensaje?: string
          p_publicacion_compra_id: string
          p_publicacion_venta_id: string
        }
        Returns: string
      }
      enviar_referencia_catac_al_chat: {
        Args: {
          p_conversacion_id: string
          p_distancia_km: number
          p_toneladas: number
        }
        Returns: string
      }
      es_administrador_plataforma: { Args: never; Returns: boolean }
      establecer_incoterm_operacion: {
        Args: { p_incoterm_id: number; p_operacion_id: string }
        Returns: undefined
      }
      establecer_medio_cobro_predeterminado: {
        Args: { p_medio_id: string }
        Returns: undefined
      }
      estado_confidencialidad_operacion: {
        Args: { p_operacion_id: string }
        Returns: {
          aceptado: boolean
          aceptado_at: string
          company_id: string
          documento_codigo: string
          documento_titulo: string
          hash_sha256: string
          requerido: boolean
          rol: string
          version: string
        }[]
      }
      evaluar_ordenes_inteligentes_pizarra: { Args: never; Returns: Json }
      exigir_validacion_sisa: {
        Args: { p_profile_id?: string }
        Returns: undefined
      }
      expirar_contratos_vencidos: { Args: never; Returns: number }
      expirar_reservas_stock_oportunidad: { Args: never; Returns: number }
      finalizar_retiro_comision: {
        Args: {
          p_comprobante_url?: string
          p_motivo_rechazo?: string
          p_nuevo_estado: string
          p_observaciones?: string
          p_profile_id: string
          p_referencia?: string
          p_retiro_id: string
        }
        Returns: boolean
      }
      generar_oportunidad_desde_smart_match: {
        Args: { p_smart_match_id: string }
        Returns: string
      }
      guardar_acuerdo_comercial: {
        Args: { p_datos: Json; p_operacion_id: string }
        Returns: Json
      }
      guardar_comision_intermediario: {
        Args: { p_datos: Json; p_operacion_id: string }
        Returns: Json
      }
      guardar_compatibilidad_ia: {
        Args: {
          p_empresa_id: string
          p_publicacion_id: string
          p_puntaje_cantidad: number
          p_puntaje_documentacion: number
          p_puntaje_historial: number
          p_puntaje_precio: number
          p_puntaje_producto: number
          p_puntaje_total: number
          p_puntaje_zona: number
          p_recomendada: boolean
        }
        Returns: string
      }
      guardar_contacto_comercial: { Args: { p_datos: Json }; Returns: string }
      guardar_contrato_comercial: {
        Args: { p_datos: Json; p_operacion_id: string }
        Returns: Json
      }
      guardar_control_comercial: {
        Args: { p_cambios: Json; p_operacion_id: string }
        Returns: Json
      }
      guardar_liquidacion_operacion: {
        Args: { p_datos: Json; p_operacion_id: string }
        Returns: Json
      }
      guardar_operacion_logistica: {
        Args: { p_datos: Json; p_operacion_id: string }
        Returns: Json
      }
      guardar_parte_operacion: {
        Args: { p_contacto_id: string; p_operacion_id: string; p_rol: string }
        Returns: boolean
      }
      guardar_publicacion: {
        Args: { p_datos: Json; p_publicacion_id: string }
        Returns: string
      }
      inicializar_control_comercial_contrato: {
        Args: { p_operacion_id: string }
        Returns: Json
      }
      inicializar_requisitos_verificacion: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      iniciar_conversacion_publicacion: {
        Args: { p_publicacion_id: string }
        Returns: string
      }
      intentar_liberar_comision_agrobrokeria: {
        Args: { p_operacion_id: string }
        Returns: Json
      }
      listar_contactos_comerciales_autorizados: {
        Args: never
        Returns: {
          activo: boolean
          created_at: string
          cuit: string
          dni: string
          domicilio: string
          email: string
          id: string
          localidad: string
          nombre_razon_social: string
          observaciones: string
          provincia: string
          representante_cargo: string
          representante_dni: string
          representante_nombre: string
          telefono: string
          tipo_persona: string
          updated_at: string
        }[]
      }
      listar_conversaciones_publicaciones: {
        Args: never
        Returns: {
          cantidad_tn: number
          conversacion_id: string
          interesado_profile_id: string
          no_leidos: number
          otro_usuario_nombre: string
          producto: string
          publicacion_id: string
          publicador_profile_id: string
          tipo_publicacion: string
          ultimo_mensaje: string
          ultimo_mensaje_at: string
        }[]
      }
      listar_cuentas_pago_logistica: {
        Args: never
        Returns: {
          account_holder: string
          account_type: string
          alias: string
          bank_name: string
          cbu: string
          currency: string
          holder_tax_id: string
          id: string
          notes: string
        }[]
      }
      listar_destinatarios_mensajes_operacion: {
        Args: { p_operacion_id: string }
        Returns: {
          empresa_id: string
          profile_id: string
          rol: string
        }[]
      }
      listar_mis_vehiculos_transportista: {
        Args: never
        Returns: {
          capacidad_tn: number
          habilitado: boolean
          id: string
          patente: string
          tipo: string
        }[]
      }
      listar_operaciones_mensajes_disponibles: {
        Args: never
        Returns: {
          codigo: string
          estado: string
          id: string
          rol: string
        }[]
      }
      listar_propuestas_publicacion: {
        Args: { p_conversacion_id: string }
        Returns: {
          cantidad_tn: number
          creada_at: string
          emisor_nombre: string
          emisor_profile_id: string
          estado: string
          id: string
          moneda_id: number
          observaciones: string
          operacion_id: string
          precio_tn: number
          propuesta_anterior_id: string
        }[]
      }
      listar_publicaciones_activas_oportunidades: {
        Args: never
        Returns: {
          calidad: string
          cantidad_tn: number
          empresa_id: string
          empresas: Json
          fecha_disponible: string
          fecha_vencimiento: string
          humedad: number
          id: string
          incoterms: Json
          localidad: string
          lugares_entrega: string[]
          moneda_id: number
          paises: Json
          precio_tn: number
          productos: Json
          proteina: number
          provincia: string
          publicador_profile_id: string
          puerto: string
          puertos: string[]
          tipo: string
        }[]
      }
      listar_transportistas_asignados_operacion: {
        Args: { p_operacion_id: string }
        Returns: {
          cuit: string
          nombre_completo: string
          profile_id: string
          verificacion_estado: string
        }[]
      }
      listar_transportistas_habilitados_por_comision: {
        Args: { p_operacion_id: string }
        Returns: {
          cuit: string
          empresa_id: string
          empresa_transporte: string
          foto_perfil_path: string
          nombre_completo: string
          profile_id: string
          telefono: string
        }[]
      }
      listar_transportistas_verificados:
        | {
            Args: never
            Returns: {
              empresa_transporte: string
              foto_perfil_path: string
              nombre_completo: string
              profile_id: string
              telefono: string
            }[]
          }
        | {
            Args: { p_operacion_id: string }
            Returns: {
              empresa_transporte: string
              foto_perfil_path: string
              nombre_completo: string
              profile_id: string
              telefono: string
            }[]
          }
      listar_vehiculos_transportista: {
        Args: { p_operacion_id: string; p_transportista_profile_id: string }
        Returns: {
          capacidad_tn: number
          habilitado: boolean
          id: string
          patente: string
          tipo: string
        }[]
      }
      marcar_mensajes_comerciales_leidos: {
        Args: { p_ids: string[] }
        Returns: number
      }
      marcar_mensajes_publicacion_leidos: {
        Args: { p_conversacion_id: string }
        Returns: number
      }
      marcar_notificacion_leida: {
        Args: { p_notificacion_id: string }
        Returns: boolean
      }
      mi_perfil_habilitado_sisa: { Args: never; Returns: boolean }
      normalizar_cantidad_tn: {
        Args: { p_unit: string; p_value: number }
        Returns: Json
      }
      normalizar_unidad: {
        Args: { p_fecha?: string; p_unidad: string; p_valor: number }
        Returns: Json
      }
      obtener_billetera_comisiones: {
        Args: { p_empresa_id: string; p_moneda_id: number }
        Returns: Json
      }
      obtener_empresa_participante_mensajes: {
        Args: { p_operacion_id: string }
        Returns: {
          ciudad: string
          company_id: string
          direccion: string
          email: string
          nombre: string
          pais: string
          provincia: string
          rol: string
          telefono: string
          verificada: boolean
        }[]
      }
      obtener_estado_liberacion_operacion: {
        Args: { p_operacion_id: string }
        Returns: Json
      }
      obtener_expediente_operacion: {
        Args: { p_operacion_id: string }
        Returns: Json
      }
      obtener_perfil_participante_operacion: {
        Args: { p_operacion_id: string }
        Returns: {
          calidad: string
          cantidad_tn: number
          ciudad: string
          cobertura_pct: number
          condicion_entrega: string
          contacto_habilitado: boolean
          contrato_estado: string
          contrato_numero: string
          cuit: string
          descripcion: string
          destino: string
          direccion: string
          email: string
          empresa_id: string
          empresa_nombre: string
          empresa_verificada: boolean
          estado_verificacion: string
          flete: string
          forma_pago: string
          importe_total: number
          lugar_carga: string
          nombre: string
          nombre_usuario: string
          operaciones_evaluadas: number
          pais: string
          perfil_creado_at: string
          plazo_pago: string
          precio_tn: number
          profile_id: string
          provincia: string
          razon_social: string
          rol: string
          score: number
          score_color: string
          score_label: string
          sitio_web: string
          telefono: string
          tipo_empresa: string
          tipo_operador: string
          verificada: boolean
          viajes_evaluados: number
        }[]
      }
      obtener_solicitud_firma: { Args: { p_token: string }; Returns: Json }
      obtener_visado_operacion_para_avance: {
        Args: { p_operacion_id: string }
        Returns: {
          visado_estado: string
          visado_resultado: string
        }[]
      }
      obtener_workflows_operaciones_usuario: {
        Args: { p_operacion_ids: string[] }
        Returns: {
          estado: string
          etapa_actual_id: string
          id: string
          nombre_etapa: string
          operacion_id: string
          orden: number
          workflow_id: string
        }[]
      }
      operacion_comision_plataforma_segura: {
        Args: { p_operacion_id: string }
        Returns: boolean
      }
      operacion_confidencialidad_completa: {
        Args: { p_operacion_id: string }
        Returns: boolean
      }
      operacion_datos_privados_liberados: {
        Args: { p_operacion_id: string }
        Returns: boolean
      }
      perfil_habilitado_sisa: {
        Args: { p_profile_id: string }
        Returns: boolean
      }
      permitir_consulta_padron: {
        Args: { p_ip_hash: string }
        Returns: boolean
      }
      postular_camiones_logistica: {
        Args: { p_demanda_id: string; p_oferta_id: string }
        Returns: string
      }
      probar_autorizacion_publicacion: {
        Args: { p_profile_id: string; p_publicacion_id: string }
        Returns: {
          autorizado: boolean
          company_id: string
          empresa_id_legacy: string
          empresa_publicacion: string
          mensaje: string
          profile_id: string
          propietario: string
        }[]
      }
      procesar_aceptacion_oferta: {
        Args: { p_oferta_id: string }
        Returns: Json
      }
      procesar_liberaciones_automaticas_viajes: { Args: never; Returns: number }
      procesar_recordatorios_recepcion_viajes: { Args: never; Returns: number }
      procesar_smart_match_publicacion: {
        Args: { p_publicacion_id: string }
        Returns: {
          buyer_company_id: string
          comprador: string
          match_score: number
          opportunity_id: string
          publicacion_id: string
          smart_match_id: string
          status: string
        }[]
      }
      publicaciones_propias_ids: { Args: never; Returns: string[] }
      recalcular_congestion_puertos: { Args: never; Returns: Json }
      recalcular_reputacion_empresa: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      recalcular_scoring_confianza_agrobrokeria: { Args: never; Returns: Json }
      recalcular_verificacion_empresa: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      rechazar_comprobante_comision_plataforma: {
        Args: { p_motivo: string; p_retencion_id: string }
        Returns: Json
      }
      refresh_market_public_summary_data: { Args: never; Returns: undefined }
      refresh_opportunities_for_product: {
        Args: { p_product_id: number }
        Returns: undefined
      }
      registrar_alerta_oportunidad: {
        Args: {
          p_publicacion_compra_id: string
          p_publicacion_venta_id: string
        }
        Returns: boolean
      }
      registrar_comprobante_adelanto_logistica: {
        Args: {
          p_adelanto_id: string
          p_referencia?: string
          p_storage_path: string
        }
        Returns: undefined
      }
      registrar_comprobante_comision_logistica: {
        Args: {
          p_cierre_id: string
          p_referencia?: string
          p_storage_path: string
        }
        Returns: undefined
      }
      registrar_comprobante_comision_plataforma: {
        Args: {
          p_comprobante_url?: string
          p_empresa_pagadora_id: string
          p_operacion_id: string
          p_referencia_pago: string
        }
        Returns: string
      }
      registrar_copia_firmada_contrato: {
        Args: {
          p_contrato_id: string
          p_nombre_archivo: string
          p_rol: string
          p_sha256: string
          p_storage_path: string
        }
        Returns: string
      }
      registrar_copia_firmada_contrato_admin: {
        Args: {
          p_contrato_id: string
          p_nombre_archivo: string
          p_rol: string
          p_sha256: string
          p_storage_path: string
        }
        Returns: string
      }
      registrar_evento_acceso: { Args: never; Returns: undefined }
      registrar_evento_viaje: {
        Args: {
          p_empresa_nombre?: string
          p_estado: string
          p_lugar?: string
          p_observaciones?: string
          p_toneladas?: number
          p_viaje_id: string
        }
        Returns: string
      }
      registrar_firma_electronica: {
        Args: {
          p_consentimiento: boolean
          p_declaracion: string
          p_ip?: unknown
          p_nombre: string
          p_token: string
          p_user_agent?: string
        }
        Returns: Json
      }
      registrar_ingreso_comision: {
        Args: {
          p_empresa_id: string
          p_estado?: string
          p_importe: number
          p_medio_pago: string
          p_moneda_id: number
          p_operacion_comision_id: string
          p_operacion_id: string
          p_proveedor_pago?: string
          p_referencia_operacion?: string
          p_referencia_pago?: string
        }
        Returns: string
      }
      registrar_interes_comercial: {
        Args: {
          p_cantidad_maxima?: number
          p_cantidad_minima?: number
          p_empresa_id: string
          p_incoterm_id?: number
          p_localidad?: string
          p_moneda_id?: number
          p_precio_objetivo?: number
          p_prioridad?: number
          p_producto_id: number
          p_provincia?: string
          p_puerto?: string
          p_tipo_operacion: string
        }
        Returns: string
      }
      registrar_pago_comision: {
        Args: {
          p_comision_id: string
          p_importe: number
          p_medio_pago: string
          p_referencia_pago?: string
        }
        Returns: boolean
      }
      registrar_pago_operacion: {
        Args: {
          p_comprobante?: string
          p_empresa_cobradora: string
          p_empresa_pagadora: string
          p_importe: number
          p_metodo_pago: string
          p_moneda_id: number
          p_operacion_id: string
          p_referencia?: string
        }
        Returns: string
      }
      registrar_simulacion_comision_plataforma: {
        Args: {
          p_archivo_path: string
          p_nombre_archivo: string
          p_operacion_id: string
          p_referencia_prueba: string
          p_tamano_bytes: number
        }
        Returns: string
      }
      registrar_telemetria_viaje: {
        Args: { p_puntos: Json; p_viaje_id: string }
        Returns: Json
      }
      registrar_transportista:
        | {
            Args: {
              p_cuit?: string
              p_dni: string
              p_dni_path?: string
              p_empresa?: string
              p_foto_path?: string
              p_nombre: string
              p_telefono?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_cuit: string
              p_dni: string
              p_dni_dorso_path: string
              p_dni_path: string
              p_empresa: string
              p_foto_path: string
              p_nombre: string
              p_telefono: string
            }
            Returns: Json
          }
      registrar_vehiculo_transportista: {
        Args: { p_capacidad_tn?: number; p_patente: string; p_tipo: string }
        Returns: string
      }
      resolver_incidencia_recepcion_viaje: {
        Args: { p_observaciones: string; p_viaje_id: string }
        Returns: Json
      }
      responder_adelanto_combustible_logistica: {
        Args: { p_aceptar: boolean; p_adelanto_id: string }
        Returns: undefined
      }
      responder_propuesta_publicacion: {
        Args: { p_accion: string; p_propuesta_id: string }
        Returns: Json
      }
      revisar_adelanto_combustible_logistica: {
        Args: { p_adelanto_id: string; p_aprobar: boolean; p_motivo?: string }
        Returns: undefined
      }
      revisar_cancelacion_contrato: {
        Args: {
          p_cancelacion_id: string
          p_observaciones?: string
          p_resultado: string
        }
        Returns: Json
      }
      revisar_comision_logistica: {
        Args: { p_aprobar: boolean; p_cierre_id: string; p_motivo?: string }
        Returns: undefined
      }
      revisar_copia_firmada_contrato: {
        Args: {
          p_copia_id: string
          p_observaciones?: string
          p_resultado: string
        }
        Returns: Json
      }
      revisar_prorroga_contrato: {
        Args: {
          p_dias_aprobados?: number
          p_observaciones?: string
          p_prorroga_id: string
          p_resultado: string
        }
        Returns: Json
      }
      revisar_simulacion_comision_plataforma: {
        Args: {
          p_observaciones?: string
          p_prueba_id: string
          p_resultado: string
        }
        Returns: undefined
      }
      revocar_corredor_cartas_porte: {
        Args: { p_autorizacion_id: string }
        Returns: undefined
      }
      sincronizar_asignacion_comision_viajes: {
        Args: { p_retencion_id: string }
        Returns: undefined
      }
      sincronizar_comision_intermediario: {
        Args: {
          p_acuerdo_previo?: boolean
          p_detalle?: string
          p_empresa_intermediaria_id: string
          p_estado?: string
          p_operacion_id: string
          p_quien_abona: string
          p_tipo_comision: string
          p_valor_comision: number
        }
        Returns: Json
      }
      sincronizar_empresa_desde_onboarding: { Args: never; Returns: string }
      sincronizar_workflow_firmas_contrato: {
        Args: { p_contrato_id: string }
        Returns: Json
      }
      solicitar_adelanto_combustible_logistica: {
        Args: { p_cierre_id: string; p_monto_ars: number; p_porcentaje: number }
        Returns: string
      }
      solicitar_cancelacion_contrato: {
        Args: {
          p_evidencia_url?: string
          p_justificativo: string
          p_motivo: string
          p_operacion_id: string
        }
        Returns: string
      }
      solicitar_prorroga_contrato: {
        Args: {
          p_datos_adicionales?: Json
          p_dias_solicitados: number
          p_evidencia_url?: string
          p_justificativo: string
          p_motivo: string
          p_operacion_id: string
        }
        Returns: Json
      }
      solicitar_retiro_comision: {
        Args: {
          p_cuenta_retiro_id?: string
          p_empresa_id: string
          p_importe: number
          p_medio_cobro_id: string
          p_moneda_id: number
          p_profile_id: string
        }
        Returns: string
      }
      texto_indica_operatoria_no_declarada: {
        Args: { p_texto: string }
        Returns: boolean
      }
      usuario_autorizado_videollamada: {
        Args: { p_id: string }
        Returns: boolean
      }
      usuario_es_miembro_empresa: {
        Args: { p_empresa_id: string }
        Returns: boolean
      }
      usuario_participa_operacion: {
        Args: { p_operacion_id: string }
        Returns: boolean
      }
      usuario_puede_gestionar_logistica_operacion: {
        Args: { p_operacion_id: string }
        Returns: boolean
      }
      usuario_puede_ver_carta_porte: {
        Args: { p_operacion_id: string }
        Returns: boolean
      }
      usuario_puede_ver_foto_transportista: {
        Args: { p_profile_id: string }
        Returns: boolean
      }
      usuario_puede_ver_logistica_operacion: {
        Args: { p_operacion_id: string }
        Returns: boolean
      }
      validar_carta_porte_viaje: {
        Args: {
          p_carta_porte_id: string
          p_kilos_declarados: number
          p_observaciones?: string
        }
        Returns: undefined
      }
      validar_cierre_documental_operacion: {
        Args: { p_operacion_id: string }
        Returns: Json
      }
      validar_comprobante_comision_bancaria: {
        Args: {
          p_numero_operacion_bancaria: string
          p_observaciones?: string
          p_retencion_id: string
        }
        Returns: Json
      }
      validar_cron_market_sync: { Args: { p_token: string }; Returns: boolean }
      validar_cuit_cuil: { Args: { p_value: string }; Returns: boolean }
      validar_mensaje_comercial: { Args: { p_texto: string }; Returns: Json }
      verificar_transportista: {
        Args: {
          p_estado: string
          p_observaciones?: string
          p_profile_id: string
        }
        Returns: undefined
      }
      vincular_viaje_cierre_logistica: {
        Args: { p_cierre_id: string; p_viaje_id: string }
        Returns: undefined
      }
    }
    Enums: {
      company_status:
        | "pendiente"
        | "verificada"
        | "rechazada"
        | "suspendida"
        | "suspendido_comercial"
      offer_status: "borrador" | "publicada" | "cerrada" | "cancelada"
      offer_type: "compra" | "venta"
      operation_status:
        | "negociacion"
        | "confirmada"
        | "en_proceso"
        | "finalizada"
        | "cancelada"
      tipo_destino_grano:
        | "puerto_exportacion"
        | "molino_industrial"
        | "acopio_cooperativa"
        | "consumo_feedlot"
      user_role:
        | "comprador"
        | "vendedor"
        | "corredor"
        | "exportador"
        | "acopio"
        | "industria"
        | "administrador"
        | "intermediario"
        | "transportista"
        | "cooperativa"
        | "corredor_oficial"
        | "comisionista_intermediario"
        | "productor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      company_status: [
        "pendiente",
        "verificada",
        "rechazada",
        "suspendida",
        "suspendido_comercial",
      ],
      offer_status: ["borrador", "publicada", "cerrada", "cancelada"],
      offer_type: ["compra", "venta"],
      operation_status: [
        "negociacion",
        "confirmada",
        "en_proceso",
        "finalizada",
        "cancelada",
      ],
      tipo_destino_grano: [
        "puerto_exportacion",
        "molino_industrial",
        "acopio_cooperativa",
        "consumo_feedlot",
      ],
      user_role: [
        "comprador",
        "vendedor",
        "corredor",
        "exportador",
        "acopio",
        "industria",
        "administrador",
        "intermediario",
        "transportista",
        "cooperativa",
        "corredor_oficial",
        "comisionista_intermediario",
        "productor",
      ],
    },
  },
} as const
