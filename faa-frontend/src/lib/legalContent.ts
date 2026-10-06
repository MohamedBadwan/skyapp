import type { Lang } from './types';

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocumentContent = {
  title: string;
  updatedAt: string;
  introduction: string[];
  sections: LegalSection[];
};

export type LocalizedLegalDocument = Record<Lang, LegalDocumentContent>;

export const privacyPolicy: LocalizedLegalDocument = {
  es: {
    title: 'Política de Privacidad',
    updatedAt: '23 de agosto de 2026',
    introduction: [
      'Esta Política de Privacidad describe cómo SkyMentor Academy, un servicio operado por Infinite Flight Inc. (DBA "Global Tech Growth"), sociedad constituida en Florida, EE. UU. ("nosotros", "SkyMentor"), recopila, usa y protege tu información cuando usas nuestra plataforma de preparación para los exámenes de mecánico de aviación de la FAA, incluyendo el sitio web, la aplicación SkyApp, la masterclass "Camino al A&P" y los materiales de estudio (en conjunto, el "Servicio").',
      'Al usar el Servicio, aceptas las prácticas descritas en esta política.',
    ],
    sections: [
      {
        title: '1. Información que recopilamos',
        paragraphs: [
          'Datos de cuenta. Cuando te registras: nombre, correo electrónico y contraseña. Las contraseñas se almacenan cifradas — nunca en texto plano, y nuestro personal no puede verlas.',
          'Progreso de estudio. Tus resultados de práctica: materias estudiadas, porcentajes de acierto, exámenes simulados completados y avance por materia. Lo usamos para mostrarte tu progreso y personalizar tu experiencia.',
          'Datos de pago. El cobro (incluido el cobro recurrente de las suscripciones) se procesa a través de Stripe, nuestro procesador de pagos externo. No almacenamos números de tarjeta ni credenciales bancarias en nuestros servidores; Stripe los tokeniza y custodia conforme al estándar PCI-DSS. Nosotros solo recibimos confirmación del pago y los datos necesarios para tu factura (por ejemplo, estado del pago y últimos dígitos).',
          'Comunicaciones. Correos y mensajes que nos envíes (soporte, consultas) y tu participación en canales del curso (por ejemplo, grupos de WhatsApp o clases por Zoom, sujetos a las políticas de esas plataformas).',
          'Datos técnicos. Información estándar de uso: dirección IP, tipo de navegador, páginas visitadas y registros del servidor, usados para seguridad y mejora del Servicio.',
        ],
      },
      {
        title: '2. Micrófono y voz (práctica del examen oral)',
        paragraphs: [
          'La función de práctica oral te permite responder hablando. Este reconocimiento de voz lo realiza tu propio navegador (Web Speech API, disponible en Chrome/Edge): el audio es procesado por el proveedor de tu navegador según sus propias políticas. SkyMentor no graba ni almacena tu voz en sus servidores. Solo procesamos el texto resultante de tu respuesta, temporalmente, para darte retroalimentación. Puedes usar el Servicio sin activar el micrófono.',
        ],
      },
      {
        title: '3. Inteligencia artificial y funciones asistidas',
        paragraphs: [
          'El Servicio utiliza inteligencia artificial (incluidos modelos de lenguaje) para generar y seleccionar preguntas, evaluar tus respuestas, ofrecer retroalimentación, simular un examinador oral y personalizar tu estudio. Para ello, procesamos el texto de tus respuestas e interacciones con estas funciones. Este procesamiento puede realizarse a través de proveedores de tecnología de IA que actúan en nuestro nombre. Usamos estos datos para darte retroalimentación y para mejorar y evaluar la calidad del contenido y del Servicio. El contenido generado por IA puede contener errores; consulta el descargo correspondiente en los Términos y Condiciones.',
        ],
      },
      {
        title: '4. Cómo usamos tu información',
        paragraphs: [
          'Usamos tus datos para: proveer y operar el Servicio; guardar y mostrarte tu progreso; procesar pagos y administrar tu suscripción (a través de Stripe); darte soporte; enviarte comunicaciones del curso y de marketing (recordatorios de clase, material nuevo, promociones y avisos importantes); mejorar el contenido, la plataforma y nuestras funciones de IA; y proteger el Servicio contra fraude y accesos no autorizados.',
          'Puedes darte de baja de los correos promocionales en cualquier momento mediante el enlace incluido en cada correo o escribiéndonos, conforme a la ley CAN-SPAM. Aun así, podremos enviarte comunicaciones transaccionales necesarias (confirmaciones de pago, avisos de cuenta o de la suscripción).',
          'No vendemos, alquilamos ni cedemos tu información personal a terceros para su propio mercadeo.',
        ],
      },
      {
        title: '5. Con quién compartimos datos',
        paragraphs: [
          'Compartimos datos solo con los proveedores necesarios para operar el Servicio: alojamiento web y base de datos, procesamiento de pagos (Stripe), videoconferencia (Zoom) para las clases en vivo, servicios de correo electrónico y proveedores de tecnología de IA. Cada proveedor procesa los datos según sus propias políticas de privacidad y solo en la medida necesaria para prestar su función. También podríamos divulgar información si la ley lo exige (por ejemplo, una orden judicial) o en el marco de una operación corporativa (fusión, adquisición o venta de activos).',
        ],
      },
      {
        title: '6. Conservación y seguridad',
        paragraphs: [
          'Conservamos tus datos mientras tu cuenta esté activa y durante el tiempo necesario para cumplir obligaciones legales. Aplicamos medidas de seguridad estándar de la industria: cifrado de contraseñas, conexiones HTTPS, y acceso restringido a los sistemas. Ningún sistema es 100% infalible, pero tratamos tus datos con el mismo estándar de cuidado que le enseñamos a nuestros alumnos en el hangar: con procedimiento y sin atajos.',
        ],
      },
      {
        title: '7. Tus derechos',
        paragraphs: [
          'Puedes: acceder a los datos que tenemos sobre ti; corregirlos; solicitar la eliminación de tu cuenta y sus datos; y darte de baja de los correos del curso y de marketing en cualquier momento. Para ejercer cualquiera de estos derechos, escríbenos a jdigitalgroupsolutions@gmail.com. Responderemos dentro de un plazo razonable (máximo 30 días).',
        ],
      },
      {
        title: '8. Menores de edad',
        paragraphs: [
          'El Servicio está dirigido a personas de 18 años o más (la edad mínima para el certificado de mecánico de la FAA). No recopilamos conscientemente datos de menores de 18 años; si crees que un menor nos ha proporcionado datos, contáctanos y los eliminaremos.',
        ],
      },
      {
        title: '9. Cookies y almacenamiento local',
        paragraphs: [
          'Usamos cookies y almacenamiento local del navegador (localStorage) para funciones esenciales: mantener tu sesión iniciada, recordar tu idioma y guardar preferencias. No usamos cookies de publicidad de terceros.',
        ],
      },
      {
        title: '10. Cambios a esta política',
        paragraphs: [
          'Si cambiamos esta política, publicaremos la versión nueva aquí con su fecha de actualización, y si el cambio es significativo te lo notificaremos por correo o dentro de la app.',
        ],
      },
      {
        title: '11. Contacto',
        paragraphs: [
          'Infinite Flight Inc. (DBA "Global Tech Growth") — operador de SkyMentor Academy / SkyApp',
          '1501 Belvedere Road, Suite 500, Office 518, West Palm Beach, FL 33406, EE. UU.',
          'Correo: jdigitalgroupsolutions@gmail.com',
          'Web: skymentoracademy.com',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updatedAt: 'August 23, 2026',
    introduction: [
      'This Privacy Policy explains how SkyMentor Academy, a service operated by Infinite Flight Inc. (DBA "Global Tech Growth"), a corporation formed in Florida, United States ("we," "us," or "SkyMentor"), collects, uses, and protects your information when you use our FAA aviation mechanic exam-preparation platform, including the website, the SkyApp application, the "Camino al A&P" masterclass, and study materials (collectively, the "Service").',
      'By using the Service, you agree to the practices described in this policy.',
    ],
    sections: [
      {
        title: '1. Information we collect',
        paragraphs: [
          'Account data. When you sign up: your name, email address, and password. Passwords are stored encrypted—never as plain text—and our staff cannot see them.',
          'Study progress. Your practice results: subjects studied, correct-answer percentages, completed practice exams, and progress by subject. We use this to show your progress and personalize your experience.',
          'Payment data. Charges, including recurring subscription charges, are processed through Stripe, our external payment processor. We do not store card numbers or banking credentials on our servers; Stripe tokenizes and safeguards them in accordance with the PCI-DSS standard. We only receive payment confirmation and the information needed for your invoice, such as payment status and the last digits.',
          'Communications. Emails and messages you send us (support or questions) and your participation in course channels, such as WhatsApp groups or Zoom classes, which are subject to those platforms’ policies.',
          'Technical data. Standard usage information: IP address, browser type, visited pages, and server logs, used for security and Service improvements.',
        ],
      },
      {
        title: '2. Microphone and voice (oral-exam practice)',
        paragraphs: [
          'The oral-practice feature lets you answer by speaking. Your browser performs this speech recognition through the Web Speech API, available in Chrome and Edge; your browser provider processes the audio under its own policies. SkyMentor does not record or store your voice on its servers. We only process the resulting text from your response temporarily to give you feedback. You can use the Service without enabling the microphone.',
        ],
      },
      {
        title: '3. Artificial intelligence and assisted features',
        paragraphs: [
          'The Service uses artificial intelligence, including language models, to generate and select questions, evaluate your answers, provide feedback, simulate an oral examiner, and personalize your study. For this purpose, we process the text of your answers and interactions with these features. This processing may be performed through AI technology providers acting on our behalf. We use this data to give you feedback and to improve and evaluate the quality of the content and the Service. AI-generated content may contain errors; see the related disclaimer in the Terms and Conditions.',
        ],
      },
      {
        title: '4. How we use your information',
        paragraphs: [
          'We use your data to provide and operate the Service; save and show your progress; process payments and manage your subscription through Stripe; provide support; send course and marketing communications, including class reminders, new material, promotions, and important notices; improve the content, platform, and our AI features; and protect the Service against fraud and unauthorized access.',
          'You may unsubscribe from promotional emails at any time using the link in each email or by writing to us, in accordance with the CAN-SPAM Act. We may still send necessary transactional communications, such as payment confirmations, account notices, or subscription notices.',
          'We do not sell, rent, or transfer your personal information to third parties for their own marketing.',
        ],
      },
      {
        title: '5. Who we share data with',
        paragraphs: [
          'We share data only with the providers needed to operate the Service: web hosting and databases, payment processing through Stripe, Zoom videoconferencing for live classes, email services, and AI technology providers. Each provider processes data under its own privacy policies and only to the extent necessary to perform its function. We may also disclose information when required by law, such as under a court order, or as part of a corporate transaction, such as a merger, acquisition, or asset sale.',
        ],
      },
      {
        title: '6. Retention and security',
        paragraphs: [
          'We retain your data while your account is active and for the time necessary to meet legal obligations. We apply standard industry security measures: password encryption, HTTPS connections, and restricted system access. No system is 100% infallible, but we handle your data with the same standard of care we teach our students in the hangar: with procedure and without shortcuts.',
        ],
      },
      {
        title: '7. Your rights',
        paragraphs: [
          'You may access the data we hold about you, correct it, request deletion of your account and its data, and unsubscribe from course and marketing emails at any time. To exercise any of these rights, write to jdigitalgroupsolutions@gmail.com. We will respond within a reasonable period, no later than 30 days.',
        ],
      },
      {
        title: '8. Minors',
        paragraphs: [
          'The Service is intended for people 18 years of age or older, the minimum age for an FAA mechanic certificate. We do not knowingly collect data from people under 18. If you believe that a minor has provided us with data, contact us and we will delete it.',
        ],
      },
      {
        title: '9. Cookies and local storage',
        paragraphs: [
          'We use cookies and browser local storage for essential functions: keeping you signed in, remembering your language, and saving preferences. We do not use third-party advertising cookies.',
        ],
      },
      {
        title: '10. Changes to this policy',
        paragraphs: [
          'If we change this policy, we will publish the new version here with its date. If the change is significant, we will notify you by email or in the app.',
        ],
      },
      {
        title: '11. Contact',
        paragraphs: [
          'Infinite Flight Inc. (DBA "Global Tech Growth") — operator of SkyMentor Academy / SkyApp',
          '1501 Belvedere Road, Suite 500, Office 518, West Palm Beach, FL 33406, United States',
          'Email: jdigitalgroupsolutions@gmail.com',
          'Website: skymentoracademy.com',
        ],
      },
    ],
  },
};

export const termsAndConditions: LocalizedLegalDocument = {
  es: {
    title: 'Términos y Condiciones de Uso',
    updatedAt: '23 de agosto de 2026',
    introduction: [
      'Estos Términos y Condiciones (los "Términos") regulan el uso de la plataforma de SkyMentor Academy, un servicio operado por Infinite Flight Inc. (DBA "Global Tech Growth"), sociedad constituida bajo las leyes del Estado de Florida, EE. UU. (en conjunto, "SkyMentor", "nosotros"), incluyendo el sitio web, la aplicación SkyApp, la masterclass "Camino al A&P", las guías de estudio y demás materiales (en conjunto, el "Servicio").',
      'Al crear una cuenta, comprar o usar el Servicio, aceptas estos Términos. Si no estás de acuerdo, no uses el Servicio.',
    ],
    sections: [
      {
        title: '1. El Servicio',
        paragraphs: [
          'SkyMentor es una plataforma educativa de preparación para los exámenes del certificado de mecánico de aviación (A&P) de la FAA. Incluye, según tu plan: clases en vivo y grabadas, bancos de preguntas de práctica (escrito y oral), guías de estudio, simuladores de examen, seguimiento de progreso y funciones asistidas por inteligencia artificial (ver Sección 5).',
        ],
      },
      {
        title: '2. Tu cuenta',
        paragraphs: [
          'Tu cuenta es personal e intransferible. Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad realizada con tu cuenta. Está prohibido compartir tus credenciales o dar acceso a terceros; detectar cuentas compartidas puede resultar en la suspensión o cancelación de la cuenta sin reembolso. Debes proporcionar información veraz al registrarte y tener al menos 18 años.',
        ],
      },
      {
        title: '3. Propiedad intelectual y licencia de uso',
        paragraphs: [
          'Todo el contenido original del Servicio — bancos de preguntas, guías de estudio, la aplicación, videos, textos, diseño y marca — es propiedad de SkyMentor y está protegido por las leyes de propiedad intelectual.',
          'Al comprar, recibes una licencia personal, limitada, no exclusiva e intransferible para usar el contenido con fines de estudio propio. Queda estrictamente prohibido copiar, reproducir, distribuir, publicar, revender o compartir el contenido (incluyendo las guías PDF y los bancos de preguntas, total o parcialmente); extraer o descargar masivamente preguntas (scraping); usar el contenido para crear productos o cursos competidores; o retirar avisos de marca o autoría.',
          'Los documentos oficiales de la FAA incluidos en el material (handbooks, formularios, estándares) son de dominio público del gobierno de los EE. UU.; el resto del paquete es contenido propio de SkyMentor.',
          'La violación de esta sección termina tu licencia de inmediato y puede generar responsabilidad legal.',
        ],
      },
      {
        title: '4. Pagos, suscripción y renovación automática',
        paragraphs: [
          'Los precios se muestran de forma clara antes de la compra. Los pagos se procesan a través de Stripe, nuestro procesador de pagos. SkyMentor no almacena los datos de tu tarjeta; Stripe los tokeniza y custodia conforme a los estándares PCI-DSS.',
          'Planes de suscripción (cobro recurrente). Si tu plan es de suscripción, al suscribirte autorizas expresamente cargos automáticos y recurrentes de la tarifa correspondiente a tu método de pago, a través de Stripe, cada período (mensual o anual, según el plan), hasta que canceles.',
          'Compras de pago único. Algunos productos (por ejemplo, una masterclass o guía) pueden venderse como compra única, sin renovación. En ese caso no hay cobros recurrentes.',
        ],
        bullets: [
          'Renovación automática: tu suscripción se renueva automáticamente al final de cada período por un período igual, y se cobra al precio entonces vigente, salvo que canceles antes de la fecha de renovación. Esta condición se divulga de forma clara y visible al momento de la compra, conforme a la ley federal aplicable (incluida ROSCA) y a la Sección 501.165 de los Estatutos de Florida (renovación automática de contratos de servicio).',
          'Consentimiento en el punto de pago: antes de completar la compra de un plan recurrente, debes marcar activamente una casilla confirmando que entiendes y aceptas el cobro recurrente y la renovación automática (ver Anexo A).',
          'Cambios de precio: podemos modificar los precios; te notificaremos con antelación razonable y el nuevo precio aplicará en la siguiente renovación. Tu uso continuado o la no cancelación implican aceptación del nuevo precio.',
          'Pagos rechazados: si un cargo es rechazado, podemos reintentar el cobro y/o suspender tu acceso hasta regularizar el pago.',
        ],
      },
      {
        title: '5. Uso de inteligencia artificial (IA)',
        paragraphs: [
          'El Servicio utiliza tecnologías de inteligencia artificial, incluidos modelos de lenguaje, para generar y seleccionar preguntas de práctica, evaluar respuestas, ofrecer retroalimentación, simular un examinador oral (DME virtual) y personalizar tu estudio. Reconoces y aceptas que:',
        ],
        bullets: [
          'El contenido generado por IA puede contener errores, imprecisiones u omisiones y no debe tomarse como fuente autoritativa.',
          'La IA no reemplaza la instrucción de un mecánico o instructor certificado, ni los materiales oficiales de la FAA.',
          'Debes verificar de forma independiente cualquier información antes de aplicarla en un contexto real, académico, profesional o de seguridad aérea.',
          'No debes usar las respuestas de la IA para tomar decisiones operativas, de mantenimiento o de aeronavegabilidad de una aeronave.',
        ],
      },
      {
        title: '6. Reembolsos',
        paragraphs: [
          'Por la naturaleza digital y de acceso inmediato del contenido, no se ofrecen reembolsos, totales ni parciales, salvo en los casos exigidos por la ley aplicable. Esto incluye planes de suscripción: no se reembolsan períodos ya cobrados, tiempo no utilizado, ni cancelaciones a mitad de período. Al comprar, renuncias expresamente a cualquier derecho de reembolso en la medida permitida por la ley. Si tienes un problema con tu compra (por ejemplo, un cobro duplicado o un error de acceso), escríbenos a jdigitalgroupsolutions@gmail.com y lo resolveremos.',
        ],
      },
      {
        title: '7. Cancelación de la suscripción',
        paragraphs: [
          'Puedes cancelar en cualquier momento a través de la opción de cancelación visible dentro de SkyApp, del portal de cliente de Stripe o escribiendo a jdigitalgroupsolutions@gmail.com. El procedimiento de cancelación es tan sencillo y accesible como el de suscripción.',
          'Eres el único responsable de cancelar antes de la fecha de renovación si no deseas que se te cobre nuevamente. Al cancelar, conservas el acceso hasta el final del período ya pagado; no se generan reembolsos por el período en curso ni cargos posteriores.',
        ],
      },
      {
        title: '8. Uso aceptable',
        paragraphs: [
          'Te comprometes a no: intentar acceder sin autorización a sistemas o cuentas ajenas; interferir con el funcionamiento del Servicio; usar robots, scripts o herramientas automatizadas para extraer contenido; ni usar el Servicio para fines ilegales.',
        ],
      },
      {
        title: '9. Descargo de responsabilidad educativo (importante)',
        bullets: [
          'SkyMentor no está afiliado, patrocinado ni avalado por la FAA ni por ninguna agencia del gobierno de los EE. UU.',
          'El Servicio es material de práctica y preparación: no garantizamos que apruebes los exámenes ni que obtengas el certificado — eso depende de tu estudio, tu experiencia y tu desempeño.',
          'Los bancos de preguntas están elaborados y basados en material publicado directamente por la FAA, de carácter público. No son las preguntas oficiales del examen vigente ni provienen de bancos confidenciales o activos.',
          'La información regulatoria (requisitos, formularios, plazos) se ofrece con fines educativos y puede cambiar; verifica siempre los requisitos vigentes directamente con la FAA y tu examinador (DME). Nada en el Servicio constituye asesoría legal ni profesional.',
          'Las prácticas de taller descritas en los materiales deben realizarse siempre bajo supervisión y con los datos de mantenimiento aplicables; SkyMentor no se hace responsable por trabajos realizados en aeronaves reales.',
        ],
      },
      {
        title: '10. Clases en vivo y grabaciones',
        paragraphs: [
          'Las clases en vivo pueden ser grabadas para ponerlas a disposición de los alumnos. Al participar con cámara, micrófono o chat, aceptas aparecer en dichas grabaciones, que forman parte del contenido del curso y están protegidas por la Sección 3.',
        ],
      },
      {
        title: '11. Suspensión y terminación',
        paragraphs: [
          'Podemos suspender o cancelar tu acceso si incumples estos Términos (en particular las Secciones 2, 3 y 8), sin derecho a reembolso. Puedes cancelar tu cuenta en cualquier momento escribiendo a jdigitalgroupsolutions@gmail.com.',
        ],
      },
      {
        title: '12. Sin garantías',
        paragraphs: [
          'El Servicio se ofrece "tal cual" y "según disponibilidad". No garantizamos que esté libre de errores o interrupciones, aunque trabajamos para que así sea. Algunas funciones (por ejemplo, el reconocimiento de voz o las funciones de IA) dependen de tu navegador y dispositivo.',
        ],
      },
      {
        title: '13. Limitación de responsabilidad',
        paragraphs: [
          'En la máxima medida permitida por la ley, la responsabilidad total de SkyMentor frente a ti por cualquier reclamo derivado del Servicio se limita al monto que pagaste por el Servicio en los 12 meses anteriores al reclamo. SkyMentor no será responsable por daños indirectos, incidentales, especiales, punitivos o consecuentes (incluyendo la pérdida de oportunidades de examen o empleo).',
        ],
      },
      {
        title: '14. Resolución de disputas — Arbitraje y renuncia a acción colectiva',
        paragraphs: ['LEE ESTA SECCIÓN CON ATENCIÓN. AFECTA TUS DERECHOS.'],
        bullets: [
          'Resolución informal previa: antes de iniciar cualquier acción, aceptas notificarnos por escrito a jdigitalgroupsolutions@gmail.com y otorgar 60 días para resolver la disputa de buena fe.',
          'Arbitraje vinculante: toda disputa no resuelta se resolverá mediante arbitraje individual, vinculante y definitivo, administrado por la American Arbitration Association (AAA) conforme a sus reglas de consumo, bajo la Ley Federal de Arbitraje (FAA).',
          'Renuncia a acción colectiva: tú y SkyMentor renuncian a participar en demandas o arbitrajes colectivos o consolidados. Los reclamos se tramitan solo de forma individual.',
          'Renuncia a juicio por jurado.',
          'Excepción de reclamos menores: cualquiera de las partes puede llevar un reclamo elegible a un tribunal de reclamos menores (small claims).',
          'Opción de exclusión (opt-out): puedes excluirte de este acuerdo de arbitraje notificándonos por escrito dentro de los 30 días posteriores a tu primera aceptación de estos Términos.',
          'Limitación temporal: todo reclamo debe presentarse dentro de un (1) año desde que surgió la causa, o quedará prescrito.',
        ],
      },
      {
        title: '15. Ley aplicable y jurisdicción',
        paragraphs: [
          'Estos Términos se rigen por las leyes del Estado de Florida y las leyes federales de los Estados Unidos aplicables, sin dar efecto a normas de conflicto de leyes. Para cualquier asunto no sujeto a arbitraje, las partes se someten a la jurisdicción exclusiva de los tribunales estatales y federales ubicados en Palm Beach County, Florida.',
        ],
      },
      {
        title: '16. Modificaciones',
        paragraphs: [
          'Podemos actualizar el Servicio y estos Términos. Publicaremos la versión vigente con su fecha; los cambios significativos se notificarán por correo o en la app. El uso continuado del Servicio tras un cambio implica su aceptación.',
        ],
      },
      {
        title: '17. Contacto',
        paragraphs: [
          'Infinite Flight Inc. (DBA "Global Tech Growth") — operador de SkyMentor Academy / SkyApp',
          '1501 Belvedere Road, Suite 500, Office 518, West Palm Beach, FL 33406, EE. UU.',
          'Correo: jdigitalgroupsolutions@gmail.com',
          'Web: skymentoracademy.com',
        ],
      },
      {
        title: 'ANEXO A — Texto de consentimiento en el punto de pago (planes de suscripción)',
        paragraphs: [
          'Debe mostrarse junto a una casilla no premarcada que el usuario marca activamente antes de habilitar el botón de pago.',
          '☐ Entiendo y acepto que este es un plan de suscripción con renovación automática. Autorizo a SkyMentor Academy y a Stripe a cobrar la tarifa indicada a mi método de pago de forma recurrente y automática cada período, hasta que yo cancele. Soy responsable de cancelar antes de la fecha de renovación si no deseo que se me cobre nuevamente. Entiendo que los pagos no son reembolsables y que la cancelación está disponible de forma visible en la app. Acepto los Términos y Condiciones y la Política de Privacidad.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms and Conditions of Use',
    updatedAt: 'August 23, 2026',
    introduction: [
      'These Terms and Conditions (the "Terms") govern your use of the SkyMentor Academy platform, a service operated by Infinite Flight Inc. (DBA "Global Tech Growth"), a corporation organized under the laws of the State of Florida, United States (collectively, "SkyMentor," "we," or "us"), including the website, the SkyApp application, the "Camino al A&P" masterclass, study guides, and other materials (collectively, the "Service").',
      'By creating an account, purchasing, or using the Service, you accept these Terms. If you do not agree, do not use the Service.',
    ],
    sections: [
      {
        title: '1. The Service',
        paragraphs: [
          'SkyMentor is an educational preparation platform for FAA aviation mechanic certificate (A&P) examinations. Depending on your plan, it includes live and recorded classes, written and oral practice-question banks, study guides, exam simulators, progress tracking, and artificial-intelligence-assisted features (see Section 5).',
        ],
      },
      {
        title: '2. Your account',
        paragraphs: [
          'Your account is personal and non-transferable. You are responsible for keeping your password confidential and for all activity performed through your account. Sharing your credentials or giving third parties access is prohibited. Shared accounts may be suspended or cancelled without a refund. You must provide truthful information when you register and be at least 18 years old.',
        ],
      },
      {
        title: '3. Intellectual property and license to use',
        paragraphs: [
          'All original Service content—including question banks, study guides, the application, videos, text, design, and brand—is SkyMentor property and protected by intellectual-property laws.',
          'When you purchase, you receive a personal, limited, non-exclusive, non-transferable license to use the content for your own study. You are strictly prohibited from copying, reproducing, distributing, publishing, reselling, or sharing the content, including PDF guides and question banks in whole or in part; extracting or mass-downloading questions through scraping; using the content to create competing products or courses; or removing trademark or authorship notices.',
          'Official FAA documents included in the materials, such as handbooks, forms, and standards, are public-domain works of the United States government. The remainder of the package is SkyMentor’s proprietary content.',
          'A violation of this section immediately ends your license and may result in legal liability.',
        ],
      },
      {
        title: '4. Payments, subscriptions, and automatic renewal',
        paragraphs: [
          'Prices are displayed clearly before purchase. Payments are processed through Stripe, our payment processor. SkyMentor does not store your card data; Stripe tokenizes and safeguards it in accordance with PCI-DSS standards.',
          'Subscription plans (recurring charges). If your plan is a subscription, by subscribing you expressly authorize automatic, recurring charges of the applicable fee to your payment method through Stripe each period, monthly or yearly depending on the plan, until you cancel.',
          'One-time purchases. Some products, such as a masterclass or guide, may be sold as a one-time purchase without renewal. In that case, there are no recurring charges.',
        ],
        bullets: [
          'Automatic renewal: your subscription automatically renews at the end of each period for an equal period and is charged at the then-current price unless you cancel before the renewal date. This condition is disclosed clearly and conspicuously at the time of purchase, in accordance with applicable federal law, including ROSCA, and Section 501.165 of the Florida Statutes on automatic renewal of service contracts.',
          'Consent at checkout: before completing the purchase of a recurring plan, you must actively check a box confirming that you understand and accept the recurring charge and automatic renewal (see Appendix A).',
          'Price changes: we may change prices. We will notify you with reasonable advance notice, and the new price will apply at the next renewal. Your continued use or failure to cancel constitutes acceptance of the new price.',
          'Declined payments: if a charge is declined, we may retry the charge and/or suspend your access until payment is brought current.',
        ],
      },
      {
        title: '5. Use of artificial intelligence (AI)',
        paragraphs: [
          'The Service uses artificial-intelligence technologies, including language models, to generate and select practice questions, evaluate answers, provide feedback, simulate an oral examiner (virtual DME), and personalize your study. You acknowledge and agree that:',
        ],
        bullets: [
          'AI-generated content may contain errors, inaccuracies, or omissions and must not be treated as an authoritative source.',
          'AI does not replace instruction from a certified mechanic or instructor, or official FAA materials.',
          'You must independently verify any information before applying it in a real, academic, professional, or aviation-safety setting.',
          'You must not use AI answers to make operational, maintenance, or airworthiness decisions for an aircraft.',
        ],
      },
      {
        title: '6. Refunds',
        paragraphs: [
          'Because the content is digital and available immediately, no full or partial refunds are offered, except where required by applicable law. This includes subscription plans: previously charged periods, unused time, and mid-period cancellations are not refunded. By purchasing, you expressly waive any right to a refund to the extent permitted by law. If you have a purchase problem, such as a duplicate charge or access error, write to jdigitalgroupsolutions@gmail.com and we will resolve it.',
        ],
      },
      {
        title: '7. Subscription cancellation',
        paragraphs: [
          'You may cancel at any time through the visible cancellation option within SkyApp, the Stripe customer portal, or by writing to jdigitalgroupsolutions@gmail.com. The cancellation procedure is as simple and accessible as the subscription procedure.',
          'You are solely responsible for cancelling before the renewal date if you do not wish to be charged again. After cancellation, you retain access until the end of the paid period. No refund is generated for the current period or for later charges.',
        ],
      },
      {
        title: '8. Acceptable use',
        paragraphs: [
          'You agree not to attempt unauthorized access to systems or other accounts; interfere with the operation of the Service; use robots, scripts, or automated tools to extract content; or use the Service for illegal purposes.',
        ],
      },
      {
        title: '9. Educational disclaimer (important)',
        bullets: [
          'SkyMentor is not affiliated with, sponsored by, or endorsed by the FAA or any agency of the United States government.',
          'The Service is practice and preparation material. We do not guarantee that you will pass examinations or obtain a certificate; that depends on your study, experience, and performance.',
          'Question banks are created from and based on publicly available material published directly by the FAA. They are not current official examination questions and do not come from confidential or active question banks.',
          'Regulatory information, including requirements, forms, and deadlines, is offered for educational purposes and may change. Always verify current requirements directly with the FAA and your examiner (DME). Nothing in the Service is legal or professional advice.',
          'Workshop practices described in the materials must always be performed under supervision and with the applicable maintenance data. SkyMentor is not responsible for work performed on real aircraft.',
        ],
      },
      {
        title: '10. Live classes and recordings',
        paragraphs: [
          'Live classes may be recorded and made available to students. By participating with camera, microphone, or chat, you agree to appear in those recordings, which are part of the course content and protected by Section 3.',
        ],
      },
      {
        title: '11. Suspension and termination',
        paragraphs: [
          'We may suspend or cancel your access if you violate these Terms, particularly Sections 2, 3, and 8, without a refund. You may cancel your account at any time by writing to jdigitalgroupsolutions@gmail.com.',
        ],
      },
      {
        title: '12. No warranties',
        paragraphs: [
          'The Service is provided "as is" and "as available." We do not guarantee that it will be free from errors or interruptions, although we work to make it so. Some features, such as speech recognition or AI features, depend on your browser and device.',
        ],
      },
      {
        title: '13. Limitation of liability',
        paragraphs: [
          'To the maximum extent permitted by law, SkyMentor’s total liability to you for any claim arising from the Service is limited to the amount you paid for the Service in the 12 months before the claim. SkyMentor will not be liable for indirect, incidental, special, punitive, or consequential damages, including lost examination or employment opportunities.',
        ],
      },
      {
        title: '14. Dispute resolution — arbitration and class-action waiver',
        paragraphs: ['READ THIS SECTION CAREFULLY. IT AFFECTS YOUR RIGHTS.'],
        bullets: [
          'Informal resolution first: before starting any action, you agree to notify us in writing at jdigitalgroupsolutions@gmail.com and allow 60 days to resolve the dispute in good faith.',
          'Binding arbitration: any unresolved dispute will be resolved through final, binding, individual arbitration administered by the American Arbitration Association (AAA) under its consumer rules and the Federal Arbitration Act (FAA).',
          'Class-action waiver: you and SkyMentor waive the right to participate in class, collective, or consolidated lawsuits or arbitrations. Claims will proceed only on an individual basis.',
          'Waiver of jury trial.',
          'Small-claims exception: either party may bring an eligible claim in small-claims court.',
          'Opt-out option: you may opt out of this arbitration agreement by notifying us in writing within 30 days after your first acceptance of these Terms.',
          'Time limitation: any claim must be brought within one year after the cause arose or it will be time-barred.',
        ],
      },
      {
        title: '15. Governing law and jurisdiction',
        paragraphs: [
          'These Terms are governed by the laws of the State of Florida and applicable federal laws of the United States, without giving effect to conflict-of-law rules. For any matter not subject to arbitration, the parties submit to the exclusive jurisdiction of the state and federal courts located in Palm Beach County, Florida.',
        ],
      },
      {
        title: '16. Changes',
        paragraphs: [
          'We may update the Service and these Terms. We will publish the current version with its date, and significant changes will be communicated by email or in the app. Continued use of the Service after a change means you accept it.',
        ],
      },
      {
        title: '17. Contact',
        paragraphs: [
          'Infinite Flight Inc. (DBA "Global Tech Growth") — operator of SkyMentor Academy / SkyApp',
          '1501 Belvedere Road, Suite 500, Office 518, West Palm Beach, FL 33406, United States',
          'Email: jdigitalgroupsolutions@gmail.com',
          'Website: skymentoracademy.com',
        ],
      },
      {
        title: 'APPENDIX A — Consent language at checkout (subscription plans)',
        paragraphs: [
          'This must be displayed next to an unchecked box that the user actively checks before the payment button is enabled.',
          '☐ I understand and agree that this is an automatically renewing subscription plan. I authorize SkyMentor Academy and Stripe to charge the stated fee to my payment method automatically and on a recurring basis each period until I cancel. I am responsible for cancelling before the renewal date if I do not want to be charged again. I understand that payments are non-refundable and that cancellation is visibly available in the app. I accept the Terms and Conditions and the Privacy Policy.',
        ],
      },
    ],
  },
};
