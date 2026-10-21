"use client";

// Nome do resultado com verificação de conflitos (spec 002, T009 e T015; REQ-VID-TRIM-007).
// Partilhado por todas as ferramentas no diálogo de video-tool-menu.tsx. Se o nome já existir,
// o pedido só pode ser confirmado depois de aceitar a sugestão ou de mudar o nome.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Access, fetchNameAvailable } from "@/lib/videos";

interface Props {
  access: Access;
  value: string;
  placeholder?: string;
  onChange: (name: string) => void;
  // false enquanto o nome está a ser verificado ou já existe
  onReadyChange: (ready: boolean) => void;
}

const DEBOUNCE_MS = 300;

export function OutputNameField({ access, value, placeholder, onChange, onReadyChange }: Props) {
  const name = value.trim();
  const [debounced, setDebounced] = useState(name);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(name), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [name]);

  const check = useQuery({
    queryKey: ["video-name-available", access.pid, debounced],
    queryFn: () => fetchNameAvailable({ ...access, name: debounced }),
    enabled: !!debounced && !!access.token,
    staleTime: 5e3,
  });

  const pending = !!name && (debounced !== name || check.isFetching);
  const taken = !pending && check.data?.available === false ? check.data.suggestion : null;
  // Sem resposta (erro de rede) não se bloqueia: o servidor resolve o conflito na conclusão (research T5)
  const ready = !name || (!pending && !taken);
  useEffect(() => onReadyChange(ready), [ready, onReadyChange]);

  return (
    <div className="grid gap-1">
      <Label htmlFor="video-output-name">Nome do resultado</Label>
      <div className="relative">
        <Input
          id="video-output-name"
          placeholder={placeholder}
          value={value}
          maxLength={200}
          aria-invalid={!!taken}
          aria-describedby={taken ? "video-output-name-taken" : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {pending && <LoaderCircle className="absolute right-2 top-2.5 size-4 animate-spin text-muted-foreground" />}
      </div>
      {taken && (
        <div id="video-output-name-taken" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-destructive">Já existe. Usar «{taken}»?</span>
          <Button type="button" size="sm" variant="outline" onClick={() => onChange(taken)}>
            Usar este nome
          </Button>
        </div>
      )}
    </div>
  );
}
