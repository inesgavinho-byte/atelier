---

id: AT-0005
title: Agent Architecture
version: v1.0
status: Draft
owner: Inês Gavinho
created: 2026-06-26
updated: 2026-06-26
depends_on:

* AT-0001
* AT-0002
* AT-0003
* AT-0006
* AT-0009

impacts:

* AT-0004

---

# AT-0005 — Agent Architecture

## Propósito

Este documento define a arquitetura dos Agentes do ATELIER.

Os Agentes constituem a capacidade operacional do sistema.

Representam funções.

Nunca representam modelos de Inteligência Artificial específicos.

A tecnologia pode evoluir.

A arquitetura permanece.

---

# 1. Princípios

## 1.1

Cada Agente possui uma missão claramente definida.

---

## 1.2

Cada Agente pertence a um Office.

---

## 1.3

Os Agentes colaboram.

Nunca trabalham isoladamente.

---

## 1.4

Os Agentes não competem entre si.

Complementam-se.

---

## 1.5

Nenhum Agente possui autoridade estratégica.

O julgamento pertence sempre ao utilizador.

---

# 2. Estrutura

Cada Agente possui obrigatoriamente:

* Identificador
* Nome
* Office
* Missão
* Responsabilidades
* Inputs
* Outputs
* Ferramentas
* Limites
* Nível de autonomia
* Estado

---

# 3. Offices

Os Agentes distribuem-se pelos seguintes Offices.

Editorial

Research

Production

Design

Communications

Knowledge

Operations

---

# 4. Missão

Cada Agente deverá responder apenas a uma missão principal.

Missões demasiado abrangentes deverão ser divididas em novos Agentes.

---

# 5. Inputs

Os Inputs representam tudo aquilo que um Agente necessita para iniciar trabalho.

Exemplos:

* documentos;
* decisões;
* objetivos;
* artefactos;
* pedidos;
* contexto.

---

# 6. Outputs

Todo o trabalho de um Agente produz Outputs.

Exemplos:

* documentos;
* recomendações;
* código;
* imagens;
* relatórios;
* decisões propostas.

---

# 7. Ferramentas

Cada Agente poderá utilizar diferentes ferramentas.

Exemplos:

* LLMs;
* motores de pesquisa;
* GitHub;
* Supabase;
* Netlify;
* Microsoft 365.

As ferramentas não fazem parte da identidade do Agente.

---

# 8. Limites

Cada Agente possui limites explícitos.

Exemplos:

* não publicar;
* não eliminar;
* não aprovar;
* não alterar documentos constitucionais;
* não alterar identidade visual.

---

# 9. Autonomia

Todos os Agentes possuem um nível de autonomia.

## Nível 0

Observa.

---

## Nível 1

Analisa.

---

## Nível 2

Propõe.

---

## Nível 3

Executa.

---

## Nível 4

Executa autonomamente dentro de regras definidas.

---

## Nível 5

Coordena outros Agentes.

Nenhum nível substitui julgamento humano.

---

# 10. Colaboração

Um Agente pode solicitar trabalho a outro Agente.

Todas as solicitações deverão preservar contexto.

O histórico de colaboração deverá permanecer registado.

---

# 11. Memória

Os Agentes não possuem memória privada.

Todos aprendem através da Memória comum do ATELIER.

A memória constitui património partilhado.

---

# 12. Comunicação

Toda a comunicação entre Agentes deverá ser estruturada.

Cada mensagem deverá conter:

* origem;
* destino;
* objetivo;
* contexto;
* artefactos relacionados;
* estado.

---

# 13. Supervisão

O utilizador poderá:

* interromper;
* redirecionar;
* aprovar;
* rejeitar;
* reiniciar.

qualquer trabalho em qualquer momento.

---

# 14. Evolução

Novos Agentes poderão ser criados.

Um novo Agente apenas deverá existir quando representar uma função permanente da organização.

Nunca para responder a uma tarefa temporária.

---

# 15. Neutralidade Tecnológica

Um Agente poderá mudar de modelo de IA sem alterar:

* missão;
* responsabilidades;
* relações;
* identidade.

A arquitetura deverá garantir esta independência.

---

# Changelog

## v1.0

Primeira versão da arquitetura de Agentes do ATELIER.
