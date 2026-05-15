-- icd10_batch_048.sql (19 rows)
INSERT INTO pathologies (nom_fr, nom_en, categorie, icd10_code)
VALUES
('Encounter for antenatal screening for fetal macrosomia','Encounter for antenatal screening for fetal macrosomia','Facteurs influant sur l''état de santé','Z36.88'),
('Encounter for autre specified antenatal screening','Encounter for other specified antenatal screening','Facteurs influant sur l''état de santé','Z36.89'),
('Encounter for antenatal screening for autre genetic defects','Encounter for antenatal screening for other genetic defects','Facteurs influant sur l''état de santé','Z36.8A'),
('Encounter for antenatal screening, non spécifié','Encounter for antenatal screening, unspecified','Facteurs influant sur l''état de santé','Z36.9'),
('Weeks of gestation of pregnancy not specified','Weeks of gestation of pregnancy not specified','Facteurs influant sur l''état de santé','Z3A.00'),
('Contact with and (suspected) exposure to autre hazardous metals','Contact with and (suspected) exposure to other hazardous metals','Facteurs influant sur l''état de santé','Z77.018'),
('Contact with and (suspected) exposure to aromatic amines','Contact with and (suspected) exposure to aromatic amines','Facteurs influant sur l''état de santé','Z77.020'),
('Contact with and (suspected) exposure to benzene','Contact with and (suspected) exposure to benzene','Facteurs influant sur l''état de santé','Z77.021'),
('Contact with and (suspected) exposure to autre hazardous aromatic compounds','Contact with and (suspected) exposure to other hazardous aromatic compounds','Facteurs influant sur l''état de santé','Z77.028'),
('Contact with and (suspected) exposure to asbestos','Contact with and (suspected) exposure to asbestos','Facteurs influant sur l''état de santé','Z77.090'),
('Contact with and (suspected) exposure to autre hazardous, chiefly nonmedicinal, chemicals','Contact with and (suspected) exposure to other hazardous, chiefly nonmedicinal, chemicals','Facteurs influant sur l''état de santé','Z77.098'),
('Contact with and (suspected) exposure to air pollution','Contact with and (suspected) exposure to air pollution','Facteurs influant sur l''état de santé','Z77.110'),
('Finger-joint replacement of left hand','Finger-joint replacement of left hand','Facteurs influant sur l''état de santé','Z96.692'),
('Finger-joint replacement, bilateral','Finger-joint replacement, bilateral','Facteurs influant sur l''état de santé','Z96.693'),
('Presence of autre orthopedic joint implants','Presence of other orthopedic joint implants','Facteurs influant sur l''état de santé','Z96.698'),
('Presence of autre bone and tendon implants','Presence of other bone and tendon implants','Facteurs influant sur l''état de santé','Z96.7'),
('Presence of artificial skin','Presence of artificial skin','Facteurs influant sur l''état de santé','Z96.81'),
('Presence of neurostimulator','Presence of neurostimulator','Facteurs influant sur l''état de santé','Z96.82'),
('Presence of autre specified functional implants','Presence of other specified functional implants','Facteurs influant sur l''état de santé','Z96.89')
ON CONFLICT (nom_fr) DO NOTHING;
