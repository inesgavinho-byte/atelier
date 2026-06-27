# 300 — Knowledge Layer (Biblioteca de Conhecimento)

A Knowledge Layer **não é documentação**. É o **sistema operativo intelectual** do ATELIER — a memória permanente que alimentará cada Agente e cada LLM.

O seu propósito é **transformar informação em raciocínio reutilizável**.

> Os Agentes nunca leem livros diretamente.
> Os Agentes raciocinam através de **Skills**.
> As Skills são construídas a partir de **Princípios**.
> Os Princípios têm origem em **Fontes**.

A Knowledge Layer pertence ao ATELIER. Os LLMs são temporários. O conhecimento é permanente.

---

## Fluxo do conhecimento

O conhecimento percorre o sistema sempre nesta ordem. Nada deve contornar esta cadeia.

```
Fontes (Sources)
↓
Princípios (Principles)
↓
Skills
↓
Playbooks
↓
Agentes
↓
Decisões
↓
Projetos
↓
Resultados (Outputs)
```

---

## Estrutura

| Pasta | Função |
| ----- | ------ |
| `000-index/` | Índice-mestre da biblioteca (`INDEX-SOURCES.md`, `INDEX-PRINCIPLES.md`, `INDEX-SKILLS.md`, `INDEX-PLAYBOOKS.md`). Gerados automaticamente mais tarde. |
| `010-sources/` | Conhecimento original: livros, artigos, papers, vídeos, podcasts, entrevistas, documentos internos. **Nunca reescrever nem resumir aqui** — só material original. |
| `020-principles/` | A pasta mais importante. Cada princípio é **atómico**: uma ideia, um ficheiro. |
| `030-skills/` | Sistemas de raciocínio operacional (Estratégia, Editorial, Arquitetura, Investigação, Negociação, Liderança, Comunicação, Escrita, Investimento). Cada Skill combina vários Princípios. |
| `040-playbooks/` | Procedimentos de execução (Escrever um Paper, Lançar um Issue, Rever Arquitetura, Preparar reunião de investidores, Recrutar, Publicar no LinkedIn, Rever Pull Request, Responder a cliente). |
| `050-frameworks/` | Frameworks de pensamento (SWOT, OODA, Cinco Forças de Porter, JTBD, Cynefin, Modelos Mentais, Pensamento de segunda ordem). |
| `060-prompts/` | Prompts reutilizáveis. **Apenas modelos** — sem conversas, sem resultados. |
| `070-references/` | Bibliografias, autores, citações, referências cruzadas, investigação, ligações externas. |
| `080-taxonomy/` | A ontologia da Knowledge Layer: tipos de conhecimento, tags, relações, regras de classificação, convenções de nomenclatura, definições de metadados. |

---

## Princípios (`020-principles/`)

Cada princípio é atómico e deve conter:

- **ID**
- **Título**
- **Enunciado** (Statement)
- **Significado** (Meaning)
- **Aplicações**
- **Fonte**
- **Princípios relacionados**
- **Skills relacionadas**
- **Projetos relacionados**

Subpastas por origem:

| Subpasta | Origem |
| -------- | ------ |
| `books/` | Princípios extraídos de livros. |
| `ines/` | Princípios originados em Inês Gavinho — **Princípios Fundadores**. |
| `gavinho/` | Princípios internos desenvolvidos dentro da GAVINHO. |
| `papers/` | Princípios desenvolvidos através do PAPERS. |
| `design/` | Princípios de arquitetura e design. |
| `business/` | Princípios de negócio. |
| `technology/` | Princípios de tecnologia. |

### Precedência

Sempre que houver conflito entre um princípio genérico e um **Princípio de Inês** (`ines/`), o Princípio de Inês **prevalece**.

### Documento fundador

- **PRINCIPLES-0000 — A Filosofia dos Princípios** (`020-principles/PRINCIPLES-0000-filosofia-dos-principios.md`) — define o que é um Princípio. Todo o conhecimento desta camada evolui a partir desta definição.

### Princípios Fundadores (`ines/`)

- **PRINCIPLE-0001 — O software deve adaptar-se ao trabalho**
- **PRINCIPLE-0002 — Primeiro executar. Melhorar depois da utilização real.**
- **PRINCIPLE-0003 — O conhecimento vive nas relações, não nos documentos.**
- **PRINCIPLE-0004 — O contexto pertence ao ATELIER, não à ferramenta.**
- **PRINCIPLE-0005 — O verdadeiro ativo é a biblioteca de pensamento.**

---

## Estado

Estrutura criada e a receber conhecimento real. O primeiro documento — `PRINCIPLES-0000 — A Filosofia dos Princípios` — define a natureza dos Princípios. Os princípios concretos serão acrescentados às subpastas de `020-principles/` por origem.
