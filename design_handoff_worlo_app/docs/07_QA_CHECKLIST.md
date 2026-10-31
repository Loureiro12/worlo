# 07 · Checklist de aceite (QA)

Marque cada item comparando com o protótipo (`prototype/Worlo App.dc.html`).

## Fundamentos
- [ ] Fontes Bricolage Grotesque (títulos) e Plus Jakarta Sans (UI) carregadas com os pesos corretos
- [ ] Todas as cores vêm dos tokens; nenhum azul padrão de link
- [ ] Ícones Phosphor; aba ativa com ícone fill **coral** e ponto coral
- [ ] Margens laterais 20; header 59 do topo; tab bar 84
- [ ] Status bar branca em telas escuras e em heróis com foto
- [ ] Foco visível (2px coral) em botões e inputs
- [ ] Contraste AA em todo texto (coral para texto só `#A83A19`)

## Abertura e conta
- [ ] Splash com a sequência completa (pin, órbitas, ondas, texto, barra); 3s; tocar pula
- [ ] Criar conta, Entrar, Esqueci com validações e mensagens da tabela
- [ ] Medidor de força de senha (3 níveis)
- [ ] Onboarding: tocar países no globo; contador; Continuar desabilitado com 0

## Globo/Mapa
- [ ] Arrastar, inércia, pinça/zoom, +/−, recentrar
- [ ] Cores e marcadores por status; contorno tracejado "quero ir"
- [ ] Cidades a partir de zoom 1.6; pílulas de fotos a partir de 2.3
- [ ] Toque em país centraliza e abre resumo; Já fui/Quero ir alternam
- [ ] Filtros Tudo/Visitados/Quero ir e por ano

## Viagens e colaboração
- [ ] Cadastro (Já fui/Quero ir) com convite de colaboradores
- [ ] Edição pré-preenchida; novos convidados recebem convite
- [ ] Card "Quem foi/vai" + sheet de pessoas; dono remove, colaborador não
- [ ] Atividade recente dos colaboradores
- [ ] Convite: aceitar/recusar pela notificação e pela tela; viagem entra nas listas e no mapa
- [ ] Perfil público mostra viagens compartilhadas com "com …"
- [ ] Gastos: novo gasto, divisão, comprovante, totais e categorias recalculados

## Planejamento
- [ ] Roteiro: dias, paradas, sugestões, remover, "+ Dia", copiar recomendado
- [ ] Modo viagem: plano do dia, check-in/foto/gasto/nota, registro, pílula flutuante, encerrar → viagem realizada

## Descoberta
- [ ] Busca sem acento, por palavras, categorias com contagem, recentes, em alta, sem resultado
- [ ] Páginas de país (tooltip), região, cidade (salvar), lugar (salvar, roteiro)
- [ ] Passeios: filtros, datas (esgotado), pessoas, total, reservar
- [ ] Anuncie: validação e sucesso

## Comunidade
- [ ] Feed, votos (1 por usuário), detalhe, comentários
- [ ] Publicar com todos os campos e validações; post próprio sem voto
- [ ] Especialistas com seguir

## Salvos
- [ ] Salvar/remover em cidade, lugar e passeio; coleções (criar, marcar, remover)

## Compartilhar
- [ ] 6 assuntos × 3 formatos × 3 temas, sem texto cortado (ver ajustes de "Meu mundo" em Post/1:1)
- [ ] Exporta imagem em 1080 px de largura; destinos via share sheet nativo

## Conta
- [ ] Importação de fotos (progresso, falha e retomada, associar à viagem)
- [ ] Configurações e todas as subtelas; foto do perfil reflete em Perfil/Explorar/Editar/perfil público
- [ ] Chat com pessoa e com suporte

## Estados
- [ ] Vazios de todas as telas da tabela em `04`
- [ ] Skeleton de carregamento
- [ ] Offline: faixa global + telas de rede bloqueadas + funções locais OK + sincronização
- [ ] Erro de servidor com código e suporte
- [ ] Sheets fecham ao navegar; toasts somem em 2.4s
