/**
 * Bloc de clôture commun à l'aperçu de l'ordonnance et des certificats :
 * date + zone « Signature et cachet du médecin ». Pendant HTML de
 * drawSignatureBlock (src/lib/pdfService.ts). Aucune ville en dur.
 */
export function DocumentSignatureBlock({ date }: { date: string }) {
  return (
    <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
      <div className="w-64">
        <p className="text-sm text-gray-600 text-right mb-2">Le {date}</p>
        <p className="text-xs text-gray-400 mb-1">Signature et cachet du médecin</p>
        <div className="border-b border-gray-300 h-12" />
      </div>
    </div>
  );
}
