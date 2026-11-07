const LEGAL_FRAMEWORK = {
    jurisdiction: "República de Colombia",
    laws: [
        {
            code: "Ley 527 de 1999",
            title: "Ley de Comercio Electrónico, Mensajes de Datos y Firmas Digitales",
            articles: {
                escrito: "Artículo 6 (Criterio de Equivalente Funcional de lo Escrito)",
                firma: "Artículo 7 (Validez Jurídica de la Firma Electrónica)",
                integridad: "Artículo 8 (Criterio de Integridad y No Repudio del Documento Original)",
                conservacion: "Artículo 12 (Conservación de Mensajes de Datos y Trazabilidad)"
            }
        },
        {
            code: "Decreto 2364 de 2012",
            title: "Reglamentación de la Firma Electrónica en Colombia",
            standards: "Mecanismo confiable de identificación, integridad y no alteración posterior."
        },
        {
            code: "Ley 1581 de 2012",
            title: "Régimen General de Protección de Datos Personales (Habeas Data)",
            compliance: "Autorización expresa para el tratamiento y custodia de evidencias digitales."
        },
        {
            code: "Código General del Proceso (Ley 1564 de 2012)",
            title: "Mérito Ejecutivo y Valor Probatorio",
            articles: "Artículo 247 (Valor probatorio de los mensajes de datos) y Artículo 422 (Título ejecutivo con obligación clara, expresa y exigible)."
        }
    ]
};

const TIPOS_CONTRATO = {
    arrendamiento_vivienda: {
        id: "arrendamiento_vivienda",
        nombre: "Contrato de Arrendamiento (Vivienda Urbana / Local Comercial)",
        normativa: "Ley 820 de 2003 / Código de Comercio",
        roles: ["Arrendador (Propietario)", "Arrendatario (Inquilino)"],
        clausulas_obligatorias: [
            "Objeto y descripción del inmueble",
            "Canon mensual de arrendamiento y reajuste legal anual",
            "Término de duración y causales de prórroga",
            "Servicios públicos, cuotas de administración y mantenimiento",
            "Cláusula penal pecuniaria y cobro de intereses moratorios",
            "Prohibición expresa de subarriendo o cesión",
            "Renuncia expresa a requerimientos judiciales y constitución en mora",
            "Mérito ejecutivo del contrato",
            "Tratamiento de datos personales (Habeas Data)"
        ]
    },
    prestacion_servicios: {
        id: "prestacion_servicios",
        nombre: "Contrato de Prestación de Servicios Profesionales (Freelance / B2B)",
        normativa: "Código Civil Art. 1495 y ss. / Art. 34 C.S.T.",
        roles: ["Contratante", "Contratista"],
        clausulas_obligatorias: [
            "Objeto claro del servicio y entregables específicos",
            "Honorarios profesionales, hitos de pago y facturación",
            "Independencia y autonomía técnica (ausencia de subordinación laboral)",
            "Plazo de ejecución y entregas",
            "Propiedad intelectual y cesión de derechos patrimoniales de autor",
            "Confidencialidad de la información empresarial",
            "Cláusula penal pecuniaria por incumplimiento",
            "Terminación anticipada y preaviso",
            "Tratamiento de datos personales y Habeas Data"
        ]
    },
    nda_confidencialidad: {
        id: "nda_confidencialidad",
        nombre: "Acuerdo de Confidencialidad y No Divulgación (NDA)",
        normativa: "Decisión 486 de la CAN / Código de Comercio",
        roles: ["Parte Divulgante", "Parte Receptora"],
        clausulas_obligatorias: [
            "Definición precisa de Información Confidencial",
            "Obligaciones de reserva, no uso indebido y no ingeniería inversa",
            "Excepciones legítimas a la confidencialidad (orden judicial o dominio público)",
            "Plazo de vigencia del acuerdo y supervivencia de la reserva",
            "Devolución o destrucción certificada de información sensible",
            "Indemnización de perjuicios y penalidad tasada",
            "Jurisdicción y ley aplicable"
        ]
    },
    compraventa: {
        id: "compraventa",
        nombre: "Contrato de Compraventa Mercantil / Comercial",
        normativa: "Código de Comercio Art. 905 y ss. / Código Civil",
        roles: ["Vendedor", "Comprador"],
        clausulas_obligatorias: [
            "Objeto y especificación detallada de los bienes o productos",
            "Precio convenido, forma y plazo de pago",
            "Lugar, condiciones y fecha de entrega y transferencia de dominio",
            "Garantías comerciales, saneamiento por evicción y vicios redhibitorios",
            "Reserva de dominio (si aplica)",
            "Cláusula penal por mora o desestimiento",
            "Mérito ejecutivo y resolución de controversias"
        ]
    },
    laboral_termino_fijo: {
        id: "laboral_termino_fijo",
        nombre: "Contrato Individual de Trabajo a Término Fijo",
        normativa: "Código Sustantivo del Trabajo (C.S.T.) Art. 46 y ss.",
        roles: ["Empleador", "Trabajador"],
        clausulas_obligatorias: [
            "Cargo, funciones y lugar de trabajo",
            "Salario ordinario, auxilio de transporte y fechas de pago",
            "Jornada máxima legal de trabajo y descansos remunerados",
            "Período de prueba y preaviso de terminación",
            "Afiliación y aportes obligatorios al Sistema de Seguridad Social Integral (Salud, Pensión, ARL, Caja)",
            "Obligaciones y prohibiciones especiales del trabajador",
            "Causales legales de terminación con justa causa (Art. 62 C.S.T.)",
            "Tratamiento de datos personales y Habeas Data"
        ]
    },
    mutuo_prestamo: {
        id: "mutuo_prestamo",
        nombre: "Contrato de Mutuo / Préstamo de Dinero con Pagaré",
        normativa: "Código Civil Art. 2221 / Código de Comercio Art. 1163",
        roles: ["Prestamista (Mutuante)", "Prestatario (Mutuario)"],
        clausulas_obligatorias: [
            "Monto del capital prestado y forma de desembolso",
            "Plazo de amortización y cronograma de cuotas mensuales",
            "Intereses corrientes e intereses moratorios (conforme a la tasa de usura de la Superfinanciera)",
            "Aceleración de plazo por mora e incumplimiento",
            "Garantías y otorgamiento de Pagaré con Carta de Instrucciones",
            "Mérito ejecutivo directo del contrato y del pagaré (Art. 422 C.G.P.)",
            "Gastos judiciales, extrajudiciales y honorarios de cobranza"
        ]
    }
};

module.exports = {
    LEGAL_FRAMEWORK,
    TIPOS_CONTRATO
};
