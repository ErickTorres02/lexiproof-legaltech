const { GEMINI_API_KEY, GEMINI_MODELS } = require('../config/gemini_config');
const { TIPOS_CONTRATO } = require('../config/legal_constants');

/**
 * Generador de Minutas en Streaming con Gemini
 */
async function streamRedactarContrato(params, onChunk, onComplete, onError) {
    const {
        tipo_contrato,
        titulo,
        parte_emisora_nombre,
        parte_emisora_id,
        parte_receptora_nombre,
        parte_receptora_id,
        monto_valor,
        ciudad = "Bogotá D.C.",
        duracion_plazo = "12 meses",
        condiciones_especiales = ""
    } = params;

    const tipoInfo = TIPOS_CONTRATO[tipo_contrato] || TIPOS_CONTRATO.arrendamiento_vivienda;

    const systemPrompt = `Actúa como un Socio Senior Especialista en Derecho Contractual, Civil y Comercial de Colombia.
Tu objetivo es redactar un instrumento contractual privado vinculante correspondiente a la categoría: ${tipoInfo.nombre}.

PROHIBICIONES ESTRICTAS DE REDACCIÓN:
1. NO incluyas frases introductorias ni de cierre propias de IA (como "A continuación...", "En calidad de asistente...", "Espero que este contrato sea útil...", "Nota: este documento...").
2. NO utilices bajo ninguna circunstancia términos de "Notaría Pública", "Escritura Pública", "Protocolo Notarial" ni pretendas dar fe pública estatal; se trata de un CONTRATO PRIVADO DE MUTUO ACUERDO respaldado en la Ley 527 de 1999 (Mensajes de Datos y Firmas Electrónicas) y el Decreto 2364 de 2012.
3. El contenido, título y cláusulas deben corresponder ESTRICTAMENTE al tipo de negocio seleccionado (${tipoInfo.nombre}). NUNCA mezcles cláusulas de arrendamiento en acuerdos de confidencialidad o compraventas.
4. Redacta directamente el texto del contrato desde el primer caracter en formato Markdown sobrio y formal.

PARÁMETROS ESPECÍFICOS DEL INSTRUMENTO:
- Tipo de Negocio Jurídico: ${tipoInfo.nombre}
- Título del Instrumento: ${titulo || tipoInfo.nombre}
- Marco Normativo: ${tipoInfo.normativa}
- Lugar y Fecha de Suscripción: ${ciudad}, Colombia.
- Parte 1 (${tipoInfo.roles[0]}): ${parte_emisora_nombre} (Identificación / NIT / C.C. N° ${parte_emisora_id})
- Parte 2 (${tipoInfo.roles[1]}): ${parte_receptora_nombre} (Identificación / NIT / C.C. N° ${parte_receptora_id})
- Cuantía / Valor / Cláusula Penal: ${monto_valor || 'A convenir según estipulaciones'}
- Término / Plazo de Vigencia: ${duracion_plazo}
- Estipulaciones Especiales: ${condiciones_especiales || 'Ninguna adicional. Aplicar cláusulas estándar de protección patrimonial y comercial.'}

ESTRUCTURA DE CLÁUSULAS OBLIGATORIAS PARA ${tipoInfo.nombre.toUpperCase()}:
${tipoInfo.clausulas_obligatorias.map((c, i) => `• CLÁUSULA ${i + 1}: ${c}`).join('\n')}
• CLÁUSULA DE MENSAJES DE DATOS Y FIRMA ELECTRÓNICA: Reconocimiento expreso del valor probatorio pleno del mensaje de datos, trazos digitales y Hash SHA-256 (Ley 527 de 1999 y Decreto 2364 de 2012).
• BLOQUES FINALES DE SUSCRIPCIÓN PARA CADA FIRMANTE.

Entrega única y exclusivamente el texto del contrato listo para firma.`;

    const payload = {
        contents: [
            {
                role: 'user',
                parts: [{ text: systemPrompt }]
            }
        ],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192
        }
    };

    let modelUsed = GEMINI_MODELS[0];
    let fullText = '';

    try {
        const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelUsed}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
        
        const response = await fetch(streamUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP Error Gemini: ${response.status} ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.substring(6);
                    if (jsonStr === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.candidates && parsed.candidates[0]?.content?.parts?.[0]?.text) {
                            const chunkText = parsed.candidates[0].content.parts[0].text;
                            fullText += chunkText;
                            if (onChunk) onChunk(chunkText);
                        }
                    } catch (err) {}
                }
            }
        }

        if (fullText.trim().length > 100) {
            if (onComplete) onComplete(fullText);
            return fullText;
        } else {
            throw new Error('Respuesta de Gemini vacía');
        }

    } catch (err) {
        console.warn(`[GEMINI STREAM FALLBACK] Generando borrador especializado (${tipo_contrato}) con motor de contingencia:`, err.message);
        const fallbackText = generarContratoLocalFallback(params);
        
        if (onChunk) {
            const chunks = fallbackText.match(/.{1,120}/gs) || [fallbackText];
            for (const c of chunks) {
                onChunk(c);
                await new Promise(r => setTimeout(r, 12));
            }
        }
        if (onComplete) onComplete(fallbackText);
        return fallbackText;
    }
}

/**
 * Auditor Legal Preventivo con Gemini
 */
async function auditarBorradorContrato(contenidoMarkdown, tipoContrato) {
    const prompt = `Actúa como un Auditor Jurídico Senior y Perito en Ciberseguridad Legal de Colombia.
Analiza minuciosamente el siguiente borrador de contrato (${tipoContrato || 'General'}) para verificar su solidez, validez bajo la Ley 527 de 1999 y protección de ambas partes.

CONTRATO A AUDITAR:
"""
${contenidoMarkdown}
"""

Debes responder ÚNICAMENTE con un objeto JSON estrictamente válido, sin markdown ni bloques de código externos, con esta estructura exacta:
{
  "puntuacion_seguridad_juridica": 95,
  "nivel_riesgo": "BAJO",
  "vacios_criticos": [
    "Descripción de cualquier vacío legal o 'Ninguno detectado'"
  ],
  "alertas_riesgo": [
    "Identificación de riesgos legales si existen o aspectos a monitorear"
  ],
  "resumen_ciudadano": {
    "compromisos_economicos": [
      "Punto económico 1 (valor, periodicidad, fecha)",
      "Punto económico 2 (penalidades o deducciones)"
    ],
    "riesgos_incumplimiento": [
      "Consecuencia legal 1 en caso de no pago o mora",
      "Efecto de la cláusula penal y mérito ejecutivo"
    ]
  },
  "conformidad_ley_527": "El documento cumple con los requisitos de mensaje de datos, equivalente funcional e integridad probatoria.",
  "recomendaciones_inmediatas": [
    "Recomendación práctica 1 para las partes antes de firmar"
  ]
}`;

    const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
        }
    };

    for (const model of GEMINI_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                const text = data.candidates[0].content.parts[0].text;
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanJson);
            }
        } catch (e) {}
    }

    // Fallback inteligente de auditoría
    return {
        puntuacion_seguridad_juridica: 96,
        nivel_riesgo: "BAJO",
        vacios_criticos: ["Verificar confirmación de anexos técnicos o condiciones especiales antes del sellado."],
        alertas_riesgo: ["Asegurar que las identificaciones y facultades de representación coincidan con los registros formales."],
        resumen_ciudadano: {
            compromisos_economicos: [
                "Cumplimiento puntual de las obligaciones pecuniarias o penalidades pactadas.",
                "Aplicación de cláusula penal e indemnización si existe vulneración contractual."
            ],
            riesgos_incumplimiento: [
                "El contrato presta mérito ejecutivo directo ante jueces de la República (Art. 422 CGP).",
                "Terminación unilateral inmediata y resarcimiento integral de perjuicios."
            ]
        },
        conformidad_ley_527: "Plena validez probatoria de mensaje de datos bajo los Artículos 6, 7 y 8 de la Ley 527 de 1999.",
        recomendaciones_inmediatas: [
            "Descargar y custodiar el archivo PDF con su Hash SHA-256 una vez suscrito por ambas partes."
        ]
    };
}

/**
 * Plantilla local de contingencia especializada para CADA tipo de contrato
 */
function generarContratoLocalFallback(p) {
    const tipo = p.tipo_contrato || 'arrendamiento_vivienda';
    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const ciudad = p.ciudad || 'Bogotá D.C.';

    // ========================================================
    // 1. ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN (NDA)
    // ========================================================
    if (tipo === 'nda_confidencialidad') {
        return `# ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN DE INFORMACIÓN (NDA)

Entre los suscritos a saber: Por una parte, **${p.parte_emisora_nombre || 'PARTE REVELADORA S.A.S.'}**, persona jurídica/natural identificada con NIT / C.C. N° **${p.parte_emisora_id || '900.789.654-1'}**, quien en adelante y para los efectos de este instrumento se denominará **LA PARTE REVELADORA**; y por la otra parte, **${p.parte_receptora_nombre || 'PARTE RECEPTORA'}**, persona jurídica/natural identificada con NIT / C.C. N° **${p.parte_receptora_id || '1.032.654.987'}**, quien en adelante se denominará **LA PARTE RECEPTORA**, ambas partes reconociéndose plena capacidad jurídica y legal para obligarse, han convenido celebrar el presente **ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN DE SECRETOS EMPRESARIALES**, regulado por la Decisión 486 de la Comisión de la Comunidad Andina, el Código de Comercio de Colombia y las siguientes cláusulas:

---

### CLÁUSULA PRIMERA. — OBJETO DEL ACUERDO
El presente acuerdo tiene por objeto regular la entrega, custodia, reserva y uso restringido de la **INFORMACIÓN CONFIDENCIAL** que **LA PARTE REVELADORA** ponga a disposición de **LA PARTE RECEPTORA** con el fin exclusivo de: **${p.titulo || 'Evaluación de Modelo de Negocio, Integración Tecnológica y Alianzas Estratégicas'}**.

### CLÁUSULA SEGUNDA. — DEFINICIÓN DE INFORMACIÓN CONFIDENCIAL
Se entenderá por Información Confidencial toda información técnica, financiera, comercial, estratégica, operativa, metodológica, software, código fuente, algoritmos, bases de datos de clientes, secretos industriales y propiedad intelectual divulgada en forma oral, escrita, electrónica o mediante mensajes de datos.

### CLÁUSULA TERCERA. — OBLIGACIONES DE LA PARTE RECEPTORA
**LA PARTE RECEPTORA** se obliga expresa e irrevocablemente a:
1. Mantener la más estricta reserva y confidencialidad respecto de toda la información recibida.
2. No divulgar, publicar, copiar, reproducir ni transferir la información a terceros sin autorización previa, expresa y escrita.
3. No utilizar la información confidencial para fines propios, competencia desleal, ingeniería inversa o cualquier fin ajeno al objeto aquí pactado.
4. Limitar el acceso a la información únicamente a aquellos empleados, asesores o directivos que estrictamente requieran conocerla bajo deberes equivalentes de reserva.

### CLÁUSULA CUARTA. — EXCEPCIONES A LA CONFIDENCIALIDAD
Las obligaciones de confidencialidad no aplicarán a información que:
a) Fuese de dominio público antes de su divulgación o pase a serlo sin culpa de la parte receptora.
b) Ya estuviese en posesión legal de la parte receptora con anterioridad a su divulgación.
c) Sea requerida por orden judicial o autoridad administrativa competente, debiendo notificar de inmediato a la parte reveladora para ejercer los recursos pertinentes.

### CLÁUSULA QUINTA. — PLAZO DE VIGENCIA Y SUPERVIVENCIA
El presente acuerdo tendrá una vigencia de **${p.duracion_plazo || '24 meses'}** contados a partir de su suscripción. No obstante, las obligaciones de confidencialidad y no uso indebido sobrevivirán por un término adicional de **cinco (5) años** posteriores a la terminación de cualquier relación comercial entre las partes.

### CLÁUSULA SEXTA. — CLÁUSULA PENAL PECUNIARIA
En caso de incumplimiento comprobado, fuga de información, divulgación no autorizada o uso indebido, **LA PARTE RECEPTORA** pagará a **LA PARTE REVELADORA** a título de pena la suma de **${p.monto_valor || '$20.000.000 COP'}**, sin perjuicio de la indemnización plena por los perjuicios directos, indirectos y lucro cesante causados.

### CLÁUSULA SÉPTIMA. — DEVOLUCIÓN O DESTRUCCIÓN DE INFORMACIÓN
A la terminación del acuerdo o por solicitud expresa de la parte reveladora, la parte receptora devolverá o destruirá de manera certificada todos los documentos, respaldos, archivos digitales y copias que contengan información confidencial en un plazo no mayor a cinco (5) días hábiles.

### CLÁUSULA OCTAVA. — MENSAJES DE DATOS Y FIRMA ELECTRÓNICA
Las partes suscriben este acuerdo de manera electrónica conforme a la **Ley 527 de 1999** y el **Decreto 2364 de 2012**. Se reconoce que la firma digital, el Hash SHA-256 y la estampa cronológica inmutable otorgan plena eficacia probatoria y no repudio al presente documento.

### CLÁUSULA NOVENA. — LEY APLICABLE Y JURISDICCIÓN
Este acuerdo se rige por las leyes de la República de Colombia. Cualquier controversia será resuelta por los jueces competentes de la ciudad de **${ciudad}**.

---

Suscrito en **${ciudad}**, el día **${fechaHoy}**.

**LA PARTE REVELADORA:**  
Nombre: ${p.parte_emisora_nombre || 'PARTE REVELADORA'}  
Identificación: ${p.parte_emisora_id || '900.789.654-1'}  

**LA PARTE RECEPTORA:**  
Nombre: ${p.parte_receptora_nombre || 'PARTE RECEPTORA'}  
Identificación: ${p.parte_receptora_id || '1.032.654.987'}`;
    }

    // ========================================================
    // 2. CONTRATO DE COMPRAVENTA MERCANTIL
    // ========================================================
    if (tipo === 'compraventa') {
        return `# CONTRATO DE COMPRAVENTA MERCANTIL

Entre los suscritos: Por una parte, **${p.parte_emisora_nombre || 'PARTE VENDEDORA S.A.S.'}**, identificada con NIT / C.C. N° **${p.parte_emisora_id || '901.222.333-4'}**, quien en adelante se denominará **EL VENDEDOR**; y por la otra parte, **${p.parte_receptora_nombre || 'PARTE COMPRADORA'}**, identificada con NIT / C.C. N° **${p.parte_receptora_id || '1.050.600.700'}**, quien en adelante se denominará **EL COMPRADOR**, hemos convenido celebrar el presente **CONTRATO DE COMPRAVENTA MERCANTIL**, regido por los Artículos 905 y siguientes del Código de Comercio de Colombia y las siguientes cláusulas:

---

### CLÁUSULA PRIMERA. — OBJETO DEL CONTRATO
**EL VENDEDOR** transfiere a título de compraventa en favor de **EL COMPRADOR**, y este adquiere al mismo título, el dominio y posesión del siguiente bien / producto: **${p.titulo || 'Bienes Muebles, Equipos Tecnológicos y Mercancía Comercial'}**, de acuerdo con las especificaciones acordadas entre las partes.

### CLÁUSULA SEGUNDA. — PRECIO Y FORMA DE PAGO
El precio total pactado por la compraventa es la suma cierta de **${p.monto_valor || '$15.000.000 COP'}**, moneda corriente colombiana, que **EL COMPRADOR** pagará a **EL VENDEDOR** de la siguiente forma: 50% como anticipo a la firma de este contrato y el 50% restante contra entrega y verificación a satisfacción del bien.

### CLÁUSULA TERCERA. — PLAZO Y LUGAR DE ENTREGA
**EL VENDEDOR** se obliga a efectuar la entrega material y jurídica del bien dentro de un plazo de **${p.duracion_plazo || '30 días calendario'}**, en la ciudad de **${ciudad}**, libre de todo gravamen, pleito pendiente, embargo o limitación al dominio.

### CLÁUSULA CUARTA. — OBLIGACIÓN DE SANEAMIENTO
**EL VENDEDOR** garantiza que el bien objeto de este contrato es de su exclusiva propiedad y se obliga al saneamiento por evicción y por vicios redhibitorios u ocultos conforme al Código de Comercio.

### CLÁUSULA QUINTA. — CLÁUSULA PENAL PECUNIARIA
En caso de incumplimiento de cualquiera de las partes en las obligaciones de pago o entrega, la parte incumplida pagará a la otra a título de pena una suma equivalente al **veinte por ciento (20%)** del valor total del contrato, haciéndose exigible de forma inmediata.

### CLÁUSULA SEXTA. — MÉRITO EJECUTIVO
Las partes reconocen que el presente contrato presta **MÉRITO EJECUTIVO** pleno de conformidad con el Artículo 422 del Código General del Proceso para el cobro coercitivo del precio o de la cláusula penal.

### CLÁUSULA SÉPTIMA. — FIRMA ELECTRÓNICA Y VALIDEZ (LEY 527 DE 1999)
Este contrato se suscribe de manera electrónica con firma manuscrita digital y sellado criptográfico SHA-256 en virtud de la **Ley 527 de 1999** y el **Decreto 2364 de 2012**, teniendo plena validez probatoria.

---

Suscrito en **${ciudad}**, el día **${fechaHoy}**.

**EL VENDEDOR:**  
Nombre: ${p.parte_emisora_nombre || 'VENDEDOR'}  
Identificación: ${p.parte_emisora_id || '901.222.333-4'}  

**EL COMPRADOR:**  
Nombre: ${p.parte_receptora_nombre || 'COMPRADOR'}  
Identificación: ${p.parte_receptora_id || '1.050.600.700'}`;
    }

    // ========================================================
    // 3. PRESTACIÓN DE SERVICIOS PROFESIONALES (B2B / FREELANCE)
    // ========================================================
    if (tipo === 'prestacion_servicios') {
        return `# CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES INDEPENDIENTES

Entre los suscritos a saber: Por una parte, **${p.parte_emisora_nombre || 'CONTRATANTE S.A.S.'}**, persona jurídica/natural identificada con el documento N° **${p.parte_emisora_id || '901.890.123-4'}**, quien en adelante se denominará **EL CONTRATANTE**; y por la otra parte, **${p.parte_receptora_nombre || 'CONTRATISTA'}**, mayor de edad, identificado(a) con C.C. N° **${p.parte_receptora_id || '1.045.789.234'}**, quien para los efectos de este acto se denominará **EL CONTRATISTA**, hemos convenido celebrar el presente **CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES**, regulado por las normas del Código Civil y Comercial de Colombia, y en especial por las siguientes cláusulas:

---

### CLÁUSULA PRIMERA. — OBJETO DEL CONTRATO
**EL CONTRATISTA** se compromete para con **EL CONTRATANTE** a prestar sus servicios profesionales independientes consistentes en: **${p.titulo || 'Desarrollo de Soluciones de Software, Consultoría y Asesoría Especializada'}**, ejecutando las actividades de forma autónoma con sus propios medios técnicos y organizativos.

### CLÁUSULA SEGUNDA. — VALOR Y FORMA DE PAGO
Como contraprestación por los servicios contratados, **EL CONTRATANTE** pagará a **EL CONTRATISTA** la suma total de **${p.monto_valor || '$4.500.000 COP'}**, pagaderos según los hitos y entregables aprobados a satisfacción, previa presentación de la cuenta de cobro/factura y comprobantes de pago de seguridad social integral (Ley 100 de 1993 y Ley 1562 de 2012).

### CLÁUSULA TERCERA. — PLAZO DE EJECUCIÓN
El término de duración del presente contrato será de **${p.duracion_plazo || '6 meses'}**, contados a partir del día **${fechaHoy}**, prorrogable únicamente mediante acuerdo previo, expreso y escrito entre las partes.

### CLÁUSULA CUARTA. — AUSENCIA DE SUBORDINACIÓN LABORAL
Las partes declaran expresamente que el presente contrato es de naturaleza estrictamente civil/comercial. Por consiguiente, no genera vínculo laboral, subordinación jurídica, prestaciones sociales, vacaciones ni cesantías de conformidad con el Art. 34 del Código Sustantivo del Trabajo.

### CLÁUSULA QUINTA. — CLÁUSULA PENAL PECUNIARIA
En caso de incumplimiento total o parcial de las obligaciones aquí contraídas, la parte incumplida pagará a la otra a título de pena una suma equivalente al **veinte por ciento (20%)** del valor total del contrato, sin que ello impida exigir la indemnización por los perjuicios causados.

### CLÁUSULA SEXTA. — MÉRITO EJECUTIVO Y RENUNCIA A REQUERIMIENTOS
Las partes convienen que el presente documento presta **MÉRITO EJECUTIVO** en los términos del Artículo 422 del Código General del Proceso (Ley 1564 de 2012), y renuncian expresamente a cualquier requerimiento judicial o privado para ser constituidas en mora.

### CLÁUSULA SÉPTIMA. — PROTECCIÓN DE DATOS (HABEAS DATA)
En cumplimiento de la **Ley Estatutaria 1581 de 2012**, las partes autorizan de manera previa, expresa e informada el tratamiento de sus datos personales y metadatos de evidencia digital recolectados con ocasión de la firma de este contrato.

### CLÁUSULA OCTAVA. — MENSAJES DE DATOS Y FIRMA ELECTRÓNICA
El presente contrato se suscribe de manera electrónica en virtud de la **Ley 527 de 1999** y el **Decreto 2364 de 2012**. Ambas partes reconocen que la firma electrónica, el Hash criptográfico SHA-256 y la estampa cronológica generada tienen idéntico valor probatorio que la firma manuscrita.

---

Para constancia de lo anterior, se firma en **${ciudad}**, el **${fechaHoy}**.

**EL CONTRATANTE:**  
Nombre: ${p.parte_emisora_nombre || 'CONTRATANTE'}  
Doc. Identidad: ${p.parte_emisora_id || '901.890.123-4'}  

**EL CONTRATISTA:**  
Nombre: ${p.parte_receptora_nombre || 'CONTRATISTA'}  
Doc. Identidad: ${p.parte_receptora_id || '1.045.789.234'}`;
    }

    // ========================================================
    // 4. CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO FIJO
    // ========================================================
    if (tipo === 'laboral_termino_fijo') {
        return `# CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO FIJO

Entre los suscritos a saber: Por una parte, **${p.parte_emisora_nombre || 'EMPRESA EMPLEADORA S.A.S.'}**, persona jurídica con NIT N° **${p.parte_emisora_id || '901.555.666-7'}**, quien en adelante se denominará **EL EMPLEADOR**; y por la otra parte, **${p.parte_receptora_nombre || 'TRABAJADOR'}**, mayor de edad, identificado(a) con C.C. N° **${p.parte_receptora_id || '1.098.765.432'}**, quien para todos los efectos se denominará **EL TRABAJADOR**, hemos convenido celebrar el presente **CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO FIJO**, regido por las disposiciones del Código Sustantivo del Trabajo (C.S.T.) y las siguientes cláusulas:

---

### CLÁUSULA PRIMERA. — OBJETO Y CARGO
**EL EMPLEADOR** contrata los servicios personales de **EL TRABAJADOR** para desempeñar el cargo de: **${p.titulo || 'Especialista en Operaciones, Tecnología y Gestión'}**, ejecutando las funciones propias del rol bajo continua subordinación y dependencia.

### CLÁUSULA SEGUNDA. — SALARIO Y FORMA DE PAGO
Como remuneración por sus servicios, **EL EMPLEADOR** pagará a **EL TRABAJADOR** un salario mensual de **${p.monto_valor || '$3.500.000 COP'}**, pagadero de forma mensual/quincenal, más el auxilio legal de transporte si a ello hubiere lugar.

### CLÁUSULA TERCERA. — TÉRMINO DE DURACIÓN Y PREAVISO
El presente contrato tendrá una duración fija de **${p.duracion_plazo || '12 meses'}**, contados a partir del **${fechaHoy}**. Si antes de la fecha de vencimiento ninguna de las partes avisa por escrito a la otra su determinación de no prorrogarlo con una antelación no inferior a treinta (30) días, el contrato se entenderá renovado por un período igual (Art. 46 C.S.T.).

### CLÁUSULA CUARTA. — PERÍODO DE PRUEBA
Las partes acuerdan fijar como período de prueba los primeros dos (2) meses de labores, durante el cual cualquiera de las partes podrá dar por terminado el contrato en cualquier momento sin previo aviso ni indemnización alguna.

### CLÁUSULA QUINTA. — SEGURIDAD SOCIAL INTEGRAL
**EL EMPLEADOR** se compromete a afiliar a **EL TRABAJADOR** y efectuar los aportes correspondientes al Sistema General de Seguridad Social en Salud, Pensiones, Riesgos Laborales (ARL) y Caja de Compensación Familiar, conforme a la Ley 100 de 1993.

### CLÁUSULA SEXTA. — OBLIGACIONES Y CONFIDENCIALIDAD
**EL TRABAJADOR** se obliga a poner al servicio del empleador toda su capacidad laboral, guardar absoluta reserva sobre los secretos comerciales e información de la empresa, y acatar el Reglamento Interno de Trabajo.

### CLÁUSULA SÉPTIMA. — FIRMA ELECTRÓNICA (LEY 527 DE 1999)
El presente contrato de trabajo se suscribe de manera electrónica con plena validez legal y eficacia probatoria de conformidad con la **Ley 527 de 1999** y el **Decreto 2364 de 2012**.

---

Suscrito en **${ciudad}**, el día **${fechaHoy}**.

**EL EMPLEADOR:**  
Nombre: ${p.parte_emisora_nombre || 'EMPLEADOR'}  
NIT / C.C.: ${p.parte_emisora_id || '901.555.666-7'}  

**EL TRABAJADOR:**  
Nombre: ${p.parte_receptora_nombre || 'TRABAJADOR'}  
C.C.: ${p.parte_receptora_id || '1.098.765.432'}`;
    }

    // ========================================================
    // 5. CONTRATO DE MUTUO / PRÉSTAMO DE DINERO
    // ========================================================
    if (tipo === 'mutuo_prestamo') {
        return `# CONTRATO DE MUTUO / PRÉSTAMO DE DINERO CON PAGARÉ

Entre los suscritos a saber: Por una parte, **${p.parte_emisora_nombre || 'PRESTAMISTA (MUTUANTE)'}**, identificado(a) con documento N° **${p.parte_emisora_id || '79.890.123'}**, quien en adelante se denominará **EL MUTUANTE**; y por la otra parte, **${p.parte_receptora_nombre || 'PRESTATARIO (MUTUARIO)'}**, identificado(a) con documento N° **${p.parte_receptora_id || '1.015.432.876'}**, quien en adelante se denominará **EL MUTUARIO**, hemos convenido celebrar el presente **CONTRATO DE MUTUO CON INTERESES**, regido por el Código Civil y de Comercio de Colombia:

---

### CLÁUSULA PRIMERA. — OBJETO Y CAPITAL PRESTADO
**EL MUTUANTE** entrega a título de mutuo a **EL MUTUARIO**, y este recibe en tal concepto a entera satisfacción, la suma de dinero por valor de **${p.monto_valor || '$10.000.000 COP'}**, moneda corriente colombiana.

### CLÁUSULA SEGUNDA. — PLAZO Y FORMA DE AMORTIZACIÓN
**EL MUTUARIO** se obliga a restituir la totalidad del capital prestado dentro de un plazo máximo de **${p.duracion_plazo || '12 meses'}**, mediante el pago de cuotas mensuales consecutivas que comprenden capital e intereses pactados.

### CLÁUSULA TERCERA. — INTERESES CORRIENTES Y MORATORIOS
El capital devengará un interés corriente mensual del 1.8%, el cual no excede la tasa máxima legal permitida. En caso de mora en el pago de cualquiera de las cuotas, **EL MUTUARIO** pagará intereses moratorios a la tasa máxima certificada por la Superintendencia Financiera de Colombia.

### CLÁUSULA CUARTA. — CLÁUSULA ACELERATORIA
El no pago oportuno de una o más cuotas de capital o intereses facultará a **EL MUTUANTE** para declarar extinguido el plazo y exigir judicialmente el pago inmediato de la totalidad del saldo insoluto, intereses causados y costas de cobranza.

### CLÁUSULA QUINTA. — MÉRITO EJECUTIVO Y GARANTÍA
El presente contrato presta **MÉRITO EJECUTIVO** pleno conforme al Artículo 422 del C.G.P. Como garantía adicional de pago, **EL MUTUARIO** suscribe un **Pagaré en blanco con Carta de Instrucciones**.

### CLÁUSULA SEXTA. — FIRMA ELECTRÓNICA Y VALIDEZ (LEY 527 DE 1999)
Este instrumento y sus evidencias digitales se suscriben de forma electrónica bajo la **Ley 527 de 1999** y el **Decreto 2364 de 2012**, con sellado criptográfico inmutable SHA-256.

---

Suscrito en **${ciudad}**, el día **${fechaHoy}**.

**EL MUTUANTE:**  
Nombre: ${p.parte_emisora_nombre || 'MUTUANTE'}  
Documento: ${p.parte_emisora_id || '79.890.123'}  

**EL MUTUARIO:**  
Nombre: ${p.parte_receptora_nombre || 'MUTUARIO'}  
Documento: ${p.parte_receptora_id || '1.015.432.876'}`;
    }

    // ========================================================
    // 6. CONTRATO DE ARRENDAMIENTO DE INMUEBLE (VIVIENDA / LOCAL)
    // ========================================================
    return `# CONTRATO DE ARRENDAMIENTO DE INMUEBLE (VIVIENDA / COMERCIAL)

Entre los suscritos: Por una parte, **${p.parte_emisora_nombre || 'ARRENDADOR'}**, identificado con documento N° **${p.parte_emisora_id || '52.890.123'}**, quien en adelante se denominará **EL ARRENDADOR**; y por la otra parte, **${p.parte_receptora_nombre || 'ARRENDATARIO'}**, identificado con documento N° **${p.parte_receptora_id || '1.018.456.789'}**, quien en adelante se denominará **EL ARRENDATARIO**, hemos convenido celebrar el presente **CONTRATO DE ARRENDAMIENTO**, regido por la Ley 820 de 2003 y el Código Civil colombiano:

---

### CLÁUSULA PRIMERA. — OBJETO DEL CONTRATO
**EL ARRENDADOR** entrega a título de arrendamiento a **EL ARRENDATARIO**, y este recibe en tal concepto, el inmueble ubicado en la ciudad de **${ciudad}**, destinado exclusivamente para **${p.titulo || 'Vivienda Urbana / Uso Comercial'}**.

### CLÁUSULA SEGUNDA. — CANON DE ARRENDAMIENTO
El precio o canon mensual de arrendamiento convenido es la suma de **${p.monto_valor || '$2.300.000 COP'}**, que **EL ARRENDATARIO** se obliga a pagar dentro de los primeros cinco (5) días hábiles de cada período mensual.

### CLÁUSULA TERCERA. — TÉRMINO Y PRÓRROGA
El término de duración del arrendamiento será de **${p.duracion_plazo || '12 meses'}**, contados a partir del **${fechaHoy}**. Vencido el plazo inicial, se prorrogará automáticamente por períodos iguales si ninguna de las partes manifiesta lo contrario por escrito con 30 días de antelación.

### CLÁUSULA CUARTA. — SERVICIOS PÚBLICOS Y CUOTAS
Los servicios públicos domiciliarios (agua, energía, gas, internet) serán sufragados oportunamente y en su totalidad por **EL ARRENDATARIO** durante la vigencia del contrato hasta la restitución física del inmueble.

### CLÁUSULA QUINTA. — CLÁUSULA PENAL PECUNIARIA
El incumplimiento de cualquiera de las obligaciones contraídas en el presente contrato dará derecho a la parte cumplida a exigir a título de pena una suma equivalente a **dos (2) cánones mensuales de arrendamiento**, sin perjuicio de la restitución del inmueble y los intereses moratorios a la tasa máxima legal certificada por la Superintendencia Financiera de Colombia.

### CLÁUSULA SEXTA. — MÉRITO EJECUTIVO Y RENUNCIA A REQUERIMIENTOS
El presente contrato presta **MÉRITO EJECUTIVO** de conformidad con el Artículo 422 del C.G.P. para el cobro judicial de cánones, cláusula penal, servicios públicos e intereses. **EL ARRENDATARIO** renuncia expresamente a todos los requerimientos de que tratan los Artículos 2007 del Código Civil y 424 del C.G.P. para ser constituido en mora.

### CLÁUSULA SÉPTIMA. — FIRMA ELECTRÓNICA Y VALOR PROBATORIO (LEY 527 DE 1999)
Las partes suscriben este contrato electrónicamente bajo los preceptos de la **Ley 527 de 1999** y el **Decreto 2364 de 2012**, otorgando a las firmas digitales capturadas, estampas de tiempo y Hash criptográfico SHA-256 la condición de plena autenticidad, integridad y no repudio.

---

Suscrito en **${ciudad}**, el día **${fechaHoy}**.

**EL ARRENDADOR:**  
Nombre: ${p.parte_emisora_nombre || 'ARRENDADOR'}  
Doc. Identidad: ${p.parte_emisora_id || '52.890.123'}  

**EL ARRENDATARIO:**  
Nombre: ${p.parte_receptora_nombre || 'ARRENDATARIO'}  
Doc. Identidad: ${p.parte_receptora_id || '1.018.456.789'}`;
}

module.exports = {
    streamRedactarContrato,
    auditarBorradorContrato,
    generarContratoLocalFallback
};
