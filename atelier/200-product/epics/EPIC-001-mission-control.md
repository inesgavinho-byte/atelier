---

id: EPIC-001
title: Mission Control
version: v1.0
status: Draft
owner: Inês Gavinho
created: 2026-06-26
updated: 2026-06-26
depends_on:

* AT-0001
* AT-0002
* AT-0003
* AT-0004
* AT-0005
* AT-0006
* AT-0009

---

# EPIC-001 — Mission Control

## Propósito

O Mission Control constitui o ponto de entrada do ATELIER.

É o primeiro ecrã apresentado ao utilizador.

Não é um dashboard.

É o centro de decisão do sistema.

Todo o trabalho diário deverá poder iniciar-se a partir deste ecrã.

---

# Objetivos

O Mission Control deverá permitir ao utilizador compreender, em poucos segundos:

* o que exige decisão;
* o que está a decorrer;
* o que mudou;
* o que merece atenção;
* onde deverá investir tempo.

O Mission Control deverá reduzir a necessidade de navegar pelo sistema.

---

# Princípios

O Mission Control não apresenta métricas apenas porque existem.

Toda a informação apresentada deverá responder a uma ação possível.

A informação é apresentada por relevância.

Não por módulo.

---

# Estrutura

O Mission Control organiza-se em sete áreas.

---

## 1. Hoje

Resumo do estado atual.

Exemplo:

Bom dia, Inês.

Hoje existem:

* 2 decisões pendentes.
* 4 agentes em execução.
* 1 publicação pronta.
* 3 objetivos em risco.

---

## 2. Decisões

Lista todas as decisões que exigem julgamento humano.

Cada decisão apresenta:

* prioridade;
* contexto;
* iniciativa;
* agente responsável;
* impacto;
* ação recomendada.

Ações possíveis:

* Aprovar.
* Rejeitar.
* Adiar.
* Pedir revisão.

---

## 3. Agentes

Mostra o estado operacional dos agentes.

Para cada agente:

* estado;
* tarefa atual;
* autonomia;
* progresso;
* último evento.

O utilizador poderá:

* interromper;
* delegar;
* alterar prioridade.

---

## 4. Iniciativas

Apresenta apenas as iniciativas ativas.

Exemplo:

PAPERS

DECIMA

GAVINHO

NUDO

Cada iniciativa apresenta:

* progresso;
* objetivos ativos;
* decisões pendentes;
* atividade recente.

---

## 5. Atividade

Linha cronológica.

Regista acontecimentos relevantes.

Exemplos:

Novo Paper criado.

Deploy concluído.

Publicação aprovada.

Investigação terminada.

Nova referência adicionada.

---

## 6. Captura

Botão permanente.

Sempre visível.

Permite adicionar imediatamente:

* texto;
* áudio;
* imagem;
* PDF;
* URL;
* email;
* nota rápida.

O sistema trata posteriormente da organização.

O utilizador não escolhe destino nesta fase.

---

## 7. Próxima Ação

O ATELIER identifica qual deverá ser a próxima ação de maior impacto.

Não é uma tarefa.

É uma recomendação.

Exemplo:

"Aprovar o Issue 005 do PAPERS."

ou

"Rever a proposta do Agent Design."

---

# Critérios de Prioridade

O Mission Control deverá ordenar informação segundo a seguinte prioridade:

1. Decisões pendentes.
2. Bloqueios.
3. Objetivos em risco.
4. Trabalho em execução.
5. Atividade recente.
6. Informação histórica.

---

# Interação

O utilizador deverá conseguir realizar as ações principais sem mudar de página.

Sempre que possível:

* aprovar;
* comentar;
* delegar;
* abrir contexto.

---

# Pesquisa

O Mission Control inclui pesquisa global.

A pesquisa deverá abranger:

* iniciativas;
* objetivos;
* agentes;
* artefactos;
* memória;
* documentos constitucionais.

---

# Critérios de Qualidade

O Mission Control será considerado concluído quando:

* reduzir significativamente a navegação;
* permitir iniciar qualquer sessão de trabalho a partir deste ecrã;
* apresentar apenas informação acionável;
* preservar simplicidade visual;
* respeitar todos os princípios constitucionais.

---

# Fora de Âmbito

O Mission Control não substitui:

* a gestão detalhada de iniciativas;
* a edição de documentos;
* a gestão da memória;
* a configuração do sistema.

Constitui apenas o centro operacional.

---

# Dependências

* Constituição do ATELIER.
* Sistema de Aprovações.
* Agentes.
* Memória.
* Iniciativas.
* Objetivos.

---

# Funcionalidades Derivadas

Este Epic origina, entre outras, as seguintes Features:

* FEATURE-001 — Resumo Diário
* FEATURE-002 — Centro de Decisões
* FEATURE-003 — Estado dos Agentes
* FEATURE-004 — Iniciativas Ativas
* FEATURE-005 — Timeline
* FEATURE-006 — Captura Universal
* FEATURE-007 — Pesquisa Global
* FEATURE-008 — Próxima Ação

---

# Changelog

## v1.0

Primeira versão do Epic Mission Control.
