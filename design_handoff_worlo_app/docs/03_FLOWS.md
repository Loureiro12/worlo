# 03 · Fluxos e navegação

## Mapa de navegação

```
Splash ─┬─> (sessão salva) última tela
        └─> Boas-vindas ─┬─ Começar ─> Criar conta ─> Onboarding mapa ─> Cadastro viagem ─> Primeiro mapa ─> Tabs
                         └─ Já tenho conta ─> Entrar ─┬─> Explorar
                                                       └─ Esqueci a senha ─> E-mail enviado

TABS
├─ Explorar ── Busca ── (resultado) País | Cidade | Região | Lugar | Passeio | Perfil | Roteiro | Viagem
│   ├─ Notificações ── Convite ── Viagem/Destino
│   ├─ Salvos ── Coleções ── Coleção
│   ├─ Modo viagem (card) ── Encerrar ─> Viagem
│   ├─ Memória ─> Viagem
│   ├─ Lugares p/ conhecer ─> Cidade/País
│   ├─ Destinos populares ─> País | Mapa(país)
│   ├─ Passeios em destaque ─> Passeio ; Ver todos ─> Passeios ─> Passeio | Anuncie
│   └─ + ─> sheet Adicionar viagem ─> Cadastro (Já fui | Quero ir)
├─ Mapa ── sheet País ─> Página do país ─> Região | Cidade ─> Lugar
│   └─ Compartilhar (mapa)
├─ Viagens
│   ├─ Realizadas ─> Viagem ─┬─ Editar ─> Cadastro (edição)
│   │                        ├─ Quem foi ─> sheet Pessoas
│   │                        ├─ Gastos ─> sheet Novo gasto
│   │                        ├─ Retrospectiva ─> Compartilhar
│   │                        └─ Compartilhar
│   ├─ Quero ir ─> Destino desejado ─┬─ Quem vai ─> sheet Pessoas
│   │                                ├─ Página do país
│   │                                └─ Começar roteiro ─> Editor de roteiro
│   └─ Roteiros ─> Editor ─┬─ Adicionar parada (sheet)
│                          ├─ Começar viagem ─> Modo viagem
│                          └─ Compartilhar
│       └─ Recomendados ─> Roteiro (leitura) ─ Usar ─> Editor
├─ Comunidade ── Post ─> Perfil público ─> Chat
│   ├─ Busca
│   ├─ Publicar ─> Post
│   └─ Especialistas
└─ Perfil
    ├─ Ver como outros veem (perfil público próprio)
    ├─ Compartilhar meu mundo / Conquista ─> Compartilhar
    ├─ Lugares salvos / Coleções
    ├─ Importar fotos ─> sheet Associar
    └─ Configurações ─> Editar perfil | E-mail | Segurança | Idioma | Moeda | Unidades | Privacidade | Exportar | Ajuda ─> Chat suporte | Excluir conta
```

## Regras gerais
- **Voltar** usa a pilha de navegação; sem pilha volta para a aba atual.
- **Trocar de aba** zera a pilha da aba e fecha qualquer sheet.
- **Qualquer navegação fecha sheets abertas** (adicionar, coleção, colaboradores, gasto, fotos, avatar, sugestões, modo viagem).
- Persistir última tela/aba para retomar após o splash.

## Fluxos detalhados

### F1. Primeiro acesso
1. Splash (3s) → Boas-vindas.
2. "Começar pelo meu mapa" → Criar conta (social ou e-mail). Validações em `04`.
3. Onboarding mapa: tocar países (≥1 para continuar; "Pular" vai ao app).
4. Cadastro da viagem (destino pré-preenchido com o 1º país): nome obrigatório; pode convidar colaboradores.
5. Primeiro mapa: países marcados acesos + stats → "Ver meu mapa" ou "Explorar destinos".

### F2. Registrar viagem realizada
Explorar "+" ou Viagens "+" → sheet "Viagem que já aconteceu" → Cadastro → Salvar → aba Viagens/Realizadas + toast ("Viagem salva no seu mapa." ou "Viagem salva. Convite enviado pra Marina.").

### F3. Colaboração (lado de quem convida)
1. No cadastro/edição ou no card "Quem foi" → buscar amigo → Convidar (status **pendente**).
2. Convidado aceita → status **ok** ("Colaborador · pode editar tudo"). Atividade dos colaboradores aparece no card e em Notificações.
3. Dono pode remover colaboradores; colaborador não remove ninguém.
4. A viagem aparece no perfil público do colaborador com "com {dono} e …"; no perfil do dono, "com {colaboradores}".

### F4. Colaboração (lado de quem recebe)
1. Notificação "Bia convidou você pra a viagem 'Réveillon em Jeri'" com Aceitar/Recusar, ou abrir Convite.
2. Aceitar (viagem realizada) → entra em Realizadas, país acende no mapa, abre a viagem; card mostra "Criada por Bia · você é colaboradora".
3. Aceitar (viagem futura) → entra em Quero ir e abre o destino.
4. Recusar → chip "Convite recusado"; ainda pode "Aceitar mesmo assim" na tela do convite.

### F5. Gastos compartilhados
Viagem › Gastos › Adicionar gasto → valor, descrição, categoria, dividir com colaboradores (mostra "Fica R$ X pra cada um (N pessoas)"), comprovante → Salvar → lista + totais recalculados + toast "Gasto salvo. Marina deve R$ X cada."

### F6. Planejar e viajar
1. Viagens › Roteiros › Criar (ou copiar recomendado) → Editor: dias, paradas (sugestões), remover.
2. "Começar viagem agora" (no editor) ou card no Explorar → **Modo viagem** (pílula flutuante em todas as abas).
3. Check-in / Foto / Gasto / Nota → Registro do dia; marcar paradas do plano como feitas.
4. Encerrar → resumo → cria viagem realizada (com colaboradores do roteiro), acende país, abre a viagem.

### F7. Descobrir e reservar
Explorar › Passeios › filtro/busca → Detalhe → data (não esgotada) + pessoas → Reservar → "Reservado" + toast. Coração salva em Lugares salvos.

### F8. Salvar e organizar
Bookmark (cidade, lugar, passeio) → Lugares salvos → pasta → sheet coleção (marcar/criar). Remover dos salvos remove de todas as coleções.

### F9. Comunidade
Ler → confirmar/contestar (toggle, 1 voto por usuário) → comentar. Publicar (tipo, lugar, nota, texto, fotos, viagem, visibilidade) → post "Aguardando confirmações" no topo do feed e em "Dicas" do perfil. Autor não vota no próprio post.

### F10. Busca
Digitar → resultados por categoria (sem acento, todas as palavras). Enter/tocar resultado salva em recentes (máx. 5). Sem resultado → "Perguntar pra comunidade".

### F11. Compartilhar
De Mapa, Perfil, Viagem, Retrospectiva, Roteiro ou Conquista → tela Compartilhar com o assunto já selecionado → formato/tema/@ → destino (share sheet nativo com a imagem gerada).

### F12. Conta
Configurações → subtelas com CTA fixo; salvar volta para Configurações + toast; Excluir conta exige "EXCLUIR".
