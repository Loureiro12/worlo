# Handoff: Worlo — app de viagens (v1)

> **Your World, Your way.** App mobile para registrar viagens realizadas, planejar as próximas, descobrir destinos e compartilhar com amigos e comunidade.

Este pacote contém tudo que a equipe precisa para começar a implementar o Worlo: tokens, componentes, todas as telas, fluxos, regras de validação, estados, modelo de dados e animações.

## Índice

| Arquivo | Conteúdo |
|---|---|
| `README.md` | Visão geral, fidelidade, design tokens, navegação, como rodar o protótipo |
| `docs/01_COMPONENTS.md` | Biblioteca de componentes (anatomia, medidas, estados) |
| `docs/02_SCREENS.md` | Especificação tela a tela (59 telas/estados) |
| `docs/03_FLOWS.md` | Fluxos ponta a ponta e mapa de navegação |
| `docs/04_INTERACTIONS.md` | Validações, feedback, animações, estados vazios/erro/loading |
| `docs/05_DATA_MODEL.md` | Entidades, campos, relações, permissões e endpoints sugeridos |
| `docs/06_COPY.md` | Textos de interface (pt-BR) e tom de voz |
| `docs/07_QA_CHECKLIST.md` | Checklist de aceite por módulo |
| `prototype/Worlo App.dc.html` | Protótipo navegável (referência viva) |
| `reference/*.pdf` | Identidade visual, Tese e Trip Project originais |

---

## Sobre os arquivos de design

Os arquivos em `prototype/` são **referências de design feitas em HTML** — um protótipo que mostra aparência e comportamento pretendidos, **não código de produção**. A tarefa é **recriar estas telas no ambiente da equipe** (recomendação abaixo), usando os padrões e bibliotecas do projeto.

**Stack recomendada (se ainda não existir):** React Native + Expo (iOS/Android), TypeScript, React Navigation (stack + bottom tabs), Reanimated 3 + Gesture Handler (sheets, animações), `@gorhom/bottom-sheet`, Zustand ou Redux Toolkit (estado), TanStack Query (dados), Mapbox GL / `react-native-maps` + globo 3D (ver "Globo"), `phosphor-react-native` (ícones), Expo Image, Expo Location, Expo Media Library, MMKV (offline).

### Como abrir o protótipo
1. Abra `prototype/Worlo App.dc.html` num navegador (Chrome/Safari) com internet (fontes, ícones, d3 e fotos vêm de CDN).
2. A **barra lateral** à esquerda lista todas as telas agrupadas — clique para pular direto.
3. Dentro do iPhone, tudo é navegável como no app real.
4. O painel **Tweaks** (no host) permite: esconder a lateral, desligar brilho do globo, velocidade de rotação e **simular estados** (`appState`: normal, empty, loading, offline, error).

## Fidelidade

**Alta fidelidade (hi-fi).** Cores, tipografia, espaçamentos, raios, copy e interações são finais para a v1. Recriar pixel a pixel (base 390×844 pt, iPhone 14/15). Exceções:
- **Fotos** são placeholders aleatórios (picsum.photos) — substituir por fotos reais do usuário/conteúdo.
- **Logo**: o pin SVG do protótipo é provisório; usar o arquivo oficial da identidade (ver `reference/Worlo-Identidade-Visual-v1.pdf`).
- **Dados** (países, preços, avaliações, pessoas) são fictícios.
- Integrações (GPS, câmera, pagamentos, redes sociais) são simuladas.

---

## Design tokens

### Cores
| Token | Hex | Uso |
|---|---|---|
| `carvao` | `#131311` | Texto principal, fundos escuros (splash, boas-vindas, mapa, retrospectiva, modo viagem), botões selecionados |
| `coral` | `#E45B33` | Cor principal da marca: CTA primário, aba ativa (ícone), marcadores "visitado", badges, foco |
| `coral-300` | `#F0A38A` | Overlines em fundo escuro, hover do CTA, balão de mensagem enviada |
| `coral-100` | `#FAD9CE` | Fundos de destaque suaves (cards de dica, avatares, chips de status) |
| `coral-700` | `#A83A19` | Texto coral sobre fundo claro (links, overlines, ícones de destaque) — passa AA |
| `areia` | `#EEEAE7` | Fundo padrão das telas claras |
| `branco` | `#FFFDFC` | Superfícies (cards, inputs, sheets, tab bar) |
| `linha` | `#CFC9C4` | Bordas, divisores, chips não selecionados, trilhas, skeleton claro `#E2DDD8` |
| `cinza-600` | `#67615A` | Texto secundário/meta |
| `cinza-800` | `#3A3733` | Texto de apoio, países sem marcação no globo |
| `sucesso` | `#167A4A` | Confirmações, "verificado", comprovante anexado |
| `erro` | `#B3261E` | Erros de formulário, ações destrutivas |
| `info` | `#2563A8` | Ícone de informação/tooltip |
| `globo-oceano` | `#211F1C` | Esfera do globo |

Opacidades usadas em fundo escuro: `rgba(255,253,252,.06)` (card), `.08` (segmented/chip), `.10` (botão ícone), `.12–.24` (bordas). Overlay de sheet: `rgba(19,19,17,.45)`. Scrim no topo de fotos: `linear-gradient(to bottom, rgba(19,19,17,.5), transparent)` 120px.

**Contraste:** coral `#E45B33` só como fundo de botão com texto carvão, ou ícone/marcação. Para texto coral sobre claro usar `#A83A19`.

### Tipografia
- **Títulos:** Bricolage Grotesque (Google Fonts), pesos 500/700/800, opsz 12–96.
- **Texto/UI:** Plus Jakarta Sans, pesos 400/500/600/700.

| Estilo | Fonte | Tamanho/Altura | Peso | Extra |
|---|---|---|---|---|
| Display | Bricolage | 46/48 | 800 | -0.02em (boas-vindas) |
| Display L | Bricolage | 40/44 – 44/46 | 800 | -0.02em (retrospectiva, primeiro mapa) |
| H1 | Bricolage | 30/36 | 700 | -0.01em (títulos de tela) |
| H1 detalhe | Bricolage | 28/34 – 34/40 | 700 | páginas de viagem/país/cidade |
| H2 | Bricolage | 24/30 | 700 | títulos de sheet |
| H3 | Bricolage | 20/26 | 700 | títulos de seção |
| Card title | Bricolage | 17–20/22–26 | 700 | |
| Número/estatística | Bricolage | 22–44 | 800 | |
| Body L | Jakarta | 16/24 | 400 | parágrafos |
| Body | Jakarta | 15/22 | 400–600 | |
| Body S | Jakarta | 14/20 | 500–700 | labels de campo (600) |
| Caption | Jakarta | 13/18 | 500–600 | meta |
| Overline | Jakarta | 12 | 700 | uppercase, letter-spacing .12em |
| Micro | Jakarta | 11/14 | 600 | tab bar labels |

Mínimo de 11px; texto corrido nunca abaixo de 13px. `text-wrap: balance` em títulos, `pretty` em parágrafos.

### Espaçamento
Escala: **2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40, 48**.
- Margem lateral das telas: **20**.
- Topo de tela (abaixo da status bar): **59** (55 em telas com hero/botão de voltar sobre foto).
- Gap entre seções: **20–24**; dentro de card: **12–14**; listas: **8–10**.
- Padding inferior de telas com tab bar: **108** (84 tab + 24).

### Raios
`8` (chips de dia/skeleton), `10–12` (inputs, thumbs, mini cards), `16` (cards de lista, fotos), `18–20` (balões, previews), `24` (cards grandes, sheets topo), `999` (pílulas, botões, segmented, avatares = 50%). Device: 52 (tela) / 62 (moldura).

### Sombras
| Nome | Valor | Uso |
|---|---|---|
| `hover` | `0 6px 20px rgba(19,19,17,.08)` | cards clicáveis (hover/pressed) |
| `float` | `0 8px 24px rgba(19,19,17,.08)` | card que sobrepõe hero |
| `button-float` | `0 4px 12px rgba(19,19,17,.12)` | botões sobre foto |
| `toast` | `0 8px 24px rgba(19,19,17,.18)` | toast |
| `sheet-map` | `0 -10px 40px rgba(19,19,17,.4)` | sheet sobre mapa |
| `pill-live` | `0 8px 20px rgba(19,19,17,.3)` | pílula "Viajando" |
| `share-preview` | `0 20px 50px rgba(0,0,0,.5)` | preview de compartilhamento |

### Ícones
**Phosphor Icons 2.1.1** — `regular` por padrão, `fill` para estado ativo (aba, coração/salvo, estrela, check). Tamanhos: 16 (inline), 18–20 (botões/linhas), 22–24 (tab bar, ações), 30–46 (estados vazios, conquistas).

### Marcadores do mapa (identidade)
| Status | Forma | Cor |
|---|---|---|
| Visitado | círculo 14px com check | fundo coral, borda branca 1.5, check carvão |
| Em roteiro/planejamento | quadrado 12px com "+" | fundo carvão, borda branca |
| Quero ir | losango 14px (quadrado 45°) | contorno branco, fundo carvão |
Países no globo: visitado `#E45B33`, em roteiro `#CFC9C4`, quero ir `#67615A` + contorno tracejado branco, sem marcação `#3A3733`.

---

## Arquitetura de navegação

**Bottom tabs (5):** Explorar · Mapa · Viagens · Comunidade · Perfil. Tab bar 84pt (inclui home indicator), fundo branco (`carvao` na aba Mapa), borda superior 1px `rgba(19,19,17,.06)`. Item: ícone 24 + label 11/14 600 + ponto 4px coral abaixo do ativo. Ícone ativo **fill coral `#E45B33`**, label ativo carvão; inativos `#67615A` (no Mapa: `#CFC9C4`).

**Stacks por aba** (push com voltar). Telas modais/fullscreen sem tab bar: splash, auth, onboarding, cadastro de viagem, retrospectiva, roteiro (editor), detalhe de passeio, anuncie, publicar, busca, chat, convite, compartilhar, configurações internas (cfg).

Ver `docs/03_FLOWS.md` para o mapa completo.

## Arquivos
- `prototype/Worlo App.dc.html` — template (marcação com estilos inline) + classe lógica no final do arquivo (`class Component`), com todos os dados mock (`TRIPS`, `COUNTRIES`, `ROTS`, `RECS`, `PASSEIOS`, `POSTS`, `FRIENDS`, `INVITES`, `NOTIFS`...). Útil para conferir medidas exatas: cada elemento tem `style` com os valores reais.
- `prototype/support.js` — runtime do protótipo (não portar).
