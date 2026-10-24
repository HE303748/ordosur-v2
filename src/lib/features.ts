// Drapeaux de fonctionnalités publiques.
//
// CLINIC_SIGNUP_ENABLED : création d'un compte Clinique (en pause le temps de retravailler l'offre).
// Faux → /register et /register/clinic mènent à l'inscription médecin, aucune mention de l'offre Clinique
// sur les pages publiques. Le code Clinique (tableaux de bord, rôles, RPC, tables, RLS) reste en place et
// les comptes clinic_admin existants gardent leur accès.
export const CLINIC_SIGNUP_ENABLED = false;
