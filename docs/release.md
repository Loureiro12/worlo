# Versões de teste (TestFlight e Google Play)

Build e envio para as lojas são feitos na nuvem com EAS ([Build](https://docs.expo.dev/build/introduction/) + [Submit](https://docs.expo.dev/submit/introduction/)). Não precisa de Xcode nem Android Studio para isso. O projeto EAS é `@loureiro_12/worlo` ([painel](https://expo.dev/accounts/loureiro_12/projects/worlo)).

Todos os comandos rodam de dentro de `apps/mobile`.

## Perfis (`apps/mobile/eas.json`)

| Perfil       | Gera                           | Para quê                                                                                                                                             |
| ------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `production` | `.ipa` (iOS), `.aab` (Android) | TestFlight e Google Play (faixa **teste interno**). Incrementa o número do build sozinho.                                                            |
| `preview`    | `.ipa` ad hoc, `.apk`          | Instalar direto no aparelho por link, sem passar pelas lojas. No iOS, cada iPhone precisa ser registrado antes (`npx eas-cli@latest device:create`). |

**Versões.** A versão que aparece na loja (`version` em `app.config.ts`, hoje `1.0.0`) é manual: suba quando for lançar algo novo. O número do build (`buildNumber` / `versionCode`) fica no EAS (`appVersionSource: remote`) e sobe a cada build de `production`. Nunca edite esse número à mão.

## Uma vez só: Apple

1. Conta no [Apple Developer Program](https://developer.apple.com/programs/enroll/) (US$ 99/ano). A aprovação pode levar alguns dias.
2. Primeiro build: `pnpm build:store --platform ios`. O EAS pede o login da Apple e cria sozinho o bundle ID `com.worlo.app`, o certificado e o provisioning profile, e guarda tudo no EAS.
   - Se `com.worlo.app` já estiver em uso por outra conta, troque `ios.bundleIdentifier` em `app.config.ts` (por exemplo `app.worlo.ios`). **Depois do primeiro envio, o bundle ID não muda mais.**
3. O `--auto-submit` cria o app no App Store Connect se ele não existir. O nome na loja precisa ser único: se "Worlo" estiver ocupado, o EAS pede outro (por exemplo "Worlo: Your World"). O nome embaixo do ícone continua "Worlo".
4. Depois do primeiro envio, copie o **Apple ID** do app (App Store Connect › App Information) para `submit.production.ios.ascAppId` no `eas.json`. Isso evita perguntas nos próximos envios e permite enviar pelo CI.

### Testadores no TestFlight

- **Internos** (até 100 pessoas da sua equipe no App Store Connect): recebem o build assim que a Apple termina de processar (~10–30 min). Não tem revisão.
- **Externos** (até 10 mil pessoas, por e-mail ou link público): o primeiro build de cada versão passa pela revisão beta da Apple (normalmente menos de 1 dia). Ela pede:
  - descrição do beta e e-mail para feedback;
  - **conta de demonstração**: nesta fase visual, qualquer e-mail válido com qualquer senha entra no app (por exemplo `teste@worlo.app` / `worlo1234`). Diga isso nas notas para o revisor;
  - URL de política de privacidade.

## Uma vez só: Google

1. Conta no [Google Play Console](https://play.google.com/console/signup) (US$ 25, pagamento único). Contas pessoais novas passam por verificação de identidade.
2. No Play Console: **Criar app** com o nome "Worlo", idioma padrão Português (Brasil), tipo App, gratuito.
3. Crie uma chave de conta de serviço do Google para o EAS enviar por você ([passo a passo](https://expo.fyi/creating-google-service-account)) e cadastre no EAS: `npx eas-cli@latest credentials --platform android` › production › Google Service Account. **Não coloque o JSON da chave no repositório.**
4. Primeiro build: `pnpm build:store --platform android`. O EAS gera e guarda a chave de assinatura (upload key). O Google cuida da chave final (Play App Signing).
5. Em **Testar › Teste interno**, crie uma lista de e-mails de testadores (até 100) e compartilhe o link de participação.

> Contas pessoais criadas depois de nov/2023 precisam rodar um **teste fechado com 12+ testadores por 14 dias** antes de poder publicar em produção. O teste interno não tem essa exigência, mas vale começar o fechado cedo.

## Toda nova versão de teste

```sh
cd apps/mobile
pnpm build:store --platform all      # build das duas lojas + envio automático
```

Ou separado: `pnpm build:store --platform ios`, depois `pnpm build:store --platform android`. Se o build terminou mas o envio falhou, mande de novo sem recompilar: `pnpm submit --platform ios` (ou `android`).

Antes de gerar o build, rode `pnpm check` na raiz e, de preferência, o E2E (`pnpm e2e`). O build da loja usa o mesmo código.

## Problemas comuns

- **Google: "Only releases with status draft may be created on draft app".** Enquanto o app não tem a ficha da loja completa, o Play só aceita rascunhos. Adicione `"releaseStatus": "draft"` em `submit.production.android` no `eas.json` e publique o rascunho em Play Console › Teste interno. Tire a linha quando o app sair de rascunho.
- **Google recusa o primeiro envio pela API.** Faça o primeiro upload à mão: baixe o `.aab` no painel do EAS e envie em Play Console › Teste interno › Criar versão ([guia](https://docs.expo.dev/submit/android-manual/)).
- **Apple: "Missing Compliance".** Não deve aparecer: `ios.config.usesNonExemptEncryption: false` já declara que o app usa só HTTPS padrão.
- **Ícones.** São gerados a partir do "Ícone do app" da Identidade Visual v1 (`assets/icon.png`, `android-icon-*.png`, `splash-icon.png`). Se a marca mudar, troque esses arquivos.
