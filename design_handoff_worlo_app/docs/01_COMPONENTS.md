# 01 · Componentes

Medidas em pt (base 390×844). Cores pelo nome do token (ver README).

## Botões

| Variante | Altura | Raio | Fundo | Texto | Borda | Uso |
|---|---|---|---|---|---|---|
| **Primary** | 52 | 999 | coral | carvão 16/700 | — | CTA principal (1 por tela) |
| Primary hover/pressed | | | coral-300 | | | |
| **Secondary outline** | 44–52 | 999 | transparente | carvão 15/700 | 1px carvão | ação secundária |
| **Ghost/link** | 40–44 | — | — | coral-700 14/700 | — | "Ver todos", "Trocar", "Pular" |
| **Destrutivo** | 48–52 | 999 | transparente ou erro | erro / branco | 1px erro | Sair, Excluir conta |
| **Icon button** | 40×40 (44×44 em barras) | 50% | branco (claro) / `rgba(255,253,252,.1)` (escuro) | ícone 18–20 | — | voltar, compartilhar |
| **Icon button sobre foto** | 40×40 | 50% | branco + sombra button-float | | | heróis |
| **FAB inline** | 52×52 | 50% | coral | ícone "+" 24 carvão | — | Explorar (adicionar viagem) |
| **Pill CTA small** | 36–40 | 999 | transparente | 13–14/700 | 1px carvão | "Convidar", "Ver como outros veem" |

Estados: `:focus-visible` = outline 2px coral, offset 2px. Desabilitado = opacidade .4–.45 (ex.: "Continuar" sem países marcados, enviar mensagem vazia).

## Inputs
- **Campo de texto:** altura 52 (48 em sheets), raio 12, fundo branco, borda 1px `linha`, padding 0 16, texto 16 carvão, placeholder `#67615A`. Foco: borda 2px carvão. Erro: borda 1px `erro` + mensagem abaixo (ícone `warning-circle` fill 18 + texto 14/600 erro).
- **Campo com ícone:** ícone 20 `#67615A` à esquerda, gap 10.
- **Busca pílula:** altura 48–52, raio 999, fundo branco, ícone lupa 20; na tela de busca borda 2px carvão.
- **Textarea:** padding 14×16, raio 12, line-height 22–23, `resize:none`, contador "N/max" 12 `#67615A` alinhado à direita.
- **Valor monetário (gasto):** container `areia` raio 16, prefixo moeda Bricolage 24–28/700 cinza, input Bricolage 34–36/800.
- **Senha:** botão olho (eye / eye-slash) à direita, 20px.
- **Medidor de força de senha:** 3 barras 4px raio 2, gap 4; cores: fraca erro, boa coral, forte sucesso; texto 13/600.

## Seleção
- **Chip (filtro/opção):** altura 36, padding 0 14, raio 999, 14/600. Off: fundo branco, borda `linha`, texto carvão. On: fundo carvão, texto branco. Pode ter ícone 16 à esquerda.
- **Segmented control:** container raio 999 padding 4 gap 4, fundo branco (claro) ou `rgba(255,253,252,.08)` (escuro). Segmento: altura 36–40, 14/700; ativo fundo carvão + texto branco (claro) / fundo branco + texto carvão (escuro).
- **Radio row:** linha 56+, círculo 24 borda 2 (`linha` → coral), ponto interno 12 coral.
- **Checkbox row:** quadrado 24 raio 6, borda 2, marcado fundo coral + check.
- **Toggle (switch):** 48×28, raio 999, padding 3, knob 22 branco com sombra `0 1px 3px rgba(19,19,17,.25)`. On: coral, knob à direita. Off: `linha`.
- **Estrelas:** botão 44×44 raio 12, borda `linha`, ícone star 22–24 coral (fill quando selecionada).
- **Stepper (pessoas):** botões circulares 44 borda `linha`, número Bricolage 22/700 central.
- **Data chip (passeio):** 64×72 raio 16, dia da semana 12/600, número Bricolage 22/700, mês 10/700. Esgotado: opacidade .45 + "esgotado".

## Cards
- **Card de lista:** fundo branco, raio 16, padding 10–14, gap 12. Thumb 56–64 raio 12 à esquerda; título 15/700, meta 13 `#67615A`; trailing (rating, ação, caret).
- **Card grande (viagem/roteiro/passeio):** raio 24, padding 10 10 16, imagem 120–180 raio 16 no topo, conteúdo com padding 0 6.
- **Mosaico de viagem:** grid 2fr/1fr × 2 linhas, gap 4, altura 176, raio 16; tile 3 = `#67615A` com "+N" Bricolage 20 branco.
- **Card escuro de destaque:** fundo carvão, raio 24, padding 18–20, overline coral-300, título Bricolage 20–22 branco.
- **Card coral suave:** fundo coral-100, raio 24, ícone em círculo branco 44, seta coral-700.
- **Card sobreposto ao hero:** margin -40/-48 12 0, raio 24, padding 20, sombra float.
- **Stat tile:** fundo branco (ou `rgba(255,253,252,.06)` no escuro), raio 16, número Bricolage 22–32/800, label 12–13/600.
- **Fact tile (país/cidade):** grid 2 col gap 8, padding 14, ícone 16 + label overline 11; valor 15/700; subtexto 12. Tooltip (ícone info azul) abre balão carvão raio 12 acima.

## Avatares
Círculo com iniciais 700 (≈ tamanho/2.8). Tamanhos: 22, 24, 28, 30, 32, 36, 40, 44, 48, 72, 88. Cores por pessoa (ciclo): `coral-100`/`coral-700`, carvão/branco, `coral-300`/`coral-700`, `#67615A`/branco, `linha`/`coral-700`. **Usuário logado:** coral/carvão (ou foto). **Pilha:** sobreposição -6/-8px, borda 2px da cor de fundo.

## Status / badges
- **Chip de status:** altura 26–30, raio 999, 12–13/700, ícone 14. Visitado: coral-100/coral-700. Em planejamento: carvão/branco + quadrado. Quero ir: borda carvão + losango. Verificado: `#EEEAE7`/sucesso + seal-check.
- **Badge de contagem (sino):** min 18×18, coral, texto 11/800 carvão, borda 2 branco, top/right 4.
- **Ponto não lido:** 8px coral.
- **Dica verificada:** "seal-check" + "% confirmam" 13/700 (sucesso se ≥90% e com votos; cinza caso contrário).

## Sheets (bottom sheet)
- Overlay `rgba(19,19,17,.45)` cobrindo a tela; toque fora fecha.
- Painel branco, raio 24 24 0 0, padding 10 20 40, gap 10–14, max-height ~720–740 com scroll.
- Handle 36×4 raio 2 `linha`, centralizado.
- Título H2 Bricolage 24/30 margin-top 6–8; subtítulo 14 cinza.
- Fecham automaticamente em qualquer navegação (go/back/troca de aba).
Sheets existentes: Adicionar viagem, Sugestões de parada, Salvar em coleção/Nova coleção, Pessoas na viagem (colaboradores), Novo gasto, Associar fotos, Foto do perfil, Modo viagem (check-in/foto/gasto/nota/encerrar).

## Navegação
- **Header sticky (telas claras):** fundo areia, padding 59 20 10, margem negativa lateral -20 e inferior -10; linha: botão voltar 40 · overline central coral-700 · ação direita 40 (ou espaçador).
- **Header de tela de aba:** H1 30/36 à esquerda + ações à direita (sino, salvos, avatar 44).
- **Hero com foto:** altura 240–320, scrim 120 no topo, barra de botões sticky de altura 0 (botões ficam fixos ao rolar), status bar branca.
- **Tab bar:** ver README.
- **Barra inferior fixa (CTA):** padding 12 20 36, fundo areia ou branco, borda superior 1px `rgba(19,19,17,.06)`.

## Toast
Topo (top 56, laterais 20), fundo branco, raio 16, padding 12 16, sombra toast, ícone 20 (sucesso `check-circle` verde, info `info` azul, erro `warning-circle` vermelho) + texto 14/600. Duração 2.4s.

## Globo 3D (componente-chave)
- Projeção ortográfica, rotação por arraste (sensibilidade 0.3/zoom), inércia com atrito 0.94, auto-rotação lenta (0.05–0.15°/frame × multiplicador), zoom por pinça/scroll 0.8×–4.5×, botões +/− (×1.5) e recentrar.
- Camadas: brilho coral radial atrás (R×0.9→1.32, `rgba(228,91,51,.22)`→0), esfera `#211F1C`, graticule 10° `rgba(255,253,252,.05)`, países por status (ver tokens), borda países `#211F1C` .6px, contorno tracejado em "quero ir", contorno branco 2px no selecionado, sombreamento de volume (radial branco 10% → carvão 50%).
- Zoom > 1.6: mostra cidades (ponto 3px branco + nome 11/600). Zoom > 2.3: pílula coral "N fotos" na cidade.
- Toque num país (sem arrastar > 5px) → centraliza (lerp 0.09) e abre resumo do país.
- Dados: Natural Earth 110m (`world-atlas@2/countries-110m.json`), IDs ISO numéricos.
- **Implementação sugerida:** Mapbox GL v3 com `projection: globe` (nativo, performático, zoom contínuo até rua) ou `react-native-skia` + d3-geo para fidelidade ao visual. Usar o mesmo componente em: Boas-vindas, Onboarding, Primeiro mapa, Mapa, Perfil, Perfil público e Compartilhar.
