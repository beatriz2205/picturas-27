"""Gera o Typst dos Cap. 5 (ERS) e 7 (Rastreabilidade) a partir de `use cases + requisitos.md` e
`rastreabilidade.md`, com as correções da revisão de 2026-10-22:

- catálogo ordenado por ID, com SPD no lugar certo; SUBMIT-012 refinado e SUBMIT-014 novo;
- SPD-006 com o alvo "por minuto da maior das duas durações" (a 2× o custo vem da origem);
- origens UC-VID-006 nos requisitos COM; "estorno" -> "devolução"; "thumbnail" -> "miniatura";
- 5.3 com o UC-VID-006; 5.4 com SUBMIT-012/014 e SPD-006;
- 7.1 com as linhas do UC-VID-006, COM-057 nos passos de resultado e sem requisitos órfãos;
- 7.3 preenchida a partir dos testes do Cap. 10.

Uso: python3 gerar_cap5_cap7.py  ->  cap5-ers.typ e cap7-rastreabilidade.typ
"""
import re
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parents[2]
MD = (ROOT / "use cases + requisitos.md").read_text(encoding="utf-8")
RT = (ROOT / "rastreabilidade.md").read_text(encoding="utf-8")
PREFIX_ORDER = ["COM", "CONV", "DET", "FLT", "SPD", "SUBMIT", "TRIM"]


# ---------------------------------------------------------------- leitura das tabelas Markdown
def section(text, start, end=None):
    i = text.index(start)
    j = text.index(end, i + len(start)) if end else len(text)
    return text[i:j]


def rows(block):
    out = []
    for line in block.splitlines():
        if not line.startswith("|") or line.startswith("|---") or line.startswith("| **"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split(" | ")]
        if cells and cells[0] in ("Elemento de origem", "ID", "Regra"):
            continue
        out.append(cells)
    return out


# ---------------------------------------------------------------- correções de texto
WORDS = [
    ("estorná-la", "devolvê-la"), ("estornada", "devolvida"), ("estornando", "devolvendo"), ("estornar", "devolver"),
    ("com estorno", "com devolução"), ("estorno", "devolução"), ("estorna", "devolve"),
    ("o ícone genérico", "a imagem genérica"), ("ícone genérico", "imagem genérica"),
]


def fix(s):
    for a, b in WORDS:
        s = s.replace(a, b)
    return s


def typ(s):
    """Markdown de uma célula -> conteúdo Typst."""
    parts = s.split("`")
    for k in range(0, len(parts), 2):  # fora do código
        t = fix(parts[k])
        t = re.sub(r"(?<![\w\\])_([^_\n]+?)_(?!\w)", "\x01\\1\x01", t)  # _itálico_ escrito à mão
        for ch in "\\#$@<_~":
            t = t.replace(ch, "\\" + ch)
        t = re.sub(r"\*\*(.+?)\*\*", "\x00\\1\x00", t)
        t = re.sub(r"\*(.+?)\*", r"_\1_", t)
        parts[k] = t.replace("\x00", "*").replace("\x01", "_")
    return "`".join(parts)


def cell(s):
    return "[" + typ(s) + "]"


def key(req_id):
    m = re.match(r"`?REQ-VID-([A-Z]+)-(\d+)`?", req_id)
    return (PREFIX_ORDER.index(m.group(1)), int(m.group(2)))


def add_origin(origin, extra):
    """Acrescenta UC-VID-006/... depois do último elemento UC-VID-00x da origem."""
    items = origin.split("; ")
    last = max((i for i, it in enumerate(items) if it.startswith("UC-VID-")), default=len(items) - 1)
    items.insert(last + 1, "UC-VID-006/" + extra)
    return "; ".join(items)


# ---------------------------------------------------------------- 5.1 requisitos funcionais
fr = {r[0]: r for r in rows(section(MD, "### 5.1 Requisitos funcionais", "### 5.2"))}
FR_006 = {
    "COM-001": "E1", "COM-002": "P1", "COM-003": "RN1, E3", "COM-004": "RN1, E3", "COM-005": "RN1, E3",
    "COM-006": "RN1, E3", "COM-007": "E2–E6", "COM-008": "P3, RN1", "COM-009": "E6", "COM-011": "P3",
    "COM-012": "P3–P6", "COM-013": "P4", "COM-014": "P4, FA3", "COM-015": "P6, FA3", "COM-016": "FA2",
    "COM-017": "E8", "COM-018": "RN7, E5", "COM-019": "P3", "COM-020": "E7", "COM-021": "RN7, E4",
    "COM-022": "RN7, FA2", "COM-023": "P1", "COM-024": "E3, E4", "COM-026": "P6, RN8", "COM-027": "P5, RN3, E7",
    "COM-028": "RN5", "COM-029": "FA2, E7", "COM-030": "P7", "COM-031": "FA3", "COM-034": "E8", "COM-057": "P6",
}
for rid, extra in FR_006.items():
    r = fr[f"`REQ-VID-{rid}`"]
    r[4] = add_origin(r[4], extra)
fr["`REQ-VID-SUBMIT-010`"][4] = "UC-VID-001/RN4, RN8; RNG-04"
fr["`REQ-VID-SUBMIT-012`"] = [
    "`REQ-VID-SUBMIT-012`",
    "O sistema deve gerar, para cada vídeo aceite na submissão, uma thumbnail JPEG com 320 px de largura e altura proporcional à do vídeo.",
    "Should", "NOVO", "UC-VID-001/P5–P6, RN8, A4, A6, Q4",
    "Permite identificar visualmente o vídeo no projeto sem o reproduzir.",
    "Dado um vídeo válido de 1920 × 1080 px e outro de 1080 × 1920 px, quando a submissão é confirmada, então cada um tem uma thumbnail JPEG com 320 px de largura e altura igual a 320 × altura ÷ largura do vídeo (±2 px).",
]
fr["`REQ-VID-SUBMIT-014`"] = [
    "`REQ-VID-SUBMIT-014`",
    "O sistema deve extrair a thumbnail do fotograma no instante t = min(0,1 × duração do vídeo; 1 s), contado a partir do início do vídeo.",
    "Should", "NOVO", "UC-VID-001/RN8",
    "Evita os fotogramas negros do início sem depender da duração do vídeo.",
    "Dados vídeos de 5 s e de 30 s, quando são submetidos, então as thumbnails correspondem aos fotogramas de 0,5 s e de 1 s.",
]

# ---------------------------------------------------------------- 5.2 requisitos não funcionais
nfr = {r[0]: r for r in rows(section(MD, "### 5.2 Requisitos não funcionais", "### 5.3"))}
NFR_006 = {"COM-036": "P3", "COM-040": "E7", "COM-044": "P7", "COM-045": "RN8", "COM-052": "P4"}
for rid, extra in NFR_006.items():
    r = nfr[f"`REQ-VID-{rid}`"]
    r[5] = add_origin(r[5], extra)
for rid in ("COM-039", "COM-048"):
    r = nfr[f"`REQ-VID-{rid}`"]
    r[5] = r[5].replace("UC-VID-005", "UC-VID-006").replace("002 a 005", "002 a 006")
nfr["`REQ-VID-SPD-006`"] = [
    "`REQ-VID-SPD-006`",
    "O sistema deve concluir a alteração de velocidade de um vídeo em 1080p em ≤ 2 min por minuto da maior das duas durações (origem ou resultado), medidos entre a passagem da tarefa a `processing` e a passagem a `completed`.",
    "Eficiência de Desempenho (comportamento temporal)",
    "MVP: 95% em ≤ 2 min por minuto da maior das duas durações no ambiente de referência (1 vCPU); produção: ≤ 1 min.",
    "Should", "UC-VID-006/A3; UC-VID-004/A7",
    "Executar ≥ 10 pedidos a 0,5× e 10 a 2× de `ok_1080p_60s.mp4` e verificar a percentagem dentro do prazo (≤ 2 min a 2×; ≤ 4 min a 0,5×).",
]

all_ids = {k.strip("`").replace("REQ-VID-", "") for k in list(fr) + list(nfr)}

# ---------------------------------------------------------------- 5.3 completude
comp = rows(section(MD, "### 5.3 Verificação", "### 5.4"))
comp_out = []
for r in comp:
    r[1] = r[1].replace("UC-VID-002 a 005", "UC-VID-002 a 006").replace("UC-VID-002 a 004", "UC-VID-002 a 004, 006")
    r[4] = r[4].replace("SUBMIT-012, SUBMIT-013", "SUBMIT-012 a 014")
    comp_out.append(r)
    if r[1] == "UC-VID-005" and r[0] == "":
        if r[4].startswith("COM-008, DET-005"):
            comp_out.append(["", "UC-VID-006", "Sim", "Revalidados no pedido; resolução e cadência da origem; o resultado pode exceder a duração máxima do perfil, por ser gerado (UC-VID-006/RN6).", "COM-008, SPD-002, SPD-003"])

# ---------------------------------------------------------------- 5.4 refinamento
ref = rows(section(MD, "### 5.5 Refinamento", "#### 5.5.1"))
ref_out = []
for r in ref:
    if r[0].startswith("SUBMIT-011"):
        r[2] = "O sistema deve confirmar ou rejeitar a submissão de um vídeo de até 500 MB, incluindo a geração da thumbnail, em ≤ 5 s medidos a partir do fim da transferência, no ambiente de referência."
        r[3] = r[3].replace("(v1.3)", "(UC-VID-001 v1.2)")
    if r[0] == "COM-050":
        r[2] = "O sistema deve recusar o acesso a vídeos, thumbnails, tarefas e resultados a quem não tenha acesso ao projeto, identificando-os por valores não sequenciais."
        r[3] = r[3].replace("(v1.3)", "(UC-VID-001 v1.2)")
    ref_out.append(r)
    if r[0] == "SUBMIT-004":
        ref_out.append(["SUBMIT-012", "... gerar, durante a submissão, uma thumbnail JPEG de 320 px de largura a partir do fotograma a 10% da duração do vídeo (no máximo a 1 s) e associá-la ao vídeo, sem alterar o original.",
                        "O sistema deve gerar, para cada vídeo aceite na submissão, uma thumbnail JPEG com 320 px de largura e altura proporcional à do vídeo.",
                        "Requisito composto (gerar, escolher o fotograma, associar e não alterar o original); \"no máximo a 1 s\" podia ler-se como posição do fotograma ou como tempo de geração. O fotograma passa a SUBMIT-014, a associação e a apresentação ficam em COM-057 e a preservação do original em UC-VID-001/RN5 e RNG-08; a altura fica definida para vídeos verticais."])
        ref_out.append(["SUBMIT-014 (novo)", "— (parte de SUBMIT-012)",
                        "O sistema deve extrair a thumbnail do fotograma no instante t = min(0,1 × duração do vídeo; 1 s), contado a partir do início do vídeo.",
                        "Separado de SUBMIT-012; o instante passa a ser dado por uma fórmula, sem a leitura dupla de \"no máximo a 1 s\"."])
ref_out.append(["SPD-006", "... concluir a alteração de velocidade de um vídeo de 60 s em 1080p em ≤ 2 min.",
                "O sistema deve concluir a alteração de velocidade de um vídeo em 1080p em ≤ 2 min por minuto da maior das duas durações (origem ou resultado).",
                "Exequibilidade: o _worker_ descodifica sempre a origem inteira e codifica o resultado inteiro, por isso o custo depende da maior das duas durações. A 0,5× o resultado tem o dobro da duração e um alvo fixo de 2 min não era exequível com 1 vCPU (139 a 155 s medidos, acima de 120 s); a 2× o custo é dominado pela origem. Segue a lógica \"por minuto de vídeo\" da RNG-06."])

RULES = [
    ["Clareza", "COM-002, COM-003, COM-004, COM-006, COM-044, COM-052, SUBMIT-012",
     "Termos com mais de uma leitura (\"formato\", \"integridade\", \"MB\", \"superior a 1920 × 1080\", \"versões atuais\", \"compreensível\", \"no máximo a 1 s\") substituídos por definições com unidades."],
    ["Testabilidade", "COM-015, COM-028, COM-036, COM-046, FLT-005, SUBMIT-004, TRIM-011, CONV-006, FLT-008, DET-009",
     "Cada valor passa a ter condição de medição: o que se mede, onde começa e acaba, e em que ambiente."],
    ["Atomicidade", "COM-022, COM-033, COM-036, COM-041, COM-046, COM-050, SUBMIT-012",
     "Requisitos com mais de uma ideia divididos, com IDs novos para a parte separada (COM-053 a COM-056, SUBMIT-011, SUBMIT-014); COM-022 deixa de repetir a reserva, que já está em COM-021."],
    ["Exequibilidade", "COM-046, CONV-006, SPD-006",
     "Retirada a exigência de resultados iguais nas ferramentas de IA, que não são deterministas; o alvo do WebM fica por fixar até haver medição; o alvo de SPD-006 passa a ser por minuto da maior das duas durações, porque um alvo fixo não era exequível a 0,5× com 1 vCPU. O alvo de COM-036 foi confirmado por medição; o de SUBMIT-011 não é cumprido com ficheiros grandes (Cap. 10.3)."],
    ["Consistência", "COM-021, COM-022, COM-054, COM-001, SUBMIT-001, SUBMIT-002, SUBMIT-003, COM-035",
     "Confrontados com a solução de base; conflitos e decisões na tabela seguinte."],
    ["Necessidade", "SUBMIT-002; COM-044",
     "SUBMIT-002 só tem origem no _brainstorming_ da equipa: mantém-se como atalho de usabilidade, mas passa de _Should_ a _Could_ até ser confirmado com utilizadores (Cap. 2.3). Em COM-044 não se fixou o sistema operativo, por falta de origem. Os valores sem origem identificável estão listados nas lacunas do Cap. 2.3."],
]
conf = rows(section(MD, "#### 5.5.2", None))


# ---------------------------------------------------------------- escrita do Cap. 5
def table(caption, cols, header, body, size="9pt"):
    out = [f"#tab([{caption}],", "  tabela(", f"    colunas: ({cols}),", f"    tamanho: {size},",
           "    " + ", ".join(f"[{h}]" for h in header) + ","]
    out += ["    " + ", ".join(cell(c) for c in r) + "," for r in body]
    out += ["  ),", ")"]
    return "\n".join(out)


# ---------------------------------------------------------------- revisão final (2026-10-23)
def F(i): return fr[f"`REQ-VID-{i}`"]
def N(i): return nfr[f"`REQ-VID-{i}`"]
# Origens: fontes reais e decisões da equipa identificadas como tal
F("COM-032")[4] = "UC04, RF15 (_baseline_); decisão da equipa de separar imagens e vídeos (Cap. 6)"
F("COM-033")[4] = "RF13, T-09 (_baseline_); decisão da equipa para o descarregamento de vídeos (Cap. 6)"
F("COM-053")[4] = "RF13, T-09 (_baseline_); decisão da equipa para o descarregamento de vídeos (Cap. 6)"
F("DET-007")[4] += "; requisito derivado: navegação e filtro por classe decididos pela equipa"
F("TRIM-010")[4] += "; decisão da equipa (recorte iterativo)"
F("SUBMIT-004")[4] += "; decisão da equipa (cadência de 1 s)"
F("FLT-005")[4] += "; decisão da equipa (latência de 1 s)"
N("COM-037")[5] += "; AS-07; decisão da equipa (100 tarefas em fila)"
N("COM-041")[5] += "; DA-04"
N("COM-055")[5] += "; DA-05"
N("COM-047")[5] += "; interesses da Equipa de Desenvolvimento; DA-03"
N("COM-049")[5] += "; decisão técnica (requisitos mínimos documentados)"
N("COM-050")[5] = N("COM-050")[5].replace("; UC-VID-004/A11", "")
N("COM-054")[5] = "RNF49 (ALT: 60 min nas imagens); UC-VID-005/RN8; decisão da equipa (15 min, valor de trabalho, Cap. 2.3.4)"
N("DET-008")[5] += "; decisão da equipa (critério de paridade)"
N("FLT-007")[5] += "; decisão da equipa (limiar PSNR)"
for i in ("TRIM-011", "CONV-006", "FLT-008", "DET-009", "SPD-006"):
    N(i)[5] += "; AS-04 (valores de trabalho)"
N("SUBMIT-011")[5] += "; AS-06"
# Textos e critérios revistos (registados no 5.4)
F("COM-010")[6] = "Dado vídeo 1080p de um utilizador Free, quando abre as opções de resolução, então vê 1080p e inferiores e nunca 1440p ou 2160p; dado vídeo 720p, então não vê resoluções acima de 720p."
F("SUBMIT-012")[1] = "O sistema deve gerar, para cada vídeo aceite na submissão, uma thumbnail JPEG com 320 px de largura e altura proporcional à do vídeo; a falha da geração é tratada em SUBMIT-013."
N("COM-047")[1] = "O sistema deve permitir acrescentar uma ferramenta de vídeo alterando apenas o novo _worker_ e a sua configuração (serviço no `docker-compose.yaml` e fila no `definitions.json`), o registo de ferramentas, o validador dos parâmetros e a entrada no menu da interface."
N("COM-047")[3] = "MVP: só esses elementos alterados; produção: filas declaradas a partir do registo."
N("COM-047")[6] = "Acrescentar uma ferramenta de vídeo e verificar que só mudam os elementos indicados."
N("COM-037")[6] = "Com 5 réplicas do mesmo _worker_ e 6 utilizadores distintos, submeter 6 tarefas em simultâneo e verificar que a 6.ª fica em `queued`; com 101 tarefas de utilizadores distintos, verificar que todas terminam."
N("COM-043")[6] = "Verificar que vídeo e resultado continuam acessíveis após fechar e reabrir a sessão; com relógio simulado, verificar que o registo da tarefa existe 29 dias após o estado final e já não existe 31 dias depois; a remoção do vídeo, do projeto ou da conta apaga-o antes (RNG-08)."
N("COM-055")[1] = "O sistema deve manter o estado e o registo de todas as tarefas quando o serviço de projetos é reiniciado, sem perder nem repor estados; os eventos chegados durante a indisponibilidade são aplicados depois."
N("COM-055")[3] = "100% das tarefas sem perda nem regressão de estado após o reinício."
N("COM-055")[6] = "Com tarefas em `queued`, `processing` e `completed`, reiniciar o serviço de projetos e verificar que nenhuma regride ou se perde e que as que terminaram entretanto ficam no estado final."
N("DET-008")[1] = "O sistema deve produzir, em cada fotograma, deteções equivalentes às que `people_ai` e `obj_ai` produzem na imagem desse fotograma, com o mesmo modelo e o mesmo limiar."
N("DET-008")[3] = "≥ 95% das deteções da ferramenta de imagem emparelhadas uma a uma com uma deteção do vídeo (mesma classe e IoU ≥ 0,9), em 20 fotogramas igualmente espaçados."
fr["`REQ-VID-SPD-007`"] = [
    "`REQ-VID-SPD-007`",
    "O sistema deve recusar um pedido de alteração de velocidade idêntico (mesmo vídeo e mesma velocidade) a uma tarefa ainda ativa do mesmo utilizador, sem criar tarefa nem reservar quota, indicando essa tarefa.",
    "Should", "NOVO", "UC-VID-006/FA4",
    "Evita duplicar trabalho e consumir quota por duplo clique, como no recorte (TRIM-008).",
    "Dada tarefa de velocidade a 2× em `queued`, quando o utilizador submete o mesmo pedido, então recebe 409 com a tarefa existente, sem nova tarefa nem reserva.",
]
all_ids.add("SPD-007")
ref_out += [
    ["COM-010", "(critério com um vídeo 4K de um utilizador Free)", "Mesmo texto; o critério usa um vídeo 1080p de um utilizador Free.", "O critério contrariava COM-008: um vídeo 4K é recusado ao Free antes de mostrar opções."],
    ["SUBMIT-012", "… para cada vídeo aceite na submissão, uma thumbnail JPEG …", "… uma thumbnail JPEG …; a falha da geração é tratada em SUBMIT-013.", "Consistência: \"para cada vídeo\" contradizia a exceção de SUBMIT-013."],
    ["COM-047", "… alterando apenas o novo _worker_, o registo de ferramentas, o validador dos parâmetros e a entrada no menu da interface.", "… o novo _worker_ e a sua configuração (serviço e fila), o registo de ferramentas, o validador e a entrada no menu.", "Revisto depois de acrescentar a velocidade (TST-COM-26): a lista fechada não incluía a configuração do serviço e da fila, que a arquitetura exige (Cap. 8.4). Os serviços centrais continuam sem alterações."],
    ["COM-037", "(critério sem topologia do ensaio)", "Mesmo texto; o critério fixa 5 réplicas do mesmo _worker_.", "A 6.ª tarefa só fica em fila se as 5 réplicas forem da mesma fila; o `docker compose` tem réplicas por ferramenta."],
    ["COM-043", "(critério: o registo existe 30 dias depois)", "Mesmo texto; o critério verifica antes (29 dias) e depois (31 dias) do prazo.", "Os 30 dias exatos ficavam na fronteira da expiração."],
    ["COM-055", "O sistema deve manter o estado de todas as tarefas quando o serviço de projetos é reiniciado.", "… sem perder nem repor estados; os eventos chegados durante a indisponibilidade são aplicados depois.", "\"O mesmo estado\" proibia transições legítimas de tarefas que terminaram durante o reinício."],
    ["DET-008", "… as mesmas deteções que `people_ai` e `obj_ai` …", "… deteções equivalentes … com o mesmo modelo e o mesmo limiar; alvo com emparelhamento um a um e fotogramas igualmente espaçados.", "\"As mesmas\" sugeria igualdade, mas o alvo admite 95% de coincidência; faltava o protocolo."],
    ["SPD-007 (novo)", "— (UC-VID-006/FA4 sem requisito)", "O sistema deve recusar um pedido de alteração de velocidade idêntico a uma tarefa ainda ativa …", "Completude: o fluxo FA4 do UC-VID-006 não tinha requisito; a deduplicação já existia no código."],
]

fr_rows = sorted(fr.values(), key=lambda r: key(r[0]))
nfr_rows = sorted(nfr.values(), key=lambda r: key(r[0]))

cap5 = f"""#import "../template.typ": *

// 5.1 e 5.2 em páginas na horizontal (tabelas largas). Para voltar ao vertical, retirar o #paisagem[ ].
#paisagem[
= Especificação de Requisitos do Sistema (ERS)

#orientacao[
  Catálogo único dos requisitos de todas as funcionalidades de vídeo, ordenado por ID. A coluna *Origem* indica o
  caso de uso e o elemento de onde vem cada requisito (e.g., `UC-VID-001, passo 3`, `UC-VID-001/RN1`); um requisito
  comum a vários casos de uso (e.g., `REQ-VID-SUBMIT-001`) aparece uma só vez, com todas as origens.
  Padrão: _O sistema deve [ação] [objeto] [condição/limite]_. Cada requisito é atómico, verificável,
  inequívoco, sem solução técnica e rastreável. Prioridade segundo MoSCoW (_Must_ / _Should_ / _Could_ / _Won't_).
  *Justificação*: porque é que o requisito é necessário. *Novo/Alt*: NOVO = não existia no PictuRAS;
  ALT = altera algo existente — nesse caso indiquem o elemento de base afetado (e.g., RF13, RNF48, UC04).
]

Os requisitos usam o prefixo da área a que pertencem: `COM` (comuns a vários casos de uso), `SUBMIT` (UC-VID-001), `TRIM` (UC-VID-002), `CONV` (UC-VID-003), `FLT` (UC-VID-004), `DET` (UC-VID-005) e `SPD` (UC-VID-006). Os requisitos não funcionais usam o mesmo prefixo da funcionalidade ou da área a que dizem respeito, continuando a sua numeração; a característica ISO/IEC 25010 é indicada na respetiva coluna. `NOVO` significa que a capacidade não existe na _baseline_; `ALT (ID)` indica o elemento da _baseline_ que é alterado (Cap. 6). Nas origens, `Pn` é o passo _n_ do fluxo principal e `En` a exceção _n_ do caso de uso. Os textos já incluem o refinamento descrito no Cap. 5.4.

== Requisitos Funcionais

{table("Requisitos funcionais", "3.4cm, 1fr, 1.7cm, 1.5cm, 3cm, 4cm, 1fr",
       ["ID", "Requisito", "Prioridade", "Novo/Alt", "Origem", "Justificação", "Critério de aceitação"], fr_rows)}

== Requisitos Não Funcionais e de Qualidade

{table("Requisitos não funcionais", "3.4cm, 1fr, 3cm, 3cm, 1.7cm, 3cm, 1fr",
       ["ID", "Requisito", "ISO/IEC 25010", "Alvo", "Prioridade", "Origem", "Critério de aceitação"], nfr_rows)}
]

== Verificação da completude e dos limites do âmbito

Na tabela seguinte, os IDs dos requisitos aparecem sem o prefixo `REQ-VID-`.

{table("Verificação da completude", "3.6cm, 2.4cm, 1.7cm, 1fr, 3cm",
       ["Tópico a verificar", "Caso de uso", "Aplicável?", "Decisão / justificação", "Requisito(s)"], comp_out)}

== Refinamento dos requisitos

Os requisitos das secções 5.1 e 5.2 foram revistos à procura de termos vagos, requisitos compostos, ausência de critério mensurável e frases com mais do que uma interpretação, e depois confrontados com as seis regras de qualidade: clareza, testabilidade, atomicidade, exequibilidade, consistência e necessidade. O domínio do vídeo é particularmente sujeito a ambiguidade, porque quase todas as grandezas têm unidades (MB, s, px, fps) e porque "rápido" pode querer dizer tempo de resposta ou tempo até ao resultado. A tabela seguinte regista cada requisito alterado; os textos refinados já estão nas secções 5.1 e 5.2. Os IDs dos requisitos divididos não se reutilizam: a parte separada recebe um ID novo.

{table("Requisitos refinados", "2.4cm, 1fr, 1fr, 1fr", ["ID", "Requisito original", "Requisito refinado", "Ambiguidade resolvida"], ref_out)}

=== Aplicação das regras de qualidade

{table("Regras de qualidade aplicadas aos requisitos", "2.6cm, 4.6cm, 1fr", ["Regra", "Requisitos revistos", "Decisão"], RULES)}

=== Conflitos com o sistema existente

Os requisitos refinados foram confrontados com a tabela de impacto (Cap. 6) e com o comportamento real da _baseline_. Os conflitos encontrados e a decisão tomada:

{table("Conflitos com a solução de base", "3cm, 1fr, 1fr, 2.6cm", ["Elemento", "Regra da _baseline_", "Decisão para vídeo", "Requisitos"], conf)}
"""

# ---------------------------------------------------------------- 7.1 matriz
mat = rows(section(RT, "## Casos de uso → requisitos", "### Requisitos de qualidade"))
COM057 = "`REQ-VID-COM-057`"
mat_out = []
for r in mat:
    r[0] = r[0].replace("UC-VID-002 a 005", "UC-VID-002 a 006")
    if r[0] in ("UC-VID-002, passos 10–13", "UC-VID-003, passos 5–7", "UC-VID-004, passos 6–7", "UC-VID-005, passos 6–8") and COM057 not in r[2]:
        r[2] += ", " + COM057
    if r[0].startswith("UC-VID-001, passo 5"):
        for extra in ("SUBMIT-011", "SUBMIT-014"):
            if f"REQ-VID-{extra}`" not in r[2]:
                r[2] += f", `REQ-VID-{extra}`"
    if r[0].startswith("UC-VID-001/RN8") and "SUBMIT-014" not in r[2]:
        r[2] = r[2].replace("`REQ-VID-SUBMIT-013`", "`REQ-VID-SUBMIT-013`, `REQ-VID-SUBMIT-014`")
    mat_out.append(r)

R = lambda *ids: ", ".join(f"`REQ-VID-{i}`" for i in ids)
mat_out += [
    ["UC-VID-006, passos 1–2", "Apresentar as velocidades, a duração prevista e o saldo.", R("SPD-001", "COM-002", "COM-008", "COM-023")],
    ["UC-VID-006, passos 3–4", "Revalidar, criar tarefa, reservar operação e processar com progresso.",
     "`REQ-VID-COM-011` a `REQ-VID-COM-014`, " + R("COM-018", "COM-019", "COM-021", "COM-022", "COM-036", "COM-052", "SPD-004", "SPD-006")],
    ["UC-VID-006, passos 5–7", "Verificar, guardar o novo vídeo, concluir, notificar e reproduzir.",
     R("SPD-002", "SPD-003", "COM-015") + ", `REQ-VID-COM-026` a `REQ-VID-COM-030`, " + R("COM-044", "COM-057")],
    ["UC-VID-006/FA1–FA4", "Origem sem áudio; cancelar; regressar; pedido idêntico em curso.",
     R("SPD-004", "SPD-007") + ", `REQ-VID-COM-014` a `REQ-VID-COM-016`, " + R("COM-022", "COM-029", "COM-031")],
    ["UC-VID-006/E1–E6", "Rejeitar sem autorização, velocidade inválida, formato/limites, quota, tarefas ativas ou serviço indisponível.",
     R("COM-001") + ", `REQ-VID-COM-003` a `REQ-VID-COM-009`, " + R("COM-018", "COM-021", "COM-024", "COM-051", "SPD-005")],
    ["UC-VID-006/E7–E8", "Falha, tempo máximo, saída inválida ou origem removida.",
     R("COM-017", "COM-020", "COM-022", "COM-027", "COM-029", "COM-034", "COM-039", "COM-040")],
    ["UC-VID-006, pós-condições de sucesso e mínima", "Novo vídeo à velocidade pedida, original intacto, estado final e quota corretos, sem parciais.",
     R("SPD-002", "SPD-003", "SPD-004", "COM-020", "COM-022", "COM-026", "COM-029", "COM-039")],
    ["UC-VID-006/RN1–RN8", "Origem válida, velocidades, duração, resolução e cadência, áudio, resultado acima do limite, quota e formato.",
     R("COM-008", "COM-021", "COM-026", "COM-028", "COM-045") + ", `REQ-VID-SPD-001` a `REQ-VID-SPD-005`"],
    ["UC-VID-006/A3", "Custo de processamento dependente da maior das durações (origem ou resultado).", R("SPD-006")],
]


def covered(rws):
    ids = set()
    for r in rws:
        txt = r[2]
        for a, b in re.findall(r"REQ-VID-([A-Z]+-\d+)` a `REQ-VID-([A-Z]+-\d+)", txt):
            p, n1 = a.rsplit("-", 1)
            n2 = int(b.rsplit("-", 1)[1])
            ids |= {f"{p}-{n:03d}" for n in range(int(n1), n2 + 1)}
        ids |= set(re.findall(r"REQ-VID-([A-Z]+-\d+)", txt))
    return ids


# Requisitos que ainda não aparecem na matriz: uma linha por origem, para não haver órfãos
EXTRA = [
    ["UC04, RF15 da _baseline_; decisão da equipa (Cap. 6)", "Excluir os vídeos do processamento das ferramentas de imagem do projeto.", R("COM-032")],
    ["UC-VID-002/Q8; UC-VID-004/Q4; RNG-08", "Conservar vídeos e resultados durante a vida do projeto e os registos de tarefas durante 30 dias.", R("COM-043")],
    ["RNG-08 (remoção de conta)", "Eliminar vídeos, resultados e registos de tarefas quando a conta é removida (RGPD).", R("COM-035")],
    ["UC-VID-004/A1, A10; UC-VID-005/A3; AS-07; DA-03", "Reutilizar as transformações e os modelos de imagem em _workers_ de vídeo isolados, com réplicas independentes por ferramenta.", R("COM-047", "COM-037")],
    ["UC-VID-002 a 006, _stakeholder_ Equipa de Operações", "Acompanhar a ocupação da fila e o desempenho das tarefas, evitando tarefas órfãs.", R("COM-048", "COM-037")],
    ["RF13, T-09 da _baseline_; decisão da equipa (Cap. 6)", "Vídeos no ZIP do projeto; PDF só com imagens e aviso.", R("COM-033", "COM-053")],
    ["UC-VID-002/RN13; UC-VID-004/A8", "Confirmar a aceitação ou rejeição do pedido sem esperar pelo processamento.", R("COM-036")],
    ["RNG-06; UC-VID-004/A16; DA-04, DA-05", "Reinício do _worker_ ou do serviço de projetos sem tarefas incoerentes.", R("COM-041", "COM-055")],
    ["RNF49 da _baseline_; UC-VID-005/RN8; decisão da equipa (15 min)", "URLs de reprodução e descarga temporários (15 min).", R("COM-054")],
    ["UC04 da _baseline_; DQ-006", "Ferramentas e lotes de imagem sem regressões depois da integração do vídeo.", R("COM-046", "COM-056")],
    ["UC-VID-004/A7; DQ-007", "Ambiente reproduzível com contentores.", R("COM-049")],
    ["UC-VID-003/A4; UC-VID-004/A7, A17; UC-VID-005; AS-04", "Tempos de processamento de cada ferramenta no ambiente de referência.", R("TRIM-011", "CONV-006", "FLT-008", "DET-009", "SPD-006")],
]
mat_out += EXTRA
missing = sorted(all_ids - covered(mat_out), key=lambda i: key("REQ-VID-" + i))
assert not missing, f"requisitos sem caso de uso na matriz: {missing}"

dq = rows(section(RT, "| ID | Decisão de qualidade", "Outros requisitos de qualidade"))
for d in dq:
    cited = sorted({r[0].strip("`") for r in list(fr.values()) + list(nfr.values()) if d[0] in r[4] + r[5] if len(r) > 5}
                   | set(re.findall(r"`?(REQ-VID-[A-Z]+-\d+)`?", d[3])), key=key)
    d[3] = ", ".join(f"`{c}`" for c in cited)

# ---------------------------------------------------------------- 7.3 realização e verificação
V = [
    ("COM-001", "`api_gateway`, `projects`", "Implementado", "TST-COM-01, TST-SUBMIT-08", "Passa"),
    ("COM-002, COM-003, COM-045", "`projects` (`ffprobe`), `frontend`", "Implementado", "TST-COM-03", "Passa"),
    ("COM-004 a COM-007, COM-024", "`projects`, `api_gateway`, `frontend`", "Implementado", "TST-COM-04, TST-SUBMIT-08", "Passa"),
    ("COM-008", "`projects`", "Implementado", "TST-COM-05", "Passa"),
    ("COM-009", "`projects`", "Implementado", "TST-COM-10", "Passa"),
    ("COM-010", "`projects`, `frontend`", "Implementado", "TST-COM-06, TST-TRIM-05, TST-CONV-01", "Passa"),
    ("COM-011", "`projects`", "Implementado", "TST-COM-07", "Passa"),
    ("COM-012, COM-013, COM-014, COM-026", "`projects`, `video_utils`, `ws_gateway`", "Implementado", "TST-COM-13", "Passa"),
    ("COM-015", "`projects`, `frontend`", "Implementado", "TST-COM-14", "Passa (parcial): notificação pendente e _ack_; o prazo de 5 s com o utilizador ligado não foi medido"),
    ("COM-016, COM-039", "`projects`, `video_utils`", "Implementado", "TST-COM-15, TST-DET-08, TST-DET-09", "Passa"),
    ("COM-017", "`projects`", "Implementado", "TST-COM-16", "Passa"),
    ("COM-018", "`projects`", "Implementado", "TST-COM-08", "Passa"),
    ("COM-019", "`projects`, `rabbitmq`", "Implementado", "TST-COM-09", "Passa"),
    ("COM-020, COM-027", "`video_utils`, `projects`", "Implementado", "TST-COM-17, TST-COM-18", "Passa"),
    ("COM-021, COM-022", "`users`, `projects`", "Implementado", "TST-COM-07, TST-COM-10, TST-COM-11, TST-SPD-06", "Passa"),
    ("COM-023", "`frontend`", "Implementado", "TST-COM-31", "Passa (manual)"),
    ("COM-025", "`projects`", "Implementado", "TST-COM-21", "Passa"),
    ("COM-028", "_workers_ de vídeo, `video_utils`", "Implementado", "TST-TRIM-05, TST-CONV-04, TST-FLT-03, TST-SPD-04", "Passa; o desfasamento ≤ 40 ms é verificado antes de publicar em todos os _workers_"),
    ("COM-029", "`projects`, `video_utils`", "Implementado", "TST-COM-15, TST-COM-17, TST-SUBMIT-04", "Passa"),
    ("COM-030", "`frontend`, `img_storage`", "Implementado", "TST-COM-22, TST-SUBMIT-08", "Passa"),
    ("COM-031, COM-052", "`projects`, `ws_gateway`, `frontend`", "Implementado", "TST-COM-30", "Passa (manual)"),
    ("COM-032, COM-046, COM-056", "`projects`", "Parcial", "—", "Verificado por inspeção (só acréscimos no código de imagem); falta o teste automático (T-18)"),
    ("COM-033, COM-053", "`frontend`", "Implementado", "TST-COM-32", "Passa (manual)"),
    ("COM-034", "`projects`, `img_storage`", "Implementado", "TST-COM-20, TST-COM-23", "Passa"),
    ("COM-035", "`users`, `projects`", "Implementado", "TST-COM-23", "Passa (após a correção T-13)"),
    ("COM-036", "`projects`", "Implementado", "TST-COM-28", "Passa (máx. 1,43 s em 20 pedidos)"),
    ("COM-037", "`rabbitmq`, _workers_", "Parcial", "TST-COM-29", "Medido só com o _worker_ de teste (`noop`)"),
    ("COM-038", "`projects` (_janitor_)", "Implementado", "TST-COM-20", "Parcial: o _janitor_ é testado, mas os prazos de 1 h e 24 h não foram medidos"),
    ("COM-040", "`projects` (_watchdog_), `video_utils`", "Implementado", "TST-COM-18, TST-DET-08", "Passa"),
    ("COM-041", "`video_utils`", "Implementado", "TST-COM-19, TST-DET-08", "Passa"),
    ("COM-042", "`video_utils`", "Implementado", "—", "Sem teste dentro do _worker_ (Cap. 10.3)"),
    ("COM-043", "`projects`", "Implementado", "—", "Sem teste com relógio simulado (Cap. 10.3)"),
    ("COM-044", "`frontend`", "Implementado", "TST-COM-33", "Passa (manual, Chrome e Firefox)"),
    ("COM-047", "`projects` (`VIDEO_TOOLS`), `docker-compose.yaml`", "Implementado", "TST-COM-26, TST-SPD-01", "Passa, depois da revisão do requisito (5.4)"),
    ("COM-048", "`projects` (`videoTask`)", "Implementado", "TST-COM-25", "Passa (inspeção)"),
    ("COM-049", "`docker-compose.yaml`", "Implementado", "TST-COM-27", "Passa"),
    ("COM-050", "`projects`, `img_storage`", "Implementado", "TST-COM-02, TST-COM-22", "Passa"),
    ("COM-051", "`users`, `projects`", "Implementado", "TST-COM-12", "Passa (10 pedidos simultâneos, só 1 aceite)"),
    ("COM-054", "`img_storage`", "Implementado", "TST-COM-22", "Parcial: o URL tem `Expires` de 900 s; o acesso aos 14 e aos 16 min não foi testado"),
    ("COM-055", "`projects`", "Implementado", "—", "Sem teste (só o reinício do _worker_ foi testado)"),
    ("COM-057", "`projects`, `frontend`", "Implementado", "TST-COM-24, TST-COM-34", "Passa"),
    ("CONV-001, CONV-002", "`video_convert_worker`, `projects`", "Implementado", "TST-CONV-01, TST-CONV-04", "Passa"),
    ("CONV-003", "`projects`", "Implementado", "TST-CONV-02", "Passa"),
    ("CONV-004", "`projects`", "Implementado", "TST-CONV-03, TST-TRIM-06", "Passa"),
    ("CONV-006", "`video_convert_worker`", "Implementado", "TST-CONV-05, TST-CONV-06", "Parcial: MP4 dentro do alvo em 10 execuções (percentil 95 76,1 s; o critério pede ≥ 20); WebM 101,1 s, só caracterização (alvo por fixar)"),
    ("DET-001, DET-002", "`projects`", "Implementado", "TST-DET-01", "Passa"),
    ("DET-003, DET-004", "`video_detect_worker`", "Implementado", "TST-DET-02", "Passa (parcial)"),
    ("DET-005", "`video_detect_worker`", "Implementado", "TST-DET-04, TST-DET-09", "Passa"),
    ("DET-006", "`video_detect_worker`, `video_utils`", "Implementado", "TST-DET-07, TST-COM-17", "Passa: o _worker_ reporta as `orphanKeys` (TST-DET-07) e o `projects` apaga-as (`taskService.test.js`)"),
    ("DET-007", "`frontend`", "Implementado", "TST-DET-06", "Passa (manual)"),
    ("DET-008", "`video_detect_worker`", "Parcial", "TST-DET-03", "Verifica o formato das caixas; falta a comparação de ≥ 95% das deteções"),
    ("DET-009", "`video_detect_worker`", "Implementado", "TST-DET-05", "Falha (≈ 1 s por fotograma com 1 vCPU; termina por tempo aos 15 min)"),
    ("FLT-001 a FLT-003", "`frontend`, `projects`", "Implementado", "TST-FLT-01, TST-FLT-02", "Passa"),
    ("FLT-004, FLT-005", "`frontend`", "Implementado", "TST-FLT-06", "Passa (manual)"),
    ("FLT-006", "`video_filter_worker`", "Implementado", "TST-FLT-03", "Passa"),
    ("FLT-007", "`video_filter_worker`", "Implementado", "TST-FLT-04", "Passa (PSNR 36,2 a 38,3 dB)"),
    ("FLT-008", "`video_filter_worker`", "Implementado", "TST-FLT-05", "Falha com 1 vCPU (314 a 330 s); no limite com 2 vCPU"),
    ("SPD-001", "`frontend`, `projects`", "Implementado", "TST-SPD-01, TST-SPD-09", "Passa"),
    ("SPD-002, SPD-003", "`video_speed_worker`", "Implementado", "TST-SPD-03, TST-SPD-04, TST-SPD-06", "Passa"),
    ("SPD-004", "`video_speed_worker`", "Implementado", "TST-SPD-05", "Passa (440 Hz mantidos a 0,5× e 2×)"),
    ("SPD-005", "`projects`", "Implementado", "TST-SPD-02", "Passa"),
    ("SPD-007", "`projects`", "Implementado", "TST-SPD-01, TST-SPD-06", "Passa"),
    ("SPD-006", "`video_speed_worker`", "Implementado", "TST-SPD-07, TST-SPD-08", "Passa (percentil 95: 154,5 s a 0,5× e 53,2 s a 2×)"),
    ("SUBMIT-001, SUBMIT-006, SUBMIT-007", "`nginx`, `api_gateway`, `projects`, `img_storage`", "Implementado", "TST-SUBMIT-01, TST-SUBMIT-08", "Passa"),
    ("SUBMIT-002", "`projects`, `frontend`", "Implementado", "TST-SUBMIT-02", "Passa"),
    ("SUBMIT-003", "`api_gateway`", "Implementado", "TST-SUBMIT-03", "Passa"),
    ("SUBMIT-004", "`frontend`", "Implementado", "TST-SUBMIT-10", "Passa (manual)"),
    ("SUBMIT-005", "`frontend`, `projects`", "Implementado", "TST-SUBMIT-04, TST-SUBMIT-10", "Passa"),
    ("SUBMIT-008, SUBMIT-009", "`projects`", "Implementado", "TST-SUBMIT-05", "Passa"),
    ("SUBMIT-010", "`projects`", "Implementado", "TST-SUBMIT-06", "Passa"),
    ("SUBMIT-011", "`projects`, `img_storage`", "Implementado", "TST-SUBMIT-09", "Falha com 490 MB (12,9 a 55,0 s); a validação e a thumbnail levam 0,5 a 0,9 s"),
    ("SUBMIT-012 a SUBMIT-014", "`projects`", "Implementado", "TST-SUBMIT-07, TST-SUBMIT-02, TST-COM-24", "Passa"),
    ("TRIM-001, TRIM-002, TRIM-006, TRIM-007", "`frontend`", "Implementado", "TST-TRIM-08", "Passa (manual)"),
    ("TRIM-003", "`projects`", "Implementado", "TST-TRIM-01", "Passa"),
    ("TRIM-004, TRIM-005", "`video_trim_worker`, `projects`", "Implementado", "TST-TRIM-02, TST-TRIM-03", "Passa"),
    ("TRIM-008", "`projects`", "Implementado", "TST-TRIM-04", "Passa"),
    ("TRIM-009", "`video_trim_worker`", "Implementado", "TST-TRIM-05", "Passa"),
    ("TRIM-010", "`projects`", "Implementado", "TST-TRIM-06", "Passa"),
    ("TRIM-011", "`video_trim_worker`", "Implementado", "TST-TRIM-07", "Passa (percentil 95: 46,7 s)"),
]


def expand(label):
    ids = set()
    for part in label.split(", "):
        m = re.match(r"([A-Z]+)-(\d+) a (?:[A-Z]+-)?(\d+)", part)
        if m:
            ids |= {f"{m.group(1)}-{n:03d}" for n in range(int(m.group(2)), int(m.group(3)) + 1)}
        else:
            ids.add(part)
    return ids


not_verified = sorted(all_ids - set().union(*(expand(v[0]) for v in V)), key=lambda i: key("REQ-VID-" + i))
assert not not_verified, f"requisitos sem linha na 7.3: {not_verified}"

cap7 = f"""#import "../template.typ": *

= Rastreabilidade

== Casos de uso → requisitos

#orientacao[
  Cada elemento relevante de cada caso de uso (passos, FA, exceções, RN, pós-condições) tem pelo menos um requisito,
  ou justificação para não ter; nenhum requisito da ERS fica órfão. Requisitos de qualidade podem apontar para uma
  decisão de qualidade (DQ). Indiquem sempre o caso de uso no elemento de origem.
]

Quando vários elementos têm a mesma relação, são agrupados numa linha, mas cada passo, fluxo, exceção, regra ou pós-condição está identificado na coluna de origem. As últimas linhas ligam os requisitos que nascem de regras transversais, assunções ou _stakeholders_ e não de um passo concreto. Todos os requisitos da ERS aparecem pelo menos uma vez.

{table("Matriz de rastreabilidade: casos de uso → requisitos", "4cm, 1fr, 5.2cm", ["Elemento de origem", "Descrição abreviada", "Requisito(s)"], mat_out)}

== Decisões de qualidade

{table("Decisões de qualidade", "1.5cm, 4.5cm, 1fr, 3.2cm", ["ID", "Decisão de qualidade", "Justificação", "Requisitos"], dq)}

== Realização e verificação dos requisitos

#orientacao[
  Fecha o ciclo requisito → componente → teste → estado. Uma linha por requisito da ERS (podem agrupar requisitos
  com o mesmo destino). Requisitos não implementados não se apagam: ficam com estado "Não implementado" e justificação.
]

A tabela fecha o ciclo requisito → componente → teste → estado. Os requisitos com o mesmo destino estão agrupados, e todos os requisitos da ERS aparecem uma vez. Os componentes são os da Tabela de componentes novos e alterados (Cap. 8.1) e os testes são os do Cap. 10.2. Na coluna *Requisito*, os IDs aparecem sem o prefixo `REQ-VID-`.

{table("Realização e verificação dos requisitos", "3.6cm, 3.6cm, 2.2cm, 3.4cm, 1fr",
       ["Requisito", "Componente(s)", "Estado", "Teste(s)", "Resultado / observações"], [list(v) for v in V])}
"""

for name, text in (("cap5-ers.typ", cap5), ("cap7-rastreabilidade.typ", cap7)):
    prose = re.sub(r"`[^`]*`", "", text)  # nomes de ficheiros e código podem ter "thumbnail"
    leftovers = [w for w in ("estorn", "miniatura") if w in prose]
    assert not leftovers, f"{name}: ainda tem {leftovers}"
    (HERE / name).write_text(text, encoding="utf-8")
print(f"cap5-ers.typ: {len(fr_rows)} RF, {len(nfr_rows)} RNF, {len(comp_out)} linhas de completude, {len(ref_out)} refinados")
print(f"cap7-rastreabilidade.typ: {len(mat_out)} linhas na matriz, {len(dq)} DQ, {len(V)} linhas na 7.3")
