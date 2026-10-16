# Research: Conversão de Vídeo

## Decision: Reutilizar a pipeline assíncrona existente

**Rationale**: O serviço `projects` já cria operações, publica mensagens RabbitMQ e recebe
resultados. O `wsGateway` já transforma mensagens da fila em eventos para o utilizador. Um fluxo
de vídeo deve seguir o mesmo padrão para reduzir alterações arquiteturais e manter a operação
observável.

**Alternatives considered**: Processamento síncrono no API Gateway; rejeitado porque vídeos podem
demorar e bloqueariam a submissão. Criar um serviço de orquestração separado; rejeitado para o MVP
porque duplicaria responsabilidades existentes.

## Decision: Persistir uma operação de conversão com ciclo de vida explícito

**Rationale**: O modelo `process` atual é orientado a imagens e não expressa claramente estados,
codec, duração, resolução ou falhas de vídeo. Uma entidade de conversão separada permite validar
transições, preservar o original e evitar que um resultado parcial seja tratado como concluído.

**Alternatives considered**: Reutilizar os campos de `process` sem estado novo; rejeitado porque
não cobre as garantias mínimas e torna o fluxo de vídeo indistinguível do fluxo de imagem.

## Proposta a validar: MP4/H.264/AAC até 1080p, 10 minutos e 500 MB

**Rationale**: Estes limites foram usados como proposta durante a clarificação e tornam o MVP
testável e demonstrável sem prometer suporte geral a codecs. No caso de uso, Q1 e Q2 continuam
em aberto e a proposta só se torna decisão depois da validação do grupo.

**Alternatives considered**: Suportar vários contentores no MVP; decisão pendente até serem
confirmados os formatos/codecs de entrada e as resoluções predefinidas.

## Decision: Guardar o resultado como novo recurso

**Rationale**: O requisito RN3 exige que o original nunca seja substituído. O resultado deve
manter referência ao original, projeto, formato e resolução de saída.

**Alternatives considered**: Substituir o ficheiro original; rejeitado por perda de dados e por
violar a garantia de sucesso.

## Decision: Usar eventos de estado compatíveis com o WebSocket existente

**Rationale**: O gateway já usa rooms por utilizador e projeto e consome `ws_queue`. O contrato
deve acrescentar um evento de conversão sem alterar o significado dos eventos de imagem existentes.

**Alternatives considered**: Polling obrigatório no frontend; mantido apenas como fallback de
consulta, não como mecanismo principal de atualização.
