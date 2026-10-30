# Design system (`@worlo/ui`)

Três camadas, e cada camada só conhece a anterior:

```
tokens/primitives.ts   valores crus: palette, space, radius, fontSize, size…
        ▼
tokens/semantic.ts     significado: colors.light/dark (background, text, primary, status…),
                       textVariants (display, title, heading, body, label, caption)
        ▼
components/            Text, Button, TextField, Checkbox, RadioGroup, Card, Badge,
                       Divider, Stack/HStack/VStack, Screen
```

## Regras

1. **Telas não usam cor, espaçamento ou fonte crus.** Use componentes. Se faltar algo, use `makeStyles((t) => …)` com tokens (`t.colors.*`, `t.space.*`, `t.radius.*`).
2. **Componentes consomem tokens semânticos**, nunca `palette.*`. Isso faz o dark mode e um rebrand serem mudanças em um único arquivo.
3. **Espaçamento só por token** (`<Stack gap="md" padding="lg">`), na grade de 4pt.
4. **Acessibilidade vem embutida**: `accessibilityRole`/`State` corretos, alvo de toque ≥ 44pt (`size.controlMd`), `maxFontSizeMultiplier` no `Text`, erros de campo anunciados com `role="alert"`.
5. **Contraste é testado.** `tokens/tokens.test.ts` falha se algum par texto/fundo dos dois temas ficar abaixo do WCAG AA (4.5:1 para texto, 3:1 para componentes).

## Tema

`ThemeProvider` recebe `preference: 'system' | 'light' | 'dark'` (persistida em Configurações). `useTheme()` devolve o tema atual. `makeStyles` calcula os estilos uma vez por tema, fora do render.

```tsx
const useStyles = makeStyles((t) => ({
  row: { padding: t.space.lg, borderColor: t.colors.border },
}));
```

## Catálogo vivo

Configurações → **Design system** (`src/app/design-system.tsx`) renderiza tokens e todos os componentes com os componentes reais. O flow Maestro `design-system.yaml` (tag `ui`) captura esse catálogo em light e dark a cada execução completa, para revisão visual.

## Adicionando um componente

1. `packages/ui/src/components/Novo.tsx`, usando apenas tokens semânticos.
2. Exporte em `src/index.ts`.
3. Teste de comportamento e acessibilidade em `components.test.tsx` (role, estado, eventos).
4. Adicione ao catálogo em `DesignSystemScreen.tsx`.
