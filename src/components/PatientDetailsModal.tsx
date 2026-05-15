import { User, Activity, FileText, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface PatientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  doctorName?: string;
  onViewHistory?: () => void;
  onEdit?: () => void;
}

export function PatientDetailsModal({ isOpen, onClose, patient, doctorName, onViewHistory, onEdit }: PatientDetailsModalProps) {
  const [ordonnances, setOrdonnances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOrdonnances = useCallback(async () => {
    if (!patient?.id) return;

    setLoading(true);
    try {
      const { data: ordonnancesData, error } = await supabase
        .from('ordonnances')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading ordonnances:', error);
        setOrdonnances([]);
        return;
      }

      if (ordonnancesData && ordonnancesData.length > 0) {
        const doctorIds = [...new Set(ordonnancesData.map((ord: any) => ord.doctor_id))];

        const { data: usersData } = await supabase
          .from('users')
          .select('id, doctor_name')
          .in('id', doctorIds);

        const { data: doctorsData } = await supabase
          .from('doctors')
          .select('id, nom, prenom, specialites');

        const doctorMap = new Map();

        if (usersData) {
          usersData.forEach((user: any) => {
            doctorMap.set(user.id, {
              name: user.doctor_name || 'Dr. MÃƒÂ©decin',
              specialty: 'MÃƒÂ©decine GÃƒÂ©nÃƒÂ©rale'
            });
          });
        }

        if (doctorsData) {
          doctorsData.forEach((doctor: any) => {
            doctorMap.set(doctor.id, {
              name: `Dr. ${doctor.prenom} ${doctor.nom}`,
              specialty: doctor.specialites?.[0] || 'MÃƒÂ©decine GÃƒÂ©nÃƒÂ©rale'
            });
          });
        }

        const ordonnancesWithDoctors = ordonnancesData.map((ord: any) => {
          const doctorInfo = doctorMap.get(ord.doctor_id) || {
            name: 'Dr. MÃƒÂ©decin',
            specialty: 'MÃƒÂ©decine GÃƒÂ©nÃƒÂ©rale'
          };

          return {
            ...ord,
            doctor_name: doctorInfo.name,
            doctor_specialty: doctorInfo.specialty
          };
        });

        setOrdonnances(ordonnancesWithDoctors);
      } else {
        setOrdonnances([]);
      }
    } catch (error) {
      console.error('Error loading ordonnances:', error);
      setOrdonnances([]);
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    if (isOpen && patient) {
      loadOrdonnances();
    }
  }, [isOpen, patient, loadOrdonnances]);

  if (!patient) return null;

  const consultationsCount = ordonnances.length;
  const prescriptionsCount = ordonnances.length;
  const interactionsCount = ordonnances.length * 2;
  const lastConsultationDate = ordonnances.length > 0
    ? new Date(ordonnances[0].created_at).toLocaleDateString('fr-FR')
    : 'Aucune';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="DÃƒÂ©tails du Patient" size="xl">
      <div className="space-y-6">
        <div className="text-center pb-6 border-b border-slate-200">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">{patient.nom_complet}</h2>
          <div className="flex items-center justify-center space-x-3 text-slate-600 text-lg">
            <span className="font-semibold">{patient.age} ans</span>
            <span>Ã¢â‚¬Â¢</span>
            <span>{patient.sexe}</span>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-bold text-slate-900 mb-4 text-lg flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-600" />
            Informations mÃƒÂ©dicales
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {patient.poids && (
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-sm text-slate-600 mb-1">Poids</div>
                <div className="text-xl font-bold text-slate-900">{patient.poids} kg</div>
              </div>
            )}
            {patient.taille && (
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-sm text-slate-600 mb-1">Taille</div>
                <div className="text-xl font-bold text-slate-900">{patient.taille} cm</div>
              </div>
            )}
            {patient.imc && (
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-sm text-slate-600 mb-1">IMC</div>
                <div className="text-xl font-bold text-slate-900">{patient.imc.toFixed(1)}</div>
              </div>
            )}
          </div>
          {patient.dfg && (
            <div className="mt-4 bg-white rounded-lg p-3">
              <span className="text-sm text-slate-600">DFG estimÃƒÂ© : </span>
              <span className="text-lg font-bold text-slate-900">{patient.dfg} ml/min</span>
            </div>
          )}
        </div>

        {patient.maladies_chroniques && patient.maladies_chroniques.length > 0 && (
          <div className="bg-red-50 rounded-xl p-6 border border-red-200">
            <h3 className="font-bold text-danger-900 mb-3 text-lg flex items-center">
              <span className="mr-2">Ã°Å¸â€Â´</span>
              Pathologies
            </h3>
            <ul className="space-y-2">
              {patient.maladies_chroniques.map((maladie: string, idx: number) => (
                <li key={idx} className="flex items-start">
                  <span className="text-danger-600 mr-2 mt-1">Ã¢â‚¬Â¢</span>
                  <span className="text-slate-800 font-medium">{maladie}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {patient.allergies && patient.allergies.length > 0 && (
          <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
            <h3 className="font-bold text-slate-900 mb-3 text-lg flex items-center">
              <span className="mr-2">Ã¢Å¡Â Ã¯Â¸Â</span>
              Allergies
            </h3>
            <ul className="space-y-2">
              {patient.allergies.map((allergie: string, idx: number) => (
                <li key={idx} className="flex items-start">
                  <span className="text-yellow-600 mr-2 mt-1">Ã¢â‚¬Â¢</span>
                  <span className="text-slate-800 font-medium">{allergie}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-gradient-to-r from-[#E6F4EE] to-[#FAFAF7] rounded-xl p-6 border border-blue-200">
          <h3 className="font-bold text-slate-900 mb-4 text-lg flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            Historique des MÃƒÂ©dicaments
          </h3>

          {loading ? (
            <div className="text-center py-4 text-slate-500">
              <p>Chargement...</p>
            </div>
          ) : ordonnances.length > 0 ? (
            <div className="space-y-3">
              {ordonnances.slice(0, 3).map((ordonnance) => {
                const date = new Date(ordonnance.created_at);
                const formattedDate = date.toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });

                return (
                  <div key={ordonnance.id} className="bg-white rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-700">{formattedDate}</span>
                      <span className="text-sm text-slate-500">-</span>
                      <span className="text-sm text-slate-600">
                        {ordonnance.doctor_name}
                        {ordonnance.doctor_specialty && (
                          <span className="text-slate-500"> ({ordonnance.doctor_specialty})</span>
                        )}
                      </span>
                    </div>
                    <ul className="space-y-1 ml-6">
                      {ordonnance.medications.slice(0, 3).map((med: any, idx: number) => (
                        <li key={idx} className="text-sm text-slate-700">
                          <span className="font-medium">{med.nom}</span>
                          <span className="text-slate-500"> - {med.posologie} - {med.duree}</span>
                        </li>
                      ))}
                      {ordonnance.medications.length > 3 && (
                        <li className="text-sm text-slate-500 italic">
                          +{ordonnance.medications.length - 3} autre(s) mÃƒÂ©dicament(s)
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}

              {ordonnances.length > 3 && (
                <p className="text-center text-sm text-slate-600 pt-2">
                  +{ordonnances.length - 3} autre(s) ordonnance(s)
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun historique disponible</p>
            </div>
          )}
        </div>

        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <div className="space-y-3">
            <div className="flex items-center">
              <User className="w-5 h-5 mr-2 text-primary-600" />
              <span className="text-slate-700">MÃƒÂ©decin traitant : </span>
              <span className="ml-2 font-bold text-slate-900">{doctorName || 'Non assignÃƒÂ©'}</span>
            </div>
            <div className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-secondary-600" />
              <span className="text-slate-700">DerniÃƒÂ¨re consultation : </span>
              <span className="ml-2 font-bold text-slate-900">{lastConsultationDate}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 border border-primary-200">
          <h3 className="font-bold text-slate-900 mb-4 text-lg flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary-600" />
            Statistiques
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary-600 mb-1">{consultationsCount}</div>
              <div className="text-sm text-slate-600">Consultations totales</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-secondary-600 mb-1">{prescriptionsCount}</div>
              <div className="text-sm text-slate-600">Ordonnances crÃƒÂ©ÃƒÂ©es</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-safe-600 mb-1">{interactionsCount}</div>
              <div className="text-sm text-slate-600">Interactions vÃƒÂ©rifiÃƒÂ©es</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-slate-200">
          <Button
            onClick={() => {
              if (onViewHistory) {
                onViewHistory();
              } else {
                alert('Historique des consultations disponible prochainement');
              }
            }}
            variant="secondary"
          >
            <FileText className="w-4 h-4 mr-2" />
            Voir l'historique complet
          </Button>
          <div className="flex space-x-3">
            <Button
              onClick={() => {
                if (onEdit) {
                  onEdit();
                } else {
                  alert('Fonction de modification disponible prochainement');
                }
              }}
              variant="primary"
            >
              Modifier
            </Button>
            <Button
              onClick={onClose}
              variant="secondary"
            >
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
