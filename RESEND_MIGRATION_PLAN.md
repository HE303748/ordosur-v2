# Plan de migration vers Resend — Sprint #3.1 (futur)

> **Statut actuel (post-Sprint #3)** : tous les emails transactionnels sont envoyés par **Supabase Auth** avec les 4 templates HTML brandés livrés dans [`email-templates/`](./email-templates/). Aucune dépendance Resend n'est installée. Ce document décrit la migration future.

---

## 🎯 Pourquoi migrer vers Resend

| Limite Supabase Auth | Bénéfice Resend |
|---|---|
| 4 templates fixes (signup, magic link, reset, invite) | N'importe quel type d'email custom |
| Pas de feature "Notification interaction critique" | Email transactionnel à la demande |
| Rate limit de 3 emails/heure en hobby/free | Domaine dédié, 100K/mois en starter |
| Pas de tracking ouverture / clic | Analytics natifs |
| Templates HTML uniquement (pas de React Email) | React Email pour composer en JSX |
| Pas d'envoi de masse | Audiences + broadcasts |

---

## 📐 Architecture cible

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────┐
│ Frontend React  │──────▶│ Edge Function    │──────▶│ Resend API  │
│ (signup/invite/ │       │ send-transac-    │       │ resend.com  │
│  reset action)  │       │ tional-email     │       │             │
└─────────────────┘       └──────────────────┘       └─────────────┘
        │                                                    │
        │                                                    ▼
        │                                            ┌──────────────┐
        └───────── Supabase Auth Hooks ─────────────▶│ webhook      │
              (sign-up, password-reset, invite)      │ /auth-hook   │
                                                     └──────────────┘
```

### Étape 1 — Configurer Resend
1. Créer un compte Resend (resend.com)
2. Ajouter et vérifier le domaine `ordosur.com` (DNS records : SPF, DKIM, DMARC)
3. Créer une API key, la stocker dans Supabase secrets : `supabase secrets set RESEND_API_KEY=re_xxx`
4. Configurer l'expéditeur `noreply@ordosur.com` (ou `contact@ordosur.com`)

### Étape 2 — Installer les libs
```bash
# Edge function (Deno) : pas d'install npm, juste import
# Pour les templates React Email côté projet (optionnel) :
npm install -D @react-email/components @react-email/render
```

### Étape 3 — Créer l'edge function `send-transactional-email`
`supabase/functions/send-transactional-email/index.ts` :
```typescript
import { Resend } from "npm:resend@latest";

Deno.serve(async (req) => {
  const { type, to, data } = await req.json();
  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

  // type ∈ 'welcome' | 'magic-link' | 'reset-password' | 'invite' | 'interaction-alert'
  const { subject, html } = await renderTemplate(type, data);

  const { data: result, error } = await resend.emails.send({
    from: "Ordosur <noreply@ordosur.com>",
    to,
    subject,
    html,
  });

  if (error) return new Response(JSON.stringify({ error }), { status: 500 });
  return new Response(JSON.stringify({ id: result.id }), { status: 200 });
});
```

### Étape 4 — Convertir les templates HTML en React Email
Optionnel mais recommandé. Convertir chaque `email-templates/*.html` en composant `.tsx` :
```tsx
// supabase/functions/send-transactional-email/templates/Welcome.tsx
import { Button, Container, Html, Section, Text } from '@react-email/components';

export const Welcome = ({ prenom, confirmUrl }) => (
  <Html>
    <Container style={{ /* ... */ }}>
      <Text>Bonjour Dr. {prenom},</Text>
      <Button href={confirmUrl}>Activer mon compte</Button>
    </Container>
  </Html>
);
```

### Étape 5 — Configurer Supabase Auth Hooks
Dans `Authentication → Hooks → Send Email Hook` :
- Type : **HTTP Hook**
- URI : `https://yxzvukryngvlzjgaydqj.supabase.co/functions/v1/send-transactional-email`
- Secret : générer un secret partagé, le stocker côté edge function pour valider l'origine

Une fois activé, **désactiver les templates email natifs Supabase** (sinon double envoi). Le hook reçoit un payload `{ user, email_data: { token, email_action_type, redirect_to, ... } }` que l'edge function transforme en email Resend.

### Étape 6 — Email custom #5 : "Notification interaction critique"
Hors flow Auth, déclenché depuis le code applicatif :
```typescript
// Dans handleSaveOrdonnance, après un INSERT dans interaction_logs avec risk_level='dangerous'
await supabase.functions.invoke('send-transactional-email', {
  body: {
    type: 'interaction-alert',
    to: doctorProfile.email,
    data: {
      prenom: doctorProfile.prenom,
      patient: `${patient.prenom} ${patient.nom}`,
      medicaments: alert.involved,
      severite: alert.severite,
    },
  },
});
```
À activer seulement en plan Pro/Clinique (feature-gate via la table `subscriptions`).

---

## 🧪 Validation de la migration

1. ✅ Envoyer un email test depuis chaque flow (signup, magic link, reset, invite) après activation du hook
2. ✅ Vérifier dans le dashboard Resend → Logs que l'email est bien envoyé via Resend (pas via Supabase)
3. ✅ Vérifier les analytics : taux d'ouverture, taux de clic sur les CTA
4. ✅ Désactiver les anciens templates Supabase (Authentication → Email Templates → vider chaque template) pour éviter le double envoi en cas de fallback
5. ✅ Tester un cas d'erreur (Resend KO) : Supabase doit-il retomber sur le template natif ? (À décider — sinon les utilisateurs ne reçoivent rien)

---

## ⚠️ Risques à anticiper

| Risque | Mitigation |
|---|---|
| DNS mal configuré (SPF/DKIM) → spam folder | Tester avec mail-tester.com avant prod |
| Hook Auth en panne → utilisateurs ne reçoivent pas leurs emails | Garder templates Supabase actifs pendant 1 semaine en parallèle |
| Coût Resend imprévu (>100K emails/mois) | Mettre des alertes de budget côté Resend |
| Migration partielle (certains emails sur Resend, d'autres sur Supabase) → inconsistance de marque | Tout migrer d'un coup, pas progressivement |

---

## 📅 Effort estimé

| Tâche | Durée |
|---|---|
| Setup Resend + DNS | 1h |
| Edge function + 4 templates de base | 4h |
| Conversion en React Email (optionnel) | 3h |
| Configuration Auth Hook + tests | 2h |
| Template `interaction-alert` + feature gate | 2h |
| Tests cross-clients | 2h |
| **Total** | **~1.5j développeur** |
