# 04 · Interações, validações e estados

## Validações de formulário
Padrão: validar no envio; destacar **apenas o primeiro campo com erro** (borda `#B3261E`) e mostrar uma mensagem abaixo do formulário (ícone warning-circle fill 18 + 14/600). Ao digitar no campo, o erro some.

| Formulário | Regra (ordem) | Mensagem |
|---|---|---|
| Criar conta | nome não vazio | "Diz como a gente pode te chamar." |
| | e-mail `/.+@.+\..+/` | "Confere o e-mail, parece incompleto." |
| | senha ≥ 8 | "A senha precisa ter pelo menos 8 caracteres." |
| Entrar | e-mail válido; senha não vazia | idem / "Digite sua senha." |
| Esqueci a senha | e-mail válido | idem |
| Cadastro de viagem | destino; nome | "Falta dizer pra onde foi." / "Dá um nome pra essa viagem." |
| Onboarding mapa | ≥1 país | toast info "Marca pelo menos um país pra começar." |
| Novo gasto | valor > 0; descrição | "Quanto foi?" / "Dá um nome pro gasto." |
| Anuncie | nome; cidade; e-mail | "Falta o nome do negócio." / "Diga em qual cidade você atua." / "Confere o e-mail de contato." |
| Nova coleção | nome não vazio | borda erro no input |
| Publicar | lugar; nota (se Avaliação); texto ≥ 10 | "Diz onde foi." / "Dá uma nota de 1 a 5." / "Escreve um pouco mais (mínimo 10 caracteres)." |
| Editar perfil | nome; usuário `^[a-z0-9._]{3,}$` (auto minúsculas, sem espaços) | "O nome não pode ficar vazio." / "Use 3+ letras minúsculas, números, ponto ou _." |
| Trocar e-mail | válido; ≠ atual; senha | "Confere o novo e-mail." / "Esse já é o seu e-mail." / "Digite sua senha atual." |
| Senha | atual; nova ≥ 8; confirmação igual | "Digite a senha atual." / "A nova senha precisa de 8 caracteres." / "As senhas não batem." |
| Excluir conta | texto = "EXCLUIR" (case-insensitive) | botão desabilitado (.45) até bater |
| Modo viagem | check-in exige lugar; gasto > 0; nota não vazia | "Escolha onde você está." / "Quanto foi?" / "Escreva alguma coisa." |

Campos monetários aceitam apenas `[0-9.,]`; vírgula = decimal (pt-BR). Formatação `toLocaleString('pt-BR')`.

## Feedback (toasts)
Sucesso (check verde) ao salvar/criar/convidar/reservar; Info (azul) ao remover ou para limites; Erro (vermelho) para falhas de rede. Exemplos: "Viagem salva no seu mapa.", "Convite enviado pra Marina.", "Reserva confirmada pra sáb, 7 nov. Bom passeio!", "Removido dos salvos.", "Link copiado.", "O envio parou. A conexão caiu."

## Animações e transições

| Elemento | Animação | Duração / easing |
|---|---|---|
| Splash · brilho | fade in | 1.2s, atraso .3s |
| Splash · pin | cai de -120px, escala .6→1.04→.98→1 | .9s `cubic-bezier(.3,1.3,.5,1)`, atraso .1s |
| Splash · sombra | scaleX .2→1.15→1, opacidade 0→.5→.35 | .9s |
| Splash · órbitas | fade in .8s (atraso .9s); rotação 3.6s / 5.4s linear infinita | |
| Splash · ondas | scale .4→1.9, opacidade 0→.9→0 | 2.2s ease-out, infinito, atrasos 1.1s e 2.2s |
| Splash · ponto do pin | r 5→6.4→5 | 1.4s ease-in-out, infinito, atraso 1s |
| Splash · "Worlo"/tagline | sobe 14px + fade | .7s `cubic-bezier(.2,.8,.2,1)`, atrasos .75s / 1s |
| Splash · barra | scaleX 0→1 (origem esquerda) | 1.8s `cubic-bezier(.4,0,.2,1)`, atraso 1.1s |
| Splash · saída | após 3s → próxima tela (sugestão: fade 250ms) | |
| Globo · rotação ao centralizar | lerp 9%/frame até <0.1° | |
| Globo · inércia | velocidade × 0.94/frame | |
| Globo · deslocamento com sheet aberta | translateY -150 (lerp 12%) | |
| Pulso no Brasil (onboarding) | anel 8→36px, opacidade 1→0 | 1.4s loop |
| Push entre telas (recomendado) | slide horizontal padrão iOS/Android | 300ms |
| Sheets (recomendado) | slide up + overlay fade | 250–300ms, spring |
| Toast | fade/slide do topo | 200ms, some em 2.4s |
| Chat "digitando…" | resposta automática em 1.4s (protótipo) | |
| Importação de fotos | progresso +6% a cada 140ms (simulação) | |
| Skeleton (loading) | sugestão: shimmer 1.2s | |

Hover/pressed: cards ganham sombra `hover`; botões primários vão a coral-300; linhas de lista ganham fundo areia. Focus visível: outline 2px coral offset 2.

## Gestos (recomendado para o app nativo)
Arrastar sheets para fechar; pinça e arraste no globo; deslizar para voltar (iOS); pull-to-refresh em feeds (Comunidade, Notificações, Explorar).

## Estados de tela

### Vazio (primeiro uso)
| Tela | Ícone | Título | Texto | CTA / secundário |
|---|---|---|---|---|
| Viagens › Realizadas | suitcase-rolling | Nenhuma viagem por aqui ainda | Guarde a primeira e veja seu mapa começar a acender. | Adicionar viagem / Importar fotos da galeria |
| Viagens › Quero ir | diamond | Sua lista de desejos está vazia | Salve países e cidades que você quer conhecer. Dá pra fazer direto do mapa. | Explorar destinos / Abrir o mapa |
| Viagens › Roteiros | map-trifold | Nenhum roteiro ainda | Monte um do zero ou copie um roteiro pronto de quem já foi. | Criar roteiro / Ver roteiros recomendados |
| Mapa | — (card branco) | Seu mapa está apagado | Toque nos países que você já conhece e veja o mundo acender. | Marcar países / Adicionar viagem |
| Perfil | globe-hemisphere-west | Seu mundo começa aqui | Marque os países que você já visitou… | Marcar países / Adicionar viagem |
| Salvos | — | Você ainda não salvou nenhum lugar. | Toque no marcador de qualquer lugar pra guardar aqui. | — |
| Notificações | — | Nada por aqui ainda… | — | — |
| Viagem › Dia a dia | — | Nada por dia ainda. | Quando você importar as fotos, a gente organiza a linha do tempo sozinho. | — |
| Viagem › Gastos | — | Nenhum gasto registrado. | Anote o que gastou e veja pra onde foi cada real. | Adicionar gasto |
| Roteiro › dia | — (tracejado) | Dia livre, por enquanto. | Adicione uma parada ou deixe pra decidir lá. | Adicionar parada |
| Coleção | — (tracejado) | Coleção vazia, por enquanto. | Escolha lugares dos seus salvos pra começar. | Adicionar dos salvos |
| Busca sem resultado | — | Nada encontrado pra "{q}". | Confere a grafia ou tenta um termo mais amplo, como o país. | Perguntar pra comunidade |
Layout do vazio padrão: card branco raio 24, padding 28×20, centralizado; círculo 72 coral-100 com ícone 34 coral-700; título Bricolage 21/27; texto 14/20 cinza (máx 280); CTA primário 48; link secundário.
No primeiro uso, Explorar oculta o card de modo viagem e a memória.

### Carregando
Skeleton cobrindo o conteúdo (abaixo da status bar até a tab bar): barra de título 55%×30, busca 48, 3 chips, 2 cards (imagem 150 + 2 linhas), "Carregando…". Claro: blocos `#E2DDD8` em cards brancos; escuro (Mapa): `rgba(255,253,252,.1)`. Aplicar a Explorar, Viagens, Comunidade, Perfil, Mapa, Busca, Passeios.

### Sem conexão (offline-first)
- Faixa fixa acima da tab bar (36pt, `#3A3733`, ícone wifi-slash coral-300): "Sem conexão · mostrando o que está salvo · Tentar". A pílula do modo viagem sobe para bottom 128.
- Telas que exigem rede (Comunidade, Busca, Passeios, Passeio, Post, Perfil público) mostram estado cheio: ícone wifi-slash 40 em círculo 84 branco, "Você está sem internet", explicação, "Tentar de novo", "Ver minhas viagens".
- **Funcionam offline:** viagens, roteiros, modo viagem (registros salvos no aparelho, "Salvo no aparelho"), fotos locais, salvos. Sincronizar ao reconectar.
- Importação de fotos interrompida: "85 de 146 fotos foram enviadas. O resto ficou guardado no aparelho." + "Continuar envio" (retoma de onde parou).

### Erro de servidor
Estado cheio: ícone cloud-x em círculo coral-100, "Algo deu errado do nosso lado", "Não conseguimos carregar essa tela agora. Seus dados estão seguros, tenta de novo em instantes.", "Tentar de novo", "Falar com o suporte", "Código WRL-503". Aplicar a Explorar, Mapa, Viagens, Comunidade, Perfil, Busca.

### Outros estados de componente
- Botão desabilitado: opacidade .4–.45.
- Data de passeio esgotada: opacidade .45 + toast "Esse dia esgotou. Tenta outro?".
- Passeio reservado: botão vira outline "Reservado"; card na lista ganha chip carvão "Reservado".
- Post próprio: votos bloqueados (toast "Quem confirma são outros viajantes.").
- Conquista bloqueada: opacidade .55, toque mostra progresso ("20 cidades: faltam 10.").

## Regras de negócio
- **Confiabilidade de dica:** % = sim/(sim+não). ≥90% e com votos = "Alta confiabilidade" (verde); senão "Em verificação"; 0 votos = "Aguardando confirmações". 1 voto por usuário, alternável.
- **Gastos:** sempre privados no perfil público; visíveis só a participantes da viagem. Divisão igual entre o autor + selecionados.
- **% do mundo:** países visitados / 195.
- **Progresso de roteiro:** dias com ≥1 parada / total de dias.
- **Importação:** associa por data + GPS; sem GPS vai para "Sem viagem", com sugestão por data coincidente.
- **Câmbio no modo viagem:** moeda local → moeda do usuário (protótipo: S/ 1 = R$ 1,52).
- **Remover dos salvos** remove de todas as coleções.
- **Recusar convite** não notifica o dono com detalhes.
