# 010 — Visão

Este gabinete contém a **visão fundacional actual** do ATELIER / DECIMA.

## Documentos de visão

- [`DECIMA-PHILOSOPHY-v2.md`](DECIMA-PHILOSOPHY-v2.md) — **The Philosophy of
  Organisational Intelligence (v2)**. O **documento filosófico fundacional** da
  DECIMA: a plataforma como _Continuity Engine_ para o juízo organizacional —
  observar a realidade, compreender, lembrar, julgar, coordenar, executar,
  aprender e continuar. É o **critério de avaliação de todas as decisões de
  produto e arquitectura** (ver _The New Product Test_: cada funcionalidade tem
  de aumentar compreensão, simplificar, melhorar o juízo, preservar
  continuidade e reduzir carga cognitiva — caso contrário, remove-se).
- [`DECIMA-PERSONAL-DECIMIN-v2.md`](DECIMA-PERSONAL-DECIMIN-v2.md) — **Personal
  Decimin (v2)**. A **versão mais recente** da visão do Personal Decimin — o
  _Chief of Staff_ pessoal que mantém continuidade cognitiva (modos internos,
  Conversation Watch, Pending Intelligence, Daily Briefing, Shadow Mode,
  Cognitive Load, relação com o Mission Engine e o Maestro). **Substitui a v1.**
  Documento de visão completo; a implementação actual segue o **ADR-0006 (v1
  scope)** e a v2 será faseada conforme a confiança no sistema cresce.
- [`DECIMA-WORKSPACE-v2.md`](DECIMA-WORKSPACE-v2.md) — **Foundational
  Architecture (v2)**. A referência de visão **em vigor**: Workspace como
  ambiente operativo, **DECIMA** como plataforma cognitiva, **DECIM001** como
  Cognitive Engine. Define Spaces, Projects, Sessions (Team/Private), Timeline,
  o pipeline de documentos, o AI Runtime, o Maestro, os Decimins e os princípios
  fundacionais (ownership, visibility, knowledge, learning, decimin).
- [`DECIMA-WORKSPACE-v1.md`](DECIMA-WORKSPACE-v1.md) — **Foundational
  Architecture (v1)**. A primeira articulação da arquitectura fundacional,
  mantida como registo histórico. A v2 estende-a e substitui-a como referência
  actual.
- [`DECIMA-LIVING-ARTIFACTS.md`](DECIMA-LIVING-ARTIFACTS.md) — **Living Artifacts
  Architecture**. Estende a visão ao tratamento de documentos: a DECIMA não gera
  ficheiros descartáveis, mantém **Living Artifacts** (objectos permanentes que
  evoluem por revisões), com integração Google Workspace, *templates*,
  *canonical Markdown* e o pipeline de ingestão.
- [`DECIMA-PERSONAL-DECIMIN.md`](DECIMA-PERSONAL-DECIMIN.md) — **Personal Decimin
  & Conversation Watch**. O companheiro cognitivo pessoal: organiza, pensa,
  prepara, acompanha e faz *follow-up*, garantindo que nada de importante
  desaparece entre conversas, grupos e canais. O **Conversation Watch** (grupos
  de Telegram como primeiro canal) detecta pedidos, compromissos, ficheiros
  prometidos e perguntas sem resposta, e encaminha sinais para o Space certo.
  Formalizado em [`../060-decisions/ADR-0006-personal-decimin-conversation-watch.md`](../060-decisions/ADR-0006-personal-decimin-conversation-watch.md).

A **v2** é a visão fundacional actual.

## Relação com outros documentos

- [`../010-philosophy/AT-0001-manifesto.md`](../010-philosophy/AT-0001-manifesto.md)
  — o Manifesto fundador (aprovado). A visão v2 é coerente com ele e dá-lhe
  vocabulário concreto (DECIMA, Spaces, Decimins…).
- [`../VISION.md`](../VISION.md) — resumo consolidado/derivado, para leitura
  rápida e ligação ao estado de implementação. A v2 é a fonte fundacional; a
  `VISION.md` é a síntese.
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — o que está implementado vs
  planeado face a esta visão.

## Nota

O documento v2 descreve a **arquitectura-alvo**. Boa parte (Spaces como conceito
de topo, Decimins, Maestro, pipeline de documentos, DECIM001) é **visão**, ainda
não implementada — ver `../ARCHITECTURE.md` e `../ROADMAP.md` para o estado real.
