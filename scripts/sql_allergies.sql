-- =============================================================================
-- OrdoSur - Données de référence : Allergies
-- Table : allergies_reference
-- Généré le : 2026-04-24
-- Total : 71 entrées (40 médicamenteuses + 17 alimentaires + 14 environnementales)
-- =============================================================================

-- ============================================================
-- ALLERGIES MÉDICAMENTEUSES (40 entrées)
-- ============================================================

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Pénicillines',
  'Penicillin allergy',
  'medicamenteuse',
  ARRAY['Amoxicilline','Ampicilline','Piperacilline','Amoxicilline-clavulanate','Oxacilline'],
  'Hypersensibilité aux antibiotiques de la famille des pénicillines pouvant provoquer anaphylaxie'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Céphalosporines',
  'Cephalosporin allergy',
  'medicamenteuse',
  ARRAY['Ceftriaxone','Cefazoline','Cefuroxime','Cefixime','Cefalexine'],
  'Allergie aux bêta-lactamines de 2ème génération avec réactivité croisée possible avec pénicillines'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Carbapénèmes',
  'Carbapenem allergy',
  'medicamenteuse',
  ARRAY['Imipenem','Meropenem','Ertapenem'],
  'Allergie aux bêta-lactamines à très large spectre'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Macrolides',
  'Macrolide allergy',
  'medicamenteuse',
  ARRAY['Azithromycine','Clarithromycine','Erythromycine','Roxithromycine','Josamycine'],
  'Hypersensibilité aux antibiotiques macrolides'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Fluoroquinolones',
  'Fluoroquinolone allergy',
  'medicamenteuse',
  ARRAY['Ciprofloxacine','Lévofloxacine','Ofloxacine','Moxifloxacine','Norfloxacine'],
  'Allergie aux antibiotiques quinolones avec risque de photosensibilisation'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Sulfamides',
  'Sulfonamide allergy',
  'medicamenteuse',
  ARRAY['Cotrimoxazole','Sulfaméthoxazole','Triméthoprime'],
  'Hypersensibilité aux sulfamides avec risque de syndrome de Stevens-Johnson'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Tétracyclines',
  'Tetracycline allergy',
  'medicamenteuse',
  ARRAY['Doxycycline','Minocycline','Tétracycline'],
  'Allergie aux antibiotiques tétracyclines'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Aminoglycosides',
  'Aminoglycoside allergy',
  'medicamenteuse',
  ARRAY['Gentamicine','Amikacine','Tobramycine','Nétilmicine'],
  'Allergie aux aminoglycosides avec risque néphrotoxique et ototoxique'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Métronidazole',
  'Metronidazole allergy',
  'medicamenteuse',
  ARRAY['Métronidazole','Ornidazole','Tinidazole'],
  'Hypersensibilité aux nitroimidazolés'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à la Vancomycine',
  'Vancomycin allergy',
  'medicamenteuse',
  ARRAY['Vancomycine','Teicoplanine'],
  'Allergie aux glycopeptides avec risque de "red man syndrome"'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à l''Aspirine',
  'Aspirin allergy',
  'medicamenteuse',
  ARRAY['Acide acétylsalicylique','Aspirine'],
  'Hypersensibilité à l''aspirine avec risque d''urticaire et d''asthme'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux AINS',
  'NSAID allergy',
  'medicamenteuse',
  ARRAY['Ibuprofène','Diclofénac','Naproxène','Kétoprofène','Méloxicam','Piroxicam','Indométacine','Célécoxib'],
  'Hypersensibilité aux anti-inflammatoires non stéroïdiens'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Paracétamol',
  'Paracetamol allergy',
  'medicamenteuse',
  ARRAY['Paracétamol','Acétaminophène'],
  'Hypersensibilité rare au paracétamol avec réactions cutanées'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à la Morphine',
  'Morphine allergy',
  'medicamenteuse',
  ARRAY['Morphine','Codéine','Hydromorphone','Oxycodone'],
  'Hypersensibilité aux opioïdes naturels'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Tramadol',
  'Tramadol allergy',
  'medicamenteuse',
  ARRAY['Tramadol'],
  'Hypersensibilité au tramadol avec risque de convulsions'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Benzodiazépines',
  'Benzodiazepine allergy',
  'medicamenteuse',
  ARRAY['Diazépam','Alprazolam','Lorazépam','Clonazépam','Bromazépam'],
  'Hypersensibilité aux benzodiazépines'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Barbituriques',
  'Barbiturate allergy',
  'medicamenteuse',
  ARRAY['Phénobarbital','Thiopental'],
  'Hypersensibilité aux barbituriques'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à la Phénytoïne',
  'Phenytoin allergy',
  'medicamenteuse',
  ARRAY['Phénytoïne','Fosphénytoïne'],
  'Réaction d''hypersensibilité à la phénytoïne avec risque de DRESS syndrome'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à la Carbamazépine',
  'Carbamazepine allergy',
  'medicamenteuse',
  ARRAY['Carbamazépine','Oxcarbazépine'],
  'Hypersensibilité à la carbamazépine, fréquente en porteurs HLA-B*15:02'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Valproate',
  'Valproate allergy',
  'medicamenteuse',
  ARRAY['Valproate de sodium','Acide valproïque','Valpromide'],
  'Hypersensibilité au valproate avec risque hépatique'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Lithium',
  'Lithium allergy',
  'medicamenteuse',
  ARRAY['Lithium'],
  'Intolérance au lithium (souvent toxicité plutôt qu''allergie vraie)'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux IEC',
  'ACE inhibitor allergy',
  'medicamenteuse',
  ARRAY['Captopril','Enalapril','Ramipril','Périndopril','Lisinopril','Fosinopril'],
  'Allergie aux inhibiteurs de l''enzyme de conversion avec risque d''angio-œdème'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Sartans',
  'ARB allergy',
  'medicamenteuse',
  ARRAY['Valsartan','Losartan','Irbesartan','Candésartan','Olmésartan','Telmisartan'],
  'Hypersensibilité aux antagonistes des récepteurs à l''angiotensine II'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Bêtabloquants',
  'Beta-blocker allergy',
  'medicamenteuse',
  ARRAY['Aténolol','Bisoprolol','Métoprolol','Propranolol','Carvédilol','Nébivolol'],
  'Allergie aux bêtabloquants avec risque de bronchospasme'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Inhibiteurs calciques',
  'Calcium channel blocker allergy',
  'medicamenteuse',
  ARRAY['Amlodipine','Nifédipine','Diltiazem','Vérapamil','Lercanidipine'],
  'Hypersensibilité aux inhibiteurs calciques'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Statines',
  'Statin allergy',
  'medicamenteuse',
  ARRAY['Simvastatine','Atorvastatine','Rosuvastatine','Pravastatine','Fluvastatine'],
  'Intolérance aux statines avec myopathie ou hépatotoxicité'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à la Metformine',
  'Metformin allergy',
  'medicamenteuse',
  ARRAY['Metformine'],
  'Hypersensibilité rare à la metformine'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à l''Insuline',
  'Insulin allergy',
  'medicamenteuse',
  ARRAY['Insuline humaine','Insuline glargine','Insuline dégludec','Insuline asparte','Insuline lispro'],
  'Allergie aux préparations insuliniques'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Corticoïdes',
  'Corticosteroid allergy',
  'medicamenteuse',
  ARRAY['Prednisone','Prednisolone','Méthylprednisolone','Dexaméthasone','Bétaméthasone','Hydrocortisone'],
  'Hypersensibilité aux corticoïdes systémiques ou topiques'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux produits de contraste iodés',
  'Iodinated contrast media allergy',
  'medicamenteuse',
  ARRAY['Produit de contraste iodé','Iobitridol','Iopromide'],
  'Réaction d''hypersensibilité aux produits de contraste iodés utilisés en imagerie'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à l''Héparine',
  'Heparin allergy',
  'medicamenteuse',
  ARRAY['Héparine','Énoxaparine','Nadroparine','Tinzaparine'],
  'Thrombopénie induite par l''héparine (TIH) ou allergie vraie'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à la Warfarine',
  'Warfarin allergy',
  'medicamenteuse',
  ARRAY['Warfarine','Acénocoumarol','Fluindione'],
  'Hypersensibilité aux anticoagulants oraux AVK'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Anesthésiques locaux',
  'Local anesthetic allergy',
  'medicamenteuse',
  ARRAY['Lidocaïne','Bupivacaïne','Ropivacaïne','Mépivacaïne','Articaïne'],
  'Allergie aux anesthésiques locaux de type amide ou ester'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Curares',
  'Neuromuscular blocking agent allergy',
  'medicamenteuse',
  ARRAY['Suxaméthonium','Rocuronium','Vécuronium','Atracurium','Cisatracurium'],
  'Allergie aux agents bloqueurs neuromusculaires'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Latex',
  'Latex allergy',
  'medicamenteuse',
  ARRAY['Latex naturel'],
  'Hypersensibilité aux protéines du caoutchouc naturel (Hevea brasiliensis)'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Vaccins',
  'Vaccine allergy',
  'medicamenteuse',
  ARRAY['Vaccins en général'],
  'Allergie aux composants vaccinaux (adjuvants, gélatine, œuf, latex)'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à la Rifampicine',
  'Rifampicin allergy',
  'medicamenteuse',
  ARRAY['Rifampicine','Rifabutine'],
  'Hypersensibilité à la rifampicine'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à l''Isoniazide',
  'Isoniazid allergy',
  'medicamenteuse',
  ARRAY['Isoniazide'],
  'Hypersensibilité à l''isoniazide avec risque hépatique'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Antifongiques azolés',
  'Azole antifungal allergy',
  'medicamenteuse',
  ARRAY['Fluconazole','Itraconazole','Voriconazole','Kétoconazole'],
  'Allergie aux antifongiques de la famille des azoles'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Propofol',
  'Propofol allergy',
  'medicamenteuse',
  ARRAY['Propofol'],
  'Hypersensibilité au propofol, contre-indiqué si allergie à l''œuf ou au soja'
)
ON CONFLICT (nom_fr) DO NOTHING;

-- ============================================================
-- ALLERGIES ALIMENTAIRES (17 entrées)
-- ============================================================

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Arachides',
  'Peanut allergy',
  'alimentaire',
  ARRAY['Arachide'],
  'Allergie IgE-médiée aux protéines d''arachide, souvent sévère avec risque anaphylactique'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Noix',
  'Tree nut allergy',
  'alimentaire',
  ARRAY['Amande','Noix','Noisette','Noix de cajou','Pistache','Noix de macadamia','Noix de pécan'],
  'Allergie aux fruits à coque souvent associée à l''allergie aux arachides'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Lait de vache',
  'Cow milk allergy',
  'alimentaire',
  ARRAY['Caséine','Lactalbumine','Lactoglobuline'],
  'Allergie aux protéines du lait de vache différente de l''intolérance au lactose'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Œufs',
  'Egg allergy',
  'alimentaire',
  ARRAY['Ovalbumine','Ovomucoïde'],
  'Allergie aux protéines du blanc ou du jaune d''œuf'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Blé/Gluten',
  'Wheat/Gluten allergy',
  'alimentaire',
  ARRAY['Gluten','Gliadine','Gluténine'],
  'Hypersensibilité au blé distincte de la maladie cœliaque'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Soja',
  'Soy allergy',
  'alimentaire',
  ARRAY['Soja'],
  'Allergie aux protéines de soja fréquente chez l''enfant'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Poissons',
  'Fish allergy',
  'alimentaire',
  ARRAY['Parvalbumine','Poissons en général'],
  'Allergie aux protéines de poissons (parvalbumine), souvent persistante'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Crustacés',
  'Crustacean allergy',
  'alimentaire',
  ARRAY['Crevette','Homard','Crabe','Langoustine'],
  'Allergie à la tropomyosine des crustacés'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Mollusques',
  'Mollusk allergy',
  'alimentaire',
  ARRAY['Huître','Moule','Calmar','Seiche','Pieuvre'],
  'Allergie aux mollusques bivalves et céphalopodes'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Sésame',
  'Sesame allergy',
  'alimentaire',
  ARRAY['Sésame','Tahini'],
  'Allergie aux graines de sésame en augmentation'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à la Moutarde',
  'Mustard allergy',
  'alimentaire',
  ARRAY['Moutarde'],
  'Allergie aux protéines de moutarde'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Céleri',
  'Celery allergy',
  'alimentaire',
  ARRAY['Céleri'],
  'Allergie au céleri souvent associée à l''allergie au bouleau'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux Sulfites',
  'Sulfite allergy',
  'alimentaire',
  ARRAY['Dioxyde de soufre','Métabisulfite'],
  'Hypersensibilité aux sulfites utilisés comme conservateurs'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Lupin',
  'Lupin allergy',
  'alimentaire',
  ARRAY['Lupin'],
  'Allergie aux graines de lupin avec réactivité croisée avec arachides'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au Kiwi',
  'Kiwi allergy',
  'alimentaire',
  ARRAY['Kiwi'],
  'Allergie au kiwi avec syndrome latex-fruits possible'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à la Banane',
  'Banana allergy',
  'alimentaire',
  ARRAY['Banane'],
  'Allergie à la banane souvent associée au syndrome latex-fruits'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie à l''Avocat',
  'Avocado allergy',
  'alimentaire',
  ARRAY['Avocat'],
  'Allergie à l''avocat dans le contexte du syndrome latex-fruits'
)
ON CONFLICT (nom_fr) DO NOTHING;

-- ============================================================
-- ALLERGIES ENVIRONNEMENTALES (14 entrées)
-- ============================================================

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au pollen de bouleau',
  'Birch pollen allergy',
  'environnementale',
  ARRAY['Bet v 1'],
  'Pollinose printanière avec rhinite et conjonctivite, syndrome oral possible'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au pollen d''olivier',
  'Olive tree pollen allergy',
  'environnementale',
  ARRAY['Ole e 1'],
  'Pollinose méditerranéenne printanière très répandue au Maghreb'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au pollen de cyprès',
  'Cypress pollen allergy',
  'environnementale',
  ARRAY['Cup a 1'],
  'Pollinose hivernale/printanière par pollen de cyprès'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au pollen de graminées',
  'Grass pollen allergy',
  'environnementale',
  ARRAY['Phl p 1','Phl p 5'],
  'Pollinose estivale la plus fréquente avec rhinite et asthme saisonnier'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au pollen d''ambroisie',
  'Ragweed pollen allergy',
  'environnementale',
  ARRAY['Amb a 1'],
  'Pollinose automnale avec rhinite et asthme en expansion'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au pollen d''armoise',
  'Mugwort pollen allergy',
  'environnementale',
  ARRAY['Art v 1'],
  'Pollinose automnale avec syndrome céleri-carotte-épices possible'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux acariens',
  'Dust mite allergy',
  'environnementale',
  ARRAY['Der p 1','Der p 2','Der f 1'],
  'Allergie pérenne aux acariens de la poussière de maison'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux blattes',
  'Cockroach allergy',
  'environnementale',
  ARRAY['Bla g 1','Bla g 2'],
  'Allergie pérenne aux allergènes de blattes fréquente en milieu urbain'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux poils de chat',
  'Cat allergy',
  'environnementale',
  ARRAY['Fel d 1'],
  'Allergie pérenne aux protéines salivaires et cutanées du chat'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux poils de chien',
  'Dog allergy',
  'environnementale',
  ARRAY['Can f 1','Can f 2'],
  'Allergie pérenne aux allergènes de chien'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux moisissures Alternaria',
  'Alternaria allergy',
  'environnementale',
  ARRAY['Alt a 1'],
  'Allergie aux spores de moisissures d''extérieur'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie aux moisissures Aspergillus',
  'Aspergillus allergy',
  'environnementale',
  ARRAY['Asp f 1'],
  'Allergie aux spores d''Aspergillus, facteur de risque d''ABPA'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au venin d''abeille',
  'Bee venom allergy',
  'environnementale',
  ARRAY['Api m 1','Phospholipase A2'],
  'Allergie IgE-médiée au venin d''abeille avec risque d''anaphylaxie sévère'
)
ON CONFLICT (nom_fr) DO NOTHING;

INSERT INTO allergies_reference (nom_fr, nom_en, type, molecules_concernees, description_fr)
VALUES (
  'Allergie au venin de guêpe',
  'Wasp venom allergy',
  'environnementale',
  ARRAY['Ves v 5','Phospholipase A1'],
  'Allergie IgE-médiée au venin de guêpe avec risque d''anaphylaxie'
)
ON CONFLICT (nom_fr) DO NOTHING;

-- =============================================================================
-- Fin du fichier : 71 entrées au total
-- 40 médicamenteuses + 17 alimentaires + 14 environnementales
-- =============================================================================
