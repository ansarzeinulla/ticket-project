package email

import "strings"

// T translates one template phrase into the recipient's language (BF-100).
//
// The English phrase is the key, so a template reads as plain English and an
// untranslated phrase falls back to it rather than to an empty string. The
// translations keep the English %-verbs in the same order.
func T(locale, phrase string) string {
	if table, ok := phrasebook[normalizeLocale(locale)]; ok {
		if translated, ok := table[phrase]; ok {
			return translated
		}
	}
	return phrase
}

// normalizeLocale accepts "kk", "kk-KZ", "RU" and the like.
func normalizeLocale(locale string) string {
	locale = strings.ToLower(strings.TrimSpace(locale))
	if i := strings.IndexAny(locale, "-_"); i > 0 {
		locale = locale[:i]
	}
	return locale
}

// changeLine translates the label of an event-update line ("Starts: a  ->  b").
func changeLine(locale, line string) string {
	label, rest, found := strings.Cut(line, ": ")
	if !found {
		return line
	}
	rest = strings.ReplaceAll(rest, "(removed)", T(locale, "(removed)"))
	return T(locale, label) + ": " + rest
}

var phrasebook = map[string]map[string]string{
	"ru": {
		"Hi %s,\n\n":    "Здравствуйте, %s!\n\n",
		"Hi there,\n\n": "Здравствуйте!\n\n",

		"Your Tickets to %s": "Ваши билеты на %s",
		"Your order %s is confirmed. Your ticket is attached.\n\n":      "Заказ %s подтверждён. Билет во вложении.\n\n",
		"Your order %s is confirmed. Your %d tickets are attached.\n\n": "Заказ %s подтверждён. Билеты (%d) во вложении.\n\n",
		"  Event:  %s\n":                         "  Событие: %s\n",
		"  When:   %s\n":                         "  Когда:   %s\n",
		"  Where:  %s\n":                         "  Где:     %s\n",
		"  Paid:   %s KZT (simulated payment)\n": "  Оплачено: %s KZT (симуляция оплаты)\n",
		"Tickets:\n\n":                           "Билеты:\n\n",
		"All of them on one page: %s\n\n":        "Все билеты на одной странице: %s\n\n",
		"Show the QR code on your phone or on paper at the entrance.\n\n": "На входе покажите QR-код на телефоне или на распечатке.\n\n",

		"Refund for %s": "Возврат за %s",
		"Your order %s for %s has been refunded.\n\n": "По заказу %s на %s оформлен возврат.\n\n",
		"  Refunded: %s KZT (simulated)\n":            "  Возвращено: %s KZT (симуляция)\n",
		"  Tickets:  %d, now void\n":                  "  Билеты:   %d, больше недействительны\n",
		"  Reason:   %s\n":                            "  Причина:  %s\n",
		"The QR codes on these tickets will no longer be admitted at the\nentrance. There is nothing else you need to do.\n\n": "По QR-кодам этих билетов больше не пропустят на вход.\nБольше ничего делать не нужно.\n\n",

		"Your registration for %s was cancelled":                               "Ваша регистрация на %s отменена",
		"Your registration %s for %s has been cancelled by the organizer.\n\n": "Организатор отменил вашу регистрацию %s на %s.\n\n",
		"  Cancelled: 1 ticket, now void\n":                                    "  Отменено: 1 билет, больше недействителен\n",
		"  Cancelled: %d tickets, now void\n":                                  "  Отменено билетов: %d, больше недействительны\n",
		"  Reason: %s\n":                                                       "  Причина: %s\n",
		"The QR code on this registration will no longer be admitted at the\nentrance. Nothing was charged, so there is no refund to wait for.\n\nIf you think this was a mistake, reply to the organizer through the\nsupport link on your order page.\n\n": "По QR-коду этой регистрации больше не пропустят на вход.\nОплаты не было, поэтому ждать возврата не нужно.\n\nЕсли это ошибка, напишите организатору через поддержку\nна странице заказа.\n\n",

		"Payment failed for %s": "Оплата не прошла: %s",
		"The payment for order %s did not go through, so no tickets\nwere issued for %s.\n\n": "Оплата заказа %s не прошла, поэтому билеты\nна %s не выпущены.\n\n",
		"  Attempted: %s KZT (simulated)\n":                                                   "  Сумма:     %s KZT (симуляция)\n",
		"  Reason:    %s\n":                                                                   "  Причина:   %s\n",
		"Nothing was charged. Your seats were released back to the event, so\nthey may be gone if you wait.\n\n": "Деньги не списаны. Ваши места вернулись в продажу,\nпоэтому их могут купить другие.\n\n",
		"Try again: %s\n\n": "Попробовать снова: %s\n\n",

		"Update to %s": "Изменения: %s",
		"%s has been updated since you booked.\n\n":          "С момента вашей покупки событие «%s» изменилось.\n\n",
		"Your ticket is unchanged and still admits you.\n\n": "Ваш билет остаётся в силе.\n\n",
		"Event page: %s\n\n":                                 "Страница события: %s\n\n",
		"Starts":                                             "Начало",
		"Ends":                                               "Окончание",
		"Time zone":                                          "Часовой пояс",
		"Venue":                                              "Площадка",
		"Address":                                            "Адрес",
		"Name":                                               "Название",
		"(removed)":                                          "(удалено)",

		"Payout %s for %s":                    "Выплата %s за %s",
		"Payout status for %s: %s.\n\n":       "Статус выплаты за %s: %s.\n\n",
		"  Amount:      %s KZT (simulated)\n": "  Сумма:      %s KZT (симуляция)\n",
		"  Destination: %s\n":                 "  Получатель: %s\n",
		"  Note:        %s\n":                 "  Примечание: %s\n",
		"This is a demonstration record. No money has moved and none will:\nreal payouts are outside the scope of this release.\n\n": "Это демонстрационная запись: деньги не переводились и не будут переведены.\nРеальные выплаты не входят в эту версию.\n\n",

		"%s assigned to %s":             "%s передан: %s",
		"%s is now with %s.\n\n":        "Обращение %s теперь ведёт %s.\n\n",
		"  Subject: %s\n\n":             "  Тема: %s\n\n",
		"Read the conversation: %s\n\n": "Открыть переписку: %s\n\n",
		"%s is now %s":                  "%s: %s",
		"%s is now %s.\n\n":             "Статус обращения %s: %s.\n\n",
		"Support is waiting on a reply from you before they can go further.\n\n": "Поддержка ждёт вашего ответа, чтобы продолжить.\n\n",
		"in progress":            "в работе",
		"waiting for your reply": "ждёт вашего ответа",
		"open":                   "открыто",
		"resolved":               "решено",

		"Confirm your BiletFlow email address":                                                             "Подтвердите email для BiletFlow",
		"Confirm this address to finish setting up your BiletFlow account.\n\n":                            "Подтвердите этот адрес, чтобы завершить настройку аккаунта BiletFlow.\n\n",
		"Your confirmation code:\n\n  %s\n\n":                                                              "Ваш код подтверждения:\n\n  %s\n\n",
		"Enter it on BiletFlow: in the banner at the top of the website, or in the app's Account tab.\n\n": "Введите его на BiletFlow: в полосе вверху сайта или во вкладке «Аккаунт» в приложении.\n\n",
		"The code stops working in %s.\n\n":                                                                "Код действует %s.\n\n",
		"If you did not create an account, ignore this message.\n\n":                                       "Если вы не создавали аккаунт, просто проигнорируйте это письмо.\n\n",

		"Reset your BiletFlow password":                                            "Сброс пароля BiletFlow",
		"Somebody asked to reset the password on this BiletFlow account.\n\n":      "Кто-то запросил сброс пароля для этого аккаунта BiletFlow.\n\n",
		"Your reset code:\n\n  %s\n\n":                                             "Ваш код для сброса пароля:\n\n  %s\n\n",
		"Enter it on the password reset page together with your new password.\n\n": "Введите его на странице сброса пароля вместе с новым паролем.\n\n",
		"BiletFlow is a student project made by AAOAA at Nazarbayev University. Data is taken from Ticketon, please, don't sue us. We do not sell anything.": "BiletFlow — это студенческий проект команды AAOAA из Назарбаев Университета. Данные взяты с Ticketon, пожалуйста, не подавайте на нас в суд. Мы ничего не продаём.",
		"The code stops working in %s, and only once.\n\n":                                                                  "Код действует %s и только один раз.\n\n",
		"If this was not you, nothing has changed and you can ignore this\nmessage. Your current password still works.\n\n": "Если это были не вы, ничего не изменилось — просто проигнорируйте\nэто письмо. Текущий пароль по-прежнему работает.\n\n",
		"1 hour": "1 час",
		"3 days": "3 дня",

		"%s has been cancelled":                                          "%s отменено",
		"%s has been cancelled by the organizer.\n\n":                    "Организатор отменил событие «%s».\n\n",
		"  Was due:  %s\n":                                               "  Должно было пройти: %s\n",
		"  Order:    %s\n":                                               "  Заказ:    %s\n",
		"The organizer's refund policy:\n\n":                             "Условия возврата организатора:\n\n",
		"Contact the organizer from your order page about a refund.\n\n": "По вопросу возврата напишите организатору со страницы заказа.\n\n",

		"New message about %s":     "Новое сообщение по событию %s",
		"%s replied about %s.\n\n": "%s ответил(а) по событию «%s».\n\n",
		"  Case: %s\n\n":           "  Обращение: %s\n\n",
		"Reply here: %s\n\n":       "Ответить: %s\n\n",
	},
	"kk": {
		"Hi %s,\n\n":    "Сәлеметсіз бе, %s!\n\n",
		"Hi there,\n\n": "Сәлеметсіз бе!\n\n",

		"Your Tickets to %s": "%s: сіздің билеттеріңіз",
		"Your order %s is confirmed. Your ticket is attached.\n\n":      "%s тапсырысы расталды. Билет хатқа тіркелген.\n\n",
		"Your order %s is confirmed. Your %d tickets are attached.\n\n": "%s тапсырысы расталды. Билеттер (%d) хатқа тіркелген.\n\n",
		"  Event:  %s\n":                         "  Іс-шара: %s\n",
		"  When:   %s\n":                         "  Қашан:   %s\n",
		"  Where:  %s\n":                         "  Қайда:   %s\n",
		"  Paid:   %s KZT (simulated payment)\n": "  Төленді: %s KZT (төлем симуляциясы)\n",
		"Tickets:\n\n":                           "Билеттер:\n\n",
		"All of them on one page: %s\n\n":        "Барлық билеттер бір бетте: %s\n\n",
		"Show the QR code on your phone or on paper at the entrance.\n\n": "Кіреберісте QR-кодты телефоннан немесе қағаздан көрсетіңіз.\n\n",

		"Refund for %s": "%s: ақша қайтарылды",
		"Your order %s for %s has been refunded.\n\n": "%[2]s іс-шарасына %[1]s тапсырысының ақшасы қайтарылды.\n\n",
		"  Refunded: %s KZT (simulated)\n":            "  Қайтарылды: %s KZT (симуляция)\n",
		"  Tickets:  %d, now void\n":                  "  Билеттер: %d, енді жарамсыз\n",
		"  Reason:   %s\n":                            "  Себебі:   %s\n",
		"The QR codes on these tickets will no longer be admitted at the\nentrance. There is nothing else you need to do.\n\n": "Бұл билеттердің QR-кодтарымен енді кіргізбейді.\nБасқа ештеңе істеудің қажеті жоқ.\n\n",

		"Your registration for %s was cancelled":                               "%s: тіркелуіңіз жойылды",
		"Your registration %s for %s has been cancelled by the organizer.\n\n": "Ұйымдастырушы %[2]s іс-шарасына %[1]s тіркелуіңізді жойды.\n\n",
		"  Cancelled: 1 ticket, now void\n":                                    "  Жойылды: 1 билет, енді жарамсыз\n",
		"  Cancelled: %d tickets, now void\n":                                  "  Жойылған билеттер: %d, енді жарамсыз\n",
		"  Reason: %s\n":                                                       "  Себебі: %s\n",
		"The QR code on this registration will no longer be admitted at the\nentrance. Nothing was charged, so there is no refund to wait for.\n\nIf you think this was a mistake, reply to the organizer through the\nsupport link on your order page.\n\n": "Бұл тіркелудің QR-кодымен енді кіргізбейді.\nАқша алынбаған, сондықтан қайтарымды күтудің қажеті жоқ.\n\nҚате деп ойласаңыз, тапсырыс бетіндегі қолдау арқылы\nұйымдастырушыға жазыңыз.\n\n",

		"Payment failed for %s": "%s: төлем өтпеді",
		"The payment for order %s did not go through, so no tickets\nwere issued for %s.\n\n": "%s тапсырысының төлемі өтпеді, сондықтан\n%s іс-шарасына билет берілмеді.\n\n",
		"  Attempted: %s KZT (simulated)\n":                                                   "  Сомасы:   %s KZT (симуляция)\n",
		"  Reason:    %s\n":                                                                   "  Себебі:   %s\n",
		"Nothing was charged. Your seats were released back to the event, so\nthey may be gone if you wait.\n\n": "Ақша алынбады. Орындарыңыз қайта сатылымға шықты,\nсондықтан оларды басқалар сатып алуы мүмкін.\n\n",
		"Try again: %s\n\n": "Қайталап көру: %s\n\n",

		"Update to %s": "%s: өзгерістер",
		"%s has been updated since you booked.\n\n":          "Сіз билет алғаннан кейін «%s» іс-шарасы өзгерді.\n\n",
		"Your ticket is unchanged and still admits you.\n\n": "Билетіңіз өзгерген жоқ және әлі жарамды.\n\n",
		"Event page: %s\n\n":                                 "Іс-шара беті: %s\n\n",
		"Starts":                                             "Басталуы",
		"Ends":                                               "Аяқталуы",
		"Time zone":                                          "Уақыт белдеуі",
		"Venue":                                              "Алаң",
		"Address":                                            "Мекенжай",
		"Name":                                               "Атауы",
		"(removed)":                                          "(жойылды)",

		"Payout %s for %s":                    "%[2]s: төлем %[1]s",
		"Payout status for %s: %s.\n\n":       "%s бойынша төлем мәртебесі: %s.\n\n",
		"  Amount:      %s KZT (simulated)\n": "  Сомасы:     %s KZT (симуляция)\n",
		"  Destination: %s\n":                 "  Алушы:      %s\n",
		"  Note:        %s\n":                 "  Ескертпе:   %s\n",
		"This is a demonstration record. No money has moved and none will:\nreal payouts are outside the scope of this release.\n\n": "Бұл демонстрациялық жазба: ақша аударылған жоқ және аударылмайды.\nНақты төлемдер бұл нұсқаға кірмейді.\n\n",

		"%s assigned to %s":             "%s өтінішін %s қарайды",
		"%s is now with %s.\n\n":        "%s өтінішін енді %s қарайды.\n\n",
		"  Subject: %s\n\n":             "  Тақырып: %s\n\n",
		"Read the conversation: %s\n\n": "Хат алмасуды ашу: %s\n\n",
		"%s is now %s":                  "%s: %s",
		"%s is now %s.\n\n":             "%s өтінішінің мәртебесі: %s.\n\n",
		"Support is waiting on a reply from you before they can go further.\n\n": "Қолдау қызметі жалғастыру үшін сіздің жауабыңызды күтуде.\n\n",
		"in progress":            "қаралуда",
		"waiting for your reply": "жауабыңызды күтуде",
		"open":                   "ашық",
		"resolved":               "шешілді",

		"Confirm your BiletFlow email address":                                                             "BiletFlow үшін email-ді растаңыз",
		"Confirm this address to finish setting up your BiletFlow account.\n\n":                            "BiletFlow тіркелгісін баптауды аяқтау үшін осы мекенжайды растаңыз.\n\n",
		"Your confirmation code:\n\n  %s\n\n":                                                              "Растау кодыңыз:\n\n  %s\n\n",
		"Enter it on BiletFlow: in the banner at the top of the website, or in the app's Account tab.\n\n": "Оны BiletFlow-та енгізіңіз: сайттың жоғарғы жолағында немесе қолданбадағы «Тіркелгі» бөлімінде.\n\n",
		"The code stops working in %s.\n\n":                                                                "Код %s жарамды.\n\n",
		"If you did not create an account, ignore this message.\n\n":                                       "Егер тіркелгі ашпаған болсаңыз, бұл хатты елемеңіз.\n\n",

		"Reset your BiletFlow password":                                            "BiletFlow құпиясөзін қалпына келтіру",
		"Somebody asked to reset the password on this BiletFlow account.\n\n":      "Біреу осы BiletFlow тіркелгісінің құпиясөзін қалпына келтіруді сұрады.\n\n",
		"Your reset code:\n\n  %s\n\n":                                             "Құпиясөзді қалпына келтіру кодыңыз:\n\n  %s\n\n",
		"Enter it on the password reset page together with your new password.\n\n": "Оны құпиясөзді қалпына келтіру бетінде жаңа құпиясөзбен бірге енгізіңіз.\n\n",
		"BiletFlow is a student project made by AAOAA at Nazarbayev University. Data is taken from Ticketon, please, don't sue us. We do not sell anything.": "BiletFlow — Назарбаев Университетіндегі AAOAA командасының студенттік жобасы. Деректер Ticketon сайтынан алынған, өтінеміз, бізді сотқа бермеңіз. Біз ештеңе сатпаймыз.",
		"The code stops working in %s, and only once.\n\n":                                                                  "Код %s және тек бір рет жарамды.\n\n",
		"If this was not you, nothing has changed and you can ignore this\nmessage. Your current password still works.\n\n": "Егер бұл сіз болмасаңыз, ештеңе өзгерген жоқ — бұл хатты елемеңіз.\nҚазіргі құпиясөзіңіз әлі жұмыс істейді.\n\n",
		"1 hour": "1 сағат",
		"3 days": "3 күн",

		"%s has been cancelled":                                          "%s өтпейді",
		"%s has been cancelled by the organizer.\n\n":                    "Ұйымдастырушы «%s» іс-шарасын болдырмады.\n\n",
		"  Was due:  %s\n":                                               "  Өтуі тиіс еді: %s\n",
		"  Order:    %s\n":                                               "  Тапсырыс: %s\n",
		"The organizer's refund policy:\n\n":                             "Ұйымдастырушының ақша қайтару шарттары:\n\n",
		"Contact the organizer from your order page about a refund.\n\n": "Ақша қайтару туралы тапсырыс бетінен ұйымдастырушыға жазыңыз.\n\n",

		"New message about %s":     "%s бойынша жаңа хабарлама",
		"%s replied about %s.\n\n": "%s «%s» бойынша жауап берді.\n\n",
		"  Case: %s\n\n":           "  Өтініш: %s\n\n",
		"Reply here: %s\n\n":       "Жауап беру: %s\n\n",
	},
}
