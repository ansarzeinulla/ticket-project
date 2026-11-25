/**
 * Strings for requests to BiletFlow itself: the organizer's support page and
 * the platform admins' inbox (SRS 4.12, 4.13).
 */
export const enPlatformSupport = {
  platformSupport: {
    title: "BiletFlow support",
    subtitle: "Questions about your account, paid-sales activation, payments or a technical problem. BiletFlow staff answer here.",
    open: "Contact BiletFlow",
    none: "You have not contacted BiletFlow yet.",
    loadFailed: "Could not load your requests.",
    newHeading: "New request",
    category: "What is it about?",
    subject: "Subject",
    subjectPlaceholder: "Activation fee charged twice",
    message: "Message",
    messagePlaceholder: "Describe what happened and which event it concerns.",
    subjectRequired: "Give your request a short subject.",
    messageRequired: "Describe the problem.",
    send: "Send to BiletFlow",
    cancel: "Cancel",
    openFailed: "The request could not be sent.",
    link: "BiletFlow support",
  },
  platformInbox: {
    title: "Organizer support",
    subtitle: "Requests organizers sent to BiletFlow, most recent first.",
    none: "No organizer has contacted BiletFlow yet.",
    loadFailed: "Could not load the inbox.",
    link: "Support inbox",
    back: "← Back to administration",
    from: "from {name}",
  },
};

export type PlatformSupportMessages = typeof enPlatformSupport;

export const ruPlatformSupport: PlatformSupportMessages = {
  platformSupport: {
    title: "Поддержка BiletFlow",
    subtitle: "Вопросы об аккаунте, активации платных продаж, оплатах или технических проблемах. Здесь отвечают сотрудники BiletFlow.",
    open: "Написать в BiletFlow",
    none: "Вы ещё не обращались в BiletFlow.",
    loadFailed: "Не удалось загрузить ваши обращения.",
    newHeading: "Новое обращение",
    category: "О чём вопрос?",
    subject: "Тема",
    subjectPlaceholder: "Сбор за активацию списан дважды",
    message: "Сообщение",
    messagePlaceholder: "Опишите, что произошло и какого события это касается.",
    subjectRequired: "Кратко укажите тему обращения.",
    messageRequired: "Опишите проблему.",
    send: "Отправить в BiletFlow",
    cancel: "Отмена",
    openFailed: "Не удалось отправить обращение.",
    link: "Поддержка BiletFlow",
  },
  platformInbox: {
    title: "Обращения организаторов",
    subtitle: "Обращения организаторов в BiletFlow, сначала новые.",
    none: "Пока никто из организаторов не обращался в BiletFlow.",
    loadFailed: "Не удалось загрузить обращения.",
    link: "Обращения",
    back: "← К администрированию",
    from: "от {name}",
  },
};

export const kkPlatformSupport: PlatformSupportMessages = {
  platformSupport: {
    title: "BiletFlow қолдауы",
    subtitle: "Тіркелгі, ақылы сатылымды белсендіру, төлемдер немесе техникалық ақау туралы сұрақтар. Мұнда BiletFlow қызметкерлері жауап береді.",
    open: "BiletFlow-ға жазу",
    none: "Сіз әлі BiletFlow-ға жазған жоқсыз.",
    loadFailed: "Өтініштеріңізді жүктеу мүмкін болмады.",
    newHeading: "Жаңа өтініш",
    category: "Сұрақ не туралы?",
    subject: "Тақырып",
    subjectPlaceholder: "Белсендіру алымы екі рет алынды",
    message: "Хабарлама",
    messagePlaceholder: "Не болғанын және қай іс-шараға қатысты екенін жазыңыз.",
    subjectRequired: "Өтініштің тақырыбын қысқаша жазыңыз.",
    messageRequired: "Мәселені сипаттаңыз.",
    send: "BiletFlow-ға жіберу",
    cancel: "Бас тарту",
    openFailed: "Өтінішті жіберу мүмкін болмады.",
    link: "BiletFlow қолдауы",
  },
  platformInbox: {
    title: "Ұйымдастырушылар өтініштері",
    subtitle: "Ұйымдастырушылардың BiletFlow-ға өтініштері, жаңалары алдымен.",
    none: "Әзірге ешбір ұйымдастырушы BiletFlow-ға жазған жоқ.",
    loadFailed: "Өтініштерді жүктеу мүмкін болмады.",
    link: "Өтініштер",
    back: "← Әкімшілікке",
    from: "жіберуші: {name}",
  },
};
