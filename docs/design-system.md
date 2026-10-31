# Design system (`@worlo/ui`)

Implementação da identidade Worlo do handoff (`design_handoff_worlo_app/`, hi-fi, base 390×844). Três camadas, cada uma só conhece a anterior:

```
tokens/colors.ts       palette (carvão, coral, areia, branco…) → colors semânticos, alpha (camadas em fundo escuro)
tokens/typography.ts   Bricolage Grotesque (títulos) + Plus Jakarta Sans (UI) → textVariants
tokens/layout.ts       escala de espaço (2…48), raios, tamanhos, sombras, motion, opacidades
        ▼
components/            Text, Button, IconButton/Fab, Icon (Phosphor), inputs, seleção, cards,
                       avatares, status, layout (Screen, headers, Hero, TabBar), Sheet, Toast,
                       estados (vazio, skeleton, offline, erro), LivePill, Logo
globe/                 Globo 3D (d3-geo + SVG): arraste com inércia, pinça, toque no país
```

## Regras

1. **Telas só usam componentes e tokens.** Nada de hex soltos (`palette`, `colors`, `alpha`) nem espaçamentos fora da escala `2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40, 48` (o tipo `Space` do `Stack` aceita só esses valores).
2. **Coral como texto em fundo claro é proibido.** Use `colors.link` (coral-700). O coral `#E45B33` só aparece como fundo de botão (com texto carvão), ícone ativo ou marcação. O teste de tokens falha se essa regra ou qualquer contraste AA quebrar.
3. **Fontes por família.** No React Native o peso vem do arquivo da fonte. Use `variant` do `Text` (e `weight` para os estilos de UI); nunca `fontWeight`.
4. **Ícones Phosphor** via `<Icon name>`: `regular` por padrão e `fill` para estado ativo. Os nomes válidos estão em `components/icons.generated.ts` (só os ícones usados, para manter o bundle pequeno).
5. **Acessibilidade embutida.** Todo controle tem papel e nome (IconButton exige `label`), alvo de toque ≥ 44 e erros de formulário com `role="alert"`. O overlay da Sheet sai do foco do leitor de tela porque a sheet é modal.
6. **Textos vêm do app.** O pacote não tem copy própria; rótulos de acessibilidade como "Mostrar senha" são props.

## Telas escuras

A Worlo não tem modo escuro global: algumas telas são carvão (splash, boas-vindas, mapa, retrospectiva, modo viagem, compartilhar). Componentes que aparecem nelas têm variante própria (`onDark`, `tone="dark"`, `Screen tone="dark"`), e a status bar acompanha o tom da tela.

## Globo

`<Globe>` desenha em SVG uma projeção ortográfica dos países (Natural Earth 110m, IDs ISO numéricos), agrupados por status para atualizar poucos nós por frame. Props principais: `visited/planned/wishlist`, `selected`, `autoRotate`, `offsetY` (animado), `cities` (aparecem com zoom > 1,6 e pílulas de fotos com zoom > 2,3), `pulse`, `onPickCountry`, `centerOnPick`. Use `ref` (`GlobeHandle`) para `zoomIn/zoomOut/recenter/focusCountry`. A lógica geográfica pura (`globe/geo.ts`) tem testes próprios.

## Catálogo vivo

A rota `/design-system` renderiza paleta, tipografia e todos os componentes com os componentes reais. Use para revisão visual e QA.

## Adicionando um componente

1. `packages/ui/src/components/…`, usando apenas tokens.
2. Exporte em `src/index.ts`.
3. Teste comportamento e acessibilidade em `components.test.tsx` (papel, estado, eventos).
4. Inclua no catálogo (`apps/mobile/src/features/dev/DesignSystemScreen.tsx`).
