# Email Templates — Ordosur Brand Kit v1

4 templates HTML brandés pour les emails transactionnels Supabase Auth.

> ℹ️ Tant que la migration Resend n'est pas faite (voir [`RESEND_MIGRATION_PLAN.md`](../RESEND_MIGRATION_PLAN.md)), tous les emails sont envoyés par Supabase Auth. Ces templates doivent être collés manuellement dans le dashboard Supabase.

---

## 📋 Comment installer

1. Ouvrir le **Supabase Dashboard** du projet `Ordosur data` (ref `yxzvukryngvlzjgaydqj`)
2. Aller dans **Authentication → Email Templates**
3. Pour chaque template ci-dessous : copier le contenu HTML, coller dans le champ correspondant, sauvegarder

| Fichier | Template Supabase | Sujet recommandé |
|---|---|---|
| `01-confirm-signup.html` | **Confirm signup** | `Bienvenue sur Ordosur — Activez votre compte` |
| `02-magic-link.html` | **Magic Link** | `Votre lien de connexion Ordosur` |
| `03-reset-password.html` | **Reset Password** | `Réinitialisation de votre mot de passe Ordosur` |
| `04-invite-user.html` | **Invite user** | `Invitation à rejoindre une clinique sur Ordosur` |

---

## 🎨 Direction de design

| Token | Hex |
|---|---|
| Fond extérieur (paper soft) | `#F8F8F5` |
| Fond contenu | `#FFFFFF` |
| Texte principal | `#0A1628` (ink-navy) |
| Texte secondaire | `#475569` (ink-muted) |
| Texte tertiaire / footer | `#94A3B8` (ink-faint) |
| Bouton CTA / accent | `#00A86B` (medical-green) |
| Bordure cartes | `#E5E5E0` (divider) |

- Largeur max : **600px**
- Police : Inter avec fallback `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif`
- Pas de SVG (Outlook ne supporte pas) — logo en PNG depuis `https://ordosur.com/email-assets/logo-horizontal-light.png`
- CSS inline pour tout le styling critique
- Layout 100 % en tables (compatibilité Outlook)
- Conditional MSO comments où nécessaire

---

## 🔑 Variables disponibles dans les templates Supabase Auth

Templates utilisent la syntaxe Go templates de Supabase :

| Variable | Description |
|---|---|
| `{{ .ConfirmationURL }}` | Lien de clic (signup confirm / magic link / reset / invite) |
| `{{ .Email }}` | Adresse email du destinataire |
| `{{ .Token }}` | Token OTP (si flow OTP) |
| `{{ .SiteURL }}` | URL de base du site |
| `{{ .Data.prenom }}` | Prénom (depuis `user_metadata.prenom` au sign-up) |
| `{{ .Data.clinique }}` | Nom de la clinique (template invite uniquement) |
| `{{ .Data.invited_by }}` | Nom de la personne qui invite (template invite uniquement) |

⚠️ Si `{{ .Data.prenom }}` est vide (sign-up qui ne stocke pas le prénom dans `user_metadata`), le template affichera "Bonjour Dr.&nbsp;,". Il faut donc s'assurer que :
- Le formulaire de sign-up appelle `supabase.auth.signUp({ email, password, options: { data: { prenom: 'Jean' } } })`
- Le formulaire d'invitation appelle `supabase.auth.admin.inviteUserByEmail(email, { data: { prenom: '...', clinique: '...', invited_by: '...' } })`

---

## ✅ Tests recommandés

Après installation, envoyer un email de test à `contact.parfury@gmail.com` pour chaque template et vérifier le rendu sur :
- Gmail web (Chrome desktop)
- Gmail iOS
- Apple Mail iOS
- Outlook web
- Outlook Windows (le plus capricieux)

Checklist par email :
- [ ] Logo PNG affiché (pas de carré rouge "image manquante")
- [ ] CTA vert cliquable, padding correct
- [ ] Couleurs respectées
- [ ] Le lien `{{ .ConfirmationURL }}` mène à la bonne page Ordosur
- [ ] Texte lisible en mode sombre / clair Gmail
- [ ] Largeur correcte sur mobile (≤375px)

---

## 🔄 Modification future

Pour modifier un template :
1. Éditer le fichier HTML local
2. Commit dans Git (versioning)
3. Re-copier dans Supabase Dashboard

Le code source local est la source de vérité ; Supabase Dashboard n'est qu'un mirroir applicatif.
