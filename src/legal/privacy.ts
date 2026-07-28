// Privacy policy content — bundled in the app so it renders fully offline.
// The SAME text is mirrored in docs/privacy.html for the public URL required by
// the App Store / Play Console. If you edit one, update the other and bump the
// date below.
//
// CONTACT_EMAIL is the only address published in the policy — swap it for a
// dedicated support address if you'd rather not use a personal inbox.

export const CONTACT_EMAIL = 'marcelinosamer000@gmail.com';
export const POLICY_LAST_UPDATED = '2026-07-28';
export const POLICY_VERSION = 1;

export interface PolicySection {
  heading: string;
  body: string;
}

export interface PolicyContent {
  intro: string;
  sections: PolicySection[];
}

const en: PolicyContent = {
  intro:
    'Kard is a 100% offline personal finance app. We do not collect, transmit, ' +
    'or have access to any of your data — everything you enter stays encrypted ' +
    'on your device. This policy explains exactly what that means.',
  sections: [
    {
      heading: 'In short',
      body: 'Kard has no servers, no account system, and no analytics. Your financial data never leaves your device. We cannot see it, and neither can anyone else.',
    },
    {
      heading: 'Information we collect',
      body: 'None. There is no sign-up, no login, and no user profile. We do not use analytics, crash reporting, advertising, or tracking of any kind, and the app makes no network requests to us or to any third party during normal use.',
    },
    {
      heading: 'Data stored on your device',
      body: 'Everything you enter — Pockets and accounts, Receipts, budgets, goals, assets, and settings — is stored only on your device in an encrypted database (SQLCipher, AES-256). The encryption key is held in your device’s secure hardware keystore (iOS Keychain / Android Keystore). We never receive or have access to this data.',
    },
    {
      heading: 'Permissions',
      body: 'Notifications are used only to show local budget and goal alerts on your device — nothing is sent to a server. Face ID / biometrics and your PIN are used only to lock the app; your biometric data is handled by the operating system and never seen by Kard. On some Android versions, and only with your explicit permission, Kard can read bank SMS on your device to help you log transactions — those messages are parsed entirely on your device and are never uploaded or shared. You can use the app fully without granting SMS access.',
    },
    {
      heading: 'Backups',
      body: 'Kard can create an encrypted backup file that you protect with a passphrase. The file is created on your device and shared only where you choose (for example, your own files or cloud storage). Kard has no access to it, and the passphrase is never stored — if you lose it, the backup cannot be recovered.',
    },
    {
      heading: 'Third parties',
      body: 'Kard contains no advertising SDKs, analytics SDKs, or trackers, and shares no data with third parties — because no data leaves your device to share.',
    },
    {
      heading: 'Children’s privacy',
      body: 'Kard is not directed at children, and in any case collects no personal information from anyone.',
    },
    {
      heading: 'Your control over your data',
      body: 'You are in complete control. You can edit or delete any entry at any time, and uninstalling the app permanently removes all data stored on your device. Because we hold nothing, there is no account to delete and no data for us to return.',
    },
    {
      heading: 'Changes to this policy',
      body: 'If this policy changes, we will update the date shown here and, where appropriate, note it in the app. Continued use after an update means you accept the revised policy.',
    },
    {
      heading: 'Contact',
      body: `Questions about privacy? Contact us at ${CONTACT_EMAIL}.`,
    },
  ],
};

const ar: PolicyContent = {
  intro:
    'Kard تطبيق لإدارة الأموال يعمل دون اتصال بالإنترنت بنسبة 100%. نحن لا نجمع ' +
    'أيّ بيانات عنك ولا ننقلها ولا نصل إليها — كل ما تُدخله يبقى مشفّرًا على ' +
    'جهازك. توضّح هذه السياسة ذلك بالتفصيل.',
  sections: [
    {
      heading: 'باختصار',
      body: 'لا تملك Kard أيّ خوادم، ولا نظام حسابات، ولا أدوات تحليل. بياناتك المالية لا تغادر جهازك أبدًا. لا يمكننا رؤيتها، ولا يمكن لأي شخص آخر ذلك.',
    },
    {
      heading: 'المعلومات التي نجمعها',
      body: 'لا شيء. لا يوجد تسجيل ولا حساب ولا ملف مستخدم. لا نستخدم أدوات تحليل أو تتبّع أو إعلانات أو تقارير أعطال، ولا يُجري التطبيق أيّ اتصال بنا أو بأي طرف ثالث أثناء الاستخدام العادي.',
    },
    {
      heading: 'البيانات المخزّنة على جهازك',
      body: 'تُخزَّن جميع المعلومات التي تُدخلها — الجيوب والحسابات والإيصالات والميزانيات والأهداف والأصول والإعدادات — على جهازك فقط داخل قاعدة بيانات مشفّرة (SQLCipher، AES-256). ويُحفَظ مفتاح التشفير في المخزن الآمن للأجهزة (سلسلة مفاتيح iOS / مخزن مفاتيح Android). نحن لا نستقبل هذه البيانات ولا نصل إليها.',
    },
    {
      heading: 'الأذونات',
      body: 'تُستخدم الإشعارات فقط لعرض تنبيهات الميزانيات والأهداف محليًا على جهازك، ولا يُرسَل شيء إلى أي خادم. وتُستخدم بصمة الوجه/القياسات الحيوية ورمز PIN لقفل التطبيق فقط، ويتولّى نظام التشغيل التعامل مع بياناتك الحيوية دون أن تراها Kard. وفي بعض إصدارات أندرويد، وبعد إذنك الصريح فقط، يمكن لـ Kard قراءة رسائل البنك على جهازك لمساعدتك في تسجيل المعاملات — وتُحلَّل هذه الرسائل بالكامل على جهازك ولا تُرفع أو تُشارك أبدًا. ويمكنك استخدام التطبيق بالكامل دون منح إذن الرسائل.',
    },
    {
      heading: 'النسخ الاحتياطي',
      body: 'يمكن لـ Kard إنشاء ملف نسخ احتياطي مشفّر تحميه بعبارة مرور. يُنشأ الملف على جهازك ويُشارك فقط حيثما تختار (مثل ملفاتك أو تخزينك السحابي). لا تملك Kard أيّ وصول إليه، ولا تُخزَّن عبارة المرور مطلقًا — وإذا فقدتها فلا يمكن استعادة النسخة.',
    },
    {
      heading: 'الأطراف الخارجية',
      body: 'لا تتضمّن Kard أدوات إعلانات أو تحليل أو تتبّع، ولا تشارك أيّ بيانات مع أي طرف ثالث، لأنه لا توجد بيانات تغادر جهازك أصلًا.',
    },
    {
      heading: 'خصوصية الأطفال',
      body: 'Kard غير موجَّه للأطفال، وهو على أيّ حال لا يجمع أيّ معلومات شخصية من أي شخص.',
    },
    {
      heading: 'تحكّمك في بياناتك',
      body: 'أنت المتحكّم الكامل. يمكنك تعديل أو حذف أيّ إدخال في أيّ وقت، وإلغاء تثبيت التطبيق يحذف نهائيًا جميع البيانات المخزّنة على جهازك. ولأننا لا نحتفظ بأي شيء، فلا يوجد حساب لحذفه ولا بيانات لنعيدها إليك.',
    },
    {
      heading: 'تغييرات هذه السياسة',
      body: 'إذا تغيّرت هذه السياسة فسنحدّث التاريخ الموضّح هنا، وسننوّه إلى ذلك داخل التطبيق عند الاقتضاء. واستمرارك في الاستخدام بعد التحديث يعني قبولك للسياسة المعدَّلة.',
    },
    {
      heading: 'تواصل معنا',
      body: `هل لديك أسئلة حول الخصوصية؟ تواصل معنا عبر ${CONTACT_EMAIL}.`,
    },
  ],
};

export const PRIVACY_POLICY: Record<'en' | 'ar', PolicyContent> = { en, ar };
