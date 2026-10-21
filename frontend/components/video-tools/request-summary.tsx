// Resumo do pedido antes de confirmar (spec 001, T009; usado pelas ferramentas 002 a 005).
// Lista chave/valor; o formato de saída e as operações restantes aparecem no diálogo da ferramenta.
export interface SummaryItem {
  label: string;
  value: string;
}

export function RequestSummary({ items }: { items: SummaryItem[] }) {
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-sm font-medium">Resumo</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {items.map((item) => (
          <div key={item.label} className="contents">
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
