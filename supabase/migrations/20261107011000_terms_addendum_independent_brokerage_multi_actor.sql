-- Bloque 17: nueva versión de Términos con adenda de intermediación independiente.
DO $$
DECLARE
  v_base public.documentos_legales%ROWTYPE;
  v_contenido text;
BEGIN
  SELECT * INTO v_base
  FROM public.documentos_legales
  WHERE codigo='TERMINOS' AND estado='VIGENTE'
  ORDER BY vigencia_desde DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe una versión vigente de Términos y Condiciones.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.documentos_legales WHERE codigo='TERMINOS' AND version='3.1') THEN
    RETURN;
  END IF;

  v_contenido := v_base.contenido || E'\n\n13. ADENDA: MULTI-ACTORES Y CORRETAJE INDEPENDIENTE\n\n'
  || E'La Plataforma admite la participación de los distintos eslabones del sector agroindustrial de la República Argentina, incluyendo productores directos, cooperativas agrícolas, acopios, empresas exportadoras, corredores oficiales de comercio y comisionistas o intermediarios independientes. Cada actor deberá informar su CUIT, identidad, representación y las inscripciones o habilitaciones que correspondan a su actividad. La admisión en la Plataforma no sustituye ni acredita por sí misma una matrícula, inscripción, autorización fiscal, RUCA o situación SISA.\n\n'
  || E'AgroBrokerIA percibe exclusivamente la comisión informada por el servicio tecnológico de la Plataforma. Los corretajes, honorarios, comisiones o aranceles que un corredor, comisionista o intermediario independiente pacte con su cliente o con cualquiera de las partes de la compraventa son acuerdos privados ajenos al cobro de la comisión tecnológica. Su determinación, documentación, facturación, liquidación y pago deberán ser acordados y cumplidos directamente por los actores involucrados, por fuera de los mecanismos de cobro de AgroBrokerIA.\n\n'
  || E'La Plataforma podrá registrar la existencia e identidad declarada del intermediario y la constancia de que las partes reconocen un acuerdo de honorarios externos, únicamente para trazabilidad contractual. AgroBrokerIA no calcula, retiene, administra, factura ni cobra esos honorarios de terceros, ni interviene en su liquidación o cobranza. Las controversias relativas a dichos honorarios deberán resolverse entre los actores que los hayan pactado. Esta delimitación no excluye responsabilidades que no puedan ser legalmente renunciadas ni altera las obligaciones regulatorias propias de cada actor.\n\n'
  || E'Cuando una oferta sea publicada por un intermediario en representación de un cliente, el publicador deberá contar con autorización suficiente, identificar de manera veraz al representado y conservar los respaldos correspondientes. La aceptación de una propuesta no reemplaza la acreditación de representación ni la firma del contrato por las partes que resulten legalmente obligadas.';

  UPDATE public.documentos_legales
  SET estado='ARCHIVADO'
  WHERE codigo='TERMINOS' AND estado='VIGENTE';

  INSERT INTO public.documentos_legales
    (id,codigo,titulo,version,vigencia_desde,contenido,hash_sha256,estado,creado_en)
  VALUES
    (gen_random_uuid(),'TERMINOS',v_base.titulo,'3.1',now(),v_contenido,
     encode(digest(convert_to(v_contenido,'UTF8'),'sha256'),'hex'),'VIGENTE',now());
END $$;
