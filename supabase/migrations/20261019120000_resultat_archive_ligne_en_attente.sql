-- Sprint 6A-bis — Une ligne de demande n'est jamais « réalisée » sans action explicite.
--
-- Avant : un résultat archivé SANS remplacement laissait sa ligne de demande à « réalisé »,
-- sans résultat → elle affichait « résultat à saisir » alors que personne ne l'avait marquée
-- réalisée à la main.
-- Maintenant : la ligne revient à « en attente » (elle n'avait été réalisée que par ce
-- résultat). Le statut de la demande est recalculé par demande_examen_lignes_sync.
-- Une correction (archivage + nouvelle saisie dans la même transaction, RPC
-- enregistrer_resultats_examens) rattache aussitôt le nouveau résultat : la ligne repasse à
-- « réalisé » avec lui.
-- « Réalisé — résultat à saisir » ne reste donc possible que par « Marquer réalisé ».

create or replace function public.resultats_examens_after_archive()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.archive and not old.archive then
    update demande_examen_lignes
       set resultat_id = null, statut = 'en_attente'
     where resultat_id = old.id and statut = 'realise';
  end if;
  return null;
end;
$$;
