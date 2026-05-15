# OrdoSur — Inventaire de migration Brand Kit

> Généré dans le cadre du **Sprint #1** (fondations identité de marque).
> Les fichiers listés ci-dessous sont à traiter au **Sprint #2** (composants UI).
> **Règle :** remplacer toutes les classes `cyan-*`, `teal-*`, `sky-*` et les hex
> `#0891B2 / #06B6D4 / #22D3EE / #38BDF8 / #0EA5E9` par les tokens de marque :
>
> | Ancien | Nouveau (Tailwind) | Nouveau (HEX) |
> |---|---|---|
> | `sky-*` / `cyan-*` / `teal-*` | `[#00A86B]` ou classes custom | `#00A86B` (medical-green) |
> | `bg-sky-500` | `bg-medical-green` | `#00A86B` |
> | `text-sky-600` | `text-medical-green-deep` | `#006B47` |
> | `ring-sky-300` / `ring-sky-500` | `ring-medical-green` | `#00A86B` |
> | `hover:bg-sky-50` | `hover:bg-medical-green-soft` | `#E6F4EE` |
> | `#0891B2` / `#06B6D4` / `#0EA5E9` | `#00A86B` | medical-green |

---

## 1. Composants UI — `src/components/`

### `src/components/PatientDetailsModal.tsx`
- `bg-gradient-to-r from-blue-50 to-cyan-50` → gradient with `medical-green-soft`

### `src/components/ui/AgendaView.tsx`
- `consultation: 'bg-sky-500'` (type badge) → `bg-medical-green`
- `focus:ring-sky-300 dark:focus:ring-sky-500/40`
- `focus:border-sky-300 dark:focus:border-sky-500/40`
- `hover:bg-sky-50 dark:hover:bg-sky-500/[0.08]` (multiple occurrences)
- `text-sky-600 dark:text-sky-400` (multiple occurrences)
- `bg-sky-500 hover:bg-sky-600` (buttons)
- `border-2 border-sky-500` (spinner)
- `bg-sky-50 dark:bg-sky-500/[0.08]` (today highlight)

### `src/components/ui/AIChat.tsx`
- Classes `sky-*` / `cyan-*` à identifier précisément

### `src/components/ui/ClinicSidebar.tsx`
- Classes `sky-*` dans la navigation active / hover

### `src/components/ui/DocumentsView.tsx`
- Classes `sky-*` / `cyan-*`

### `src/components/ui/EncyclopedieView.tsx`
- Classes `sky-*` / `cyan-*`

### `src/components/ui/LoadingSpinner.tsx`
- Classes `sky-*` / `cyan-*` (spinner colors)

### `src/components/ui/NotificationsPanel.tsx`
- Classes `sky-*` / `cyan-*`

### `src/components/ui/PatientAvatar.tsx`
- Classes `sky-*` / `teal-*`

### `src/components/ui/PatientTabs.tsx`
- Classes `sky-*` (active tab underline / text)

### `src/components/ui/Sidebar.tsx` ⚠️ prioritaire
- Contient probablement les classes principales de navigation active
- Toutes les occurrences `sky-*` / `cyan-*` → `medical-green` tokens

### `src/components/ui/StatusBadge.tsx`
- Classes `sky-*` (badge status variant)

### `src/components/ui/Toast.tsx`
- Classes `sky-*` / `cyan-*` (info variant de toast)

### `src/components/ui/Toggle.tsx` ⚠️ hex direct
- `#0891B2` et/ou `#06B6D4` → `#00A86B` (medical-green)

### `src/components/ui/TopBar.tsx` ⚠️ prioritaire
- Classes `sky-*` dans la barre supérieure

---

## 2. Pages — `src/pages/`

### `src/pages/LoginPage.tsx` ⚠️ prioritaire
- Classes `sky-*` / `cyan-*` (CTA buttons, focus rings)

### `src/pages/MandatoryPasswordResetPage.tsx`
- Classes `sky-*` / `cyan-*`

### `src/pages/AcceptInvitationPage.tsx`
- Classes `sky-*` / `cyan-*`

### `src/pages/AuthCallbackPage.tsx`
- Classes `sky-*` / `cyan-*`

### `src/pages/DoctorDashboard.tsx` ⚠️ prioritaire
- Classes `sky-*` / `cyan-*`
- Import logo existant → migrer vers `<Logo>` (Sprint #2)

### `src/pages/SecretaireDashboard.tsx`
- Classes `sky-*` / `cyan-*`

---

## 3. Pages Clinique — `src/pages/clinic/`

### `src/pages/clinic/ClinicSettingsPage.tsx`
- Classes `sky-*` / `cyan-*`

### `src/pages/clinic/ClinicStatsPage.tsx`
- Classes `sky-*` / `cyan-*`

### `src/pages/clinic/DoctorManagementPage.tsx`
- Classes `sky-*` / `cyan-*`

### `src/pages/clinic/views/ClinicAgendaView.tsx` ⚠️ hex direct
- `#0891B2` / `#06B6D4` / `#0EA5E9` → `#00A86B`
- Classes `sky-*` / `cyan-*`

### `src/pages/clinic/views/ClinicHomeView.tsx`
- Classes `sky-*` / `cyan-*`

### `src/pages/clinic/views/ClinicMedecinsView.tsx` ⚠️ hex direct
- Hex cyan → `#00A86B`
- Classes `sky-*` / `cyan-*`

### `src/pages/clinic/views/ClinicNotificationsView.tsx`
- Classes `sky-*` / `cyan-*`

### `src/pages/clinic/views/ClinicOrdonnancesView.tsx`
- Classes `sky-*` / `cyan-*`

### `src/pages/clinic/views/ClinicPatientsView.tsx`
- Classes `sky-*` / `cyan-*`

### `src/pages/clinic/views/ClinicSettingsView.tsx`
- Classes `sky-*` / `cyan-*`
- Import logo existant → migrer vers `<Logo>` (Sprint #2)

### `src/pages/clinic/views/ClinicStatsView.tsx`
- Classes `sky-*` / `cyan-*`

---

## 4. Logo actuel (à migrer vers `<Logo>`)

| Fichier | Usage actuel | Migration Sprint #2 |
|---|---|---|
| `src/components/PrescriptionPreviewModal.tsx` | Import SVG/image logo | `<Logo variant="horizontal-light" size="xl" />` |
| `src/pages/clinic/views/ClinicSettingsView.tsx` | Import SVG/image logo | `<Logo variant="horizontal-light" size="md" />` |
| `src/pages/DoctorDashboard.tsx` | Import SVG/image logo | Choisir variant adapté |

---

## 5. Récapitulatif priorités Sprint #2

| Priorité | Fichier | Raison |
|---|---|---|
| 🔴 P0 | `src/components/ui/Sidebar.tsx` | Vu en permanence |
| 🔴 P0 | `src/components/ui/TopBar.tsx` | Vu en permanence |
| 🔴 P0 | `src/pages/LoginPage.tsx` | Première impression |
| 🔴 P0 | `src/components/ui/Toggle.tsx` | Hex direct, facile |
| 🟠 P1 | `src/components/ui/AgendaView.tsx` | Nombreuses occurrences |
| 🟠 P1 | `src/pages/clinic/views/ClinicAgendaView.tsx` | Hex + classes |
| 🟠 P1 | `src/pages/clinic/views/ClinicMedecinsView.tsx` | Hex direct |
| 🟡 P2 | Autres pages clinic | Moins visibles |
| 🟡 P2 | Auth pages | Flux secondaire |

---

*Généré le 2026-05-15 — Sprint #1 Brand Kit OrdoSur*
