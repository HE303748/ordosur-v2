/**
 * Bloc de clôture commun à l'aperçu de l'ordonnance et des certificats :
 * zone « Signature et cachet du médecin ». Pendant HTML de drawSignatureBlock
 * (src/lib/pdfService.ts). La date n'y figure pas : elle est imprimée une seule
 * fois, dans l'en-tête du document.
 */
export function DocumentSignatureBlock() {
  return (
    <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
      <div className="w-64">
        <p className="text-xs text-gray-400 mb-1">Signature et cachet du médecin</p>
        <div className="border-b border-gray-300 h-12" />
      </div>
    </div>
  );
}
