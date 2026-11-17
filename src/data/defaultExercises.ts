import benchPressImg from '../assets/images/exercise_bench_press_1794677983202.jpg';
import latPulldownImg from '../assets/images/exercise_lat_pulldown_1794677982771.jpg';
import squatRackImg from '../assets/images/exercise_squat_rack_1794677983827.jpg';
import dumbbellCurlsImg from '../assets/images/exercise_dumbbell_curls_1794677983791.jpg';
import { Exercise } from '../types/workout';

export const DEFAULT_EXERCISES: Exercise[] = [
  {
    id: 'ex-1',
    name: 'Supino Reto com Barra',
    muscle: 'Peito',
    setsReps: '4 × 8–10',
    weight: 60,
    completed: false,
    imageUrl: benchPressImg,
    notes: 'Descer controlando até tocar o centro do peito',
    executionInstructions:
      '1. Deite-se no banco plano com os pés firmes no chão e escápulas retraídas contra o estofado.\n2. Segure a barra um pouco além da largura dos ombros, com punhos neutros e firmes.\n3. Inspire e desça a barra de forma controlada até a linha média do peitoral, mantendo os cotovelos a cerca de 45° do tronco.\n4. Empurre a barra para cima expirando sem perder o encaixe dos ombros.',
  },
  {
    id: 'ex-2',
    name: 'Crucifixo Inclinado com Halteres',
    muscle: 'Peito',
    setsReps: '3 × 12',
    weight: 18,
    completed: false,
    imageUrl: dumbbellCurlsImg,
    notes: 'Manter leve flexão nos cotovelos',
    executionInstructions:
      '1. Ajuste o banco entre 30° e 45° de inclinação e apoie bem as costas.\n2. Com os halteres acima do peito e palmas voltadas uma para a outra, mantenha uma leve flexão fixa nos cotovelos.\n3. Abra os braços em arco até sentir bom alongamento no peitoral superior, sem deixar os ombros girarem à frente.\n4. Retorne contraindo o peitoral até aproximar os halteres no topo.',
  },
  {
    id: 'ex-3',
    name: 'Puxada Frontal Aberta',
    muscle: 'Costas',
    setsReps: '4 × 10–12',
    weight: 55,
    completed: false,
    imageUrl: latPulldownImg,
    notes: 'Escápulas retraídas antes de iniciar a puxada',
    executionInstructions:
      '1. Ajuste o apoio de coxas para estabilizar o quadril e segure a barra em pegada pronada aberta.\n2. Inicie o movimento deprimindo os ombros e aproximando as escápulas.\n3. Puxe a barra em direção à parte superior do peito inclinando levemente o tronco para trás.\n4. Controle o retorno até estender quase totalmente os braços, mantendo a postura firme.',
  },
  {
    id: 'ex-4',
    name: 'Remada Curvada Pronada',
    muscle: 'Costas',
    setsReps: '4 × 10',
    weight: 50,
    completed: false,
    notes: 'Tronco estável a 45 graus',
    executionInstructions:
      '1. Com os pés na largura dos ombros e joelhos semiflexionados, incline o tronco a cerca de 45° mantendo a coluna neutra.\n2. Puxe a barra em direção à linha do umbigo, levando os cotovelos para trás.\n3. Segure 1 segundo no pico de contração dorsal e desça controladamente sem arredondar a lombar.',
  },
  {
    id: 'ex-5',
    name: 'Agachamento Livre',
    muscle: 'Pernas',
    setsReps: '4 × 8–10',
    weight: 80,
    completed: false,
    imageUrl: squatRackImg,
    notes: 'Amplitude completa mantendo coluna neutra',
    executionInstructions:
      '1. Posicione a barra sobre o trapézio superior, ative o abdômen e mantenha o peito aberto.\n2. Desça flexionando quadril e joelhos simultaneamente, mantendo os joelhos alinhados à ponta dos pés.\n3. Busque quebrar a paralela conforme sua mobilidade, sem perder a curvatura natural da lombar.\n4. Empurre o chão com toda a planta dos pés para subir com potência e controle.',
  },
  {
    id: 'ex-6',
    name: 'Desenvolvimento com Halteres',
    muscle: 'Ombros',
    setsReps: '4 × 10',
    weight: 20,
    completed: false,
    imageUrl: dumbbellCurlsImg,
    executionInstructions:
      '1. Sente-se com as costas totalmente apoiadas e posicione os halteres na altura das orelhas.\n2. Mantenha os cotovelos levemente à frente da linha do tronco.\n3. Empurre os halteres acima da cabeça sem estender bruscamente os cotovelos e desça controlando até a posição inicial.',
  },
  {
    id: 'ex-7',
    name: 'Rosca Direta Alternada',
    muscle: 'Bíceps',
    setsReps: '3 × 12',
    weight: 14,
    completed: false,
    executionInstructions:
      '1. Em pé, segure os halteres ao lado do corpo com os ombros estabilizados.\n2. Flexione um cotovelo por vez girando a palma para cima (supinação), evitando balançar o tronco.\n3. Desça lentamente controlando a fase excêntrica antes de alternar o braço.',
  },
  {
    id: 'ex-8',
    name: 'Tríceps Pulley Corda',
    muscle: 'Tríceps',
    setsReps: '3 × 12–15',
    weight: 30,
    completed: false,
    imageUrl: latPulldownImg,
    executionInstructions:
      '1. Segure as extremidades da corda mantendo os cotovelos fixos próximos às costelas.\n2. Estenda os antebraços para baixo abrindo levemente as pontas da corda no final do movimento.\n3. Retorne devagar até os antebraços ultrapassarem 90° sem tirar os cotovelos do lugar.',
  },
  {
    id: 'ex-9',
    name: 'Prancha Abdominal Isométrica',
    muscle: 'Abdômen',
    setsReps: '4 séries',
    weight: 0,
    durationSeconds: 45,
    completed: false,
    executionInstructions:
      '1. Apoie os antebraços no colchonete com os cotovelos alinhados abaixo dos ombros.\n2. Estenda as pernas apoiando as pontas dos pés e mantenha o corpo alinhado da cabeça aos calcanhares.\n3. Contraia intensamente o abdômen e os glúteos pelo tempo programado, respirando de forma contínua sem deixar o quadril cair.',
  },
];
