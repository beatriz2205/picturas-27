# Rastreabilidade

Matriz elaborada a partir de `use cases + requisitos.md` (versão 1.2, de 2026-10-18) e confrontada
com `analise-impacto-consolidada.md`. Os requisitos são identificados pelos IDs completos da ERS.
Quando vários elementos têm a mesma relação, são agrupados numa linha, mas cada passo, fluxo,
exceção, regra ou pós-condição está identificado na coluna de origem.

## Casos de uso → requisitos

| Elemento de origem | Descrição abreviada | Requisito(s) |
|---|---|---|
| UC-VID-001, passos 1–2 | Aceder ao projeto e iniciar a adição de um vídeo. | `REQ-VID-SUBMIT-001`, `REQ-VID-COM-001` |
| UC-VID-001, passo 3 | Selecionar o ficheiro e apresentar nome e tamanho antes do envio. | `REQ-VID-COM-002`, `REQ-VID-SUBMIT-003` |
| UC-VID-001, passo 4 | Confirmar o envio e acompanhar o progresso. | `REQ-VID-SUBMIT-004`, `REQ-VID-SUBMIT-005` |
| UC-VID-001, passo 5 | Validar conteúdo, codec, integridade e limites; guardar apenas ficheiro completo no projeto. | `REQ-VID-COM-003` a `REQ-VID-COM-006`, `REQ-VID-SUBMIT-003`, `REQ-VID-SUBMIT-006` |
| UC-VID-001, passo 6 | Confirmar o vídeo e apresentar os seus metadados no projeto. | `REQ-VID-COM-002`, `REQ-VID-SUBMIT-001`, `REQ-VID-SUBMIT-006` |
| UC-VID-001/FA1 | Cancelar seleção ou envio sem alterar o projeto nem deixar ficheiro parcial acessível. | `REQ-VID-SUBMIT-005`, `REQ-VID-COM-029` |
| UC-VID-001/FA2 | Submeter outro vídeo como nova entrada, sem substituir o anterior. | `REQ-VID-SUBMIT-007` |
| UC-VID-001/FA3 | Repetir um envio após falha; impedir duplicado se o envio anterior já foi confirmado. | `REQ-VID-SUBMIT-008`, `REQ-VID-SUBMIT-009`, `REQ-VID-SUBMIT-006` |
| UC-VID-001/FA4 | Criar projeto novo através de um vídeo válido; não criar projeto se o vídeo for recusado. | `REQ-VID-SUBMIT-002` |
| UC-VID-001/E1–E2 | Rejeitar formato, codec ou limites de perfil inválidos com motivo claro. | `REQ-VID-COM-003` a `REQ-VID-COM-007`, `REQ-VID-SUBMIT-003`, `REQ-VID-COMPAT-002` |
| UC-VID-001/E3 | Tratar falha de ligação/armazenamento sem confirmar conteúdo incompleto e permitir nova tentativa. | `REQ-VID-SUBMIT-006`, `REQ-VID-SUBMIT-008`, `REQ-VID-COM-029`, `REQ-VID-DESEMP-007` |
| UC-VID-001/E4 | Impedir submissão sem sessão válida ou permissão de edição. | `REQ-VID-COM-001` |
| UC-VID-001/E5 | Se o projeto for removido durante o envio, terminar com erro e descartar o ficheiro. | `REQ-VID-SUBMIT-006`, `REQ-VID-COM-029` |
| UC-VID-001, pós-condições de sucesso e mínima | Associar apenas vídeo validado, manter original e quota inalterados; nunca mostrar envio falhado/parcial como concluído. | `REQ-VID-SUBMIT-001`, `REQ-VID-SUBMIT-006`, `REQ-VID-SUBMIT-010`, `REQ-VID-COM-029` |
| UC-VID-001/RN1–RN2 | Exigir utilizador registado, sessão e edição; validar MP4/H.264/AAC (ou sem áudio) pelo conteúdo. | `REQ-VID-COM-001`, `REQ-VID-COM-003`, `REQ-VID-COMPAT-002` |
| UC-VID-001/RN3 | Aplicar limites Free/Premium de tamanho, duração e resolução. | `REQ-VID-COM-004` a `REQ-VID-COM-006` |
| UC-VID-001/RN4–RN7 | Não cobrar pelo upload; manter conteúdos distintos; tornar repetição segura; verificar tamanho antes da transferência e nunca associar ficheiro inválido. | `REQ-VID-SUBMIT-003`, `REQ-VID-SUBMIT-006` a `REQ-VID-SUBMIT-010` |
| UC-VID-002, passos 1–2 | Apresentar projeto e metadados; selecionar ferramenta apenas para vídeo compatível com o perfil atual. | `REQ-VID-COM-001` a `REQ-VID-COM-006`, `REQ-VID-COM-008`, `REQ-VID-COM-010`, `REQ-VID-COM-023`, `REQ-VID-COMPAT-002`, `REQ-VID-CONV-004` |
| UC-VID-002, passos 3–4 | Definir intervalo, visualizar pontos de corte, escolher resolução/nome e rever resumo. | `REQ-VID-TRIM-001` a `REQ-VID-TRIM-007`, `REQ-VID-COM-010` |
| UC-VID-002, passos 5–7 | Revalidar pedido, criar tarefa em fila, reservar operação e apresentar estado rapidamente. | `REQ-VID-COM-008`, `REQ-VID-COM-009`, `REQ-VID-COM-011`, `REQ-VID-COM-012`, `REQ-VID-COM-018`, `REQ-VID-COM-019`, `REQ-VID-COM-021` a `REQ-VID-COM-025`, `REQ-VID-DESEMP-001`, `REQ-VID-SEG-002` |
| UC-VID-002, passos 8–9 | Processar em segundo plano e disponibilizar estado/progresso mesmo se o utilizador sair. | `REQ-VID-COM-012` a `REQ-VID-COM-015`, `REQ-VID-USAB-001` |
| UC-VID-002, passos 10–13 | Validar e guardar novo resultado; concluir tarefa, consolidar quota, notificar e permitir reprodução/descarga. | `REQ-VID-COM-026` a `REQ-VID-COM-030`, `REQ-VID-COM-028`, `REQ-VID-COM-015`, `REQ-VID-COM-022`, `REQ-VID-COMPAT-001` |
| UC-VID-002/FA1–FA2 | Cancelar antes ou durante o processamento, sem publicar parcial e estornando a operação. | `REQ-VID-COM-016`, `REQ-VID-COM-022`, `REQ-VID-COM-029`, `REQ-VID-FIAB-001` |
| UC-VID-002/FA3–FA4 | Usar o fim do vídeo por omissão e evitar colisão de nomes. | `REQ-VID-TRIM-004`, `REQ-VID-TRIM-007` |
| UC-VID-002/FA5–FA6 | Consultar estado e notificação ao regressar; não criar tarefa duplicada para pedido idêntico ativo. | `REQ-VID-COM-015`, `REQ-VID-COM-031`, `REQ-VID-TRIM-008` |
| UC-VID-002/E1–E3 | Impedir acesso sem autorização, entrada não suportada e excedente dos limites atuais. | `REQ-VID-COM-001`, `REQ-VID-COM-003` a `REQ-VID-COM-008`, `REQ-VID-COM-024`, `REQ-VID-COMPAT-002`, `REQ-VID-CONV-004` |
| UC-VID-002/E4–E7 | Rejeitar intervalo inválido, quota/tarefas excedidas ou indisponibilidade sem reservar quota. | `REQ-VID-TRIM-003`, `REQ-VID-COM-007` a `REQ-VID-COM-009`, `REQ-VID-COM-018`, `REQ-VID-COM-021`, `REQ-VID-COM-022`, `REQ-VID-SEG-002` |
| UC-VID-002/E8–E10 | Falha, timeout ou saída inválida: marcar falha, registar motivo, limpar parcial e estornar quota. | `REQ-VID-COM-020`, `REQ-VID-COM-022`, `REQ-VID-COM-027`, `REQ-VID-COM-029`, `REQ-VID-FIAB-001`, `REQ-VID-FIAB-002`, `REQ-VID-FIAB-004`, `REQ-VID-DESEMP-007` |
| UC-VID-002/E11–E12 | Remoção da origem/projeto cancela tarefa e elimina conteúdo; perda de ligação não interrompe processamento. | `REQ-VID-COM-014`, `REQ-VID-COM-017`, `REQ-VID-COM-022`, `REQ-VID-COM-031`, `REQ-VID-COM-034` |
| UC-VID-002, pós-condições de sucesso e mínima | Produzir excerto correto como novo recurso; manter original; estados finais, motivo, notificação e quota coerentes; não expor parciais. | `REQ-VID-COM-015`, `REQ-VID-COM-020` a `REQ-VID-COM-029`, `REQ-VID-TRIM-009`, `REQ-VID-FIAB-001` |
| UC-VID-002/RN1–RN5 | Validar origem e limites, intervalo válido, reserva/consolidação/estorno, precisão de fotograma e opções de saída. | `REQ-VID-COM-008`, `REQ-VID-COM-010`, `REQ-VID-COM-021` a `REQ-VID-COM-023`, `REQ-VID-TRIM-003`, `REQ-VID-TRIM-005`, `REQ-VID-TRIM-006` |
| UC-VID-002/RN6–RN14 | Limitar tarefas e prioridade; validar resultado; manter original, duração, áudio, estado, cancelamento, limpeza e progresso. | `REQ-VID-COM-012` a `REQ-VID-COM-022`, `REQ-VID-COM-026` a `REQ-VID-COM-029`, `REQ-VID-TRIM-008` a `REQ-VID-TRIM-010`, `REQ-VID-FIAB-002`, `REQ-VID-DESEMP-007`, `REQ-VID-USAB-001` |
| UC-VID-002, ator principal/RNG-07 | Aplicar quota e limites do utilizador que inicia a tarefa, incluindo projetos partilhados. | `REQ-VID-COM-001`, `REQ-VID-COM-025` |
| UC-VID-003, passos 1–2 | Mostrar metadados, formatos/resoluções possíveis e saldo; revalidar opções e alteração efetiva. | `REQ-VID-COM-002`, `REQ-VID-COM-008`, `REQ-VID-COM-010`, `REQ-VID-COM-023`, `REQ-VID-CONV-001` a `REQ-VID-CONV-003` |
| UC-VID-003, passos 3–4 | Criar tarefa em fila, reservar quota, aplicar prioridade e processar assincronamente com progresso. | `REQ-VID-COM-011` a `REQ-VID-COM-014`, `REQ-VID-COM-018`, `REQ-VID-COM-019`, `REQ-VID-COM-021`, `REQ-VID-COM-022`, `REQ-VID-DESEMP-001`, `REQ-VID-USAB-001` |
| UC-VID-003, passos 5–7 | Validar conversão, guardar novo recurso, concluir/notificar e reproduzir/descarregar resultado. | `REQ-VID-COM-015`, `REQ-VID-COM-026` a `REQ-VID-COM-030`, `REQ-VID-COMPAT-001`, `REQ-VID-COMPAT-002` |
| UC-VID-003/FA1–FA2 | Preservar a resolução se só muda o formato e o formato se só muda a resolução. | `REQ-VID-CONV-002`, `REQ-VID-COM-010` |
| UC-VID-003/FA3–FA5 | Cancelar em fila/processamento com estorno; consultar tarefa e notificação após ausência. | `REQ-VID-COM-015`, `REQ-VID-COM-016`, `REQ-VID-COM-022`, `REQ-VID-COM-029`, `REQ-VID-COM-031` |
| UC-VID-003/E1–E4 | Rejeitar falta de autorização, entrada ou opções não suportadas e limites excedidos, explicando a causa. | `REQ-VID-COM-001` a `REQ-VID-COM-008`, `REQ-VID-COM-024`, `REQ-VID-COM-025`, `REQ-VID-COM-010`, `REQ-VID-CONV-001`, `REQ-VID-CONV-004`, `REQ-VID-COMPAT-002` |
| UC-VID-003/E5–E8 | Rejeitar pedido sem alteração, quota/tarefas excedidas ou serviço indisponível sem criar tarefa nem reservar operação. | `REQ-VID-COM-007` a `REQ-VID-COM-009`, `REQ-VID-COM-018`, `REQ-VID-COM-021` a `REQ-VID-COM-024`, `REQ-VID-CONV-003`, `REQ-VID-SEG-002` |
| UC-VID-003/E9–E11 | Falha/timeout/saída inválida ou remoção da origem: sem resultado parcial, estorno e cancelamento aplicável. | `REQ-VID-COM-017`, `REQ-VID-COM-020`, `REQ-VID-COM-022`, `REQ-VID-COM-027`, `REQ-VID-COM-029`, `REQ-VID-COM-034`, `REQ-VID-FIAB-001`, `REQ-VID-FIAB-002`, `REQ-VID-FIAB-004` |
| UC-VID-003, pós-condições de sucesso e mínima | Resultado novo e correto, original imutável, quota e estado final coerentes, falha/cancelamento visíveis. | `REQ-VID-COM-015`, `REQ-VID-COM-020` a `REQ-VID-COM-030`, `REQ-VID-CONV-001` a `REQ-VID-CONV-003`, `REQ-VID-FIAB-001` |
| UC-VID-003/RN1–RN8 | Autorização, novo recurso, codecs de saída, resolução, quota/tarefas, alteração efetiva, limites de entrada e áudio/duração. | `REQ-VID-COM-001`, `REQ-VID-COM-008`, `REQ-VID-COM-010`, `REQ-VID-COM-021`, `REQ-VID-COM-022`, `REQ-VID-COM-026` a `REQ-VID-COM-028`, `REQ-VID-CONV-001` a `REQ-VID-CONV-004`, `REQ-VID-COMPAT-002` |
| UC-VID-003, ator principal/RNG-07 | Aplicar quota e limites do utilizador que inicia a conversão num projeto partilhado. | `REQ-VID-COM-001`, `REQ-VID-COM-025` |
| UC-VID-004, passos 1–3 | Mostrar metadados e ferramentas; configurar estilo/parâmetros; validar e criar tarefa. | `REQ-VID-COM-001` a `REQ-VID-COM-008`, `REQ-VID-COM-023`, `REQ-VID-FLT-001` a `REQ-VID-FLT-005`, `REQ-VID-COM-011`, `REQ-VID-COM-012`, `REQ-VID-COM-018`, `REQ-VID-COM-021`, `REQ-VID-COM-022` |
| UC-VID-004, passos 4–5 | Aplicar alterações a todos os fotogramas, preservar sequência e áudio, manter estado/progresso e permitir cancelamento. | `REQ-VID-COM-013`, `REQ-VID-COM-014`, `REQ-VID-COM-016`, `REQ-VID-COM-028`, `REQ-VID-FLT-006`, `REQ-VID-ADEQ-001`, `REQ-VID-USAB-001` |
| UC-VID-004, passos 6–7 | Verificar, limpar e guardar novo resultado; concluir e disponibilizar reprodução/descarga. | `REQ-VID-COM-015`, `REQ-VID-COM-026` a `REQ-VID-COM-030`, `REQ-VID-COMPAT-001`, `REQ-VID-FIAB-001`, `REQ-VID-DESEMP-007` |
| UC-VID-004/FA1–FA2 | Ajustar manualmente e repor parâmetros sem perder a pré-visualização. | `REQ-VID-FLT-002`, `REQ-VID-FLT-003`, `REQ-VID-FLT-004`, `REQ-VID-FLT-005` |
| UC-VID-004/FA3–FA4 | Cancelar com limpeza/estorno; continuar após fechar e recuperar estado/notificação. | `REQ-VID-COM-014` a `REQ-VID-COM-016`, `REQ-VID-COM-022`, `REQ-VID-COM-029`, `REQ-VID-COM-031` |
| UC-VID-004/E1–E7 | Rejeitar autorização, parâmetros, formato/limites, quota, tarefas ou indisponibilidade. | `REQ-VID-COM-001`, `REQ-VID-COM-003` a `REQ-VID-COM-009`, `REQ-VID-COM-018`, `REQ-VID-COM-021` a `REQ-VID-COM-024`, `REQ-VID-FLT-003`, `REQ-VID-COMPAT-002` |
| UC-VID-004/E8–E10 | Falha/timeout/ficheiro final inválido/removido: falha ou cancelamento, razão, estorno e sem parcial. | `REQ-VID-COM-017`, `REQ-VID-COM-020`, `REQ-VID-COM-022`, `REQ-VID-COM-027`, `REQ-VID-COM-029`, `REQ-VID-COM-034`, `REQ-VID-FIAB-001` a `REQ-VID-FIAB-004`, `REQ-VID-DESEMP-007` |
| UC-VID-004, pós-condições | Resultado filtrado íntegro, áudio sincronizado, original intacto, estado final e quota corretos. | `REQ-VID-COM-020` a `REQ-VID-COM-029`, `REQ-VID-FLT-006`, `REQ-VID-ADEQ-001`, `REQ-VID-FIAB-001` |
| UC-VID-004/RN1–RN9 | Intervalo de parâmetros, limites, original imutável, formatos, quota, validação, fila e dimensões máximas. | `REQ-VID-COM-004` a `REQ-VID-COM-006`, `REQ-VID-COM-008`, `REQ-VID-COM-018`, `REQ-VID-COM-021`, `REQ-VID-COM-022`, `REQ-VID-COM-026` a `REQ-VID-COM-028`, `REQ-VID-FLT-003`, `REQ-VID-FLT-006`, `REQ-VID-COMPAT-002` |
| UC-VID-005, passos 1–3 | Selecionar ferramentas/limiar/artefactos, validar e criar tarefa com reserva. | `REQ-VID-COM-001` a `REQ-VID-COM-008`, `REQ-VID-COM-011`, `REQ-VID-COM-012`, `REQ-VID-COM-018`, `REQ-VID-COM-021` a `REQ-VID-COM-023`, `REQ-VID-DET-001`, `REQ-VID-DET-002` |
| UC-VID-005, passos 4–5 | Detetar em fotogramas com progresso e continuar após o utilizador sair. | `REQ-VID-COM-013`, `REQ-VID-COM-014`, `REQ-VID-DET-004`, `REQ-VID-ADEQ-002`, `REQ-VID-USAB-001` |
| UC-VID-005, passos 6–8 | Guardar JSON/artefactos e apresentar ou descarregar resultados; só concluir quando tudo estiver guardado. | `REQ-VID-COM-015`, `REQ-VID-COM-026`, `REQ-VID-COM-029` a `REQ-VID-COM-031`, `REQ-VID-DET-004`, `REQ-VID-DET-006`, `REQ-VID-DET-007`, `REQ-VID-COMPAT-001` |
| UC-VID-005/FA1–FA3 | Guardar JSON sozinho ou com vídeo anotado; combinar ferramentas na mesma tarefa. | `REQ-VID-DET-003` a `REQ-VID-DET-006`, `REQ-VID-COM-021`, `REQ-VID-COM-026` |
| UC-VID-005/FA4–FA6 | Cancelar sem parcial e com estorno; carregar origem se necessário; recuperar estado e notificação após ausência. | `REQ-VID-COM-014` a `REQ-VID-COM-016`, `REQ-VID-COM-022`, `REQ-VID-COM-029` a `REQ-VID-COM-031`, `REQ-VID-SUBMIT-001` |
| UC-VID-005/E1–E6 | Rejeitar falta de autorização, opções inválidas, formato/limites, quota, limite de tarefas e indisponibilidade. | `REQ-VID-COM-001`, `REQ-VID-COM-003` a `REQ-VID-COM-009`, `REQ-VID-COM-018`, `REQ-VID-COM-021` a `REQ-VID-COM-024`, `REQ-VID-DET-001`, `REQ-VID-DET-002`, `REQ-VID-SEG-002` |
| UC-VID-005/E7–E8 | Falha/timeout ou remoção da origem: marcar resultado, registar motivo, limpar, estornar e notificar. | `REQ-VID-COM-017`, `REQ-VID-COM-020`, `REQ-VID-COM-022`, `REQ-VID-COM-029`, `REQ-VID-FIAB-001` a `REQ-VID-FIAB-004`, `REQ-VID-DESEMP-007` |
| UC-VID-005, pós-condições de sucesso e mínima | Guardar deteções associadas à origem sem alterar o original; não publicar incompleto; estornar e informar em falha. | `REQ-VID-COM-015`, `REQ-VID-COM-020` a `REQ-VID-COM-029`, `REQ-VID-DET-004` a `REQ-VID-DET-007`, `REQ-VID-ADEQ-002`, `REQ-VID-FIAB-001` |
| UC-VID-005/RN1–RN8 | Autorização, ferramentas e limiar, esquema de deteções, quota, imutabilidade, conclusão atómica, processamento assíncrono e URLs temporários. | `REQ-VID-COM-001`, `REQ-VID-COM-008`, `REQ-VID-COM-011` a `REQ-VID-COM-016`, `REQ-VID-COM-021`, `REQ-VID-COM-022`, `REQ-VID-COM-026`, `REQ-VID-COM-029`, `REQ-VID-DET-001` a `REQ-VID-DET-006`, `REQ-VID-SEG-001`, `REQ-VID-ADEQ-002` |
| UC-VID-005, ator principal/RNG-07 | Aplicar quota e limites do utilizador que inicia a deteção num projeto partilhado. | `REQ-VID-COM-001`, `REQ-VID-COM-025` |

### Requisitos de qualidade e decisões de qualidade

As decisões DQ associadas aos requisitos abaixo são tratadas como rastreabilidade de qualidade,
conforme a orientação. Os DQ-001 a DQ-004, DQ-006 e DQ-007 aparecem citados na ERS; não foi
encontrada uma definição consolidada de cada decisão no documento de requisitos, pelo que as
descrições seguintes sintetizam o requisito a que cada DQ está ligado. Para preencher a lacuna
numérica, esta matriz propõe DQ-005 sobre a aplicação atómica dos limites concorrentes e da quota,
com base em `REQ-VID-SEG-002` e nas regras RNG-04/RNG-05. Esta decisão ainda não está identificada
como DQ na ERS e deve ser acrescentada à fonte consolidada para manter os documentos sincronizados.

| ID | Decisão de qualidade | Justificação | Requisitos |
|---|---|---|---|
| DQ-001 | Aceitar/rejeitar rapidamente e executar o processamento de forma assíncrona. | O pedido não deve ficar bloqueado à espera de uma tarefa longa; permite responder dentro do alvo de latência do MVP. | `REQ-VID-DESEMP-001` |
| DQ-002 | Preservar o original e nunca publicar resultados parciais em caso de falha, cancelamento ou interrupção. | Protege a integridade dos ficheiros e evita apresentar um artefacto incompleto como válido. | `REQ-VID-FIAB-001` |
| DQ-003 | Tornar estado, progresso, erros e quota compreensíveis e atualizados. | Dá feedback durante tarefas longas e após falhas/ausência do utilizador. | `REQ-VID-USAB-001` |
| DQ-004 | Persistir os vídeos/resultados durante a vida do projeto e conservar o histórico de tarefas por 30 dias. | Permite retomar a consulta depois de fechar a aplicação e dá rastreabilidade operacional. | `REQ-VID-FIAB-005` |
| DQ-005 | Aplicar atomicamente os limites de quota diária e de tarefas ativas em pedidos concorrentes do mesmo utilizador. | Evita aceitar operações acima dos limites quando pedidos simultâneos consultam ou atualizam o saldo e o número de tarefas ao mesmo tempo. | `REQ-VID-SEG-002` |
| DQ-006 | Preservar o funcionamento das ferramentas e dos lotes de imagem existentes. | A integração de vídeo não deve provocar regressões no comportamento da baseline. | `REQ-VID-MANUT-001` |
| DQ-007 | Disponibilizar workers e dependências em contentores reproduzíveis a partir da documentação. | Permite instalar e validar o MVP num ambiente limpo e repetível. | `REQ-VID-PORT-001` |

Outros requisitos de qualidade são rastreados diretamente às origens indicadas na ERS: `REQ-VID-ADEQ-001` a `REQ-VID-USAB-001` (secção 5.2), incluindo os requisitos de compatibilidade, desempenho, fiabilidade, segurança e usabilidade. A ERS não atribui DQ explícito a todos eles.
