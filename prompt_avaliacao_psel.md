# Prompt para implementação de avaliação por etapa do PSEL

Quero que você implemente uma nova funcionalidade no meu aplicativo para o **Processo Seletivo (PSEL)**, respeitando **rigorosamente a arquitetura da aplicação**, especialmente a separação entre:

- **Repositories**: toda lógica de acesso e consulta ao banco
- **Services**: toda lógica de negócio, validações e regras
- **Pages / Components**: apenas renderização, interação visual e delegação para services, sem lógica de negócio acoplada

## Objetivo da funcionalidade

Criar uma funcionalidade que permita que **todos os membros com a tag `psel`** possam submeter **avaliações pontuais** para os candidatos do processo seletivo.

Cada avaliação deve ser do tipo:

- `"positivo"`
- `"negativo"`

Além disso, deve existir a possibilidade de **registrar faltas**. Usuários com role:

- `Assessor`
- `Presidente`
- `Diretor`

devem poder marcar candidatos como **faltosos** em uma etapa específica. Quando isso acontecer, o candidato deve ter `status = 'faltou'` dentro de `avaliacaoEtapas` naquela etapa e **não deve ser considerado na votação nem nos resultados consolidados daquela etapa**.

Essas avaliações devem ficar armazenadas **dentro do documento do candidato**, na chave:

```ts
avaliacaoEtapas
```

Cada etapa deve ser identificada com base no documento:

```txt
GlobalInfo/etapasPsel
```

Esse documento possui uma estrutura semelhante a:

```ts
{
  dinamicaDeGrupos: {
    data: Timestamp
  },
  entrevistas: {
    data: Timestamp
  }
}
```

A imagem anexada mostra um exemplo onde existe uma etapa `dinamicaDeGrupos` com uma data limite.

---

## Regras de negócio

### 1. Permissão de acesso para avaliação
A funcionalidade de votação deve estar disponível **somente para membros com a tag `psel`**.

### 2. Permissão de acesso para registrar faltas
A funcionalidade de registrar faltas deve estar disponível **somente para usuários cujo role seja `Assessor`, `Presidente` ou `Diretor`**.

### 3. Etapas dinâmicas
As etapas do PSEL **não devem ser hardcoded**. Elas devem ser buscadas dinamicamente a partir de:

```txt
GlobalInfo/etapasPsel
```

### 4. Bloqueio por prazo
A avaliação de uma etapa só pode ser feita **até o horário limite definido em `GlobalInfo/etapasPsel.{etapa}.data`**.

Depois do prazo:
- o usuário não pode mais votar naquela etapa
- o usuário não pode mais registrar faltas naquela etapa
- a interface deve refletir visualmente que a etapa foi encerrada
- o service deve impedir submissões mesmo que tentem burlar pela interface

### 5. Armazenamento no candidato
As avaliações devem ser salvas no documento do candidato em uma estrutura escalável e organizada dentro de:

```ts
avaliacaoEtapas
```

Sugestão de formato:

```ts
avaliacaoEtapas: {
  dinamicaDeGrupos: {
    status?: 'ativo' | 'faltou'
    votos: {
      [memberId: string]: {
        tipo: 'positivo' | 'negativo'
        createdAt: Timestamp
        avaliadorId: string
        avaliadorNome?: string
      }
    }
    falta?: {
      registrada: boolean
      registradaPorId: string
      registradaPorNome?: string
      createdAt: Timestamp
    }
    resumo: {
      positivos: number
      negativos: number
      total: number
      saldo: number
    }
  }
}
```

### 6. Um voto por etapa por avaliador
Cada membro com tag `psel` pode votar **uma única vez por candidato em cada etapa**.

Se fizer novo voto para o mesmo candidato na mesma etapa:
- deve sobrescrever o voto anterior daquele avaliador para aquela etapa
- o resumo deve ser recalculado corretamente

### 7. Regra de falta
Quando um candidato for marcado como faltoso em uma etapa:
- `avaliacaoEtapas.{etapa}.status` deve ficar como `'faltou'`
- ele não deve receber novos votos naquela etapa
- votos já existentes naquela etapa devem ser desconsiderados do resultado consolidado
- idealmente, a interface de votação deve nem exibir candidatos com status `'faltou'` para aquela etapa
- a tela de resultados deve exibir claramente que aquele candidato **faltou**
- deve existir possibilidade de desfazer a falta, caso necessário, desde que ainda esteja dentro do prazo da etapa

### 8. Resumo consolidado
A cada avaliação, o sistema deve manter ou recalcular os agregados:

- quantidade de positivos
- quantidade de negativos
- total
- saldo (`positivos - negativos`)

Importante:
- candidatos com `status = 'faltou'` **não devem entrar no ranking, ordenações numéricas ou consolidações competitivas**
- eles podem aparecer na listagem, mas identificados como **faltou**
- se aparecerem nos resultados, devem ficar separados ou claramente sinalizados

---

## Interface desejada

Quero uma interface **funcional, moderna, agradável visualmente, responsiva e compatível com dispositivos móveis**.

### Fluxo da interface de votação
A experiência deve funcionar como um sistema de avaliação por swipe/card, semelhante a apps de arrastar cartões.

Para cada candidato:
- exibir **foto**
- exibir **nome**
- opcionalmente exibir curso, período ou informação complementar se já existir no modelo

### Interação principal
O avaliador deverá votar por meio de gesto de arraste:

- **arrastar para a esquerda** → voto `"positivo"`
- **arrastar para a direita** → voto `"negativo"`

> Siga exatamente esse comportamento, mesmo que seja contra o padrão comum de alguns apps.

Também quero fallback para desktop e acessibilidade:
- botões visíveis de **Positivo** e **Negativo**
- feedback visual forte durante o arrasto
- animações suaves
- indicador textual do voto sendo selecionado enquanto arrasta
- após votar, avançar automaticamente para o próximo candidato

### Interface de registro de faltas
Além da interface de votação, quero uma funcionalidade para registrar faltas de forma prática.

Para usuários com role permitido (`Assessor`, `Presidente`, `Diretor`), deve existir uma interface onde seja possível:
- selecionar a etapa
- visualizar os candidatos
- marcar/desmarcar falta
- confirmar ação com feedback visual claro
- ver facilmente quais já foram marcados como faltosos

Essa interface também deve ser:
- responsiva
- agradável visualmente
- simples e rápida para uso em celular

### Requisitos visuais
A interface deve ser:
- limpa
- intuitiva
- mobile-first
- rápida
- com boa hierarquia visual
- agradável para uso em celular

Pode usar componentes já existentes do projeto se houver consistência visual.  
Se fizer sentido, usar animações com `framer-motion` ou solução equivalente.

---

## Exibição dos resultados

Quero que o resultado dessas avaliações apareça em uma **nova aba dentro da aba de resultados**.

### Nessa nova aba de resultados deve ser possível:
- selecionar a etapa do PSEL
- visualizar todos os candidatos
- ver para cada candidato:
  - nome
  - foto
  - positivos
  - negativos
  - total
  - saldo
  - status da etapa (`ativo` ou `faltou`)
- ordenar por:
  - saldo
  - positivos
  - negativos
  - nome
- filtrar por etapa

### Comportamento dos faltosos nos resultados
- candidatos com `status = 'faltou'` não devem participar do ranking principal
- devem aparecer como **faltou**
- podem ser exibidos em uma seção separada ou no final da lista com destaque visual apropriado
- seus totais de votação não devem influenciar médias, rankings ou classificação numérica

Se possível, incluir:
- cards no mobile
- tabela no desktop
- indicadores visuais claros para saldo positivo/negativo
- badge/label para **faltou**

---

## Requisitos técnicos e arquiteturais

### Separação obrigatória de camadas

#### Repositories
Devem conter exclusivamente:
- leitura do documento `GlobalInfo/etapasPsel`
- leitura dos candidatos elegíveis ao PSEL
- leitura/gravação das avaliações em cada candidato
- leitura/gravação do status de falta por etapa
- consultas para consolidação dos resultados

Exemplos esperados:
- `getPselStages()`
- `getCandidatesForStageEvaluation()`
- `submitCandidateStageEvaluation()`
- `markCandidateStageAbsence()`
- `unmarkCandidateStageAbsence()`
- `getStageEvaluationResults()`

#### Services
Devem conter:
- validação se o usuário possui tag `psel`
- validação se o usuário pode registrar falta pelo role
- validação se a etapa existe
- validação do prazo da etapa
- validação do tipo de voto
- regra de um voto por membro por etapa por candidato
- bloqueio de voto para candidatos faltosos
- regra de registrar/desfazer falta
- cálculo/recalculo do resumo da etapa
- transformação de dados para consumo da interface
- tratamento de erros de negócio

Exemplos esperados:
- `canUserEvaluateStage(...)`
- `canUserRegisterAbsence(...)`
- `evaluateCandidateInStage(...)`
- `registerCandidateAbsenceInStage(...)`
- `removeCandidateAbsenceInStage(...)`
- `getAvailableStagesForEvaluation(...)`
- `getStageResults(...)`

#### UI / Pages / Components
Devem conter apenas:
- renderização
- gerenciamento de estado visual
- interação de swipe
- chamadas aos services
- loading/error/success states

### Importante
- **Não colocar regra de negócio diretamente em componentes**
- **Não acessar banco diretamente nas páginas**
- **Não duplicar lógica entre componentes e services**
- seguir o padrão já existente no projeto

---

## Requisitos de modelagem

Se necessário, crie ou ajuste tipos/interfaces.  
Quero tipagem forte com TypeScript.

Sugestões:

```ts
type PselStageVoteType = 'positivo' | 'negativo';
type CandidateStageStatus = 'ativo' | 'faltou';

interface PselStageInfo {
  data: Timestamp;
}

interface CandidateStageEvaluationVote {
  tipo: PselStageVoteType;
  createdAt: Timestamp;
  avaliadorId: string;
  avaliadorNome?: string;
}

interface CandidateStageAbsenceInfo {
  registrada: boolean;
  registradaPorId: string;
  registradaPorNome?: string;
  createdAt: Timestamp;
}

interface CandidateStageEvaluationSummary {
  positivos: number;
  negativos: number;
  total: number;
  saldo: number;
}

interface CandidateStageEvaluation {
  status?: CandidateStageStatus;
  votos: Record<string, CandidateStageEvaluationVote>;
  falta?: CandidateStageAbsenceInfo;
  resumo: CandidateStageEvaluationSummary;
}

interface CandidateAvaliacoesEtapas {
  [stageKey: string]: CandidateStageEvaluation;
}
```

---

## Requisitos de UX

- loading state elegante
- empty state quando não houver etapa disponível
- empty state quando não houver candidatos
- mensagem de etapa encerrada
- mensagem de sucesso ao votar
- mensagem de sucesso ao registrar/desfazer falta
- prevenção contra múltiplos cliques/submissões simultâneas
- feedback claro em erro de permissão ou prazo expirado
- feedback claro quando o candidato estiver marcado como faltoso

---

## Requisitos de implementação

Quero que você entregue:

1. **Estrutura da solução**
   - quais arquivos criar/alterar
   - responsabilidades de cada camada

2. **Tipos e interfaces necessários**

3. **Repository completo**

4. **Service completo**

5. **Componentes de UI necessários**
   - tela de avaliação por swipe
   - componente de card do candidato
   - interface para registrar faltas
   - nova aba de resultados

6. **Integração com a aba de resultados existente**

7. **Boas práticas**
   - tratamento de erro
   - loading states
   - responsividade
   - tipagem forte

8. **Código pronto para uso**, evitando pseudocódigo sempre que possível

---

## Restrições e cuidados

- não quebrar funcionalidades existentes
- não refatorar partes não relacionadas
- manter consistência com o padrão atual do projeto
- evitar gambiarra
- evitar lógica duplicada
- usar nomes claros e sem ambiguidade
- considerar que os dados são persistidos no banco já utilizado pela aplicação
- a solução deve ser escalável para múltiplas etapas futuras do PSEL

---

## Resultado esperado

Ao final, quero ter:

- uma tela onde membros com tag `psel` avaliam candidatos por swipe
- votos salvos por etapa dentro do candidato
- bloqueio automático por prazo da etapa
- possibilidade de registrar faltas por usuários autorizados
- candidatos faltosos excluídos da votação da etapa
- consolidação dos resultados por etapa
- uma nova aba visualizando os resultados dessas avaliações
- tudo implementado respeitando **repositories + services + UI desacoplada**
