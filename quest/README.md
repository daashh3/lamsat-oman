# تطبيق لمسة عُمان على Quest

تم بناء APK موقّع بنظام Meta Quest Bubblewrap الرسمي، بوضع WebXR الغامر. الملف المحلي: `quest/Lamsat-Oman-Quest.apk`. معرّف التطبيق `om.lamsat.quest`، الإصدار `1.0.0` ورقم البناء `1`.

الموقع: https://daashh3.github.io/lamsat-oman/

## التثبيت

1. فعّل Developer Mode للنظارة من تطبيق Meta Horizon بالجوال، بحساب مطوّر مؤهل.
2. وصّل النظارة بكابل USB للبيانات ووافق على USB debugging داخل النظارة.
3. في Meta VR Developer Hub افتح Device Manager → Apps → Add Build واختر ملف APK.
4. افتح التطبيق من Library → Unknown Sources. بعد التثبيت يمكن فصل الكمبيوتر وإطفاؤه.

يلزم الإنترنت عند أول تشغيل لتحميل الموقع. التخزين دون إنترنت يبدأ بعد اكتمال تحميل ملفات التطبيق؛ قد يلزم الإنترنت مجددًا إذا حذف النظام بيانات المتصفح. هذه حزمة PWA تستخدم متصفح Quest، ولا تتضمن ملفات الموقع داخل APK.

## التحقق

نجح بناء Android في GitHub Actions، وتم تنزيل الناتج والتحقق من بصمته، ثم توقيعه محليًا. نجحت اختبارات توقيع APK v2/v3، ومعرّف الحزمة، وtarget SDK 32، ووسم VR، واسم التطبيق العربي، وعنوان التشغيل. بصمة الملف في `Lamsat-Oman-Quest.apk.sha256`.

التحقق من النطاق منشور عند https://daashh3.github.io/.well-known/assetlinks.json في مستودع `daashh3/daashh3.github.io`. لا تحذفه؛ يحتاجه وضع التطبيق الغامر. يحتوي بصمة الشهادة العامة فقط.

لم تكن نظارة متصلة أثناء البناء؛ لم يُختبر تشغيل APK على جهاز فعلي بعد.

## إعادة البناء

على الجهاز الحالي، يستخدم `Build-Quest.ps1` أدوات Java وAndroid الموجودة مع Unity، وأداة Meta المثبتة محليًا في `.tools/quest`. من مجلد المشروع:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Build-Quest.ps1
```

للبناء السحابي افتح Actions → Build Quest APK → Run workflow. نزّل artifact باسم `lamsat-quest-unsigned` وفك ضغطه، ثم وقّع ملفه محليًا:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Build-Quest.ps1 -UnsignedApk "PATH\app-release-unsigned.apk"
```

الناتج النهائي: `quest/Lamsat-Oman-Quest.apk`. ملف `Package-Quest.ps1` الأقدم يوثّق المسار التفاعلي العام؛ `Build-Quest.ps1` هو مسار البناء المستخدم لهذا الإصدار. لتحديث APK محليًا ارفع `VersionCode` وغيّر `VersionName` عند إعادة البناء. تعديلات الموقع وحدها تُنشر عبر `Publish-GitHub.ps1` ولا تتطلب إعادة تثبيت APK ما دام عنوانه ثابتًا.

## مفتاح التوقيع

المفتاح داخل `quest/signing/release.keystore`، وكلمة مروره مشفّرة بـ Windows DPAPI داخل `quest/signing/password.clixml` لحساب Windows الحالي. هذه الملفات مستثناة من Git ولم تُرسل إلى GitHub أو إلى جهاز البناء السحابي. احتفظ بالمفتاح؛ تحديثات التطبيق تحتاج التوقيع نفسه. نقل المفتاح إلى حساب أو جهاز آخر يحتاج تصدير كلمة المرور من الحساب الحالي أولًا، ولا يكفي نسخ ملف DPAPI وحده.

المراجع: [تغليف PWA من Meta](https://developers.meta.com/vr/documentation/web/pwa-packaging/)، [تثبيت APK باستخدام Developer Hub](https://developers.meta.com/vr/documentation/native/android/ts-mqdh-deploy-build/).