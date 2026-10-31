# 02 · Telas

Cada tela: **ID** (nome no protótipo/barra lateral) · propósito · layout · conteúdo · ações. Medidas em pt. "Header sticky" e demais padrões estão em `01_COMPONENTS.md`.

---

## A. Abertura, conta e onboarding

### A1 · Splash (`splash`)
- Fundo carvão em tela cheia, z acima de tudo. Brilho radial coral `rgba(228,91,51,.22)` centrado a 44% vertical.
- Centro (220×220): órbita externa 1px `rgba(255,253,252,.10)` com ponto coral 10px girando (3.6s linear); órbita interna (inset 22) tracejada `.08` com ponto coral-300 6px girando ao contrário (5.4s); 2 anéis coral 120px expandindo (2.2s, atraso 1.1s/2.2s); pin branco 64×80 com ponto coral (r5→6.4 pulsando 1.4s); sombra elíptica 44×10 desfocada.
- "Worlo" Bricolage 52/56 800 -0.03em; "Your World, Your way" 12/700 .22em uppercase coral-300 (margin 10).
- Barra de progresso 120×3 a 72 do fundo (coral preenchendo em 1.8s). "Toque pra pular" 11/600 `#67615A` a 44 do fundo.
- **Tempo total 3s** → vai para a última tela da sessão ou Boas-vindas. Toque em qualquer ponto pula. Timeline: ver `04_INTERACTIONS.md`.

### A2 · Boas-vindas (`welcome`)
- Fundo carvão; globo 3D grande (510×560 posicionado -60, 30) girando com países visitados de exemplo; gradiente para carvão a partir de 45% da altura.
- Bloco inferior (padding 0 24 44, gap 16): logo pin+“Worlo” 24/800; overline "Your World, Your way" coral-300; H "Seu mundo, do seu jeito." 46/48 800; parágrafo 16/24 `#CFC9C4`.
- Botões: Primary "Começar pelo meu mapa" → Criar conta; Outline branco (borda `rgba(255,253,252,.24)`) "Já tenho conta" → Entrar.

### A3 · Criar conta (`signup`)
- Fundo areia, header com voltar + logo central. H1 "Crie sua conta" + subtítulo.
- Botões sociais lado a lado (52, outline `linha`): Apple (apple-logo fill), Google. Divisor "ou com e-mail".
- Campos: "Como podemos te chamar?" (user), E-mail (envelope), Senha (lock + olho) + medidor de força.
- Erro inline + CTA "Criar conta". Termos/Política (links coral-700). Rodapé "Já tem conta? Entrar".
- Validação: nome obrigatório; e-mail `/.+@.+\..+/`; senha ≥ 8. Força: 0 vazio, 1 <8, 2 ≥8, 3 ≥10 com letra+número.
- Sucesso → Onboarding mapa.

### A4 · Entrar (`login`)
- Igual estrutura. H1 "Que bom te ver de novo". E-mail + senha, link "Esqueci minha senha" (alinhado à direita), CTA "Entrar", rodapé "Ainda não tem conta? Criar conta".
- Sucesso → Explorar + toast "Bem-vinda de volta, {nome}."

### A5 · Esqueci a senha (`forgot`)
- Estado 1: H1 "Esqueceu a senha?", e-mail, CTA "Enviar link".
- Estado 2 (enviado): ícone envelope-open 64 em coral-100, "Confere seu e-mail", "Enviamos o link pra {email}. Ele vale por 30 minutos.", CTA "Voltar pra entrar", link "Não chegou? Enviar de novo".

### A6 · Comece pelo seu mapa (`onbMap`)
- Fundo carvão, globo 390×500 a partir do y 170, **sem auto-rotação**, pulso coral sobre o Brasil até o primeiro toque.
- Topo: overline "Passo 1 de 2", link "Pular"; H "Comece pelo seu mapa" 30/36; texto "Gire o globo e toque nos países que você já conhece…".
- Rodapé: card contador (número coral Bricolage 32 + "países marcados" + nomes separados por " · ", ellipsis) e CTA "Continuar" (opacidade .4 se 0; toque mostra toast info).
- Toque em país alterna visitado.

### A7 · Cadastro da viagem (`tripForm`) — também usado para Nova viagem, Novo destino e Editar
- Header sticky: voltar · overline ("Passo 2 de 2" / "Nova viagem" / "Novo destino" / "Editar").
- Título/sub por modo. Segmented "Já fui / Quero ir" (oculto ao editar).
- Campos: Destino (map-pin), Nome da viagem/destino.
- **Quem foi/vai com você** (colaboradores): nota coral-100 explicando permissões; chips selecionados (avatar 30 + primeiro nome + x); busca "Buscar amigos no Worlo"; lista de sugestões (3 sem busca, até 6 com) com botão "Convidar"; link "Convidar por link".
- Só "Já fui": Quando foi; Tipo de viagem (chips Sozinho(a)/Casal/Família/Amigos/Trabalho); Gastronomia; Compras; Outras experiências (chips Praia, Trilha, Museu, Show, Barco, Vida noturna, Festa local); card "Fotos dessa viagem — importar depois".
- Barra fixa: CTA "Salvar no meu mapa" / "Salvar destino" / "Salvar alterações".
- Validação: destino e nome obrigatórios (borda erro + mensagem).

### A8 · Primeiro mapa pessoal (`firstMap`)
- Carvão, globo com os países marcados girando devagar. Overline "Roteiro salvo", H "Seu mapa começou." 40/44, texto.
- 3 stat tiles escuros (países, viagem, cidade). CTA "Ver meu mapa" → aba Mapa; link "Explorar destinos".

---

## B. Abas principais

### B1 · Explorar (`explore`)
- Header: "Oi, {nome}" 14/600 + H1 "Para onde vamos?"; ações: sino (badge não lidas), salvos (bookmark), avatar 44 (foto ou iniciais).
- Busca pílula (abre Busca) + FAB "+" (sheet Adicionar viagem).
- Chips de categoria: Tudo/Praias/Cidades/Trilhas (filtram "Lugares para conhecer").
- **Card modo viagem:** desligado = coral-100 "Sua viagem começa hoje · Cusco e Machu Picchu · Toque pra ligar o modo viagem"; ligado = carvão "Viajando agora · Dia 2 de 4 · Vale Sagrado".
- **Card memória** (carvão): thumb 84, "Há um ano · Você estava em Florianópolis · 42 fotos · 6 lugares" → viagem.
- **Lugares para conhecer:** carrossel cards 240 (foto 170 raio 16 + botão "Quero ir" sobre a foto + nome + meta).
- **Destinos populares:** cards 136 (bandeira 28, nome, "N mil viajantes").
- **Passeios em destaque** + "Ver todos": 3 linhas com thumb 64, nome, meta, nota.
- Ocultos no estado vazio: card modo viagem e memória.

### B2 · Mapa (`map`) — inclui telas 5–8 da Tese
- Globo em tela cheia (390×844) fundo carvão.
- Header com gradiente carvão→transparente: H1 "Seu mapa" + "N países · N cidades · N viagens"; segmented Tudo/Visitados/Quero ir; chips de ano (Todos os anos, 2025, 2024…).
- Coluna direita (top 300): botão coral **compartilhar**, +, −, recentrar (44, fundo `rgba(19,19,17,.7)`).
- Legenda (pílula escura) com os 3 marcadores + dica "Aproxime para ver cidades e fotos".
- **Resumo do país (sheet):** bandeira 36, nome H 26, chip de status; fatos (Capital, Idioma, Moeda); histórico ("Você: 3 viagens · 5 cidades · desde 2019"); botões "Já fui"/"Quero ir" (toggle); CTA "Ver página do país" (se existir).
- Estado vazio: card branco "Seu mapa está apagado" com Marcar países / Adicionar viagem.

### B3 · Viagens (`trips`)
- Header sticky: H1 "Suas viagens" + "+". Segmented **Realizadas / Quero ir / Roteiros**.
- **Realizadas:** agrupadas por ano (overline), card com mosaico, título, "🇧🇷 Florianópolis, Brasil · 6 dias", "período · com Marina e João".
- **Quero ir:** linhas com bandeira em círculo 48, nome, "Melhor época…"; losango à direita; botão tracejado "Adicionar destino".
- **Roteiros:** cards com foto 120 + chip status, título, local · datas, barra de progresso (dias com paradas / total); botão tracejado "Criar roteiro"; card escuro "Roteiros prontos de quem já foi" → Recomendados.
- Estados vazios em cada segmento (ver 04).

### B4 · Comunidade (`community`)
- Header sticky: H1 "Comunidade" + lupa + "+" coral (Publicar).
- Segmented Para você / Seguindo / Especialistas.
- **Card de post:** avatar 40 + autor + "em {lugar} · {tempo}" + chip tipo (Dica/Roteiro/Avaliação/Pergunta); estrelas (avaliação); texto 15/22; foto 170 (opcional); "% confirmam" + botões ✓ N / ✕ N (toggle por usuário). Toque → detalhe; toque no autor → perfil público.
- **Especialistas:** cards com avatar carvão 48, nome, papel, botão Seguir, chip "Especialista verificado · área", destaque com título + texto.

### B5 · Meu perfil (`profile`)
- Header sticky: avatar 72 (foto/iniciais) + nome 26 + "@usuario · cidade". Bio. Botões "Ver como outros veem" (outline) + "Compartilhar meu mundo" (coral).
- Card globo carvão 230: overline "Seu mundo", "X,X%" 44/800, "N de 195 países".
- Stats 2×2 (países, cidades, viagens, lugares).
- **Conquistas:** carrossel 124px; ícone 40 em círculo (desbloqueada coral + ícone branco; bloqueada `#67615A` + branco, opacidade .55); toque abre Compartilhar.
- Cards Lugares salvos / Coleções. Privacidade (segmented Privado/Amigos/Público + explicação). Linhas: Importar fotos, Configurações, Rever boas-vindas.

---

## C. Viagens e destinos

### C1 · Página da viagem (`trip`)
- Hero 320 (foto capa + scrim), barra sticky: voltar · compartilhar + "Editar".
- Card sobreposto: título 28/34; linhas com ícone (local, período · dias, total, pessoas).
- **Card "Quem foi"**: título + "Convidar"; pilha de avatares + nomes + "N colaboradores · N convites pendentes" (ou "Criada por Bia · você é colaboradora"); **Atividade recente** (avatar 28 + "Marina adicionou 12 fotos no Dia 2" + tempo).
- Segmented **Visão geral / Dia a dia / Gastos**.
  - Visão geral: grade de fotos 3 col (6º tile "+N"), Lugares visitados (check coral + nota), Diário (citação), card escuro "Retrospectiva pronta".
  - Dia a dia: por dia, linha do tempo (ícone em círculo 36 + linha vertical 1.5 `linha`), hora, título, nota, chip extra coral-100 (custo/fotos/nota).
  - Gastos: total Bricolage 40, "R$ X por dia · N dias", barra empilhada por categoria (Hospedagem carvão, Comida coral, Passeios coral-300, Transporte cinza, Compras linha), legenda com %/valor; lançamentos (ícone, nome, categoria · data, valor, "comprovante"); "Adicionar gasto" → sheet.
- Vazios: "Nada por dia ainda", "Nenhum gasto registrado".

### C2 · Retrospectiva (`retro`)
- Carvão, barras de story (4 segmentos 3px), overline "Retrospectiva · ano", fechar. Título 44/46. Colagem (1.3fr/1fr, 130+130). Stats 2×2 escuros. "Melhor momento" com estrela coral. CTA "Compartilhar" → Compartilhar (retro).

### C3 · Destino desejado (`future`)
- Hero 280; bandeira + nome 32; chip "Quero ir" (losango) + "Salvo em …".
- Card **"Quem vai"** (mesmo do C1). Fatos 2×2 (capital, idioma, moeda, melhor época). "Por que você quer ir" (nota). Card coral-100 "Até lá, veja o que outras pessoas viram…" → página do país. CTA "Começar um roteiro" (cria roteiro e abre editor).

### C4 · País (`country`)
- Hero 260; breadcrumb "Europa › Portugal"; bandeira + H1 34; tagline; chip status.
- Fatos 2×2 com ícone: Moeda, Custo médio, Gastronomia, Mobilidade, Idioma, Religião (ícone info → tooltip "Estimativa…").
- "Regiões mais visitadas" (chips → Região). "Cidades" grade 2 col (foto 120). Fonte dos dados (seal-check 12).

### C5 · Região (`region`)
- Hero 240; breadcrumb "Portugal › Lisboa e Vale do Tejo"; H1 32; tagline. Fatos (Clima, Melhor época, Como chegar, Entre cidades). Cidades da região (linhas com foto 72). "Não dá pra perder" carrossel 200.

### C6 · Cidade (`city`)
- Hero 240; breadcrumb com links; H1 "Lisboa"; clima.
- Chips com ícone: Atrações/Gastronomia/Compras/Transporte/Serviços. Itens: thumb 56, nome, meta, nota, **botão salvar (bookmark)**; toque → Lugar.
- "Dica da comunidade" (confiabilidade + votos). CTA "Adicionar ao roteiro".

### C7 · Lugar (`place`)
- Hero 280 + salvar no topo. Breadcrumb, H1 28, nota · avaliações · viajantes. Descrição. Tabela (Horário, Preço, Endereço, Tempo médio). "Dicas de quem foi". Card "Passeios por perto". Barra fixa: Salvar (outline) + "Adicionar ao roteiro" (coral).

---

## D. Planejamento

### D1 · Meus roteiros (segmento em Viagens) — ver B3.

### D2 · Editor de roteiro (`roteiro`)
- Header sticky (voltar · "Meu roteiro"/"Recomendado" · compartilhar). Título 30, local; chips datas + status (meu) ou autor + salvamentos + nota (recomendado).
- Stats 3 col (dias, paradas, estimado R$).
- Chips Dia 1…N + "+ Dia" (tracejado).
- "Dia N · label": linha do tempo; cada parada com hora, título, nota, chip custo coral-100, botão remover (x).
- Vazio: "Dia livre, por enquanto."
- Barra fixa: "Começar viagem agora"/"Abrir modo viagem" (outline) + "Adicionar parada" (coral) — ou "Usar esse roteiro" (recomendado → copia para os seus).
- Sheet "Adicionar ao Dia N": sugestões perto de {local} com ícone, nome, nota · custo e "+".

### D3 · Roteiros recomendados (`recs`)
- Header, H1, texto. Chips Tudo/Europa/Ásia/América do Sul. Cards: foto 160 + chip "N dias", título, local, autor (avatar 28) · nota · salvamentos.

### D4 · Modo viagem (`live`)
- Topo carvão (padding 55 20 56): voltar · chip "● Viajando agora" · "Encerrar". "{flag} {roteiro}", H "Dia N · {label}" 34/38, "Você está em {local}". Barras de dias (6px, tocáveis). 3 tiles: Agora (clima), Hora local, Câmbio.
- Card de ações sobreposto (4 col): Check-in (coral), Foto, Gasto, Nota (coral-100), círculos 52.
- "Marina está viajando com você" (pilha de avatares).
- **Plano de hoje** (do roteiro): "N de M feitos"; item atual com borda 2 coral e "Agora · hh:mm"; feito = verde, riscado, opacidade .7; toque alterna.
- **Registro do dia**: "Salvo no aparelho" (cloud-check verde); itens com ícone/avatar 36, texto, citação/foto opcional, hora.
- Sheets: Check-in (lugares por perto com distância + nota), Foto (legenda), Gasto (S/ + conversão ≈ R$, categorias), Nota, Encerrar (resumo dias/fotos/lugares → cria viagem realizada e acende o país).
- **Pílula flutuante** (nas 5 abas): carvão, ponto coral com halo, "Viajando · Dia N · label", bottom 94.

---

## E. Descoberta comercial

### E1 · Passeios (`passeios`)
- Header, H1 "Passeios e experiências", busca, chips Tudo/Barco/Gastronomia/Trilhas/Cultura. Cards: foto 180 + "a partir de €45" + "Reservado"; nome 19; local · duração · nota (reviews); "por {host}". Card coral-100 "Tem um passeio pra oferecer? Anuncie no Worlo".

### E2 · Detalhe do passeio (`passeio`)
- Hero 300 + voltar/coração. Card sobreposto: overline cat · local, nome 26, nota · avaliações, chips (duração, idiomas, grupo).
- Host verificado, Sobre, Inclui (check-circle), ponto de encontro, **datas** (6 chips, 1 esgotado), **pessoas** (stepper 1–12), avaliação destaque.
- Barra fixa branca: total Bricolage 22/800 + "data · N pessoas" + botão Reservar (→ "Reservado" outline).

### E3 · Anuncie (`anuncie`)
- Header "Para negócios". H1, texto, 3 benefícios. Campos: Nome do negócio, Tipo (chips Guia/Agência/Restaurante/Hospedagem), Cidade, Descrição, E-mail. Validação nome → cidade → e-mail. Sucesso: check coral 64, "Recebemos seu cadastro." CTA vira "Voltar para passeios".

---

## F. Salvos

### F1 · Lugares salvos (`saved`)
- Header, H1, "N lugares em N cidades". Carrossel de coleções (mosaico 2×2 120) + "Ver todas". Chips Tudo/Atrações/Gastronomia/Passeios/Hospedagem. Grupos por cidade (overline "🇵🇹 Lisboa · 3"); item com thumb 64, nome, categoria · meta, nota + "em N coleções", botões bookmark (remover) e folder-plus (sheet coleção).

### F2 · Minhas coleções (`collections`)
- Grade 2 col: tile tracejado "Nova coleção" + mosaicos com nome Bricolage 17 e "N lugares".

### F3 · Coleção (`collection`)
- Mosaico 112 + nome 26 + "N lugares · N cidades"; lista com remover; "Adicionar dos salvos". Vazio tracejado.

### Sheet Salvar em coleção
- Lista de coleções com mosaico 48, contagem e check (círculo 26, coral quando dentro). Input "Nome da nova coleção" + "Criar". "Pronto".

---

## G. Comunidade e pessoas

### G1 · Detalhe da publicação (`post`)
- Header (voltar · tipo · compartilhar). Autor (avatar 44) → perfil. Texto 18/27. Foto 240 (opcional). **Bloco de confiabilidade:** % Bricolage 36 + rótulo (Alta confiabilidade ≥90% / Em verificação / Aguardando confirmações), barra verde, explicação, "Você esteve lá? Isso ainda vale?" + Está correto / Está errado. Comentários (avatar 32 + balão branco). Barra fixa: input pílula + enviar coral (opacidade .4 vazio).

### G2 · Perfil público (`traveler`) — também "Ver como outros veem" (usuário logado)
- Header "Viajante" / "Seu perfil público". Avatar 72, nome, @ · cidade, bio. (Próprio) faixa escura "É assim que outros viajantes veem seu perfil (privacidade). Gastos nunca aparecem." Seguir/Seguindo (ou Editar perfil) + mensagem.
- Card globo 200 com "Mapa de {nome}" e stats. Segmented Viagens / Dicas.
- Viagens: grade 2 col (foto 4:5), título, meta, **pilha de avatares + "com Ana e Caio"** em viagens compartilhadas (tocável).

### G3 · Chat (`chat`) — pessoas e suporte
- Header branco: voltar, avatar 40 (ou headset para suporte), nome, "Online agora"/"Responde em poucos minutos". Lista `column-reverse` (mais recente embaixo); balões: enviado coral-300 raio 18 18 6 18; recebido branco raio 18 18 18 6; hora 11. "digitando…". Suporte: chips rápidos (Problema com fotos, Minha reserva, Privacidade). Input + enviar (Enter envia).

---

## H. Colaboração

### H1 · Notificações (`notifs`)
- Header: voltar · "Notificações" · marcar todas como lidas (checks). H1 "O que rolou". Segmented Tudo/Convites. Grupos Hoje/Esta semana em card branco raio 24.
- Linha: avatar/ícone 44 + badge 22 (tipo) · texto com nome em negrito · tempo · ponto não lido. **Convites** com Aceitar/Recusar inline → depois chip "Você entrou na viagem"/"Convite recusado".
- Tipos: convite, atividade de colaborador, convite aceito, convite pendente (lembrete), lembrança "Há um ano", confirmações da comunidade, lembrete de roteiro, novo seguidor.

### H2 · Convite (`invite`)
- Hero 260; card: overline "Convite pra viagem realizada"/"…planejar juntos", título, local, período. Quem convidou (avatar 44 + balão de mensagem). "Quem foi/vai" (pilha + nomes + stats). "Como colaborador, você pode" (lista com ícones). Nota de privacidade de gastos.
- Barra: Recusar (outline) + Aceitar convite (coral). Aceito: "Você já está nessa viagem · Abrir". Recusado: texto + "Aceitar mesmo assim".

### Sheet Pessoas na viagem
- Nota de permissões; membros (avatar 36, nome, status: "Criou a viagem" / "Colaborador · pode editar tudo" verde / "Convite enviado · aguardando" coral-700) com remover (só dono); busca e sugestões "Convidar"; "Copiar link de convite".

---

## I. Publicar e buscar

### I1 · Busca (`search`)
- Barra: voltar + input pílula com borda 2 carvão (foco automático) + limpar. Chips Tudo/Destinos/Lugares/Passeios/Pessoas/Roteiros com contagem.
- Sem termo: Buscas recentes (até 5, "Limpar"), Em alta (chips com trend-up).
- Resultados agrupados (4 por grupo em "Tudo"): thumb 44 (redonda para países/pessoas), título, subtítulo, caret.
- Sem resultado: card + "Perguntar pra comunidade" (abre Publicar como Pergunta).

### I2 · Publicar (`compose`)
- Header (fechar · "Nova publicação"). Tipos em grade 4 (Dica, Avaliação, Roteiro, Pergunta) com ícone 22.
- Onde: busca de lugar + sugestões; selecionado em card com pin coral e "Trocar".
- Avaliação: 5 estrelas 44. Texto (≤500, contador, placeholder por tipo). Fotos (até 4, thumbs 76 com remover, adicionar tracejado "N/4"). Ligar a uma viagem (chips). Quem vê (Público / Só amigos).
- Validação: lugar → nota (avaliação) → texto ≥ 10. CTA "Publicar"/"Perguntar" → abre detalhe do post "Aguardando confirmações".

---

## J. Compartilhar (`share`)
- Fundo carvão. Fechar + "Compartilhar". Chips de assunto: Mapa, Meu mundo, Viagem, Retrospectiva, Roteiro, Conquista.
- **Preview** centralizado com sombra: Story 232×412 (9:16), Post 290×362 (4:5), 1:1 300×300. Padding 16, raio 18, gap 10. Sempre: logo + @usuário (toggle) no topo e "worlo.app/usuario" no rodapé.
  - Mapa: globo + "N países" 40/800 + "% do mundo · cidades · viagens" + bandeiras.
  - Meu mundo: título (curto fora do story), stats 2×2 (story) ou 4 em linha, foto da viagem favorita (oculta em 1:1).
  - Viagem: foto, local, título 24, período, pilha "com …", stats.
  - Retrospectiva: título, colagem 3 fotos, melhor momento.
  - Roteiro: foto 30%, "Próxima viagem", título, datas, dias (2 em 1:1, 4 nos outros).
  - Conquista: medalha 96 com halo, "Conquista desbloqueada", título, meta.
- Controles: segmented formato; 3 swatches de tema (Carvão, Coral, Areia); botão @.
- Destinos (5): Story → Stories, TikTok, WhatsApp; Post/1:1 → Feed, X, WhatsApp; + Salvar imagem, Copiar link.
- Temas: Carvão (fundo #131311, texto branco, destaque coral-300), Coral (fundo #E45B33, texto carvão), Areia (fundo #EEEAE7, texto carvão, cards brancos).
- **Exportar:** renderizar o preview em resolução real (Story 1080×1920, Post 1080×1350, 1:1 1080×1080) — escalar 4.65× / 3.72× / 3.6×.

---

## K. Conta

### K1 · Importação de fotos (`photos`)
- Header, H1 "Suas fotos", resumo. Card carvão com estados: idle (texto + "Importar fotos"), running ("Organizando N de 146…", barra), failed ("85 de 146… Continuar envio"), done ("146 fotos novas: 123… 23 sem viagem").
- Toggle "Organizar por localização". "Sem viagem (23)" grade 4 col + "Associar a uma viagem" (sheet com sugestão "Mesma data"). "Por viagem" (thumb, título, período, "N fotos").

### K2 · Configurações (`settings`)
- Grupos (overline + card branco raio 24): Conta (Editar perfil, E-mail, Senha e segurança), Preferências (Idioma, Moeda, Unidades), Notificações (4 toggles), Privacidade e dados (Privacidade, Fotos, Exportar), Suporte (Ajuda, Excluir conta). "Sair da conta" (outline erro). Versão.

### K3 · Subtelas (`cfg:*`) — header "Configurações" + H1 + sub + CTA fixo quando aplicável
- **Editar perfil:** avatar 88 + "Trocar foto" (sheet: Tirar foto, Galeria, fotos das viagens, Remover); Nome, @usuário (minúsculas, `^[a-z0-9._]{3,}$`, prévia worlo.app/…), Cidade, Bio (≤140).
- **Trocar e-mail:** card e-mail atual "Verificado"; novo e-mail (≠ atual) + senha atual.
- **Senha e segurança:** atual, nova (≥8), repetir (igual); toggle 2 etapas; aparelhos conectados (este aparelho / Sair).
- **Idioma / Moeda / Unidades:** radio lists; aplicam na hora (toast).
- **Privacidade do perfil:** segmented + toggles (Mapa, Viagens, Fotos, Aparecer na busca) + linha fixa "Gastos — sempre privados" com cadeado; Contas bloqueadas.
- **Exportar dados:** checkboxes (Viagens e roteiros, Fotos, Gastos, Comunidade), formato JSON/CSV+fotos, "Solicitar arquivo" → card "Pedido recebido".
- **Ajuda:** FAQ (acordeão), "Falar com o suporte" → chat, links.
- **Excluir conta:** card de alerta com o que se perde, "Exportar meus dados antes", input "EXCLUIR" (case-insensitive) habilita botão vermelho.
