# Implantação segura

As regras do Firestore foram reforçadas para proteger os dados de agenda e inventários. Elas não foram publicadas automaticamente.

## Antes de publicar as regras

1. No Firebase Authentication, localize o UID da conta que será a administradora inicial.
2. No Firestore, crie manualmente o documento `users/<UID>` com, no mínimo:

```json
{
  "name": "Nome da pessoa administradora",
  "email": "email-da-conta@exemplo.com",
  "role": "master",
  "createdAt": "data ISO 8601"
}
```

3. Confirme que a conta consegue entrar no ERP.
4. Publique `firestore.rules` pelo Firebase Console ou Firebase CLI.

## Efeito das regras

- Todo acesso a dados internos passa a exigir Firebase Authentication.
- Documentos de `users` devem ter o mesmo ID do UID do Firebase Authentication.
- Registros novos de clientes, casos, agenda, inventários e transações recebem o UID do criador e só podem ser acessados por ele ou por uma conta `master`.
- Dados antigos sem `userId` ficam visíveis somente para contas `master`; revise a atribuição antes de liberar colaboradores.
- A página pública de contato continua registrando a solicitação em `contacts`, mas não cria mais diretamente um evento na agenda. A transformação em compromisso deve ser feita por uma conta autorizada ou por uma automação no servidor.

## Atenção

Não publique as regras antes de criar o primeiro perfil `master`, pois nenhuma conta conseguirá administrar os perfis depois disso. Não há migração de produção neste pacote.
