---

id: AT-0009
title: Ontologia
version: v1.0
status: Draft
owner: Inês Gavinho
created: 2026-06-26
updated: 2026-06-26
depends_on:

* AT-0001

impacts:

* AT-0002
* AT-0003
* AT-0004
* AT-0005

---

# AT-0009 — Ontologia

## Propósito

Este documento define a ontologia do ATELIER.

A ontologia descreve a realidade que o sistema representa.

Não define tecnologia.

Não define base de dados.

Não define interface.

Define as entidades fundamentais do trabalho intelectual e as relações entre elas.

Todos os restantes documentos do ATELIER deverão utilizar esta linguagem.

## 1. Princípios

### 1.1

O ATELIER representa processos intelectuais.

Não representa software.

### 1.2

Toda a entidade existe porque representa uma realidade observável do processo de criação.

Nenhuma entidade deverá existir apenas para facilitar a implementação técnica.

### 1.3

Uma entidade pode possuir múltiplas representações.

A representação nunca altera a natureza da entidade.

### 1.4

As entidades relacionam-se entre si.

É das relações que emerge conhecimento.

## 2. Entidades Fundamentais

### 2.1 Iniciativa

Uma Iniciativa representa uma frente de trabalho contínua.

Pode durar dias ou décadas.

Exemplos:

* PAPERS
* DECIMA
* GAVINHO
* NUDO

Uma Iniciativa contém Objetivos.

Uma Iniciativa produz Conhecimento.

### 2.2 Objetivo

Um Objetivo representa um resultado concreto que uma Iniciativa pretende alcançar.

Exemplos:

* Publicar o Issue 005.
* Desenvolver o Mission Control.
* Lançar o Volume I do PAPERS.

Um Objetivo pode envolver vários Agentes.

Um Objetivo pode produzir vários Artefactos.

### 2.3 Agente

Um Agente representa uma função operacional.

Pode ser desempenhada por uma pessoa ou por Inteligência Artificial.

Exemplos:

* Direção Editorial
* Investigação
* Produção
* Comunicação
* Design

Os Agentes executam trabalho.

Não substituem julgamento.

### 2.4 Loop

Um Loop representa um processo repetível.

Exemplos:

* Editorial
* Investigação
* Produção
* Publicação

Um Loop transforma trabalho em resultado.

### 2.5 Artefacto

Um Artefacto representa qualquer resultado material produzido.

Exemplos:

* Paper
* Documento
* Código
* Prompt
* Imagem
* Página
* Apresentação
* Livro

Um Artefacto pode ser revisto, versionado e publicado.

### 2.6 Decisão

Uma Decisão representa uma escolha consciente que altera o estado de uma Iniciativa, Objetivo ou Artefacto.

As Decisões constituem património intelectual.

Devem preservar contexto.

### 2.7 Conhecimento

Conhecimento representa a compreensão acumulada pelo sistema.

Não corresponde a um documento.

Corresponde à rede de relações entre entidades.

O Conhecimento evolui continuamente.

### 2.8 Memória

A Memória preserva o historial do trabalho.

Inclui:

* observações;
* decisões;
* conversas;
* referências;
* artefactos;
* versões.

A Memória permite compreender não apenas o que aconteceu, mas porque aconteceu.

### 2.9 Aprovação

Uma Aprovação representa um ponto onde o julgamento humano é necessário.

Nenhum Agente pode ultrapassar uma Aprovação para a qual não possua autonomia.

### 2.10 Valor

Valor representa o resultado produzido pelo trabalho intelectual.

Pode assumir diferentes formas.

Exemplos:

* intelectual;
* económico;
* cultural;
* estratégico;
* humano.

O Valor constitui o resultado último do sistema.

## 3. Relações Fundamentais

As entidades relacionam-se segundo o seguinte modelo.

Uma Iniciativa contém um ou mais Objetivos.

Um Objetivo pode activar um ou mais Loops.

Um Loop mobiliza um ou mais Agentes.

Os Agentes produzem Artefactos.

Os Artefactos originam Decisões.

As Decisões enriquecem a Memória.

A Memória contribui para o Conhecimento.

O Conhecimento gera Valor.

O Valor reforça a Iniciativa.

O sistema constitui, assim, um ciclo contínuo de evolução.

## 4. Fluxo Fundamental

O fluxo principal do ATELIER é representado da seguinte forma.

```
Iniciativa

↓

Objetivo

↓

Loop

↓

Agente

↓

Artefacto

↓

Decisão

↓

Memória

↓

Conhecimento

↓

Valor
```

Este fluxo representa a transformação contínua de trabalho intelectual em impacto.

## 5. Estados

As entidades podem existir em diferentes estados.

Exemplos:

Draft

Em Curso

Em Revisão

Aprovado

Publicado

Arquivado

Cada entidade define os seus estados específicos na respetiva especificação funcional.

## 6. Identidade

Todas as entidades possuem:

* Identificador único.
* Data de criação.
* Data da última atualização.
* Autor ou responsável.
* Estado.
* Histórico de versões.

## 7. Evolução

A Ontologia do ATELIER é evolutiva.

Novas entidades poderão ser introduzidas quando representarem uma realidade do trabalho intelectual que não possa ser descrita pelas entidades existentes.

Nenhuma entidade deverá ser criada por conveniência técnica.

## Changelog

### v1.0

Primeira versão da Ontologia do ATELIER.
