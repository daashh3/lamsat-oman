# تشغيل لمسة عُمان على Quest بدون كمبيوتر

المشروع مرفوع إلى [GitHub](https://github.com/daashh3/lamsat-oman)، مع نشر تلقائي عبر HTTPS على [رابط لمسة عُمان](https://daashh3.github.io/lamsat-oman/). التشغيل على النظارة لا يحتاج خادم PowerShell أو اتصالًا بالكمبيوتر. ملف APK لم يُبنَ بعد؛ يلزم مفتاح توقيع وربط النطاق لتغليفه كتطبيق WebXR غامر بواسطة أداة Meta الرسمية.

## نشر الموقع

ارفع **محتويات مجلد lamsat-oman** إلى مستودع GitHub، ثم اختر Settings → Pages → Source: GitHub Actions. ملف `.github/workflows/deploy-pages.yml` يبني المشروع ويشغّل اختباراته وينشر `dist` فقط. لا ترفع `node_modules` أو مفاتيح التوقيع.

على الجهاز الحالي، المشروع مرتبط بالمستودع `daashh3/lamsat-oman`. سكربت النشر يكتشف Git المرفق مع Codex حتى عندما لا يعرف PowerShell أمر `git`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\user\OneDrive\Desktop\LamsatOman_References_Fixed\lamsat-oman\Publish-GitHub.ps1"
```

أكمل تسجيل الدخول إلى GitHub إذا طُلب منك. بعد الرفع وتفعيل Pages، افتح Actions → Publish Lamsat Oman → Run workflow. السكربت يحفظ تعديلات ملفات المشروع في commit ثم يرفعها، ويحترم `.gitignore` ولا يستخدم force push.

افتح رابط Pages في متصفح النظارة، ثم اضغط الدخول إلى VR. يمكن إطفاء الكمبيوتر. تُخزّن ملفات التشغيل محليًا بعد أول تحميل كامل؛ لا تعتمد على العمل بلا إنترنت قبل اكتمال التخزين. تحديثات الموقع تنتظر إغلاق النوافذ القديمة حتى لا تقاطع جلسة VR.

## التطبيق المثبّت

المسار الرسمي هو Meta Quest Bubblewrap، وليس Android WebView. يحتاج Node.js 22 مع npm وJDK/Android SDK؛ الأداة تعرض إعداد المتطلبات عند الحاجة.

1. انشر الموقع والملف `manifest.webmanifest` أولًا.
2. نفّذ `Package-Quest.ps1 -Action Prepare -SiteUrl https://YOUR-HOST/`. اختر immersive، وعطّل المشتريات، واحفظ مفتاح التوقيع وكلمات مروره خارج GitHub.
3. استخرج بصمة SHA-256 بالمفتاح نفسه باستخدام `keytool -list -v -keystore PATH -alias ALIAS`، ثم أعد Prepare مع `-Fingerprint 'AA:BB:...'` بالبصمة الكاملة.
4. انشر `quest/assetlinks.json` في **جذر النطاق** عند `https://YOUR-HOST/.well-known/assetlinks.json`. إذا كان موقعك في `username.github.io/lamsat-oman/`، فالملف يجب أن يأتي من مستودع `username.github.io` عند الجذر، أو استخدم نطاقًا مخصصًا. وضعه داخل مسار المشروع وحده لا يكفي.
5. نفّذ `Package-Quest.ps1 -Action Build -SiteUrl https://YOUR-HOST/`. الناتج الموقّع داخل `quest/build/app-release-signed.apk`.
6. للتثبيت التجريبي الأول استخدم وضع المطوّر وADB، ثم افتح التطبيق من Unknown Sources. **بعد التثبيت يعمل مستقلًا عن الكمبيوتر**. التوزيع من متجر Meta مسار منفصل يتطلب حساب مطوّر ومراجعة المتجر.

لا يحتوي المشروع على كلمات مرور توقيع أو بيانات GitHub. لا تنشرها. لا تحذف مفتاح التوقيع؛ تحديثات التطبيق تحتاج المفتاح نفسه.

المراجع: [تغليف PWA من Meta](https://developers.meta.com/vr/documentation/web/pwa-packaging/)، [إطلاق WebXR من أيقونة التطبيق](https://developers.meta.com/vr/documentation/web/pwa-webxr/)، [نشر GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
