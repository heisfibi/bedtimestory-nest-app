import type { LegalDocument } from './legal-documents.js';

// The built-in text of each legal page (version 0), served until a super
// admin publishes one from the studio. Written in the Markdown of
// legal-text.ts. Once a page has been published, changing it here changes
// nothing that is live: publish from the studio instead.
//
// What the privacy policy says the app sends must match what it does (the
// app's analytics.ts, notifications, unlock codes and app check) and the Play
// Console's Data safety answers.

const PRIVACY = `
## 1. Introduction
Bedtime Stories is an app of picture stories, poems and comics for children, made by Fibi Technologies ("we", "us"). This Privacy Policy explains what the app sends to our server, what stays on your device, which other companies are involved, and what our Story Studio keeps about the people who write the books.

Bedtime Stories is designed for children. It shows no ads and contains no advertising or third-party analytics tools. We never ask children, or parents, for a name, an email address or any other contact details.

## 2. What the App Sends to Our Server
- **A random install number.** The app makes it up the first time it runs. It is not your name, email address, phone number, advertising ID or any number belonging to the device; it only tells our server that two reports came from the same copy of the app.
- **Reading activity.** Which books are opened and when, how many of their pages are read, the time spent on them, whether the end was reached, and whether the book was read, listened to or recorded.
- **Subscription status.** Whether this copy of the app has an active subscription, which plan it is, and the purchase token Google Play gives for it (a reference to the purchase, not payment details).
- **Notification settings, only if notifications are turned on.** The address the notification service gives this copy of the app (a "push token"), the app's language, the device's time zone, which news is wanted (new books, books from creators you follow), whether spooky and action stories are switched on, which creators you follow, and when we last sent a notification.
- **Codes.** When a code is typed in the app, it is sent to our server to check what it opens. We don't keep a record of who typed it.
- **An app check.** To make sure requests come from the real app installed from Google Play, the app may ask Google Play Integrity to vouch for it and pass Google's answer to us. We keep only whether the check passed, for up to 12 hours.

Like every website, our server and our hosting provider see the internet (IP) address each request comes from in order to answer it. We don't store it with any of the information above or use it to identify anyone; our hosting provider may keep it in its logs for a short time, for security.

We do not collect names, email addresses, contacts, precise location, photos, the advertising ID, or anything else that identifies a child or a parent.

## 3. How We Use It
- To run the app: to know which books a copy of the app may open, and to check subscriptions and codes.
- To see which books are read, and how much, so we can improve the library.
- To share subscription money with the creators of the books subscribers read: each creator's share depends on how much their books were read.
- To send the notifications you asked for: news of new books, in the early evening of your time zone, never at night, and at most about once a day. Which creators' books you read helps us choose which new books to tell you about.
- To keep the service safe, for example to ignore false reports and copies of the app that have been tampered with.

We do not sell this information, use it for advertising, or build profiles of children.

## 4. Companies That Help Us {#third-parties}
A few companies help us run the service. Each handles information only to provide its service to us:
- **Railway** hosts our server and database.
- **Google Play** sells subscriptions, confirms purchases, and runs the Play Integrity app check.
- **Google Firebase** supplies some of the app's settings when it starts. It receives none of the information listed above.
- **Expo**, and through it Firebase Cloud Messaging (Google) or the Apple Push Notification service, delivers notifications. They receive the push token and the text of each notification.
- **Apple's App Store** sells subscriptions on Apple devices.

Their own privacy policies: [Google](https://policies.google.com/privacy), [Expo](https://expo.dev/privacy), [Railway](https://railway.com/legal/privacy), [Apple](https://www.apple.com/legal/privacy/).

Their servers may be outside your country, including in the United States and Europe. We do not share the information with anyone else unless the law requires us to.

## 5. What Stays on Your Device
- **Voice recordings** made with the app, and the reader's name typed for them, are stored only on the device and are never sent to us.
- Downloaded books, music, the reading level and the rest of the settings are kept only on the device too, apart from the notification settings described above.

## 6. Payments
Subscriptions are bought and paid for through Google Play (or Apple's App Store on Apple devices). We never see card or bank details. In the app, buying is behind a grown-up check.

## 7. Children's Privacy
Bedtime Stories is designed for children, and we do not knowingly collect personal information from children. The install number, reading activity and notification settings described above are not linked to a name, an email address or a device identifier. Notifications are only sent if they are allowed on the device. Parents with questions can contact us at the address below.

## 8. Creators Using Our Studio {#creators}
If you apply to become a creator, we keep what you write in the application (your name, email address, what you would like to make, the languages and country you give, what you tell us about yourself and any links), a scrambled (hashed) form of the password you choose, which version of the Creator Terms you agreed to, and whether the application was approved or declined, with any note. Our team uses it to decide on your application.

If you write books in Story Studio, we keep your name, your email address and a scrambled (hashed) form of your password to run your account, together with the books you upload (their text, pictures, recordings and the names of their narrators), your code for opening your books, and how much your books were read and earned. Your name is shown with your books in the app, and readers can follow you. When you use machine translation in the studio, the text is sent to the translation service we use for it; the browser's own translator works on your computer.

Our website uses one cookie, only to keep you signed in to the studio. It has no advertising or analytics cookies.

If we need payment details to pay you, we ask for them separately and use them only to pay you.

## 9. Keeping Information, and Security
Information travels between the app, the website and our server over encrypted (HTTPS) connections, passwords are stored only in scrambled form, and only our team can see what the server keeps.

- Reading reports are kept for as long as we need them to work out and record payments to creators, and to meet our accounting duties.
- Notification settings are deleted when notifications are turned off, or when the notification service tells us the app is no longer installed.
- Because the install number is not linked to you, we cannot look up a person's reading by name. Uninstalling the app stops any further reports.
- Creator applications and accounts are kept while they are useful to run the studio. When an account is closed, we keep only what we need for payments, accounting and the law.

## 10. Your Rights
Under the Nigeria Data Protection Act 2023, and similar laws where you live, you can ask to see the personal information we hold about you, to correct or delete it, or to object to how we use it.

- Creators: write to us from your account's email address.
- App users: we don't know who you are, so we cannot find information by name. You can turn notifications off in the app's Settings or the device's settings, and uninstalling the app stops all reports.

If you're unhappy with how we handle your information, you can complain to the Nigeria Data Protection Commission, or to the data protection authority where you live.

## 11. Changes to This Policy
We may update this Privacy Policy when the app changes or the law requires it. The new version will be posted on this page with a new effective date.

## 12. Contact Us
If you have any questions or concerns about this Privacy Policy, please contact Fibi Technologies at heisfibi@gmail.com.
`;

const TERMS = `
## 1. About These Terms
These terms are an agreement between you and Fibi Technologies ("we", "us"), the maker of the Bedtime Stories app. By downloading or using the app, you agree to them. If you don't agree, please don't use the app.

The app is meant to be set up and looked after by a parent or another grown-up. If you let a child use it, you accept these terms on their behalf and are responsible for how they use it.

Our [Privacy Policy](/privacy) explains what information the app uses. Writing books in our Story Studio is covered by the [Creator Terms](/creator-terms).

## 2. The App
Bedtime Stories offers picture stories, poems and comics for children, with narration, voice recording, background music and books in many languages. Some books are free; the rest need a subscription or a code. We add, change and remove books from time to time, and which books are available can differ from one language to another. We may also change or remove features of the app.

## 3. Subscriptions
- **What you get.** A subscription opens every book in the app for as long as it is active. The plans and their prices are shown in the app and in the store before you buy, and can differ from country to country.
- **Buying.** Subscriptions are sold by Google Play (or Apple's App Store on Apple devices) and paid for through your store account, so the store's own terms also apply. In the app, buying is behind a grown-up check.
- **Free trial.** A new subscriber may be offered a free trial, whose length is shown before it starts. Unless you cancel before the trial ends, the subscription begins and you are charged automatically.
- **Automatic renewal.** A subscription renews automatically at the end of each period (a month or a year) at the price then in force, unless you cancel before it renews. The store tells you before a price goes up.
- **Cancelling.** You can cancel at any time in your store account's subscriptions, which the app's Manage subscription button opens. You keep the subscription until the end of the period you have paid for. Uninstalling the app does not cancel a subscription.
- **Refunds.** Payments are handled by the store, so refunds follow Google Play's or Apple's refund policies. Nothing in these terms takes away any right to a refund that the law gives you.
- **Restoring.** On a new device, or after reinstalling, use Restore purchases while signed in to the same store account.

## 4. Codes
Some creators give out codes that open their own books without a subscription, and we may give out codes too. A code is free, has no cash value, may not be sold or exchanged for money, and can stop working, for example when its creator replaces it or leaves. A code is not a subscription.

## 5. Using the App and Its Books
The app and its books, including their stories, pictures, comics, narration and music, belong to us or to the creators who made them, and are protected by copyright. We give you a personal, non-exclusive, non-transferable licence to use the app and read its books on your own devices, for your household's own non-commercial use.

You may not copy, sell, rent, publish, broadcast or share the books, or recordings of them, outside your household, or use them to train or build other products.

## 6. Your Recordings
The app lets you record yourself reading a book aloud. Recordings stay on your device, and we never receive a copy, so we cannot recover one that is lost. You are responsible for your recordings, and for having the permission of anyone whose voice you record. They are for your household's own use and don't give you any rights in the book.

## 7. Notifications
The app can tell you about new books. Notifications are optional, and you can turn them off at any time in the app's Settings or in the device's settings.

## 8. Fair Use
You agree not to:
- copy, change, decompile or reverse engineer the app, except where the law allows it;
- get round subscriptions, codes, the grown-up check or the app check, or use a copy of the app that has been tampered with;
- send our server false reading reports or subscription details, or otherwise interfere with it;
- use the app in any way that breaks the law.

We may stop any copy of the app that does these things from reaching our server.

## 9. Content for Children
Our team reads every book before it appears in the app. Reading levels, and content settings such as spooky and action stories (shown only when a grown-up allows them), help you choose. Every child is different, so please choose what suits yours. If you find something in a book that you think is wrong or unsuitable, tell us and we will look into it.

## 10. Availability
We work to keep the app running and its books accurate, but the app is provided "as is" and "as available". It may sometimes have errors or interruptions, downloading books needs an internet connection, and we do not promise that any particular book will remain available.

## 11. Our Liability
As far as the law allows, we are not liable for any indirect or consequential loss, or for the loss of data such as recordings, arising from your use of the app, and our total liability to you for any claim is limited to what you paid for your subscription in the 12 months before the claim.

Nothing in these terms limits liability that cannot be limited by law, such as for fraud or for death or personal injury caused by negligence, or takes away your rights as a consumer.

## 12. Ending
You can stop using the app at any time by uninstalling it (and cancelling any subscription in your store account). We may suspend or end your use of the app if you seriously break these terms. Sections 5, 11 and 14 continue to apply afterwards.

## 13. Changes to These Terms
We may update these terms. The new version will be posted on this page with a new effective date, and if the changes are significant we will also tell you in the app or on our website. If you keep using the app once the new terms take effect, you accept them; if you don't accept them, stop using the app and cancel your subscription.

## 14. Governing Law
These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Nigeria will hear any dispute about them. If you are a consumer living in another country, you keep the protection of that country's mandatory laws and can bring a claim in its courts.

## 15. Contact Us
If you have any questions about these terms, please contact Fibi Technologies at heisfibi@gmail.com.
`;

const CREATOR_TERMS = `
## 1. About These Terms
These Creator Terms are an agreement between you and Fibi Technologies ("we", "us") for making books in our Story Studio and publishing them in the Bedtime Stories app. You accept them when you apply to become a creator, or when you first sign in to a studio account we have made for you.

Our [Privacy Policy](/privacy#creators) explains what we keep about creators. The app's [Terms and Conditions](/terms) cover its readers.

## 2. Becoming a Creator
- You must be at least 18 years old and able to enter into a contract.
- You apply on our website, and our team decides on each application. We may decline one, with or without giving a reason.
- The information you give us must be true, and you must keep your email address up to date.
- Your account is for you alone. Keep your password secret, and tell us straight away if you think someone else has used it. You are responsible for what is done with your account.

## 3. Your Books Stay Yours
You keep the copyright and every other right in the books you make, including their text, pictures, recordings and anything else you add ("your content"). We claim no ownership of it.

## 4. The Licence You Give Us
So that we can publish your books, you give Fibi Technologies a worldwide, non-exclusive, royalty-bearing licence, for as long as a book is published in the app, to:
- store, copy, format and show your content in the app and on our websites, in every country where the app is available;
- translate it into the app's languages, or have it translated, including by machine translation;
- let readers download it to read offline, listen to its narration, and record themselves reading it;
- use its title, cover, pages, short extracts and your creator name to promote the app and the book, for example in store listings, on our website and on social media.

We may do these things through the companies that help us run the service. The licence is non-exclusive, so you are free to publish your books anywhere else too.

When a book is removed from the app, the licence for it ends, except that copies already downloaded to readers' devices may stay there, promotional material already published need not be withdrawn, and we may keep copies for our records, to meet the law or to settle a dispute.

## 5. What You Promise
For everything you upload, you promise that:
- it is your own original work, or you have every right and permission needed to publish it in the app under these terms, including for pictures, fonts, music and other people's voices (the fonts in the studio's font library are free to use in books);
- it does not infringe anyone's copyright, trademark, privacy or other rights, and does not include anyone's personal information without their permission;
- it is suitable for children: no sexual content, graphic violence, hate, bullying, bad language, dangerous acts a child might copy, or advertising;
- it is described accurately: its title, language, reading level and mood (such as "A little spooky" or "Action") match the book;
- if any of it was made with AI tools, you have the right to use what they produced, and it keeps to everything above.

You agree to cover our reasonable losses and costs from any claim that your content breaks these promises.

## 6. Review and Publishing
Someone on our team reads every book before it reaches the app. We may approve it, send it back to you with notes, or decline it, as we see fit. We do not change your words or pictures ourselves: if something needs changing, we send the book back to you.

We may hide or remove a book at any time if we believe it breaks these terms, the law or the app stores' rules, or while we look into a complaint about it. We are not obliged to publish any book, or to keep publishing it.

## 7. Earnings {#earnings}
- **Where the money comes from.** Each month, the subscription money we receive for that month is shared among the books subscribers read. "Subscription money" means what the app stores actually pay us for the month, after their fees, refunds and any taxes they deduct.
- **How it is shared.** Each subscriber who read that month carries an equal part of the month's money, which is divided among the books they read, in proportion to how much of each book they read. We set the details, such as how long a page must be on screen to count, and may adjust them to keep the count fair.
- **Your share.** You receive the creator share of what your books make, and we keep the rest. The creator share in force is shown on our website's Become a creator page and in the studio. We may change it: a change applies to every month that has not yet been closed, and we will tell you before we lower it.
- **What earns nothing.** Reading without a subscription earns nothing, including free books, books opened with a code (your own code too), and reading by app store reviewers and our team. We may also leave out reading that we believe is fake or automated.
- **Statements.** The studio shows how much your books were read and what they earned. Once we close a month, its figures are final, unless we find a mistake, which we may correct in a later month.
- **Payment.** We pay what you are owed for closed months by bank transfer or another method we agree with you. You must give us correct payment details; we are not responsible for a payment lost because the details were wrong.
- **Taxes.** You are responsible for any taxes on what you earn. If the law requires us to deduct tax from a payment, we will, and pay you the rest.
- **No promise of earnings.** We cannot promise that any book will be read, or that it will earn any particular amount.

## 8. Your Code
The studio gives you a code that opens your books in the app without a subscription, so you can share your work with your own readers. Reading with your code earns nothing. You can replace the code at any time, and the old one then stops working. Codes may not be sold.

## 9. Your Name
Your creator name is shown with your books in the app, and readers can follow you to hear about your new books. Choose a name you are happy to have shown in public, and do not use someone else's name or a name that could mislead.

## 10. Removing Books and Leaving
You can ask us to remove any of your books from the app, or to close your account, by writing to us from your account's email address. We will do so within a reasonable time, usually a few days. What your books earned in the months before is still paid as described above.

We may suspend or close your account, or remove your books, if you seriously or repeatedly break these terms. If we do, we will still pay what you were owed for closed months, except for any money that came from breaking these terms, such as from fake reading.

## 11. Our Liability
The studio is provided "as is". Keep your own copies of your work: the studio can save your book as a studio file on your computer. As far as the law allows, we are not liable for any indirect or consequential loss, lost profits or lost data, and our total liability to you for any claim is limited to what we paid you in the 12 months before the claim. Nothing in these terms limits liability that cannot be limited by law.

## 12. Our Relationship
You are an independent creator. Nothing in these terms makes you our employee, agent or partner.

## 13. Changes to These Terms
We may update these Creator Terms. The new version will be posted on this page with a new effective date, and we will tell you by email or in the studio before a significant change takes effect. If you keep using the studio, or keep your books in the app, once the change has taken effect, you accept it. If you don't, you can remove your books and close your account.

## 14. Governing Law
These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Nigeria will hear any dispute about them.

## 15. Contact Us
If you have any questions about these terms, please contact Fibi Technologies at heisfibi@gmail.com.
`;

export const DEFAULT_LEGAL_TEXTS: Record<
  LegalDocument,
  { effectiveDate: string; body: string }
> = {
  privacy: { effectiveDate: '2026-10-18', body: PRIVACY.trim() },
  terms: { effectiveDate: '2026-10-18', body: TERMS.trim() },
  'creator-terms': { effectiveDate: '2026-10-18', body: CREATOR_TERMS.trim() },
};
