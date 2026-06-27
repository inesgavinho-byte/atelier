---

id: AT-0004
title: Product Specification
version: v1.0
status: Draft
owner: Inês Gavinho
created: 2026-06-26
updated: 2026-06-26
depends_on:

* AT-0001
* AT-0002
* AT-0003
* AT-0005
* AT-0006
* AT-0009

impacts:

* Development

---

# AT-0004 — Product Specification

## Propósito

Este documento define o produto ATELIER.

O seu objetivo é transformar a Constituição do sistema numa especificação suficientemente clara para permitir implementação contínua.

Todas as decisões técnicas deverão respeitar este documento.

---

# 1. Objetivo

O ATELIER é o ambiente operacional onde decorre todo o trabalho intelectual do utilizador.

O sistema deverá permitir:

* pensar;
* organizar;
* decidir;
* criar;
* executar;
* publicar;
* aprender.

---

# 2. Utilizador

O primeiro utilizador do ATELIER é Inês Gavinho.

Todas as decisões de produto deverão privilegiar profundidade de utilização em detrimento de generalização.

---

# 3. Estrutura Geral

O produto organiza-se em cinco níveis.

Constituição

↓

Iniciativas

↓

Objetivos

↓

Loops

↓

Artefactos

Todos os restantes elementos existem para suportar esta estrutura.

---

# 4. Constituição

A Constituição representa a fonte oficial de verdade do sistema.

Todos os documentos constitucionais são armazenados no repositório.

O produto deverá renderizar diretamente estes documentos.

Nunca deverão existir cópias.

---

# 5. Iniciativas

Cada Iniciativa representa uma frente permanente de trabalho.

Cada Iniciativa possui:

* identidade;
* objetivos;
* artefactos;
* agentes;
* memória;
* atividade.

---

# 6. Objetivos

Cada Objetivo representa um resultado concreto.

O sistema deverá permitir acompanhar:

* estado;
* progresso;
* responsáveis;
* aprovações;
* impacto.

---

# 7. Agentes

O produto deverá permitir:

* visualizar agentes;
* acompanhar estado;
* acompanhar autonomia;
* consultar histórico;
* delegar trabalho;
* interromper execução.

---

# 8. Artefactos

Todo o conteúdo produzido deverá ser tratado como Artefacto.

Cada Artefacto deverá possuir:

* identificação;
* versões;
* relações;
* autor;
* histórico;
* estado.

---

# 9. Memória

A Memória constitui um dos módulos centrais do produto.

Deverá permitir:

* pesquisa;
* relações;
* histórico;
* contexto;
* referências.

---

# 10. Aprovações

Todas as decisões relevantes deverão passar pelo módulo de Aprovações.

O sistema deverá identificar automaticamente:

* pendentes;
* aprovadas;
* rejeitadas;
* expiradas.

---

# 11. Interface

A interface deverá privilegiar:

* simplicidade;
* legibilidade;
* foco;
* continuidade.

A interface nunca deverá competir com o conteúdo.

---

# 12. Navegação

A navegação deverá organizar-se por áreas de trabalho.

Nunca por funcionalidades técnicas.

---

# 13. Pesquisa

A pesquisa deverá abranger:

* artefactos;
* memória;
* decisões;
* agentes;
* iniciativas;
* objetivos;
* documentos constitucionais.

---

# 14. Versionamento

Todos os Artefactos deverão manter histórico de versões.

Nenhuma alteração deverá eliminar informação anterior.

---

# 15. Auditoria

Toda a atividade deverá permanecer registada.

Incluindo:

* quem;
* quando;
* porque;
* impacto.

---

# 16. Integrações

O produto deverá suportar integração com serviços externos.

As integrações nunca deverão alterar a arquitetura do sistema.

---

# 17. Segurança

Toda a informação deverá possuir níveis de acesso definidos.

O sistema deverá preservar integridade documental.

---

# 18. Escalabilidade

O produto deverá permitir crescimento sem necessidade de alterar os princípios constitucionais.

---

# 19. Critério de Qualidade

Uma funcionalidade apenas poderá ser considerada concluída quando:

* respeitar a Constituição;
* respeitar a Ontologia;
* respeitar o Canon;
* integrar-se naturalmente na Organização;
* manter simplicidade.

---

# Changelog

## v1.0

Primeira versão da especificação funcional do produto.
