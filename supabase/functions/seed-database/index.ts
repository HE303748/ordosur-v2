import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SeedResult {
  success: boolean;
  sync_id?: string;
  records_affected: {
    medications: { created: number; updated: number; skipped: number };
    drug_interactions: { created: number; updated: number; skipped: number };
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const result: SeedResult = {
      success: false,
      records_affected: {
        medications: { created: 0, updated: 0, skipped: 0 },
        drug_interactions: { created: 0, updated: 0, skipped: 0 },
      },
    };

    const { data: syncData, error: syncError } = await supabase.rpc('start_sync', {
      p_sync_type: 'full_sync',
      p_source: 'edge_function',
      p_metadata: { function: 'seed-database', timestamp: new Date().toISOString() },
    });

    if (syncError) {
      console.error('Error starting sync:', syncError);
      result.error = syncError.message;
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const syncId = syncData;

    const medications = [
      {
        nom: 'Doliprane',
        classe_therapeutique: 'Antalgique - Antipyrétique',
        effets_secondaires_frequents: ['Rares aux doses thérapeutiques'],
        effets_secondaires_rares: ['Hépatotoxicité (surdosage)', 'Réactions allergiques cutanées'],
        precautions: ['Ne pas dépasser 4g/jour chez l\'adulte', 'Attention en cas d\'insuffisance hépatique'],
        contre_indications_relatives: ['Insuffisance hépatique sévère', 'Allergie au paracétamol'],
      },
      {
        nom: 'Paracétamol',
        classe_therapeutique: 'Antalgique - Antipyrétique',
        effets_secondaires_frequents: ['Rares aux doses thérapeutiques'],
        effets_secondaires_rares: ['Hépatotoxicité (surdosage)', 'Cytolyse hépatique'],
        precautions: ['Dose maximale 4g/jour', 'Respecter intervalle de 4h minimum entre prises'],
        contre_indications_relatives: ['Insuffisance hépatocellulaire', 'Consommation excessive d\'alcool'],
      },
      {
        nom: 'Ibuprofène',
        classe_therapeutique: 'Anti-inflammatoire non stéroïdien (AINS)',
        effets_secondaires_frequents: ['Troubles digestifs', 'Nausées', 'Douleurs abdominales'],
        effets_secondaires_rares: ['Ulcère gastrique', 'Insuffisance rénale', 'Réactions allergiques'],
        precautions: ['Prendre au cours des repas', 'Durée limitée', 'Surveiller fonction rénale'],
        contre_indications_relatives: ['Ulcère gastroduodénal', 'Insuffisance rénale', 'Grossesse 3e trimestre', 'Antécédents d\'allergie aux AINS'],
      },
      {
        nom: 'Aspirine',
        classe_therapeutique: 'Antiagrégant plaquettaire - AINS',
        effets_secondaires_frequents: ['Troubles digestifs', 'Risque hémorragique'],
        effets_secondaires_rares: ['Ulcère gastrique', 'Syndrome de Reye (enfant)', 'Réactions allergiques'],
        precautions: ['Prendre au cours des repas', 'Surveiller signes hémorragiques'],
        contre_indications_relatives: ['Ulcère gastroduodénal', 'Troubles de l\'hémostase', 'Grossesse 3e trimestre', 'Enfant < 16 ans avec fièvre'],
      },
      {
        nom: 'Amoxicilline',
        classe_therapeutique: 'Antibiotique - Pénicilline',
        effets_secondaires_frequents: ['Diarrhée', 'Nausées', 'Éruption cutanée'],
        effets_secondaires_rares: ['Choc anaphylactique', 'Syndrome de Stevens-Johnson', 'Colite pseudo-membraneuse'],
        precautions: ['Respecter la durée du traitement', 'Surveiller signes d\'allergie'],
        contre_indications_relatives: ['Allergie aux pénicillines', 'Mononucléose infectieuse'],
      },
      {
        nom: 'Metformine',
        classe_therapeutique: 'Antidiabétique - Biguanide',
        effets_secondaires_frequents: ['Troubles digestifs', 'Diarrhée', 'Nausées', 'Goût métallique'],
        effets_secondaires_rares: ['Acidose lactique', 'Carence en vitamine B12'],
        precautions: ['Surveiller fonction rénale', 'Arrêt avant examen avec produit de contraste iodé'],
        contre_indications_relatives: ['Insuffisance rénale sévère', 'Insuffisance hépatique', 'Acidose métabolique'],
      },
      {
        nom: 'Oméprazole',
        classe_therapeutique: 'Inhibiteur de la pompe à protons (IPP)',
        effets_secondaires_frequents: ['Céphalées', 'Troubles digestifs', 'Diarrhée'],
        effets_secondaires_rares: ['Hypomagnésémie', 'Fractures osseuses (long terme)', 'Infections gastro-intestinales'],
        precautions: ['Durée limitée si possible', 'Surveiller magnésémie (traitement prolongé)'],
        contre_indications_relatives: ['Hypersensibilité aux IPP', 'Association avec certains antiviraux'],
      },
      {
        nom: 'Tramadol',
        classe_therapeutique: 'Antalgique opioïde faible',
        effets_secondaires_frequents: ['Nausées', 'Vertiges', 'Somnolence', 'Constipation'],
        effets_secondaires_rares: ['Dépression respiratoire', 'Convulsions', 'Dépendance'],
        precautions: ['Risque de dépendance', 'Prudence en cas d\'insuffisance respiratoire'],
        contre_indications_relatives: ['Insuffisance respiratoire sévère', 'Épilepsie non contrôlée', 'IMAO (14 jours)', 'Enfant < 12 ans'],
      },
      {
        nom: 'Codoliprane',
        classe_therapeutique: 'Antalgique - Association paracétamol + codéine',
        effets_secondaires_frequents: ['Somnolence', 'Constipation', 'Nausées'],
        effets_secondaires_rares: ['Dépression respiratoire', 'Dépendance', 'Hépatotoxicité'],
        precautions: ['Durée limitée', 'Risque de dépendance', 'Surveiller fonction hépatique'],
        contre_indications_relatives: ['Insuffisance respiratoire', 'Asthme aigu', 'Enfant < 12 ans', 'Allaitement'],
      },
      {
        nom: 'Atorvastatine',
        classe_therapeutique: 'Hypolipémiant - Statine',
        effets_secondaires_frequents: ['Myalgies', 'Troubles digestifs', 'Céphalées'],
        effets_secondaires_rares: ['Rhabdomyolyse', 'Élévation des transaminases', 'Diabète'],
        precautions: ['Surveiller CPK et transaminases', 'Arrêt si myalgies importantes'],
        contre_indications_relatives: ['Insuffisance hépatique active', 'Grossesse', 'Allaitement'],
      },
      {
        nom: 'Levothyrox',
        classe_therapeutique: 'Hormone thyroïdienne - Lévothyroxine',
        effets_secondaires_frequents: ['Symptômes d\'hyperthyroïdie si surdosage'],
        effets_secondaires_rares: ['Palpitations', 'Tremblements', 'Insomnie', 'Perte de poids'],
        precautions: ['Adaptation posologique selon TSH', 'Prise à jeun 30min avant repas'],
        contre_indications_relatives: ['Hyperthyroïdie non traitée', 'Insuffisance surrénale non traitée'],
      },
      {
        nom: 'Lisinopril',
        classe_therapeutique: 'Antihypertenseur - Inhibiteur de l\'enzyme de conversion (IEC)',
        effets_secondaires_frequents: ['Toux sèche', 'Hypotension', 'Vertiges'],
        effets_secondaires_rares: ['Œdème de Quincke', 'Hyperkaliémie', 'Insuffisance rénale'],
        precautions: ['Surveiller fonction rénale et kaliémie', 'Arrêt si œdème de Quincke'],
        contre_indications_relatives: ['Sténose artère rénale bilatérale', 'Grossesse', 'Antécédent d\'œdème de Quincke'],
      },
      {
        nom: 'Amlodipine',
        classe_therapeutique: 'Antihypertenseur - Inhibiteur calcique',
        effets_secondaires_frequents: ['Œdèmes chevilles', 'Céphalées', 'Flush'],
        effets_secondaires_rares: ['Palpitations', 'Hypotension', 'Hypertrophie gingivale'],
        precautions: ['Surveillance TA', 'Prudence si insuffisance hépatique'],
        contre_indications_relatives: ['Choc cardiogénique', 'Hypotension sévère'],
      },
      {
        nom: 'Cetirizine',
        classe_therapeutique: 'Antihistaminique H1 - 2e génération',
        effets_secondaires_frequents: ['Somnolence légère', 'Fatigue', 'Sécheresse buccale'],
        effets_secondaires_rares: ['Prise de poids', 'Troubles du comportement'],
        precautions: ['Prudence si conduite automobile', 'Adaptation posologique si insuffisance rénale'],
        contre_indications_relatives: ['Insuffisance rénale sévère', 'Grossesse 1er trimestre'],
      },
      {
        nom: 'Ventoline',
        classe_therapeutique: 'Bronchodilatateur - Bêta-2 mimétique',
        effets_secondaires_frequents: ['Tremblements', 'Tachycardie', 'Nervosité'],
        effets_secondaires_rares: ['Hypokaliémie', 'Arythmies cardiaques'],
        precautions: ['Ne pas dépasser les doses prescrites', 'Surveiller fréquence d\'utilisation'],
        contre_indications_relatives: ['Hypersensibilité au salbutamol', 'Cardiopathie avec troubles du rythme'],
      },
    ];

    for (const med of medications) {
      const { error } = await supabase
        .from('medications')
        .upsert(med, { onConflict: 'nom', ignoreDuplicates: false });

      if (error) {
        console.error(`Error upserting medication ${med.nom}:`, error);
        result.records_affected.medications.skipped++;
      } else {
        result.records_affected.medications.created++;
      }
    }

    const drugInteractions = [
      {
        medicament_a: 'Doliprane',
        medicament_b: 'Paracétamol',
        severity: 'dangerous',
        description: 'Même principe actif - Risque de surdosage et d\'hépatotoxicité grave. Ne JAMAIS associer.',
        alternatives: ['Ibuprofène', 'Tramadol', 'Aspirine'],
      },
      {
        medicament_a: 'Paracétamol',
        medicament_b: 'Codoliprane',
        severity: 'dangerous',
        description: 'Le Codoliprane contient déjà du paracétamol - Risque de surdosage en paracétamol pouvant entraîner une hépatite fulminante.',
        alternatives: ['Tramadol seul', 'Ibuprofène'],
      },
      {
        medicament_a: 'Aspirine',
        medicament_b: 'Ibuprofène',
        severity: 'attention',
        description: 'Deux AINS - Risque hémorragique accru, ulcères gastroduodénaux. Association généralement déconseillée sauf cas particuliers.',
        alternatives: ['Paracétamol', 'Un seul AINS à dose optimale'],
      },
      {
        medicament_a: 'Tramadol',
        medicament_b: 'Codoliprane',
        severity: 'dangerous',
        description: 'Association de deux opioïdes - Risque majeur de dépression respiratoire, somnolence excessive, dépendance accrue.',
        alternatives: ['Un seul opioïde à dose adaptée', 'Paracétamol + Ibuprofène'],
      },
      {
        medicament_a: 'Metformine',
        medicament_b: 'Ibuprofène',
        severity: 'attention',
        description: 'L\'ibuprofène peut altérer la fonction rénale et augmenter le risque d\'acidose lactique chez les patients sous metformine, surtout si insuffisance rénale préexistante.',
        alternatives: ['Paracétamol'],
      },
      {
        medicament_a: 'Aspirine',
        medicament_b: 'Lisinopril',
        severity: 'attention',
        description: 'Les AINS (dont aspirine à dose anti-inflammatoire) peuvent réduire l\'efficacité des IEC et augmenter le risque d\'insuffisance rénale.',
        alternatives: ['Paracétamol si besoin antalgique'],
      },
      {
        medicament_a: 'Ibuprofène',
        medicament_b: 'Lisinopril',
        severity: 'attention',
        description: 'Les AINS peuvent diminuer l\'effet antihypertenseur des IEC et majorer le risque d\'insuffisance rénale aiguë, surtout chez personnes âgées ou déshydratées.',
        alternatives: ['Paracétamol'],
      },
      {
        medicament_a: 'Atorvastatine',
        medicament_b: 'Oméprazole',
        severity: 'safe',
        description: 'Pas d\'interaction cliniquement significative. Association fréquente et bien tolérée.',
        alternatives: [],
      },
      {
        medicament_a: 'Lisinopril',
        medicament_b: 'Amlodipine',
        severity: 'safe',
        description: 'Association synergique pour traitement de l\'hypertension. Surveiller la tension artérielle.',
        alternatives: [],
      },
      {
        medicament_a: 'Levothyrox',
        medicament_b: 'Oméprazole',
        severity: 'attention',
        description: 'Les IPP peuvent diminuer l\'absorption du Levothyrox. Espacer les prises d\'au moins 4 heures si possible.',
        alternatives: ['Prendre Levothyrox à jeun, Oméprazole au repas'],
      },
      {
        medicament_a: 'Tramadol',
        medicament_b: 'Cetirizine',
        severity: 'attention',
        description: 'Majoration de la somnolence et des effets sédatifs. Prudence en cas de conduite automobile.',
        alternatives: ['Paracétamol'],
      },
      {
        medicament_a: 'Metformine',
        medicament_b: 'Lisinopril',
        severity: 'safe',
        description: 'Pas d\'interaction majeure. Association fréquente chez les diabétiques hypertendus. Surveiller fonction rénale.',
        alternatives: [],
      },
      {
        medicament_a: 'Atorvastatine',
        medicament_b: 'Amlodipine',
        severity: 'attention',
        description: 'L\'amlodipine peut augmenter les concentrations d\'atorvastatine. Risque accru de toxicité musculaire. Surveillance clinique recommandée.',
        alternatives: ['Surveiller CPK et symptômes musculaires'],
      },
      {
        medicament_a: 'Amoxicilline',
        medicament_b: 'Metformine',
        severity: 'safe',
        description: 'Pas d\'interaction significative. Association courante et bien tolérée.',
        alternatives: [],
      },
      {
        medicament_a: 'Ventoline',
        medicament_b: 'Amlodipine',
        severity: 'safe',
        description: 'Pas d\'interaction cliniquement significative.',
        alternatives: [],
      },
      {
        medicament_a: 'Aspirine',
        medicament_b: 'Oméprazole',
        severity: 'safe',
        description: 'L\'oméprazole protège contre les effets gastrotoxiques de l\'aspirine. Association recommandée en cas d\'antécédents d\'ulcère.',
        alternatives: [],
      },
      {
        medicament_a: 'Codoliprane',
        medicament_b: 'Ibuprofène',
        severity: 'attention',
        description: 'Association possible mais nécessite surveillance. Risque d\'effets secondaires cumulés (digestifs, rénaux).',
        alternatives: ['Augmenter dose d\'un seul antalgique'],
      },
      {
        medicament_a: 'Paracétamol',
        medicament_b: 'Ibuprofène',
        severity: 'safe',
        description: 'Association synergique bien tolérée. Peut être utilisée en alternance ou simultanément pour une analgésie optimale.',
        alternatives: [],
      },
      {
        medicament_a: 'Tramadol',
        medicament_b: 'Oméprazole',
        severity: 'safe',
        description: 'Pas d\'interaction significative.',
        alternatives: [],
      },
      {
        medicament_a: 'Levothyrox',
        medicament_b: 'Metformine',
        severity: 'safe',
        description: 'Pas d\'interaction. Association fréquente chez patients diabétiques avec hypothyroïdie.',
        alternatives: [],
      },
    ];

    for (const interaction of drugInteractions) {
      const { data: existing } = await supabase
        .from('drug_interactions')
        .select('id')
        .or(
          `and(medicament_a.eq.${interaction.medicament_a},medicament_b.eq.${interaction.medicament_b}),and(medicament_a.eq.${interaction.medicament_b},medicament_b.eq.${interaction.medicament_a})`
        )
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('drug_interactions')
          .update(interaction)
          .eq('id', existing.id);

        if (error) {
          console.error(`Error updating interaction:`, error);
          result.records_affected.drug_interactions.skipped++;
        } else {
          result.records_affected.drug_interactions.updated++;
        }
      } else {
        const { error } = await supabase
          .from('drug_interactions')
          .insert(interaction);

        if (error) {
          console.error(`Error inserting interaction:`, error);
          result.records_affected.drug_interactions.skipped++;
        } else {
          result.records_affected.drug_interactions.created++;
        }
      }
    }

    await supabase.rpc('complete_sync', {
      p_sync_id: syncId,
      p_records_affected: {
        medications_created: result.records_affected.medications.created,
        medications_updated: result.records_affected.medications.updated,
        interactions_created: result.records_affected.drug_interactions.created,
        interactions_updated: result.records_affected.drug_interactions.updated,
      },
      p_status: 'completed',
    });

    result.success = true;
    result.sync_id = syncId;

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
