# Refatoração da Página de Formulários

## Resumo das Mudanças

### 1. **Tipos e Interfaces** (`src/types/forms/`)

- **`form.ts`**: Novo modelo de dados com suporte a:

  - Tipos de pergunta: `shortText`, `paragraph`, `rating`, `multipleChoice`, `checkbox`, `select`, `fileUpload`
  - Propriedades obrigatórias e opcionais
  - Formulários com `tipo: 'interno' | 'cadastroPsel'`
  - Validações integradas para PSEL

- **`form-repository.ts`**: Interface com métodos:
  - `listFormsByType(tipo)` - Listar formulários por tipo
  - `getFormById(id)` - Obter formulário específico
  - `createForm(input)` - Criar novo formulário
  - `updateForm(id, input)` - Editar formulário
  - `deleteForm(id)` - Deletar formulário

### 2. **Repository** (`src/repositories/`)

- **`formRepository.ts`**: Acesso ao banco com Firestore

  - Colecção: `formularios`
  - Suporta filtros por tipo
  - Geração automática de slug
  - Timestamps de `criadoEm` e `atualizadoEm`

- **`candidateRepository.ts`** (atualizado):
  - Agora recupera formulários cadastroPsel do novo fluxo
  - Fallback para formulários antigos (compatibilidade)
  - Mapeador de tipos de resposta

### 3. **Service** (`src/services/`)

- **`formService.ts`**: Regras de negócio
  - `getFormsByType()` - Recuperar formulários
  - `createForm()` - Criar novo
  - `updateForm()` - Editar
  - `deleteForm()` - Deletar
  - `validatePselForm()` - Validar campos obrigatórios PSEL
  - `validateFormSubmission()` - Validar respostas preenchidas
  - `ensurePselRequiredQuestions()` - Garantir perguntas obrigatórias

### 4. **Página** (`src/app/dashboard/formularios/page.tsx`)

- **Estado gerenciado**:

  - Lista de formulários (`forms`)
  - Formulário em edição/criação
  - Perguntas candidatas com ID temporário
  - Modo de edição com suporte a múltiplas ações

- **Funcionalidades**:

  - ✅ Criar novo formulário
  - ✅ Editar formulário existente
  - ✅ Deletar formulário
  - ✅ Adicionar/remover perguntas
  - ✅ Validação PSEL integrada
  - ✅ Validação de campos obrigatórios
  - ✅ Carregamento automático ao montar

- **UI/UX Responsivo**:
  - Layout grid: 1 coluna (mobile) → 3 colunas (desktop)
  - Painel de criação sticky no topo (desktop)
  - Cards compactos para perguntas e formulários
  - Escala de fonte adaptativa
  - Labels e placeholders otimizados para mobile
  - ScrollArea para listas longas
  - Transições suaves e feedback visual

## Estrutura de Dados

### Form

```typescript
{
  id: string;
  nome: string;
  descricao?: string;
  tipo: 'interno' | 'cadastroPsel';
  slug: string;
  perguntas: FormQuestion[];
  ativa: boolean;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}
```

### FormQuestion

```typescript
{
  id: string;
  titulo: string;
  tipo: FormQuestionType;
  obrigatoria: boolean;
  descricao?: string;
  opcoes?: { minima?: number; maxima?: number };
  items?: Array<{ id: string; valor: string }>;
}
```

## Validação

### PSEL Required Fields

Os campos obrigatórios para cadastroPsel estão definidos em `PSEL_REQUIRED_FIELD_TITLES`:

- Nome, Sobrenome, Curso, Periodo
- Telefone, Email, Instagram
- Origem PSEL, O que te move, Por que WATT
- Tamanho camisa, CV, Histórico, Imagem

### Regras de Negócio

- ✅ Formulários de tipo `cadastroPsel` devem ter todas as perguntas obrigatórias
- ✅ Ao enviar resposta, perguntas marcadas como `obrigatoria: true` devem estar preenchidas
- ✅ Não é possível editar o tipo após criar
- ✅ IDs de perguntas temporários durante criação, persistem após salvar

## Persistência

- **Firestore Collection**: `formularios`
- **Índices recomendados**: `tipo`, `atualizadoEm`
- **Migration**: Apenas novos formulários usam novo modelo
  - Formulários antigos (ehFormularioPsel) mantêm compatibilidade

## Próximos Passos (Opcional)

1. Implementar validação de regex customizado para campos
2. Adicionar suporte a upload de arquivo na página
3. Criar página pública para responder formulários
4. Dashboard de respostas com análise estatística
5. Export de dados (CSV/PDF)
