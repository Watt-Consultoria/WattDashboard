import type IInterviewScriptRepository from '@/types/interview/interview-script';
import type { InterviewQuestion } from '@/types/interview/interview-script';

/**
 * Repositório estático do roteiro de entrevista da Watt Consultoria.
 *
 * Responsabilidade única: fornecer os dados brutos das perguntas.
 * Nenhuma regra de negócio deve residir aqui.
 */
class InterviewScriptRepository implements IInterviewScriptRepository {
  private readonly questions: InterviewQuestion[] = [
    // ── PESSOAL ──────────────────────────────────────────────────────────────
    {
      id: 'q-01',
      section: 'PESSOAL',
      order: 1,
      question: 'Me conta um pouquinho sobre você. O que te trouxe até aqui?',
      tipsForInterviewer: [
        'Deixe o candidato falar livremente — observe naturalidade e comunicação.',
        'Preste atenção em quais aspectos da própria vida ele destaca primeiro.',
        'Esteja atento à clareza com que se apresenta e ao entusiasmo ao falar de si.'
      ],
      whatToObserve:
        'Comunicação, autoconhecimento básico e motivação inicial para estar no processo seletivo.',
      exampleFollowUps: ['O que exatamente te chamou atenção na Watt?']
    },

    // ── AUTOCONHECIMENTO ─────────────────────────────────────────────────────
    {
      id: 'q-02',
      section: 'AUTOCONHECIMENTO',
      order: 2,
      question:
        'Liste 3 pontos fortes seus e em que momentos isso se evidenciou.',
      tipsForInterviewer: [
        'Peça exemplos concretos — não aceite apenas adjetivos genéricos.',
        'Observe se o candidato consegue conectar o ponto forte a uma situação real.',
        'Avalie a autoconsciência: os pontos listados são coerentes com o perfil apresentado?'
      ],
      whatToObserve:
        'Autoconhecimento, capacidade de dar exemplos concretos e coerência entre discurso e perfil.',
      exampleFollowUps: [
        'Pode me dar um exemplo mais específico de quando isso aconteceu?'
      ]
    },
    {
      id: 'q-03',
      section: 'AUTOCONHECIMENTO',
      order: 3,
      question: 'Agora liste 3 pontos de melhoria.',
      tipsForInterviewer: [
        'Observe se o candidato consegue falar de fraquezas reais ou apenas fraquezas "disfarçadas de virtudes".',
        'Preste atenção em como ele lida com a vulnerabilidade — isso diz muito sobre maturidade.',
        'Se os pontos parecerem vagos, aprofunde com "O que você já fez para trabalhar nisso?"'
      ],
      whatToObserve:
        'Honestidade, maturidade emocional e consciência das próprias limitações.',
      exampleFollowUps: [
        'O que você já fez para trabalhar nesse ponto?',
        'Esse ponto já te impactou em alguma situação específica?'
      ]
    },

    // ── VISÃO DE OUTROS SOBRE O CANDIDATO ─────────────────────────────────
    {
      id: 'q-04',
      section: 'VISÃO DE OUTROS SOBRE O CANDIDATO',
      order: 4,
      question:
        'Se eu ligasse agora para o(a) seu/sua melhor amigo(a), como ele(a) te definiria?',
      tipsForInterviewer: [
        'Esteja atento se o candidato atribui a si mesmo qualidades que os outros enxergariam ou apenas o que ele deseja ser.',
        'Observe coerência entre o que foi dito anteriormente e a visão dos outros.',
        'Uma boa resposta costuma incluir tanto qualidades quanto algo a melhorar.'
      ],
      whatToObserve:
        'Perspectiva externa, humildade e coerência de imagem pública x autoimagem.',
      exampleFollowUps: [
        'Você concorda com essa visão que seu amigo(a) teria de você?'
      ]
    },
    {
      id: 'q-05',
      section: 'VISÃO DE OUTROS SOBRE O CANDIDATO',
      order: 5,
      question:
        'Agora uma pergunta relacionada ao nosso tema, qual pokemon inicial você escolheria? Pokemon tipo fogo (Determinado, corajoso e energético), Pokemon tipo água (Paciente, adaptável e social) ou Pokemon tipo grama (Resiliente, compreensível e constante)?',
      tipsForInterviewer: [
        'Não há resposta certa — o objetivo é entender autoconsciência e facilidade de expressão.',
        'Observe se o candidato consegue justificar a escolha com exemplos ou experiências.',
        'Perfis diferentes são igualmente válidos para a empresa — avalie a coerência, não a escolha.'
      ],
      whatToObserve:
        'Autoconhecimento, facilidade de expressão pessoal e coerência.',
      exampleFollowUps: ['Uma situação em que isso ficou evidente?']
    },

    // ── SOBRE A WATT CONSULTORIA ─────────────────────────────────────────
    {
      id: 'q-06',
      section: 'SOBRE A WATT CONSULTORIA',
      order: 6,
      question:
        'Dentre as oportunidades que você poderia viver na universidade, projetos de extensão e empresas juniores, por que escolheu a Watt? O que te motivou?',
      tipsForInterviewer: [
        'Observe se o candidato pesquisou sobre a empresa ou se veio "por indicação" sem motivação própria.',
        'Atenção a respostas genéricas tipo "quero experiência" — aprofunde se necessário.',
        'A motivação pode ser prática (currículo), mas precisa ser autêntica.'
      ],
      whatToObserve:
        'Motivação genuína, conhecimento sobre a empresa e clareza de propósito.',
      exampleFollowUps: [
        'O que você sabe sobre o trabalho da Watt?',
        'Você conhece alguém que já passou pela Watt?'
      ]
    },

    // ── EXPECTATIVAS SOBRE A EMPRESA ─────────────────────────────────────
    {
      id: 'q-07',
      section: 'EXPECTATIVAS SOBRE A EMPRESA',
      order: 7,
      question: 'Que tipo de experiência você imagina encontrar aqui na Watt?',
      tipsForInterviewer: [
        'Observe se as expectativas são realistas e alinhadas ao que a empresa oferece.',
        'Atenção a expectativas excessivamente idealistas ou muito vagas.',
        'Aproveite para corrigir percepções equivocadas com naturalidade, se necessário.'
      ],
      whatToObserve: 'Alinhamento de expectativas e maturidade profissional.',
      exampleFollowUps: ['O que você espera aprender nos primeiros meses?']
    },
    {
      id: 'q-08',
      section: 'EXPECTATIVAS SOBRE A EMPRESA',
      order: 8,
      question:
        'Sabendo que nosso trabalho não tem remuneração financeira, o que te motivaria a estar trabalhando na Watt todos os dias?',
      tipsForInterviewer: [
        'Esta pergunta avalia diretamente propósito e motivação intrínseca.',
        'Observe se o candidato tem clareza sobre o que busca além do dinheiro.',
        'Respostas como "crescimento profissional" podem ser válidas — peça exemplos concretos.'
      ],
      whatToObserve:
        'Motivação intrínseca, propósito e comprometimento sem retorno financeiro.',
      exampleFollowUps: [
        'Já passou por outras experiências voluntárias ou sem remuneração? Como foi?'
      ]
    },
    {
      id: 'q-09',
      section: 'EXPECTATIVAS SOBRE A EMPRESA',
      order: 9,
      question: 'Como você se imagina saindo da Watt Consultoria?',
      tipsForInterviewer: [
        'Observe se o candidato pensa no longo prazo e no legado que quer deixar.',
        'Respostas que incluem crescimento pessoal, aprendizado e contribuição à empresa são positivas.',
        'Atenção a respostas que focam apenas em "sair com currículo melhor".'
      ],
      whatToObserve: 'Visão de futuro, propósito e intenção de contribuição.',
      exampleFollowUps: [
        'O que você gostaria que as pessoas dissessem sobre sua passagem pela Watt?'
      ]
    },

    // ── VISÃO DE FUTURO ───────────────────────────────────────────────────
    {
      id: 'q-10',
      section: 'VISÃO DE FUTURO',
      order: 10,
      question: 'Quanto tempo você pretende passar na empresa?',
      tipsForInterviewer: [
        'Não há resposta certa — o importante é que o candidato tenha uma perspectiva clara.',
        'Observe se há comprometimento com a empresa ou se o candidato vê como experiência passageira.',
        'Esta pergunta pode revelar a maturidade da visão de carreira do candidato.'
      ],
      whatToObserve:
        'Comprometimento, visão de carreira e alinhamento com a empresa.',
      exampleFollowUps: ['O que te faria ficar mais tempo?']
    },
    {
      id: 'q-11',
      section: 'VISÃO DE FUTURO',
      order: 11,
      question:
        'Vou te dizer os valores da empresa: A Watt é a energia que nos move; Meu amanhã é o agora; Ética e transparência; Nada resiste ao trabalho; Responsabilidade social e ambiental; Profissionalismo e excelência; A mudança compõe o progresso. Com qual valor você mais se identifica e por quê?',
      tipsForInterviewer: [
        'Leia os valores devagar e claramente para o candidato.',
        'Observe se a escolha é genuína ou apenas estratégica para "agradar".',
        'Peça que conecte o valor a uma experiência real da vida do candidato.'
      ],
      whatToObserve:
        'Alinhamento cultural, autenticidade e capacidade de conectar valores a experiências pessoais.',
      exampleFollowUps: [
        'Tem alguma situação em que você viveu esse valor na prática?'
      ]
    },

    // ── LIDERANÇA ─────────────────────────────────────────────────────────
    {
      id: 'q-12',
      section: 'LIDERANÇA',
      order: 12,
      question:
        'Teve algum momento em que você teve que tomar a frente de uma situação ou atuar como líder?',
      tipsForInterviewer: [
        'Peça um exemplo concreto — situações reais valem mais do que hipóteses.',
        'Observe como o candidato descreve sua atuação: foi protagonista ou apenas participante?',
        'Atenção à postura de liderança: foi imposta ou emergiu naturalmente?'
      ],
      whatToObserve:
        'Proatividade, liderança situacional e capacidade de tomar iniciativa.',
      exampleFollowUps: [
        'Como o grupo reagiu à sua liderança?',
        'O que você faria diferente hoje?'
      ]
    },

    // ── COMPROMISSO ───────────────────────────────────────────────────────
    {
      id: 'q-13',
      section: 'COMPROMISSO',
      order: 13,
      question:
        'Como você prioriza suas atividades? Vamos supor que você tenha uma semana com várias provas importantes e, ao mesmo tempo, um prazo curto para entregar um projeto. Como você lidaria com isso?',
      tipsForInterviewer: [
        'Observe se o candidato tem um método real de priorização ou improvisa.',
        'Atenção à postura diante do conflito: ele tende a abandonar um dos compromissos ou busca equilibrar?',
        'Respostas que incluem comunicação ativa com o time são positivas.'
      ],
      whatToObserve:
        'Gestão de tempo, compromisso, resiliência e capacidade de comunicação sob pressão.',
      exampleFollowUps: [
        'Já viveu uma situação parecida? Como resolveu?',
        'Você comunicaria a dificuldade ao time?'
      ]
    },

    // ── DESTAQUE ──────────────────────────────────────────────────────────
    {
      id: 'q-14',
      section: 'DESTAQUE',
      order: 14,
      question: 'Por que você acha que deveria estar na Watt?',
      tipsForInterviewer: [
        'Observe confiança, autoconhecimento e capacidade de síntese.',
        'O candidato deve conseguir articular o que tem a oferecer — não apenas o que quer receber.',
        'Respostas genéricas merecem aprofundamento: "O que especificamente você traria?"'
      ],
      whatToObserve:
        'Autoconfiança, clareza de valor pessoal e alinhamento com a empresa.',
      exampleFollowUps: [
        'O que você traria que outros candidatos talvez não trouxessem?'
      ]
    },

    // ── FEEDBACK / TRABALHO EM EQUIPE ─────────────────────────────────────
    {
      id: 'q-15',
      section: 'FEEDBACK / TRABALHO EM EQUIPE',
      order: 15,
      question:
        'Suponha que você esteja trabalhando em um projeto junto com outra pessoa e, um dia antes da entrega, ela envie a parte dela feita de qualquer jeito, com baixa qualidade. Você acaba tendo que corrigir tudo. Como reagiria a essa situação?',
      tipsForInterviewer: [
        'Observe como o candidato lida com conflito — fuga, agressividade ou maturidade?',
        'Atenção a candidatos que "absorvem tudo sozinhos" sem comunicar — sinal de falta de assertividade.',
        'A melhor resposta inclui comunicação direta e construtiva com o colega.'
      ],
      whatToObserve:
        'Gestão de conflitos, trabalho em equipe, assertividade e maturidade relacional.',
      exampleFollowUps: [
        'Já viveu algo parecido? Como resolveu?',
        'Você conversaria com a pessoa depois? O que diria?'
      ]
    },

    // ── CRIATIVIDADE ─────────────────────────────────────────────────────
    {
      id: 'q-16',
      section: 'CRIATIVIDADE',
      order: 16,
      question:
        'Se você tivesse recursos para tirar uma ideia empreendedora do papel, qual problema gostaria de resolver? Como organizaria as pessoas e os times para fazer essa ideia acontecer?',
      tipsForInterviewer: [
        'Observe criatividade, mas principalmente a capacidade de estruturar uma ideia de forma coerente.',
        'Atenção ao raciocínio de gestão de pessoas: como o candidato pensa sobre times e colaboração?',
        'Não há resposta certa — avalie a clareza do raciocínio, não a ideia em si.'
      ],
      whatToObserve:
        'Criatividade, visão empreendedora e capacidade de organizar times e ideias.',
      exampleFollowUps: [
        'Por que esse problema em específico?',
        'Que habilidades você buscaria no time para isso?'
      ]
    },

    // ── TRANSPARÊNCIA ─────────────────────────────────────────────────────
    {
      id: 'q-17',
      section: 'TRANSPARÊNCIA',
      order: 17,
      question:
        'Como você lida e separa as situações profissionais das situações pessoais?',
      tipsForInterviewer: [
        'Observe maturidade emocional e capacidade de estabelecer limites saudáveis.',
        'Respostas que ignoram a separação (ex.: "levo tudo para casa") podem indicar falta de equilíbrio.',
        'Atenção também ao extremo oposto: total frieza pode indicar falta de empatia.'
      ],
      whatToObserve:
        'Equilíbrio emocional, maturidade e capacidade de separar vida profissional e pessoal.',
      exampleFollowUps: [
        'Já teve dificuldade com essa separação em algum momento?'
      ]
    },

    // ── PROPÓSITO ─────────────────────────────────────────────────────────
    {
      id: 'q-18',
      section: 'PROPÓSITO',
      order: 18,
      question:
        'O que você entende como propósito de vida e propósito profissional? Qual seria o seu?',
      tipsForInterviewer: [
        'Esta é uma das perguntas mais profundas da entrevista — dê tempo para o candidato pensar.',
        'Observe clareza e autenticidade: respostas ensaiadas soam diferentes de respostas genuínas.',
        'Não há resposta errada, mas a coerência com o restante da entrevista importa.'
      ],
      whatToObserve:
        'Clareza de propósito, profundidade reflexiva e coerência com o restante da entrevista.',
      exampleFollowUps: [
        'Quando você começou a pensar nisso?',
        'O que te aproxima desse propósito hoje?'
      ]
    },
    {
      id: 'q-19',
      section: 'PROPÓSITO',
      order: 19,
      question: 'O que você pretende fazer depois de formado(a)?',
      tipsForInterviewer: [
        'Observe se o candidato tem uma visão de futuro ou se ainda está sem direção.',
        'Respostas flexíveis e abertas são normais — o importante é que haja reflexão.',
        'Observe se a Watt se encaixa na trajetória que ele descreve.'
      ],
      whatToObserve:
        'Visão de futuro, clareza de objetivos e maturidade profissional.',
      exampleFollowUps: [
        'A Watt faz sentido nessa trajetória que você está construindo?'
      ]
    },

    // ── AUTORESPONSABILIDADE ──────────────────────────────────────────────
    {
      id: 'q-20',
      section: 'AUTORESPONSABILIDADE',
      order: 20,
      question:
        'Digamos que eu seja seu diretor e você meu gerente. Você e seu time receberam uma tarefa na semana passada, duas pessoas não participaram por negligência e o projeto terminou atrasando. Como você se explicaria para mim e quais providências tomaria com o time?',
      tipsForInterviewer: [
        'Observe se o candidato assume responsabilidade como líder ou transfere a culpa para o time.',
        'A melhor resposta inclui reconhecer a falha, propor solução e agir com o time.',
        'Atenção a candidatos que "culpam os outros" sem reflexão sobre o próprio papel.'
      ],
      whatToObserve:
        'Autoresponsabilidade, liderança, capacidade de resolver conflitos e postura profissional sob pressão.',
      exampleFollowUps: [
        'Como você evitaria que isso acontecesse novamente?',
        'O que faria de diferente na liderança do projeto?'
      ]
    },

    // ── RESPONSABILIDADE SOCIAL ───────────────────────────────────────────
    {
      id: 'q-21',
      section: 'RESPONSABILIDADE SOCIAL',
      order: 21,
      question: 'Na sua visão, qual é o papel da Watt com a sociedade?',
      tipsForInterviewer: [
        'Observe se o candidato tem consciência do impacto que uma empresa júnior pode ter.',
        'Atenção a respostas puramente técnicas — a dimensão social importa.',
        'Uma boa resposta considera clientes, comunidade e o papel da empresa júnior no ecossistema.'
      ],
      whatToObserve:
        'Consciência social, visão de impacto e alinhamento com os valores da empresa.',
      exampleFollowUps: [
        'Você já se envolveu em alguma ação social ou comunitária?'
      ]
    },

    // ── DISPOSIÇÕES FINAIS ────────────────────────────────────────────────
    {
      id: 'q-22',
      section: 'DISPOSIÇÕES FINAIS',
      order: 22,
      question:
        'Por último: por que a Watt não deveria te escolher como novo membro?',
      tipsForInterviewer: [
        'Esta é uma pergunta de fechamento — observe como o candidato lida com a vulnerabilidade.',
        'Uma boa resposta demonstra honestidade e consciência das próprias limitações sem se desqualificar.',
        'Observe se o candidato usa a pergunta para se promover disfarçadamente ou se responde com autenticidade.'
      ],
      whatToObserve:
        'Honestidade, autoconhecimento, equilíbrio entre humildade e confiança.',
      exampleFollowUps: [
        'E por que deveria?',
        'O que você faria para superar essa limitação na Watt?'
      ]
    }
  ];

  getAllQuestions(): InterviewQuestion[] {
    return this.questions;
  }
}

const interviewScriptRepository = new InterviewScriptRepository();
export default interviewScriptRepository;
