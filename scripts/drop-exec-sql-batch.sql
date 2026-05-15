-- À exécuter après la fin de l'import pour supprimer la fonction temporaire
REVOKE EXECUTE ON FUNCTION exec_sql_batch(TEXT) FROM anon, authenticated;
DROP FUNCTION IF EXISTS exec_sql_batch(TEXT);
