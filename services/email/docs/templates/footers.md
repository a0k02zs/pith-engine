# Required footers per market

The send workflow adds the footer for the contact's country. The QA agent checks that every required field is present. Field names match `config/market-rules.json`.

## All markets (base footer)

```
You get this email because {{consent_reason}}.
{{sender_legal_name}} · {{sender_postal_address}}
Unsubscribe: {{unsubscribe_url}} · Email preferences: {{preferences_url}} · Privacy notice: {{privacy_notice_url}}
```

`{{consent_reason}}` examples: "you signed up at {{brand_name}}.com", "you bought from {{brand_name}}", "you downloaded {{asset_title}}".

## United Kingdom (GB)

Base footer. For soft opt-in contacts, `{{consent_reason}}` is "you bought from {{brand_name}}" and the unsubscribe link is visible near the top of the footer.

## Singapore (SG)

Base footer. For unsolicited bulk email:
- Subject line starts with `<ADV> ` (the send workflow adds it).
- Add the line: "To stop these emails, use the unsubscribe link. We act on your request within 10 business days." (Pith acts within 2 days.)

## United States (US)

Base footer, with the physical postal address always shown. If the contact did not give consent, add the line:

```
This email is an advertisement from {{sender_legal_name}}.
```

## Canada (CA)

Base footer, and add 1 more contact method:

```
Contact us: {{sender_contact_email}} or {{sender_website}}
```

If Pith sends on behalf of the client, name the client as the sender.

## Quebec (CA-QC)

The full email and footer are in French. Example footer:

```
Vous recevez ce courriel parce que {{consent_reason_fr}}.
{{sender_legal_name}} · {{sender_postal_address}}
Nous joindre : {{sender_contact_email}} ou {{sender_website}}
Se désabonner : {{unsubscribe_url}} · Préférences : {{preferences_url}} · Confidentialité : {{privacy_notice_url}}
```

A native French editor checks the final copy.

## GCC (AE, SA, QA, KW, BH, OM)

Base footer in the email language. For Arabic emails, the footer is in Arabic and right-to-left. Example:

```
تصلك هذه الرسالة لأنك {{consent_reason_ar}}.
{{sender_legal_name}} · {{sender_postal_address}}
إلغاء الاشتراك: {{unsubscribe_url}} · التفضيلات: {{preferences_url}} · سياسة الخصوصية: {{privacy_notice_url}}
```

A native Gulf Arabic editor checks the final copy.

## European Union

Base footer in the email language. For contacts from a third-party source (for example Apollo), add the Article 14 block in the first email:

```
We got your work contact details from {{data_source}}. We use them to {{purpose}}, on the basis of {{lawful_basis}}.
You can object at any time: {{unsubscribe_url}}. Full details: {{privacy_notice_url}}.
```
