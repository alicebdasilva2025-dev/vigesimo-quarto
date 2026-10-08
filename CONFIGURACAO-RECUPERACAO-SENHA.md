# LiDire — Recuperação de senha

A VIGÉSIMO QUARTO implementa o fluxo completo de recuperação de senha por e-mail.

## Fluxo

1. Na tela de login, a pessoa toca em **Esqueci minha senha**.
2. Informa o e-mail.
3. O Worker gera um token aleatório de 32 bytes.
4. O D1 armazena somente o hash SHA-256 do token.
5. O token expira em 30 minutos e só pode ser usado uma vez.
6. O Worker envia um e-mail transacional com o link de recuperação.
7. O link abre a tela **Crie uma nova senha** no LiDire.
8. A nova senha é armazenada usando o mesmo PBKDF2 do restante da autenticação.
9. Todas as sessões anteriores da conta são encerradas.

## Provedor de e-mail

O projeto usa a API HTTP do Resend diretamente pelo Cloudflare Worker. A chave nunca fica no JavaScript do navegador.

### 1. Criar a conta no Resend

Crie uma conta em https://resend.com/ e gere uma API Key.

### 2. Para testes

É possível usar temporariamente:

```text
LiDire <onboarding@resend.dev>
```

Para uso comercial, verifique o domínio da LiDire no Resend e use um endereço do domínio, por exemplo:

```text
LiDire <contato@lidire.com>
```

### 3. Criar os secrets no Cloudflare Worker

No diretório do projeto:

```bash
npx wrangler secret put RESEND_API_KEY
```

Cole a API Key quando o Wrangler solicitar.

Opcionalmente, se quiser definir o remetente sem alterar o código:

```bash
npx wrangler secret put RESEND_FROM_EMAIL
```

Valor sugerido em produção:

```text
LiDire <contato@lidire.com>
```

### 4. Definir o endereço público do LiDire

Por padrão, o Worker usa a origem da requisição. Para produção, é recomendado definir:

```text
LIDIRE_PUBLIC_URL=https://vigesimo-quarto.lidire-lifedirector.workers.dev
```

Quando o domínio oficial estiver apontando para o Worker, altere para o domínio oficial, por exemplo:

```text
LIDIRE_PUBLIC_URL=https://lidire.com
```

Esse valor não é segredo e pode ficar em `[vars]` no `wrangler.toml`.

## Segurança implementada

- Não retornamos o token para o navegador quando a solicitação é feita.
- A resposta da solicitação é genérica e não revela se o e-mail está cadastrado.
- O token bruto não é armazenado no D1.
- O token expira em 30 minutos.
- O token é invalidado após o uso.
- Um novo pedido invalida o token anterior.
- Há uma proteção contra solicitações repetidas em menos de 60 segundos para a mesma conta.
- Todas as sessões existentes são encerradas quando a senha é redefinida.

## Importante

O código da VIGÉSIMO QUARTO já contém o fluxo completo, mas o envio real de e-mails depende da configuração do `RESEND_API_KEY` e de um remetente aceito pelo Resend.
